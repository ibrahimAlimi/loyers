import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

export const CHEMIN_CODE = '/double-authentification';
export const CHEMIN_ACTIVATION = '/double-authentification/activer';

export function RequireAuth() {
  const { session, profil, niveau, chargement } = useAuth();
  const lieu = useLocation();
  const ici = lieu.pathname;

  if (chargement) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (!session) return <Navigate to="/connexion" replace state={{ depuis: ici }} />;

  // 1. Double authentification activée mais code pas encore saisi pour cette session
  if (niveau.requis === 'aal2' && niveau.actuel !== 'aal2') {
    return ici === CHEMIN_CODE ? <Outlet /> : <Navigate to={CHEMIN_CODE} replace />;
  }
  if (!profil) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  // 2. Le super admin doit obligatoirement activer la double authentification
  if (profil.est_super_admin && niveau.requis !== 'aal2') {
    return ici === CHEMIN_ACTIVATION ? <Outlet /> : <Navigate to={CHEMIN_ACTIVATION} replace />;
  }
  if (profil.doit_changer_mdp && ici !== '/changer-mot-de-passe') {
    return <Navigate to="/changer-mot-de-passe" replace />;
  }
  return <Outlet />;
}
