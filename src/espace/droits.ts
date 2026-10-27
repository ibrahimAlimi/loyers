import type { Role } from '@/lib/types';

export type Action =
  | 'encaisser'
  | 'gerer_maisons'
  | 'gerer_baux'
  | 'supprimer'
  | 'demander'
  | 'supprimer_definitivement'
  | 'gerer_comptes'
  | 'parametres_espace'
  | 'traiter_demandes'
  | 'voir_corbeille'
  | 'admin';

// Matrice du §4 de la spec. Sert uniquement à afficher / masquer : la sécurité est assurée par la RLS.
const MATRICE: Record<Action, Role[]> = {
  encaisser: ['super_admin', 'proprietaire', 'gestionnaire'],
  gerer_maisons: ['super_admin', 'proprietaire'],
  gerer_baux: ['super_admin', 'proprietaire', 'gestionnaire'],
  supprimer: ['super_admin', 'proprietaire'],
  demander: ['gestionnaire'],
  supprimer_definitivement: ['super_admin'],
  gerer_comptes: ['super_admin', 'proprietaire'],
  parametres_espace: ['super_admin', 'proprietaire'],
  traiter_demandes: ['super_admin', 'proprietaire'],
  voir_corbeille: ['super_admin', 'proprietaire'],
  admin: ['super_admin'],
};

export const peut = (action: Action, role: Role | null | undefined): boolean =>
  !!role && MATRICE[action].includes(role);
