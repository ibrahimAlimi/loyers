import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { dayjs } from '@/lib/dates';
import { formatFCFA, formatNombre } from '@/lib/format';

// Palette validée (méthode dataviz) : séries dans l'ordre fixe, encre et grille discrètes.
export const SERIE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const NEUTRE = '#c3c2b7';
export const STATUT = { bon: '#0ca30c', attention: '#fab219', serieux: '#ec835a', critique: '#d03b3b' };
const GRILLE = '#e1e0d9';
const ENCRE = '#898781';

const abrege = (v: number) => (v >= 1_000_000 ? `${formatNombre(Math.round(v / 100_000) / 10)} M`
  : v >= 1000 ? `${formatNombre(Math.round(v / 1000))} k` : `${v}`);

const axeX = { tickLine: false, axisLine: { stroke: NEUTRE }, tick: { fill: ENCRE, fontSize: 12 } } as const;
const axeY = { tickLine: false, axisLine: false, tick: { fill: ENCRE, fontSize: 12 } } as const;
const curseur = { fill: 'rgba(0,0,0,0.04)' };

/** Barres groupées « attendu / encaissé » par mois (un seul axe, en FCFA). */
export function GraphiqueMois({ donnees }: { donnees: { mois: string; attendu: number; encaisse: number }[] }) {
  const lignes = donnees.map((d) => ({ ...d, libelle: dayjs(d.mois).format('MMM YY') }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={lignes} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRILLE} />
        <XAxis dataKey="libelle" {...axeX} />
        <YAxis {...axeY} width={64} tickFormatter={abrege} />
        <Tooltip cursor={curseur} formatter={(v: number, nom: string) => [formatFCFA(v), nom]}
          labelFormatter={(_, p) => (p?.[0] ? dayjs(p[0].payload.mois).format('MMMM YYYY') : '')} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="attendu" name="Attendu" fill={NEUTRE} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="encaisse" name="Encaissé" fill={SERIE[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barres horizontales d'une seule série, triées (le libellé porte l'identité, pas la couleur). */
export function BarresHorizontales({ donnees, format = formatFCFA, couleur = SERIE[0], nomSerie = 'Montant' }: {
  donnees: { libelle: string; valeur: number }[];
  format?: (v: number) => string;
  couleur?: string;
  nomSerie?: string;
}) {
  const hauteur = Math.max(120, donnees.length * 34 + 30);
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={donnees} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRILLE} />
        <XAxis type="number" {...axeX} tickFormatter={abrege} />
        <YAxis type="category" dataKey="libelle" {...axeY} width={130}
          tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} />
        <Tooltip cursor={curseur} formatter={(v: number) => [format(v), nomSerie]} />
        <Bar dataKey="valeur" name={nomSerie} fill={couleur} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Taux d'occupation sur 12 mois (ligne, en %). */
export function GraphiqueOccupation({ donnees }: { donnees: { mois: string; taux: number | null; occupes: number; total: number }[] }) {
  const lignes = donnees.map((d) => ({ ...d, libelle: dayjs(d.mois).format('MMM YY') }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={lignes} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRILLE} />
        <XAxis dataKey="libelle" {...axeX} />
        <YAxis {...axeY} width={44} domain={[0, 100]} tickFormatter={(v: number) => `${v} %`} />
        <Tooltip formatter={(v: number, _n, p) => [`${v} % (${p.payload.occupes} / ${p.payload.total})`, 'Occupation']}
          labelFormatter={(_, p) => (p?.[0] ? dayjs(p[0].payload.mois).format('MMMM YYYY') : '')} />
        <Line type="monotone" dataKey="taux" name="Occupation" stroke={SERIE[0]} strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Entrées et sorties de locataires par mois. */
export function GraphiqueEntreesSorties({ donnees }: { donnees: { mois: string; entrees: number; sorties: number }[] }) {
  const lignes = donnees.map((d) => ({ ...d, libelle: dayjs(d.mois).format('MMM YY') }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={lignes} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRILLE} />
        <XAxis dataKey="libelle" {...axeX} />
        <YAxis {...axeY} width={32} allowDecimals={false} />
        <Tooltip cursor={curseur} labelFormatter={(_, p) => (p?.[0] ? dayjs(p[0].payload.mois).format('MMMM YYYY') : '')} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="entrees" name="Entrées" fill={SERIE[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="sorties" name="Sorties" fill={SERIE[1]} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
