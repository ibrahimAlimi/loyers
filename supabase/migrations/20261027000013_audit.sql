-- =====================================================================
-- Lot 5 : journal d'audit et historique complet (§6.11). Lecture réservée au super admin.
-- - historique_modifications (Lot 1) reçoit désormais l'adresse IP et l'appareil de la requête ;
-- - journal_audit enregistre le reste : connexions (réussies et échouées), déconnexions, exports,
--   impressions et duplicatas, changements de droits, corbeille, annulations, consultations sensibles.
-- Personne ne peut modifier ces journaux ; le super admin peut les purger (après export).
-- =====================================================================

set search_path = public, extensions;

-- ---------- Origine de la requête (PostgREST transmet les en-têtes HTTP) ----------
create or replace function requete_entetes() returns jsonb
language plpgsql stable as $$
begin
  return coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
exception when others then
  return '{}'::jsonb;
end $$;

create or replace function requete_ip() returns inet
language plpgsql stable as $$
declare
  h jsonb := requete_entetes();
  v text := coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1), h->>'x-real-ip');
begin
  return nullif(trim(v), '')::inet;
exception when others then
  return null;
end $$;

-- « Android · Chrome », « Windows · Edge »… (lisible par une personne, pas une empreinte)
create or replace function appareil_de(p_ua text) returns text
language sql immutable as $$
  select case when p_ua is null or p_ua = '' then null else
    (case when p_ua ~* 'android' then 'Android' when p_ua ~* 'iphone|ipad' then 'iPhone'
          when p_ua ~* 'windows' then 'Windows' when p_ua ~* 'mac os' then 'Mac' when p_ua ~* 'linux' then 'Linux'
          else 'Appareil' end)
    || ' · ' ||
    (case when p_ua ~* 'edg/' then 'Edge' when p_ua ~* 'opr/|opera' then 'Opera' when p_ua ~* 'samsungbrowser' then 'Samsung Internet'
          when p_ua ~* 'chrome/' then 'Chrome' when p_ua ~* 'firefox/' then 'Firefox' when p_ua ~* 'safari/' then 'Safari'
          when p_ua ~* 'deno|node|supabase' then 'Serveur' else 'Navigateur' end)
  end
$$;

-- ---------- Historique : IP et appareil ----------
alter table historique_modifications add column if not exists ip inet;
alter table historique_modifications add column if not exists appareil text;

-- Lien vers l'auteur (pour afficher son nom) ; les références orphelines sont mises à nul.
-- Pas de clé vers espaces : pendant la suppression définitive d'un espace, les déclencheurs écrivent encore
-- des lignes qui portent son identifiant.
update historique_modifications h set par = null where par is not null and not exists (select 1 from profils p where p.id = h.par);
alter table historique_modifications
  add constraint historique_modifications_par_fkey foreign key (par) references profils (id) on delete set null;
create index if not exists historique_par_idx on historique_modifications (par, le desc);

create or replace function historique_origine() returns trigger
language plpgsql as $$
begin
  new.ip := coalesce(new.ip, requete_ip());
  new.appareil := coalesce(new.appareil, appareil_de(requete_entetes()->>'user-agent'));
  return new;
end $$;
create trigger historique_origine before insert on historique_modifications
  for each row execute function historique_origine();

-- ---------- Journal d'audit ----------
create table journal_audit (
  id bigserial primary key,
  le timestamptz not null default now(),
  user_id uuid references profils (id) on delete set null,
  identifiant text,
  espace_id uuid,  -- sans clé étrangère, comme l'historique (suppression définitive d'un espace)
  action text not null,
  cible_table text,
  cible_id text,
  libelle text,
  details jsonb,
  reussi boolean not null default true,
  ip inet,
  appareil text,
  navigateur text
);
create index journal_audit_le_idx on journal_audit (le desc);
create index journal_audit_espace_idx on journal_audit (espace_id, le desc);
create index journal_audit_user_idx on journal_audit (user_id, le desc);
create index journal_audit_action_idx on journal_audit (action, le desc);
create index journal_audit_ip_idx on journal_audit (ip, le desc) where not reussi;
alter table journal_audit enable row level security;
create policy journal_audit_select on journal_audit for select using (est_super_admin());
create policy journal_audit_mfa on journal_audit as restrictive for all to authenticated
  using (mfa_respectee()) with check (mfa_respectee());

