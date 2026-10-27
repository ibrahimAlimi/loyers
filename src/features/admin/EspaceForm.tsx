import { useState } from 'react';
import { Alert, Button, CopyButton, Divider, Group, Modal, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { motDePasseProvisoire } from '@/lib/fonctions';
import { notifierErreur } from '@/lib/erreurs';
import { useCreerEspace } from './api';

/** Création d'un propriétaire et de son espace (super admin). */
export function EspaceForm({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const creer = useCreerEspace();
  const [resultat, setResultat] = useState<{ identifiant: string; mdp: string } | null>(null);
  const form = useForm({
    initialValues: { nom: '', prefixe_recu: '', ville: 'Cotonou', identifiant: '', nom_complet: '', telephone: '', email: '' },
    validate: {
      nom: (v) => (v.trim() ? null : "Nom de l'espace requis"),
      prefixe_recu: (v) => (/^[A-Za-z]{3}$/.test(v.trim()) ? null : '3 lettres (ex. ADJ)'),
      identifiant: (v) => (/^[a-z0-9._-]{3,40}$/.test(v.trim().toLowerCase()) ? null : 'Identifiant invalide (ex. adjovi)'),
      nom_complet: (v) => (v.trim() ? null : 'Nom du propriétaire requis'),
    },
  });

  const valider = form.onSubmit(async (v) => {
    const mdp = motDePasseProvisoire();
    try {
      await creer.mutateAsync({
        espace: { nom: v.nom, prefixe_recu: v.prefixe_recu.toUpperCase(), ville: v.ville },
        identifiant: v.identifiant.trim().toLowerCase(), nom_complet: v.nom_complet, telephone: v.telephone,
        email: v.email, mot_de_passe_provisoire: mdp,
      });
      setResultat({ identifiant: v.identifiant.trim().toLowerCase(), mdp });
    } catch (e) {
      notifierErreur(e);
    }
  });
  const fermer = () => { setResultat(null); form.reset(); onClose(); };

  return (
    <Modal opened={opened} onClose={fermer} title="Créer un propriétaire et son espace" size="lg">
      {resultat ? (
        <Stack>
          <Alert color="green" title="Espace créé">Transmettez ces accès au propriétaire. Le mot de passe ne sera plus affiché.</Alert>
          <Text>Identifiant : <b>{resultat.identifiant}</b></Text>
          <Text>Mot de passe provisoire : <b style={{ fontFamily: 'monospace', fontSize: 18 }}>{resultat.mdp}</b></Text>
          <Group justify="flex-end">
            <CopyButton value={`Bonjour, voici vos accès à Mes Loyers : ${window.location.origin}\nIdentifiant : ${resultat.identifiant}\nMot de passe provisoire : ${resultat.mdp}`}>
              {({ copied, copy }) => <Button variant="light" onClick={copy}>{copied ? 'Copié !' : 'Copier pour WhatsApp'}</Button>}
            </CopyButton>
            <Button onClick={fermer}>Terminer</Button>
          </Group>
        </Stack>
      ) : (
        <form onSubmit={valider}>
          <Stack>
            <Text fw={700}>L'espace</Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <TextInput label="Nom" placeholder="Immobilier Adjovi" {...form.getInputProps('nom')} />
              <TextInput label="Préfixe des reçus" placeholder="ADJ" maxLength={3} {...form.getInputProps('prefixe_recu')}
                onChange={(e) => form.setFieldValue('prefixe_recu', e.currentTarget.value.toUpperCase())} />
              <TextInput label="Ville" {...form.getInputProps('ville')} />
            </SimpleGrid>
            <Text size="xs" c="dimmed">Le préfixe ne pourra plus être changé : il figure sur tous les reçus (ex. ADJ-2026-000001).</Text>
            <Divider />
            <Text fw={700}>Le propriétaire</Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Identifiant de connexion" autoCapitalize="none" {...form.getInputProps('identifiant')} />
              <TextInput label="Nom complet" {...form.getInputProps('nom_complet')} />
              <TextInput label="Téléphone" inputMode="tel" {...form.getInputProps('telephone')} />
              <TextInput label="E-mail (facultatif)" inputMode="email" {...form.getInputProps('email')} />
            </SimpleGrid>
            <Group justify="flex-end">
              <Button variant="default" onClick={fermer}>Annuler</Button>
              <Button type="submit" loading={creer.isPending}>Créer</Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
