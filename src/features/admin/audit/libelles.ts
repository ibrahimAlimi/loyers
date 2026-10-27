export const LIBELLE_ACTION: Record<string, string> = {
  connexion: 'Connexion',
  connexion_echec: 'Connexion échouée',
  deconnexion: 'Déconnexion',
  export_statistiques: 'Export des statistiques',
  export_audit: 'Export du journal',
  consultation_locataire: 'Consultation d’un locataire',
  consultation_audit: 'Consultation du journal',
  partage_recu: 'Partage d’un reçu',
  impression_recu: 'Impression d’un reçu',
  duplicata: 'Duplicata d’un reçu',
  droits: 'Changement de droits',
  corbeille: 'Mise à la corbeille',
  restauration: 'Restauration',
  suppression_definitive: 'Suppression définitive',
  annulation_paiement: 'Annulation d’un paiement',
  demande_traitee: 'Demande traitée',
  double_auth_activee: 'Double authentification activée',
  double_auth_desactivee: 'Double authentification désactivée',
  purge_audit: 'Purge du journal',
  purge_historique: 'Purge de l’historique',
};

export const LIBELLE_TABLE: Record<string, string> = {
  profils: 'Compte', espaces: 'Espace', membres: 'Membre', membre_maisons: 'Maison confiée', maisons: 'Maison',
  logements: 'Logement', locataires: 'Locataire', baux: 'Bail', revisions_loyer: 'Révision de loyer',
  paiements: 'Paiement', imputations: 'Imputation', mouvements_caution: 'Caution', recus: 'Reçu',
  reimpressions: 'Réimpression', demandes: 'Demande',
};

export const LIBELLE_OPERATION: Record<string, string> = { insert: 'Création', update: 'Modification', delete: 'Suppression' };

const CHAMPS: Record<string, string> = {
  nom: 'Nom', prenoms: 'Prénoms', nom_complet: 'Nom complet', telephone: 'Téléphone', telephone2: 'Téléphone 2',
  email: 'E-mail', ville: 'Ville', quartier: 'Quartier', adresse: 'Adresse', repere: 'Repère', notes: 'Notes',
  designation: 'Désignation', niveau: 'Niveau', type: 'Type', loyer: 'Loyer', loyer_reference: 'Loyer de référence',
  date_debut: 'Début', date_fin: 'Fin', jour_echeance: 'Jour d’échéance', caution_montant: 'Caution',
  premier_mois_montant: 'Premier mois', montant: 'Montant', remise: 'Remise', motif_remise: 'Motif de remise',
  mode: 'Mode', reference_transaction: 'Référence', payeur: 'Payé par', date_paiement: 'Date du paiement',
  statut: 'Statut', motif_annulation: 'Motif d’annulation', role: 'Rôle', actif: 'Actif',
  gestionnaire_id: 'Gestionnaire', supprime_le: 'Mis à la corbeille le', couleur_primaire: 'Couleur',
  logo_path: 'Logo', cachet_path: 'Cachet', signature_path: 'Signature', icones_menu: 'Icônes du menu',
  delai_retard_jours: 'Tolérance de retard', piece_type: 'Pièce', piece_numero: 'N° de pièce', profession: 'Profession',
  contact_urgence: 'Contact d’urgence', preferences: 'Préférences', motif: 'Motif', reponse: 'Réponse',
  nb_duplicatas: 'Duplicatas', original_genere: 'Original imprimé', est_super_admin: 'Super admin',
  doit_changer_mdp: 'Doit changer son mot de passe', formule: 'Formule', limites_actives: 'Limites actives',
  max_logements: 'Logements maximum', mois_effet: 'À partir de', mois: 'Mois',
};

export const libelleChamp = (c: string) => CHAMPS[c] ?? c;

/** Valeur lisible d'un champ d'historique (texte court, sans JSON brut quand c'est évitable). */
export function valeurLisible(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (typeof v === 'number') return v.toLocaleString('fr-FR');
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString('fr-FR');
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split('-').reverse().join('/');
    return v.length > 120 ? `${v.slice(0, 117)}…` : v;
  }
  const s = JSON.stringify(v);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

/** Résumé d'une ligne d'historique : son nom s'il y en a un. */
export function nomLigne(e: { avant: Record<string, unknown> | null; apres: Record<string, unknown> | null }): string | null {
  const l = { ...(e.avant ?? {}), ...(e.apres ?? {}) };
  const nom = [l.nom, l.prenoms].filter(Boolean).join(' ') || l.designation || l.nom_complet || l.numero;
  return nom ? String(nom) : null;
}
