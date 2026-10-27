import { useState } from 'react';
import { Alert, Box, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconHome } from '@tabler/icons-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from './AuthProvider';

export function ConnexionPage() {
  const { session, seConnecter } = useAuth();
  const navigate = useNavigate();
  const lieu = useLocation();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
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
      await seConnecter(identifiant, motDePasse);
      navigate((lieu.state as { depuis?: string })?.depuis ?? '/', { replace: true });
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  });

  return (
    <Center mih="100vh" p="md">
      <Box w="100%" maw={420}>
        <Stack align="center" mb="lg" gap="xs">
          <ThemeIcon size={64} radius="lg">
            <IconHome size={36} />
          </ThemeIcon>
          <Title order={1} size="h2">Mes Loyers</Title>
          <Text c="dimmed">Connectez-vous pour gérer vos loyers</Text>
        </Stack>
        <Paper withBorder radius="lg" p="lg" shadow="sm">
          <form onSubmit={valider}>
            <Stack>
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
              <Button type="submit" size="md" loading={envoi} fullWidth>
                Se connecter
              </Button>
            </Stack>
          </form>
        </Paper>
        <Text size="sm" c="dimmed" ta="center" mt="md">
          Mot de passe oublié ? Contactez votre propriétaire ou l'administrateur.
        </Text>
      </Box>
    </Center>
  );
}
