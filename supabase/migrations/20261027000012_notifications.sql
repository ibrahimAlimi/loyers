-- =====================================================================
-- Lot 4 : notifications (§6.10). Dans l'application, sur le téléphone (Web Push) et par e-mail.
-- Les événements sont captés en base (déclencheurs + tâches planifiées) : aucun oubli côté écran.
-- L'envoi des e-mails et des notifications téléphone est fait par l'Edge Function
-- « envoyer-notifications », appelée chaque minute par pg_cron quand il y a quelque chose à envoyer.
-- =====================================================================

set search_path = public, extensions;

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profils (id) on delete cascade,
  espace_id uuid references espaces (id) on delete cascade,
  type text not null,
  titre text not null,
  message text,
  lien text,
  canaux text[] not null default '{app}',
  lu_le timestamptz,
  email_statut text check (email_statut in ('a_envoyer', 'envoye', 'echec')),
  push_statut text check (push_statut in ('a_envoyer', 'envoye', 'echec')),
  tentatives int not null default 0,
  par uuid,
  cree_le timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, cree_le desc);
create index notifications_email_idx on notifications (cree_le) where email_statut = 'a_envoyer';
create index notifications_push_idx on notifications (cree_le) where push_statut = 'a_envoyer';
alter table notifications enable row level security;
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_mfa on notifications as restrictive for all to authenticated
  using (mfa_respectee()) with check (mfa_respectee());

create table abonnements_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profils (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  appareil text,
  cree_le timestamptz not null default now()
);
create index abonnements_push_user_idx on abonnements_push (user_id);
alter table abonnements_push enable row level security;
create policy abonnements_select on abonnements_push for select using (user_id = auth.uid());
create policy abonnements_insert on abonnements_push for insert with check (user_id = auth.uid());
create policy abonnements_delete on abonnements_push for delete using (user_id = auth.uid());
create policy abonnements_mfa on abonnements_push as restrictive for all to authenticated
  using (mfa_respectee()) with check (mfa_respectee());

-- Temps réel : la cloche se met à jour dès qu'une notification arrive (la RLS s'applique).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- ---------- Catalogue : canaux par défaut de chaque type d'événement ----------
create or replace function canaux_par_defaut(p_type text) returns text[]
language sql immutable as $$
  select case
    when p_type in ('paiement_gestionnaire', 'demande_nouvelle', 'demande_traitee', 'paiement_annule',
                    'securite', 'demande_acces', 'quota', 'limite_formule') then array['app', 'push', 'email']
    when p_type in ('paiement', 'retard', 'fin_bail', 'logement_libere', 'compte', 'duplicata') then array['app', 'push']
    when p_type = 'resume_mensuel' then array['app', 'email']
    else array['app']
  end
$$;

-- ---------- Destinataires ----------
create or replace function proprietaires_de(p_espace uuid) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(m.user_id), '{}') from membres m join profils p on p.id = m.user_id
  where m.espace_id = p_espace and m.role = 'proprietaire' and m.actif and p.actif
$$;

create or replace function consultations_de(p_espace uuid) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(m.user_id), '{}') from membres m join profils p on p.id = m.user_id
  where m.espace_id = p_espace and m.role = 'consultation' and m.actif and p.actif
$$;

create or replace function super_admins() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from profils where est_super_admin and actif
$$;

create or replace function gestionnaire_de(p_maison uuid) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(m.gestionnaire_id), '{}') from maisons m
  join membres mb on mb.espace_id = m.espace_id and mb.user_id = m.gestionnaire_id and mb.actif
  where m.id = p_maison and m.gestionnaire_id is not null
$$;

/**
 * Crée une notification pour chaque destinataire, selon ses préférences
 * (profils.preferences.notifications.<type> = liste de canaux ; liste vide = aucune).
 * L'auteur de l'action n'est pas notifié de sa propre action, sauf p_auteur_inclus.
 */
