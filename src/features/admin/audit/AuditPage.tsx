import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Badge, Button, Card, Code, Group, Modal, Pagination, Select, SimpleGrid, Skeleton, Stack, Table, Tabs, Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconDownload, IconSearch, IconTrash } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { journaliser } from '@/lib/audit';
import { dayjs } from '@/lib/dates';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { formatDateHeure } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { PageEntete } from '@/layout/PageEntete';
import { useEspacesAdmin } from '../api';
import {
  TAILLE_PAGE_AUDIT, toutCharger, useComptes, useHistorique, useJournal, useTailleJournaux,
  type EntreeHistorique, type EntreeJournal, type FiltresAudit,
} from './api';
import { libelleChamp, LIBELLE_ACTION, LIBELLE_OPERATION, LIBELLE_TABLE, nomLigne, valeurLisible } from './libelles';
import { ListeHistorique } from './ListeHistorique';

type Onglet = 'journal' | 'historique';
const VIDE: FiltresAudit = { espace: null, utilisateur: null, action: null, debut: null, fin: null, recherche: '' };
const options = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export function AuditPage() {
  const [onglet, setOnglet] = useState<Onglet>('journal');
  const [filtres, setFiltres] = useState<FiltresAudit>(VIDE);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<EntreeJournal | null>(null);
  const [purge, setPurge] = useState(false);
  const [export_, setExport] = useState(false);
  const { data: espaces = [] } = useEspacesAdmin();
  const { data: comptes = [] } = useComptes();
  const journal = useJournal(filtres, page);
  const historique = useHistorique(filtres, page);
  const taille = useTailleJournaux(true);
  const nomsEspaces = useMemo(() => new Map(espaces.map((e) => [e.id, e.nom])), [espaces]);

  useEffect(() => { journaliser('consultation_audit'); }, []);

  const maj = (p: Partial<FiltresAudit>) => { setFiltres({ ...filtres, ...p }); setPage(0); };
  const courant = onglet === 'journal' ? journal : historique;
  const total = courant.data?.total ?? 0;

  const exporter = async () => {
    setExport(true);
    try {
      const { default: writeXlsxFile } = await import('write-excel-file/browser');
      const t = (v: unknown) => ({ value: v == null ? '' : String(v), type: String });
      const d = (v: string) => ({ value: new Date(v), type: Date, format: 'dd/mm/yyyy hh:mm' });
      const gras = (l: string[]) => l.map((value) => ({ value, fontWeight: 'bold' as const }));
      let data: unknown[][];
      if (onglet === 'journal') {
        const lignes = await toutCharger<EntreeJournal>('journal', filtres);
        data = [gras(['Date', 'Compte', 'Identifiant', 'Espace', 'Action', 'Réussi', 'Élément', 'Détails', 'Appareil', 'Adresse IP', 'Navigateur']),
          ...lignes.map((l) => [d(l.le), t(l.profil?.nom_complet), t(l.identifiant), t(l.espace_id ? nomsEspaces.get(l.espace_id) : ''),
            t(LIBELLE_ACTION[l.action] ?? l.action), t(l.reussi ? 'Oui' : 'Non'), t(l.libelle), t(l.details ? JSON.stringify(l.details) : ''),
            t(l.appareil), t(l.ip), t(l.navigateur)])];
      } else {
        const lignes = await toutCharger<EntreeHistorique>('historique', filtres);
        data = [gras(['Date', 'Auteur', 'Espace', 'Élément', 'Nom', 'Opération', 'Champ', 'Avant', 'Après', 'Appareil', 'Adresse IP']),
          ...lignes.flatMap((e) => {
            const champs = e.operation === 'update' ? e.champs_modifies ?? [] : [''];
            return champs.map((c) => [d(e.le), t(e.auteur?.nom_complet ?? 'Système'), t(e.espace_id ? nomsEspaces.get(e.espace_id) : ''),
              t(LIBELLE_TABLE[e.table_nom] ?? e.table_nom), t(nomLigne(e)), t(LIBELLE_OPERATION[e.operation]),
              t(c ? libelleChamp(c) : ''), t(c ? valeurLisible(e.avant?.[c]) : ''), t(c ? valeurLisible(e.apres?.[c]) : ''),
              t(e.appareil), t(e.ip)]);
          })];
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await writeXlsxFile(data as any).toFile(`${onglet === 'journal' ? 'journal-audit' : 'historique-modifications'}-${dayjs().format('YYYY-MM-DD')}.xlsx`);
      journaliser('export_audit', { details: { onglet, lignes: data.length - 1 } });
    } catch (e) {
      notifierErreur(e);
    } finally {
      setExport(false);
    }
  };

  return (
    <>
      <PageEntete titre="Journal d'audit" sousTitre="Qui a fait quoi, quand et d'où. Réservé à l'administrateur."
        actions={<>
          <Button variant="light" leftSection={<IconDownload size={18} />} loading={export_} onClick={exporter}>Exporter (Excel)</Button>
          <Button variant="subtle" color="red" leftSection={<IconTrash size={18} />} onClick={() => setPurge(true)}>Purger</Button>
        </>} />

      {taille.data && (
        <Text size="sm" c="dimmed" mb="sm">
          Journal : {taille.data.audit.lignes.toLocaleString('fr-FR')} entrées ({taille.data.audit.taille}) ·
          Historique : {taille.data.historique.lignes.toLocaleString('fr-FR')} entrées ({taille.data.historique.taille})
        </Text>
      )}

      <Tabs value={onglet} onChange={(v) => { setOnglet(v as Onglet); setFiltres({ ...filtres, action: null }); setPage(0); }} mb="md">
        <Tabs.List>
          <Tabs.Tab value="journal">Actions</Tabs.Tab>
          <Tabs.Tab value="historique">Modifications (avant / après)</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Card withBorder radius="lg" padding="sm" mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="sm">
          <Select label="Espace" placeholder="Tous" clearable searchable value={filtres.espace}
            data={espaces.map((e) => ({ value: e.id, label: e.nom }))} onChange={(v) => maj({ espace: v })} />
          <Select label="Compte" placeholder="Tous" clearable searchable value={filtres.utilisateur}
            data={comptes.map((c) => ({ value: c.id, label: `${c.nom_complet} (${c.identifiant})` }))} onChange={(v) => maj({ utilisateur: v })} />
          <Select label={onglet === 'journal' ? "Type d'action" : "Type d'élément"} placeholder="Tous" clearable searchable value={filtres.action}
            data={onglet === 'journal' ? options(LIBELLE_ACTION) : options(LIBELLE_TABLE)} onChange={(v) => maj({ action: v })} />
          <DatePickerInput type="range" label="Période" placeholder="Toutes les dates" clearable valueFormat="DD/MM/YYYY"
            value={[filtres.debut, filtres.fin]}
            onChange={(v) => maj({ debut: v[0] ? dayjs(v[0]).format('YYYY-MM-DD') : null, fin: v[1] ? dayjs(v[1]).format('YYYY-MM-DD') : null })} />
          {onglet === 'journal' && (
            <TextInput label="Chercher" placeholder="Élément, identifiant, appareil" leftSection={<IconSearch size={16} />}
              value={filtres.recherche} onChange={(e) => maj({ recherche: e.currentTarget.value })} />
          )}
        </SimpleGrid>
      </Card>

      {courant.error && <Alert color="red" mb="md">Le journal n'a pas pu être chargé. Vérifiez que la double authentification est validée.</Alert>}
      {courant.isLoading ? <Skeleton h={300} /> : onglet === 'journal' ? (
        <Card withBorder radius="lg" p={0}>
          <Table.ScrollContainer minWidth={900}>
            <Table highlightOnHover verticalSpacing="xs" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th><Table.Th>Compte</Table.Th><Table.Th>Espace</Table.Th><Table.Th>Action</Table.Th>
                  <Table.Th>Élément</Table.Th><Table.Th>Appareil</Table.Th><Table.Th>Adresse IP</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(journal.data?.lignes ?? []).map((l) => (
                  <Table.Tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(l)}>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDateHeure(l.le)}</Table.Td>
                    <Table.Td>{l.profil?.nom_complet ?? l.identifiant ?? '—'}</Table.Td>
                    <Table.Td>{l.espace_id ? nomsEspaces.get(l.espace_id) ?? '—' : '—'}</Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        {LIBELLE_ACTION[l.action] ?? l.action}
                        {!l.reussi && <Badge color="red" variant="light" size="sm">Échec</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>{l.libelle ?? (l.cible_table ? LIBELLE_TABLE[l.cible_table] : '—')}</Table.Td>
                    <Table.Td>{l.appareil ?? '—'}</Table.Td>
                    <Table.Td ff="monospace">{l.ip ?? '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {!journal.data?.lignes.length && <Text c="dimmed" ta="center" py="lg">Aucune entrée.</Text>}
        </Card>
      ) : (
        <Card withBorder radius="lg" padding="md">
          <ListeHistorique lignes={historique.data?.lignes ?? []} nomsEspaces={nomsEspaces} />
        </Card>
      )}

      {total > TAILLE_PAGE_AUDIT && (
        <Group justify="center" mt="md">
          <Pagination total={Math.ceil(total / TAILLE_PAGE_AUDIT)} value={page + 1} onChange={(p) => setPage(p - 1)} />
        </Group>
      )}

      <Modal opened={!!detail} onClose={() => setDetail(null)} title="Détail de l'action" size="lg" radius="lg">
        {detail && (
          <Stack gap="xs">
            <Text><b>{LIBELLE_ACTION[detail.action] ?? detail.action}</b>{!detail.reussi && ' (échec)'} · {formatDateHeure(detail.le)}</Text>
            <Text size="sm">Compte : {detail.profil?.nom_complet ?? '—'} ({detail.identifiant ?? '—'})</Text>
            {detail.libelle && <Text size="sm">Élément : {detail.libelle}</Text>}
            <Text size="sm">Appareil : {detail.appareil ?? '—'} · Adresse IP : {detail.ip ?? '—'}</Text>
            {detail.navigateur && <Text size="xs" c="dimmed">{detail.navigateur}</Text>}
            {detail.details && <Code block>{JSON.stringify(detail.details, null, 2)}</Code>}
          </Stack>
        )}
      </Modal>

      {purge && <FenetrePurge onClose={() => setPurge(false)} onExporter={exporter} />}
    </>
  );
}

/** Purge des entrées anciennes, avec confirmation renforcée (taper SUPPRIMER). */
function FenetrePurge({ onClose, onExporter }: { onClose: () => void; onExporter: () => void }) {
  const qc = useQueryClient();
  const [quoi, setQuoi] = useState<'audit' | 'historique'>('audit');
  const [mois, setMois] = useState('12');
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const avant = dayjs().subtract(Number(mois), 'month').format('YYYY-MM-DD');

  const purger = async () => {
    setEnCours(true);
    try {
      const { data, error } = await supabase.rpc(quoi === 'audit' ? 'purger_audit' : 'purger_historique', { p_avant: avant });
      if (error) throw error;
      notifierSucces(`${data} entrée(s) supprimée(s) définitivement`);
      await qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('audit') || q.queryKey[0] === 'taille-journaux' });
      onClose();
    } catch (e) {
      notifierErreur(e);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Purger les entrées anciennes" radius="lg">
      <Stack>
        <Alert color="red">
          La suppression est <b>définitive</b> : ces entrées ne pourront pas être récupérées.
          Exportez-les d'abord si vous voulez les garder.
        </Alert>
        <Button variant="light" leftSection={<IconDownload size={16} />} onClick={onExporter}>Exporter d'abord (onglet affiché)</Button>
        <Select label="Quel journal ?" allowDeselect={false} value={quoi} onChange={(v) => setQuoi(v as typeof quoi)}
          data={[{ value: 'audit', label: 'Journal des actions' }, { value: 'historique', label: 'Historique des modifications' }]} />
        <Select label="Supprimer les entrées de plus de" allowDeselect={false} value={mois} onChange={(v) => setMois(v!)}
          data={[{ value: '3', label: '3 mois' }, { value: '6', label: '6 mois' }, { value: '12', label: '1 an' }, { value: '24', label: '2 ans' }]} />
        <Text size="sm">Tout ce qui est antérieur au <b>{dayjs(avant).format('DD/MM/YYYY')}</b> sera supprimé.</Text>
        <TextInput label="Pour confirmer, tapez SUPPRIMER" value={saisie} onChange={(e) => setSaisie(e.currentTarget.value)} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Annuler</Button>
          <Button color="red" disabled={saisie.trim() !== 'SUPPRIMER'} loading={enCours} onClick={purger}>Supprimer définitivement</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
