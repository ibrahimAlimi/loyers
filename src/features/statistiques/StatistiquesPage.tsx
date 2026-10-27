import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, Center, Group, Loader, Menu, SimpleGrid, Stack, Text } from '@mantine/core';
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
import { BoutonPersonnaliser } from '@/perso/Personnaliser';
import { useAffichage, type Affichage, type DefBloc, type DefColonne } from '@/perso/useAffichage';
import { BlocJournal, BlocParMaison, BlocParMode, BlocParMois } from './sections/SectionEncaissements';
import { BlocAnciennete, BlocArrieresMaison, BlocDebiteurs } from './sections/SectionImpayes';
import { BlocEntreesSorties, BlocLibres, BlocOccupation } from './sections/SectionOccupation';
import { BlocBaux, BlocGestionnaires, BlocPonctualite } from './sections/SectionLocataires';

interface BlocStats extends DefBloc {
  section: 'encaissements' | 'impayes' | 'occupation' | 'locataires' | 'gestionnaires';
  rendu: (s: StatsCompletes) => ReactNode;
}

// Sur ordinateur tout s'affiche ; sur téléphone, seulement les blocs `mobile` (l'utilisateur choisit le reste).
const BLOCS: BlocStats[] = [
  { cle: 'par_mois', libelle: 'Attendu et encaissé, par mois', section: 'encaissements', mobile: true, rendu: (s) => <BlocParMois s={s} /> },
  { cle: 'par_maison', libelle: 'Encaissé par maison et par logement', section: 'encaissements', rendu: (s) => <BlocParMaison s={s} /> },
  { cle: 'par_mode', libelle: 'Répartition par mode de paiement', section: 'encaissements', rendu: (s) => <BlocParMode s={s} /> },
  { cle: 'journal', libelle: 'Journal des encaissements', section: 'encaissements', rendu: (s) => <BlocJournal s={s} /> },
  { cle: 'anciennete', libelle: 'Ancienneté des impayés', section: 'impayes', rendu: (s) => <BlocAnciennete s={s} /> },
  { cle: 'debiteurs', libelle: 'Qui doit combien', section: 'impayes', mobile: true, rendu: (s) => <BlocDebiteurs s={s} /> },
  { cle: 'arrieres_maison', libelle: 'Arriérés par maison', section: 'impayes', rendu: (s) => <BlocArrieresMaison s={s} /> },
  { cle: 'occupation', libelle: 'Occupation par type et sur 12 mois', section: 'occupation', rendu: (s) => <BlocOccupation s={s} /> },
  { cle: 'libres', libelle: 'Logements libres et manque à gagner', section: 'occupation', rendu: (s) => <BlocLibres s={s} /> },
  { cle: 'entrees_sorties', libelle: 'Entrées et sorties de locataires', section: 'occupation', rendu: (s) => <BlocEntreesSorties s={s} /> },
  { cle: 'ponctualite', libelle: 'Ponctualité des locataires', section: 'locataires', rendu: (s) => <BlocPonctualite s={s} /> },
  { cle: 'baux', libelle: 'Fins de bail et loyers à réviser', section: 'locataires', rendu: (s) => <BlocBaux s={s} /> },
  { cle: 'gestionnaires', libelle: 'Qui a encaissé (gestionnaires)', section: 'gestionnaires', rendu: (s) => <BlocGestionnaires s={s} /> },
];
const BLOCS_SANS_GESTIONNAIRES = BLOCS.filter((b) => b.section !== 'gestionnaires');

const CHIFFRES: DefColonne[] = [
  { cle: 'encaisse', libelle: 'Encaissé', mobile: true },
  { cle: 'attendu', libelle: 'Attendu' },
  { cle: 'reste', libelle: 'Reste à percevoir', mobile: true },
  { cle: 'recouvrement', libelle: 'Taux de recouvrement', mobile: true },
  { cle: 'occupation', libelle: "Taux d'occupation", mobile: true },
  { cle: 'delai', libelle: 'Délai moyen de paiement' },
  { cle: 'cautions', libelle: 'Cautions détenues' },
  { cle: 'prevision', libelle: 'Prévision du mois suivant' },
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
  const [debut, fin] = useMemo(() => bornes(etat.preset, etat.libre), [etat.preset, etat.libre]);
  const comp = useMemo(() => bornesComparaison(debut, fin, etat.comparer), [debut, fin, etat.comparer]);
  const stats = useStats(debut, fin, etat.filtres);
  const precedent = useIndicateurs(comp, etat.filtres);
  const { data: maisons = [] } = useMaisons();
  const [export_, setExport] = useState<'pdf' | 'excel' | null>(null);

  const voitGestionnaires = espace.role !== 'gestionnaire';
  const affichage = useAffichage('statistiques', voitGestionnaires ? BLOCS : BLOCS_SANS_GESTIONNAIRES, CHIFFRES);
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

  const blocs = affichage.visibles.map((k) => BLOCS.find((b) => b.cle === k)!);

  return (
    <>
      <PageEntete titre="Statistiques" sousTitre={`${periode[0].toUpperCase()}${periode.slice(1)}`}
        actions={<>
          <BoutonPersonnaliser affichage={affichage} titreColonnes="Chiffres affichés" />
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
        </>} />

      <FiltresBarre etat={etat} onChange={setEtat} gestionnaires={gestionnaires}
        maisons={maisons.map((m) => ({ value: m.id, label: m.nom }))} />

      {stats.error && <Alert color="red" mb="md">Les statistiques n'ont pas pu être chargées. Vérifiez votre connexion et réessayez.</Alert>}

      <IndicateursCles i={s?.indicateurs} c={c} chargement={stats.isLoading} affichage={affichage} />

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
          {mobile && affichage.visibles.length < affichage.blocs.length && (
            <Group justify="center">
              <Text size="sm" c="dimmed" ta="center">D'autres statistiques existent : touchez « Personnaliser » en haut pour les afficher.</Text>
            </Group>
          )}
        </Stack>
      )}
    </>
  );
}