create or replace function notifier(
  p_users uuid[], p_espace uuid, p_type text, p_titre text, p_message text default null,
  p_lien text default null, p_auteur_inclus boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_u uuid; v_prefs jsonb; v_canaux text[]; v_email text; v_push boolean;
begin
  for v_u in select distinct u from unnest(p_users) u where u is not null loop
    continue when not p_auteur_inclus and v_u = auth.uid();
    select preferences->'notifications'->p_type, email into v_prefs, v_email
      from profils where id = v_u and actif;
    continue when not found;
    v_canaux := case when jsonb_typeof(v_prefs) = 'array'
                     then array(select jsonb_array_elements_text(v_prefs)) else canaux_par_defaut(p_type) end;
    continue when coalesce(cardinality(v_canaux), 0) = 0;
    v_push := 'push' = any (v_canaux) and exists (select 1 from abonnements_push where user_id = v_u);
    insert into notifications (user_id, espace_id, type, titre, message, lien, canaux, email_statut, push_statut, par)
    values (v_u, p_espace, p_type, p_titre, p_message, p_lien, v_canaux,
            case when 'email' = any (v_canaux) and v_email is not null then 'a_envoyer' end,
            case when v_push then 'a_envoyer' end, auth.uid());
  end loop;
end $$;

create or replace function nom_de(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nom_complet from profils where id = p_user), 'Quelqu''un')
$$;

create or replace function fcfa(p_montant bigint) returns text
language sql immutable as $$
  select replace(to_char(coalesce(p_montant, 0), 'FM999G999G999G999'), ',', ' ') || ' FCFA'
$$;

create or replace function nom_mois(p_date date, p_annee boolean default true) returns text
language sql immutable as $$
  select (array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])
         [extract(month from p_date)::int] || case when p_annee then ' ' || extract(year from p_date)::int else '' end
$$;

-- Marquer comme lues (toutes si p_ids est nul)
create or replace function marquer_notifications_lues(p_ids uuid[] default null) returns void
language sql security definer set search_path = public as $$
  update notifications set lu_le = now()
  where user_id = auth.uid() and lu_le is null and (p_ids is null or id = any (p_ids))
$$;

