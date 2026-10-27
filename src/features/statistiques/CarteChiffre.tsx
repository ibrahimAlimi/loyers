import type { ReactNode } from 'react';
import { Card, Group, Skeleton, Text, Tooltip } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight, IconMinus } from '@tabler/icons-react';

export function CarteChiffre({ libelle, valeur, detail, chargement, couleur, ecart, aide }: {
  libelle: ReactNode;
  valeur: ReactNode;
  detail?: ReactNode;
  chargement?: boolean;
  couleur?: string;
  ecart?: ReactNode;
  aide?: string;
}) {
  const titre = <Text size="sm" c="dimmed">{libelle}</Text>;
  return (
    <Card withBorder radius="lg" padding="md">
      {aide ? <Tooltip label={aide} multiline w={260} withArrow>{titre}</Tooltip> : titre}
      {chargement ? <Skeleton h={28} mt={6} /> : (
        <Text fw={800} size="xl" c={couleur} className="montant" mt={2}>{valeur}</Text>
      )}
      {detail && <Text size="xs" c="dimmed" mt={2}>{detail}</Text>}
      {ecart}
    </Card>
  );
}

/**
 * Écart avec la période de comparaison. La couleur d'état est toujours doublée d'une flèche et d'un texte.
 * `hautEstBien` : une hausse est une bonne nouvelle (encaissé), sinon une mauvaise (reste à percevoir).
 */
export function Ecart({ actuel, precedent, hautEstBien = true, unite = 'pourcent', formatValeur }: {
  actuel: number | null | undefined;
  precedent: number | null | undefined;
  hautEstBien?: boolean;
  unite?: 'pourcent' | 'points' | 'jours';
  formatValeur?: (v: number) => string;
}) {
  if (actuel == null || precedent == null) return null;
  const diff = actuel - precedent;
  let texte: string;
  if (unite === 'points') texte = `${diff > 0 ? '+' : ''}${diff} pt`;
  else if (unite === 'jours') texte = `${diff > 0 ? '+' : ''}${diff} j`;
  else if (precedent === 0) texte = diff === 0 ? '0 %' : 'nouveau';
  else texte = `${diff > 0 ? '+' : ''}${Math.round((100 * diff) / Math.abs(precedent))} %`;
  const neutre = diff === 0;
  const bien = neutre ? null : (diff > 0) === hautEstBien;
  const couleur = neutre ? 'var(--mantine-color-gray-6)' : bien ? 'var(--statut-ok)' : 'var(--statut-critique)';
  const Icone = neutre ? IconMinus : diff > 0 ? IconArrowUpRight : IconArrowDownRight;
  return (
    <Group gap={4} mt={4} wrap="nowrap">
      <Icone size={14} color={couleur} />
      <Text size="xs" fw={700} style={{ color: couleur }}>{texte}</Text>
      <Text size="xs" c="dimmed" truncate>
        {formatValeur ? `contre ${formatValeur(precedent)}` : 'par rapport à avant'}
      </Text>
    </Group>
  );
}
