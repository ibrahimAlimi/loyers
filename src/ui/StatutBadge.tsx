import { Badge } from '@mantine/core';
import type { StatutBail } from '@/lib/types';

const STYLE: Record<StatutBail, { couleur: string; icone: string }> = {
  a_jour: { couleur: 'var(--statut-ok)', icone: '✓' },
  retard: { couleur: 'var(--statut-retard)', icone: '!' },
  critique: { couleur: 'var(--statut-critique)', icone: '⚠' },
};

export function StatutBadge({ statut, nbMois = 0 }: { statut: StatutBail; nbMois?: number }) {
  const s = STYLE[statut];
  const texte = statut === 'a_jour' ? 'À jour' : `Retard ${nbMois} mois`;
  return (
    <Badge variant="light" size="md" radius="xl" style={{ color: s.couleur, background: `color-mix(in srgb, ${s.couleur} 14%, white)` }}>
      {s.icone} {texte}
    </Badge>
  );
}
