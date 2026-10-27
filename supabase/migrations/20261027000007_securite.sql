-- =====================================================================
-- Durcissement de la sécurité (revue du Lot 1).
-- 1. Colonnes système (espace, auteur, corbeille) non modifiables par le client :
--    empêchait un gestionnaire de « supprimer » via un simple UPDATE supprime_le,
--    ou de déplacer un locataire vers un autre espace.
-- 2. Appartenances (membres) : espace et utilisateur immuables, pas d'auto-modification.
-- 3. Demandes : la cible doit appartenir au même espace et être visible du demandeur.
-- 4. Paiement de remplacement : même bail obligatoire.
-- 5. Fonctions internes qui révélaient des noms à partir d'un identifiant : non exposées.
-- 6. Rôle anonyme : aucun accès aux tables ni aux vues (seules 2 fonctions publiques).
-- 7. Fichiers : images uniquement, 2 Mo maximum.
-- =====================================================================

set search_path = public, extensions;

-- ---------- 1. Colonnes système ----------
create or replace function proteger_colonnes_systeme() returns trigger
language plpgsql as $$
begin
  if est_appel_technique() then return new; end if;
  if tg_op = 'INSERT' then
    new.supprime_le := null;
    new.supprime_par := null;
    new.lot_suppression := null;
    new.cree_par := auth.uid();
    new.cree_le := now();
    return new;
  end if;
  if new.espace_id is distinct from old.espace_id then
    raise exception 'Un élément ne peut pas changer d''espace.';
  end if;
  if new.supprime_le is distinct from old.supprime_le
     or new.supprime_par is distinct from old.supprime_par
     or new.lot_suppression is distinct from old.lot_suppression then
    raise exception 'Pour supprimer ou restaurer, utilisez la Corbeille.';
  end if;
  new.cree_par := old.cree_par;
  new.cree_le := old.cree_le;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['maisons','logements','locataires','baux','revisions_loyer','paiements','imputations',
                           'mouvements_caution','recus','demandes']
  loop
    -- préfixe « zz_ » : s'exécute après les déclencheurs qui recalculent espace_id
    execute format('create trigger zz_%I_proteger before insert or update on %I
                    for each row execute function proteger_colonnes_systeme()', t, t);
  end loop;
end $$;

-- ---------- 2. Appartenances ----------
create or replace function proteger_membres() returns trigger
language plpgsql as $$
begin
  if est_appel_technique() or est_super_admin() then return new; end if;
  if new.espace_id is distinct from old.espace_id or new.user_id is distinct from old.user_id then
    raise exception 'Modification non autorisée.';
  end if;
  if old.user_id = auth.uid() then
    raise exception 'Vous ne pouvez pas modifier votre propre accès.';
  end if;
  if old.role = 'proprietaire' then
    raise exception 'Seul l''administrateur peut modifier le compte du propriétaire.';
  end if;
  return new;
end $$;
create trigger membres_proteger before update on membres
  for each row execute function proteger_membres();

-- membre_maisons : la maison doit appartenir au même espace
create or replace function verifier_membre_maison() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from maisons where id = new.maison_id and espace_id = new.espace_id) then
    raise exception 'Cette maison n''appartient pas à cet espace.';
  end if;
  return new;
end $$;
create trigger membre_maisons_verifier before insert or update on membre_maisons
  for each row execute function verifier_membre_maison();

-- ---------- 3. Demandes ----------
create or replace function verifier_demande() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_espace uuid; v_visible boolean;
begin
  if new.type = 'annulation_paiement' and new.cible_table <> 'paiements' then
    raise exception 'Demande invalide.';
  end if;
  if new.type = 'suppression' and not (new.cible_table = any (array['maisons','logements','locataires','baux','paiements','mouvements_caution'])) then
    raise exception 'Demande invalide.';
  end if;
  v_espace := espace_de(new.cible_table, new.cible_id);
  if v_espace is distinct from new.espace_id then
    raise exception 'Élément introuvable dans cet espace.';
  end if;
  v_visible := case new.cible_table
    when 'maisons' then peut_voir_maison(new.cible_id)
    when 'logements' then peut_gerer_maison(maison_du_logement(new.cible_id))
    when 'locataires' then peut_modifier_locataire(new.cible_id)
    when 'baux' then peut_gerer_maison(maison_du_bail(new.cible_id))
    when 'paiements' then peut_gerer_maison(maison_du_bail((select bail_id from paiements where id = new.cible_id)))
    when 'mouvements_caution' then peut_gerer_maison(maison_du_bail((select bail_id from mouvements_caution where id = new.cible_id)))
  end;
  if not coalesce(v_visible, false) then raise exception 'Élément introuvable.'; end if;
  new.cible_libelle := libelle_de(new.cible_table, new.cible_id);
  return new;
end $$;
create trigger demandes_verifier before insert on demandes
  for each row execute function verifier_demande();

-- ---------- 4. Paiement de remplacement ----------
create or replace function verifier_remplacement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.remplace_paiement_id is not null and not exists (
    select 1 from paiements where id = new.remplace_paiement_id and bail_id = new.bail_id) then
    raise exception 'Le paiement remplacé doit concerner le même bail.';
  end if;
  return new;
end $$;
create trigger paiements_remplacement before insert on paiements
  for each row execute function verifier_remplacement();

-- ---------- 5. Fonctions internes non exposées ----------
revoke execute on function espace_de(text, uuid) from authenticated;
revoke execute on function libelle_de(text, uuid) from authenticated;
revoke execute on function collecter_cascade(text, uuid) from authenticated;
revoke execute on function verifier_droit_suppression(text, uuid) from authenticated;

-- ---------- 6. Rôle anonyme ----------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function verifier_recu(text) to anon;
grant execute on function identifiant_pour_email(citext) to anon;
-- Les objets créés plus tard n'ouvrent rien par défaut à anon
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------- 7. Fichiers ----------
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id in ('espaces', 'profils');
