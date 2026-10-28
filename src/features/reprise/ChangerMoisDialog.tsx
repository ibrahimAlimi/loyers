import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Group, Loader, Modal, Select, Stack, Text } from '@mantine/core';
import { dayjs } from '@/lib/dates';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { formatDate, formatFCFA, formatMois } from '@/lib/format';
import { useChangerMois, useMoisDuBail } from './api';

/** Remplace le mois d'un paiement repris (le mois avait été mal saisi dans l'ancien logiciel). */
export function ChangerMoisDialog({ paiement, onClose }: {
  paiement: { id: string; bail_id: string; date_paiement: string; montant: number; mois: string[] };
  onClose: () => void;
}) {
  const echeances = useMoisDuBail(paiement.bail_id, true);
  const changer = useChangerMois();
  const actuel = paiement.mois[0];
  const [mois, setMois] = useState<string | null>(null);

  const { options, suggestion } = useMemo(() => {
    const liste = (echeances.data ?? []).filter((e) => e.mois !== actuel);
    const nonPayes = liste.filter((e) => e.reste > 0);
    // Le mois non payé le plus proche de celui saisi : c'est en général le bon
    const proche = [...nonPayes].sort((a, b) =>
      Math.abs(dayjs(a.mois).diff(actuel, 'month')) - Math.abs(dayjs(b.mois).diff(actuel, 'month')) || a.mois.localeCompare(b.mois))[0];
    const option = (e: (typeof liste)[number]) => ({
      value: e.mois,
      label: `${formatMois(e.mois, { majuscule: true })} · ${e.reste <= 0 ? 'déjà payé' : e.paye > 0 ? `reste ${formatFCFA(e.reste)}` : 'non payé'}`,
    });
    return {
      suggestion: proche?.mois ?? null,
      options: [
        { group: 'Mois non payés', items: nonPayes.map(option) },
        { group: 'Autres mois du bail', items: liste.filter((e) => e.reste <= 0).map(option) },
      ].filter((g) => g.items.length),
    };
  }, [echeances.data, actuel]);

  useEffect(() => { if (mois === null && suggestion) setMois(suggestion); }, [suggestion, mois]);

  const valider = async () => {
    if (!mois) return;
    try {
      await changer.mutateAsync({ paiementId: paiement.id, mois });
      notifierSucces(`Paiement placé sur ${formatMois(mois)}. Son reçu a été mis à jour.`);
      onClose();
    } catch (e) {
      notifierErreur(e);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Changer le mois de ce paiement">
      <Stack>
        <Text size="sm">
          Paiement de <b>{formatFCFA(paiement.montant)}</b> du {formatDate(paiement.date_paiement)}, enregistré
          pour <b>{actuel ? formatMois(actuel) : '—'}</b> dans l'ancien logiciel.
        </Text>
        {echeances.isLoading ? <Loader size="sm" /> : (
          <Select label="Le bon mois" data={options} value={mois} onChange={setMois} searchable allowDeselect={false}
            maxDropdownHeight={300} data-autofocus nothingFoundMessage="Aucun mois" />
        )}
        {suggestion && mois === suggestion && (
          <Alert color="blue" variant="light" p="xs">
            <Text size="sm">Proposé : le mois non payé le plus proche de {formatMois(actuel)}.</Text>
          </Alert>
        )}
        <Text size="xs" c="dimmed">Le reçu garde son numéro ; il indiquera le nouveau mois.</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Retour</Button>
          <Button onClick={valider} loading={changer.isPending} disabled={!mois}>Enregistrer</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
