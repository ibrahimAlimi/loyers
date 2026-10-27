import { Button, Card, Group, Image, PasswordInput, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { envoyerFichier, useUrlFichier } from '@/lib/fichiers';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { LIBELLE_ROLE } from '@/lib/format';
import { useAuth } from '@/auth/AuthProvider';
import { useEspace } from '@/espace/EspaceProvider';
import { PageEntete } from '@/layout/PageEntete';
import { ImageUpload } from '@/ui/ImageUpload';
import { SignaturePad } from '@/ui/SignaturePad';

export function ProfilPage() {
  const { profil, rechargerProfil } = useAuth();
  const { role } = useEspace();
  const signature = useUrlFichier('profils', profil?.signature_path);
  const infos = useForm({
    initialValues: { nom_complet: profil?.nom_complet ?? '', telephone: profil?.telephone ?? '', email: profil?.email ?? '' },
    validate: { nom_complet: (v) => (v.trim() ? null : 'Indiquez votre nom') },
  });
  const mdp = useForm({
    initialValues: { mdp: '', confirmation: '' },
    validate: {
      mdp: (v) => (v.length >= 8 ? null : 'Au moins 8 caractères'),
      confirmation: (v, val) => (v === val.mdp ? null : 'Les deux mots de passe ne sont pas identiques'),
    },
  });

  const enregistrer = useMutation({
    mutationFn: async (v: typeof infos.values) => {
      const { error } = await supabase.from('profils').update({
        nom_complet: v.nom_complet.trim(), telephone: v.telephone.trim() || null, email: v.email.trim().toLowerCase() || null,
      }).eq('id', profil!.id);
      if (error) throw error;
      await rechargerProfil();
    },
    onSuccess: () => notifierSucces('Profil enregistré'),
    onError: notifierErreur,
  });
  const changerMdp = useMutation({
    mutationFn: async (m: string) => {
      const { error } = await supabase.auth.updateUser({ password: m });
      if (error) throw error;
    },
    onSuccess: () => { notifierSucces('Mot de passe modifié'); mdp.reset(); },
    onError: notifierErreur,
  });
  const envoyerSignature = useMutation({
    mutationFn: async (blob: Blob) => {
      const chemin = await envoyerFichier('profils', `${profil!.id}/signature.png`, blob);
      const { error } = await supabase.from('profils').update({ signature_path: chemin }).eq('id', profil!.id);
      if (error) throw error;
      await rechargerProfil();
    },
    onSuccess: () => notifierSucces('Signature enregistrée'),
    onError: notifierErreur,
  });

  return (
    <>
      <PageEntete titre="Mon profil" sousTitre={`Identifiant : ${profil?.identifiant} · ${LIBELLE_ROLE[role ?? ''] ?? ''}`} />
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card withBorder radius="lg" padding="lg">
          <Title order={3} size="h4" mb="sm">Mes informations</Title>
          <form onSubmit={infos.onSubmit((v) => enregistrer.mutate(v))}>
            <Stack>
              <TextInput label="Nom complet" {...infos.getInputProps('nom_complet')} />
              <TextInput label="Téléphone" inputMode="tel" {...infos.getInputProps('telephone')} />
              <TextInput label="E-mail (facultatif, permet aussi de se connecter)" inputMode="email" {...infos.getInputProps('email')} />
              <Group justify="flex-end"><Button type="submit" loading={enregistrer.isPending}>Enregistrer</Button></Group>
            </Stack>
          </form>
        </Card>
        <Card withBorder radius="lg" padding="lg">
          <Title order={3} size="h4" mb="sm">Changer mon mot de passe</Title>
          <form onSubmit={mdp.onSubmit((v) => changerMdp.mutate(v.mdp))}>
            <Stack>
              <PasswordInput label="Nouveau mot de passe" autoComplete="new-password" {...mdp.getInputProps('mdp')} />
              <PasswordInput label="Confirmez" autoComplete="new-password" {...mdp.getInputProps('confirmation')} />
              <Group justify="flex-end"><Button type="submit" loading={changerMdp.isPending}>Modifier</Button></Group>
            </Stack>
          </form>
        </Card>
        {role === 'gestionnaire' && (
          <Card withBorder radius="lg" padding="lg">
            <Title order={3} size="h4" mb={4}>Ma signature</Title>
            <Text size="sm" c="dimmed" mb="sm">Elle apparaît sur les reçus que vous encaissez, avec le cachet du propriétaire.</Text>
            {signature && <Image src={signature} h={90} fit="contain" mb="sm" alt="Ma signature" />}
            <SignaturePad enCours={envoyerSignature.isPending} onValider={(b) => envoyerSignature.mutate(b)} />
            <Group mt="sm" gap="xs">
              <Text size="sm">ou</Text>
              <ImageUpload libelle="Envoyer une photo de ma signature" retirerFondBlanc onValider={(b) => envoyerSignature.mutate(b)} />
            </Group>
          </Card>
        )}
      </SimpleGrid>
    </>
  );
}
