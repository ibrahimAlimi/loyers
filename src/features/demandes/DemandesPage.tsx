import { useState } from 'react';
import { Badge, Button, Card, Group, Modal, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { formatDateHeure } from '@/lib/format';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';

interface Demande {
  id: string;
  type: 'annulation_paiement' | 'suppression';
  cible_libelle: string | null;
  motif: string;
  statut: 'en_attente' | 'acceptee' | 'refusee';
  cree_le: string;
  traite_le: string | null;
  reponse: string | null;
  demandeur: { nom_complet: string } | null;
}

const STATUT = {
  en_attente: { libelle: 'En attente', couleur: 'orange' },
  acceptee: { libelle: 'Acceptée', couleur: 'green' },
  refusee: { libelle: 'Refusée', couleur: 'red' },
};

export function DemandesPage() {
  const espace = useEspaceCourant();
  const traiter = peut('traiter_demandes', espace.role);
  const [decision, setDecision] = useState<{ d: Demande; accepter: boolean } | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['demandes', espace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demandes')
        .select('*, demandeur:profils!demandes_demande_par_fkey(nom_complet)')
        .eq('espace_id', espace.id)
        .is('supprime_le', null)
        .order('cree_le', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Demande[];
    },
  });

  return (
    <>
      <PageEntete titre="Demandes"
        sousTitre={traiter ? 'Les demandes de vos gestionnaires (annulations, suppressions)' : 'Vos demandes au propriétaire'} />
      {isLoading ? <Skeleton h={200} /> : !data.length ? (
        <EtatVide icone={<IconInbox size={30} />} titre="Aucune demande" />
      ) : (
        <Stack gap="xs">
          {data.map((d) => (
            <Card key={d.id} withBorder radius="md" padding="md">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                  <Group gap="xs">
                    <Badge color={STATUT[d.statut].couleur} variant="light">{STATUT[d.statut].libelle}</Badge>
                    <Text fw={700}>{d.type === 'annulation_paiement' ? 'Annulation' : 'Suppression'} : {d.cible_libelle}</Text>
                  </Group>
                  <Text size="sm">« {d.motif} »</Text>
                  <Text size="xs" c="dimmed">Par {d.demandeur?.nom_complet} le {formatDateHeure(d.cree_le)}</Text>
                  {d.reponse && <Text size="sm" c="dimmed">Réponse : {d.reponse}</Text>}
                </Stack>
                {traiter && d.statut === 'en_attente' && (
                  <Group gap="xs">
                    <Button color="green" onClick={() => setDecision({ d, accepter: true })}>Accepter</Button>
                    <Button variant="default" onClick={() => setDecision({ d, accepter: false })}>Refuser</Button>
                  </Group>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      )}
      {decision && <DecisionDialog {...decision} onClose={() => setDecision(null)} />}
    </>
  );
}

function DecisionDialog({ d, accepter, onClose }: { d: Demande; accepter: boolean; onClose: () => void }) {
  const [reponse, setReponse] = useState('');
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('traiter_demande', { p_demande: d.id, p_accepter: accepter, p_reponse: reponse || null });
      if (error) throw error;
    },
    onSuccess: async () => {
      notifierSucces(accepter ? 'Demande acceptée' : 'Demande refusée');
      await rafraichirDonnees();
      onClose();
    },
    onError: notifierErreur,
  });
  return (
    <Modal opened onClose={onClose} title={accepter ? 'Accepter la demande ?' : 'Refuser la demande ?'}>
      <Stack>
        <Text size="sm">
          {accepter
            ? d.type === 'annulation_paiement'
              ? 'Le paiement sera annulé : les mois redeviendront dus et le reçu portera la mention ANNULÉ.'
              : 'L’élément sera mis à la corbeille, avec tout ce qui en dépend. Vous pourrez le restaurer.'
            : 'Rien ne sera modifié. Le gestionnaire verra votre réponse.'}
        </Text>
        <Textarea label="Réponse au gestionnaire (facultatif)" value={reponse} onChange={(e) => setReponse(e.currentTarget.value)} autosize minRows={2} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Retour</Button>
          <Button color={accepter ? 'green' : 'red'} loading={m.isPending} onClick={() => m.mutate()}>
            {accepter ? 'Accepter' : 'Refuser'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
