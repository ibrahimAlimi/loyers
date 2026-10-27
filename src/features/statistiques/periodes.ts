import { aujourdhui, dayjs } from '@/lib/dates';

export type Preset = 'mois' | 'mois_dernier' | 'trimestre' | 'annee' | 'an_dernier' | 'libre';
export type Comparaison = 'precedente' | 'an_dernier' | 'aucune';

export const PRESETS: { value: Preset; label: string }[] = [
  { value: 'mois', label: 'Ce mois' },
  { value: 'mois_dernier', label: 'Le mois dernier' },
  { value: 'trimestre', label: 'Ce trimestre' },
  { value: 'annee', label: 'Cette année' },
  { value: 'an_dernier', label: "L'an dernier" },
  { value: 'libre', label: 'Dates au choix' },
];

export const COMPARAISONS: { value: Comparaison; label: string }[] = [
  { value: 'precedente', label: 'Période précédente' },
  { value: 'an_dernier', label: "Même période l'an dernier" },
  { value: 'aucune', label: 'Ne pas comparer' },
];

const f = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

export function bornes(p: Preset, libre: [string | null, string | null]): [string, string] {
  const j = dayjs(aujourdhui());
  switch (p) {
    case 'mois': return [f(j.startOf('month')), f(j.endOf('month'))];
    case 'mois_dernier': {
      const m = j.subtract(1, 'month');
      return [f(m.startOf('month')), f(m.endOf('month'))];
    }
    case 'trimestre': {
      const debut = j.month(Math.floor(j.month() / 3) * 3).startOf('month');
      return [f(debut), f(debut.add(2, 'month').endOf('month'))];
    }
    case 'an_dernier': return [f(j.subtract(1, 'year').startOf('year')), f(j.subtract(1, 'year').endOf('year'))];
    case 'libre':
      if (libre[0] && libre[1]) return [f(dayjs(libre[0])), f(dayjs(libre[1]))];
      return [f(j.startOf('year')), f(j.endOf('year'))];
    default: return [f(j.startOf('year')), f(j.endOf('year'))];
  }
}

/** Période de comparaison. Une période en mois entiers est décalée d'autant de mois entiers. */
export function bornesComparaison(debut: string, fin: string, c: Comparaison): [string, string] | null {
  if (c === 'aucune') return null;
  const d = dayjs(debut);
  const e = dayjs(fin);
  if (c === 'an_dernier') return [f(d.subtract(1, 'year')), f(e.subtract(1, 'year'))];
  const moisEntiers = d.date() === 1 && e.date() === e.daysInMonth();
  if (moisEntiers) {
    const n = e.diff(d, 'month') + 1;
    return [f(d.subtract(n, 'month')), f(e.subtract(n, 'month').endOf('month'))];
  }
  const jours = e.diff(d, 'day') + 1;
  return [f(d.subtract(jours, 'day')), f(e.subtract(jours, 'day'))];
}

export const libellePeriode = (debut: string, fin: string) =>
  `du ${dayjs(debut).format('DD/MM/YYYY')} au ${dayjs(fin).format('DD/MM/YYYY')}`;
