-- =====================================================================
-- Lot 1 - Règles métier : échéances, situation des baux, encaissement
-- (imputation), émission des reçus, cautions, annulation, vérification
-- publique, demandes, statistiques de base.
-- =====================================================================

set search_path = public, extensions;

create or replace function aujourdhui() returns date
language sql stable as $$
  select (now() at time zone 'Africa/Porto-Novo')::date
$$;

create or replace function loyer_du_mois(p_bail uuid, p_mois date) returns int
language sql stable set search_path = public as $$
  select coalesce(
    (select r.montant from revisions_loyer r
      where r.bail_id = p_bail and r.mois_effet <= p_mois and r.supprime_le is null
      order by r.mois_effet desc limit 1),
    (select b.loyer from baux b where b.id = p_bail))
$$;

-- Échéances mensuelles d'un bail, du premier mois jusqu'à p_jusqua (borné à la fin du bail)
create or replace function echeances_bail(p_bail uuid, p_jusqua date default null)
returns table (mois date, du int, paye int, remise int, reste int, statut text)
language sql stable set search_path = public as $$
  with b as (
    select date_trunc('month', date_debut)::date as debut,
           least(date_trunc('month', coalesce(p_jusqua, aujourdhui()))::date,
                 coalesce(date_trunc('month', date_fin)::date, 'infinity'::date)) as fin,
           premier_mois_montant
    from baux where id = p_bail
  ),
  m as (
    select gs::date as mois from b, generate_series(b.debut, b.fin, interval '1 month') gs
    where b.fin >= b.debut
  ),
  i as (
    select im.mois, sum(im.montant)::int as paye, sum(im.remise)::int as remise
    from imputations im join paiements p on p.id = im.paiement_id
    where im.bail_id = p_bail and p.statut = 'valide' and p.supprime_le is null and im.supprime_le is null
    group by im.mois
  ),
  d as (
    select m.mois,
           (case when m.mois = b.debut and b.premier_mois_montant is not null then b.premier_mois_montant
                 else loyer_du_mois(p_bail, m.mois) end)::int as du,
           coalesce(i.paye, 0) as paye,
           coalesce(i.remise, 0) as remise
    from m cross join b left join i on i.mois = m.mois
  )
  select d.mois, d.du, d.paye, d.remise,
         greatest(d.du - d.paye - d.remise, 0) as reste,
         case when d.du - d.paye - d.remise <= 0 then 'solde'
              when d.paye + d.remise > 0 then 'partiel'
              else 'du' end as statut
  from d order by d.mois
$$;

-- Situation de chaque bail (hérite de la RLS)
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

-- Initiales « A. F. »
create or replace function initiales(p_nom text) returns text
language sql immutable as $$
  select string_agg(upper(left(w, 1)) || '.', ' ')
  from regexp_split_to_table(trim(coalesce(p_nom, '')), '\s+') w where w <> ''
$$;

-- ---------- Émission d'un reçu (interne) ----------
create or replace function emettre_recu(p_type type_recu, p_paiement uuid, p_mouvement uuid)
returns recus
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_bail baux; v_log logements; v_maison maisons; v_loc locataires; v_esp espaces;
  v_enc profils; v_role role_membre;
  v_bail_id uuid; v_montant int; v_date date; v_mode mode_paiement; v_ref text; v_payeur text;
  v_remise int := 0; v_motif_remise text; v_enc_id uuid; v_motif text; v_type_mvt type_mvt_caution;
  v_mois jsonb := '[]'::jsonb; v_nb_mois int := 0;
  v_serie text; v_annee int := extract(year from aujourdhui())::int; v_num int; v_numero text;
  v_sit record; v_contenu jsonb; v_recu recus; v_nom_loc text;