function IndicateursCles({ i, c, chargement, affichage }: {
  i: Indicateurs | undefined; c: Indicateurs | null; chargement: boolean; affichage: Affichage;
}) {
  const fc = (v: number) => formatFCFA(v);
  const cartes: { cle: string; carte: ReactNode }[] = [
    { cle: 'encaisse', carte: (
      <CarteChiffre chargement={chargement} libelle="💰 Encaissé" valeur={formatFCFA(i?.encaisse)} couleur="espace"
        detail={i?.remises ? `dont remises : ${formatFCFA(i.remises)}` : i ? `${i.nb_paiements} paiement${i.nb_paiements > 1 ? 's' : ''}` : undefined}
        ecart={<Ecart actuel={i?.encaisse} precedent={c?.encaisse} formatValeur={fc} />}
        aide="Somme des paiements reçus pendant la période." />
    ) },
    { cle: 'attendu', carte: (
      <CarteChiffre chargement={chargement} libelle="📋 Attendu" valeur={formatFCFA(i?.attendu)}
        ecart={<Ecart actuel={i?.attendu} precedent={c?.attendu} formatValeur={fc} />}
        aide="Somme des loyers dus pour les mois de la période." />
    ) },
    { cle: 'reste', carte: (
      <CarteChiffre chargement={chargement} libelle="⏳ Reste à percevoir" valeur={formatFCFA(i?.reste_a_percevoir)}
        couleur={(i?.reste_a_percevoir ?? 0) > 0 ? 'orange.8' : undefined}
        detail={i ? `${i.nb_retards} locataire${i.nb_retards > 1 ? 's' : ''} en retard` : undefined}
        ecart={<Ecart actuel={i?.reste_a_percevoir} precedent={c?.reste_a_percevoir} hautEstBien={false} formatValeur={fc} />}
        aide="Tous les loyers encore dus à la fin de la période, y compris les anciens." />
    ) },
    { cle: 'recouvrement', carte: (
      <CarteChiffre chargement={chargement} libelle="📈 Recouvrement" valeur={i?.taux_recouvrement != null ? `${i.taux_recouvrement} %` : '—'}
        detail="sur les mois déjà échus"
        ecart={<Ecart actuel={i?.taux_recouvrement} precedent={c?.taux_recouvrement} unite="points" />}
        aide="Part des loyers dus pour les mois de la période qui a été payée." />
    ) },
    { cle: 'occupation', carte: (
      <CarteChiffre chargement={chargement} libelle="🏠 Occupation" valeur={i?.taux_occupation != null ? `${i.taux_occupation} %` : '—'}
        detail={i ? `${i.logements_occupes} / ${i.logements_total} logements` : undefined}
        ecart={<Ecart actuel={i?.taux_occupation} precedent={c?.taux_occupation} unite="points" />} />
    ) },
    { cle: 'delai', carte: (
      <CarteChiffre chargement={chargement} libelle="⏱️ Délai moyen de paiement"
        valeur={i?.delai_moyen_jours == null ? '—' : i.delai_moyen_jours < 0 ? `${-i.delai_moyen_jours} j d'avance` : `${i.delai_moyen_jours} jours`}
        detail="après la date d'échéance"
        ecart={<Ecart actuel={i?.delai_moyen_jours} precedent={c?.delai_moyen_jours} hautEstBien={false} unite="jours" />}
        aide="Nombre moyen de jours entre l'échéance d'un mois et le paiement qui le solde." />
    ) },
    { cle: 'cautions', carte: (
      <CarteChiffre chargement={chargement} libelle="🔒 Cautions détenues" valeur={formatFCFA(i?.cautions_detenues)}
        aide="Cautions versées moins cautions remboursées." />
    ) },
    { cle: 'prevision', carte: (
      <CarteChiffre chargement={chargement} libelle="🔮 Prévision du mois suivant" valeur={formatFCFA(i?.prevision_mois_suivant)}
        aide="Somme des loyers des baux en cours pour le mois prochain." />
    ) },
  ];
  return (
    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
      {cartes.filter((x) => affichage.colonne(x.cle)).map((x) => <div key={x.cle}>{x.carte}</div>)}
    </SimpleGrid>
  );
}
