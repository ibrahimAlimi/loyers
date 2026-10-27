import { createElement } from 'react';
import { enDataUrl, urlFichier } from '@/lib/fichiers';
import { dayjs } from '@/lib/dates';
import { LIBELLE_MODE, LIBELLE_TYPE_LOGEMENT } from '@/lib/format';
import type { Espace } from '@/lib/types';
import type { Indicateurs, StatsCompletes } from './api';

const nomFichier = (espace: string, debut: string, fin: string, ext: string) =>
  `statistiques-${espace.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${debut}-${fin}.${ext}`;

function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function exporterPdf(stats: StatsCompletes, comparaison: Indicateurs | null, espace: Espace,
  debut: string, fin: string, periode: string, filtres: string) {
  const [{ pdf }, { RapportDocument }, logo] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./pdf/RapportDocument'),
    urlFichier('espaces', espace.logo_path).then(enDataUrl),
  ]);
  const element = createElement(RapportDocument, {
    stats, comparaison, o: { espace, logo, periode, filtres, domaine: window.location.host },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();
  telecharger(blob, nomFichier(espace.nom, debut, fin, 'pdf'));
}

type Cellule = { value?: string | number | Date | null; type?: StringConstructor | NumberConstructor | DateConstructor;
  format?: string; fontWeight?: 'bold' } | null;

const entete = (titres: string[]): Cellule[] => titres.map((t) => ({ value: t, fontWeight: 'bold' as const }));
const txt = (v: string | null | undefined): Cellule => ({ value: v ?? '', type: String });
const num = (v: number | null | undefined): Cellule => (v == null ? null : { value: v, type: Number, format: '#,##0' });
const date = (v: string | null | undefined): Cellule => (v ? { value: dayjs(v).toDate(), type: Date, format: 'dd/mm/yyyy' } : null);

export async function exporterExcel(stats: StatsCompletes, comparaison: Indicateurs | null, espace: Espace,
  debut: string, fin: string, periode: string, filtres: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const i = stats.indicateurs;
  const c = comparaison;
  const feuille = (sheet: string, data: Cellule[][], largeurs: number[]) => ({ sheet, data, columns: largeurs.map((width) => ({ width })) });

  const sheets = [
    feuille('Indicateurs', [
      [{ value: `${espace.nom} : statistiques ${periode}`, fontWeight: 'bold' }],
      [txt(filtres)],
      [null],
      entete(['Indicateur', 'Période', 'Comparaison']),
      [txt('Encaissé (FCFA)'), num(i.encaisse), num(c?.encaisse)],
      [txt('Remises accordées (FCFA)'), num(i.remises), num(c?.remises)],
      [txt('Attendu (FCFA)'), num(i.attendu), num(c?.attendu)],
      [txt('Reste à percevoir (FCFA)'), num(i.reste_a_percevoir), num(c?.reste_a_percevoir)],
      [txt('Taux de recouvrement (%)'), num(i.taux_recouvrement), num(c?.taux_recouvrement)],
      [txt("Taux d'occupation (%)"), num(i.taux_occupation), num(c?.taux_occupation)],
      [txt('Logements occupés'), num(i.logements_occupes), num(c?.logements_occupes)],
      [txt('Logements au total'), num(i.logements_total), num(c?.logements_total)],
      [txt('Délai moyen de paiement (jours)'), num(i.delai_moyen_jours), num(c?.delai_moyen_jours)],
      [txt('Cautions détenues (FCFA)'), num(i.cautions_detenues), null],
      [txt('Prévision du mois suivant (FCFA)'), num(i.prevision_mois_suivant), null],
    ], [36, 18, 18]),
    feuille('Par mois', [
      entete(['Mois', 'Attendu', 'Encaissé']),
      ...stats.par_mois.map((m) => [txt(dayjs(m.mois).format('MMMM YYYY')), num(m.attendu), num(m.encaisse)]),
    ], [18, 14, 14]),
    feuille('Par maison', [
      entete(['Maison', 'Attendu', 'Encaissé', 'Arriérés', 'Recouvrement (%)', 'Logements', 'Occupés']),
      ...stats.par_maison.map((m) => [txt(m.nom), num(m.attendu), num(m.encaisse), num(m.reste), num(m.recouvrement), num(m.logements), num(m.occupes)]),
    ], [28, 14, 14, 14, 16, 11, 10]),
    feuille('Encaissements', [
      entete(['Date', 'Locataire', 'Maison', 'Logement', 'Montant', 'Remise', 'Mode', 'Référence', 'Payé par', 'Encaissé par', 'Reçu']),
      ...stats.journal.map((p) => [date(p.date), txt(p.locataire), txt(p.maison), txt(p.logement), num(p.montant), num(p.remise),
        txt(LIBELLE_MODE[p.mode] ?? p.mode), txt(p.reference), txt(p.payeur), txt(p.encaissant), txt(p.recu)]),
    ], [12, 24, 18, 22, 12, 10, 18, 18, 20, 20, 18]),
    feuille('Impayés', [
      entete(['Locataire', 'Téléphone', 'Maison', 'Logement', 'Mois dus', 'Depuis', 'Ancienneté (jours)', 'Montant dû']),
      ...stats.debiteurs.map((d) => [txt(d.locataire + (d.parti ? ' (parti)' : '')), txt(d.telephone), txt(d.maison), txt(d.logement),
        num(d.nb_mois), txt(dayjs(d.premier_mois).format('MMMM YYYY')), num(d.jours), num(d.montant)]),
    ], [24, 14, 18, 22, 10, 16, 16, 14]),
    feuille('Logements libres', [
      entete(['Maison', 'Logement', 'Type', 'Libre depuis', 'Jours', 'Loyer estimé']),
      ...stats.logements_libres.map((l) => [txt(l.maison), txt(l.logement), txt(LIBELLE_TYPE_LOGEMENT[l.type] ?? l.type),
        l.libre_depuis ? date(l.libre_depuis) : txt('jamais loué'), num(l.jours), num(l.loyer_estime)]),
    ], [18, 24, 16, 14, 8, 14]),
    feuille('Locataires', [
      entete(['Locataire', 'Téléphone', 'Maison', 'Logement', 'Depuis', 'Ancienneté (mois)', 'Loyer', 'Caution', 'Délai moyen (jours)', 'Mois de retard', 'Ponctualité', 'Dernière révision', 'À réviser']),
      ...stats.locataires.map((l) => [txt(l.locataire), txt(l.telephone), txt(l.maison), txt(l.logement), date(l.depuis),
        num(l.mois_anciennete), num(l.loyer), num(l.caution), num(l.delai_moyen), num(l.mois_retard),
        txt({ exemplaire: 'Exemplaire', surveiller: 'À surveiller', critique: 'Critique' }[l.ponctualite]),
        date(l.derniere_revision), txt(l.a_reviser ? 'Oui' : 'Non')]),
    ], [24, 14, 18, 22, 12, 12, 12, 12, 14, 12, 14, 14, 10]),
    feuille('Gestionnaires', [
      entete(['Nom', 'Encaissé', 'Paiements', 'Reçus émis', 'Annulations demandées', 'Maisons', 'Recouvrement (%)']),
      ...stats.gestionnaires.map((g) => [txt(g.nom), num(g.encaisse), num(g.nb_paiements), num(g.recus_emis),
        num(g.annulations_demandees), num(g.nb_maisons), num(g.recouvrement)]),
    ], [26, 14, 11, 11, 20, 10, 16]),
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await writeXlsxFile(sheets as any).toBlob();
  telecharger(blob, nomFichier(espace.nom, debut, fin, 'xlsx'));
}
