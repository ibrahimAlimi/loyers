import type { ReactNode } from 'react';
import { ActionIcon, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

export function PageEntete({ titre, sousTitre, actions, retour }: {
  titre: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  retour?: string;
}) {
  const navigate = useNavigate();
  return (
    <Group justify="space-between" align="flex-start" mb="lg" gap="sm">
      <Group gap="xs" align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
        {retour && (
          <ActionIcon variant="subtle" size="lg" onClick={() => navigate(retour)} aria-label="Retour" mt={2}>
            <IconArrowLeft />
          </ActionIcon>
        )}
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Title order={1} size="h2">{titre}</Title>
          {sousTitre && <Text c="dimmed">{sousTitre}</Text>}
        </Stack>
      </Group>
      {actions && <Group gap="xs">{actions}</Group>}
    </Group>
  );
}
