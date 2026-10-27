import { Box, Group, Paper, Stack, Text } from '@mantine/core';
import { IconCash, IconHome } from '@tabler/icons-react';
import { iconeMenu } from '@/espace/icones';
import { NAVIGATION } from '@/layout/navigation';
import { formatFCFA } from '@/lib/format';

/**
 * Aperçu en direct de l'application avec l'identité en cours de réglage (pas encore enregistrée).
 * Les couleurs d'état (à jour, en retard, critique) restent fixes, quel que soit le thème.
 */
export function ApercuApplication({ couleur, nom, logo, icones }: {
  couleur: string;
  nom: string;
  logo: string | null;
  icones: Record<string, string>;
}) {
  const entrees = NAVIGATION.filter((n) => ['accueil', 'encaisser', 'locataires', 'maisons', 'recus', 'statistiques'].includes(n.cle));
  const clair = `color-mix(in srgb, ${couleur} 12%, white)`;
  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }} aria-label="Aperçu de l'application">
      <Group h={44} px="sm" gap="xs" wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        {logo ? <img src={logo} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} /> : (
          <Box w={28} h={28} style={{ background: couleur, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
            <IconHome size={17} color="white" />
          </Box>
        )}
        <Text fw={800} size="sm" truncate>{nom || 'Mon espace'}</Text>
      </Group>
      <Group align="stretch" gap={0} wrap="nowrap">
        <Stack gap={2} p={6} w={150} style={{ borderRight: '1px solid var(--mantine-color-gray-3)' }} visibleFrom="xs">
          {entrees.map((n, i) => {
            const I = iconeMenu(n.cle, n.icone, icones);
            return (
              <Group key={n.cle} gap={6} px={8} py={5} wrap="nowrap"
                style={{ borderRadius: 8, background: i === 0 ? couleur : undefined, color: i === 0 ? 'white' : undefined }}>
                <I size={16} stroke={1.7} />
                <Text size="xs" fw={600} truncate>{n.libelle}</Text>
              </Group>
            );
          })}
        </Stack>
        <Stack gap={8} p="sm" style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} grow>
            <Box p={8} style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}>
              <Text size="xs" c="dimmed">Encaissé</Text>
              <Text size="sm" fw={800} style={{ color: couleur }}>{formatFCFA(420000)}</Text>
            </Box>
            <Box p={8} style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}>
              <Text size="xs" c="dimmed">Reste</Text>
              <Text size="sm" fw={800} c="orange.8">{formatFCFA(70000)}</Text>
            </Box>
          </Group>
          <Group gap={8} px={10} py={8} justify="center" style={{ background: couleur, color: 'white', borderRadius: 8 }}>
            {(() => { const I = iconeMenu('encaisser', IconCash, icones); return <I size={18} />; })()}
            <Text size="sm" fw={800}>Encaisser un loyer</Text>
          </Group>
          <Group gap={6}>
            <Text size="xs" px={8} py={2} fw={700} style={{ borderRadius: 99, color: 'var(--statut-ok)', background: 'color-mix(in srgb, var(--statut-ok) 14%, white)' }}>✓ À jour</Text>
            <Text size="xs" px={8} py={2} fw={700} style={{ borderRadius: 99, color: 'var(--statut-retard)', background: 'color-mix(in srgb, var(--statut-retard) 14%, white)' }}>! Retard 1 mois</Text>
            <Text size="xs" px={8} py={2} fw={700} style={{ borderRadius: 99, color: 'var(--statut-critique)', background: 'color-mix(in srgb, var(--statut-critique) 14%, white)' }}>⚠ Critique</Text>
          </Group>
          <Text size="xs" px={8} py={4} style={{ background: clair, borderRadius: 6 }}>Les couleurs d'état restent les mêmes, quel que soit le thème.</Text>
        </Stack>
      </Group>
    </Paper>
  );
}