begin
  if p_paiement is not null then
    select bail_id, montant, date_paiement, mode, reference_transaction, payeur, remise, motif_remise, encaisse_par
      into v_bail_id, v_montant, v_date, v_mode, v_ref, v_payeur, v_remise, v_motif_remise, v_enc_id
      from paiements where id = p_paiement;
    select coalesce(jsonb_agg(to_char(im.mois, 'YYYY-MM-DD') order by im.mois), '[]'::jsonb), count(*)
      into v_mois, v_nb_mois
      from imputations im where im.paiement_id = p_paiement and (im.montant > 0 or im.remise > 0);
  else
    select bail_id, montant, date_mouvement, mode, motif, encaisse_par, type
      into v_bail_id, v_montant, v_date, v_mode, v_motif, v_enc_id, v_type_mvt
      from mouvements_caution where id = p_mouvement;
  end if;

  select * into v_bail from baux where id = v_bail_id;
  select * into v_log from logements where id = v_bail.logement_id;
  select * into v_maison from maisons where id = v_log.maison_id;
  select * into v_loc from locataires where id = v_bail.locataire_id;
  select * into v_esp from espaces where id = v_bail.espace_id;
  select * into v_enc from profils where id = v_enc_id;
  select role into v_role from membres where espace_id = v_esp.id and user_id = v_enc_id;
  v_nom_loc := trim(v_loc.nom || ' ' || coalesce(v_loc.prenoms, ''));

  -- Numéro continu, sans trou, par espace / série / année
  v_serie := case when p_type = 'loyer' then '' else 'C' end;
  insert into compteurs_recus (espace_id, serie, annee, dernier) values (v_esp.id, v_serie, v_annee, 1)
    on conflict (espace_id, serie, annee) do update set dernier = compteurs_recus.dernier + 1
    returning dernier into v_num;
  v_numero := v_esp.prefixe_recu || '-' || case when v_serie = '' then '' else v_serie || '-' end
              || v_annee || '-' || lpad(v_num::text, 6, '0');

  select dernier_mois_solde, nb_mois_dus, montant_du into v_sit from v_situation_baux where bail_id = v_bail_id;

  v_contenu := jsonb_build_object(
    'type', p_type,
    'numero', v_numero,
    'espace', jsonb_build_object('id', v_esp.id, 'nom', v_esp.nom, 'ville', v_esp.ville, 'adresse', v_esp.adresse,
                                 'telephone', v_esp.telephone, 'email', v_esp.email, 'logo_path', v_esp.logo_path,
                                 'cachet_path', v_esp.cachet_path, 'couleur', v_esp.couleur_primaire),
    'logement', jsonb_build_object('immeuble', v_maison.nom, 'quartier', v_maison.quartier, 'ville', v_maison.ville,
                                   'designation', v_log.designation, 'niveau', v_log.niveau, 'type', v_log.type,
                                   'reference_bail', v_bail.reference),
    'locataire', jsonb_build_object('nom_complet', v_nom_loc, 'initiales', initiales(v_nom_loc),
                                    'telephone', v_loc.telephone),
    'payeur', coalesce(v_payeur, v_nom_loc),
    'mode', v_mode,
    'reference_transaction', v_ref,
    'montant', v_montant,
    'remise', v_remise,
    'motif_remise', v_motif_remise,
    'mois', v_mois,
    'nb_mois', v_nb_mois,
    'date_paiement', v_date,
    'loyer_mensuel', loyer_du_mois(v_bail_id, date_trunc('month', aujourdhui())::date),
    'encaissant', jsonb_build_object(
        'id', v_enc.id, 'nom', v_enc.nom_complet,
        'role', coalesce(v_role::text, 'proprietaire'),
        'signature_path', case when v_role = 'gestionnaire' then v_enc.signature_path else v_esp.signature_path end),
    'situation', jsonb_build_object('paye_jusqua', v_sit.dernier_mois_solde, 'nb_mois_dus', coalesce(v_sit.nb_mois_dus, 0),
                                    'montant_du', coalesce(v_sit.montant_du, 0)),
    'caution', case when p_mouvement is null then null else jsonb_build_object(
        'mouvement', v_type_mvt, 'motif', v_motif, 'solde', situation_caution(v_bail_id)) end,
    'emis_le', now()
  );

  insert into recus (espace_id, type, paiement_id, mouvement_caution_id, numero, code_verification,
                     contenu, empreinte, emis_par)
  values (v_esp.id, p_type, p_paiement, p_mouvement, v_numero, encode(gen_random_bytes(12), 'hex'),
          v_contenu, encode(digest(v_contenu::text, 'sha256'), 'hex'), auth.uid())
  returning * into v_recu;
  return v_recu;
