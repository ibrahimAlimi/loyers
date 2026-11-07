import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@mantine/core';
import { useAuth } from './AuthProvider';

/** Bouton « Se déconnecter » : désactivé avec un chargement pendant la déconnexion (pas de double toucher). */
export function BoutonDeconnexion({ children, ...props }: ButtonProps & { children: ReactNode }) {
  const { seDeconnecter } = useAuth();
  const [enCours, setEnCours] = useState(false);
  const quitter = async () => {
    setEnCours(true);
    try {
      await seDeconnecter();
    } finally {
      setEnCours(false);
    }
  };
  return <Button {...props} loading={enCours} onClick={quitter}>{children}</Button>;
}
