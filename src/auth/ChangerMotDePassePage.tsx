import { useState } from 'react';
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/erreurs';
import { useAuth } from './AuthProvider';

export function ChangerMotDePassePage() {
  const { profil, rechargerProfil } = useAuth();
  const navigate = useNavigate();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const form = useForm({
    initialValues: { mdp: '', confirmation: '' },
    validate: {
      mdp: (v) => (v.length >= 8 ? null : 'Au moins 8 caractères'),
      confirmation: (v, val) => (v === val.mdp ? null : 'Les deux mots de passe ne sont pas identiques'),
    },
  });

  const valider = form.onSubmit(async ({ mdp }) => {
    setErreur(null);
    setEnvoi(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: mdp });
      if (error) throw error;
      await supabase.from('profils').update({ doit_changer_mdp: false }).eq('id', profil!.id);
      await rechargerProfil();
      navigate('/', { replace: true });
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  });

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder radius="lg" p="lg" w="100%" maw={420}>
        <form onSubmit={valider}>
          <Stack>
            <Title order={2} size="h3">Choisissez votre mot de passe</Title>
            <Text c="dimmed" size="sm">
              Pour votre sécurité, remplacez le mot de passe provisoire par un mot de passe que vous seul connaissez.
            </Text>
            {erreur && <Alert color="red">{erreur}</Alert>}
            <PasswordInput label="Nouveau mot de passe" size="md" autoComplete="new-password" {...form.getInputProps('mdp')} />
            <PasswordInput label="Confirmez le mot de passe" size="md" autoComplete="new-password" {...form.getInputProps('confirmation')} />
            <Button type="submit" size="md" loading={envoi}>Enregistrer</Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
