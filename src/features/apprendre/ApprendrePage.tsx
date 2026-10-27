import { Badge, Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconCheck, IconPlayerPlay, IconRoute } from '@tabler/icons-react';
import { formatDate } from '@/lib/format';
import { PageEntete } from '@/layout/PageEntete';
import { useApprendre } from './ApprendreContext';
import { DEMOS } from './demos';
import { NARRATIONS } from './narrations';
import { dureeTexte } from './voix';

const duree = (id: string) => {
  const s = Math.round((NARRATIONS[id] ?? []).reduce((t, x) => t + dureeTexte(x) + 700, 0) / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ''}`;
};

/** Toutes les démos, avec « ✓ vu », et la visite guidée à relancer. */
export function ApprendrePage() {
  const { ouvrirDemo, lancerVisite, vues } = useApprendre();
  const nbVues = DEMOS.filter((d) => vues[d.id]).length;
  return (
    <>
      <PageEntete titre="Apprendre" sousTitre={`Des démonstrations courtes, avec la voix. ${nbVues} sur ${DEMOS.length} vues.`}
        actions={<Button variant="light" leftSection={<IconRoute size={18} />} onClick={lancerVisite}>Revoir la visite guidée</Button>} />
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {DEMOS.map((d) => (
          <UnstyledButton key={d.id} onClick={() => ouvrirDemo(d.id)}>
            <Card withBorder radius="lg" padding="md" h="100%">
              <Group wrap="nowrap" align="flex-start">
                <ThemeIcon size={44} radius="md" variant="light"><d.icone size={24} /></ThemeIcon>
                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text fw={700}>{d.titre}</Text>
                    {vues[d.id] && <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>vu</Badge>}
                  </Group>
                  <Text size="sm" c="dimmed">{d.description}</Text>
                  <Group gap={6}>
                    <IconPlayerPlay size={14} color="var(--mantine-color-espace-filled)" />
                    <Text size="xs" c="dimmed">{duree(d.id)}{vues[d.id] ? ` · vu le ${formatDate(vues[d.id])}` : ''}</Text>
                  </Group>
                </Stack>
              </Group>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </>
  );
}
