-- =====================================================================
-- Lot 1bis - Correctif : contenu_recu lisait les champs de l'enregistrement
-- v_sit même quand il n'était pas rempli (reçu repris), ce que PL/pgSQL
-- refuse (« record "v_sit" is not assigned yet »). Variables simples à la place.
-- =====================================================================

set search_path = public, extensions;

create or replace function contenu_recu(p_type type_recu, p_paiement uuid, p_mouvement uuid, p_numero text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_bail baux; v_log logements; v_maison maisons; v_loc locataires; v_esp espaces;
  v_enc profils; v_role role_membre;
  v_bail_id uuid; v_montant int; v_date date; v_mode mode_paiement; v_ref text; v_payeur text;
  v_remise int := 0; v_motif_remise text; v_enc_id uuid; v_motif text; v_type_mvt type_mvt_caution;
  v_mois jsonb := '[]'::jsonb; v_nb_mois int := 0; v_premier_mois date; v_reprise jsonb;
  v_paye_jusqua date; v_nb_mois_dus int; v_montant_du int; v_nom_loc text;
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
    select dernier_mois_solde, nb_mois_dus, montant_du into v_paye_jusqua, v_nb_mois_dus, v_montant_du
      from v_situation_baux where bail_id = v_bail_id;
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
        jsonb_build_object('paye_jusqua', v_paye_jusqua, 'nb_mois_dus', coalesce(v_nb_mois_dus, 0),
                           'montant_du', coalesce(v_montant_du, 0)) end,
    'caution', case when p_mouvement is null then null else jsonb_build_object(
        'mouvement', v_type_mvt, 'motif', v_motif, 'solde', situation_caution(v_bail_id)) end,
    'repris', v_reprise is not null,
    'emis_le', case when v_reprise is null then now()
                    else (v_date + time '12:00') at time zone 'Africa/Porto-Novo' end
  );
end $$;

revoke execute on function contenu_recu(type_recu, uuid, uuid, text) from public, anon, authenticated;
