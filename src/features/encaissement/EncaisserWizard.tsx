import { useMemo, useState } from 'react';
import {
  Alert, Button, Card, Group, Loader, Modal, Progress, Radio, ScrollArea, SimpleGrid, Stack, Text,
  TextInput, Textarea, ThemeIcon, Title, UnstyledButton,
} from '@mantine/core';
import { DateInput, MonthPickerInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowLeft, IconArrowRight, IconBuildingBank, IconCalendar, IconCash, IconCheck, IconCircleCheck, IconDeviceMobile,
  IconFileInvoice, IconSearch, IconWallet,
} from '@tabler/icons-react';
import { aujourdhui, dayjs } from '@/lib/dates';
import { formatFCFA, formatLoyer, formatMois, LIBELLE_MODE } from '@/lib/format';
import { messageErreur } from '@/lib/erreurs';
import type { Echeance, ModePaiement, Recu } from '@/lib/types';
import { MontantInput } from '@/ui/MontantInput';
import { StatutBadge } from '@/ui/StatutBadge';
import { ApercuRecu } from '@/features/recus/ActionsRecu';
import type { PreRemplissage } from './EncaissementContext';
import { useBauxEncaissables, useEcheances, useEncaisserMutation, type BailEncaissable } from './api';

const MODES: { value: ModePaiement; icone: typeof IconCash }[] = [
  { value: 'especes', icone: IconCash },
  { value: 'mtn_momo', icone: IconDeviceMobile },
  { value: 'moov_money', icone: IconDeviceMobile },
  { value: 'celtiis_cash', icone: IconDeviceMobile },
  { value: 'virement', icone: IconBuildingBank },
  { value: 'cheque', icone: IconFileInvoice },
  { value: 'autre', icone: IconWallet },
];
const AVEC_REFERENCE: ModePaiement[] = ['mtn_momo', 'moov_money', 'celtiis_cash', 'virement', 'cheque'];
const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Date saisie au clavier : JJ/MM/AAAA (ou JJ-MM-AAAA, JJ.MM.AAAA). */
const lireDate = (v: string) => {
  const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const d = m ? dayjs(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`) : null;
  return d?.isValid() ? d.format('YYYY-MM-DD') : null;
};

/** Modification : les mois du paiement modifié redeviennent dus (il est annulé à l'enregistrement). */
function liberer(echeances: Echeance[], imputations?: { mois: string; montant: number; remise: number }[]): Echeance[] {
  if (!imputations?.length) return echeances;
  return echeances.map((e) => {
    const liees = imputations.filter((i) => i.mois === e.mois);
    if (!liees.length) return e;
    const paye = e.paye - liees.reduce((t, i) => t + i.montant, 0);
    const remise = e.remise - liees.reduce((t, i) => t + i.remise, 0);
    const reste = Math.max(e.du - paye - remise, 0);
    return { ...e, paye, remise, reste, statut: reste <= 0 ? 'solde' : paye + remise > 0 ? 'partiel' : 'du' };
  });
}

export default function EncaisserWizard({ pre, onFermer }: { pre?: PreRemplissage; onFermer: () => void }) {
  const mobile = useMediaQuery('(max-width: 48em)');
  const { data: baux = [], isLoading } = useBauxEncaissables();
  const [etape, setEtape] = useState(pre?.bailId ? 1 : 0);
  const [bailId, setBailId] = useState<string | null>(pre?.bailId ?? null);
  const [mois, setMois] = useState<string[] | null>(pre?.mois ?? null);
  const [montant, setMontant] = useState<number | null>(pre?.montant ?? null);
  const [mode, setMode] = useState<ModePaiement>(pre?.mode ?? 'especes');
  const [reference, setReference] = useState(pre?.reference ?? '');
  const [payeur, setPayeur] = useState(pre?.payeur ?? '');
  const [date, setDate] = useState<string | null>(pre?.date ?? aujourdhui());
  const [reste, setReste] = useState<'partiel' | 'remise'>('partiel');
  const [motifRemise, setMotifRemise] = useState('');
  const [cle] = useState(() => crypto.randomUUID());
  const [recu, setRecu] = useState<Recu | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const encaisser = useEncaisserMutation();

  const bail = baux.find((b) => b.bail_id === bailId) ?? null;
  const { data: brutes, isLoading: chargeEch } = useEcheances(bailId);
  const echeances = useMemo(() => liberer(brutes ?? [], pre?.modification?.imputations), [brutes, pre]);
  const dues = echeances.filter((e) => e.reste > 0);
  // On propose le mois qui suit le dernier mois payé ; les trous plus anciens restent accessibles par « Autre… »
  const dernierPaye = [...echeances].reverse().find((e) => e.paye + e.remise > 0)?.mois ?? null;
  const proposees = dues.filter((e) => !dernierPaye || e.mois >= dernierPaye);
  const totalMois = (liste: string[]) => echeances.filter((e) => liste.includes(e.mois)).reduce((s, e) => s + e.reste, 0);
  const moisChoisis = mois ?? (proposees.length ? proposees : dues).slice(0, 1).map((e) => e.mois);
  const totalChoisi = totalMois(moisChoisis);

  const choisirBail = (b: BailEncaissable) => {
    setBailId(b.bail_id);
    setPayeur((p) => p || b.nom);
    setMois(null);
    setMontant(null);
    setEtape(1);
  };

  const allerMontant = () => {
    if (montant == null || !pre?.montant) setMontant(totalChoisi);
    if (!payeur && bail) setPayeur(bail.nom);
    setEtape(2);
  };

  const enregistrer = async () => {
    if (!bailId || !montant || !date) return;
    setErreur(null);
    try {
      const r = await encaisser.mutateAsync({
        bailId, date: dayjs(date).format('YYYY-MM-DD'), montant, mode, reference, payeur: payeur || bail?.nom || '',
        mois: moisChoisis, reste: montant < totalChoisi ? reste : 'partiel', motifRemise, cle, modifie: pre?.modification?.paiementId,
      });
      setRecu(r);
      setEtape(3);
    } catch (e) {
      const m = messageErreur(e);
      setErreur(/connexion/i.test(m) ? "Le paiement n'a pas pu être enregistré. Vérifiez votre connexion et réessayez." : m);
    }
  };

  const titres = ['Qui vous paie ?', `${bail?.prenoms?.split(' ')[0] ?? bail?.nom ?? 'Le locataire'} paie quel mois ?`, 'Combien et comment ?', 'Paiement enregistré !'];
  const peutValiderMontant = !!montant && !!date && (montant >= totalChoisi || reste === 'partiel' || motifRemise.trim().length > 0);

  return (
    <Modal
      opened
      onClose={onFermer}
      fullScreen={mobile}
      size="lg"
      radius={mobile ? 0 : 'lg'}
      closeButtonProps={{ 'aria-label': 'Fermer' }}
      title={<Text fw={700} c="espace" size="sm">{pre?.modification ? 'MODIFICATION · ' : ''}ÉTAPE {etape + 1} SUR 4{bail ? ` · ${bail.nom} — ${bail.maison}, ${bail.logement}` : ''}</Text>}
    >
      <Stack gap="md" pb={mobile ? 90 : 0}>
        <Progress value={((etape + 1) / 4) * 100} size="sm" radius="xl" />
        <Title order={2} size="h3">{titres[etape]}</Title>

        {etape === 0 && <EtapeQui baux={baux} chargement={isLoading} onChoisir={choisirBail} />}

        {etape === 1 && bail && (
          <EtapeMois
            bail={bail}
            echeances={echeances}
            dernierPaye={dernierPaye}
            proposees={proposees.length ? proposees : dues}
            chargement={chargeEch}
            choisis={moisChoisis}
            onChoisir={setMois}
            total={totalChoisi}
          />
        )}

        {etape === 2 && (
          <Stack>
            <MontantInput label="Montant reçu" value={montant} onChange={setMontant} data-autofocus />
            {!!montant && montant < totalChoisi && (
              <Card withBorder radius="md">
                <Text size="sm" mb="xs">Il manque <b>{formatFCFA(totalChoisi - montant)}</b>. Que faire du reste ?</Text>
                <Radio.Group value={reste} onChange={(v) => setReste(v as typeof reste)}>
                  <Stack gap="xs">
                    <Radio value="partiel" label="Le reste sera payé plus tard" />
                    <Radio value="remise" label="Remise accordée, le mois est soldé" />
                  </Stack>
                </Radio.Group>
                {reste === 'remise' && (
                  <Textarea mt="sm" label="Motif de la remise" placeholder="Ex. arrangement, travaux faits par le locataire…"
                    value={motifRemise} onChange={(e) => setMotifRemise(e.currentTarget.value)} autosize minRows={2} />
                )}
              </Card>
            )}
            {!!montant && montant > totalChoisi && (
              <Alert color="blue">Le surplus de {formatFCFA(montant - totalChoisi)} sera compté comme avance sur les mois suivants.</Alert>
            )}
            <div>
              <Text size="sm" fw={500} mb={6}>Moyen de paiement</Text>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                {MODES.map((m) => (
                  <Button key={m.value} variant={mode === m.value ? 'filled' : 'default'} leftSection={<m.icone size={18} />}
                    onClick={() => setMode(m.value)} styles={{ label: { whiteSpace: 'normal', lineHeight: 1.15 } }} h={48} px="xs">
                    {LIBELLE_MODE[m.value]}
                  </Button>
                ))}
              </SimpleGrid>
            </div>
            {AVEC_REFERENCE.includes(mode) && (
              <TextInput label="Référence de la transaction (facultatif)" placeholder="Ex. MP261005.1042.A77"
                value={reference} onChange={(e) => setReference(e.currentTarget.value)} />
            )}
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Payé par" value={payeur} onChange={(e) => setPayeur(e.currentTarget.value)} />
              <DateInput label="Date du paiement" description="Tapez la date (JJ/MM/AAAA) ou choisissez-la dans le calendrier"
                value={date} onChange={setDate} maxDate={aujourdhui()} valueFormat="DD/MM/YYYY" dateParser={lireDate}
                placeholder="JJ/MM/AAAA" allowDeselect={false} />
            </SimpleGrid>
            {pre?.modification && (
              <Alert color="orange">L'ancien paiement sera annulé (son reçu portera la mention ANNULÉ) et remplacé par celui-ci, avec un nouveau reçu.</Alert>
            )}
            {erreur && <Alert color="red">{erreur}</Alert>}
          </Stack>
        )}

        {etape === 3 && recu && (
          <Stack align="center" ta="center" gap="sm">
            <ThemeIcon size={72} radius="xl" color="green"><IconCircleCheck size={44} /></ThemeIcon>
            <Text>Reçu <b>N° {recu.numero}</b></Text>
            <Text c="dimmed">
              {formatFCFA(recu.contenu.montant)} · {recu.contenu.mois.map((m) => formatMois(m)).join(', ')}
            </Text>
            <ApercuRecu recu={recu} />
          </Stack>
        )}
      </Stack>

      <Group
        justify="space-between"
        mt="lg"
        style={mobile ? { position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: 'white', borderTop: '1px solid var(--mantine-color-gray-3)' } : undefined}
      >
        {etape > 0 && etape < 3 ? (
          <Button variant="default" leftSection={<IconArrowLeft size={18} />} onClick={() => setEtape(etape - 1)} disabled={encaisser.isPending}>
            Retour
          </Button>
        ) : <span />}
        {etape === 1 && (
          <Button rightSection={<IconArrowRight size={18} />} onClick={allerMontant} disabled={!moisChoisis.length && totalChoisi === 0 && dues.length > 0}>
            Suivant
          </Button>
        )}
        {etape === 2 && (
          <Button leftSection={<IconCheck size={18} />} onClick={enregistrer} loading={encaisser.isPending} disabled={!peutValiderMontant}>
            Enregistrer et faire le reçu
          </Button>
        )}
        {etape === 3 && <Button onClick={onFermer}>Terminer</Button>}
      </Group>
    </Modal>
  );
}

function EtapeQui({ baux, chargement, onChoisir }: {
  baux: BailEncaissable[];
  chargement: boolean;
  onChoisir: (b: BailEncaissable) => void;
}) {
  const [q, setQ] = useState('');
  const liste = useMemo(() => {
    const r = sansAccents(q.trim());
    return baux.filter((b) => !r || sansAccents(`${b.nom} ${b.maison} ${b.logement} ${b.telephone ?? ''}`).includes(r));
  }, [baux, q]);
  if (chargement) return <Loader mx="auto" />;
  return (
    <Stack gap="xs">
      <TextInput leftSection={<IconSearch size={18} />} placeholder="Tapez un nom, une maison…" value={q}
        onChange={(e) => setQ(e.currentTarget.value)} data-autofocus size="md" />
      {!liste.length && <Text c="dimmed" ta="center" py="md">Aucun locataire trouvé.</Text>}
      <ScrollArea.Autosize mah="55vh">
        <Stack gap="xs">
          {liste.map((b) => (
            <UnstyledButton key={b.bail_id} onClick={() => onChoisir(b)}>
              <Card withBorder radius="md" padding="sm">
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700} truncate>{b.nom}{b.parti ? ' (parti)' : ''}</Text>
                    <Text size="sm" c="dimmed" truncate>{b.maison} · {b.logement}</Text>
                  </div>
                  <StatutBadge statut={b.situation.statut} nbMois={b.situation.nb_mois_retard} />
                </Group>
              </Card>
            </UnstyledButton>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}

function EtapeMois({ bail, echeances, dernierPaye, proposees, chargement, choisis, onChoisir, total }: {
  bail: BailEncaissable;
  echeances: { mois: string; reste: number; statut: string }[];
  dernierPaye: string | null;
  proposees: { mois: string; reste: number; statut: string }[];
  chargement: boolean;
  choisis: string[];
  onChoisir: (m: string[]) => void;
  total: number;
}) {
  if (chargement) return <Loader mx="auto" />;
  const dues = echeances.filter((e) => e.reste > 0);
  const moisDus = new Set(dues.map((e) => e.mois));
  const anciens = dernierPaye ? dues.filter((e) => e.mois < dernierPaye).length : 0;
  const options = [1, 2, 3].filter((n) => n <= proposees.length).map((n) => proposees.slice(0, n).map((e) => e.mois));
  const libelle = (l: string[]) => l.map((m) => formatMois(m, { majuscule: true })).join(' + ');
  const egal = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

  return (
    <Stack gap="xs">
      <Text c="dimmed">
        Dernier mois payé : <b>{dernierPaye ? formatMois(dernierPaye) : 'aucun'}</b>
        {' · '}Loyer : <b>{formatLoyer(bail.situation.loyer, bail.situation.entretien)}</b>
      </Text>
      {!dues.length && <Alert color="green">Ce locataire est à jour sur les 12 prochains mois.</Alert>}
      {options.map((o) => (
        <UnstyledButton key={o.join()} onClick={() => onChoisir(o)}>
          <Card withBorder radius="md" padding="sm"
            style={egal(o, choisis) ? { borderColor: 'var(--mantine-color-espace-filled)', background: 'var(--mantine-color-espace-0)', borderWidth: 2 } : undefined}>
            <Group justify="space-between">
              <Text fw={600}>{libelle(o)}</Text>
              <Group gap="xs">
                <Text fw={700} className="montant">{formatFCFA(echeances.filter((e) => o.includes(e.mois)).reduce((s, e) => s + e.reste, 0))}</Text>
                {egal(o, choisis) && <IconCheck size={18} color="var(--mantine-color-espace-filled)" />}
              </Group>
            </Group>
          </Card>
        </UnstyledButton>
      ))}
      {dues.length > 0 && (
        // Choix libre : n'importe quel mois encore dû, dans le calendrier (plusieurs possibles)
        <MonthPickerInput
          type="multiple"
          label="Ou choisissez le ou les mois dans le calendrier"
          description={anciens > 0 ? `${anciens} mois plus ancien${anciens > 1 ? 's' : ''} non payé${anciens > 1 ? 's' : ''} : ${anciens > 1 ? 'ils sont' : 'il est'} aussi dans le calendrier.` : undefined}
          placeholder="Touchez pour ouvrir le calendrier"
          leftSection={<IconCalendar size={18} />}
          value={choisis}
          onChange={(v) => onChoisir([...v].sort())}
          valueFormat="MMMM YYYY"
          minDate={dues[0].mois}
          maxDate={dues[dues.length - 1].mois}
          defaultDate={choisis[0] ?? dues[0].mois}
          getMonthControlProps={(d) => ({ disabled: !moisDus.has(dayjs(d).startOf('month').format('YYYY-MM-DD')) })}
          dropdownType="modal"
          size="md"
        />
      )}
      {choisis.length > 0 && <Text ta="right" fw={700}>Total : {formatFCFA(total)}</Text>}
    </Stack>
  );
}
