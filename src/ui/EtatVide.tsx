import type { ReactNode } from 'react';
import { Center, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

export function EtatVide({ titre, message, action, icone }: {
  titre: string;
  message?: string;
  action?: ReactNode;
  icone?: ReactNode;
}) {
  return (
    <Center py={48} px="md">
      <Stack align="center" gap="sm" maw={420} ta="center">
        <ThemeIcon size={56} radius="xl" variant="light">{icone ?? <IconInbox size={30} />}</ThemeIcon>
        <Title order={3} size="h4">{titre}</Title>
        {message && <Text c="dimmed">{message}</Text>}
        {action}
      </Stack>
    </Center>
  );
}
