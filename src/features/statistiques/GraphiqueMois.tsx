import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dayjs } from '@/lib/dates';
import { formatFCFA, formatNombre } from '@/lib/format';

// Palette validée (dataviz) : attendu = gris neutre, encaissé = bleu série 1.
const ATTENDU = '#c3c2b7';
const ENCAISSE = '#2a78d6';

export function GraphiqueMois({ donnees }: { donnees: { mois: string; attendu: number; encaisse: number }[] }) {
  const lignes = donnees.map((d) => ({ ...d, libelle: dayjs(d.mois).format('MMM YY') }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={lignes} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e1e0d9" />
        <XAxis dataKey="libelle" tickLine={false} axisLine={{ stroke: '#c3c2b7' }} tick={{ fill: '#898781', fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: '#898781', fontSize: 12 }}
          tickFormatter={(v: number) => (v >= 1_000_000 ? `${formatNombre(v / 1_000_000)} M` : v >= 1000 ? `${formatNombre(v / 1000)} k` : `${v}`)} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          formatter={(v: number, nom: string) => [formatFCFA(v), nom]}
          labelFormatter={(_, p) => (p?.[0] ? dayjs(p[0].payload.mois).format('MMMM YYYY') : '')}
        />
        <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="attendu" name="Attendu" fill={ATTENDU} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="encaisse" name="Encaissé" fill={ENCAISSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
