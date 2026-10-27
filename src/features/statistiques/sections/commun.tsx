import type { ReactNode } from 'react';
import { Badge, Card, Group, Table, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconEye } from '@tabler/icons-react';
import type { Ponctualite } from '../api';

export function Bloc({ titre, sousTitre, actions, children }: {
  titre: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" align="flex-start" mb="sm" gap="xs">
        <div>
          <Title order={3} size="h4">{titre}</Title>
          {sousTitre && <Text size="sm" c="dimmed">{sousTitre}</Text>}
        </div>
        {actions}
      </Group>
      {children}
    </Card>
  );
}

export function TitreSection({ children, description }: { children: ReactNode; description?: ReactNode }) {
  return (
    <div style={{ marginTop: 8 }}>
      <Title order={2} size="h3">{children}</Title>
      {description && <Text size="sm" c="dimmed">{description}</Text>}
    </div>
  );
}

/** Tableau défilant horizontalement sur petit écran. */
export function TableauSimple({ entetes, lignes, minWidth = 560, droite = [] }: {
  entetes: ReactNode[];
  lignes: ReactNode[][];
  minWidth?: number;
  droite?: number[];
}) {
  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table striped highlightOnHover verticalSpacing="xs" fz="sm">
        <Table.Thead>
          <Table.Tr>{entetes.map((e, n) => <Table.Th key={n} ta={droite.includes(n) ? 'right' : undefined}>{e}</Table.Th>)}</Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {lignes.map((l, n) => (
            <Table.Tr key={n}>
              {l.map((c, k) => <Table.Td key={k} ta={droite.includes(k) ? 'right' : undefined} className={droite.includes(k) ? 'montant' : undefined}>{c}</Table.Td>)}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

const PONCT: Record<Ponctualite, { libelle: string; couleur: string; Icone: typeof IconEye }> = {
  exemplaire: { libelle: 'Exemplaire', couleur: 'var(--statut-ok)', Icone: IconCircleCheck },
  surveiller: { libelle: 'À surveiller', couleur: 'var(--statut-retard)', Icone: IconEye },
  critique: { libelle: 'Critique', couleur: 'var(--statut-critique)', Icone: IconAlertTriangle },
};

export function BadgePonctualite({ p }: { p: Ponctualite }) {
  const s = PONCT[p];
  return (
    <Badge variant="light" radius="xl" leftSection={<s.Icone size={12} />}
      style={{ color: s.couleur, background: `color-mix(in srgb, ${s.couleur} 14%, white)` }}>
      {s.libelle}
    </Badge>
  );
}

export const PONCTUALITE = PONCT;

export const duree = (jours: number | null | undefined) => {
  if (jours == null) return '—';
  if (jours < 0) return `${-jours} j d'avance`;
  if (jours < 60) return `${jours} j`;
  return `${Math.round(jours / 30)} mois`;
};

export const anciennete = (mois: number) => {
  if (mois < 12) return `${mois} mois`;
  const a = Math.floor(mois / 12);
  const r = mois % 12;
  return `${a} an${a > 1 ? 's' : ''}${r ? ` ${r} mois` : ''}`;
};
