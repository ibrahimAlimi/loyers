-- =====================================================================
-- Régularisation : jusqu'au DERNIER MOIS PAYÉ seulement (et non plus jusqu'au
-- mois de la date du dernier paiement, qui pouvait aller jusqu'au mois courant).
-- La fonction est maintenant relançable : elle remplace les régularisations
-- existantes de l'espace. L'aperçu (simulation) montre le résultat réel :
-- tout est calculé puis annulé.
--    select regulariser_anciens_mois('ABD');          -- aperçu
--    select regulariser_anciens_mois('ABD', false);   -- remplace et applique
-- =====================================================================

set search_path = public, extensions;

create or replace function regulariser_anciens_mois(p_prefixe text, p_simulation boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_espace uuid; v_proprio uuid; v_bail record; v_limite date; v_date date; v_mois date[]; v_restes int[];
  v_total int; v_paiement uuid; v_resultat jsonb := '[]'; v_remplacees int := 0;
  v_motif text := 'Régularisation : anciens mois déclarés réglés par le propriétaire';
begin
  select id into v_espace from espaces where prefixe_recu = upper(trim(p_prefixe));
  if v_espace is null then raise exception 'Aucun espace avec le préfixe %.', p_prefixe; end if;
  select user_id into v_proprio from membres
   where espace_id = v_espace and role = 'proprietaire' and actif order by cree_le limit 1;
  if v_proprio is null then raise exception 'Cet espace n''a pas de propriétaire.'; end if;

  -- Sous-transaction : en simulation, tout ce qui suit est annulé à la fin (les variables gardent le résultat)
  begin
    delete from paiements
     where espace_id = v_espace and montant = 0 and payeur = 'Régularisation' and reprise is null;
    get diagnostics v_remplacees = row_count;

    for v_bail in
      select b.id, b.espace_id, trim(lo.nom || ' ' || coalesce(lo.prenoms, '')) as locataire, lg.designation as logement
      from baux b join locataires lo on lo.id = b.locataire_id join logements lg on lg.id = b.logement_id
      where b.espace_id = v_espace and b.supprime_le is null and lo.supprime_le is null and lg.supprime_le is null
      order by lo.nom
    loop
      -- Dernier mois réellement payé (paiements avec de l'argent, non annulés)
      select max(im.mois), max(p.date_paiement) into v_limite, v_date
        from paiements p join imputations im on im.paiement_id = p.id and im.supprime_le is null
       where p.bail_id = v_bail.id and p.statut = 'valide' and p.supprime_le is null and p.montant > 0 and im.montant > 0;
      continue when v_limite is null;   -- aucun paiement : rien à régulariser

      select array_agg(e.mois order by e.mois), array_agg(e.reste order by e.mois), coalesce(sum(e.reste), 0)
        into v_mois, v_restes, v_total
        from echeances_bail(v_bail.id, v_limite) e where e.reste > 0;
      continue when v_total = 0;

      v_resultat := v_resultat || jsonb_build_object(
        'locataire', v_bail.locataire, 'logement', v_bail.logement,
        'jusqua', to_char(v_limite, 'MM/YYYY'), 'nb_mois', cardinality(v_mois), 'montant', v_total,
        'mois', (select jsonb_agg(to_char(m, 'MM/YYYY')) from unnest(v_mois) m));

      insert into paiements (espace_id, bail_id, date_paiement, montant, remise, motif_remise, mode, payeur,
                             encaisse_par, cle_idempotence)
      values (v_bail.espace_id, v_bail.id, v_date, 0, v_total, v_motif, 'autre', 'Régularisation',
              v_proprio, gen_random_uuid())
      returning id into v_paiement;
      insert into imputations (espace_id, paiement_id, bail_id, mois, montant, remise)
      select v_bail.espace_id, v_paiement, v_bail.id, m.mois, 0, m.reste
        from unnest(v_mois, v_restes) as m(mois, reste);
    end loop;

    if p_simulation then raise exception using errcode = 'MLSIM', message = 'simulation'; end if;
  exception when sqlstate 'MLSIM' then
    null;   -- simulation : modifications annulées
  end;

  return jsonb_build_object(
    'simulation', p_simulation,
    'regularisations_remplacees', v_remplacees,
    'baux', jsonb_array_length(v_resultat),
    'mois', (select coalesce(sum((x ->> 'nb_mois')::int), 0) from jsonb_array_elements(v_resultat) x),
    'montant', (select coalesce(sum((x ->> 'montant')::int), 0) from jsonb_array_elements(v_resultat) x),
    'detail', v_resultat);
end $$;

revoke execute on function regulariser_anciens_mois(text, boolean) from public, anon, authenticated;
grant execute on function regulariser_anciens_mois(text, boolean) to service_role;
