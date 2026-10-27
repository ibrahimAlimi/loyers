-- =====================================================================
-- Lot 1 - Schéma de base : espaces, membres, maisons, logements,
-- locataires, baux, paiements, imputations, reçus, cautions, demandes.
-- Montants en FCFA entiers. Un mois = date du 1er du mois.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

set search_path = public, extensions;

-- ---------- Types ----------
create type role_membre as enum ('proprietaire', 'gestionnaire', 'consultation');
create type formule as enum ('decouverte', 'essentiel', 'pro', 'sur_mesure');
create type type_logement as enum ('chambre', 'chambre_salon', 'appartement', 'boutique', 'magasin', 'bureau', 'autre');
create type mode_paiement as enum ('especes', 'mtn_momo', 'moov_money', 'celtiis_cash', 'virement', 'cheque', 'autre');
create type statut_paiement as enum ('valide', 'annule');
create type type_recu as enum ('loyer', 'caution', 'restitution');
create type type_mvt_caution as enum ('versement', 'remboursement', 'retenue');
create type statut_demande as enum ('en_attente', 'acceptee', 'refusee');

-- ---------- Profils (1-1 avec auth.users) ----------
create table profils (
  id uuid primary key references auth.users (id) on delete cascade,
  identifiant citext not null unique check (identifiant ~ '^[a-z0-9._-]{3,40}$'),
  nom_complet text not null,
  telephone text,
  email citext,
  est_super_admin boolean not null default false,
  doit_changer_mdp boolean not null default true,
  signature_path text,
  preferences jsonb not null default '{}'::jsonb,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz
);
create unique index profils_email_unique on profils (email) where email is not null;

-- ---------- Espaces (un par propriétaire) ----------
create table espaces (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  slug citext unique,
  prefixe_recu char(3) not null unique check (prefixe_recu ~ '^[A-Z]{3}$'),
  ville text,
  adresse text,
  telephone text,
  email text,
  logo_path text,
  cachet_path text,
  signature_path text,
  couleur_primaire text not null default '#0f766e',
  formule formule not null default 'decouverte',
  limites_actives boolean not null default false,
  max_logements int check (max_logements is null or max_logements > 0),
  delai_retard_jours int not null default 5 check (delai_retard_jours between 0 and 60),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid
);

create table membres (
  espace_id uuid not null references espaces (id) on delete cascade,
  user_id uuid not null references profils (id) on delete cascade,
  role role_membre not null,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  primary key (espace_id, user_id)
);
create index membres_user_idx on membres (user_id);

-- ---------- Maisons / logements ----------
create table maisons (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  nom text not null,
  quartier text,
  ville text,
  repere text,
  gestionnaire_id uuid references profils (id) on delete set null,
  photo_path text,
  notes text,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid
);
create index maisons_espace_idx on maisons (espace_id);
create index maisons_gestionnaire_idx on maisons (gestionnaire_id);

-- Portée limitée d'un compte Consultation (vide = tout l'espace)
create table membre_maisons (
  espace_id uuid not null references espaces (id) on delete cascade,
  user_id uuid not null references profils (id) on delete cascade,
  maison_id uuid not null references maisons (id) on delete cascade,
  primary key (espace_id, user_id, maison_id)
);

create table logements (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  maison_id uuid not null references maisons (id) on delete cascade,
  type type_logement not null,
  designation text not null,
  niveau text,
  loyer_reference int check (loyer_reference is null or loyer_reference > 0),
  notes text,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid
);
create index logements_espace_idx on logements (espace_id);
create index logements_maison_idx on logements (maison_id);

-- ---------- Locataires / baux ----------
create table locataires (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  nom text not null,
  prenoms text,
  telephone text,
  telephone2 text,
  email text,
  piece_type text,
  piece_numero text,
  profession text,
  contact_urgence text,
  notes text,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid
);
create index locataires_espace_idx on locataires (espace_id);

create table baux (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  logement_id uuid not null references logements (id) on delete cascade,
  locataire_id uuid not null references locataires (id) on delete cascade,
  reference text,
  date_debut date not null,
  date_fin date,
  jour_echeance smallint not null default 1 check (jour_echeance between 1 and 28),
  loyer int not null check (loyer > 0),
  premier_mois_montant int check (premier_mois_montant is null or premier_mois_montant >= 0),
  caution_montant int not null default 0 check (caution_montant >= 0),
  actif boolean generated always as (date_fin is null) stored,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid,
  check (date_fin is null or date_fin >= date_debut)
);
create index baux_espace_idx on baux (espace_id);
create index baux_logement_idx on baux (logement_id);
create index baux_locataire_idx on baux (locataire_id);
create unique index baux_un_actif_par_logement on baux (logement_id)
  where date_fin is null and supprime_le is null;

