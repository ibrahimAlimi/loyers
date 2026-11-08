-- =====================================================================
-- Retrait de l'entretien séparé (migration 24) : l'entretien est remis dans
-- le loyer (loyer = montant payé chaque mois, révisions comprises) et la
-- colonne baux.entretien disparaît. Les cautions et les départs déjà
-- enregistrés ne changent pas.
-- =====================================================================

set search_path = public, extensions;

-- 1. L'entretien revient dans le loyer et dans les révisions (le total dû ne change pas)
update revisions_loyer r set montant = r.montant + b.entretien
  from baux b where b.id = r.bail_id and b.entretien > 0;
update baux set loyer = loyer + entretien, entretien = 0 where entretien > 0;

-- 2. Montant dû pour un mois : le loyer du mois (révisions comprises), comme avant
create or replace function loyer_du_mois(p_bail uuid, p_mois date) returns int
language sql stable set search_path = public as $$
  select coalesce(
    (select r.montant from revisions_loyer r
      where r.bail_id = p_bail and r.mois_effet <= p_mois and r.supprime_le is null
      order by r.mois_effet desc limit 1),
    (select b.loyer from baux b where b.id = p_bail))
$$;

-- 3. Situation des baux, sans la colonne entretien
drop view v_situation_baux;
create view v_situation_baux with (security_invoker = on) as
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
            else 'a_jour' end as statut
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
grant select on v_situation_baux to authenticated;

-- 4. La fonction de reprise qui séparait l'entretien n'a plus lieu d'être
drop function if exists appliquer_entretien_caution(text, boolean, int, int, int);

alter table baux drop column entretien;
