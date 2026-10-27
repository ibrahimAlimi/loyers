import { Button, Group, Modal, Select, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import type { Maison } from '@/lib/types';
import { useEnregistrerMaison, useGestionnaires } from './api';

export function MaisonForm({ opened, onClose, maison, onCree }: {
  opened: boolean;
  onClose: () => void;
  maison?: Maison;
  onCree?: (id: string) => void;
}) {
  const enregistrer = useEnregistrerMaison();
  const { data: gestionnaires = [] } = useGestionnaires();
  const form = useForm({
    initialValues: {
      nom: maison?.nom ?? '',
      quartier: maison?.quartier ?? '',
      ville: maison?.ville ?? 'Cotonou',
      repere: maison?.repere ?? '',
      gestionnaire_id: maison?.gestionnaire_id ?? '',
      notes: maison?.notes ?? '',
    },
    validate: { nom: (v) => (v.trim() ? null : 'Donnez un nom à la maison (ex. « Arouna »)') },
  });

  const valider = form.onSubmit(async (v) => {
    try {
      const id = await enregistrer.mutateAsync({ ...v, id: maison?.id });
      notifierSucces(maison ? 'Maison modifiée' : 'Maison ajoutée');
      onClose();
      if (!maison) onCree?.(id);
    } catch (e) {
      notifierErreur(e);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={maison ? 'Modifier la maison' : 'Ajouter une maison'} size="lg">
      <form onSubmit={valider}>
        <Stack>
          <TextInput label="Nom de la maison (immeuble)" placeholder="Ex. Arouna" data-autofocus {...form.getInputProps('nom')} />
          <Group grow>
            <TextInput label="Quartier" placeholder="Ex. Gbégamey" {...form.getInputProps('quartier')} />
            <TextInput label="Ville" {...form.getInputProps('ville')} />
          </Group>
          <TextInput label="Repère / adresse" placeholder="Ex. Derrière la pharmacie" {...form.getInputProps('repere')} />
          <Select
            label="Gestionnaire"
            placeholder={gestionnaires.length ? 'Aucun (vous gérez vous-même)' : 'Aucun gestionnaire créé'}
            data={gestionnaires}
            clearable
            {...form.getInputProps('gestionnaire_id')}
          />
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
