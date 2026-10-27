import { useMemo, useState } from 'react';
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPlayerPlay } from '@tabler/icons-react';
import { Link } from 'react-router';
import { LecteurDemo, type ExportVideo } from '@/features/apprendre/LecteurDemo';
import { PublicLayout } from './PublicLayout';
import { PRESENTATION } from './presentation';

// Échanges avec le script `npm run video` (navigateur automatisé) : durées imposées, début de chaque étape, fin.
declare global {
  interface Window {
    __durees?: number[];
    __debuts?: number[];
    __fini?: boolean;
  }
}

/** Vidéo de présentation (2 à 3 minutes), jouée dans l'application ; `?export=1` pour l'enregistrement en MP4. */
export function PresentationPage() {
  const mobile = useMediaQuery('(max-width: 48em)');
  const enExport = new URLSearchParams(window.location.search).has('export');
  const [lancee, setLancee] = useState(enExport);
  const [cle, setCle] = useState(0);

  const exportVideo = useMemo<ExportVideo | undefined>(() => (enExport ? {
    durees: window.__durees ?? [],
    surEtape: (i) => { (window.__debuts ??= [])[i] = Date.now(); },
    surFin: () => { window.__fini = true; },
  } : undefined), [enExport]);

  const lecteur = (
    <LecteurDemo key={cle} demo={PRESENTATION} hauteur={enExport ? 600 : mobile ? 520 : 480}
      exportVideo={exportVideo} onTermine={() => setLancee(false)} />
  );

  if (enExport) return <div style={{ width: 1280, padding: 24, background: 'white' }}>{lecteur}</div>;

  return (
    <PublicLayout>
      <Container size="md" py="xl">
        <Title order={1} size="h2" mb={4}>Présentation</Title>
        <Text c="dimmed" mb="lg">Deux minutes pour découvrir Mes Loyers, avec la voix. Les sous-titres restent affichés.</Text>
        {lancee ? lecteur : (
          <Stack align="center" py={80} style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 16 }}>
            <Button size="xl" radius="xl" leftSection={<IconPlayerPlay size={26} />} onClick={() => { setCle(cle + 1); setLancee(true); }}>
              Lancer la présentation
            </Button>
            <Text size="sm" c="dimmed">Pensez à monter le son.</Text>
          </Stack>
        )}
        <Group justify="center" mt="xl">
          <Button component={Link} to="/demande-acces">Demander un accès</Button>
          <Button variant="default" component={Link} to="/bienvenue">Retour à l'accueil</Button>
        </Group>
      </Container>
    </PublicLayout>
  );
}