-- Un appareil ne notifie que le dernier compte qui s'y est abonné (téléphone partagé, changement de compte).
create or replace function enregistrer_abonnement_push(p_endpoint text, p_p256dh text, p_auth text, p_appareil text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Vous devez être connecté.'; end if;
  if not mfa_respectee() then raise exception 'Validez d''abord la double authentification.'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then raise exception 'Abonnement invalide.'; end if;
  delete from abonnements_push where endpoint = p_endpoint;
  insert into abonnements_push (user_id, endpoint, p256dh, auth, appareil)
  values (auth.uid(), p_endpoint, left(p_p256dh, 200), left(p_auth, 100), left(p_appareil, 100));
end $$;

-- ---------- Paiements ----------
create or replace function notif_paiement() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_b record; v_role role_membre; v_texte text;
begin
  if auth.uid() is null then return null; end if;    -- import ou tâche technique
  select b.locataire_id, l.maison_id, m.nom as maison, l.designation as logement,
         trim(lo.nom || ' ' || coalesce(lo.prenoms, '')) as locataire
    into v_b from baux b join logements l on l.id = b.logement_id join maisons m on m.id = l.maison_id
    join locataires lo on lo.id = b.locataire_id where b.id = new.bail_id;
  v_texte := fcfa(new.montant) || ' de ' || v_b.locataire || ' (' || v_b.maison || ' · ' || v_b.logement || ')';

  if tg_op = 'INSERT' then
    select role into v_role from membres where espace_id = new.espace_id and user_id = new.encaisse_par;
    if v_role = 'gestionnaire' then
      perform notifier(proprietaires_de(new.espace_id), new.espace_id, 'paiement_gestionnaire',
        'Paiement encaissé par ' || nom_de(new.encaisse_par), v_texte, '/locataires/' || v_b.locataire_id);
    end if;
    perform notifier(gestionnaire_de(v_b.maison_id), new.espace_id, 'paiement',
      'Paiement encaissé', v_texte || ', par ' || nom_de(new.encaisse_par), '/locataires/' || v_b.locataire_id);
  elsif old.statut = 'valide' and new.statut = 'annule' then
    perform notifier(proprietaires_de(new.espace_id) || gestionnaire_de(v_b.maison_id), new.espace_id, 'paiement_annule',
      'Paiement annulé', v_texte || '. Motif : ' || coalesce(new.motif_annulation, '—') || ' (par ' || nom_de(auth.uid()) || ')',
      '/locataires/' || v_b.locataire_id);
  end if;
  return null;
end $$;
create trigger paiements_notifier after insert or update of statut on paiements
  for each row execute function notif_paiement();

-- ---------- Demandes des gestionnaires ----------
create or replace function notif_demande() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_quoi text := case when new.type = 'annulation_paiement' then 'annulation d''un paiement' else 'suppression' end;
begin
  if auth.uid() is null then return null; end if;
  if tg_op = 'INSERT' then
    perform notifier(proprietaires_de(new.espace_id), new.espace_id, 'demande_nouvelle',
      'Demande de ' || v_quoi || ' par ' || nom_de(new.demande_par),
      coalesce(new.cible_libelle || ' : ', '') || new.motif, '/demandes');
  elsif old.statut = 'en_attente' and new.statut <> 'en_attente' then
    perform notifier(array[new.demande_par], new.espace_id, 'demande_traitee',
      'Votre demande de ' || v_quoi || ' a été ' || case when new.statut = 'acceptee' then 'acceptée' else 'refusée' end,
      coalesce(new.cible_libelle, '') || coalesce(' · Réponse : ' || new.reponse, ''), '/demandes');
  end if;
  return null;
end $$;
create trigger demandes_notifier after insert or update of statut on demandes
  for each row execute function notif_demande();

-- ---------- Maisons, logements, locataires, baux : création et modification ----------
create or replace function notif_fiche() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_maisons uuid[]; v_libelle text; v_lien text; v_quoi text; v_dest uuid[]; m uuid;
  v_avant jsonb; v_apres jsonb;
begin
  if auth.uid() is null then return null; end if;
  if tg_op = 'UPDATE' then
    -- Corbeille et restauration : notifiées une seule fois par lot (voir lots_suppression)
    if new.supprime_le is distinct from old.supprime_le or new.lot_suppression is distinct from old.lot_suppression then
      return null;
    end if;
    v_avant := to_jsonb(old) - 'modifie_le';
    v_apres := to_jsonb(new) - 'modifie_le';
    if v_avant = v_apres then return null; end if;
  end if;

  case tg_table_name
    when 'maisons' then
      v_maisons := array[new.id]; v_libelle := 'la maison « ' || new.nom || ' »'; v_lien := '/maisons/' || new.id;
    when 'logements' then
      v_maisons := array[new.maison_id];
      v_libelle := 'le logement « ' || new.designation || ' » (' || (select nom from maisons where id = new.maison_id) || ')';
      v_lien := '/maisons/' || new.maison_id;
    when 'locataires' then
      select coalesce(array_agg(distinct l.maison_id), '{}') into v_maisons
        from baux b join logements l on l.id = b.logement_id where b.locataire_id = new.id and b.supprime_le is null;
      v_libelle := 'le locataire « ' || trim(new.nom || ' ' || coalesce(new.prenoms, '')) || ' »';
      v_lien := '/locataires/' || new.id;
    when 'baux' then
      select array[l.maison_id], 'le bail de ' || trim(lo.nom || ' ' || coalesce(lo.prenoms, '')) || ' (' || mm.nom || ' · ' || l.designation || ')'
        into v_maisons, v_libelle
        from logements l join maisons mm on mm.id = l.maison_id join locataires lo on lo.id = new.locataire_id
        where l.id = new.logement_id;
      v_lien := '/locataires/' || new.locataire_id;
  end case;

  v_dest := proprietaires_de(new.espace_id);
  foreach m in array coalesce(v_maisons, '{}') loop v_dest := v_dest || gestionnaire_de(m); end loop;

  -- Départ d'un locataire : le logement est libéré
  if tg_table_name = 'baux' and tg_op = 'UPDATE' and old.date_fin is null and new.date_fin is not null then
    perform notifier(v_dest, new.espace_id, 'logement_libere', 'Logement libéré',
      initcap(substr(v_libelle, 4, 1)) || substr(v_libelle, 5) || ' se termine le ' || to_char(new.date_fin, 'DD/MM/YYYY') || '.', v_lien);
    return null;
  end if;

  v_quoi := case when tg_op = 'INSERT' then 'ajouté' else 'modifié' end;
  perform notifier(v_dest, new.espace_id, 'modification',
    nom_de(auth.uid()) || ' a ' || v_quoi || ' ' || v_libelle, null, v_lien);

  -- Nouveau gestionnaire d'une maison
  if tg_table_name = 'maisons' and new.gestionnaire_id is not null
     and (tg_op = 'INSERT' or new.gestionnaire_id is distinct from old.gestionnaire_id) then
    perform notifier(array[new.gestionnaire_id], new.espace_id, 'compte',
      'Vous gérez maintenant la maison « ' || new.nom || ' »', null, v_lien);
  end if;
  return null;
end $$;
create trigger maisons_notifier after insert or update on maisons for each row execute function notif_fiche();
create trigger logements_notifier after insert or update on logements for each row execute function notif_fiche();
create trigger locataires_notifier after insert or update on locataires for each row execute function notif_fiche();
create trigger baux_notifier after insert or update on baux for each row execute function notif_fiche();

-- ---------- Corbeille : mise à la corbeille et restauration (une notification par lot) ----------
create or replace function notif_corbeille() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_l lots_suppression := case when tg_op = 'INSERT' then new else old end;
  v_espace uuid; v_restaure boolean;
begin
  if auth.uid() is null then return null; end if;
  v_espace := coalesce(v_l.espace_id, case when v_l.racine_table = 'espaces' then v_l.racine_id end);
  if tg_op = 'INSERT' then
    perform notifier(proprietaires_de(v_espace) || super_admins(), v_espace, 'corbeille',
      nom_de(auth.uid()) || ' a mis « ' || v_l.libelle || ' » à la corbeille',
      v_l.nb_elements || ' élément' || case when v_l.nb_elements > 1 then 's' else '' end || ' au total', '/corbeille');
  else
    -- Un lot disparaît aussi lors d'une suppression définitive : on ne parle de restauration que si la racine est revenue.
    execute format('select exists (select 1 from %I where id = $1 and supprime_le is null)', v_l.racine_table)
      into v_restaure using v_l.racine_id;
    if v_restaure then
      perform notifier(proprietaires_de(v_espace) || super_admins(), v_espace, 'corbeille',
        nom_de(auth.uid()) || ' a restauré « ' || v_l.libelle || ' »', null, null);
    end if;
  end if;
  return null;
end $$;
create trigger lots_notifier after insert or delete on lots_suppression for each row execute function notif_corbeille();

-- ---------- Duplicata d'un reçu ----------
create or replace function notif_duplicata() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_r recus;
begin
  if auth.uid() is null then return null; end if;
  select * into v_r from recus where id = new.recu_id;
  perform notifier(proprietaires_de(new.espace_id), new.espace_id, 'duplicata',
    'Duplicata du reçu N° ' || v_r.numero || ' imprimé par ' || nom_de(new.par),
    (v_r.contenu->'locataire'->>'nom_complet') || ' · ' || fcfa((v_r.contenu->>'montant')::bigint), null);
  return null;
end $$;
create trigger reimpressions_notifier after insert on reimpressions for each row execute function notif_duplicata();

-- ---------- Comptes et droits ----------
create or replace function notif_membre() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_espace text := (select nom from espaces where id = new.espace_id);
  v_role text := case new.role when 'proprietaire' then 'propriétaire' when 'gestionnaire' then 'gestionnaire' else 'consultation' end;
begin
  -- Pas de filtre sur auth.uid() : les comptes sont créés par une Edge Function (service_role).
  if tg_op = 'INSERT' then
    perform notifier(array_remove(proprietaires_de(new.espace_id), new.user_id), new.espace_id, 'compte',
      'Nouveau compte : ' || nom_de(new.user_id) || ' (' || v_role || ')', null, '/comptes');
    perform notifier(array[new.user_id], new.espace_id, 'compte', 'Bienvenue dans l''espace « ' || v_espace || ' »',
      'Votre rôle : ' || v_role || '.', '/');
  elsif new.role is distinct from old.role or new.actif is distinct from old.actif then
    perform notifier(array_remove(proprietaires_de(new.espace_id), new.user_id), new.espace_id, 'compte',
      'Droits modifiés pour ' || nom_de(new.user_id),
      case when not new.actif then 'Compte désactivé.' else 'Nouveau rôle : ' || v_role || '.' end, '/comptes');
    perform notifier(array[new.user_id], new.espace_id, 'compte', 'Vos droits ont changé dans « ' || v_espace || ' »',
      case when not new.actif then 'Votre accès est suspendu.' else 'Votre rôle : ' || v_role || '.' end, null);
  end if;
  return null;
end $$;
create trigger membres_notifier after insert or update on membres for each row execute function notif_membre();

create or replace function notif_affectation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return null; end if;
  perform notifier(array[new.user_id], new.espace_id, 'compte',
    'Vous avez accès à la maison « ' || (select nom from maisons where id = new.maison_id) || ' »', null, '/maisons/' || new.maison_id);
  return null;
end $$;
create trigger membre_maisons_notifier after insert on membre_maisons for each row execute function notif_affectation();

-- ---------- Sécurité : mot de passe modifié ou réinitialisé ----------
create or replace function notif_mot_de_passe() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password and exists (select 1 from public.profils where id = new.id) then
    perform public.notifier(array[new.id], null, 'securite', 'Votre mot de passe a été modifié',
      'Si ce n''est pas vous, prévenez tout de suite votre propriétaire ou l''administrateur.', '/profil', true);
  end if;
  return null;
end $$;
-- Si Supabase refuse un déclencheur sur auth.users, la migration continue (seule cette alerte manquera).
do $$ begin
  drop trigger if exists utilisateurs_mdp_notifier on auth.users;
  create trigger utilisateurs_mdp_notifier after update of encrypted_password on auth.users
    for each row execute function public.notif_mot_de_passe();
exception when insufficient_privilege then
  raise notice 'Déclencheur sur auth.users refusé : alerte « mot de passe modifié » désactivée.';
end $$;

-- ---------- Limite de formule ----------
create or replace function notif_limite() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_e espaces; v_n int;
begin
  select * into v_e from espaces where id = new.espace_id;
  if not v_e.limites_actives or v_e.max_logements is null then return null; end if;
  select count(*) into v_n from logements where espace_id = new.espace_id and supprime_le is null;
  if v_n >= v_e.max_logements then
    perform notifier(proprietaires_de(new.espace_id) || super_admins(), new.espace_id, 'limite_formule',
      'Limite de votre formule atteinte', v_n || ' logements sur ' || v_e.max_logements
      || '. Pour en ajouter d''autres, contactez l''administrateur.', null, true);
  end if;
  return null;
end $$;
create trigger logements_limite_notifier after insert on logements for each row execute function notif_limite();

-- ---------- Tâches quotidiennes (pg_cron, 7 h à Porto-Novo) ----------
create or replace function taches_quotidiennes() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_jour date := aujourdhui();
  r record; v_e record; v_taille bigint; v_stockage bigint;
begin
  -- Loyers qui passent « en retard » aujourd'hui (échéance + tolérance de l'espace)
  for r in
    select b.id, b.espace_id, l.maison_id, e.mois, e.reste, trim(lo.nom || ' ' || coalesce(lo.prenoms, '')) as locataire,
           mm.nom as maison, l.designation as logement, b.locataire_id
    from baux b
    join logements l on l.id = b.logement_id join maisons mm on mm.id = l.maison_id
    join locataires lo on lo.id = b.locataire_id join espaces esp on esp.id = b.espace_id
    cross join lateral echeances_bail(b.id, v_jour) e
    where b.supprime_le is null and l.supprime_le is null and esp.actif and esp.supprime_le is null
      and e.reste > 0 and e.mois + (b.jour_echeance - 1) + esp.delai_retard_jours + 1 = v_jour
  loop
    perform notifier(proprietaires_de(r.espace_id) || gestionnaire_de(r.maison_id), r.espace_id, 'retard',
      'Loyer en retard : ' || r.locataire,
      initcap(nom_mois(r.mois)) || ' · ' || fcfa(r.reste) || ' (' || r.maison || ' · ' || r.logement || ')',
      '/locataires/' || r.locataire_id);
  end loop;

  -- Fins de bail dans 30 jours
  for r in
    select b.espace_id, l.maison_id, b.locataire_id, b.date_fin, trim(lo.nom || ' ' || coalesce(lo.prenoms, '')) as locataire,
           mm.nom as maison, l.designation as logement
    from baux b join logements l on l.id = b.logement_id join maisons mm on mm.id = l.maison_id
    join locataires lo on lo.id = b.locataire_id
    where b.supprime_le is null and b.date_fin = v_jour + 30
  loop
    perform notifier(proprietaires_de(r.espace_id) || gestionnaire_de(r.maison_id), r.espace_id, 'fin_bail',
      'Fin de bail dans 30 jours : ' || r.locataire,
      r.maison || ' · ' || r.logement || ', le ' || to_char(r.date_fin, 'DD/MM/YYYY'), '/locataires/' || r.locataire_id);
  end loop;

  -- Résumé de la veille et résumé mensuel, par espace
  for v_e in select id, nom from espaces where actif and supprime_le is null loop
    select count(*) as nb, coalesce(sum(montant), 0) as total into r
      from paiements where espace_id = v_e.id and statut = 'valide' and supprime_le is null and date_paiement = v_jour - 1;
    if r.nb > 0 then
      perform notifier(proprietaires_de(v_e.id), v_e.id, 'resume_quotidien',
        'Hier : ' || r.nb || ' paiement' || case when r.nb > 1 then 's' else '' end || ' encaissé' || case when r.nb > 1 then 's' else '' end,
        fcfa(r.total) || ' au total.', '/statistiques');
    end if;

    if extract(day from v_jour) = 1 then
      declare
        v_s jsonb := stats_resume(v_e.id, (v_jour - interval '1 month')::date, v_jour - 1);
      begin
        perform notifier(proprietaires_de(v_e.id) || consultations_de(v_e.id), v_e.id, 'resume_mensuel',
          'Votre mois de ' || nom_mois(v_jour - 1, false) || ' en bref',
          'Encaissé : ' || fcfa((v_s->>'encaisse')::bigint) || ' · Reste à percevoir : ' || fcfa((v_s->>'reste_a_percevoir')::bigint)
          || ' · Occupation : ' || (v_s->>'logements_occupes') || ' / ' || (v_s->>'logements_total'), '/statistiques');
      end;
    end if;
  end loop;

  -- Place utilisée (offre gratuite : 500 Mo de base, 1 Go de stockage), au plus une alerte par semaine
  v_taille := pg_database_size(current_database());
  select coalesce(sum((metadata->>'size')::bigint), 0) into v_stockage from storage.objects;
  if (v_taille > 400 * 1024 * 1024 or v_stockage > 800 * 1024 * 1024)
     and not exists (select 1 from notifications where type = 'quota' and cree_le > now() - interval '7 days') then
    perform notifier(super_admins(), null, 'quota', 'Place bientôt pleine',
      'Base : ' || pg_size_pretty(v_taille) || ' sur 500 MB · Fichiers : ' || pg_size_pretty(v_stockage) || ' sur 1 GB.', '/admin', true);
  end if;

  -- Ménage : notifications lues de plus de 6 mois
  delete from notifications where lu_le is not null and cree_le < now() - interval '6 months';
