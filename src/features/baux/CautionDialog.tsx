import { useState } from 'react';
import { Alert, Button, Group, Modal, SegmentedControl, Select, Stack, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { aujourdhui, dayjs } from '@/lib/dates';
import { formatFCFA, LIBELLE_MODE } from '@/lib/format';
import type { ModePaiement, Recu } from '@/lib/types';
import { MontantInput } from '@/ui/MontantInput';
import { useMouvementCaution } from './api';

const MODES = Object.entries(LIBELLE_MODE).map(([value, label]) => ({ value, label }));

export function CautionDialog({ opened, onClose, bailId, sens, detenue, onRecu }: {
  opened: boolean;
  onClose: () => void;
  bailId: string;
  /** versement = encaisser une caution ; restitution = rembourser / retenir */
  sens: 'versement' | 'restitution';
  detenue: number;
  onRecu?: (r: Recu) => void;
}) {
  const [type, setType] = useState<'remboursement' | 'retenue'>('remboursement');
  const [montant, setMontant] = useState<number | null>(sens === 'restitution' ? detenue || null : null);
  const [date, setDate] = useState<string | null>(aujourdhui());
  const [mode, setMode] = useState<ModePaiement>('especes');
  const [motif, setMotif] = useState('');
  const mouvement = useMouvementCaution();

  const trop = sens === 'restitution' && (montant ?? 0) > detenue;
  const valider = async () => {
    if (!montant || !date) return;
    try {
      const recu = await mouvement.mutateAsync({
        bailId, type: sens === 'versement' ? 'versement' : type, montant,
        date: dayjs(date).format('YYYY-MM-DD'), motif: motif || undefined, mode,
      });
      notifierSucces(sens === 'versement' ? 'Caution enregistrée' : 'Restitution enregistrée');
      onClose();
      onRecu?.(recu);
    } catch (e) {
      notifierErreur(e);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={sens === 'versement' ? 'Encaisser une caution' : 'Rendre la caution'}>
      <Stack>
        {sens === 'restitution' && (
          <>
            <Alert color="blue">Caution détenue : <b>{formatFCFA(detenue)}</b></Alert>
            <SegmentedControl
              value={type}
              onChange={(v) => setType(v as typeof type)}
              data={[{ value: 'remboursement', label: 'Rembourser' }, { value: 'retenue', label: 'Retenir (réparations…)' }]}
            />
          </>
        )}
        <MontantInput label="Montant" value={montant} onChange={setMontant} error={trop ? 'Plus que la caution détenue' : undefined} />
        <DateInput label="Date" value={date} onChange={setDate} maxDate={new Date()} />
        <Select label="Moyen" data={MODES} value={mode} onChange={(v) => v && setMode(v as ModePaiement)} allowDeselect={false} />
        <Textarea label={type === 'retenue' && sens === 'restitution' ? 'Motif de la retenue (obligatoire)' : 'Motif (facultatif)'}
          value={motif} onChange={(e) => setMotif(e.currentTarget.value)} autosize minRows={2} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Annuler</Button>
          <Button onClick={valider} loading={mouvement.isPending}
            disabled={!montant || !date || trop || (sens === 'restitution' && type === 'retenue' && !motif.trim())}>
            Enregistrer et faire le reçu
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
