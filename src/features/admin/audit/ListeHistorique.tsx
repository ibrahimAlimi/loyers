import { useState } from 'react';
import { Badge, Card, Collapse, Group, Stack, Table, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { formatDateHeure } from '@/lib/format';
import type { EntreeHistorique } from './api';
import { libelleChamp, LIBELLE_OPERATION, LIBELLE_TABLE, nomLigne, valeurLisible } from './libelles';

const COULEUR_OP: Record<string, string> = { insert: 'green', update: 'blue', delete: 'red' };
const IGNORES = new Set(['id', 'espace_id', 'cree_le', 'cree_par', 'modifie_le', 'lot_suppression', 'supprime_par']);

/** Valeurs avant et après, champ par champ. */
export function DetailHistorique({ e }: { e: EntreeHistorique }) {
  const champs = e.operation === 'update'
    ? e.champs_modifies ?? []
    : Object.keys((e.operation === 'insert' ? e.apres : e.avant) ?? {}).filter((c) => !IGNORES.has(c));
  return (
    <Table.ScrollContainer minWidth={420}>
      <Table fz="sm" verticalSpacing={4} withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w="30%">Champ</Table.Th>
            {e.operation !== 'insert' && <Table.Th>Avant</Table.Th>}
            {e.operation !== 'delete' && <Table.Th>Après</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {champs.map((c) => (
            <Table.Tr key={c}>
              <Table.Td fw={600}>{libelleChamp(c)}</Table.Td>
              {e.operation !== 'insert' && <Table.Td c="red.8" td={e.operation === 'update' ? 'line-through' : undefined}>{valeurLisible(e.avant?.[c])}</Table.Td>}
              {e.operation !== 'delete' && <Table.Td c="green.9">{valeurLisible(e.apres?.[c])}</Table.Td>}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Liste dépliable d'entrées d'historique. */
export function ListeHistorique({ lignes, nomsEspaces }: { lignes: EntreeHistorique[]; nomsEspaces?: Map<string, string> }) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  if (!lignes.length) return <Text c="dimmed">Aucune modification enregistrée.</Text>;
  return (
    <Stack gap={0}>
      {lignes.map((e) => {
        const deplie = ouvert === e.id;
        const nom = nomLigne(e);
        return (
          <div key={e.id} style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <UnstyledButton w="100%" py="xs" onClick={() => setOuvert(deplie ? null : e.id)}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                  {deplie ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  <Badge size="sm" variant="light" color={COULEUR_OP[e.operation]}>{LIBELLE_OPERATION[e.operation]}</Badge>
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {LIBELLE_TABLE[e.table_nom] ?? e.table_nom}{nom ? ` · ${nom}` : ''}
                      {e.operation === 'update' && e.champs_modifies?.length ? ` : ${e.champs_modifies.map(libelleChamp).join(', ')}` : ''}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {formatDateHeure(e.le)} · {e.auteur?.nom_complet ?? 'Système'}
                      {e.espace_id && nomsEspaces?.get(e.espace_id) ? ` · ${nomsEspaces.get(e.espace_id)}` : ''}
                      {e.appareil ? ` · ${e.appareil}` : ''}{e.ip ? ` · ${e.ip}` : ''}
                    </Text>
                  </div>
                </Group>
              </Group>
            </UnstyledButton>
            <Collapse in={deplie}>
              <Card withBorder radius="md" padding="xs" mb="sm"><DetailHistorique e={e} /></Card>
            </Collapse>
          </div>
        );
      })}
    </Stack>
  );
}
