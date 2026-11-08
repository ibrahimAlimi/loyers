import { dayjs } from './dates';

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 70000 → « 70 000 » (espace fine insécable). */
export const formatNombre = (n: number): string => nombre.format(n).replace(/[  ]/g, ' ');

/** 70000 → « 70 000 FCFA ». */
export const formatFCFA = (n: number | null | undefined): string => `${formatNombre(n ?? 0)} FCFA`;

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « juillet 2026 » (ou « Juillet 2026 »). */
export const formatMois = (d: string | Date, opts?: { majuscule?: boolean }): string => {
  const s = dayjs(d).format('MMMM YYYY');
  return opts?.majuscule ? majuscule(s) : s;
};

export const formatDate = (d: string | Date | null | undefined): string => (d ? dayjs(d).format('DD/MM/YYYY') : '');

/** « lundi 5 octobre 2026 ». */
export const formatDateLongue = (d: string | Date): string => dayjs(d).format('dddd D MMMM YYYY');

export const formatDateHeure = (d: string | Date): string => dayjs(d).format('DD/MM/YYYY à HH:mm');

/** « 70.000 », « 70 000 », « 70000F » → 70000 ; null si invalide (≤ 0, décimales, texte). */
export function parseMontant(s: string): number | null {
  const nettoye = s
    .replace(/fcfa|cfa|f/gi, '')
    .replace(/[\s  .]/g, '')
    .trim();
  if (!/^\d+$/.test(nettoye)) return null;
  const n = Number(nettoye);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export const LIBELLE_MODE: Record<string, string> = {
  especes: 'Espèces',
  mtn_momo: 'MTN Mobile Money',
  moov_money: 'Moov Money',
  celtiis_cash: 'Celtiis Cash',
  virement: 'Virement',
  cheque: 'Chèque',
  autre: 'Autre',
};

export const LIBELLE_TYPE_LOGEMENT: Record<string, string> = {
  chambre: 'Chambre',
  chambre_salon: 'Chambre-salon',
  appartement: 'Appartement',
  boutique: 'Boutique',
  magasin: 'Magasin',
  bureau: 'Bureau',
  autre: 'Autre',
};

export const LIBELLE_ROLE: Record<string, string> = {
  super_admin: 'Administrateur',
  proprietaire: 'Propriétaire',
  gestionnaire: 'Gestionnaire',
  consultation: 'Consultation',
};

export const nomComplet = (l: { nom: string; prenoms?: string | null }): string =>
  `${l.nom} ${l.prenoms ?? ''}`.trim();
