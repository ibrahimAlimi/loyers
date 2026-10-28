import { Button, Group, Modal, Select, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { LIBELLE_TYPE_LOGEMENT } from '@/lib/format';
import type { Logement, TypeLogement } from '@/lib/types';
import { MontantInput } from '@/ui/MontantInput';
import { useEnregistrerLogement, useMaisons } from './api';

const TYPES = Object.entries(LIBELLE_TYPE_LOGEMENT).map(([value, label]) => ({ value, label }));

export function LogementForm({ opened, onClose, maisonId, espaceId, logement }: {
  opened: boolean;
  onClose: () => void;
  maisonId: string;
  espaceId: string;
  logement?: Logement;
}) {
  const enregistrer = useEnregistrerLogement();
  // Changer de maison : seulement pour un logement existant (ex. logement « À classer » après la reprise)
  const maisons = useMaisons();
  const form = useForm({
    initialValues: {
      maison_id: maisonId,
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
      await enregistrer.mutateAsync({ ...v, id: logement?.id, espace_id: espaceId });
      notifierSucces(v.maison_id !== maisonId ? 'Logement déplacé dans une autre maison' : logement ? 'Logement modifié' : 'Logement ajouté');
      onClose();
    } catch (e) {
      notifierErreur(e);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={logement ? 'Modifier le logement' : 'Ajouter un logement'} size="lg">
      <form onSubmit={valider}>
        <Stack>
          {logement && (maisons.data?.length ?? 0) > 1 && (
            <Select label="Maison" data={(maisons.data ?? []).map((m) => ({ value: m.id, label: m.nom }))} allowDeselect={false}
              description="Pour déplacer ce logement dans une autre maison." {...form.getInputProps('maison_id')} />
          )}
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
