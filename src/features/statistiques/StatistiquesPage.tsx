import { useMemo, useState } from 'react';
import { Button, Card, Group, Select, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { aujourdhui, dayjs } from '@/lib/dates';
import { formatFCFA } from '@/lib/format';
import { PageEntete } from '@/layout/PageEntete';
import { StatutBadge } from '@/ui/StatutBadge';
import { useEncaisser } from '@/features/encaissement/EncaissementContext';
import { useBauxEncaissables } from '@/features/encaissement/api';
import { useMaisons } from '@/features/maisons/api';
import { CarteChiffre } from './CarteChiffre';
import { GraphiqueMois } from './GraphiqueMois';
import { useParMois, useResume } from './api';

type Preset = 'mois' | 'trimestre' | 'annee' | 'an_dernier' | 'libre';

function bornes(p: Preset, libre: [string | null, string | null]): [string, string] {
  const j = dayjs(aujourdhui());
  switch (p) {
    case 'mois': return [j.startOf('month').format('YYYY-MM-DD'), j.endOf('month').format('YYYY-MM-DD')];
    case 'trimestre': {
      const debut = j.month(Math.floor(j.month() / 3) * 3).startOf('month');
      return [debut.format('YYYY-MM-DD'), debut.add(2, 'month').endOf('month').format('YYYY-MM-DD')];
    }
    case 'an_dernier': return [j.subtract(1, 'year').startOf('year').format('YYYY-MM-DD'), j.subtract(1, 'year').endOf('year').format('YYYY-MM-DD')];
    case 'libre':
      if (libre[0] && libre[1]) return [dayjs(libre[0]).format('YYYY-MM-DD'), dayjs(libre[1]).format('YYYY-MM-DD')];
      return [j.startOf('year').format('YYYY-MM-DD'), j.endOf('year').format('YYYY-MM-DD')];
    default: return [j.startOf('year').format('YYYY-MM-DD'), j.endOf('year').format('YYYY-MM-DD')];
  }
}

export function StatistiquesPage() {
  const { role } = useEspaceCourant();
  const [preset, setPreset] = useState<Preset>('annee');
  const [libre, setLibre] = useState<[string | null, string | null]>([null, null]);
  const [maison, setMaison] = useState<string | null>(null);
  const [debut, fin] = useMemo(() => bornes(preset, libre), [preset, libre]);
  const { data: maisons = [] } = useMaisons();
  const resume = useResume(debut, fin, maison);
  const parMois = useParMois(preset === 'mois' ? dayjs(fin).subtract(11, 'month').format('YYYY-MM-DD') : debut, fin, maison);
  const { data: baux = [] } = useBauxEncaissables();
  const { ouvrir } = useEncaisser();
  const r = resume.data;
  const retards = baux
    .filter((b) => b.situation.montant_du > 0 && (!maison || b.situation.maison_id === maison))
    .sort((a, b) => b.situation.montant_du - a.situation.montant_du);

  return (
    <>
      <PageEntete titre="Statistiques" sousTitre={`Du ${dayjs(debut).format('DD/MM/YYYY')} au ${dayjs(fin).format('DD/MM/YYYY')}`} />
      <Group gap="sm" mb="md" align="flex-end">
        <Select label="Période" w={200} allowDeselect={false} value={preset} onChange={(v) => setPreset(v as Preset)}
          data={[
            { value: 'mois', label: 'Ce mois' }, { value: 'trimestre', label: 'Ce trimestre' },
            { value: 'annee', label: 'Cette année' }, { value: 'an_dernier', label: "L'an dernier" },
            { value: 'libre', label: 'Dates au choix' },
          ]} />
        {preset === 'libre' && (
          <DatePickerInput type="range" label="Dates" value={libre} onChange={(v) => setLibre(v as [string | null, string | null])}
            valueFormat="DD/MM/YYYY" w={260} />
        )}
        <Select label="Maison" w={220} placeholder="Toutes" clearable value={maison} onChange={setMaison}
          data={maisons.map((m) => ({ value: m.id, label: m.nom }))} />
        {(maison || preset !== 'annee') && (
          <Button variant="subtle" onClick={() => { setPreset('annee'); setMaison(null); }}>↺ Réinitialiser</Button>
        )}
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm" mb="md">
        <CarteChiffre chargement={resume.isLoading} libelle="💰 Encaissé" valeur={formatFCFA(r?.encaisse)}
          detail={r?.remises ? `dont remises accordées : ${formatFCFA(r.remises)}` : undefined} />
        <CarteChiffre chargement={resume.isLoading} libelle="📋 Attendu" valeur={formatFCFA(r?.attendu)}
          detail={r ? `${r.logements_occupes} logements loués` : undefined} />
        <CarteChiffre chargement={resume.isLoading} libelle="⏳ Reste à percevoir" valeur={formatFCFA(r?.reste_a_percevoir)}
          couleur={(r?.reste_a_percevoir ?? 0) > 0 ? 'orange.8' : undefined}
          detail={r ? `${r.nb_retards} locataire${r.nb_retards > 1 ? 's' : ''} en retard` : undefined} />
        <CarteChiffre chargement={resume.isLoading} libelle="📈 Recouvrement"
          valeur={r?.taux_recouvrement != null ? `${r.taux_recouvrement} %` : '—'}
          detail={r ? `Occupation : ${r.logements_occupes} / ${r.logements_total}` : undefined} />
      </SimpleGrid>

      <Card withBorder radius="lg" padding="lg" mb="md">
        <Title order={3} size="h4">Attendu et encaissé, par mois</Title>
        <Text size="sm" c="dimmed" mb="sm">En FCFA</Text>
        {parMois.isLoading ? <Skeleton h={260} /> : <GraphiqueMois donnees={parMois.data ?? []} />}
      </Card>

      <Card withBorder radius="lg" padding="lg">
        <Title order={3} size="h4" mb="sm">Loyers en retard</Title>
        {!retards.length && <Text c="dimmed">Personne n'est en retard. 🎉</Text>}
        <Stack gap={0}>
          {retards.map((b) => (
            <Group key={b.bail_id} justify="space-between" py="xs" wrap="nowrap" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
              <div style={{ minWidth: 0 }}>
                <Text fw={700} truncate>{b.nom}{b.parti ? ' (parti)' : ''}</Text>
                <Text size="sm" c="dimmed" truncate>{b.maison} · {b.logement}</Text>
              </div>
              <Group gap="xs" wrap="nowrap">
                <Stack gap={2} align="flex-end">
                  <Text fw={700} className="montant">{formatFCFA(b.situation.montant_du)}</Text>
                  <StatutBadge statut={b.situation.statut} nbMois={b.situation.nb_mois_retard} />
                </Stack>
                {peut('encaisser', role) && <Button size="xs" onClick={() => ouvrir({ bailId: b.bail_id })}>Encaisser</Button>}
              </Group>
            </Group>
          ))}
        </Stack>
      </Card>
    </>
  );
}