create table revisions_loyer (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  bail_id uuid not null references baux (id) on delete cascade,
  mois_effet date not null check (extract(day from mois_effet) = 1),
  montant int not null check (montant > 0),
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid,
  unique (bail_id, mois_effet)
);
create index revisions_loyer_espace_idx on revisions_loyer (espace_id);

-- ---------- Paiements / imputations ----------
create table paiements (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  bail_id uuid not null references baux (id) on delete cascade,
  date_paiement date not null,
  montant int not null check (montant > 0),
  remise int not null default 0 check (remise >= 0),
  motif_remise text,
  mode mode_paiement not null,
  reference_transaction text,
  payeur text not null,
  encaisse_par uuid not null references profils (id),
  statut statut_paiement not null default 'valide',
  motif_annulation text,
  annule_par uuid references profils (id),
  annule_le timestamptz,
  remplace_paiement_id uuid references paiements (id) on delete set null,
  cle_idempotence uuid not null unique,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid
);
create index paiements_espace_idx on paiements (espace_id);
create index paiements_bail_idx on paiements (bail_id);
create index paiements_date_idx on paiements (espace_id, date_paiement);

create table imputations (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  paiement_id uuid not null references paiements (id) on delete cascade,
  bail_id uuid not null references baux (id) on delete cascade,
  mois date not null check (extract(day from mois) = 1),
  montant int not null default 0 check (montant >= 0),
  remise int not null default 0 check (remise >= 0),
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid
);
create index imputations_espace_idx on imputations (espace_id);
create index imputations_bail_mois_idx on imputations (bail_id, mois);
create index imputations_paiement_idx on imputations (paiement_id);

-- ---------- Cautions ----------
create table mouvements_caution (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  bail_id uuid not null references baux (id) on delete cascade,
  type type_mvt_caution not null,
  montant int not null check (montant > 0),
  date_mouvement date not null,
  motif text,
  mode mode_paiement,
  encaisse_par uuid references profils (id),
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid
);
create index mouvements_caution_espace_idx on mouvements_caution (espace_id);
create index mouvements_caution_bail_idx on mouvements_caution (bail_id);

-- ---------- Reçus ----------
create table recus (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  type type_recu not null,
  paiement_id uuid unique references paiements (id) on delete cascade,
  mouvement_caution_id uuid unique references mouvements_caution (id) on delete cascade,
  numero text not null unique,
  code_verification text not null unique,
  contenu jsonb not null,
  empreinte text not null,
  emis_le timestamptz not null default now(),
  emis_par uuid references profils (id),
  nb_duplicatas int not null default 0,
  original_genere boolean not null default false,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid,
  check ((paiement_id is not null) <> (mouvement_caution_id is not null))
);
create index recus_espace_idx on recus (espace_id);

create table reimpressions (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  recu_id uuid not null references recus (id) on delete cascade,
  par uuid references profils (id),
  le timestamptz not null default now()
);
create index reimpressions_recu_idx on reimpressions (recu_id);

create table compteurs_recus (
  espace_id uuid not null references espaces (id) on delete cascade,
  serie text not null default '',
  annee int not null,
  dernier int not null default 0,
  primary key (espace_id, serie, annee)
);

-- ---------- Demandes des gestionnaires ----------
create table demandes (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces (id) on delete cascade,
  type text not null check (type in ('annulation_paiement', 'suppression')),
  cible_table text not null,
  cible_id uuid not null,
  cible_libelle text,
  motif text not null,
  statut statut_demande not null default 'en_attente',
  demande_par uuid not null default auth.uid() references profils (id),
  traite_par uuid references profils (id),
  traite_le timestamptz,
  reponse text,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  modifie_le timestamptz,
  supprime_le timestamptz,
  supprime_par uuid,
  lot_suppression uuid
);
create index demandes_espace_idx on demandes (espace_id, statut);

-- ---------- modifie_le automatique ----------
create or replace function maj_modifie_le() returns trigger
language plpgsql as $$
begin
  new.modifie_le := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profils','espaces','maisons','logements','locataires','baux','revisions_loyer',
                           'paiements','imputations','mouvements_caution','recus','demandes']
  loop
    execute format('create trigger %I_modifie_le before update on %I for each row execute function maj_modifie_le()', t, t);
  end loop;
end $$;
