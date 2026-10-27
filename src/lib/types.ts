// Types applicatifs (en attendant la génération complète par `npm run types:db`).
export type Role = 'super_admin' | 'proprietaire' | 'gestionnaire' | 'consultation';
export type StatutBail = 'a_jour' | 'retard' | 'critique';
export type ModePaiement = 'especes' | 'mtn_momo' | 'moov_money' | 'celtiis_cash' | 'virement' | 'cheque' | 'autre';
export type TypeLogement = 'chambre' | 'chambre_salon' | 'appartement' | 'boutique' | 'magasin' | 'bureau' | 'autre';

export interface Profil {
  id: string;
  identifiant: string;
  nom_complet: string;
  telephone: string | null;
  email: string | null;
  est_super_admin: boolean;
  doit_changer_mdp: boolean;
  signature_path: string | null;
  preferences: Record<string, unknown>;
}

export interface Espace {
  id: string;
  nom: string;
  prefixe_recu: string;
  ville: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  logo_path: string | null;
  cachet_path: string | null;
  signature_path: string | null;
  couleur_primaire: string;
  formule: string;
  limites_actives: boolean;
  max_logements: number | null;
  delai_retard_jours: number;
  actif: boolean;
}

export interface Maison {
  id: string;
  espace_id: string;
  nom: string;
  quartier: string | null;
  ville: string | null;
  repere: string | null;
  gestionnaire_id: string | null;
  notes: string | null;
}

export interface Logement {
  id: string;
  espace_id: string;
  maison_id: string;
  type: TypeLogement;
  designation: string;
  niveau: string | null;
  loyer_reference: number | null;
  notes: string | null;
}

export interface Locataire {
  id: string;
  espace_id: string;
  nom: string;
  prenoms: string | null;
  telephone: string | null;
  telephone2: string | null;
  email: string | null;
  piece_type: string | null;
  piece_numero: string | null;
  profession: string | null;
  contact_urgence: string | null;
  notes: string | null;
}

export interface Bail {
  id: string;
  espace_id: string;
  logement_id: string;
  locataire_id: string;
  reference: string | null;
  date_debut: string;
  date_fin: string | null;
  jour_echeance: number;
  loyer: number;
  premier_mois_montant: number | null;
  caution_montant: number;
  actif: boolean;
}

export interface SituationBail {
  bail_id: string;
  espace_id: string;
  maison_id: string;
  logement_id: string;
  locataire_id: string;
  actif: boolean;
  date_debut: string;
  date_fin: string | null;
  loyer: number;
  dernier_mois_solde: string | null;
  prochain_mois_du: string | null;
  nb_mois_dus: number;
  nb_mois_retard: number;
  montant_du: number;
  statut: StatutBail;
}

export interface Echeance {
  mois: string;
  du: number;
  paye: number;
  remise: number;
  reste: number;
  statut: 'solde' | 'partiel' | 'du';
}

export interface ContenuRecu {
  type: 'loyer' | 'caution' | 'restitution';
  numero: string;
  espace: { id: string; nom: string; ville: string | null; adresse: string | null; telephone: string | null;
    email: string | null; logo_path: string | null; cachet_path: string | null; couleur: string };
  logement: { immeuble: string; quartier: string | null; ville: string | null; designation: string;
    niveau: string | null; type: TypeLogement; reference_bail: string | null };
  locataire: { nom_complet: string; initiales: string; telephone: string | null };
  payeur: string;
  mode: ModePaiement | null;
  reference_transaction: string | null;
  montant: number;
  remise: number;
  motif_remise: string | null;
  mois: string[];
  nb_mois: number;
  date_paiement: string;
  loyer_mensuel: number;
  encaissant: { id: string; nom: string; role: string; signature_path: string | null };
  situation: { paye_jusqua: string | null; nb_mois_dus: number; montant_du: number };
  caution: { mouvement: 'versement' | 'remboursement' | 'retenue'; motif: string | null; solde: number } | null;
  emis_le: string;
}

export interface Recu {
  id: string;
  espace_id: string;
  type: 'loyer' | 'caution' | 'restitution';
  paiement_id: string | null;
  mouvement_caution_id: string | null;
  numero: string;
  code_verification: string;
  contenu: ContenuRecu;
  emis_le: string;
  nb_duplicatas: number;
  original_genere: boolean;
  supprime_le: string | null;
}
