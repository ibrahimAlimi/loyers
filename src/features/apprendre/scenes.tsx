import type { ReactNode } from 'react';
import { Badge, Box, Button, Card, Group, SimpleGrid, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { StatutBadge } from '@/ui/StatutBadge';

// Petites briques d'écran pour les démos : de vrais composants, des données fictives, aucune action possible.

export function Ecran({ titre, children, perso, retour }: { titre: string; children: ReactNode; perso?: boolean; retour?: boolean }) {
  return (
    <Stack gap={0} h="100%" bg="white">
      <Group h={48} px="sm" justify="space-between" wrap="nowrap" bg="espace" c="white">
        <Text fw={800} size="sm">{retour ? '← ' : ''}{titre}</Text>
        {perso && (
          <Button size="compact-xs" variant="white" leftSection={<IconPencil size={12} />} data-demo="personnaliser">Personnaliser</Button>
        )}
      </Group>
      <Stack p="sm" gap="sm" style={{ flex: 1, overflow: 'hidden' }}>{children}</Stack>
    </Stack>
  );
}

export const Bouton = ({ id, children, variant = 'filled', couleur, plein, icone: I }: {
  id?: string; children: ReactNode; variant?: string; couleur?: string; plein?: boolean; icone?: Icon;
}) => (
  <Button data-demo={id} variant={variant} color={couleur} fullWidth={plein} size="sm" leftSection={I ? <I size={16} /> : undefined}>
    {children}
  </Button>
);

export const Champ = ({ id, label, valeur, indice }: { id?: string; label: string; valeur?: string; indice?: string }) => (
  <TextInput data-demo={id} label={label} value={valeur ?? ''} placeholder={indice} readOnly size="sm" />
);

export const Ligne = ({ id, titre, sous, droite }: { id?: string; titre: ReactNode; sous?: ReactNode; droite?: ReactNode }) => (
  <Group data-demo={id} justify="space-between" wrap="nowrap" py={8} px={4} style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
    <div style={{ minWidth: 0 }}>
      <Text fw={700} size="sm" truncate>{titre}</Text>
      {sous && <Text size="xs" c="dimmed" truncate>{sous}</Text>}
    </div>
    {droite}
  </Group>
);

export const Tuile = ({ id, icone: I, libelle, principale }: { id?: string; icone: Icon; libelle: string; principale?: boolean }) => (
  <Card data-demo={id} withBorder={!principale} radius="md" padding="sm" bg={principale ? 'espace' : undefined} c={principale ? 'white' : undefined}>
    <Stack align="center" gap={4}>
      <I size={24} color={principale ? 'white' : 'var(--mantine-color-espace-filled)'} />
      <Text fw={700} size="xs" ta="center">{libelle}</Text>
    </Stack>
  </Card>
);

export const Chiffre = ({ id, libelle, valeur, couleur, ecart }: { id?: string; libelle: string; valeur: string; couleur?: string; ecart?: ReactNode }) => (
  <Card data-demo={id} withBorder radius="md" padding="xs">
    <Text size="xs" c="dimmed">{libelle}</Text>
    <Text fw={800} c={couleur}>{valeur}</Text>
    {ecart}
  </Card>
);

export const Retard = ({ mois }: { mois: number }) => <StatutBadge statut={mois >= 2 ? 'critique' : mois ? 'retard' : 'a_jour'} nbMois={mois} />;

export const Bulle = ({ children, droite }: { children: ReactNode; droite?: boolean }) => (
  <Box p="xs" maw="85%" style={{ alignSelf: droite ? 'flex-end' : 'flex-start', borderRadius: 10, background: droite ? '#d9fdd3' : 'white', boxShadow: '0 1px 1px rgba(0,0,0,.15)' }}>
    {children}
  </Box>
);

export const Icone = ({ id, icone: I, couleur = 'espace', libelle }: { id?: string; icone: Icon; couleur?: string; libelle: string }) => (
  <Stack data-demo={id} align="center" gap={4} w={72}>
    <ThemeIcon size={52} radius="lg" color={couleur}><I size={28} /></ThemeIcon>
    <Text size="xs" ta="center" c="white" fw={600}>{libelle}</Text>
  </Stack>
);

export { Badge, Card, Group, SimpleGrid, Stack, Text };
