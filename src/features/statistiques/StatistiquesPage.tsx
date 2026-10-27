import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, Center, Group, Loader, Menu, SimpleGrid, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconChevronDown, IconDownload, IconFileSpreadsheet, IconFileTypePdf } from '@tabler/icons-react';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { formatFCFA, LIBELLE_MODE, LIBELLE_TYPE_LOGEMENT } from '@/lib/format';
import { notifierErreur } from '@/lib/erreurs';
import { PageEntete } from '@/layout/PageEntete';
import { useMaisons } from '@/features/maisons/api';
import { CarteChiffre, Ecart } from './CarteChiffre';
import { FILTRES_DEFAUT, FiltresBarre, type EtatFiltres } from './FiltresBarre';
import { useIndicateurs, useStats, type Indicateurs, type StatsCompletes } from './api';
import { bornes, bornesComparaison, libellePeriode } from './periodes';
import { TitreSection } from './sections/commun';
import { BlocJournal, BlocParMaison, BlocParMode, BlocParMois } from './sections/SectionEncaissements';
import { BlocAnciennete, BlocArrieresMaison, BlocDebiteurs } from './sections/SectionImpayes';
import { BlocEntreesSorties, BlocLibres, BlocOccupation } from './sections/SectionOccupation';
import { BlocBaux, BlocGestionnaires, BlocPonctualite } from './sections/SectionLocataires';

/**
 * Blocs de la page. Sur ordinateur tout s'affiche ; sur téléphone, seulement ceux marqués `mobile`,
 * les autres derrière « Voir toutes les statistiques ». (Le Lot 3 rendra ce choix personnalisable.)
 */
interface BlocStats {
  cle: string;
  section: 'encaissements' | 'impayes' | 'occupation' | 'locataires' | 'gestionnaires';
  mobile: boolean;
  rendu: (s: StatsCompletes) => ReactNode;
}

const BLOCS: BlocStats[] = [
  { cle: 'par_mois', section: 'encaissements', mobile: true, rendu: (s) => <BlocParMois s={s} /> },
  { cle: 'par_maison', section: 'encaissements', mobile: false, rendu: (s) => <BlocParMaison s={s} /> },
  { cle: 'par_mode', section: 'encaissements', mobile: false, rendu: (s) => <BlocParMode s={s} /> },
  { cle: 'journal', section: 'encaissements', mobile: false, rendu: (s) => <BlocJournal s={s} /> },
  { cle: 'anciennete', section: 'impayes', mobile: false, rendu: (s) => <BlocAnciennete s={s} /> },
  { cle: 'debiteurs', section: 'impayes', mobile: true, rendu: (s) => <BlocDebiteurs s={s} /> },
  { cle: 'arrieres_maison', section: 'impayes', mobile: false, rendu: (s) => <BlocArrieresMaison s={s} /> },
  { cle: 'occupation', section: 'occupation', mobile: false, rendu: (s) => <BlocOccupation s={s} /> },
  { cle: 'libres', section: 'occupation', mobile: false, rendu: (s) => <BlocLibres s={s} /> },
  { cle: 'entrees_sorties', section: 'occupation', mobile: false, rendu: (s) => <BlocEntreesSorties s={s} /> },
  { cle: 'ponctualite', section: 'locataires', mobile: false, rendu: (s) => <BlocPonctualite s={s} /> },
  { cle: 'baux', section: 'locataires', mobile: false, rendu: (s) => <BlocBaux s={s} /> },
  { cle: 'gestionnaires', section: 'gestionnaires', mobile: false, rendu: (s) => <BlocGestionnaires s={s} /> },
];

const SECTIONS: Record<BlocStats['section'], { titre: string; description: string }> = {
  encaissements: { titre: 'Encaissements', description: 'Ce qui est entré, où et comment.' },
  impayes: { titre: 'Impayés et retards', description: 'Qui doit encore, et depuis quand.' },
  occupation: { titre: 'Occupation', description: 'Logements loués, libres, entrées et sorties.' },
  locataires: { titre: 'Locataires', description: 'Ponctualité, ancienneté, cautions et baux.' },
  gestionnaires: { titre: 'Gestionnaires', description: 'Ce que chacun a encaissé.' },
};

