-- =====================================================================
-- Correctif : « new row violates row-level security policy » à l'insertion
-- d'une maison ou d'un locataire suivie d'une relecture (INSERT ... RETURNING).
-- Cause : les politiques de lecture appelaient une fonction qui relisait la
-- ligne dans la table ; pendant l'INSERT, la nouvelle ligne n'est pas encore
-- visible pour cette fonction. Les politiques s'appuient désormais sur les
-- colonnes de la ligne elle-même.
-- =====================================================================

set search_path = public, extensions;

-- ---------- Maisons ----------
create or replace function peut_voir_maison_ligne(p_espace uuid, p_maison uuid, p_gestionnaire uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_role role_membre;
begin
  if est_super_admin() then return true; end if;
  v_role := role_dans(p_espace);
  if v_role = 'proprietaire' then return true; end if;
  if v_role = 'gestionnaire' then return p_gestionnaire = auth.uid(); end if;
  if v_role = 'consultation' then
    return not exists (select 1 from membre_maisons mm where mm.espace_id = p_espace and mm.user_id = auth.uid())
        or exists (select 1 from membre_maisons mm where mm.user_id = auth.uid() and mm.maison_id = p_maison);
  end if;
  return false;
end $$;

-- La version par identifiant (utilisée pour les logements, baux, paiements…) délègue à la version par ligne
create or replace function peut_voir_maison(p_maison uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_espace uuid; v_gest uuid;
begin
  if est_super_admin() then return true; end if;
  select espace_id, gestionnaire_id into v_espace, v_gest from maisons where id = p_maison;
  if v_espace is null then return false; end if;
  return peut_voir_maison_ligne(v_espace, p_maison, v_gest);
end $$;

drop policy maisons_select on maisons;
create policy maisons_select on maisons for select using (peut_voir_maison_ligne(espace_id, id, gestionnaire_id));

-- ---------- Locataires ----------
create or replace function peut_voir_locataire_ligne(p_locataire uuid, p_espace uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if peut_gerer_espace(p_espace) then return true; end if;
  if exists (select 1 from baux b join logements l on l.id = b.logement_id
             where b.locataire_id = p_locataire and peut_voir_maison(l.maison_id)) then
    return true;
  end if;
  -- Locataire sans bail : visible par les gestionnaires de l'espace (création avant le bail)
  return coalesce(role_dans(p_espace)::text, '') = 'gestionnaire'
     and not exists (select 1 from baux b where b.locataire_id = p_locataire and b.supprime_le is null);
end $$;

drop policy locataires_select on locataires;
create policy locataires_select on locataires for select using (peut_voir_locataire_ligne(id, espace_id));

revoke execute on function peut_voir_maison_ligne(uuid, uuid, uuid) from public, anon;
revoke execute on function peut_voir_locataire_ligne(uuid, uuid) from public, anon;
grant execute on function peut_voir_maison_ligne(uuid, uuid, uuid) to authenticated;
grant execute on function peut_voir_locataire_ligne(uuid, uuid) to authenticated;
