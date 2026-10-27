-- =====================================================================
-- Lot 1 - Droits : fonctions d'aide + Row Level Security.
-- Aucune politique DELETE sur les tables métier : la suppression passe
-- par les RPC de corbeille (migration 04).
-- =====================================================================

set search_path = public, extensions;

-- ---------- Fonctions d'aide ----------
create or replace function est_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.est_super_admin from profils p where p.id = auth.uid() and p.actif), false)
$$;

-- Appel « technique » : service_role (Edge Functions) ou fonction security definer (propriétaire postgres)
create or replace function est_appel_technique() returns boolean
language sql stable as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin')
$$;

create or replace function role_dans(p_espace uuid) returns role_membre
language sql stable security definer set search_path = public as $$
  select m.role
  from membres m
  join espaces e on e.id = m.espace_id
  join profils p on p.id = m.user_id
  where m.espace_id = p_espace and m.user_id = auth.uid()
    and m.actif and e.actif and e.supprime_le is null and p.actif
$$;

create or replace function peut_gerer_espace(p_espace uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select est_super_admin() or role_dans(p_espace) = 'proprietaire'
$$;

create or replace function peut_voir_maison(p_maison uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_espace uuid;
  v_gest uuid;
  v_role role_membre;
begin
  if est_super_admin() then return true; end if;
  select espace_id, gestionnaire_id into v_espace, v_gest from maisons where id = p_maison;
  if v_espace is null then return false; end if;
  v_role := role_dans(v_espace);
  if v_role = 'proprietaire' then return true; end if;
  if v_role = 'gestionnaire' then return v_gest = auth.uid(); end if;
  if v_role = 'consultation' then
    return not exists (select 1 from membre_maisons mm where mm.espace_id = v_espace and mm.user_id = auth.uid())
        or exists (select 1 from membre_maisons mm where mm.user_id = auth.uid() and mm.maison_id = p_maison);
  end if;
  return false;
end $$;

create or replace function peut_gerer_maison(p_maison uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_espace uuid;
  v_gest uuid;
  v_role role_membre;
begin
  if est_super_admin() then return true; end if;
  select espace_id, gestionnaire_id into v_espace, v_gest from maisons where id = p_maison;
  if v_espace is null then return false; end if;
  v_role := role_dans(v_espace);
  return v_role = 'proprietaire' or (v_role = 'gestionnaire' and v_gest = auth.uid());
end $$;

create or replace function maison_du_logement(p_logement uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select maison_id from logements where id = p_logement
$$;

create or replace function maison_du_bail(p_bail uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select l.maison_id from baux b join logements l on l.id = b.logement_id where b.id = p_bail
$$;

create or replace function bail_du_recu(p_paiement uuid, p_mouvement uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce((select bail_id from paiements where id = p_paiement),
                  (select bail_id from mouvements_caution where id = p_mouvement))
$$;

-- Le locataire est-il visible par l'utilisateur ? (fiche partagée entre gestionnaires)
create or replace function peut_voir_locataire(p_locataire uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_espace uuid;
begin
  select espace_id into v_espace from locataires where id = p_locataire;
  if v_espace is null then return false; end if;
  if peut_gerer_espace(v_espace) then return true; end if;
  if exists (select 1 from baux b join logements l on l.id = b.logement_id
             where b.locataire_id = p_locataire and peut_voir_maison(l.maison_id)) then
    return true;
  end if;
  -- Locataire sans bail : visible par les gestionnaires de l'espace (création avant le bail)
  return role_dans(v_espace) = 'gestionnaire'
     and not exists (select 1 from baux b where b.locataire_id = p_locataire and b.supprime_le is null);
end $$;

create or replace function peut_modifier_locataire(p_locataire uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_espace uuid;
begin
  select espace_id into v_espace from locataires where id = p_locataire;
  if peut_gerer_espace(v_espace) then return true; end if;
  if coalesce(role_dans(v_espace)::text, '') <> 'gestionnaire' then return false; end if;
  return exists (select 1 from baux b join logements l on l.id = b.logement_id
                 where b.locataire_id = p_locataire and peut_gerer_maison(l.maison_id))
      or not exists (select 1 from baux b where b.locataire_id = p_locataire and b.supprime_le is null);
end $$;

-- ---------- Cohérence espace_id (forcé depuis le parent) ----------
create or replace function fixer_espace_id() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'logements' then
    select espace_id into new.espace_id from maisons where id = new.maison_id;
  elsif tg_table_name = 'baux' then
    select espace_id into new.espace_id from logements where id = new.logement_id;
    if not exists (select 1 from locataires where id = new.locataire_id and espace_id = new.espace_id) then
      raise exception 'Le locataire et le logement doivent appartenir au même espace.';
    end if;
  elsif tg_table_name = 'revisions_loyer' then
    select espace_id into new.espace_id from baux where id = new.bail_id;
  end if;
  if new.espace_id is null then
    raise exception 'Élément parent introuvable.';
  end if;
  return new;
end $$;

create trigger logements_espace before insert or update of maison_id on logements
  for each row execute function fixer_espace_id();
create trigger baux_espace before insert or update of logement_id, locataire_id on baux
  for each row execute function fixer_espace_id();
create trigger revisions_loyer_espace before insert or update of bail_id on revisions_loyer
  for each row execute function fixer_espace_id();

-- Le gestionnaire d'une maison doit être gestionnaire actif de l'espace
create or replace function verifier_gestionnaire_maison() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.gestionnaire_id is not null and not exists (
    select 1 from membres where espace_id = new.espace_id and user_id = new.gestionnaire_id
      and role = 'gestionnaire' and actif) then
    raise exception 'Cette personne n''est pas gestionnaire de cet espace.';
  end if;
  return new;
end $$;
create trigger maisons_gestionnaire before insert or update of gestionnaire_id on maisons
  for each row execute function verifier_gestionnaire_maison();

-- Champs réservés au super admin
create or replace function proteger_champs_espace() returns trigger
language plpgsql as $$
begin
  if est_appel_technique() or est_super_admin() then return new; end if;
  if new.formule is distinct from old.formule
     or new.limites_actives is distinct from old.limites_actives
     or new.max_logements is distinct from old.max_logements
     or new.actif is distinct from old.actif
     or new.prefixe_recu is distinct from old.prefixe_recu
     or new.supprime_le is distinct from old.supprime_le then
    raise exception 'Seul l''administrateur peut modifier la formule, les limites, le préfixe ou l''état de l''espace.';
  end if;
  return new;
end $$;
create trigger espaces_proteger before update on espaces
  for each row execute function proteger_champs_espace();

create or replace function proteger_champs_profil() returns trigger
language plpgsql as $$
begin
  if est_appel_technique() or est_super_admin() then return new; end if;
  if new.est_super_admin is distinct from old.est_super_admin
     or new.identifiant is distinct from old.identifiant
     or new.actif is distinct from old.actif then
    raise exception 'Modification non autorisée.';
  end if;
  return new;
end $$;
create trigger profils_proteger before update on profils
  for each row execute function proteger_champs_profil();

-- Limite de formule sur le nombre de logements
create or replace function verifier_limite_logements() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actif boolean;
  v_max int;
  v_nb int;
begin
  select limites_actives, max_logements into v_actif, v_max from espaces where id = new.espace_id;
  if v_actif and v_max is not null then
    select count(*) into v_nb from logements where espace_id = new.espace_id and supprime_le is null;
    if v_nb >= v_max then
      raise exception 'Votre formule permet au plus % logements.', v_max;
    end if;
  end if;
  return new;
end $$;
create trigger logements_limite before insert on logements
  for each row execute function verifier_limite_logements();

-- ---------- Activation RLS ----------
do $$
declare t text;
begin
  foreach t in array array['profils','espaces','membres','membre_maisons','maisons','logements','locataires','baux',
                           'revisions_loyer','paiements','imputations','mouvements_caution','recus','reimpressions',
                           'compteurs_recus','demandes']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------- Politiques ----------
-- profils
create policy profils_select on profils for select using (
  id = auth.uid() or est_super_admin()
  or exists (select 1 from membres a join membres b on a.espace_id = b.espace_id
             where a.user_id = auth.uid() and b.user_id = profils.id)
);
create policy profils_update on profils for update using (id = auth.uid() or est_super_admin())
  with check (id = auth.uid() or est_super_admin());

-- espaces
create policy espaces_select on espaces for select using (est_super_admin() or role_dans(id) is not null);
create policy espaces_insert on espaces for insert with check (est_super_admin());
create policy espaces_update on espaces for update using (peut_gerer_espace(id)) with check (peut_gerer_espace(id));

-- membres
create policy membres_select on membres for select using (peut_gerer_espace(espace_id) or user_id = auth.uid()
  or role_dans(espace_id) is not null);
create policy membres_update on membres for update using (peut_gerer_espace(espace_id))
  with check (peut_gerer_espace(espace_id) and (role <> 'proprietaire' or est_super_admin()));

-- membre_maisons (table de liaison : suppression autorisée)
create policy membre_maisons_select on membre_maisons for select using (peut_gerer_espace(espace_id) or user_id = auth.uid());
create policy membre_maisons_insert on membre_maisons for insert with check (peut_gerer_espace(espace_id));
create policy membre_maisons_delete on membre_maisons for delete using (peut_gerer_espace(espace_id));

-- maisons
create policy maisons_select on maisons for select using (peut_voir_maison(id));
create policy maisons_insert on maisons for insert with check (peut_gerer_espace(espace_id));
create policy maisons_update on maisons for update using (peut_gerer_espace(espace_id)) with check (peut_gerer_espace(espace_id));

-- logements
create policy logements_select on logements for select using (peut_voir_maison(maison_id));
create policy logements_insert on logements for insert with check (peut_gerer_maison(maison_id));
create policy logements_update on logements for update using (peut_gerer_maison(maison_id)) with check (peut_gerer_maison(maison_id));

-- locataires
create policy locataires_select on locataires for select using (peut_voir_locataire(id));
create policy locataires_insert on locataires for insert with check (
  peut_gerer_espace(espace_id) or role_dans(espace_id) = 'gestionnaire');
create policy locataires_update on locataires for update using (peut_modifier_locataire(id))
  with check (peut_modifier_locataire(id));

-- baux
create policy baux_select on baux for select using (peut_voir_maison(maison_du_logement(logement_id)));
create policy baux_insert on baux for insert with check (peut_gerer_maison(maison_du_logement(logement_id)));
create policy baux_update on baux for update using (peut_gerer_maison(maison_du_logement(logement_id)))
  with check (peut_gerer_maison(maison_du_logement(logement_id)));

-- revisions_loyer
create policy revisions_select on revisions_loyer for select using (peut_voir_maison(maison_du_bail(bail_id)));
create policy revisions_insert on revisions_loyer for insert with check (peut_gerer_maison(maison_du_bail(bail_id)));
create policy revisions_update on revisions_loyer for update using (peut_gerer_maison(maison_du_bail(bail_id)))
  with check (peut_gerer_maison(maison_du_bail(bail_id)));

-- paiements / imputations / cautions / reçus : lecture seule (écriture via RPC)
create policy paiements_select on paiements for select using (peut_voir_maison(maison_du_bail(bail_id)));
create policy imputations_select on imputations for select using (peut_voir_maison(maison_du_bail(bail_id)));
create policy mouvements_select on mouvements_caution for select using (peut_voir_maison(maison_du_bail(bail_id)));
create policy recus_select on recus for select using (
  peut_voir_maison(maison_du_bail(bail_du_recu(paiement_id, mouvement_caution_id))));
create policy reimpressions_select on reimpressions for select using (
  exists (select 1 from recus r where r.id = recu_id));

-- demandes
create policy demandes_select on demandes for select using (peut_gerer_espace(espace_id) or demande_par = auth.uid());
create policy demandes_insert on demandes for insert with check (
  role_dans(espace_id) = 'gestionnaire' and demande_par = auth.uid() and statut = 'en_attente');

-- compteurs_recus : aucune politique (accès uniquement via fonctions security definer)
