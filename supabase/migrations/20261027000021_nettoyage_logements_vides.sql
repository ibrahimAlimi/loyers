-- =====================================================================
-- nettoyer_reprise : ne supprime plus que les logements « Sans nom » VIDES
-- (sans aucun bail). Un logement sans nom mais loué garde son locataire,
-- ses paiements et ses reçus : il suffit de le renommer.
-- =====================================================================

set search_path = public, extensions;

create or replace function nettoyer_reprise(p_prefixe text, p_simulation boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_espace uuid; v_doublons uuid[]; v_logements uuid[]; v_locataires uuid[]; v_resultat jsonb;
begin
  select id into v_espace from espaces where prefixe_recu = upper(trim(p_prefixe));
  if v_espace is null then raise exception 'Aucun espace avec le préfixe %.', p_prefixe; end if;

  select coalesce(array_agg(id), '{}') into v_doublons from paiements
   where espace_id = v_espace and reprise is not null and 'doublon' = any (a_verifier);
  select coalesce(array_agg(id), '{}') into v_logements from logements
   where espace_id = v_espace and lower(trim(designation)) = 'sans nom'
     and not exists (select 1 from baux b where b.logement_id = logements.id);
  -- Locataires dont tous les baux sont dans ces logements
  select coalesce(array_agg(distinct b.locataire_id), '{}') into v_locataires from baux b
   where b.logement_id = any (v_logements)
     and not exists (select 1 from baux b2 where b2.locataire_id = b.locataire_id and b2.logement_id <> all (v_logements));

  v_resultat := jsonb_build_object(
    'espace', (select nom from espaces where id = v_espace),
    'doublons', (select coalesce(jsonb_agg(jsonb_build_object(
        'locataire', trim(lo.nom || ' ' || coalesce(lo.prenoms, '')), 'logement', lg.designation,
        'mois', to_char(im.mois, 'MM/YYYY'), 'montant', p.montant, 'paye_le', to_char(p.date_paiement, 'DD/MM/YYYY'))
        order by lo.nom, im.mois), '[]')
      from paiements p join baux b on b.id = p.bail_id join locataires lo on lo.id = b.locataire_id
      join logements lg on lg.id = b.logement_id
      left join imputations im on im.paiement_id = p.id
      where p.id = any (v_doublons)),
    'logements_sans_nom', (select coalesce(jsonb_agg(jsonb_build_object(
        'maison', m.nom,
        'baux', (select count(*) from baux where logement_id = lg.id),
        'paiements', (select count(*) from paiements p join baux b on b.id = p.bail_id where b.logement_id = lg.id),
        'locataires', (select coalesce(jsonb_agg(trim(lo.nom || ' ' || coalesce(lo.prenoms, ''))), '[]')
                       from baux b join locataires lo on lo.id = b.locataire_id where b.logement_id = lg.id))), '[]')
      from logements lg join maisons m on m.id = lg.maison_id where lg.id = any (v_logements)),
    'locataires_supprimes', (select coalesce(jsonb_agg(trim(nom || ' ' || coalesce(prenoms, ''))), '[]')
      from locataires where id = any (v_locataires)),
    'simulation', p_simulation);
  if p_simulation then return v_resultat; end if;

  delete from demandes where espace_id = v_espace and cible_table = 'paiements' and cible_id = any (v_doublons);
  delete from paiements where id = any (v_doublons);              -- imputations et reçus suivent
  delete from demandes where espace_id = v_espace and cible_id = any (v_logements);
  delete from logements where id = any (v_logements);             -- baux, paiements, reçus suivent
  delete from locataires where id = any (v_locataires);
  return v_resultat;
end $$;

revoke execute on function nettoyer_reprise(text, boolean) from public, anon, authenticated;
grant execute on function nettoyer_reprise(text, boolean) to service_role;
