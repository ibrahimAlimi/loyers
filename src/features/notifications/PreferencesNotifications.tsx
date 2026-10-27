import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Group, Stack, Table, Text, Title } from '@mantine/core';
import { IconBell, IconBellOff, IconDeviceMobile } from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthProvider';
import { useEspace } from '@/espace/EspaceProvider';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { useMajPreferences } from '@/perso/preferences';
import type { Role } from '@/lib/types';
import { CATALOGUE, LIBELLE_CANAL, type Canal } from './catalogue';
import { abonnementActuel, activerPush, desactiverPush, pushDisponible } from './push';

const CANAUX: Canal[] = ['app', 'push', 'email'];

/** Réglage, type par type, des canaux de notification (application, téléphone, e-mail, aucun). */
export function PreferencesNotifications() {
  const { profil } = useAuth();
  const { role } = useEspace();
  const majPreferences = useMajPreferences();
  const [abonne, setAbonne] = useState<boolean | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => { abonnementActuel().then((a) => setAbonne(!!a)).catch(() => setAbonne(false)); }, []);

  const roles: Role[] = [...(role ? [role] : []), ...(profil?.est_super_admin ? ['super_admin' as Role] : [])];
  const types = CATALOGUE.filter((t) => t.roles.some((r) => roles.includes(r)));
  const prefs = ((profil?.preferences as Record<string, unknown> | undefined)?.notifications ?? {}) as Record<string, Canal[]>;
  const canaux = (type: string) => prefs[type] ?? CATALOGUE.find((t) => t.type === type)!.defaut;

  const basculer = async (type: string, canal: Canal, actif: boolean) => {
    const actuels = canaux(type);
    const suivants = actif ? [...new Set([...actuels, canal])] : actuels.filter((c) => c !== canal);
    try {
      await majPreferences((p) => ({ ...p, notifications: { ...((p.notifications as object) ?? {}), [type]: suivants } }));
    } catch (e) {
      notifierErreur(e);
    }
  };

  const telephone = async (activer: boolean) => {
    setEnCours(true);
    try {
      if (activer) await activerPush(); else await desactiverPush();
      setAbonne(activer);
      notifierSucces(activer ? 'Notifications activées sur cet appareil' : 'Notifications désactivées sur cet appareil');
    } catch (e) {
      notifierErreur(e);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Card withBorder radius="lg" padding="lg" id="notifications" style={{ gridColumn: '1 / -1' }}>
      <Title order={3} size="h4" mb={4}>Mes notifications</Title>
      <Text size="sm" c="dimmed" mb="md">Choisissez, pour chaque événement, comment être prévenu. Tout décocher = ne pas être prévenu.</Text>

      <Group mb="md" gap="sm">
        <IconDeviceMobile size={20} />
        {!pushDisponible() ? (
          <Text size="sm" c="dimmed">Notifications sur le téléphone : installez d'abord l'application sur l'écran d'accueil.</Text>
        ) : abonne ? (
          <>
            <Text size="sm">Cet appareil reçoit les notifications.</Text>
            <Button size="xs" variant="subtle" color="gray" leftSection={<IconBellOff size={16} />} loading={enCours} onClick={() => telephone(false)}>Arrêter sur cet appareil</Button>
          </>
        ) : (
          <>
            <Text size="sm">Cet appareil ne reçoit pas encore les notifications.</Text>
            <Button size="xs" leftSection={<IconBell size={16} />} loading={enCours} onClick={() => telephone(true)}>Activer sur cet appareil</Button>
          </>
        )}
      </Group>
      {!profil?.email && (
        <Alert color="gray" mb="md">Pour recevoir des e-mails, indiquez votre adresse e-mail dans « Mes informations ».</Alert>
      )}

      <Table.ScrollContainer minWidth={520}>
        <Table verticalSpacing="xs" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Événement</Table.Th>
              {CANAUX.map((c) => <Table.Th key={c} ta="center" w={100}>{LIBELLE_CANAL[c]}</Table.Th>)}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {types.map((t) => (
              <Table.Tr key={t.type}>
                <Table.Td><Text size="sm">{t.libelle}</Text></Table.Td>
                {CANAUX.map((c) => (
                  <Table.Td key={c}>
                    <Stack align="center">
                      <Checkbox aria-label={`${t.libelle} : ${LIBELLE_CANAL[c]}`} checked={canaux(t.type).includes(c)}
                        disabled={c === 'email' && !profil?.email}
                        onChange={(e) => basculer(t.type, c, e.currentTarget.checked)} />
                    </Stack>
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
