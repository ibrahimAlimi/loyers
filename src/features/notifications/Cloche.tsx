import { ActionIcon, Button, Drawer, Group, Indicator, Popover, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconBell, IconChecks, IconSettings } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { dayjs } from '@/lib/dates';
import { useMarquerLues, useNotifications, type Notification } from './api';

const quand = (d: string) => {
  const j = dayjs(d);
  const minutes = dayjs().diff(j, 'minute');
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (dayjs().isSame(j, 'day')) return `aujourd'hui à ${j.format('HH:mm')}`;
  if (dayjs().subtract(1, 'day').isSame(j, 'day')) return `hier à ${j.format('HH:mm')}`;
  return j.format('DD/MM/YYYY à HH:mm');
};

/** Cloche de l'en-tête : badge des non lues, liste, « Tout marquer comme lu », lien vers l'élément. */
export function Cloche() {
  const mobile = useMediaQuery('(max-width: 48em)');
  const [ouvert, { toggle, close }] = useDisclosure(false);
  const { data = [] } = useNotifications();
  const marquer = useMarquerLues();
  const navigate = useNavigate();
  const nonLues = data.filter((n) => !n.lu_le).length;

  const ouvrir = (n: Notification) => {
    if (!n.lu_le) marquer.mutate([n.id]);
    close();
    if (n.lien) navigate(n.lien);
  };

  const liste = (
    <Stack gap={0}>
      <Group justify="space-between" px="sm" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Text fw={800}>Notifications</Text>
        <Group gap={4}>
          <Button size="xs" variant="subtle" leftSection={<IconChecks size={16} />} disabled={!nonLues}
            onClick={() => marquer.mutate(null)}>Tout marquer comme lu</Button>
          <ActionIcon variant="subtle" color="gray" aria-label="Régler mes notifications" onClick={() => { close(); navigate('/profil#notifications'); }}>
            <IconSettings size={18} />
          </ActionIcon>
        </Group>
      </Group>
      <ScrollArea.Autosize mah={mobile ? '70vh' : 440}>
        {!data.length && <Text c="dimmed" ta="center" py="xl" px="md">Aucune notification pour le moment.</Text>}
        {data.map((n) => (
          <UnstyledButton key={n.id} onClick={() => ouvrir(n)} w="100%" px="sm" py="xs"
            style={{ borderBottom: '1px solid var(--mantine-color-gray-1)', background: n.lu_le ? undefined : 'var(--mantine-color-espace-light)' }}>
            <Group gap="xs" wrap="nowrap" align="flex-start">
              <div style={{ width: 8, height: 8, borderRadius: 99, marginTop: 7, flexShrink: 0,
                background: n.lu_le ? 'transparent' : 'var(--mantine-color-espace-filled)' }} />
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={n.lu_le ? 500 : 700}>{n.titre}</Text>
                {n.message && <Text size="sm" c="dimmed" lineClamp={2}>{n.message}</Text>}
                <Text size="xs" c="dimmed" mt={2}>{quand(n.cree_le)}</Text>
              </div>
            </Group>
          </UnstyledButton>
        ))}
      </ScrollArea.Autosize>
    </Stack>
  );

  const bouton = (
    <Indicator label={nonLues > 99 ? '99+' : nonLues} size={18} color="red" disabled={!nonLues} offset={4}>
      <ActionIcon variant="subtle" color="gray" size="lg" onClick={toggle} data-tour="notifications"
        aria-label={nonLues ? `Notifications, ${nonLues} non lues` : 'Notifications'}>
        <IconBell size={24} stroke={1.7} />
      </ActionIcon>
    </Indicator>
  );

  if (mobile) {
    return (
      <>
        {bouton}
        <Drawer opened={ouvert} onClose={close} position="bottom" size="auto" withCloseButton={false} radius="lg" padding={0}>
          {liste}
        </Drawer>
      </>
    );
  }
  return (
    <Popover opened={ouvert} onChange={(o) => !o && close()} position="bottom-end" width={400} shadow="md" radius="lg" withinPortal>
      <Popover.Target>{bouton}</Popover.Target>
      <Popover.Dropdown p={0}>{liste}</Popover.Dropdown>
    </Popover>
  );
}
