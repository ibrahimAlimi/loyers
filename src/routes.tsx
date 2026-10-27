import { createBrowserRouter } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { ConnexionPage } from './auth/ConnexionPage';
import { ChangerMotDePassePage } from './auth/ChangerMotDePassePage';
import { ActivationDoubleAuthPage, SaisieCodePage } from './auth/DoubleAuthPage';
import { AppShell } from './layout/AppShell';
import { AccueilPage } from './features/accueil/AccueilPage';
import { LocatairesPage } from './features/locataires/LocatairesPage';
import { LocatairePage } from './features/locataires/LocatairePage';
import { MaisonsPage } from './features/maisons/MaisonsPage';
import { MaisonPage } from './features/maisons/MaisonPage';
import { RecusPage } from './features/recus/RecusPage';
import { VerificationPage } from './features/verification/VerificationPage';
import { StatistiquesPage } from './features/statistiques/StatistiquesPage';
import { CorbeillePage } from './features/corbeille/CorbeillePage';
import { DemandesPage } from './features/demandes/DemandesPage';
import { UtilisateursPage } from './features/utilisateurs/UtilisateursPage';
import { ParametresEspacePage } from './features/parametres/ParametresEspacePage';
import { ProfilPage } from './features/parametres/ProfilPage';
import { EspacesPage } from './features/admin/EspacesPage';
import { AuditPage } from './features/admin/audit/AuditPage';
import { ApprendrePage } from './features/apprendre/ApprendrePage';
import { VitrinePage } from './features/vitrine/VitrinePage';
import { DemandeAccesPage } from './features/vitrine/DemandeAccesPage';
import { InstallerPage } from './features/vitrine/InstallerPage';
import { ConditionsPage } from './features/vitrine/ConditionsPage';
import { PresentationPage } from './features/vitrine/PresentationPage';
import { EtatVide } from './ui/EtatVide';

export const router = createBrowserRouter([
  { path: '/connexion', element: <ConnexionPage /> },
  { path: '/e/:cle', element: <ConnexionPage /> },
  { path: '/bienvenue', element: <VitrinePage /> },
  { path: '/demande-acces', element: <DemandeAccesPage /> },
  { path: '/installer', element: <InstallerPage /> },
  { path: '/conditions', element: <ConditionsPage /> },
  { path: '/presentation', element: <PresentationPage /> },
  { path: '/v/:code', element: <VerificationPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/changer-mot-de-passe', element: <ChangerMotDePassePage /> },
      { path: '/double-authentification', element: <SaisieCodePage /> },
      { path: '/double-authentification/activer', element: <ActivationDoubleAuthPage /> },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <AccueilPage /> },
          { path: 'locataires', element: <LocatairesPage /> },
          { path: 'locataires/:id', element: <LocatairePage /> },
          { path: 'maisons', element: <MaisonsPage /> },
          { path: 'maisons/:id', element: <MaisonPage /> },
          { path: 'recus', element: <RecusPage /> },
          { path: 'statistiques', element: <StatistiquesPage /> },
          { path: 'demandes', element: <DemandesPage /> },
          { path: 'comptes', element: <UtilisateursPage /> },
          { path: 'parametres', element: <ParametresEspacePage /> },
          { path: 'corbeille', element: <CorbeillePage /> },
          { path: 'admin', element: <EspacesPage /> },
          { path: 'admin/audit', element: <AuditPage /> },
          { path: 'profil', element: <ProfilPage /> },
          { path: 'apprendre', element: <ApprendrePage /> },
          { path: '*', element: <EtatVide titre="Page introuvable" message="Cette page n'existe pas." /> },
        ],
      },
    ],
  },
]);
