import {
  IconBuildingEstate, IconCash, IconChartBar, IconHistory, IconHome, IconInbox, IconReceipt, IconSchool, IconSettings, IconShieldLock,
  IconTrash, IconUserCircle, IconUsers, IconUsersGroup, type Icon,
} from '@tabler/icons-react';
import type { Action } from '@/espace/droits';

export interface EntreeNavigation {
  cle: string;
  libelle: string;
  chemin?: string;
  /** Action spéciale à la place d'un lien. */
  action?: 'encaisser';
  icone: Icon;
  droit?: Action;
  /** Groupe affiché en bas du menu. */
  bas?: boolean;
}

export const NAVIGATION: EntreeNavigation[] = [
  { cle: 'accueil', libelle: 'Accueil', chemin: '/', icone: IconHome },
  { cle: 'encaisser', libelle: 'Encaisser', action: 'encaisser', icone: IconCash, droit: 'encaisser' },
  { cle: 'locataires', libelle: 'Locataires', chemin: '/locataires', icone: IconUsers },
  { cle: 'maisons', libelle: 'Maisons', chemin: '/maisons', icone: IconBuildingEstate },
  { cle: 'recus', libelle: 'Reçus', chemin: '/recus', icone: IconReceipt },
  { cle: 'statistiques', libelle: 'Statistiques', chemin: '/statistiques', icone: IconChartBar },
  { cle: 'demandes', libelle: 'Demandes', chemin: '/demandes', icone: IconInbox },
  { cle: 'comptes', libelle: 'Comptes', chemin: '/comptes', icone: IconUsersGroup, droit: 'gerer_comptes', bas: true },
  { cle: 'parametres', libelle: 'Paramètres', chemin: '/parametres', icone: IconSettings, droit: 'parametres_espace', bas: true },
  { cle: 'corbeille', libelle: 'Corbeille', chemin: '/corbeille', icone: IconTrash, droit: 'voir_corbeille', bas: true },
  { cle: 'admin', libelle: 'Administration', chemin: '/admin', icone: IconShieldLock, droit: 'admin', bas: true },
  { cle: 'audit', libelle: "Journal d'audit", chemin: '/admin/audit', icone: IconHistory, droit: 'admin', bas: true },
  { cle: 'apprendre', libelle: 'Apprendre', chemin: '/apprendre', icone: IconSchool, bas: true },
  { cle: 'profil', libelle: 'Mon profil', chemin: '/profil', icone: IconUserCircle, bas: true },
];
