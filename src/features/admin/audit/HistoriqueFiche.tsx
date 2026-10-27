import { useState } from 'react';
import { Button, Card, Group, Skeleton, Text, Title } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthProvider';
import { useHistoriqueFiche } from './api';
import { ListeHistorique } from './ListeHistorique';

/**
 * Onglet « Historique » d'une fiche : toutes les modifications, champ par champ.
 * Visible uniquement par le super admin (la RLS de l'historique le garantit de toute façon).
 */
export function HistoriqueFiche({ cibles }: { cibles: { table: string; ids: string[] }[] }) {
  const { profil } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const { data, isLoading } = useHistoriqueFiche(cibles, ouvert && !!profil?.est_super_admin);
  if (!profil?.est_super_admin) return null;
  return (
    <Card withBorder radius="lg" padding="lg" mt="lg">
      <Group justify="space-between">
        <div>
          <Title order={3} size="h4">Historique des modifications</Title>
          <Text size="sm" c="dimmed">Visible uniquement par l'administrateur.</Text>
        </div>
        <Button variant="light" leftSection={<IconHistory size={18} />} onClick={() => setOuvert(!ouvert)}>
          {ouvert ? 'Masquer' : 'Afficher'}
        </Button>
      </Group>
      {ouvert && (isLoading ? <Skeleton h={120} mt="md" /> : <div style={{ marginTop: 12 }}><ListeHistorique lignes={data ?? []} /></div>)}
    </Card>
  );
}
