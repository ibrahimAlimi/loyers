import { useRef, useState } from 'react';
import { Alert, Anchor, Button, Card, Center, Container, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconMailCheck } from '@tabler/icons-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Link } from 'react-router';
import { appelerFonction } from '@/lib/fonctions';
import { PublicLayout } from '@/features/vitrine/PublicLayout';

const CLE_TURNSTILE = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** Mot de passe oublié : lien par e-mail si le compte en a un, sinon le propriétaire ou l'administrateur est prévenu. */
export function MotDePasseOubliePage() {
  const [envoyee, setEnvoyee] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const turnstile = useRef<TurnstileInstance>(null);
  const form = useForm({
    initialValues: { identifiant: '', site_web: '' },
    validate: { identifiant: (v) => (v.trim().length >= 3 ? null : 'Saisissez votre identifiant ou votre e-mail') },
  });

  const valider = form.onSubmit(async (v) => {
    setErreur(null);
    setEnvoi(true);
    try {
      await appelerFonction('mot-de-passe-oublie', { ...v, identifiant: v.identifiant.trim(), captcha });
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
      <Container size="xs" py="xl">
        {envoyee ? (
          <Card withBorder radius="lg" padding="xl">
            <Stack align="center" ta="center">
              <IconMailCheck size={56} color="var(--statut-ok)" />
              <Title order={2} size="h3">Demande envoyée</Title>
              <Text>
                Si votre compte a une adresse e-mail, vous allez recevoir un lien pour choisir un nouveau mot de passe
                (pensez à regarder dans les courriers indésirables).
              </Text>
              <Text c="dimmed" size="sm">
                Sinon, votre propriétaire (ou l'administrateur) a été prévenu : il vous donnera un mot de passe provisoire.
              </Text>
              <Button variant="light" component={Link} to="/connexion">Retour à la connexion</Button>
            </Stack>
          </Card>
        ) : (
          <>
            <Title order={1} size="h2" mb={4}>Mot de passe oublié</Title>
            <Text c="dimmed" mb="lg">Saisissez votre identifiant de connexion. Nous vous aidons à choisir un nouveau mot de passe.</Text>
            <Card withBorder radius="lg" padding="lg">
              <form onSubmit={valider}>
                <Stack>
                  {erreur && <Alert color="red">{erreur}</Alert>}
                  <TextInput label="Identifiant ou e-mail" size="md" autoComplete="username" autoCapitalize="none" data-autofocus
                    {...form.getInputProps('identifiant')} />
                  {/* Champ piège pour les robots : invisible et ignoré par les lecteurs d'écran */}
                  <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" {...form.getInputProps('site_web')}
                    style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
                  {CLE_TURNSTILE && (
                    <Center>
                      <Turnstile ref={turnstile} siteKey={CLE_TURNSTILE} options={{ language: 'fr', theme: 'light', size: 'flexible' }}
                        onSuccess={setCaptcha} onExpire={() => setCaptcha(null)} onError={() => setCaptcha(null)} />
                    </Center>
                  )}
                  <Button type="submit" size="md" loading={envoi} disabled={!!CLE_TURNSTILE && !captcha}>Envoyer</Button>
                  <Anchor component={Link} to="/connexion" size="sm" ta="center">Retour à la connexion</Anchor>
                </Stack>
              </form>
            </Card>
          </>
        )}
      </Container>
    </PublicLayout>
  );
}