end $$;

-- ---------- Encaissement ----------
create or replace function encaisser(
  p_bail uuid, p_date date, p_montant int, p_mode mode_paiement, p_reference text, p_payeur text,
  p_cle_idempotence uuid, p_mois date[] default null, p_reste text default 'partiel',
  p_motif_remise text default null, p_remplace uuid default null)
returns recus
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_recu recus; v_bail baux; v_paiement uuid; v_reste int := p_montant;
  v_mois date; v_du int; v_part int; v_horizon date; v_remise int := 0; v_cibles date[];
begin
  -- Idempotence : même clé => même reçu, sans doublon
  select r.* into v_recu from recus r join paiements p on p.id = r.paiement_id
   where p.cle_idempotence = p_cle_idempotence;
  if found then return v_recu; end if;

  if not peut_gerer_maison(maison_du_bail(p_bail)) then
    raise exception 'Vous n''avez pas le droit d''encaisser pour ce logement.';
  end if;
  if p_montant is null or p_montant <= 0 then raise exception 'Le montant doit être supérieur à zéro.'; end if;
  if p_date is null or p_date > aujourdhui() then raise exception 'La date du paiement ne peut pas être dans le futur.'; end if;
  if coalesce(trim(p_payeur), '') = '' then raise exception 'Indiquez qui a payé.'; end if;
  if p_reste not in ('partiel', 'remise') then raise exception 'Choix du reste invalide.'; end if;
  if p_reste = 'remise' and coalesce(trim(p_motif_remise), '') = '' then
    raise exception 'Indiquez le motif de la remise.';
  end if;

  select * into v_bail from baux where id = p_bail and supprime_le is null for update;
  if not found then raise exception 'Bail introuvable.'; end if;

  insert into paiements (espace_id, bail_id, date_paiement, montant, mode, reference_transaction, payeur,
                         encaisse_par, cle_idempotence, remplace_paiement_id)
  values (v_bail.espace_id, p_bail, p_date, p_montant, p_mode, nullif(trim(p_reference), ''), trim(p_payeur),
          auth.uid(), p_cle_idempotence, p_remplace)
  returning id into v_paiement;

  v_horizon := (date_trunc('month', aujourdhui()) + interval '60 months')::date;

  -- 1) mois choisis (ou, à défaut, du plus ancien au plus récent)
  for v_mois, v_du in
    select e.mois, e.reste from echeances_bail(p_bail, v_horizon) e
    where e.reste > 0 and (p_mois is null or e.mois = any (p_mois))
    order by e.mois
  loop
    exit when v_reste <= 0;
    v_part := least(v_du, v_reste);
    insert into imputations (espace_id, paiement_id, bail_id, mois, montant)
    values (v_bail.espace_id, v_paiement, p_bail, v_mois, v_part);
    v_reste := v_reste - v_part;
  end loop;

  -- 2) trop-perçu : avance sur les mois encore dus, dans l'ordre
  if v_reste > 0 then
    for v_mois, v_du in
      select e.mois, e.reste from echeances_bail(p_bail, v_horizon) e where e.reste > 0 order by e.mois
    loop
      exit when v_reste <= 0;
      v_part := least(v_du, v_reste);
      insert into imputations (espace_id, paiement_id, bail_id, mois, montant)
      values (v_bail.espace_id, v_paiement, p_bail, v_mois, v_part);
      v_reste := v_reste - v_part;
    end loop;
  end if;

  if v_reste > 0 then
    raise exception 'Le montant dépasse ce que doit le locataire (% FCFA de trop).', v_reste;
  end if;

  -- 3) remise : les mois visés restent soldés
  if p_reste = 'remise' then
    v_cibles := coalesce(p_mois, (select array_agg(mois) from imputations where paiement_id = v_paiement));
    for v_mois, v_du in
      select e.mois, e.reste from echeances_bail(p_bail, v_horizon) e
      where e.reste > 0 and e.mois = any (v_cibles)
    loop
      insert into imputations (espace_id, paiement_id, bail_id, mois, montant, remise)
      values (v_bail.espace_id, v_paiement, p_bail, v_mois, 0, v_du);
      v_remise := v_remise + v_du;
    end loop;
    update paiements set remise = v_remise, motif_remise = trim(p_motif_remise) where id = v_paiement;
  end if;

  return emettre_recu('loyer', v_paiement, null);
