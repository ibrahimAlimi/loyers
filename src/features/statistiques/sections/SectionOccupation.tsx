import { Progress, SimpleGrid, Stack, Text, Group } from '@mantine/core';
import { formatDate, formatFCFA, LIBELLE_TYPE_LOGEMENT } from '@/lib/format';
import type { StatsCompletes } from '../api';
import { CarteChiffre } from '../CarteChiffre';
import { GraphiqueEntreesSorties, GraphiqueOccupation } from '../graphiques';
import { Bloc, duree, TableauSimple } from './commun';

export function BlocOccupation({ s }: { s: StatsCompletes }) {
  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }}>
      <Bloc titre="Occupation par type de logement">
        {!s.occupation_par_type.length && <Text c="dimmed">Aucun logement.</Text>}
        <Stack gap="sm">
          {s.occupation_par_type.map((t) => {
            const taux = t.total ? Math.round((100 * t.occupes) / t.total) : 0;
            return (
              <div key={t.type}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={600}>{LIBELLE_TYPE_LOGEMENT[t.type] ?? t.type}</Text>
                  <Text size="sm">{t.occupes} / {t.total} occupés · <b>{taux} %</b></Text>
                </Group>
                <Progress value={taux} size="lg" radius="xl" color="#2a78d6" aria-label={`${taux} %`} />
              </div>
            );
          })}
        </Stack>
      </Bloc>
      <Bloc titre="Évolution de l'occupation" sousTitre="Sur les 12 derniers mois">
        <GraphiqueOccupation donnees={s.occupation_12_mois} />
      </Bloc>
    </SimpleGrid>
  );
}

export function BlocLibres({ s }: { s: StatsCompletes }) {
  return (
    <Stack>
      <SimpleGrid cols={{ base: 2, md: 3 }} spacing="sm">
        <CarteChiffre libelle="Logements libres" valeur={s.logements_libres.length} />
        <CarteChiffre libelle="Durée moyenne de vacance" valeur={duree(s.vacance_moyenne_jours)}
          aide="Depuis combien de temps, en moyenne, les logements libres sont vides." />
        <CarteChiffre libelle="Manque à gagner" valeur={formatFCFA(s.manque_a_gagner_mois)} detail="par mois"
          couleur={s.manque_a_gagner_mois > 0 ? 'orange.8' : undefined}
          aide="Somme des loyers des logements libres (loyer de référence, sinon le dernier loyer)." />
      </SimpleGrid>
      <Bloc titre="Logements libres, et depuis quand">
        {s.logements_libres.length ? (
          <TableauSimple droite={[3, 4]} entetes={['Logement', 'Type', 'Libre depuis', 'Durée', 'Loyer estimé']}
            lignes={s.logements_libres.map((l) => [
              `${l.maison} · ${l.logement}`, LIBELLE_TYPE_LOGEMENT[l.type] ?? l.type,
              l.libre_depuis ? formatDate(l.libre_depuis) : 'Jamais loué', duree(l.jours),
              l.loyer_estime ? formatFCFA(l.loyer_estime) : '—',
            ])} />
        ) : <Text c="dimmed">Tous les logements sont occupés. 🎉</Text>}
      </Bloc>
    </Stack>
  );
}

export function BlocEntreesSorties({ s }: { s: StatsCompletes }) {
  const entrees = s.entrees_sorties.reduce((t, m) => t + m.entrees, 0);
  const sorties = s.entrees_sorties.reduce((t, m) => t + m.sorties, 0);
  return (
    <Bloc titre="Entrées et sorties de locataires" sousTitre={`${entrees} entrée${entrees > 1 ? 's' : ''}, ${sorties} sortie${sorties > 1 ? 's' : ''}`}>
      <GraphiqueEntreesSorties donnees={s.entrees_sorties} />
    </Bloc>
  );
}
