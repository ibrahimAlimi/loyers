-- =====================================================================
-- Lot 2 : statistiques complètes (§6.7 de la spec).
-- Tout hérite de la RLS (security invoker) : un gestionnaire ne voit que ses maisons.
-- Filtres (p_filtres) : { maison, type, gestionnaire, mode } ; les absents valent « tous ».
-- Le mode de paiement ne filtre que les encaissements (pas l'attendu ni les arriérés).
-- =====================================================================

create or replace function stats_logements(p_espace uuid, p_filtres jsonb default '{}')
returns table (id uuid, maison_id uuid, maison text, type type_logement, designation text,
               loyer_reference int, gestionnaire_id uuid, cree_le date)
language sql stable set search_path = public as $$
  select l.id, l.maison_id, m.nom, l.type, l.designation, l.loyer_reference, m.gestionnaire_id, l.cree_le::date
  from logements l join maisons m on m.id = l.maison_id
  where l.espace_id = p_espace and l.supprime_le is null and m.supprime_le is null
    and (nullif(p_filtres->>'maison', '') is null or l.maison_id = (p_filtres->>'maison')::uuid)
    and (nullif(p_filtres->>'type', '') is null or l.type = (p_filtres->>'type')::type_logement)
    and (nullif(p_filtres->>'gestionnaire', '') is null or m.gestionnaire_id = (p_filtres->>'gestionnaire')::uuid)
$$;

create or replace function stats_baux(p_espace uuid, p_filtres jsonb default '{}')
returns table (id uuid, logement_id uuid, maison_id uuid, maison text, type type_logement, logement text,
               gestionnaire_id uuid, locataire_id uuid, locataire text, telephone text,
               date_debut date, date_fin date, jour_echeance smallint, loyer int)
language sql stable set search_path = public as $$
  select b.id, b.logement_id, l.maison_id, l.maison, l.type, l.designation, l.gestionnaire_id,
         lo.id, trim(lo.nom || ' ' || coalesce(lo.prenoms, '')), lo.telephone,
         b.date_debut, b.date_fin, b.jour_echeance, b.loyer
  from baux b
  join stats_logements(p_espace, p_filtres) l on l.id = b.logement_id
  join locataires lo on lo.id = b.locataire_id
  where b.supprime_le is null and lo.supprime_le is null
$$;

-- Un logement est occupé à une date s'il a un bail qui couvre cette date.
create or replace function logement_occupe(p_logement uuid, p_date date) returns boolean
language sql stable set search_path = public as $$
  select exists (select 1 from baux x where x.logement_id = p_logement and x.supprime_le is null
                 and x.date_debut <= p_date and (x.date_fin is null or x.date_fin >= p_date))
$$;

create or replace function stats_completes(
  p_espace uuid, p_debut date, p_fin date, p_filtres jsonb default '{}', p_complet boolean default true
) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  v_debut date := date_trunc('month', p_debut)::date;
  v_arret date := least(p_fin, aujourdhui());                      -- « à la fin de la période », jamais dans le futur
  v_mois_arret date := date_trunc('month', least(p_fin, aujourdhui()))::date;
  v_jusqua date := greatest(p_fin, aujourdhui());
  v_mode mode_paiement := nullif(p_filtres->>'mode', '')::mode_paiement;
  v_delai int;
  v_suivant date := (date_trunc('month', aujourdhui()) + interval '1 month')::date;
  -- Pour une période courte (un mois), le graphique montre les 12 derniers mois.
  v_graph_debut date := case when p_fin - p_debut < 85 then (date_trunc('month', p_fin) - interval '11 months')::date
                             else date_trunc('month', p_debut)::date end;
  v_ind jsonb;
  v_sec jsonb;
begin
  select delai_retard_jours into v_delai from espaces where id = p_espace;
  v_delai := coalesce(v_delai, 5);

  -- ---------- Indicateurs clés ----------
  with bx as (select * from stats_baux(p_espace, p_filtres)),
  ech as (
    select b.id as bail_id, b.jour_echeance, e.*
    from bx b cross join lateral echeances_bail(b.id, v_jusqua) e
  ),
  pay as (
    select p.* from paiements p join bx b on b.id = p.bail_id
    where p.statut = 'valide' and p.supprime_le is null and (v_mode is null or p.mode = v_mode)
      and p.date_paiement between p_debut and p_fin
  ),
  soldes as (
    select (select max(p.date_paiement) from imputations im join paiements p on p.id = im.paiement_id
             where im.bail_id = e.bail_id and im.mois = e.mois and p.statut = 'valide'
               and p.supprime_le is null and im.supprime_le is null)
           - (e.mois + (e.jour_echeance - 1)) as delai
    from ech e where e.statut = 'solde' and e.du > 0 and e.mois between v_debut and p_fin
  ),
  logs as (select l.id, logement_occupe(l.id, v_arret) as occupe from stats_logements(p_espace, p_filtres) l)
  select jsonb_build_object(
    'encaisse', coalesce((select sum(montant) from pay), 0),
    'remises', coalesce((select sum(remise) from pay), 0),
    'nb_paiements', (select count(*) from pay),
    'attendu', coalesce((select sum(du) from ech where mois between v_debut and p_fin), 0),
    'reste_a_percevoir', coalesce((select sum(reste) from ech where mois <= v_mois_arret), 0),
    'taux_recouvrement', (select case when coalesce(sum(du), 0) = 0 then null
                                      else round(100.0 * sum(least(paye + remise, du)) / sum(du)) end
                          from ech where mois between v_debut and v_mois_arret),
    'logements_total', (select count(*) from logs),
    'logements_occupes', (select count(*) filter (where occupe) from logs),
    'taux_occupation', (select case when count(*) = 0 then null
                                    else round(100.0 * count(*) filter (where occupe) / count(*)) end from logs),
    'delai_moyen_jours', (select round(avg(delai)) from soldes where delai is not null),
    'cautions_detenues', coalesce((select sum(situation_caution(b.id)) from bx b), 0),
    'prevision_mois_suivant', coalesce((select sum(loyer_du_mois(b.id, v_suivant)) from bx b
                                        where b.date_debut < (v_suivant + interval '1 month')::date
                                          and (b.date_fin is null or b.date_fin >= v_suivant)), 0),
    'nb_retards', (select count(distinct bail_id) from ech
                   where reste > 0 and mois + (jour_echeance - 1) + v_delai < v_arret)
  ) into v_ind;

  if not p_complet then
    return jsonb_build_object('indicateurs', v_ind);
  end if;

  -- ---------- Sections ----------
  with bx as (select * from stats_baux(p_espace, p_filtres)),
  logs as (select l.*, logement_occupe(l.id, v_arret) as occupe from stats_logements(p_espace, p_filtres) l),
  ech as (
    select b.id as bail_id, b.jour_echeance, b.maison_id, b.gestionnaire_id, e.*,
           (e.mois + (b.jour_echeance - 1)) as echeance
    from bx b cross join lateral echeances_bail(b.id, v_jusqua) e
  ),
  pay_tous as (
    select p.*, b.maison_id, b.maison, b.logement, b.logement_id, b.locataire
    from paiements p join bx b on b.id = p.bail_id
    where p.statut = 'valide' and p.supprime_le is null and (v_mode is null or p.mode = v_mode)
  ),
  pay as (select * from pay_tous where date_paiement between p_debut and p_fin),
  impayes as (
    select e.*, greatest(v_arret - e.echeance, 0) as jours
    from ech e where e.reste > 0 and e.mois <= v_mois_arret
  ),
  soldes as (
    select e.bail_id, e.mois,
           (select max(p.date_paiement) from imputations im join paiements p on p.id = im.paiement_id
             where im.bail_id = e.bail_id and im.mois = e.mois and p.statut = 'valide'
               and p.supprime_le is null and im.supprime_le is null) - e.echeance as delai
    from ech e where e.statut = 'solde' and e.du > 0
      and e.mois between (v_mois_arret - interval '11 months')::date and v_mois_arret
  ),
  libres as (
    select l.id, l.maison, l.designation, l.type,
           coalesce(l.loyer_reference,
                    (select x.loyer from baux x where x.logement_id = l.id and x.supprime_le is null
                     order by x.date_debut desc limit 1)) as loyer_estime,
           (select max(x.date_fin) from baux x where x.logement_id = l.id and x.supprime_le is null
              and x.date_fin < v_arret) as libre_depuis,
           l.cree_le
    from logs l where not l.occupe
  ),
  actifs as (
    select b.*, (select nb_mois_retard from v_situation_baux s where s.bail_id = b.id) as mois_retard,
           (select round(avg(s.delai)) from soldes s where s.bail_id = b.id and s.delai is not null) as delai,
           coalesce((select max(r.mois_effet) from revisions_loyer r where r.bail_id = b.id and r.supprime_le is null),
                    b.date_debut) as derniere_revision
    from bx b where b.date_debut <= v_arret and (b.date_fin is null or b.date_fin >= v_arret)
  ),
  personnes as (
    select encaisse_par as uid from pay
    union select gestionnaire_id from logs where gestionnaire_id is not null
  )
  select jsonb_build_object(
    -- Encaissements
    'par_mois', coalesce((
      select jsonb_agg(jsonb_build_object(
               'mois', m.mois,
               'attendu', coalesce((select sum(e.du) from ech e where e.mois = m.mois), 0),
               'encaisse', coalesce((select sum(p.montant) from pay_tous p
                                     where date_trunc('month', p.date_paiement) = m.mois), 0)) order by m.mois)
      from (select gs::date as mois from generate_series(v_graph_debut, date_trunc('month', p_fin), interval '1 month') gs) m
    ), '[]'::jsonb),
    'par_maison', coalesce((
      select jsonb_agg(x order by x->>'nom') from (
        select jsonb_build_object(
          'maison_id', mm.maison_id, 'nom', mm.maison,
          'encaisse', coalesce((select sum(p.montant) from pay p where p.maison_id = mm.maison_id), 0),
          'attendu', coalesce((select sum(e.du) from ech e where e.maison_id = mm.maison_id and e.mois between v_debut and p_fin), 0),
          'reste', coalesce((select sum(i.reste) from impayes i where i.maison_id = mm.maison_id), 0),
          'recouvrement', (select case when coalesce(sum(e.du), 0) = 0 then null
                                       else round(100.0 * sum(least(e.paye + e.remise, e.du)) / sum(e.du)) end
                           from ech e where e.maison_id = mm.maison_id and e.mois between v_debut and v_mois_arret),
          'logements', (select count(*) from logs l where l.maison_id = mm.maison_id),
          'occupes', (select count(*) from logs l where l.maison_id = mm.maison_id and l.occupe)) as x
        from (select distinct maison_id, maison from logs) mm
      ) t
    ), '[]'::jsonb),
    'par_logement', coalesce((
      select jsonb_agg(jsonb_build_object('logement_id', t.logement_id, 'maison', t.maison, 'logement', t.logement,
                                          'encaisse', t.total) order by t.total desc)
      from (select logement_id, maison, logement, sum(montant) as total from pay
            group by logement_id, maison, logement order by sum(montant) desc limit 30) t
    ), '[]'::jsonb),
    'par_mode', coalesce((
      select jsonb_agg(jsonb_build_object('mode', t.mode, 'montant', t.total, 'nb', t.nb) order by t.total desc)
      from (select mode, sum(montant) as total, count(*) as nb from pay group by mode) t
    ), '[]'::jsonb),
    'journal', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'date', t.date_paiement, 'locataire', t.locataire, 'maison', t.maison,
               'logement', t.logement, 'montant', t.montant, 'remise', t.remise, 'mode', t.mode,
               'reference', t.reference_transaction, 'payeur', t.payeur,
               'encaissant', (select nom_complet from profils pr where pr.id = t.encaisse_par),
               'recu', (select r.numero from recus r where r.paiement_id = t.id and r.supprime_le is null))
             order by t.date_paiement desc, t.cree_le desc)
      from (select * from pay order by date_paiement desc, cree_le desc limit 500) t
    ), '[]'::jsonb),
    -- Impayés et retards
    'anciennete', jsonb_build_object(
      'moins_30', coalesce((select sum(reste) from impayes where jours <= 30), 0),
      'de_31_a_60', coalesce((select sum(reste) from impayes where jours between 31 and 60), 0),
      'plus_60', coalesce((select sum(reste) from impayes where jours > 60), 0)),
    'debiteurs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'bail_id', b.id, 'locataire', b.locataire, 'telephone', b.telephone, 'maison', b.maison,
               'logement', b.logement, 'parti', b.date_fin is not null and b.date_fin < v_arret,
               'montant', t.montant, 'nb_mois', t.nb_mois, 'jours', t.jours, 'premier_mois', t.premier_mois)
             order by t.montant desc)
      from (select bail_id, sum(reste) as montant, count(*) as nb_mois, max(jours) as jours, min(mois) as premier_mois
            from impayes group by bail_id) t
      join bx b on b.id = t.bail_id
    ), '[]'::jsonb),
    -- Occupation
    'occupation_par_type', coalesce((
      select jsonb_agg(jsonb_build_object('type', t.type, 'total', t.total, 'occupes', t.occupes) order by t.total desc)
      from (select type, count(*) as total, count(*) filter (where occupe) as occupes from logs group by type) t
    ), '[]'::jsonb),
    'occupation_12_mois', coalesce((
      select jsonb_agg(jsonb_build_object('mois', m.mois, 'total', m.total, 'occupes', m.occupes,
                                          'taux', case when m.total = 0 then null else round(100.0 * m.occupes / m.total) end)
                       order by m.mois)
      from (
        select gs::date as mois,
               (select count(*) from logs l where l.cree_le <= least((gs + interval '1 month - 1 day')::date, v_arret)) as total,
               (select count(*) from logs l where l.cree_le <= least((gs + interval '1 month - 1 day')::date, v_arret)
                  and logement_occupe(l.id, least((gs + interval '1 month - 1 day')::date, v_arret))) as occupes
        from generate_series((v_mois_arret - interval '11 months')::date, v_mois_arret, interval '1 month') gs
      ) m
    ), '[]'::jsonb),
    'logements_libres', coalesce((
      select jsonb_agg(jsonb_build_object('logement_id', l.id, 'maison', l.maison, 'logement', l.designation,
                                          'type', l.type, 'loyer_estime', l.loyer_estime, 'libre_depuis', l.libre_depuis,
                                          'jours', v_arret - coalesce(l.libre_depuis, l.cree_le))
                       order by coalesce(l.libre_depuis, l.cree_le))
      from libres l
    ), '[]'::jsonb),
    'vacance_moyenne_jours', (select round(avg(v_arret - coalesce(libre_depuis, cree_le))) from libres),
    'manque_a_gagner_mois', coalesce((select sum(loyer_estime) from libres), 0),
    'entrees_sorties', coalesce((
      select jsonb_agg(jsonb_build_object(
               'mois', m.mois,
               'entrees', (select count(*) from bx b where date_trunc('month', b.date_debut) = m.mois),
               'sorties', (select count(*) from bx b where date_trunc('month', b.date_fin) = m.mois)) order by m.mois)
      from (select gs::date as mois from generate_series(v_graph_debut, date_trunc('month', p_fin), interval '1 month') gs) m
    ), '[]'::jsonb),
    -- Locataires
    'locataires', coalesce((
      select jsonb_agg(jsonb_build_object(
               'bail_id', a.id, 'locataire', a.locataire, 'telephone', a.telephone, 'maison', a.maison,
               'logement', a.logement, 'depuis', a.date_debut, 'date_fin', a.date_fin,
               'mois_anciennete', (extract(year from age(v_arret, a.date_debut)) * 12
                                   + extract(month from age(v_arret, a.date_debut)))::int,
               'loyer', loyer_du_mois(a.id, v_mois_arret), 'caution', situation_caution(a.id),
               'delai_moyen', a.delai, 'mois_retard', coalesce(a.mois_retard, 0),
               'ponctualite', case when coalesce(a.mois_retard, 0) >= 2 or coalesce(a.delai, 0) > 30 then 'critique'
                                   when coalesce(a.mois_retard, 0) = 1 or coalesce(a.delai, 0) > v_delai then 'surveiller'
                                   else 'exemplaire' end,
               'derniere_revision', a.derniere_revision,
               'a_reviser', a.derniere_revision <= (v_arret - interval '2 years')::date)
             order by a.locataire)
      from actifs a
    ), '[]'::jsonb),
    'fins_bail', coalesce((
      select jsonb_agg(jsonb_build_object('bail_id', b.id, 'locataire', b.locataire, 'maison', b.maison,
                                          'logement', b.logement, 'date_fin', b.date_fin) order by b.date_fin)
      from bx b where b.date_fin between aujourdhui() and aujourdhui() + 90
    ), '[]'::jsonb),
    -- Gestionnaires (et propriétaire) : qui encaisse quoi
    'gestionnaires', coalesce((
      select jsonb_agg(x order by (x->>'encaisse')::bigint desc) from (
        select jsonb_build_object(
          'user_id', pe.uid,
          'nom', (select nom_complet from profils pr where pr.id = pe.uid),
          'role', (select mb.role from membres mb where mb.espace_id = p_espace and mb.user_id = pe.uid),
          'encaisse', coalesce((select sum(p.montant) from pay p where p.encaisse_par = pe.uid), 0),
          'nb_paiements', (select count(*) from pay p where p.encaisse_par = pe.uid),
          'recus_emis', (select count(*) from recus r where r.espace_id = p_espace and r.emis_par = pe.uid
                           and r.supprime_le is null and (r.emis_le at time zone 'Africa/Porto-Novo')::date between p_debut and p_fin),
          'annulations_demandees', (select count(*) from demandes d where d.espace_id = p_espace and d.demande_par = pe.uid
                                      and d.supprime_le is null and (d.cree_le at time zone 'Africa/Porto-Novo')::date between p_debut and p_fin),
          'nb_maisons', (select count(distinct l.maison_id) from logs l where l.gestionnaire_id = pe.uid),
          'recouvrement', (select case when coalesce(sum(e.du), 0) = 0 then null
                                       else round(100.0 * sum(least(e.paye + e.remise, e.du)) / sum(e.du)) end
                           from ech e where e.gestionnaire_id = pe.uid and e.mois between v_debut and v_mois_arret)) as x
        from personnes pe
      ) t
    ), '[]'::jsonb)
  ) into v_sec;

  return jsonb_build_object('indicateurs', v_ind) || v_sec;
end $$;

-- ---------- Droits d'exécution ----------
revoke execute on function stats_logements(uuid, jsonb), stats_baux(uuid, jsonb), logement_occupe(uuid, date),
  stats_completes(uuid, date, date, jsonb, boolean) from public, anon;
grant execute on function stats_logements(uuid, jsonb), stats_baux(uuid, jsonb), logement_occupe(uuid, date),
  stats_completes(uuid, date, date, jsonb, boolean) to authenticated;