end $$;

-- ---------- Cautions ----------
create or replace function situation_caution(p_bail uuid) returns int
language sql stable set search_path = public as $$
  select coalesce(sum(case when type = 'versement' then montant else -montant end), 0)::int
  from mouvements_caution where bail_id = p_bail and supprime_le is null
$$;

create or replace function enregistrer_mouvement_caution(
  p_bail uuid, p_type type_mvt_caution, p_montant int, p_date date, p_motif text default null,
  p_mode mode_paiement default 'especes')
returns recus
language plpgsql security definer set search_path = public, extensions as $$
declare v_bail baux; v_id uuid;
begin
  if not peut_gerer_maison(maison_du_bail(p_bail)) then
    raise exception 'Vous n''avez pas le droit de gérer la caution de ce logement.';
  end if;
  if p_montant is null or p_montant <= 0 then raise exception 'Le montant doit être supérieur à zéro.'; end if;
  if p_date is null or p_date > aujourdhui() then raise exception 'La date ne peut pas être dans le futur.'; end if;
  select * into v_bail from baux where id = p_bail and supprime_le is null for update;
  if not found then raise exception 'Bail introuvable.'; end if;
  if p_type <> 'versement' and p_montant > situation_caution(p_bail) then
    raise exception 'Le montant dépasse la caution détenue (% FCFA).', situation_caution(p_bail);
  end if;
  if p_type = 'retenue' and coalesce(trim(p_motif), '') = '' then
    raise exception 'Indiquez le motif de la retenue.';
  end if;
  insert into mouvements_caution (espace_id, bail_id, type, montant, date_mouvement, motif, mode, encaisse_par)
  values (v_bail.espace_id, p_bail, p_type, p_montant, p_date, nullif(trim(p_motif), ''), p_mode, auth.uid())
  returning id into v_id;
  return emettre_recu(case when p_type = 'versement' then 'caution'::type_recu else 'restitution'::type_recu end, null, v_id);
end $$;

-- ---------- Annulation / correction ----------
create or replace function annuler_paiement(p_paiement uuid, p_motif text) returns void
language plpgsql security definer set search_path = public as $$
declare v_espace uuid;
begin
  select espace_id into v_espace from paiements where id = p_paiement;
  if v_espace is null then raise exception 'Paiement introuvable.'; end if;
  if not peut_gerer_espace(v_espace) then
    raise exception 'Seul le propriétaire peut annuler un paiement. Faites une demande d''annulation.';
  end if;
  if coalesce(trim(p_motif), '') = '' then raise exception 'Indiquez le motif de l''annulation.'; end if;
  update paiements set statut = 'annule', motif_annulation = trim(p_motif), annule_par = auth.uid(), annule_le = now()
   where id = p_paiement and statut = 'valide';
  if not found then raise exception 'Ce paiement est déjà annulé.'; end if;
