import type { ReactNode } from 'react';
import { Badge, Box, Button, Card, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  IconBook2, IconBuildingEstate, IconCash, IconCheck, IconCloudLock, IconDeviceDesktop,
  IconDeviceMobile, IconHistory, IconHome, IconPresentation, IconQrcode, IconShieldLock, IconTrash, IconUsers,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { Demo } from '@/features/apprendre/LecteurDemo';
import { Bulle, Chiffre, Ecran, Ligne, Retard } from '@/features/apprendre/scenes';
import { FORMULES } from './formules';

/** Une diapositive : un titre et quelques points à gauche, un écran de téléphone à droite. */
function Diapo({ titre, sous, points, ecran, id }: { titre: string; sous?: string; points?: [Icon, string][]; ecran?: ReactNode; id?: string }) {
  return (
    <Group h="100%" p={{ base: 'md', sm: 'xl' }} gap="xl" wrap="nowrap" align="center" justify="center" bg="white">
      <Stack gap="sm" maw={420} style={{ flex: 1 }} data-demo={id}>
        <Title order={2} fz={{ base: 22, sm: 30 }} lh={1.2}>{titre}</Title>
        {sous && <Text c="dimmed" size="lg">{sous}</Text>}
        {points?.map(([I, t]) => (
          <Group key={t} gap="sm" wrap="nowrap"><ThemeIcon variant="light" radius="xl"><I size={18} /></ThemeIcon><Text>{t}</Text></Group>
        ))}
      </Stack>
      {ecran && (
        <Paper visibleFrom="sm" withBorder radius={24} shadow="lg" w={250} h={430} p={6} style={{ overflow: 'hidden', flexShrink: 0, borderWidth: 6, borderColor: '#1f2937' }}>
          <Box h="100%" style={{ borderRadius: 16, overflow: 'hidden' }}>{ecran}</Box>
        </Paper>
      )}
    </Group>
  );
}

const telAccueil = (
  <Ecran titre="Immobilier Démo">
    <SimpleGrid cols={2} spacing={6}>
      <Chiffre libelle="Encaissé" valeur="420 000" couleur="espace" />
      <Chiffre libelle="Reste" valeur="140 000" couleur="orange.8" />
    </SimpleGrid>
    <Button data-demo="encaisser" leftSection={<IconCash size={16} />} fullWidth>Encaisser un loyer</Button>
    <Ligne titre="Koffi Houngbo" sous="Résidence Arouna" droite={<Retard mois={2} />} />
    <Ligne titre="Awa Sanni" sous="Résidence Arouna" droite={<Retard mois={0} />} />
  </Ecran>
);

export const PRESENTATION: Demo = {
  id: 'presentation',
  titre: 'Présentation de Mes Loyers',
  description: 'Deux minutes pour tout comprendre.',
  icone: IconPresentation,
  scenes: {
    titre: () => (
      <Stack h="100%" align="center" justify="center" gap="md" bg="espace" c="white" ta="center" p="xl">
        <ThemeIcon size={88} radius="xl" color="white" c="espace"><IconHome size={52} /></ThemeIcon>
        <Title order={1} fz={{ base: 34, sm: 48 }} data-demo="logo">Mes Loyers</Title>
        <Text size="xl">La gestion de vos loyers, simplement.</Text>
      </Stack>
    ),
    probleme: () => (
      <Diapo id="probleme" titre="Des cahiers… ou des logiciels coûteux" points={[
        [IconBook2, 'Des reçus perdus, des calculs à refaire'], [IconCash, 'Des logiciels chers et compliqués'],
        [IconUsers, 'Qui a payé ? Qui doit encore ?'],
      ]} />
    ),
    solution: () => (
      <Diapo id="solution" titre="Tout au même endroit" points={[
        [IconBuildingEstate, 'Vos maisons et vos logements'], [IconUsers, 'Vos locataires et leurs baux'], [IconCash, 'Vos encaissements et vos reçus'],
      ]} ecran={telAccueil} />
    ),
    encaisser: () => (
      <Diapo titre="Encaisser en 4 étapes" sous="Le locataire, le montant, le mode, c’est fait." ecran={telAccueil} />
    ),
    whatsapp: () => (
      <Diapo titre="Le reçu sur WhatsApp" sous="Professionnel, à vos couleurs, envoyé en un geste." ecran={
        <Stack h="100%" gap="xs" p="xs" style={{ background: '#efeae2' }}>
          <Group h={36} px="xs" bg="#075e54" c="white" style={{ borderRadius: 8 }}><Text fw={700} size="xs">Koffi Houngbo</Text></Group>
          <Bulle droite><Text size="xs">🧾 Recu-DEM-2026-000124.jpg</Text></Bulle>
          <Bulle droite><Text size="xs" data-demo="message">Bonjour Koffi, voici votre reçu de loyer pour septembre 2026. Merci.</Text></Bulle>
          <Bulle><Text size="xs">Merci beaucoup 🙏</Text></Bulle>
        </Stack>
      } />
    ),
    chiffres: () => (
      <Diapo titre="Vos chiffres, en clair" points={[
        [IconCheck, 'Encaissé et reste à percevoir'], [IconCheck, 'Qui doit combien, et depuis quand'], [IconCheck, 'Relance WhatsApp prête à envoyer'],
      ]} ecran={
        <Ecran titre="Statistiques">
          <Chiffre id="encaisse" libelle="💰 Encaissé cette année" valeur="3 150 000 FCFA" couleur="espace" />
          <Chiffre libelle="⏳ Reste à percevoir" valeur="140 000 FCFA" couleur="orange.8" />
          <Ligne titre="Koffi Houngbo" sous="2 mois · 140 000 FCFA" droite={<Badge color="green" variant="light">Relancer</Badge>} />
        </Ecran>
      } />
    ),
    gestionnaires: () => (
      <Diapo titre="Vos gestionnaires, sous contrôle" sous="Vous êtes prévenu de chaque encaissement." ecran={
        <Ecran titre="Notifications">
          <Card data-demo="notif" withBorder radius="md" bg="var(--mantine-color-espace-light)" p="xs">
            <Text fw={700} size="xs">Paiement encaissé par Sylvie</Text>
            <Text size="xs" c="dimmed">45 000 FCFA de Awa Sanni</Text>
          </Card>
          <Card withBorder radius="md" p="xs">
            <Text fw={700} size="xs">Demande d’annulation par Sylvie</Text>
            <Group gap={4} mt={4}><Badge color="green">Accepter</Badge><Badge color="red">Refuser</Badge></Group>
          </Card>
        </Ecran>
      } />
    ),
    qr: () => (
      <Diapo titre="Des reçus vérifiables" sous="Un code QR sur chaque reçu : on scanne, on sait s’il est authentique." ecran={
        <Stack h="100%" align="center" justify="center" gap="sm" bg="white" p="md">
          <IconQrcode size={110} data-demo="qr" />
          <Badge size="lg" color="green" leftSection={<IconCheck size={14} />}>Reçu authentique</Badge>
          <Text size="xs" c="dimmed" ta="center">DEM-2026-000124 · 70 000 FCFA · K. H.</Text>
        </Stack>
      } />
    ),
    partout: () => (
      <Stack h="100%" align="center" justify="center" gap="lg" bg="white" p="xl" ta="center">
        <Group gap="xl" data-demo="appareils">
          <ThemeIcon size={96} radius="xl" variant="light"><IconDeviceMobile size={60} /></ThemeIcon>
          <ThemeIcon size={96} radius="xl" variant="light"><IconDeviceDesktop size={60} /></ThemeIcon>
        </Group>
        <Title order={2}>Sur le téléphone et l’ordinateur</Title>
        <Text c="dimmed" size="lg">Les mêmes données partout. S’installe comme une application.</Text>
      </Stack>
    ),
    securite: () => (
      <Diapo id="securite" titre="Vos données protégées" points={[
        [IconShieldLock, 'Double authentification'], [IconCloudLock, 'Sauvegardes automatiques'],
        [IconHistory, 'Journal de toutes les actions'], [IconTrash, 'Une corbeille pour ne rien perdre'],
      ]} />
    ),
    formules: () => (
      <Stack h="100%" justify="center" gap="md" bg="white" p={{ base: 'md', sm: 'xl' }}>
        <Title order={2} ta="center">Formules et prix</Title>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" data-demo="formules">
          {FORMULES.map((f) => (
            <Card key={f.cle} withBorder radius="lg" p="sm" ta="center">
              <Text fw={800}>{f.nom}</Text>
              <Text size="xs" c="dimmed">{f.logements}</Text>
              <Text fw={800} c="espace" mt={4}>{f.prix}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    ),
    fin: () => (
      <Stack h="100%" align="center" justify="center" gap="md" bg="espace" c="white" ta="center" p="xl">
        <Title order={1} fz={{ base: 30, sm: 42 }}>Demandez votre accès</Title>
        <Text size="xl" data-demo="adresse">{typeof window !== 'undefined' ? window.location.host : ''}</Text>
      </Stack>
    ),
  },
  etapes: [
    { scene: 'titre', doigt: 'logo', geste: 'montrer' },
    { scene: 'probleme' },
    { scene: 'solution', doigt: 'solution', geste: 'montrer' },
    { scene: 'encaisser', doigt: 'encaisser', geste: 'toucher' },
    { scene: 'whatsapp', doigt: 'message', geste: 'montrer' },
    { scene: 'chiffres', doigt: 'encaisse', geste: 'montrer' },
    { scene: 'gestionnaires', doigt: 'notif', geste: 'montrer' },
    { scene: 'qr', doigt: 'qr', geste: 'montrer' },
    { scene: 'partout' },
    { scene: 'securite' },
    { scene: 'formules', doigt: 'formules', geste: 'montrer' },
    { scene: 'fin' },
  ],
};
