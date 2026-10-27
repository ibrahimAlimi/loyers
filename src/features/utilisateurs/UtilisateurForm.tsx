import { useState } from 'react';
import { Alert, Button, Checkbox, CopyButton, Group, Modal, MultiSelect, SegmentedControl, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCopy } from '@tabler/icons-react';
import { motDePasseProvisoire } from '@/lib/fonctions';
import { notifierErreur } from '@/lib/erreurs';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { useMaisons } from '@/features/maisons/api';
import { useCreerCompte } from './api';

/** Création d'un gestionnaire ou d'un compte Consultation ; affiche le mot de passe provisoire une fois. */
export function UtilisateurForm({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const espace = useEspaceCourant();
  const { data: maisons = [] } = useMaisons();
  const creer = useCreerCompte();
  const [resultat, setResultat] = useState<{ identifiant: string; mdp: string } | null>(null);
  const form = useForm({
    initialValues: {
      role: 'gestionnaire' as 'gestionnaire' | 'consultation',
      identifiant: '',
      nom_complet: '',
      telephone: '',
      email: '',
      maisons: [] as string[],
      ajouter_existant: false,
    },
    validate: {
      identifiant: (v) => (/^[a-z0-9._-]{3,40}$/.test(v.trim().toLowerCase())
        ? null : '3 à 40 caractères : lettres minuscules, chiffres, point, tiret (ex. paul.dossa)'),
      nom_complet: (v, val) => (val.ajouter_existant || v.trim() ? null : 'Indiquez le nom'),
    },
  });

  const valider = form.onSubmit(async (v) => {
    const mdp = motDePasseProvisoire();
    try {
      await creer.mutateAsync({ ...v, identifiant: v.identifiant.trim().toLowerCase(), mot_de_passe_provisoire: mdp });
      setResultat({ identifiant: v.identifiant.trim().toLowerCase(), mdp: v.ajouter_existant ? '' : mdp });
    } catch (e) {
      notifierErreur(e);
    }
  });

  const fermer = () => {
    setResultat(null);
    form.reset();
    onClose();
  };
  const messageWhatsApp = resultat
    ? `Bonjour, voici vos accès à l'application ${espace.nom} : ${window.location.origin}\nIdentifiant : ${resultat.identifiant}\nMot de passe provisoire : ${resultat.mdp}\nVous devrez le changer à la première connexion.`
    : '';

  return (
    <Modal opened={opened} onClose={fermer} title="Ajouter un compte" size="lg">
      {resultat ? (
        <Stack>
          <Alert color="green" title="Compte créé">
            {resultat.mdp ? (
              <>Transmettez ces accès à la personne. <b>Le mot de passe ne sera plus affiché.</b></>
            ) : 'La personne a été ajoutée à votre espace avec son compte existant.'}
          </Alert>
          <Text>Identifiant : <b>{resultat.identifiant}</b></Text>
          {resultat.mdp && <Text>Mot de passe provisoire : <b style={{ fontFamily: 'monospace', fontSize: 18 }}>{resultat.mdp}</b></Text>}
          <Group justify="flex-end">
            {resultat.mdp && (
              <CopyButton value={messageWhatsApp}>
                {({ copied, copy }) => (
                  <Button variant="light" leftSection={<IconCopy size={18} />} onClick={copy}>
                    {copied ? 'Copié !' : 'Copier pour WhatsApp'}
                  </Button>
                )}
              </CopyButton>
            )}
            <Button onClick={fermer}>Terminer</Button>
          </Group>
        </Stack>
      ) : (
        <form onSubmit={valider}>
          <Stack>
            <SegmentedControl data={[{ value: 'gestionnaire', label: 'Gestionnaire' }, { value: 'consultation', label: 'Consultation' }]}
              {...form.getInputProps('role')} />
            <Text size="sm" c="dimmed">
              {form.values.role === 'gestionnaire'
                ? 'Le gestionnaire encaisse et gère les locataires des maisons que vous lui confiez. Il ne peut rien supprimer.'
                : 'Le compte Consultation voit tout (ou seulement les maisons choisies) mais ne peut rien modifier.'}
            </Text>
            <Checkbox label="Cette personne a déjà un compte (chez un autre propriétaire)" {...form.getInputProps('ajouter_existant', { type: 'checkbox' })} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Identifiant de connexion" placeholder="paul.dossa" autoCapitalize="none" {...form.getInputProps('identifiant')} />
              {!form.values.ajouter_existant && <TextInput label="Nom complet" {...form.getInputProps('nom_complet')} />}
              {!form.values.ajouter_existant && <TextInput label="Téléphone" inputMode="tel" {...form.getInputProps('telephone')} />}
              {!form.values.ajouter_existant && <TextInput label="E-mail (facultatif)" inputMode="email" {...form.getInputProps('email')} />}
            </SimpleGrid>
            <MultiSelect
              label={form.values.role === 'gestionnaire' ? 'Maisons confiées' : 'Limiter à ces maisons (vide = toutes)'}
              data={maisons.map((m) => ({ value: m.id, label: m.gestionnaire_nom && form.values.role === 'gestionnaire' ? `${m.nom} (actuellement : ${m.gestionnaire_nom})` : m.nom }))}
              {...form.getInputProps('maisons')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={fermer}>Annuler</Button>
              <Button type="submit" loading={creer.isPending}>Créer le compte</Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