end $$;

create or replace function corriger_paiement(p_paiement uuid) returns void
language sql security definer set search_path = public as $$
  select annuler_paiement(p_paiement, 'Correction')
$$;

-- ---------- Génération d'un reçu : original puis duplicatas ----------
create or replace function generation_recu(p_recu uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_r recus;
begin
  select * into v_r from recus where id = p_recu;
  if not found or not peut_voir_maison(maison_du_bail(bail_du_recu(v_r.paiement_id, v_r.mouvement_caution_id))) then
    raise exception 'Reçu introuvable.';
  end if;
  if not v_r.original_genere then
    update recus set original_genere = true where id = p_recu;
    return jsonb_build_object('original', true, 'nb_duplicatas', v_r.nb_duplicatas);
  end if;
  insert into reimpressions (espace_id, recu_id, par) values (v_r.espace_id, p_recu, auth.uid());
  update recus set nb_duplicatas = nb_duplicatas + 1 where id = p_recu returning * into v_r;
  return jsonb_build_object('original', false, 'nb_duplicatas', v_r.nb_duplicatas, 'reimprime_le', now());
end $$;

-- ---------- Vérification publique (QR code) ----------
create or replace function verifier_recu(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_r recus; v_p paiements; v_statut text := 'valide'; v_esp text;
begin
  select * into v_r from recus where code_verification = p_code;
  if not found then return jsonb_build_object('trouve', false); end if;
  if v_r.paiement_id is not null then select * into v_p from paiements where id = v_r.paiement_id; end if;
  if v_r.supprime_le is not null or v_p.supprime_le is not null then v_statut := 'supprime';
  elsif v_p.statut = 'annule' then v_statut := 'annule';
  end if;
  select nom into v_esp from espaces where id = v_r.espace_id;
  return jsonb_build_object(
    'trouve', true, 'numero', v_r.numero, 'type', v_r.type, 'espace', v_esp,
    'montant', v_r.contenu -> 'montant', 'mois', v_r.contenu -> 'mois',
    'date_paiement', v_r.contenu -> 'date_paiement',
    'initiales', v_r.contenu -> 'locataire' -> 'initiales',
    'immeuble', v_r.contenu -> 'logement' -> 'immeuble',
    'statut', v_statut, 'emis_le', v_r.emis_le, 'nb_duplicatas', v_r.nb_duplicatas,
    'empreinte', v_r.empreinte);
end $$;

-- ---------- Demandes des gestionnaires ----------
create or replace function traiter_demande(p_demande uuid, p_accepter boolean, p_reponse text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_d demandes;
begin
  select * into v_d from demandes where id = p_demande for update;
  if not found then raise exception 'Demande introuvable.'; end if;
  if not peut_gerer_espace(v_d.espace_id) then raise exception 'Seul le propriétaire peut traiter les demandes.'; end if;
  if v_d.statut <> 'en_attente' then raise exception 'Cette demande a déjà été traitée.'; end if;
  if p_accepter then
    if v_d.type = 'annulation_paiement' then
      perform annuler_paiement(v_d.cible_id, 'Demande acceptée : ' || v_d.motif);
    else
      perform mettre_a_la_corbeille(v_d.cible_table, v_d.cible_id);
    end if;
  end if;
  update demandes set statut = case when p_accepter then 'acceptee'::statut_demande else 'refusee'::statut_demande end,
                      traite_par = auth.uid(), traite_le = now(), reponse = nullif(trim(p_reponse), '')
   where id = p_demande;
end $$;

-- ---------- Statistiques de base (hérite de la RLS : un gestionnaire ne voit que ses maisons) ----------
create or replace function stats_resume(p_espace uuid, p_debut date, p_fin date, p_maison uuid default null)
returns jsonb
language plpgsql stable set search_path = public as $$
declare
  v_debut date := date_trunc('month', p_debut)::date;
  v_arret date := least(p_fin, aujourdhui());
  v_res jsonb;
begin
  with baux_v as (
    select b.id, b.date_debut, b.date_fin from baux b join logements l on l.id = b.logement_id
    where b.espace_id = p_espace and b.supprime_le is null and l.supprime_le is null
      and (p_maison is null or l.maison_id = p_maison)
  ),
  ech as (
    select e.* from baux_v b cross join lateral echeances_bail(b.id, p_fin) e where e.mois >= v_debut
  ),
  arr as (
    select coalesce(sum(e.reste), 0) as reste
    from baux_v b cross join lateral echeances_bail(b.id, v_arret) e
  ),
  pay as (
    select coalesce(sum(p.montant), 0) as encaisse, coalesce(sum(p.remise), 0) as remises
    from paiements p join baux_v b on b.id = p.bail_id
    where p.statut = 'valide' and p.supprime_le is null and p.date_paiement between p_debut and p_fin
  ),
  logs as (
    select count(*) as total,
           count(*) filter (where exists (select 1 from baux x where x.logement_id = l.id and x.supprime_le is null
                                          and x.date_debut <= aujourdhui()
                                          and (x.date_fin is null or x.date_fin >= aujourdhui()))) as occupes
    from logements l join maisons m on m.id = l.maison_id
    where l.espace_id = p_espace and l.supprime_le is null and m.supprime_le is null
      and (p_maison is null or l.maison_id = p_maison)
  )
  select jsonb_build_object(
    'encaisse', (select encaisse from pay),
    'remises', (select remises from pay),
    'attendu', coalesce((select sum(du) from ech), 0),
    'reste_a_percevoir', (select reste from arr),
    'taux_recouvrement', case when coalesce((select sum(du) from ech), 0) = 0 then null
        else round(100.0 * (select sum(least(paye + remise, du)) from ech) / (select sum(du) from ech)) end,
    'logements_total', (select total from logs),
    'logements_occupes', (select occupes from logs),
    'nb_retards', (select count(*) from v_situation_baux s where s.espace_id = p_espace and s.statut <> 'a_jour'
                     and (p_maison is null or s.maison_id = p_maison)),
    'cautions_detenues', coalesce((select sum(situation_caution(b.id)) from baux_v b), 0),
    'prevision_mois_suivant', coalesce((select sum(loyer_du_mois(b.id, (date_trunc('month', aujourdhui()) + interval '1 month')::date))
                                        from baux_v b where b.date_fin is null), 0)
  ) into v_res;
  return v_res;
end $$;

create or replace function stats_par_mois(p_espace uuid, p_debut date, p_fin date, p_maison uuid default null)
returns table (mois date, attendu int, encaisse int)
language sql stable set search_path = public as $$
  with baux_v as (
    select b.id from baux b join logements l on l.id = b.logement_id
    where b.espace_id = p_espace and b.supprime_le is null and l.supprime_le is null
      and (p_maison is null or l.maison_id = p_maison)
  ),
  m as (
    select gs::date as mois from generate_series(date_trunc('month', p_debut), date_trunc('month', p_fin), interval '1 month') gs
  )
  select m.mois,
         coalesce((select sum(e.du) from baux_v b cross join lateral echeances_bail(b.id, p_fin) e where e.mois = m.mois), 0)::int,
         coalesce((select sum(p.montant) from paiements p join baux_v b on b.id = p.bail_id
                   where p.statut = 'valide' and p.supprime_le is null
                     and date_trunc('month', p.date_paiement) = m.mois), 0)::int
  from m order by m.mois
$$;

-- ---------- Droits d'exécution ----------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function emettre_recu(type_recu, uuid, uuid) from authenticated;
grant execute on function verifier_recu(text) to anon;
grant select on v_situation_baux to authenticated;