end $$;

-- ---------- Droits ----------
revoke execute on function canaux_par_defaut(text), proprietaires_de(uuid), consultations_de(uuid), super_admins(),
  gestionnaire_de(uuid), notifier(uuid[], uuid, text, text, text, text, boolean), nom_de(uuid), fcfa(bigint), nom_mois(date, boolean),
  taches_quotidiennes(), notif_paiement(), notif_demande(), notif_fiche(), notif_corbeille(), notif_duplicata(),
  notif_membre(), notif_affectation(), notif_mot_de_passe(), notif_limite()
  from public, anon, authenticated;
revoke execute on function marquer_notifications_lues(uuid[]), enregistrer_abonnement_push(text, text, text, text) from public, anon;
grant execute on function marquer_notifications_lues(uuid[]), enregistrer_abonnement_push(text, text, text, text) to authenticated;
grant execute on function canaux_par_defaut(text) to authenticated;

-- ---------- Planification (pg_cron + pg_net) ----------
-- L'adresse du projet et le secret partagé sont lus dans Vault (à créer une fois, voir docs/plans/deploiement.md) :
--   select vault.create_secret('https://<ref>.supabase.co', 'url_projet');
--   select vault.create_secret('<secret long et aléatoire>', 'cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule('taches-quotidiennes', '0 6 * * *', 'select public.taches_quotidiennes()');

select cron.schedule('envoyer-notifications', '* * * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_projet') || '/functions/v1/envoyer-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
  where exists (select 1 from public.notifications where email_statut = 'a_envoyer' or push_statut = 'a_envoyer')
    and exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
$cron$);
