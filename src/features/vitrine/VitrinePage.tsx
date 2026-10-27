import { Badge, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  IconBrandWhatsapp, IconCash, IconChartBar, IconDeviceMobile, IconPlayerPlay, IconQrcode, IconShieldLock, IconUsersGroup,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { PublicLayout } from './PublicLayout';
import { FORMULES } from './formules';

const AVANTAGES = [
  { icone: IconCash, titre: 'Encaisser en 4 étapes', texte: 'Le locataire, le montant, le mode de paiement, et c’est fait. Espèces, MTN, Moov ou Celtiis.' },
  { icone: IconBrandWhatsapp, titre: 'Le reçu sur WhatsApp', texte: 'Un reçu professionnel, à vos couleurs, envoyé en un geste au locataire.' },
  { icone: IconQrcode, titre: 'Des reçus vérifiables', texte: 'Chaque reçu porte un code QR : impossible de le falsifier sans que cela se voie.' },
  { icone: IconChartBar, titre: 'Qui doit combien', texte: 'Les retards, l’encaissé, l’occupation : vos chiffres en clair, avec des relances prêtes.' },
  { icone: IconUsersGroup, titre: 'Vos gestionnaires', texte: 'Confiez des maisons : vous êtes prévenu de chaque encaissement, rien ne s’efface sans vous.' },
  { icone: IconDeviceMobile, titre: 'Partout', texte: 'Sur le téléphone et sur l’ordinateur, avec les mêmes données. S’installe comme une application.' },
  { icone: IconShieldLock, titre: 'Sécurisé', texte: 'Double authentification, sauvegardes, journal de toutes les actions et corbeille.' },
];

/** Accueil public : présentation, avantages, formules et prix, installer, demander un accès, se connecter. */
export function VitrinePage() {
  return (
    <PublicLayout>
      <Container size="lg" py={48}>
        <Stack align="center" ta="center" gap="md" maw={720} mx="auto">
          <Badge size="lg" variant="light">Gestion des loyers, au Bénin</Badge>
          <Title order={1} fz={{ base: 32, sm: 44 }} lh={1.15}>Vos loyers, simplement.</Title>
          <Text size="lg" c="dimmed">
            Fini les cahiers et les logiciels coûteux : encaissez, envoyez le reçu sur WhatsApp et sachez à tout moment qui doit combien.
          </Text>
          <Group justify="center" mt="sm">
            <Button size="lg" component={Link} to="/demande-acces">Demander un accès</Button>
            <Button size="lg" variant="default" component={Link} to="/connexion">Se connecter</Button>
          </Group>
          <Button variant="subtle" leftSection={<IconPlayerPlay size={18} />} component={Link} to="/presentation">
            Voir la présentation (2 minutes)
          </Button>
        </Stack>
      </Container>

      <Container size="lg" pb={48}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {AVANTAGES.map((a) => (
            <Card key={a.titre} withBorder radius="lg" padding="lg">
              <ThemeIcon size={44} radius="md" variant="light" mb="sm"><a.icone size={24} /></ThemeIcon>
              <Text fw={800} mb={4}>{a.titre}</Text>
              <Text size="sm" c="dimmed">{a.texte}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <Container size="lg" pb={48} id="formules">
        <Title order={2} ta="center" mb={4}>Formules et prix</Title>
        <Text ta="center" c="dimmed" mb="lg">Un prix selon le nombre de logements. Commencez gratuitement.</Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {FORMULES.map((f) => (
            <Card key={f.cle} withBorder radius="lg" padding="lg"
              style={f.misEnAvant ? { borderColor: 'var(--mantine-color-espace-filled)', borderWidth: 2 } : undefined}>
              {f.misEnAvant && <Badge mb="xs">Le plus choisi</Badge>}
              <Text fw={800} size="lg">{f.nom}</Text>
              <Text size="sm" c="dimmed">{f.logements}</Text>
              <Text fw={800} size="xl" my="sm" c="espace">{f.prix}</Text>
              <Text size="sm">{f.detail}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <Container size="lg" pb={64}>
        <Card withBorder radius="lg" padding="xl" bg="var(--mantine-color-espace-light)">
          <Group justify="space-between" gap="md">
            <div>
              <Text fw={800} size="lg">Installez Mes Loyers sur votre téléphone</Text>
              <Text c="dimmed">Une icône sur l’écran d’accueil, comme les autres applications. Gratuit et sans magasin d’applications.</Text>
            </div>
            <Button component={Link} to="/installer" leftSection={<IconDeviceMobile size={18} />}>Comment faire</Button>
          </Group>
        </Card>
      </Container>
    </PublicLayout>
  );
}
