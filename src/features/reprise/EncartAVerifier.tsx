import { Alert, Button, Group, Text } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { Link } from 'react-router';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { useNbAVerifier } from './api';

/** Rappel sur l'Accueil tant que des paiements repris de l'ancien logiciel restent à vérifier. */
export function EncartAVerifier() {
  const espace = useEspaceCourant();
  const proprio = peut('supprimer', espace.role);
  const nb = useNbAVerifier(proprio).data ?? 0;
  if (!proprio || nb === 0) return null;
  return (
    <Alert color="orange" variant="light" radius="lg" mb="md" icon={<IconHistory size={22} />}>
      <Group justify="space-between" gap="sm">
        <Text size="sm">
          <b>{nb} paiement{nb > 1 ? 's' : ''} de l'ancien logiciel</b> {nb > 1 ? 'sont' : 'est'} à vérifier (mois saisi deux fois, montant inhabituel…).
        </Text>
        <Button component={Link} to="/a-verifier" size="xs" color="orange">Vérifier</Button>
      </Group>
    </Alert>
  );
}
