import { useEffect, useRef, useState } from 'react';
import { Alert, Anchor, Box, Button, Center, Group, Image, Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconHome } from '@tabler/icons-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { ACCES_REFUSE } from './RequireDroit';

const CLE_TURNSTILE = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const CLE_ESPACE = 'mes-loyers:espace-connexion';

interface Marque { nom: string; couleur: string; logo: string | null }

/** Nom, couleur et logo de l'espace (lien /e/<adresse>), gardés pour les connexions suivantes sur cet appareil. */
function useMarqueEspace(cle: string | undefined): Marque | null {
  const [marque, setMarque] = useState<Marque | null>(null);
  useEffect(() => {
    let memo: string | null = null;
    try { memo = cle ?? localStorage.getItem(CLE_ESPACE); } catch { memo = cle ?? null; }
    if (!memo) return;
    void (async () => {
      const { data } = await supabase.rpc('espace_public', { p_cle: memo });
      const e = data as { nom: string; couleur: string; logo_path: string | null } | null;
      if (!e) return;
      try { localStorage.setItem(CLE_ESPACE, memo!); } catch { /* stockage indisponible */ }
      const logo = e.logo_path ? (await supabase.storage.from('espaces').createSignedUrl(e.logo_path, 3600)).data?.signedUrl ?? null : null;
      setMarque({ nom: e.nom, couleur: e.couleur, logo });
    })();
  }, [cle]);
  return marque;
}

export function ConnexionPage() {
  const { session, seConnecter } = useAuth();
  const navigate = useNavigate();
  const lieu = useLocation();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const turnstile = useRef<TurnstileInstance>(null);
  const marque = useMarqueEspace(useParams().cle);
  const form = useForm({
    initialValues: { identifiant: '', motDePasse: '' },
    validate: {
      identifiant: (v) => (v.trim() ? null : 'Saisissez votre identifiant'),
      motDePasse: (v) => (v ? null : 'Saisissez votre mot de passe'),
    },
  });

  if (session) return <Navigate to="/" replace />;

  const valider = form.onSubmit(async ({ identifiant, motDePasse }) => {
    setErreur(null);
    setEnvoi(true);
    try {
      await seConnecter(identifiant, motDePasse, captcha ?? undefined);
      navigate((lieu.state as { depuis?: string })?.depuis ?? '/', { replace: true });
    } catch (e) {
      setErreur((e as Error).message);
      // Un jeton CAPTCHA ne sert qu'une fois
      setCaptcha(null);
      turnstile.current?.reset();
    } finally {
      setEnvoi(false);
    }
  });

  return (
    <Center mih="100vh" p="md">
      <Box w="100%" maw={420}>
        <Stack align="center" mb="lg" gap="xs">
          {marque?.logo ? <Image src={marque.logo} h={72} w="auto" fit="contain" alt="" /> : (
            <ThemeIcon size={64} radius="lg" color={marque?.couleur}>
              <IconHome size={36} />
            </ThemeIcon>
          )}
          <Title order={1} size="h2">{marque?.nom ?? 'Mes Loyers'}</Title>
          <Text c="dimmed">Connectez-vous pour gérer vos loyers</Text>
        </Stack>
        <Paper withBorder radius="lg" p="lg" shadow="sm">
          <form onSubmit={valider}>
            <Stack>
              {(lieu.state as Record<string, unknown> | null)?.[ACCES_REFUSE] === true && !erreur && (
                <Alert color="orange">Cette page n'est pas accessible avec votre compte : vous avez été déconnecté par sécurité.</Alert>
              )}
              {erreur && <Alert color="red">{erreur}</Alert>}
              <TextInput
                label="Identifiant ou e-mail"
                autoComplete="username"
                autoCapitalize="none"
                size="md"
                {...form.getInputProps('identifiant')}
              />
              <PasswordInput
                label="Mot de passe"
                autoComplete="current-password"
                size="md"
                {...form.getInputProps('motDePasse')}
              />
              {CLE_TURNSTILE && (
                <Center>
                  <Turnstile
                    ref={turnstile}
                    siteKey={CLE_TURNSTILE}
                    options={{ language: 'fr', theme: 'light', size: 'flexible' }}
                    onSuccess={setCaptcha}
                    onExpire={() => setCaptcha(null)}
                    onError={() => setCaptcha(null)}
                  />
                </Center>
              )}
              <Button type="submit" size="md" loading={envoi} fullWidth disabled={!!CLE_TURNSTILE && !captcha} color={marque?.couleur}>
                Se connecter
              </Button>
            </Stack>
          </form>
        </Paper>
        <Text size="sm" ta="center" mt="md">
          <Anchor component={Link} to="/mot-de-passe-oublie">Mot de passe oublié ?</Anchor>
        </Text>
        <Group justify="center" gap="lg" mt="sm">
          <Anchor component={Link} to="/bienvenue" size="sm">Découvrir Mes Loyers</Anchor>
          <Anchor component={Link} to="/demande-acces" size="sm">Demander un accès</Anchor>
          <Anchor component={Link} to="/installer" size="sm">Installer</Anchor>
        </Group>
      </Box>
    </Center>
  );
}
