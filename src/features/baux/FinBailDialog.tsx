import { useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { aujourdhui, dayjs } from '@/lib/dates';
import { formatFCFA } from '@/lib/format';
import { useTerminerBail } from './api';

export function FinBailDialog({ opened, onClose, bailId, montantDu, cautionDetenue }: {
  opened: boolean;
  onClose: () => void;
  bailId: string;
  montantDu: number;
  cautionDetenue: number;
}) {
  const [date, setDate] = useState<string | null>(aujourdhui());
  const terminer = useTerminerBail();

  const valider = async () => {
    if (!date) return;
    try {
      await terminer.mutateAsync({ bailId, dateFin: dayjs(date).format('YYYY-MM-DD') });
      notifierSucces('Départ enregistré. Le logement est maintenant libre.');
      onClose();
    } catch (e) {
      notifierErreur(e);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Enregistrer le départ du locataire">
      <Stack>
        <DateInput label="Date de départ" value={date} onChange={setDate} maxDate={dayjs().add(1, 'year').toDate()} />
        <Text size="sm" c="dimmed">À partir de cette date, aucun nouveau loyer ne sera demandé pour ce logement.</Text>
        {montantDu > 0 && (
          <Alert color="orange">
            Il reste <b>{formatFCFA(montantDu)}</b> dus. Ils resteront visibles et encaissables après le départ.
          </Alert>
        )}
        {cautionDetenue > 0 && (
          <Alert color="blue">
            Vous détenez une caution de <b>{formatFCFA(cautionDetenue)}</b>. Pensez à la rembourser depuis la fiche du locataire.
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Annuler</Button>
          <Button onClick={valider} loading={terminer.isPending} disabled={!date}>Enregistrer le départ</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
