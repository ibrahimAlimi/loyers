-- =====================================================================
-- Lot 1bis - Reprise des données de l'ancien logiciel (Access) :
-- paiements repris et étiquettes « à vérifier », reçus repris (série R),
-- import en une transaction, corrections par le propriétaire.
-- =====================================================================

set search_path = public, extensions;

-- reprise : origine du paiement (null = saisi dans l'application)
--   { source, numero_access, mois_access, encaisseur, verifie_le, mois_corrige_le, … }
-- a_verifier : 'doublon' (mois déjà payé), 'montant' (≠ loyer du mois), 'date' (date corrigée ou manquante)
alter table paiements
  add column reprise jsonb,
  add column a_verifier text[] not null default '{}';
create index paiements_a_verifier_idx on paiements (espace_id) where a_verifier <> '{}';

-- ---------- Contenu d'un reçu (interne) ----------
-- Séparé de emettre_recu pour pouvoir recalculer un reçu repris sans changer son numéro.
create or replace function contenu_recu(p_type type_recu, p_paiement uuid, p_mouvement uuid, p_numero text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_bail baux; v_log logements; v_maison maisons; v_loc locataires; v_esp espaces;
  v_enc profils; v_role role_membre;
  v_bail_id uuid; v_montant int; v_date date; v_mode mode_paiement; v_ref text; v_payeur text;
  v_remise int := 0; v_motif_remise text; v_enc_id uuid; v_motif text; v_type_mvt type_mvt_caution;
  v_mois jsonb := '[]'::jsonb; v_nb_mois int := 0; v_premier_mois date; v_reprise jsonb;
  v_sit record; v_nom_loc text;
begin
  if p_paiement is not null then
    select bail_id, montant, date_paiement, mode, reference_transaction, payeur, remise, motif_remise, encaisse_par, reprise
      into v_bail_id, v_montant, v_date, v_mode, v_ref, v_payeur, v_remise, v_motif_remise, v_enc_id, v_reprise
      from paiements where id = p_paiement;
    select coalesce(jsonb_agg(to_char(im.mois, 'YYYY-MM-DD') order by im.mois), '[]'::jsonb), count(*), min(im.mois)
      into v_mois, v_nb_mois, v_premier_mois
      from imputations im where im.paiement_id = p_paiement and (im.montant > 0 or im.remise > 0)
       and im.supprime_le is null;
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

  -- La situation « après ce paiement » n'a pas de sens pour un reçu repris
  if v_reprise is null then
    select dernier_mois_solde, nb_mois_dus, montant_du into v_sit from v_situation_baux where bail_id = v_bail_id;
  end if;

  return jsonb_build_object(
    'type', p_type,
    'numero', p_numero,
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
    'loyer_mensuel', case when v_reprise is null
                          then loyer_du_mois(v_bail_id, date_trunc('month', aujourdhui())::date)
                          else loyer_du_mois(v_bail_id, coalesce(v_premier_mois, date_trunc('month', v_date)::date)) end,
    'encaissant', jsonb_build_object(
        'id', v_enc.id,
        'nom', coalesce(nullif(trim(v_reprise ->> 'encaisseur'), ''), v_enc.nom_complet),
        'role', coalesce(v_role::text, 'proprietaire'),
        'signature_path', case when v_role = 'gestionnaire' then v_enc.signature_path else v_esp.signature_path end),
    'situation', case when v_reprise is null then
        jsonb_build_object('paye_jusqua', v_sit.dernier_mois_solde, 'nb_mois_dus', coalesce(v_sit.nb_mois_dus, 0),
                           'montant_du', coalesce(v_sit.montant_du, 0)) end,
    'caution', case when p_mouvement is null then null else jsonb_build_object(
        'mouvement', v_type_mvt, 'motif', v_motif, 'solde', situation_caution(v_bail_id)) end,
    'repris', v_reprise is not null,
    'emis_le', case when v_reprise is null then now()
                    else (v_date + time '12:00') at time zone 'Africa/Porto-Novo' end
  );
end $$;

-- ---------- Émission d'un reçu (interne) ----------
-- Série '' (loyer), 'C' (caution) ou 'R' (repris de l'ancien logiciel, numéroté à l'année du paiement).
create or replace function emettre_recu(p_type type_recu, p_paiement uuid, p_mouvement uuid)
returns recus
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_espace uuid; v_repris boolean := false; v_date date;
  v_serie text; v_annee int := extract(year from aujourdhui())::int; v_num int; v_numero text; v_prefixe text;
  v_contenu jsonb; v_recu recus;
begin
  if p_paiement is not null then
    select espace_id, reprise is not null, date_paiement into v_espace, v_repris, v_date from paiements where id = p_paiement;
  else
    select espace_id into v_espace from mouvements_caution where id = p_mouvement;
  end if;
  select prefixe_recu into v_prefixe from espaces where id = v_espace;

  -- Numéro continu, sans trou, par espace / série / année
  v_serie := case when p_type <> 'loyer' then 'C' when v_repris then 'R' else '' end;
  if v_repris then v_annee := extract(year from v_date)::int; end if;
  insert into compteurs_recus (espace_id, serie, annee, dernier) values (v_espace, v_serie, v_annee, 1)
    on conflict (espace_id, serie, annee) do update set dernier = compteurs_recus.dernier + 1
    returning dernier into v_num;
  v_numero := v_prefixe || '-' || case when v_serie = '' then '' else v_serie || '-' end
              || v_annee || '-' || lpad(v_num::text, 6, '0');

  v_contenu := contenu_recu(p_type, p_paiement, p_mouvement, v_numero);

  insert into recus (espace_id, type, paiement_id, mouvement_caution_id, numero, code_verification,
                     contenu, empreinte, emis_le, emis_par)
  values (v_espace, p_type, p_paiement, p_mouvement, v_numero, encode(gen_random_bytes(12), 'hex'),
          v_contenu, encode(digest(v_contenu::text, 'sha256'), 'hex'), (v_contenu ->> 'emis_le')::timestamptz, auth.uid())
  returning * into v_recu;
  return v_recu;
end $$;

-- Recalcule le contenu d'un reçu repris (même numéro, même code de vérification).
-- Exception aux reçus figés, réservée aux reçus repris : leur contenu vient d'une saisie à corriger.
create or replace function recalculer_recu_repris(p_paiement uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_r recus; v_contenu jsonb;
begin
  select r.* into v_r from recus r join paiements p on p.id = r.paiement_id
   where r.paiement_id = p_paiement and p.reprise is not null;
  if not found then return; end if;
  v_contenu := contenu_recu(v_r.type, p_paiement, null, v_r.numero);
  update recus set contenu = v_contenu, empreinte = encode(digest(v_contenu::text, 'sha256'), 'hex')
   where id = v_r.id;
end $$;

-- ---------- Import (service_role uniquement, une seule transaction) ----------
-- p_donnees : { maisons: [{cle, nom, quartier, notes}],
--               logements: [{cle, maison, type, designation, niveau, loyer_reference, notes}],
--               locataires: [{cle, nom, notes}],
--               baux: [{cle, logement, locataire, reference, date_debut, loyer, revisions: [{mois, montant}]}],
--               paiements: [{bail, date, montant, mois, payeur, a_verifier: [], reprise: {}}] }  (ordre chronologique)
create or replace function importer_reprise(p_espace uuid, p_donnees jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_esp espaces; v_proprio uuid; v_x jsonb; v_r jsonb; v_id uuid; v_pid uuid;
  v_maisons jsonb := '{}'; v_logements jsonb := '{}'; v_locataires jsonb := '{}'; v_baux jsonb := '{}';
  v_nb_rev int := 0; v_nb_pai int := 0; v_nb_log int;
begin
  select * into v_esp from espaces where id = p_espace and supprime_le is null;
  if not found then raise exception 'Espace introuvable.'; end if;
  if exists (select 1 from maisons where espace_id = p_espace and supprime_le is null) then
    raise exception 'L''espace « % » contient déjà des maisons : la reprise se fait dans un espace vide.', v_esp.nom;
  end if;
  select user_id into v_proprio from membres
   where espace_id = p_espace and role = 'proprietaire' and actif order by cree_le limit 1;
  if v_proprio is null then raise exception 'L''espace « % » n''a pas de propriétaire.', v_esp.nom; end if;
  v_nb_log := jsonb_array_length(coalesce(p_donnees -> 'logements', '[]'));
  if v_esp.limites_actives and v_esp.max_logements is not null and v_nb_log > v_esp.max_logements then
    raise exception 'La formule de l''espace permet % logements, la reprise en contient %.', v_esp.max_logements, v_nb_log;
  end if;

  for v_x in select * from jsonb_array_elements(coalesce(p_donnees -> 'maisons', '[]')) loop
    insert into maisons (espace_id, nom, quartier, notes)
    values (p_espace, v_x ->> 'nom', nullif(v_x ->> 'quartier', ''), nullif(v_x ->> 'notes', ''))
    returning id into v_id;
    v_maisons := v_maisons || jsonb_build_object(v_x ->> 'cle', v_id);
  end loop;

  for v_x in select * from jsonb_array_elements(coalesce(p_donnees -> 'logements', '[]')) loop
    insert into logements (espace_id, maison_id, type, designation, niveau, loyer_reference, notes)
    values (p_espace, (v_maisons ->> (v_x ->> 'maison'))::uuid, (v_x ->> 'type')::type_logement, v_x ->> 'designation',
            nullif(v_x ->> 'niveau', ''), (v_x ->> 'loyer_reference')::int, nullif(v_x ->> 'notes', ''))
    returning id into v_id;
    v_logements := v_logements || jsonb_build_object(v_x ->> 'cle', v_id);
  end loop;

  for v_x in select * from jsonb_array_elements(coalesce(p_donnees -> 'locataires', '[]')) loop
    insert into locataires (espace_id, nom, notes)
    values (p_espace, v_x ->> 'nom', nullif(v_x ->> 'notes', ''))
    returning id into v_id;
    v_locataires := v_locataires || jsonb_build_object(v_x ->> 'cle', v_id);
  end loop;

  for v_x in select * from jsonb_array_elements(coalesce(p_donnees -> 'baux', '[]')) loop
    insert into baux (espace_id, logement_id, locataire_id, reference, date_debut, loyer)
    values (p_espace, (v_logements ->> (v_x ->> 'logement'))::uuid, (v_locataires ->> (v_x ->> 'locataire'))::uuid,
            nullif(v_x ->> 'reference', ''), (v_x ->> 'date_debut')::date, (v_x ->> 'loyer')::int)
    returning id into v_id;
    v_baux := v_baux || jsonb_build_object(v_x ->> 'cle', v_id);
    for v_r in select * from jsonb_array_elements(coalesce(v_x -> 'revisions', '[]')) loop
      insert into revisions_loyer (espace_id, bail_id, mois_effet, montant)
      values (p_espace, v_id, (v_r ->> 'mois')::date, (v_r ->> 'montant')::int);
      v_nb_rev := v_nb_rev + 1;
    end loop;
  end loop;

  for v_x in select * from jsonb_array_elements(coalesce(p_donnees -> 'paiements', '[]')) loop
    v_id := (v_baux ->> (v_x ->> 'bail'))::uuid;
    insert into paiements (espace_id, bail_id, date_paiement, montant, mode, payeur, encaisse_par,
                           cle_idempotence, reprise, a_verifier)
    values (p_espace, v_id, (v_x ->> 'date')::date, (v_x ->> 'montant')::int, 'especes', v_x ->> 'payeur', v_proprio,
            gen_random_uuid(), coalesce(v_x -> 'reprise', '{}'),
            array(select jsonb_array_elements_text(coalesce(v_x -> 'a_verifier', '[]'))))
    returning id into v_pid;
    insert into imputations (espace_id, paiement_id, bail_id, mois, montant)
    values (p_espace, v_pid, v_id, (v_x ->> 'mois')::date, (v_x ->> 'montant')::int);
    perform emettre_recu('loyer', v_pid, null);
    v_nb_pai := v_nb_pai + 1;
  end loop;

  return jsonb_build_object(
    'maisons', (select count(*) from jsonb_object_keys(v_maisons)),
    'logements', (select count(*) from jsonb_object_keys(v_logements)),
    'locataires', (select count(*) from jsonb_object_keys(v_locataires)),
    'baux', (select count(*) from jsonb_object_keys(v_baux)),
    'revisions', v_nb_rev,
    'paiements', v_nb_pai,
    'a_verifier', (select count(*) from paiements where espace_id = p_espace and a_verifier <> '{}'));
end $$;

-- ---------- Corrections par le propriétaire ----------
create or replace function verifier_paiement_repris(p_paiement uuid) returns paiements
language plpgsql security definer set search_path = public as $$
declare v_p paiements;
begin
  select * into v_p from paiements where id = p_paiement and supprime_le is null;
  if not found then raise exception 'Paiement introuvable.'; end if;
  if not peut_gerer_espace(v_p.espace_id) then
    raise exception 'Seul le propriétaire peut corriger un paiement repris de l''ancien logiciel.';
  end if;
  if v_p.reprise is null then raise exception 'Ce paiement n''a pas été repris de l''ancien logiciel.'; end if;
  if v_p.statut <> 'valide' then raise exception 'Ce paiement est annulé.'; end if;
  return v_p;
end $$;

-- Le mois saisi dans l'ancien logiciel était faux : on le remplace (même reçu, même numéro).
create or replace function changer_mois_paiement_repris(p_paiement uuid, p_mois date) returns void
language plpgsql security definer set search_path = public as $$
declare v_p paiements; v_b baux;
begin
  v_p := verifier_paiement_repris(p_paiement);
  if p_mois is null or extract(day from p_mois) <> 1 then raise exception 'Mois invalide.'; end if;
  select * into v_b from baux where id = v_p.bail_id;
  if p_mois < date_trunc('month', v_b.date_debut)::date
     or (v_b.date_fin is not null and p_mois > date_trunc('month', v_b.date_fin)::date) then
    raise exception 'Ce mois est en dehors du bail.';
  end if;
  if (select count(*) from imputations where paiement_id = p_paiement and supprime_le is null) <> 1 then
    raise exception 'Ce paiement couvre plusieurs mois : utilisez « Corriger ».';
  end if;

  update imputations set mois = p_mois where paiement_id = p_paiement and supprime_le is null;
  update paiements
     set a_verifier = case when montant = loyer_du_mois(bail_id, p_mois)
                           then array_remove(array_remove(a_verifier, 'doublon'), 'montant')
                           else array_remove(a_verifier, 'doublon') end,
         reprise = reprise || jsonb_build_object('mois_corrige_le', now(), 'mois_corrige_par', auth.uid())
   where id = p_paiement;
  perform recalculer_recu_repris(p_paiement);
end $$;

-- « C'est correct » : retire les étiquettes à vérifier.
create or replace function valider_paiement_repris(p_paiement uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_paiement_repris(p_paiement);
  update paiements
     set a_verifier = '{}',
         reprise = reprise || jsonb_build_object('verifie_le', now(), 'verifie_par', auth.uid())
   where id = p_paiement;
end $$;

-- Renommer un locataire met à jour ses reçus repris (ex. « Locataire à renommer »).
create or replace function reprise_renommer_locataire() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ancien text := trim(old.nom || ' ' || coalesce(old.prenoms, ''));
  v_nouveau text := trim(new.nom || ' ' || coalesce(new.prenoms, ''));
  v_id uuid;
begin
  if v_ancien = v_nouveau then return null; end if;
  for v_id in
    select p.id from paiements p join baux b on b.id = p.bail_id
     where b.locataire_id = new.id and p.reprise is not null and p.supprime_le is null
  loop
    update paiements set payeur = v_nouveau where id = v_id and payeur = v_ancien;
    perform recalculer_recu_repris(v_id);
  end loop;
  return null;
end $$;
create trigger locataires_reprise_renommer after update of nom, prenoms on locataires
  for each row execute function reprise_renommer_locataire();

-- ---------- Droits ----------
revoke execute on function contenu_recu(type_recu, uuid, uuid, text), recalculer_recu_repris(uuid),
  importer_reprise(uuid, jsonb), verifier_paiement_repris(uuid), reprise_renommer_locataire()
  from public, anon, authenticated;
grant execute on function importer_reprise(uuid, jsonb) to service_role;
revoke execute on function changer_mois_paiement_repris(uuid, date), valider_paiement_repris(uuid) from public, anon;
grant execute on function changer_mois_paiement_repris(uuid, date), valider_paiement_repris(uuid) to authenticated;
