import { useState } from 'react';
import { Badge, Card, Group, Pagination, SegmentedControl, Skeleton, Stack, Table, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { IconReceipt, IconSearch } from '@tabler/icons-react';
import { dayjs } from '@/lib/dates';
import { formatDate, formatFCFA, formatMois } from '@/lib/format';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { ActionsRecu } from './ActionsRecu';
import { TAILLE_PAGE, useRecus, type LigneRecu } from './api';
import { BoutonPersonnaliser } from '@/perso/Personnaliser';
import { useAffichage, type DefColonne } from '@/perso/useAffichage';

const COLONNES: DefColonne[] = [
  { cle: 'numero', libelle: 'Numéro du reçu', mobile: true },
  { cle: 'locataire', libelle: 'Locataire', essentiel: true },
  { cle: 'logement', libelle: 'Logement' },
  { cle: 'periode', libelle: 'Mois payés', mobile: true },
  { cle: 'montant', libelle: 'Montant', essentiel: true },
  { cle: 'emis_le', libelle: "Date d'émission" },
  { cle: 'statut', libelle: 'Annulé ou duplicata', mobile: true },
];

const TYPES: Record<string, string> = { loyer: 'Loyer', caution: 'Caution', restitution: 'Restitution' };

export function RecusPage() {
  const mobile = useMediaQuery('(max-width: 48em)');
  const [recherche, setRecherche] = useState('');
  const [rechercheDiff] = useDebouncedValue(recherche, 300);
  const [type, setType] = useState('tous');
  const [periode, setPeriode] = useState<[string | null, string | null]>([null, null]);
  const [page, setPage] = useState(0);
  const affichage = useAffichage('recus', [], COLONNES);
  const voir = affichage.colonne;
  const { data, isLoading } = useRecus({
    recherche: rechercheDiff,
    type: type === 'tous' ? null : type,
    debut: periode[0] ? dayjs(periode[0]).format('YYYY-MM-DD') : null,
    fin: periode[1] ? dayjs(periode[1]).format('YYYY-MM-DD') : null,
    page,
  });

  const periodeTexte = (r: LigneRecu) =>
    r.type === 'loyer' ? r.contenu.mois.map((m) => formatMois(m)).join(', ') : TYPES[r.type];
  const statut = (r: LigneRecu) => r.annule
    ? <Badge color="red" variant="light">Annulé</Badge>
    : r.nb_duplicatas > 0 ? <Badge color="gray" variant="light">{r.nb_duplicatas} duplicata{r.nb_duplicatas > 1 ? 's' : ''}</Badge> : null;

  return (
    <>
      <PageEntete titre="Reçus" sousTitre={data ? `${data.total} reçu${data.total > 1 ? 's' : ''}` : undefined}
        actions={<BoutonPersonnaliser affichage={affichage} titreColonnes={mobile ? 'Informations affichées' : 'Colonnes affichées'} />} />
      <Stack gap="sm" mb="md">
        <TextInput leftSection={<IconSearch size={18} />} placeholder="Numéro de reçu ou nom du locataire"
          value={recherche} onChange={(e) => { setRecherche(e.currentTarget.value); setPage(0); }} />
        <Group gap="sm">
          <SegmentedControl value={type} onChange={(v) => { setType(v); setPage(0); }}
            data={[{ value: 'tous', label: 'Tous' }, { value: 'loyer', label: 'Loyers' }, { value: 'caution', label: 'Cautions' }, { value: 'restitution', label: 'Restitutions' }]} />
          <DatePickerInput type="range" placeholder="Toutes les dates" value={periode} clearable
            onChange={(v) => { setPeriode(v as [string | null, string | null]); setPage(0); }} valueFormat="DD/MM/YYYY" w={260} />
        </Group>
      </Stack>

      {isLoading ? <Skeleton h={240} /> : !data?.lignes.length ? (
        <EtatVide icone={<IconReceipt size={30} />} titre="Aucun reçu" message="Les reçus apparaissent ici après chaque encaissement." />
      ) : mobile ? (
        <Stack gap="xs">
          {data.lignes.map((r) => (
            <Card key={r.id} withBorder radius="md" padding="sm">
              <Group justify="space-between" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Text fw={700} truncate>{r.contenu.locataire.nom_complet}</Text>
                  {(voir('numero') || voir('periode')) && (
                    <Text size="sm" c="dimmed" truncate>{[voir('numero') && r.numero, voir('periode') && periodeTexte(r)].filter(Boolean).join(' · ')}</Text>
                  )}
                  {(voir('logement') || voir('emis_le')) && (
                    <Text size="xs" c="dimmed" truncate>
                      {[voir('logement') && `${r.contenu.logement.immeuble} · ${r.contenu.logement.designation}`, voir('emis_le') && `émis le ${formatDate(r.emis_le)}`].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  {voir('statut') && statut(r)}
                </div>
                <Group gap={6} wrap="nowrap">
                  <Text fw={700} className="montant">{formatFCFA(r.contenu.montant)}</Text>
                  <ActionsRecu recu={r} telephone={r.contenu.locataire.telephone} etat={{ annule: r.annule }} />
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card withBorder radius="lg" p={0}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {voir('numero') && <Table.Th>N°</Table.Th>}<Table.Th>Locataire</Table.Th>
                {voir('logement') && <Table.Th>Logement</Table.Th>}{voir('periode') && <Table.Th>Période</Table.Th>}
                <Table.Th>Montant</Table.Th>{voir('emis_le') && <Table.Th>Émis le</Table.Th>}{voir('statut') && <Table.Th>Statut</Table.Th>}<Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.lignes.map((r) => (
                <Table.Tr key={r.id} style={r.annule ? { opacity: 0.6 } : undefined}>
                  {voir('numero') && <Table.Td ff="monospace">{r.numero}</Table.Td>}
                  <Table.Td fw={600}>{r.contenu.locataire.nom_complet}</Table.Td>
                  {voir('logement') && <Table.Td>{r.contenu.logement.immeuble} · {r.contenu.logement.designation}</Table.Td>}
                  {voir('periode') && <Table.Td>{periodeTexte(r)}</Table.Td>}
                  <Table.Td className="montant" fw={700}>{formatFCFA(r.contenu.montant)}</Table.Td>
                  {voir('emis_le') && <Table.Td>{formatDate(r.emis_le)}</Table.Td>}
                  {voir('statut') && <Table.Td>{statut(r)}</Table.Td>}
                  <Table.Td><ActionsRecu recu={r} telephone={r.contenu.locataire.telephone} etat={{ annule: r.annule }} /></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
      {!!data && data.total > TAILLE_PAGE && (
        <Group justify="center" mt="md">
          <Pagination total={Math.ceil(data.total / TAILLE_PAGE)} value={page + 1} onChange={(p) => setPage(p - 1)} />
        </Group>
      )}
    </>
  );
}
