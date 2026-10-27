import { Button, Group, Modal, SimpleGrid, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import type { Locataire } from '@/lib/types';
import { useEnregistrerLocataire } from './api';

export function LocataireForm({ opened, onClose, locataire, onCree }: {
  opened: boolean;
  onClose: () => void;
  locataire?: Locataire;
  onCree?: (id: string) => void;
}) {
  const enregistrer = useEnregistrerLocataire();
  const form = useForm({
    initialValues: {
      nom: locataire?.nom ?? '',
      prenoms: locataire?.prenoms ?? '',
      telephone: locataire?.telephone ?? '',
      telephone2: locataire?.telephone2 ?? '',
      email: locataire?.email ?? '',
      profession: locataire?.profession ?? '',
      piece_type: locataire?.piece_type ?? '',
      piece_numero: locataire?.piece_numero ?? '',
      contact_urgence: locataire?.contact_urgence ?? '',
      notes: locataire?.notes ?? '',
    },
    validate: { nom: (v) => (v.trim() ? null : 'Indiquez le nom') },
  });

  const valider = form.onSubmit(async (v) => {
    try {
      const id = await enregistrer.mutateAsync({ ...v, id: locataire?.id });
      notifierSucces(locataire ? 'Locataire modifié' : 'Locataire ajouté');
      onClose();
      if (!locataire) onCree?.(id);
    } catch (e) {
      notifierErreur(e);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={locataire ? 'Modifier le locataire' : 'Ajouter un locataire'} size="lg">
      <form onSubmit={valider}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Nom" data-autofocus {...form.getInputProps('nom')} />
            <TextInput label="Prénoms" {...form.getInputProps('prenoms')} />
            <TextInput label="Téléphone (WhatsApp)" inputMode="tel" placeholder="01 97 00 00 00" {...form.getInputProps('telephone')} />
            <TextInput label="Autre téléphone" inputMode="tel" {...form.getInputProps('telephone2')} />
            <TextInput label="E-mail" inputMode="email" {...form.getInputProps('email')} />
            <TextInput label="Profession" {...form.getInputProps('profession')} />
            <TextInput label="Pièce d'identité (type)" placeholder="CNI, passeport…" {...form.getInputProps('piece_type')} />
            <TextInput label="Numéro de la pièce" {...form.getInputProps('piece_numero')} />
          </SimpleGrid>
          <TextInput label="Personne à contacter en cas d'urgence" {...form.getInputProps('contact_urgence')} />
          <Textarea label="Notes" autosize minRows={2} {...form.getInputProps('notes')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={enregistrer.isPending}>Enregistrer</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
