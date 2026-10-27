import { useEffect } from 'react';
import { Alert, Button, Checkbox, Group, Modal, NumberInput, SegmentedControl, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { aujourdhui, ajouterMois, dayjs, premierDuMois } from '@/lib/dates';
import { formatFCFA, LIBELLE_MODE } from '@/lib/format';
import type { ModePaiement } from '@/lib/types';
import { MontantInput } from '@/ui/MontantInput';
import { useEncaisser } from '@/features/encaissement/EncaissementContext';
import { useEnregistrerLocataire, useLocataires } from '@/features/locataires/api';
import { useCreerBail, useLogementsLibres, useMouvementCaution } from './api';

const MODES = Object.entries(LIBELLE_MODE).map(([value, label]) => ({ value, label }));

/** Mise en location : logement + locataire (existant ou nouveau) + conditions + caution + avance. */
export function BailForm({ opened, onClose, logementId, locataireId }: {
  opened: boolean;
  onClose: () => void;
  logementId?: string;
  locataireId?: string;
}) {
  const { data: libres = [] } = useLogementsLibres();
  const { data: lignes = [] } = useLocataires();
  const creerBail = useCreerBail();
  const creerLocataire = useEnregistrerLocataire();
  const caution = useMouvementCaution();
  const { ouvrir: ouvrirEncaissement } = useEncaisser();

  const locataires = Array.from(new Map(lignes.map((l) => [l.locataire.id, l.nom])).entries())
    .map(([value, label]) => ({ value, label }));

  const form = useForm({
    initialValues: {
      logement_id: logementId ?? '',
      choixLocataire: (locataireId ? 'existant' : 'nouveau') as 'existant' | 'nouveau',
      locataire_id: locataireId ?? '',
      nom: '',
      prenoms: '',
      telephone: '',
      reference: '',
      date_debut: aujourdhui(),
      jour_echeance: 1,
      loyer: null as number | null,
      premier_mois_montant: null as number | null,
      caution_montant: null as number | null,
      caution_versee: true,
      caution_mode: 'especes' as ModePaiement,
      avance_mois: 0,
    },
    validate: {
      logement_id: (v) => (v ? null : 'Choisissez le logement'),
      locataire_id: (v, val) => (val.choixLocataire === 'existant' && !v ? 'Choisissez le locataire' : null),
      nom: (v, val) => (val.choixLocataire === 'nouveau' && !v.trim() ? 'Indiquez le nom du locataire' : null),
      date_debut: (v) => (v ? null : 'Indiquez la date d’entrée'),
      loyer: (v) => (v && v > 0 ? null : 'Indiquez le loyer mensuel'),
    },
  });

  // Pré-remplir le loyer à partir du logement
  useEffect(() => {
    const l = libres.find((x) => x.value === form.values.logement_id);
    if (l?.loyer_reference && !form.values.loyer) form.setFieldValue('loyer', l.loyer_reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.logement_id, libres]);

  const debutEnCoursDeMois = !!form.values.date_debut && dayjs(form.values.date_debut).date() !== 1;
  const premierMois = debutEnCoursDeMois ? (form.values.premier_mois_montant ?? form.values.loyer ?? 0) : (form.values.loyer ?? 0);

  const valider = form.onSubmit(async (v) => {
    try {
      const locId = v.choixLocataire === 'existant'
        ? v.locataire_id
        : await creerLocataire.mutateAsync({ nom: v.nom, prenoms: v.prenoms, telephone: v.telephone });
      const bailId = await creerBail.mutateAsync({
        logement_id: v.logement_id,
        locataire_id: locId,
        reference: v.reference.trim() || null,
        date_debut: dayjs(v.date_debut).format('YYYY-MM-DD'),
        jour_echeance: v.jour_echeance,
        loyer: v.loyer!,
        premier_mois_montant: debutEnCoursDeMois && v.premier_mois_montant != null && v.premier_mois_montant !== v.loyer
          ? v.premier_mois_montant : null,
        caution_montant: v.caution_montant ?? 0,
      });
      if (v.caution_montant && v.caution_versee) {
        await caution.mutateAsync({ bailId, type: 'versement', montant: v.caution_montant, date: aujourdhui(), mode: v.caution_mode });
      }
      notifierSucces('Logement mis en location');
      onClose();
      if (v.avance_mois > 0) {
        const debut = premierDuMois(v.date_debut);
        const mois = Array.from({ length: v.avance_mois }, (_, i) => ajouterMois(debut, i));
        ouvrirEncaissement({ bailId, mois, montant: premierMois + (v.loyer ?? 0) * (v.avance_mois - 1) });
      }
    } catch (e) {
      notifierErreur(e);
    }
  });

  const enCours = creerBail.isPending || creerLocataire.isPending || caution.isPending;

  return (
    <Modal opened={opened} onClose={onClose} title="Mettre en location" size="lg">
      <form onSubmit={valider}>
        <Stack>
          <Select
            label="Logement"
            placeholder={libres.length ? 'Choisissez un logement libre' : 'Aucun logement libre'}
            data={libres}
            searchable
            disabled={!!logementId}
            {...form.getInputProps('logement_id')}
          />

          <Stack gap="xs">
            <Text fw={600} size="sm">Locataire</Text>
            {!locataireId && (
              <SegmentedControl
                data={[{ value: 'nouveau', label: 'Nouveau locataire' }, { value: 'existant', label: 'Déjà enregistré' }]}
                {...form.getInputProps('choixLocataire')}
              />
            )}
            {form.values.choixLocataire === 'existant' ? (
              <Select data={locataires} searchable placeholder="Chercher un nom" disabled={!!locataireId}
                {...form.getInputProps('locataire_id')} />
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <TextInput label="Nom" {...form.getInputProps('nom')} />
                <TextInput label="Prénoms" {...form.getInputProps('prenoms')} />
                <TextInput label="Téléphone" inputMode="tel" {...form.getInputProps('telephone')} />
              </SimpleGrid>
            )}
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <DateInput label="Date d'entrée" {...form.getInputProps('date_debut')} />
            <NumberInput label="Jour de paiement chaque mois" min={1} max={28} {...form.getInputProps('jour_echeance')} />
            <MontantInput label="Loyer mensuel" value={form.values.loyer} onChange={(n) => form.setFieldValue('loyer', n)}
              error={form.errors.loyer} />
            <TextInput label="Référence du contrat (facultatif)" placeholder="Ex. BAIL-ARO-002" {...form.getInputProps('reference')} />
          </SimpleGrid>

          {debutEnCoursDeMois && (
            <MontantInput
              label="Montant du premier mois"
              description="Le premier mois est dû en entier. Modifiez seulement si un montant a été négocié."
              value={form.values.premier_mois_montant ?? form.values.loyer}
              zeroAutorise
              onChange={(n) => form.setFieldValue('premier_mois_montant', n)}
            />
          )}

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <MontantInput label="Caution (facultatif)" value={form.values.caution_montant}
              onChange={(n) => form.setFieldValue('caution_montant', n)} />
            <NumberInput label="Avance : mois payés d'avance" min={0} max={24} {...form.getInputProps('avance_mois')} />
          </SimpleGrid>
          {!!form.values.caution_montant && (
            <Group>
              <Checkbox label="Caution versée aujourd'hui (un reçu de caution sera émis)" {...form.getInputProps('caution_versee', { type: 'checkbox' })} />
              {form.values.caution_versee && (
                <Select data={MODES} w={200} allowDeselect={false} {...form.getInputProps('caution_mode')} />
              )}
            </Group>
          )}
          {form.values.avance_mois > 0 && (
            <Alert color="blue">
              Après l'enregistrement, l'encaissement de l'avance s'ouvrira avec {form.values.avance_mois} mois pré-sélectionnés
              ({formatFCFA(premierMois + (form.values.loyer ?? 0) * (form.values.avance_mois - 1))}).
            </Alert>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={enCours}>Enregistrer</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
