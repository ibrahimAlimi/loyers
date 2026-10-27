import { Button, Group, Modal, Select, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { LIBELLE_TYPE_LOGEMENT } from '@/lib/format';
import type { Logement, TypeLogement } from '@/lib/types';
import { MontantInput } from '@/ui/MontantInput';
import { useEnregistrerLogement } from './api';

const TYPES = Object.entries(LIBELLE_TYPE_LOGEMENT).map(([value, label]) => ({ value, label }));

export function LogementForm({ opened, onClose, maisonId, espaceId, logement }: {
  opened: boolean;
  onClose: () => void;
  maisonId: string;
  espaceId: string;
  logement?: Logement;
}) {
  const enregistrer = useEnregistrerLogement();
  const form = useForm({
    initialValues: {
      type: (logement?.type ?? 'chambre') as TypeLogement,
      designation: logement?.designation ?? '',
      niveau: logement?.niveau ?? '',
      loyer_reference: logement?.loyer_reference ?? (null as number | null),
      notes: logement?.notes ?? '',
    },
    validate: {
      designation: (v) => (v.trim() ? null : 'Décrivez le logement (ex. « En bas à droite N°2 »)'),
    },
  });

  const valider = form.onSubmit(async (v) => {
    try {
      await enregistrer.mutateAsync({ ...v, id: logement?.id, maison_id: maisonId, espace_id: espaceId });
      notifierSucces(logement ? 'Logement modifié' : 'Logement ajouté');
      onClose();
    } catch (e) {
      notifierErreur(e);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={logement ? 'Modifier le logement' : 'Ajouter un logement'} size="lg">
      <form onSubmit={valider}>
        <Stack>
          <Select label="Type" data={TYPES} allowDeselect={false} {...form.getInputProps('type')} />
          <TextInput label="Désignation" placeholder="Ex. En bas à droite N°2" data-autofocus {...form.getInputProps('designation')} />
          <TextInput label="Niveau / précisions" placeholder="Ex. Rez-de-chaussée, 1er étage" {...form.getInputProps('niveau')} />
          <MontantInput
            label="Loyer mensuel habituel"
            value={form.values.loyer_reference}
            onChange={(n) => form.setFieldValue('loyer_reference', n)}
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
