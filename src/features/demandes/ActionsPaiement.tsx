import { useState } from 'react';
import { ActionIcon, Button, Group, Menu, Modal, Stack, Text, Textarea } from '@mantine/core';
import { IconBan, IconDots, IconPencil, IconTrash } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { formatDate, formatFCFA } from '@/lib/format';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { useSupprimer } from '@/ui/ConfirmationSuppression';
import { useEncaisser } from '@/features/encaissement/EncaissementContext';
import type { PaiementDetail } from '@/features/locataires/api';

/** Menu d'un paiement : annuler (ou demander), corriger, corbeille. */
export function ActionsPaiement({ paiement }: { paiement: PaiementDetail }) {
  const espace = useEspaceCourant();
  const supprimer = useSupprimer();
  const { ouvrir } = useEncaisser();
  const [annulation, setAnnulation] = useState(false);
  const proprio = peut('supprimer', espace.role);
  const gestionnaire = peut('demander', espace.role);
  if (!proprio && !gestionnaire) return null;
  const libelle = `${formatFCFA(paiement.montant)} du ${formatDate(paiement.date_paiement)}`;

  const corriger = async () => {
    try {
      const { error } = await supabase.rpc('corriger_paiement', { p_paiement: paiement.id });
      if (error) throw error;
      await rafraichirDonnees();
      ouvrir({
        bailId: paiement.bail_id, mois: paiement.mois, montant: paiement.montant, mode: paiement.mode,
        payeur: paiement.payeur, reference: paiement.reference_transaction ?? '', remplacePaiementId: paiement.id,
      });
    } catch (e) {
      notifierErreur(e);
    }
  };

  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle" size="lg" aria-label="Actions du paiement"><IconDots size={20} /></ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {proprio && <Menu.Item leftSection={<IconPencil size={16} />} onClick={corriger}>Corriger (annule et ressaisit)</Menu.Item>}
          <Menu.Item leftSection={<IconBan size={16} />} color="orange" onClick={() => setAnnulation(true)}>
            {proprio ? 'Annuler ce paiement' : "Demander l'annulation"}
          </Menu.Item>
          {proprio && (
            <Menu.Item leftSection={<IconTrash size={16} />} color="red"
              onClick={() => supprimer({ table: 'paiements', id: paiement.id, libelle, type: 'le paiement' })}>
              Mettre à la corbeille
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
      {annulation && <AnnulationDialog paiement={paiement} demande={!proprio} espaceId={espace.id} libelle={libelle} onClose={() => setAnnulation(false)} />}
    </>
  );
}

function AnnulationDialog({ paiement, demande, espaceId, libelle, onClose }: {
  paiement: PaiementDetail; demande: boolean; espaceId: string; libelle: string; onClose: () => void;
}) {
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const valider = async () => {
    setEnvoi(true);
    try {
      const { error } = demande
        ? await supabase.from('demandes').insert({
          espace_id: espaceId, type: 'annulation_paiement', cible_table: 'paiements', cible_id: paiement.id,
          cible_libelle: `Paiement de ${libelle}`, motif: motif.trim(),
        })
        : await supabase.rpc('annuler_paiement', { p_paiement: paiement.id, p_motif: motif.trim() });
      if (error) throw error;
      notifierSucces(demande ? 'Demande envoyée au propriétaire' : 'Paiement annulé. Son reçu porte maintenant la mention ANNULÉ.');
      await rafraichirDonnees();
      onClose();
    } catch (e) {
      notifierErreur(e);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Modal opened onClose={onClose} title={demande ? "Demander l'annulation du paiement" : 'Annuler ce paiement ?'}>
      <Stack>
        <Text size="sm">
          Paiement de <b>{libelle}</b>. {demande
            ? 'Le propriétaire recevra votre demande.'
            : 'Les mois payés redeviendront dus. Le reçu restera consultable avec la mention ANNULÉ, et son numéro ne sera jamais réutilisé.'}
        </Text>
        <Textarea label="Motif (obligatoire)" value={motif} onChange={(e) => setMotif(e.currentTarget.value)} autosize minRows={2} data-autofocus />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Retour</Button>
          <Button color="orange" onClick={valider} loading={envoi} disabled={!motif.trim()}>
            {demande ? 'Envoyer la demande' : 'Annuler le paiement'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
