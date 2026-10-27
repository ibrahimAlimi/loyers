import { Badge, Button, Card, Group, Skeleton, Stack, Text } from '@mantine/core';
import { IconRestore, IconTrash, IconTrashX } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { formatDateHeure } from '@/lib/format';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { useSupprimer, type TableCorbeille } from '@/ui/ConfirmationSuppression';

const TYPES: Record<string, string> = {
  espaces: "l'espace", maisons: 'la maison', logements: 'le logement', locataires: 'le locataire', baux: 'le bail',
  paiements: 'le paiement', mouvements_caution: 'le mouvement de caution', demandes: 'la demande',
};
const TYPES_COURTS: Record<string, string> = {
  espaces: 'Espace', maisons: 'Maison', logements: 'Logement', locataires: 'Locataire', baux: 'Bail',
  paiements: 'Paiement', mouvements_caution: 'Caution', demandes: 'Demande',
};

interface Lot {
  lot_suppression: string;
  espace_id: string | null;
  table: TableCorbeille;
  id: string;
  libelle: string;
  supprime_le: string;
  supprime_par_nom: string | null;
  nb_elements_du_lot: number;
}

export function CorbeillePage() {
  const espace = useEspaceCourant();
  const supprimer = useSupprimer();
  const admin = peut('supprimer_definitivement', espace.role);
  const { data = [], isLoading } = useQuery({
    queryKey: ['corbeille', espace.id, admin],
    queryFn: async () => {
      let q = supabase.from('v_corbeille').select('*').order('supprime_le', { ascending: false });
      q = admin ? q.or(`espace_id.eq.${espace.id},espace_id.is.null`) : q.eq('espace_id', espace.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as Lot[];
    },
  });
  const restaurer = useMutation({
    mutationFn: async (lot: string) => {
      const { error } = await supabase.rpc('restaurer', { p_lot: lot });
      if (error) throw error;
    },
    onSuccess: async () => {
      notifierSucces('Restauré');
      await rafraichirDonnees();
    },
    onError: notifierErreur,
  });

  return (
    <>
      <PageEntete titre="Corbeille" sousTitre="Les éléments supprimés peuvent être restaurés." />
      {isLoading ? <Skeleton h={200} /> : !data.length ? (
        <EtatVide icone={<IconTrash size={30} />} titre="La corbeille est vide" />
      ) : (
        <Stack gap="xs">
          {data.map((l) => (
            <Card key={l.lot_suppression} withBorder radius="md" padding="md">
              <Group justify="space-between" wrap="wrap" gap="sm">
                <div style={{ minWidth: 0 }}>
                  <Group gap="xs">
                    <Badge variant="light" color="gray">{TYPES_COURTS[l.table] ?? l.table}</Badge>
                    <Text fw={700}>{l.libelle}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Supprimé le {formatDateHeure(l.supprime_le)}{l.supprime_par_nom ? ` par ${l.supprime_par_nom}` : ''}
                    {l.nb_elements_du_lot > 1 ? ` · + ${l.nb_elements_du_lot - 1} élément(s) lié(s)` : ''}
                  </Text>
                </div>
                <Group gap="xs">
                  <Button variant="light" leftSection={<IconRestore size={18} />} loading={restaurer.isPending && restaurer.variables === l.lot_suppression}
                    onClick={() => restaurer.mutate(l.lot_suppression)}>
                    Restaurer
                  </Button>
                  {admin && (
                    <Button color="red" variant="subtle" leftSection={<IconTrashX size={18} />}
                      onClick={() => supprimer({ table: l.table, id: l.id, libelle: l.libelle, type: TYPES[l.table] ?? '' }, { definitif: true })}>
                      Supprimer définitivement
                    </Button>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </>
  );
}
