import type { Role } from '@/lib/types';

export type Canal = 'app' | 'push' | 'email';

export interface TypeNotification {
  type: string;
  libelle: string;
  /** Rôles qui peuvent recevoir cet événement (pour ne montrer que les réglages utiles). */
  roles: Role[];
  /** Doit rester identique à canaux_par_defaut() en SQL (migration 12). */
  defaut: Canal[];
}

const TOUS: Canal[] = ['app', 'push', 'email'];

export const CATALOGUE: TypeNotification[] = [
  { type: 'paiement_gestionnaire', libelle: 'Paiement encaissé par un gestionnaire', roles: ['proprietaire'], defaut: TOUS },
  { type: 'paiement', libelle: 'Paiement encaissé dans mes maisons', roles: ['gestionnaire'], defaut: ['app', 'push'] },
  { type: 'resume_quotidien', libelle: 'Résumé des encaissements de la veille', roles: ['proprietaire'], defaut: ['app'] },
  { type: 'paiement_annule', libelle: 'Paiement annulé', roles: ['proprietaire', 'gestionnaire'], defaut: TOUS },
  { type: 'demande_nouvelle', libelle: "Demande d'annulation ou de suppression", roles: ['proprietaire'], defaut: TOUS },
  { type: 'demande_traitee', libelle: 'Ma demande acceptée ou refusée', roles: ['gestionnaire'], defaut: TOUS },
  { type: 'retard', libelle: 'Loyer en retard', roles: ['proprietaire', 'gestionnaire'], defaut: ['app', 'push'] },
  { type: 'fin_bail', libelle: 'Fin de bail dans 30 jours', roles: ['proprietaire', 'gestionnaire'], defaut: ['app', 'push'] },
  { type: 'logement_libere', libelle: 'Logement libéré (départ d’un locataire)', roles: ['proprietaire', 'gestionnaire'], defaut: ['app', 'push'] },
  { type: 'modification', libelle: 'Ajout ou modification d’une maison, d’un logement, d’un locataire ou d’un bail', roles: ['proprietaire', 'gestionnaire'], defaut: ['app'] },
  { type: 'corbeille', libelle: 'Mise à la corbeille et restauration', roles: ['proprietaire', 'super_admin'], defaut: ['app'] },
  { type: 'duplicata', libelle: 'Reçu réimprimé (duplicata)', roles: ['proprietaire'], defaut: ['app', 'push'] },
  { type: 'compte', libelle: 'Comptes, droits et maisons confiées', roles: ['proprietaire', 'gestionnaire', 'consultation'], defaut: ['app', 'push'] },
  { type: 'securite', libelle: 'Mot de passe modifié, connexion inhabituelle', roles: ['proprietaire', 'gestionnaire', 'consultation', 'super_admin'], defaut: TOUS },
  { type: 'resume_mensuel', libelle: 'Résumé du mois (encaissé, impayés, occupation)', roles: ['proprietaire', 'consultation'], defaut: ['app', 'email'] },
  { type: 'limite_formule', libelle: 'Limite de la formule atteinte', roles: ['proprietaire', 'super_admin'], defaut: TOUS },
  { type: 'demande_acces', libelle: 'Nouvelle demande d’accès d’un propriétaire', roles: ['super_admin'], defaut: TOUS },
  { type: 'quota', libelle: 'Base de données ou stockage presque plein', roles: ['super_admin'], defaut: TOUS },
];

export const LIBELLE_CANAL: Record<Canal, string> = { app: 'Application', push: 'Téléphone', email: 'E-mail' };
