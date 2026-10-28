-- =====================================================================
-- Vider un espace : efface tout son contenu (maisons, logements, locataires,
-- baux, paiements, reçus, cautions, demandes, corbeille, notifications,
-- historique, numérotation des reçus) en gardant l'espace, ses comptes et
-- ses réglages (logo, couleurs, préfixe). Script : npm run espace:vider.
-- Service_role uniquement. Le journal d'audit est conservé.
-- =====================================================================

set search_path = public, extensions;

create or replace function vider_espace(p_espace uuid, p_simulation boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_compte jsonb;
begin
  if not exists (select 1 from espaces where id = p_espace) then raise exception 'Espace introuvable.'; end if;

  v_compte := jsonb_build_object(
    'maisons', (select count(*) from maisons where espace_id = p_espace),
    'logements', (select count(*) from logements where espace_id = p_espace),
    'locataires', (select count(*) from locataires where espace_id = p_espace),
    'baux', (select count(*) from baux where espace_id = p_espace),
    'paiements', (select count(*) from paiements where espace_id = p_espace),
    'recus', (select count(*) from recus where espace_id = p_espace),
    'cautions', (select count(*) from mouvements_caution where espace_id = p_espace),
    'demandes', (select count(*) from demandes where espace_id = p_espace),
    'corbeille', (select count(*) from lots_suppression where espace_id = p_espace),
    'notifications', (select count(*) from notifications where espace_id = p_espace),
    'historique', (select count(*) from historique_modifications where espace_id = p_espace));
  if p_simulation then return v_compte; end if;

  delete from demandes where espace_id = p_espace;
  delete from lots_suppression where espace_id = p_espace;
  delete from notifications where espace_id = p_espace;
  -- Les locataires puis les maisons emportent par cascade baux, révisions, paiements,
  -- imputations, cautions, reçus, réimpressions, logements et maisons confiées.
  delete from locataires where espace_id = p_espace;
  delete from maisons where espace_id = p_espace;
  delete from compteurs_recus where espace_id = p_espace;
  -- En dernier : efface aussi les lignes d'historique créées par les suppressions ci-dessus
  delete from historique_modifications where espace_id = p_espace;
  return v_compte;
end $$;

revoke execute on function vider_espace(uuid, boolean) from public, anon, authenticated;
grant execute on function vider_espace(uuid, boolean) to service_role;
