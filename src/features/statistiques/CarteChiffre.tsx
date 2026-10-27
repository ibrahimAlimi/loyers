import type { ReactNode } from 'react';
import { Card, Skeleton, Text } from '@mantine/core';

export function CarteChiffre({ libelle, valeur, detail, chargement, couleur }: {
  libelle: ReactNode;
  valeur: ReactNode;
  detail?: ReactNode;
  chargement?: boolean;
  couleur?: string;
}) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Text size="sm" c="dimmed">{libelle}</Text>
      {chargement ? <Skeleton h={28} mt={6} /> : (
        <Text fw={800} size="xl" c={couleur} className="montant" mt={2}>{valeur}</Text>
      )}
      {detail && <Text size="xs" c="dimmed" mt={2}>{detail}</Text>}
    </Card>
  );
}
