import { useRef, useState } from 'react';
import { Alert, Button, Card, Center, Container, NumberInput, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCircleCheck } from '@tabler/icons-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Link } from 'react-router';
import { appelerFonction } from '@/lib/fonctions';
import { PublicLayout } from './PublicLayout';

const CLE_TURNSTILE = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** Demande d'accès d'un propriétaire : elle arrive chez l'administrateur, qui crée l'espace. */
export function DemandeAccesPage() {
  const [envoyee, setEnvoyee] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const turnstile = useRef<TurnstileInstance>(null);
  const form = useForm({
    initialValues: { nom: '', telephone: '', email: '', ville: '', nb_logements: '' as number | string, message: '', site_web: '' },
    validate: {
      nom: (v) => (v.trim().length >= 2 ? null : 'Indiquez votre nom'),
      telephone: (v) => (v.replace(/\D/g, '').length >= 8 ? null : 'Indiquez un numéro de téléphone valide'),
      email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "L'adresse e-mail n'est pas valide"),
    },
  });

  const valider = form.onSubmit(async (v) => {
    setErreur(null);
    setEnvoi(true);
    try {
      await appelerFonction('demande-acces', { ...v, captcha });
      setEnvoyee(true);
    } catch (e) {
      setErreur((e as Error).message);
      setCaptcha(null);
      turnstile.current?.reset();
    } finally {
      setEnvoi(false);
    }
  });

  return (
    <PublicLayout>
      <Container size="sm" py="xl">
        {envoyee ? (
          <Card withBorder radius="lg" padding="xl">
            <Stack align="center" ta="center">
              <IconCircleCheck size={56} color="var(--statut-ok)" />
              <Title order={2}>Demande envoyée</Title>
              <Text>Merci ! Nous vous contactons très vite au <b>{form.values.telephone}</b> pour ouvrir votre espace.</Text>
              <Button variant="light" component={Link} to="/bienvenue">Retour à l'accueil</Button>
            </Stack>
          </Card>
        ) : (
          <>
            <Title order={1} size="h2" mb={4}>Demander un accès</Title>
            <Text c="dimmed" mb="lg">Laissez vos coordonnées : nous créons votre espace et vous transmettons vos accès.</Text>
            <Card withBorder radius="lg" padding="lg">
              <form onSubmit={valider}>
                <Stack>
                  {erreur && <Alert color="red">{erreur}</Alert>}
                  <TextInput label="Votre nom" autoComplete="name" {...form.getInputProps('nom')} />
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput label="Téléphone (WhatsApp de préférence)" inputMode="tel" autoComplete="tel" {...form.getInputProps('telephone')} />
                    <TextInput label="E-mail (facultatif)" inputMode="email" autoComplete="email" {...form.getInputProps('email')} />
                    <TextInput label="Ville" {...form.getInputProps('ville')} />
                    <NumberInput label="Nombre de logements (environ)" min={1} max={10000} allowDecimal={false} {...form.getInputProps('nb_logements')} />
                  </SimpleGrid>
                  <Textarea label="Un message (facultatif)" autosize minRows={2} maxLength={1000} {...form.getInputProps('message')} />
                  {/* Champ piège pour les robots : invisible et ignoré par les lecteurs d'écran */}
                  <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" {...form.getInputProps('site_web')}
                    style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
                  {CLE_TURNSTILE && (
                    <Center>
                      <Turnstile ref={turnstile} siteKey={CLE_TURNSTILE} options={{ language: 'fr', theme: 'light', size: 'flexible' }}
                        onSuccess={setCaptcha} onExpire={() => setCaptcha(null)} onError={() => setCaptcha(null)} />
                    </Center>
                  )}
                  <Button type="submit" size="md" loading={envoi} disabled={!!CLE_TURNSTILE && !captcha}>Envoyer ma demande</Button>
                  <Text size="xs" c="dimmed">
                    Vos coordonnées servent uniquement à vous recontacter. Voir les <Link to="/conditions">conditions et la confidentialité</Link>.
                  </Text>
                </Stack>
              </form>
            </Card>
          </>
        )}
      </Container>
    </PublicLayout>
  );
}
