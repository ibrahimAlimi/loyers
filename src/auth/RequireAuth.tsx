import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

export function RequireAuth() {
  const { session, profil, chargement } = useAuth();
  const lieu = useLocation();

  if (chargement || (session && !profil)) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (!session) return <Navigate to="/connexion" replace state={{ depuis: lieu.pathname }} />;
  if (profil?.doit_changer_mdp && lieu.pathname !== '/changer-mot-de-passe') {
    return <Navigate to="/changer-mot-de-passe" replace />;
  }
  return <Outlet />;
}
