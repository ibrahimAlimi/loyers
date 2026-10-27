import { useMemo, useState } from 'react';
import { Button, Group, SimpleGrid, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { formatDate, formatFCFA, LIBELLE_MODE } from '@/lib/format';
import type { StatsCompletes } from '../api';
import { BarresHorizontales, GraphiqueMois } from '../graphiques';
import { Bloc, TableauSimple } from './commun';

export function BlocParMois({ s }: { s: StatsCompletes }) {
  return (
    <Bloc titre="Attendu et encaissé, par mois" sousTitre="En FCFA">
      <GraphiqueMois donnees={s.par_mois} />
    </Bloc>
  );
}

export function BlocParMaison({ s }: { s: StatsCompletes }) {
  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }}>
      <Bloc titre="Encaissé par maison">
        {s.par_maison.length ? (
          <BarresHorizontales nomSerie="Encaissé"
            donnees={[...s.par_maison].sort((a, b) => b.encaisse - a.encaisse).map((m) => ({ libelle: m.nom, valeur: m.encaisse }))} />
        ) : <Text c="dimmed">Aucune maison.</Text>}
      </Bloc>
      <Bloc titre="Encaissé par logement" sousTitre="Les 10 premiers">
        {s.par_logement.length ? (
          <BarresHorizontales nomSerie="Encaissé"
            donnees={s.par_logement.slice(0, 10).map((l) => ({ libelle: `${l.logement} (${l.maison})`, valeur: l.encaisse }))} />
        ) : <Text c="dimmed">Aucun encaissement sur la période.</Text>}
      </Bloc>
    </SimpleGrid>
  );
}

export function BlocParMode({ s }: { s: StatsCompletes }) {
  const total = s.par_mode.reduce((t, m) => t + m.montant, 0);
  return (
    <Bloc titre="Répartition par mode de paiement">
      {s.par_mode.length ? (
        <>
          <BarresHorizontales nomSerie="Encaissé"
            donnees={s.par_mode.map((m) => ({ libelle: LIBELLE_MODE[m.mode] ?? m.mode, valeur: m.montant }))} />
          <Group gap="lg" mt="xs">
            {s.par_mode.map((m) => (
              <Text key={m.mode} size="sm">
                <b>{LIBELLE_MODE[m.mode] ?? m.mode}</b> : {total ? Math.round((100 * m.montant) / total) : 0} % · {m.nb} paiement{m.nb > 1 ? 's' : ''}
              </Text>
            ))}
          </Group>
        </>
      ) : <Text c="dimmed">Aucun encaissement sur la période.</Text>}
    </Bloc>
  );
}

export function BlocJournal({ s }: { s: StatsCompletes }) {
  const [recherche, setRecherche] = useState('');
  const [nb, setNb] = useState(20);
  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return q ? s.journal.filter((p) => [p.locataire, p.maison, p.logement, p.payeur, p.recu, p.encaissant, p.reference]
      .some((v) => v?.toLowerCase().includes(q))) : s.journal;
  }, [s.journal, recherche]);
  return (
    <Bloc titre="Journal des encaissements" sousTitre={`${s.journal.length} paiement${s.journal.length > 1 ? 's' : ''} sur la période`}
      actions={<TextInput size="xs" w={220} placeholder="Chercher un nom, un reçu…" leftSection={<IconSearch size={14} />}
        value={recherche} onChange={(e) => setRecherche(e.currentTarget.value)} />}>
      {lignes.length ? (
        <>
          <TableauSimple minWidth={760} droite={[4]}
            entetes={['Date', 'Locataire', 'Logement', 'Mode', 'Montant', 'Encaissé par', 'Reçu']}
            lignes={lignes.slice(0, nb).map((p) => [
              formatDate(p.date), p.locataire, `${p.maison} · ${p.logement}`, LIBELLE_MODE[p.mode] ?? p.mode,
              <>{formatFCFA(p.montant)}{p.remise ? <Text size="xs" c="dimmed">remise {formatFCFA(p.remise)}</Text> : null}</>,
              p.encaissant ?? '—', p.recu ?? '—',
            ])} />
          {lignes.length > nb && (
            <Group justify="center" mt="sm"><Button variant="subtle" onClick={() => setNb(nb + 50)}>Voir plus ({lignes.length - nb} restants)</Button></Group>
          )}
        </>
      ) : <Text c="dimmed">Aucun encaissement.</Text>}
    </Bloc>
  );
}
