-- =====================================================================
-- Entretien mensuel et cautions
-- 1) baux.entretien : somme payée chaque mois en plus du loyer (ex. 5 000 FCFA).
--    baux.loyer et revisions_loyer.montant sont le loyer SANS entretien ;
--    loyer_du_mois (donc les échéances, les reçus, les statistiques) renvoie
--    loyer + entretien : le montant réellement dû chaque mois.
-- 2) appliquer_entretien_caution (à lancer dans le SQL Editor, une fois par espace) :
--    - sépare l'entretien du loyer des baux existants (total inchangé) ;
--    - crée la caution versée à l'entrée : 3 mois de loyer + 30 000 pour l'eau ;
--    - locataires partis : départ fixé 3 mois après le dernier mois payé,
--      ces 3 mois payés par la caution, caution de l'eau gardée.
--    select appliquer_entretien_caution('ABD');          -- aperçu (rien n'est écrit)
--    select appliquer_entretien_caution('ABD', false);   -- applique
-- =====================================================================

set search_path = public, extensions;

alter table baux add column entretien int not null default 0 check (entretien >= 0);

-- Montant dû pour un mois : loyer du mois (révisions comprises) + entretien
create or replace function loyer_du_mois(p_bail uuid, p_mois date) returns int
language sql stable set search_path = public as $$
  select coalesce(
    (select r.montant from revisions_loyer r
      where r.bail_id = p_bail and r.mois_effet <= p_mois and r.supprime_le is null
      order by r.mois_effet desc limit 1),
    (select b.loyer from baux b where b.id = p_bail))
  + (select b.entretien from baux b where b.id = p_bail)
$$;

-- Situation : on ajoute l'entretien (dernière colonne, la vue garde ses colonnes existantes)
create or replace view v_situation_baux with (security_invoker = on) as
select b.id as bail_id, b.espace_id, l.maison_id, b.logement_id, b.locataire_id,
       b.actif, b.date_debut, b.date_fin, b.loyer,
       case when s.premier_du is null then s.dernier_mois
            when s.premier_du = date_trunc('month', b.date_debut)::date then null
            else (s.premier_du - interval '1 month')::date end as dernier_mois_solde,
       coalesce(s.premier_du,
                case when b.date_fin is null and s.dernier_mois is not null then (s.dernier_mois + interval '1 month')::date
                     when b.date_fin is null then date_trunc('month', b.date_debut)::date end) as prochain_mois_du,
       s.nb_mois_dus::int,
       s.nb_mois_retard::int,
       s.montant_du::int,
       case when s.nb_mois_retard >= 2 then 'critique'
            when s.nb_mois_retard >= 1 then 'retard'
            else 'a_jour' end as statut,
       b.entretien
from baux b
join logements l on l.id = b.logement_id
join espaces esp on esp.id = b.espace_id
cross join lateral (
  select min(e.mois) filter (where e.reste > 0) as premier_du,
         max(e.mois) as dernier_mois,
         count(*) filter (where e.reste > 0 and e.mois <= date_trunc('month', aujourdhui())) as nb_mois_dus,
         count(*) filter (where e.reste > 0
                          and aujourdhui() > e.mois + (b.jour_echeance - 1) + esp.delai_retard_jours) as nb_mois_retard,
         coalesce(sum(e.reste) filter (where e.mois <= date_trunc('month', aujourdhui())), 0) as montant_du
  from echeances_bail(b.id, greatest(aujourdhui(),
         coalesce((select max(im.mois) from imputations im join paiements p on p.id = im.paiement_id
                   where im.bail_id = b.id and p.statut = 'valide' and p.supprime_le is null), aujourdhui()))) e
) s
where b.supprime_le is null and l.supprime_le is null;

create or replace function appliquer_entretien_caution(
  p_prefixe text, p_simulation boolean default true,
  p_entretien int default 5000, p_mois_caution int default 3, p_caution_eau int default 30000)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_espace uuid; v_proprio uuid; b record; v_base int; v_caution int; v_dernier date; v_fin date;
  v_mois date; v_reste int; v_dispo int; v_part int; v_total_caution int; v_total_remise int;
  v_paiement uuid; v_detail jsonb := '[]'; v_ligne jsonb; v_premier date; v_dernier_couvert date;
begin
  select id into v_espace from espaces where prefixe_recu = upper(trim(p_prefixe));
  if v_espace is null then raise exception 'Aucun espace avec le préfixe %.', p_prefixe; end if;
  select user_id into v_proprio from membres
   where espace_id = v_espace and role = 'proprietaire' and actif order by cree_le limit 1;
  if v_proprio is null then raise exception 'Cet espace n''a pas de propriétaire.'; end if;

  -- Sous-transaction : en simulation, tout ce qui suit est annulé à la fin (les variables gardent le résultat)
  begin
    for b in
      select bx.id, bx.espace_id, bx.loyer, bx.entretien, bx.date_debut, bx.date_fin,
             trim(lo.nom || ' ' || coalesce(lo.prenoms, '')) as locataire, m.nom || ' · ' || lg.designation as logement
      from baux bx join locataires lo on lo.id = bx.locataire_id
      join logements lg on lg.id = bx.logement_id join maisons m on m.id = lg.maison_id
      where bx.espace_id = v_espace and bx.supprime_le is null
      order by lo.nom
    loop
      v_ligne := jsonb_build_object('locataire', b.locataire, 'logement', b.logement);

      -- 1. Entretien séparé du loyer (le total dû ne change pas)
      if b.entretien = 0 and b.loyer > p_entretien then
        update baux set loyer = loyer - p_entretien, entretien = p_entretien where id = b.id;
        update revisions_loyer set montant = montant - p_entretien where bail_id = b.id and montant > p_entretien;
        v_ligne := v_ligne || jsonb_build_object('loyer', b.loyer - p_entretien, 'entretien', p_entretien);
      end if;

      -- 2. Caution versée à l'entrée : 3 mois de loyer (sans entretien) + eau
      if not exists (select 1 from mouvements_caution where bail_id = b.id and supprime_le is null) then
        select loyer_du_mois(b.id, date_trunc('month', b.date_debut)::date) - entretien into v_base from baux where id = b.id;
        v_caution := p_mois_caution * v_base + p_caution_eau;
        update baux set caution_montant = v_caution where id = b.id;
        insert into mouvements_caution (espace_id, bail_id, type, montant, date_mouvement, motif, mode, encaisse_par)
        values (b.espace_id, b.id, 'versement', v_caution, b.date_debut,
                format('Caution à l''entrée : %s mois de loyer (%s × %s FCFA) + %s FCFA pour l''eau',
                       p_mois_caution, p_mois_caution, v_base, p_caution_eau),
                'especes', v_proprio);
        v_ligne := v_ligne || jsonb_build_object('caution', v_caution);
      end if;

      -- 3. Locataire parti : départ 3 mois après le dernier mois payé, ces mois payés par la caution
      if b.date_fin is not null
         and not exists (select 1 from paiements where bail_id = b.id and payeur = 'Caution' and supprime_le is null) then
        select max(im.mois) into v_dernier
          from paiements p join imputations im on im.paiement_id = p.id and im.supprime_le is null
         where p.bail_id = b.id and p.statut = 'valide' and p.supprime_le is null and p.montant > 0 and im.montant > 0;
        if v_dernier is not null then
          v_fin := ((v_dernier + make_interval(months => p_mois_caution + 1)) - interval '1 day')::date;
          update baux set date_fin = greatest(v_fin, date_debut) where id = b.id;

          select loyer_du_mois(b.id, date_trunc('month', b.date_debut)::date) - entretien into v_base from baux where id = b.id;
          v_dispo := p_mois_caution * v_base;   -- part « loyers » de la caution
          v_total_caution := 0; v_total_remise := 0; v_premier := null; v_dernier_couvert := null;

          insert into paiements (espace_id, bail_id, date_paiement, montant, remise, motif_remise, mode, payeur,
                                 encaisse_par, cle_idempotence)
          values (b.espace_id, b.id, greatest(v_fin, b.date_debut), 1, 0, null, 'autre', 'Caution', v_proprio, gen_random_uuid())
          returning id into v_paiement;

          for v_mois, v_reste in
            select e.mois, e.reste from echeances_bail(b.id, v_fin) e
             where e.reste > 0 and e.mois > v_dernier order by e.mois
          loop
            v_part := least(v_reste, v_dispo);
            v_dispo := v_dispo - v_part;
            insert into imputations (espace_id, paiement_id, bail_id, mois, montant, remise)
            values (b.espace_id, v_paiement, b.id, v_mois, v_part, v_reste - v_part);
            v_total_caution := v_total_caution + v_part;
            v_total_remise := v_total_remise + (v_reste - v_part);
            v_premier := coalesce(v_premier, v_mois);
            v_dernier_couvert := v_mois;
          end loop;

          if v_total_caution > 0 then
            update paiements set montant = v_total_caution, remise = v_total_remise,
                   motif_remise = case when v_total_remise > 0 then 'Entretien des derniers mois non réclamé au départ' end
             where id = v_paiement;
            insert into mouvements_caution (espace_id, bail_id, type, montant, date_mouvement, motif, mode, encaisse_par)
            values (b.espace_id, b.id, 'retenue', v_total_caution, greatest(v_fin, b.date_debut),
                    format('Loyers de %s à %s payés par la caution', to_char(v_premier, 'MM/YYYY'), to_char(v_dernier_couvert, 'MM/YYYY')),
                    'especes', v_proprio);
          else
            delete from paiements where id = v_paiement;   -- rien à payer après le dernier mois payé
          end if;
          if situation_caution(b.id) >= p_caution_eau then
            insert into mouvements_caution (espace_id, bail_id, type, montant, date_mouvement, motif, mode, encaisse_par)
            values (b.espace_id, b.id, 'retenue', p_caution_eau, greatest(v_fin, b.date_debut),
                    'Caution de l''eau gardée (facture d''eau)', 'especes', v_proprio);
          end if;

          v_ligne := v_ligne || jsonb_build_object(
            'dernier_mois_paye', to_char(v_dernier, 'MM/YYYY'),
            'depart', to_char(greatest(v_fin, b.date_debut), 'DD/MM/YYYY'),
            'paye_par_caution', v_total_caution,
            'mois_payes_par_caution', case when v_premier is null then null
                                           else to_char(v_premier, 'MM/YYYY') || ' → ' || to_char(v_dernier_couvert, 'MM/YYYY') end);
        end if;
      end if;

      if v_ligne ?| array['loyer', 'caution', 'depart'] then v_detail := v_detail || v_ligne; end if;
    end loop;

    if p_simulation then raise exception using errcode = 'MLSIM', message = 'simulation'; end if;
  exception when sqlstate 'MLSIM' then
    null;   -- simulation : modifications annulées
  end;

  return jsonb_build_object('simulation', p_simulation, 'baux_modifies', jsonb_array_length(v_detail), 'detail', v_detail);
end $$;

revoke execute on function appliquer_entretien_caution(text, boolean, int, int, int) from public, anon, authenticated;
grant execute on function appliquer_entretien_caution(text, boolean, int, int, int) to service_role;
