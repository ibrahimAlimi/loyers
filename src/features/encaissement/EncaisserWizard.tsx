import { useMemo, useState } from 'react';
import {
  Alert, Button, Card, Checkbox, Group, Loader, Modal, Progress, Radio, ScrollArea, SimpleGrid, Stack, Text,
  TextInput, Textarea, ThemeIcon, Title, UnstyledButton,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowLeft, IconArrowRight, IconBuildingBank, IconCash, IconCheck, IconCircleCheck, IconDeviceMobile,
  IconFileInvoice, IconSearch, IconWallet,
} from '@tabler/icons-react';
import { aujourdhui, dayjs } from '@/lib/dates';
import { formatFCFA, formatMois, LIBELLE_MODE } from '@/lib/format';
import { messageErreur } from '@/lib/erreurs';
import type { ModePaiement, Recu } from '@/lib/types';
import { MontantInput } from '@/ui/MontantInput';
import { StatutBadge } from '@/ui/StatutBadge';
import { BoutonsRecu } from '@/features/recus/ActionsRecu';
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
  const [date, setDate] = useState<string | null>(aujourdhui());
  const [reste, setReste] = useState<'partiel' | 'remise'>('partiel');
  const [motifRemise, setMotifRemise] = useState('');
  const [cle] = useState(() => crypto.randomUUID());
  const [recu, setRecu] = useState<Recu | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const encaisser = useEncaisserMutation();

  const bail = baux.find((b) => b.bail_id === bailId) ?? null;
  const { data: echeances = [], isLoading: chargeEch } = useEcheances(bailId);
  const dues = echeances.filter((e) => e.reste > 0);
  const totalMois = (liste: string[]) => echeances.filter((e) => liste.includes(e.mois)).reduce((s, e) => s + e.reste, 0);
  const moisChoisis = mois ?? dues.slice(0, 1).map((e) => e.mois);
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
        mois: moisChoisis, reste: montant < totalChoisi ? reste : 'partiel', motifRemise, cle, remplace: pre?.remplacePaiementId,
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
      title={<Text fw={700} c="espace" size="sm">ÉTAPE {etape + 1} SUR 4{bail ? ` · ${bail.nom} — ${bail.maison}, ${bail.logement}` : ''}</Text>}
    >
      <Stack gap="md" pb={mobile ? 90 : 0}>
        <Progress value={((etape + 1) / 4) * 100} size="sm" radius="xl" />
        <Title order={2} size="h3">{titres[etape]}</Title>

        {etape === 0 && <EtapeQui baux={baux} chargement={isLoading} onChoisir={choisirBail} />}

        {etape === 1 && bail && (
          <EtapeMois
            bail={bail}
            echeances={echeances}
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
              <DateInput label="Date du paiement" value={date} onChange={setDate} maxDate={dayjs(aujourdhui()).toDate()} />
            </SimpleGrid>
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
            <BoutonsRecu recu={recu} telephone={bail?.telephone ?? null} />
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

function EtapeMois({ bail, echeances, chargement, choisis, onChoisir, total }: {
  bail: BailEncaissable;
  echeances: { mois: string; reste: number; statut: string }[];
  chargement: boolean;
  choisis: string[];
  onChoisir: (m: string[]) => void;
  total: number;
}) {
  const [autre, setAutre] = useState(false);
  if (chargement) return <Loader mx="auto" />;
  const dues = echeances.filter((e) => e.reste > 0);
  const options = [1, 2, 3].filter((n) => n <= dues.length).map((n) => dues.slice(0, n).map((e) => e.mois));
  const libelle = (l: string[]) => l.map((m) => formatMois(m, { majuscule: true })).join(' + ');
  const egal = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

  return (
    <Stack gap="xs">
      <Text c="dimmed">
        Dernier mois payé : <b>{bail.situation.dernier_mois_solde ? formatMois(bail.situation.dernier_mois_solde) : 'aucun'}</b>
        {' · '}Loyer : <b>{formatFCFA(bail.situation.loyer)}</b>
      </Text>
      {!dues.length && <Alert color="green">Ce locataire est à jour sur les 12 prochains mois.</Alert>}
      {!autre && options.map((o) => (
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
      <Button variant="subtle" onClick={() => setAutre((a) => !a)}>{autre ? '← Choix rapides' : 'Autre…'}</Button>
      {autre && (
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
          {dues.slice(0, 24).map((e) => (
            <Checkbox.Card key={e.mois} radius="md" p="sm" checked={choisis.includes(e.mois)}
              onClick={() => onChoisir(choisis.includes(e.mois) ? choisis.filter((m) => m !== e.mois) : [...choisis, e.mois].sort())}>
              <Group wrap="nowrap" gap="xs">
                <Checkbox.Indicator />
                <div>
                  <Text size="sm" fw={600}>{formatMois(e.mois, { majuscule: true })}</Text>
                  <Text size="xs" c="dimmed" className="montant">{formatFCFA(e.reste)}{e.statut === 'partiel' ? ' (reste)' : ''}</Text>
                </div>
              </Group>
            </Checkbox.Card>
          ))}
        </SimpleGrid>
      )}
      {choisis.length > 0 && <Text ta="right" fw={700}>Total : {formatFCFA(total)}</Text>}
    </Stack>
  );
}