export function StatistiquesPage() {
  const espace = useEspaceCourant();
  const mobile = useMediaQuery('(max-width: 48em)');
  const [etat, setEtat] = useState<EtatFiltres>(FILTRES_DEFAUT);
  const [toutVoir, setToutVoir] = useState(false);
  const [debut, fin] = useMemo(() => bornes(etat.preset, etat.libre), [etat.preset, etat.libre]);
  const comp = useMemo(() => bornesComparaison(debut, fin, etat.comparer), [debut, fin, etat.comparer]);
  const stats = useStats(debut, fin, etat.filtres);
  const precedent = useIndicateurs(comp, etat.filtres);
  const { data: maisons = [] } = useMaisons();
  const [export_, setExport] = useState<'pdf' | 'excel' | null>(null);

  const voitGestionnaires = espace.role !== 'gestionnaire';
  const gestionnaires = useMemo(() => {
    if (!voitGestionnaires) return null;
    const m = new Map<string, string>();
    for (const x of maisons) if (x.gestionnaire_id) m.set(x.gestionnaire_id, x.gestionnaire_nom ?? 'Gestionnaire');
    return [...m].map(([value, label]) => ({ value, label }));
  }, [maisons, voitGestionnaires]);

  const s = stats.data;
  const c = comp ? precedent.data ?? null : null;
  const periode = libellePeriode(debut, fin);
  const descriptionFiltres = [
    etat.filtres.maison && `Maison : ${maisons.find((m) => m.id === etat.filtres.maison)?.nom ?? ''}`,
    etat.filtres.type && `Type : ${LIBELLE_TYPE_LOGEMENT[etat.filtres.type]}`,
    etat.filtres.gestionnaire && `Gestionnaire : ${gestionnaires?.find((g) => g.value === etat.filtres.gestionnaire)?.label ?? ''}`,
    etat.filtres.mode && `Mode : ${LIBELLE_MODE[etat.filtres.mode]}`,
  ].filter(Boolean).join(' · ') || 'Toutes les maisons, tous les logements';

  const exporter = async (type: 'pdf' | 'excel') => {
    if (!s) return;
    setExport(type);
    try {
      const { exporterExcel, exporterPdf } = await import('./exports');
      await (type === 'pdf' ? exporterPdf : exporterExcel)(s, c, espace, debut, fin, periode, descriptionFiltres);
    } catch (e) {
      notifierErreur(e);
    } finally {
      setExport(null);
    }
  };

  const blocs = BLOCS.filter((b) => (b.section !== 'gestionnaires' || voitGestionnaires) && (!mobile || toutVoir || b.mobile));

  return (
    <>
      <PageEntete titre="Statistiques" sousTitre={`${periode[0].toUpperCase()}${periode.slice(1)}`}
        actions={
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button variant="light" leftSection={<IconDownload size={18} />} rightSection={<IconChevronDown size={14} />}
                loading={!!export_} disabled={!s}>Exporter</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconFileTypePdf size={18} />} onClick={() => exporter('pdf')}>Rapport PDF</Menu.Item>
              <Menu.Item leftSection={<IconFileSpreadsheet size={18} />} onClick={() => exporter('excel')}>Tableau Excel</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        } />

      <FiltresBarre etat={etat} onChange={setEtat} gestionnaires={gestionnaires}
        maisons={maisons.map((m) => ({ value: m.id, label: m.nom }))} />

      {stats.error && <Alert color="red" mb="md">Les statistiques n'ont pas pu être chargées. Vérifiez votre connexion et réessayez.</Alert>}

      <IndicateursCles i={s?.indicateurs} c={c} chargement={stats.isLoading} mobile={!!mobile && !toutVoir} />

      {!s ? (stats.isLoading && <Center py="xl"><Loader /></Center>) : (
        <Stack mt="md" style={{ opacity: stats.isPlaceholderData ? 0.6 : 1, transition: 'opacity .2s' }}>
          {blocs.map((b, n) => (
            <Stack key={b.cle} gap="sm">
              {(n === 0 || blocs[n - 1].section !== b.section) && (
                <TitreSection description={SECTIONS[b.section].description}>{SECTIONS[b.section].titre}</TitreSection>
              )}
              {b.rendu(s)}
            </Stack>
          ))}
          {mobile && (
            <Group justify="center">
              <Button variant="light" onClick={() => setToutVoir(!toutVoir)}>
                {toutVoir ? "Voir seulement l'essentiel" : 'Voir toutes les statistiques'}
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </>
  );
}

function IndicateursCles({ i, c, chargement, mobile }: {
  i: Indicateurs | undefined; c: Indicateurs | null; chargement: boolean; mobile: boolean;
}) {
  const fc = (v: number) => formatFCFA(v);
  const cartes: { cle: string; essentiel: boolean; carte: ReactNode }[] = [
    { cle: 'encaisse', essentiel: true, carte: (
      <CarteChiffre chargement={chargement} libelle="💰 Encaissé" valeur={formatFCFA(i?.encaisse)} couleur="espace"
        detail={i?.remises ? `dont remises : ${formatFCFA(i.remises)}` : i ? `${i.nb_paiements} paiement${i.nb_paiements > 1 ? 's' : ''}` : undefined}
        ecart={<Ecart actuel={i?.encaisse} precedent={c?.encaisse} formatValeur={fc} />}
        aide="Somme des paiements reçus pendant la période." />
    ) },
    { cle: 'attendu', essentiel: false, carte: (
      <CarteChiffre chargement={chargement} libelle="📋 Attendu" valeur={formatFCFA(i?.attendu)}
        ecart={<Ecart actuel={i?.attendu} precedent={c?.attendu} formatValeur={fc} />}
        aide="Somme des loyers dus pour les mois de la période." />
    ) },
    { cle: 'reste', essentiel: true, carte: (
      <CarteChiffre chargement={chargement} libelle="⏳ Reste à percevoir" valeur={formatFCFA(i?.reste_a_percevoir)}
        couleur={(i?.reste_a_percevoir ?? 0) > 0 ? 'orange.8' : undefined}
        detail={i ? `${i.nb_retards} locataire${i.nb_retards > 1 ? 's' : ''} en retard` : undefined}
        ecart={<Ecart actuel={i?.reste_a_percevoir} precedent={c?.reste_a_percevoir} hautEstBien={false} formatValeur={fc} />}
        aide="Tous les loyers encore dus à la fin de la période, y compris les anciens." />
    ) },
    { cle: 'recouvrement', essentiel: true, carte: (
      <CarteChiffre chargement={chargement} libelle="📈 Recouvrement" valeur={i?.taux_recouvrement != null ? `${i.taux_recouvrement} %` : '—'}
        detail="sur les mois déjà échus"
        ecart={<Ecart actuel={i?.taux_recouvrement} precedent={c?.taux_recouvrement} unite="points" />}
        aide="Part des loyers dus pour les mois de la période qui a été payée." />
    ) },
    { cle: 'occupation', essentiel: true, carte: (
      <CarteChiffre chargement={chargement} libelle="🏠 Occupation" valeur={i?.taux_occupation != null ? `${i.taux_occupation} %` : '—'}
        detail={i ? `${i.logements_occupes} / ${i.logements_total} logements` : undefined}
        ecart={<Ecart actuel={i?.taux_occupation} precedent={c?.taux_occupation} unite="points" />} />
    ) },
    { cle: 'delai', essentiel: false, carte: (
      <CarteChiffre chargement={chargement} libelle="⏱️ Délai moyen de paiement"
        valeur={i?.delai_moyen_jours == null ? '—' : i.delai_moyen_jours < 0 ? `${-i.delai_moyen_jours} j d'avance` : `${i.delai_moyen_jours} jours`}
        detail="après la date d'échéance"
        ecart={<Ecart actuel={i?.delai_moyen_jours} precedent={c?.delai_moyen_jours} hautEstBien={false} unite="jours" />}
        aide="Nombre moyen de jours entre l'échéance d'un mois et le paiement qui le solde." />
    ) },
    { cle: 'cautions', essentiel: false, carte: (
      <CarteChiffre chargement={chargement} libelle="🔒 Cautions détenues" valeur={formatFCFA(i?.cautions_detenues)}
        aide="Cautions versées moins cautions remboursées." />
    ) },
    { cle: 'prevision', essentiel: false, carte: (
      <CarteChiffre chargement={chargement} libelle="🔮 Prévision du mois suivant" valeur={formatFCFA(i?.prevision_mois_suivant)}
        aide="Somme des loyers des baux en cours pour le mois prochain." />
    ) },
  ];
  return (
    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
      {cartes.filter((x) => !mobile || x.essentiel).map((x) => <div key={x.cle}>{x.carte}</div>)}
    </SimpleGrid>
  );
}
