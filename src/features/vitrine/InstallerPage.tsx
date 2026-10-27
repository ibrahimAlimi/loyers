import { useEffect, useState } from 'react';
import { Alert, Button, Card, Container, List, Modal, Tabs, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple, IconCircleCheck, IconDeviceDesktop, IconDownload, IconPlayerPlay } from '@tabler/icons-react';
import { estInstallee, installationPossible, installer, surChangementInstallation } from '@/lib/installation';
import { demo } from '@/features/apprendre/demos';
import { LecteurDemo } from '@/features/apprendre/LecteurDemo';
import { PublicLayout } from './PublicLayout';

const systeme = () => {
  const ua = navigator.userAgent;
  return /iPhone|iPad/i.test(ua) ? 'iphone' : /Android/i.test(ua) ? 'android' : 'ordinateur';
};

/** Tutoriel d'installation : Android, iPhone, ordinateur. Accessible avec ou sans connexion. */
export function InstallerPage() {
  const [possible, setPossible] = useState(installationPossible);
  const [deja, setDeja] = useState(estInstallee);
  const [voirDemo, setVoirDemo] = useState(false);
  useEffect(() => surChangementInstallation(() => { setPossible(installationPossible()); setDeja(estInstallee()); }), []);
  const d = demo('installer');

  return (
    <PublicLayout>
      <Container size="sm" py="xl">
        <Title order={1} size="h2" mb={4}>Installer l'application</Title>
        <Text c="dimmed" mb="lg">Une icône sur l'écran d'accueil, comme les autres applications. Gratuit, sans magasin d'applications.</Text>

        {deja ? (
          <Alert color="green" icon={<IconCircleCheck />} mb="lg">L'application est déjà installée sur cet appareil.</Alert>
        ) : possible && (
          <Card withBorder radius="lg" padding="lg" mb="lg" bg="var(--mantine-color-espace-light)">
            <Text fw={700} mb="xs">Votre appareil peut l'installer tout de suite.</Text>
            <Button leftSection={<IconDownload size={18} />} onClick={() => void installer()}>Installer maintenant</Button>
          </Card>
        )}

        <Tabs defaultValue={systeme()} variant="outline" radius="md">
          <Tabs.List grow>
            <Tabs.Tab value="android" leftSection={<IconBrandAndroid size={18} />}>Android</Tabs.Tab>
            <Tabs.Tab value="iphone" leftSection={<IconBrandApple size={18} />}>iPhone</Tabs.Tab>
            <Tabs.Tab value="ordinateur" leftSection={<IconDeviceDesktop size={18} />}>Ordinateur</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="android" pt="md">
            <Etapes etapes={[
              'Ouvrez l’adresse de l’application dans Chrome.',
              'Touchez les trois points ⋮ en haut à droite.',
              'Touchez « Ajouter à l’écran d’accueil » (ou « Installer l’application »).',
              'Confirmez : l’icône Mes Loyers apparaît sur votre écran d’accueil.',
            ]} />
          </Tabs.Panel>
          <Tabs.Panel value="iphone" pt="md">
            <Etapes etapes={[
              'Ouvrez l’adresse de l’application dans Safari (pas dans un autre navigateur).',
              'Touchez le bouton Partager (le carré avec une flèche vers le haut), en bas de l’écran.',
              'Faites défiler et touchez « Sur l’écran d’accueil ».',
              'Touchez « Ajouter » en haut à droite : l’icône apparaît sur votre écran d’accueil.',
            ]} />
          </Tabs.Panel>
          <Tabs.Panel value="ordinateur" pt="md">
            <Etapes etapes={[
              'Ouvrez l’adresse de l’application dans Chrome ou Edge.',
              'Cliquez sur l’icône d’installation à droite de la barre d’adresse (un écran avec une flèche).',
              'Cliquez sur « Installer » : l’application s’ouvre dans sa propre fenêtre.',
              'Elle est ensuite dans le menu Démarrer (Windows) ou le Launchpad (Mac).',
            ]} />
          </Tabs.Panel>
        </Tabs>

        {d && (
          <Button mt="lg" variant="light" leftSection={<IconPlayerPlay size={18} />} onClick={() => setVoirDemo(true)}>
            Voir la démonstration
          </Button>
        )}
        <Modal opened={voirDemo} onClose={() => setVoirDemo(false)} title={d?.titre} radius="lg" centered>
          {d && voirDemo && <LecteurDemo demo={d} onTermine={() => setVoirDemo(false)} />}
        </Modal>
      </Container>
    </PublicLayout>
  );
}

function Etapes({ etapes }: { etapes: string[] }) {
  return (
    <List spacing="md" size="md" center icon={null} type="ordered">
      {etapes.map((e, i) => (
        <List.Item key={e} icon={<ThemeIcon radius="xl" size={28}>{i + 1}</ThemeIcon>}>{e}</List.Item>
      ))}
    </List>
  );
}
