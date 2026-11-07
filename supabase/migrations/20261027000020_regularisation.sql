-- =====================================================================
-- Régulariser les anciens mois d'un espace (à lancer dans le SQL Editor) :
-- pour chaque bail, les mois encore dus jusqu'au dernier paiement enregistré
-- (le plus tardif entre le dernier mois payé et le mois de la date du dernier
-- paiement) sont déclarés réglés par le propriétaire.
-- Chaque bail reçoit une « régularisation » : un paiement de 0 FCFA, sans reçu,
-- qui solde ces mois par une remise. Elle apparaît sur la fiche du locataire ;
-- l'annuler rend ces mois de nouveau dus.
--    select regulariser_anciens_mois('ABD');          -- montre ce qui serait réglé
--    select regulariser_anciens_mois('ABD', false);   -- règle
-- =====================================================================

set search_path = public, extensions;

-- Seule une régularisation (remise sans argent) peut valoir 0 FCFA
alter table paiements drop constraint paiements_montant_check;
alter table paiements add constraint paiements_montant_check check (montant > 0 or (montant = 0 and remise > 0));

create or replace function regulariser_anciens_mois(p_prefixe text, p_simulation boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_espace uuid; v_proprio uuid; v_bail record; v_limite date; v_date date; v_mois date[]; v_restes int[];
  v_total int; v_paiement uuid; v_resultat jsonb := '[]'; v_motif text := 'Régularisation : anciens mois déclarés réglés par le propriétaire';
begin
  select id into v_espace from espaces where prefixe_recu = upper(trim(p_prefixe));
  if v_espace is null then raise exception 'Aucun espace avec le préfixe %.', p_prefixe; end if;
  select user_id into v_proprio from membres
   where espace_id = v_espace and role = 'proprietaire' and actif order by cree_le limit 1;
  if v_proprio is null then raise exception 'Cet espace n''a pas de propriétaire.'; end if;

  for v_bail in
    select b.id, b.espace_id, trim(lo.nom || ' ' || coalesce(lo.prenoms, '')) as locataire, lg.designation as logement
    from baux b join locataires lo on lo.id = b.locataire_id join logements lg on lg.id = b.logement_id
    where b.espace_id = v_espace and b.supprime_le is null and lo.supprime_le is null and lg.supprime_le is null
    order by lo.nom
  loop
    select greatest(max(im.mois), date_trunc('month', max(p.date_paiement))::date), max(p.date_paiement)
      into v_limite, v_date
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
    continue when p_simulation;

    insert into paiements (espace_id, bail_id, date_paiement, montant, remise, motif_remise, mode, payeur,
                           encaisse_par, cle_idempotence)
    values (v_bail.espace_id, v_bail.id, v_date, 0, v_total, v_motif, 'autre', 'Régularisation',
            v_proprio, gen_random_uuid())
    returning id into v_paiement;
    insert into imputations (espace_id, paiement_id, bail_id, mois, montant, remise)
    select v_bail.espace_id, v_paiement, v_bail.id, m.mois, 0, m.reste
      from unnest(v_mois, v_restes) as m(mois, reste);
  end loop;

  return jsonb_build_object(
    'simulation', p_simulation,
    'baux', jsonb_array_length(v_resultat),
    'mois', (select coalesce(sum((x ->> 'nb_mois')::int), 0) from jsonb_array_elements(v_resultat) x),
    'montant', (select coalesce(sum((x ->> 'montant')::int), 0) from jsonb_array_elements(v_resultat) x),
    'detail', v_resultat);
end $$;

revoke execute on function regulariser_anciens_mois(text, boolean) from public, anon, authenticated;
grant execute on function regulariser_anciens_mois(text, boolean) to service_role;
