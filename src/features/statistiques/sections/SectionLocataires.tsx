import { useState } from 'react';
import { Card, Group, SegmentedControl, SimpleGrid, Text } from '@mantine/core';
import { formatDate, formatFCFA, LIBELLE_ROLE } from '@/lib/format';
import type { Ponctualite, StatsCompletes } from '../api';
import { anciennete, BadgePonctualite, Bloc, duree, PONCTUALITE, TableauSimple } from './commun';

export function BlocPonctualite({ s }: { s: StatsCompletes }) {
  const [filtre, setFiltre] = useState<'tous' | Ponctualite>('tous');
  const compte = (p: Ponctualite) => s.locataires.filter((l) => l.ponctualite === p).length;
  const lignes = filtre === 'tous' ? s.locataires : s.locataires.filter((l) => l.ponctualite === filtre);
  return (
    <Bloc titre="Ponctualité des locataires" sousTitre="Délai moyen sur les 12 derniers mois et retards en cours">
      <SimpleGrid cols={{ base: 3 }} spacing="sm" mb="md">
        {(Object.keys(PONCTUALITE) as Ponctualite[]).map((p) => {
          const st = PONCTUALITE[p];
          return (
            <Card key={p} withBorder radius="md" padding="sm" style={{ borderLeft: `4px solid ${st.couleur}` }}>
              <Group gap={6} wrap="nowrap"><st.Icone size={16} color={st.couleur} /><Text size="sm" c="dimmed">{st.libelle}</Text></Group>
              <Text fw={800} size="lg">{compte(p)}</Text>
            </Card>
          );
        })}
      </SimpleGrid>
      <SegmentedControl size="xs" mb="sm" value={filtre} onChange={(v) => setFiltre(v as typeof filtre)}
        data={[{ value: 'tous', label: 'Tous' }, ...(Object.keys(PONCTUALITE) as Ponctualite[]).map((p) => ({ value: p, label: PONCTUALITE[p].libelle }))]} />
      <TableauSimple minWidth={820} droite={[3, 4, 5]}
        entetes={['Locataire', 'Logement', 'Ancienneté', 'Loyer', 'Caution', 'Délai moyen', 'Ponctualité']}
        lignes={lignes.map((l) => [
          l.locataire, `${l.maison} · ${l.logement}`, anciennete(l.mois_anciennete), formatFCFA(l.loyer),
          l.caution ? formatFCFA(l.caution) : '—', duree(l.delai_moyen), <BadgePonctualite p={l.ponctualite} />,
        ])} />
    </Bloc>
  );
}

export function BlocBaux({ s }: { s: StatsCompletes }) {
  const aReviser = s.locataires.filter((l) => l.a_reviser);
  const cautions = s.locataires.reduce((t, l) => t + l.caution, 0);
  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }}>
      <Bloc titre="Fins de bail à venir" sousTitre="Dans les 90 prochains jours">
        {s.fins_bail.length ? (
          <TableauSimple minWidth={420} entetes={['Locataire', 'Logement', 'Fin']}
            lignes={s.fins_bail.map((b) => [b.locataire, `${b.maison} · ${b.logement}`, formatDate(b.date_fin)])} />
        ) : <Text c="dimmed">Aucune fin de bail prévue.</Text>}
      </Bloc>
      <Bloc titre="Loyers à réviser" sousTitre={`Inchangés depuis 2 ans ou plus · cautions détenues : ${formatFCFA(cautions)}`}>
        {aReviser.length ? (
          <TableauSimple minWidth={420} droite={[2]} entetes={['Locataire', 'Depuis', 'Loyer']}
            lignes={aReviser.map((l) => [l.locataire, formatDate(l.derniere_revision), formatFCFA(l.loyer)])} />
        ) : <Text c="dimmed">Aucun loyer à réviser.</Text>}
      </Bloc>
    </SimpleGrid>
  );
}

export function BlocGestionnaires({ s }: { s: StatsCompletes }) {
  return (
    <Bloc titre="Qui a encaissé" sousTitre="Propriétaire et gestionnaires, sur la période">
      {s.gestionnaires.length ? (
        <TableauSimple minWidth={760} droite={[1, 2, 3, 4, 5, 6]}
          entetes={['Nom', 'Encaissé', 'Paiements', 'Reçus émis', 'Annulations demandées', 'Maisons gérées', 'Recouvrement']}
          lignes={s.gestionnaires.map((g) => [
            <>{g.nom ?? '—'}{g.role && <Text size="xs" c="dimmed">{LIBELLE_ROLE[g.role] ?? g.role}</Text>}</>,
            formatFCFA(g.encaisse), g.nb_paiements, g.recus_emis, g.annulations_demandees, g.nb_maisons || '—',
            g.recouvrement != null ? `${g.recouvrement} %` : '—',
          ])} />
      ) : <Text c="dimmed">Aucun encaissement sur la période.</Text>}
    </Bloc>
  );
}
