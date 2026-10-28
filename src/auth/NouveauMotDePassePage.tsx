import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Center, Loader, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/erreurs';
import { useAuth } from './AuthProvider';

/** Page ouverte par le lien « Mot de passe oublié » reçu par e-mail : ouvre la session, puis fait choisir le mot de passe. */
export function NouveauMotDePassePage() {
  const { rechargerProfil } = useAuth();
  const navigate = useNavigate();
  const [etat, setEtat] = useState<'verification' | 'pret' | 'invalide'>('verification');
  const [userId, setUserId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const verifie = useRef(false);
  const form = useForm({
    initialValues: { mdp: '', confirmation: '' },
    validate: {
      mdp: (v) => (v.length >= 8 ? null : 'Au moins 8 caractères'),
      confirmation: (v, val) => (v === val.mdp ? null : 'Les deux mots de passe ne sont pas identiques'),
    },
  });

  useEffect(() => {
    if (verifie.current) return; // le lien ne sert qu'une fois
    verifie.current = true;
    const jeton = new URLSearchParams(window.location.search).get('jeton');
    window.history.replaceState(null, '', window.location.pathname);
    if (!jeton) { setEtat('invalide'); return; }
    supabase.auth.verifyOtp({ token_hash: jeton, type: 'recovery' }).then(({ data, error }) => {
      if (error || !data.user) { setEtat('invalide'); return; }
      setUserId(data.user.id);
      setEtat('pret');
    });
  }, []);

  const valider = form.onSubmit(async ({ mdp }) => {
    setErreur(null);
    setEnvoi(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: mdp });
      if (error) throw error;
      await supabase.from('profils').update({ doit_changer_mdp: false }).eq('id', userId!);
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
        {etat === 'verification' ? (
          <Stack align="center" py="lg"><Loader /><Text c="dimmed">Vérification du lien…</Text></Stack>
        ) : etat === 'invalide' ? (
          <Stack>
            <Title order={2} size="h3">Lien expiré</Title>
            <Text>Ce lien n'est plus valable : il ne sert qu'une fois, pendant 1 heure. Faites une nouvelle demande.</Text>
            <Button component={Link} to="/mot-de-passe-oublie">Nouvelle demande</Button>
            <Button variant="default" component={Link} to="/connexion">Retour à la connexion</Button>
          </Stack>
        ) : (
          <form onSubmit={valider}>
            <Stack>
              <Title order={2} size="h3">Choisissez un nouveau mot de passe</Title>
              {erreur && <Alert color="red">{erreur}</Alert>}
              <PasswordInput label="Nouveau mot de passe" size="md" autoComplete="new-password" data-autofocus {...form.getInputProps('mdp')} />
              <PasswordInput label="Confirmez le mot de passe" size="md" autoComplete="new-password" {...form.getInputProps('confirmation')} />
              <Button type="submit" size="md" loading={envoi}>Enregistrer et me connecter</Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Center>
  );
}
