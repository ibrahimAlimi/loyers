import { useEffect, useRef, type ReactNode } from 'react';
import { Center, Loader } from '@mantine/core';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthProvider';
import { useEspace } from '@/espace/EspaceProvider';
import { peut, type Action } from '@/espace/droits';

/** Message affiché sur la page de connexion après une déconnexion pour accès refusé. */
export const ACCES_REFUSE = 'acces_refuse';

/**
 * Contrôle d'accès d'une route selon le rôle (même matrice que le menu, `droits.ts`).
 * Une page hors de ses droits (adresse saisie à la main, lien partagé) déconnecte l'utilisateur.
 * La vraie protection des données reste la RLS : ce garde empêche seulement d'ouvrir l'écran.
 */
export function RequireDroit({ droit, children }: { droit: Action; children: ReactNode }) {
  const { profil, seDeconnecter } = useAuth();
  const { role } = useEspace();
  const navigate = useNavigate();
  const roleEffectif = profil?.est_super_admin ? 'super_admin' : role;
  const autorise = peut(droit, roleEffectif);
  const fait = useRef(false);

  useEffect(() => {
    if (autorise || fait.current) return;
    fait.current = true;
    void seDeconnecter().finally(() => navigate('/connexion', { replace: true, state: { [ACCES_REFUSE]: true } }));
  }, [autorise, seDeconnecter, navigate]);

  if (!autorise) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }
  return <>{children}</>;
}