-- Écriture interne (déclencheurs et RPC), avec l'origine de la requête
create or replace function auditer(
  p_action text, p_espace uuid default null, p_cible_table text default null, p_cible_id text default null,
  p_libelle text default null, p_details jsonb default null, p_reussi boolean default true,
  p_user uuid default null, p_identifiant text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_ua text := left(requete_entetes()->>'user-agent', 300);
begin
  insert into journal_audit (user_id, identifiant, espace_id, action, cible_table, cible_id, libelle, details, reussi,
                             ip, appareil, navigateur)
  values (coalesce(p_user, auth.uid()),
          coalesce(p_identifiant, (select identifiant::text from profils where id = coalesce(p_user, auth.uid()))),
          p_espace, p_action, p_cible_table, p_cible_id, left(p_libelle, 300), p_details, p_reussi,
          requete_ip(), appareil_de(v_ua), v_ua);
end $$;

/**
 * Actions signalées par l'application (celles que la base ne voit pas passer).
 * Liste fermée d'actions, limite de 120 par minute et par compte.
 */
create or replace function journaliser(
  p_action text, p_espace uuid default null, p_cible_table text default null, p_cible_id text default null,
  p_libelle text default null, p_details jsonb default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_appareil text := appareil_de(requete_entetes()->>'user-agent');
begin
  if auth.uid() is null then return; end if;
  if p_action not in ('connexion', 'deconnexion', 'export_statistiques', 'export_audit', 'consultation_locataire',
                      'consultation_audit', 'partage_recu', 'double_auth_activee', 'double_auth_desactivee') then
    raise exception 'Action inconnue.';
  end if;
  if (select count(*) from journal_audit where user_id = auth.uid() and le > now() - interval '1 minute') >= 120 then
    return;
  end if;
  -- L'espace indiqué doit être un espace du compte (sinon on ne le garde pas)
  if p_espace is not null and not est_super_admin() and role_dans(p_espace) is null then p_espace := null; end if;

  -- Connexion depuis un appareil jamais vu : alerte de sécurité (pas à la toute première connexion)
  if p_action = 'connexion' and v_appareil is not null
     and exists (select 1 from journal_audit where user_id = auth.uid() and action = 'connexion' and reussi)
     and not exists (select 1 from journal_audit where user_id = auth.uid() and action = 'connexion' and reussi
                     and appareil = v_appareil) then
    perform notifier(array[auth.uid()], null, 'securite', 'Connexion depuis un nouvel appareil',
      v_appareil || coalesce(' (adresse ' || host(requete_ip()) || ')', '')
      || '. Si ce n''est pas vous, changez votre mot de passe tout de suite.', '/profil', true);
  end if;

  perform auditer(p_action, p_espace, left(p_cible_table, 40), left(p_cible_id, 80), p_libelle,
                  case when p_details is null then null else jsonb_strip_nulls(p_details) end);
end $$;

/**
 * Échec de connexion (appelable sans être connecté). Au plus 30 par minute et par adresse IP.
 * Après 5 échecs en 15 minutes sur un compte existant, son titulaire est prévenu (une fois par heure).
 */
create or replace function journaliser_echec_connexion(p_identifiant text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ip inet := requete_ip();
  v_id text := left(lower(trim(coalesce(p_identifiant, ''))), 80);
  v_user uuid;
begin
  if (select count(*) from journal_audit where action = 'connexion' and not reussi
        and ip is not distinct from v_ip and le > now() - interval '1 minute') >= 30 then
    return;
  end if;
  select id into v_user from profils where identifiant = v_id or email = v_id limit 1;
  perform auditer('connexion', null, null, null, null, null, false, v_user, v_id);

  if v_user is not null
     and (select count(*) from journal_audit where action = 'connexion' and not reussi and user_id = v_user
            and le > now() - interval '15 minutes') >= 5
     and not exists (select 1 from notifications where user_id = v_user and type = 'securite'
                     and titre like 'Plusieurs tentatives%' and cree_le > now() - interval '1 hour') then
    perform notifier(array[v_user], null, 'securite', 'Plusieurs tentatives de connexion échouées',
      'Quelqu''un a essayé plusieurs fois de se connecter à votre compte' || coalesce(' depuis l''adresse ' || host(v_ip), '')
      || '. Si ce n''est pas vous, prévenez l''administrateur.', '/profil', true);
  end if;
end $$;

-- ---------- Actions captées en base ----------
-- Impression de l'original et duplicatas
create or replace function audit_recu() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_r recus;
begin
  if tg_table_name = 'recus' then
    if old.original_genere or not new.original_genere then return null; end if;
    perform auditer('impression_recu', new.espace_id, 'recus', new.id::text, 'Reçu N° ' || new.numero);
  else
    select * into v_r from recus where id = new.recu_id;
    perform auditer('duplicata', new.espace_id, 'recus', v_r.id::text, 'Duplicata du reçu N° ' || v_r.numero, null, true, new.par);
  end if;
  return null;
end $$;
create trigger recus_audit after update of original_genere on recus for each row execute function audit_recu();
create trigger reimpressions_audit after insert on reimpressions for each row execute function audit_recu();

-- Droits : rôles, activation, maisons confiées
create or replace function audit_droits() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ligne record := case when tg_op = 'DELETE' then old else new end;
begin
  if tg_table_name = 'membres' then
    if tg_op = 'UPDATE' and new.role is not distinct from old.role and new.actif is not distinct from old.actif then return null; end if;
    perform auditer('droits', v_ligne.espace_id, 'membres', v_ligne.user_id::text, nom_de(v_ligne.user_id),
      jsonb_build_object('operation', lower(tg_op),
                         'role_avant', case when tg_op <> 'INSERT' then old.role end,
                         'role', case when tg_op <> 'DELETE' then new.role end,
                         'actif', case when tg_op <> 'DELETE' then new.actif end));
  else
    perform auditer('droits', v_ligne.espace_id, 'membre_maisons', v_ligne.user_id::text, nom_de(v_ligne.user_id),
      jsonb_build_object('operation', lower(tg_op), 'maison', (select nom from maisons where id = v_ligne.maison_id)));
  end if;
  return null;
end $$;
create trigger membres_audit after insert or update or delete on membres for each row execute function audit_droits();
create trigger membre_maisons_audit after insert or delete on membre_maisons for each row execute function audit_droits();

-- Corbeille : mise, restauration, suppression définitive
create or replace function audit_corbeille() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_restaure boolean;
begin
  if tg_op = 'INSERT' then
    perform auditer('corbeille', new.espace_id, new.racine_table, new.racine_id::text, new.libelle,
                    jsonb_build_object('elements', new.nb_elements));
  else
    execute format('select exists (select 1 from %I where id = $1 and supprime_le is null)', old.racine_table)
      into v_restaure using old.racine_id;
    perform auditer(case when v_restaure then 'restauration' else 'suppression_definitive' end, old.espace_id,
                    old.racine_table, old.racine_id::text, old.libelle, jsonb_build_object('elements', old.nb_elements));
  end if;
  return null;
end $$;
create trigger lots_audit after insert or delete on lots_suppression for each row execute function audit_corbeille();

-- Annulation d'un paiement et traitement des demandes
create or replace function audit_paiement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.statut = 'valide' and new.statut = 'annule' then
    perform auditer('annulation_paiement', new.espace_id, 'paiements', new.id::text, fcfa(new.montant),
                    jsonb_build_object('motif', new.motif_annulation));
  end if;
  return null;
end $$;
create trigger paiements_audit after update of statut on paiements for each row execute function audit_paiement();

create or replace function audit_demande() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.statut = 'en_attente' and new.statut <> 'en_attente' then
    perform auditer('demande_traitee', new.espace_id, 'demandes', new.id::text, new.cible_libelle,
                    jsonb_build_object('type', new.type, 'statut', new.statut, 'demandeur', nom_de(new.demande_par)));
  end if;
  return null;
end $$;
create trigger demandes_audit after update of statut on demandes for each row execute function audit_demande();

-- ---------- Purge (super admin), elle-même tracée ----------
create or replace function purger_audit(p_avant date default null, p_ids bigint[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not est_super_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  if p_avant is null and p_ids is null then raise exception 'Indiquez une date ou des entrées.'; end if;
  delete from journal_audit
   where (p_avant is not null and le < p_avant) or (p_ids is not null and id = any (p_ids));
  get diagnostics v_n = row_count;
  perform auditer('purge_audit', null, 'journal_audit', null, v_n || ' entrée(s) supprimée(s)',
                  jsonb_build_object('avant', p_avant, 'nb', v_n));
  return v_n;
end $$;

create or replace function purger_historique(p_avant date default null, p_ids bigint[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not est_super_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  if p_avant is null and p_ids is null then raise exception 'Indiquez une date ou des entrées.'; end if;
  delete from historique_modifications
   where (p_avant is not null and le < p_avant) or (p_ids is not null and id = any (p_ids));
  get diagnostics v_n = row_count;
  perform auditer('purge_historique', null, 'historique_modifications', null, v_n || ' entrée(s) supprimée(s)',
                  jsonb_build_object('avant', p_avant, 'nb', v_n));
  return v_n;
end $$;

-- Place occupée par les journaux (pour décider d'une purge)
create or replace function taille_journaux() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not est_super_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  return jsonb_build_object(
    'audit', jsonb_build_object('lignes', (select count(*) from journal_audit),
                                'taille', pg_size_pretty(pg_total_relation_size('journal_audit')),
                                'plus_ancien', (select min(le) from journal_audit)),
    'historique', jsonb_build_object('lignes', (select count(*) from historique_modifications),
                                     'taille', pg_size_pretty(pg_total_relation_size('historique_modifications')),
                                     'plus_ancien', (select min(le) from historique_modifications)));
end $$;

-- ---------- Droits ----------
revoke execute on function requete_entetes(), requete_ip(), appareil_de(text), historique_origine(),
  auditer(text, uuid, text, text, text, jsonb, boolean, uuid, text), audit_recu(), audit_droits(), audit_corbeille(),
  audit_paiement(), audit_demande() from public, anon, authenticated;
revoke execute on function journaliser(text, uuid, text, text, text, jsonb), journaliser_echec_connexion(text),
  purger_audit(date, bigint[]), purger_historique(date, bigint[]), taille_journaux() from public, anon;
grant execute on function journaliser(text, uuid, text, text, text, jsonb), purger_audit(date, bigint[]),
  purger_historique(date, bigint[]), taille_journaux() to authenticated;
grant execute on function journaliser_echec_connexion(text) to anon, authenticated;
