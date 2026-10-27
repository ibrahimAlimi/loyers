import { useState } from 'react';
import { Alert, Button, Group, List, Loader, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { messageErreur, notifierErreur, notifierSucces } from '@/lib/erreurs';
import { useEspace } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';

export type TableCorbeille = 'espaces' | 'maisons' | 'logements' | 'locataires' | 'baux' | 'paiements' | 'mouvements_caution' | 'demandes';

export interface CibleSuppression {
  table: TableCorbeille;
  id: string;
  libelle: string;
  /** « la maison », « le locataire »… */
  type: string;
  apres?: () => void;
}

const LIBELLES: [string, string, string][] = [
  ['maisons', 'maison', 'maisons'],
  ['logements', 'logement', 'logements'],
  ['locataires', 'locataire', 'locataires'],
  ['baux', 'bail', 'baux'],
  ['paiements', 'paiement', 'paiements'],
  ['recus', 'reçu', 'reçus'],
  ['mouvements_caution', 'mouvement de caution', 'mouvements de caution'],
  ['demandes', 'demande', 'demandes'],
];

type Apercu = Record<string, number> & { libelle: string; baux_actifs: number; locataires_concernes: string[]; fichiers: number };

function lignesImpact(a: Apercu, definitif: boolean): string[] {
  const l: string[] = [];
  for (const [cle, un, plusieurs] of LIBELLES) {
    const n = a[cle] as number;
    if (!n) continue;
    if (cle === 'baux' && a.baux_actifs) {
      const noms = a.locataires_concernes.slice(0, 3).join(', ');
      l.push(`${n} ${n > 1 ? plusieurs : un} dont ${a.baux_actifs} en cours (${noms}${a.locataires_concernes.length > 3 ? '…' : ''})`);
    } else {
      l.push(`${n} ${n > 1 ? plusieurs : un}`);
    }
  }
  if (definitif && a.fichiers) l.push(`${a.fichiers} fichier(s) lié(s) (photos, logo…)`);
  return l;
}

function ContenuSuppression({ cible, definitif, fermer }: { cible: CibleSuppression; definitif: boolean; fermer: () => void }) {
  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const apercu = useQuery({
    queryKey: ['apercu-suppression', cible.table, cible.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('apercu_suppression', { p_table: cible.table, p_id: cible.id });
      if (error) throw error;
      return data as Apercu;
    },
    gcTime: 0,
  });
  const confirmeOk = !definitif || saisie.trim().toLowerCase() === cible.libelle.trim().toLowerCase();

  const valider = async () => {
    setEnvoi(true);
    try {
      if (definitif) {
        const { data, error } = await supabase.rpc('supprimer_definitivement', { p_table: cible.table, p_id: cible.id });
        if (error) throw error;
        const chemins = (data as string[]) ?? [];
        if (chemins.length) await supabase.storage.from('espaces').remove(chemins);
        notifierSucces('Supprimé définitivement');
      } else {
        const { error } = await supabase.rpc('mettre_a_la_corbeille', { p_table: cible.table, p_id: cible.id });
        if (error) throw error;
        notifierSucces('Mis à la corbeille. Vous pouvez le restaurer depuis la Corbeille.');
      }
      await rafraichirDonnees();
      fermer();
      cible.apres?.();
    } catch (e) {
      notifierErreur(e);
    } finally {
      setEnvoi(false);
    }
  };

  if (apercu.isLoading) return <Loader mx="auto" my="lg" />;
  if (apercu.isError) return <Alert color="red">{messageErreur(apercu.error)}</Alert>;
  const impact = lignesImpact(apercu.data!, definitif);

  return (
    <Stack>
      {impact.length > 0 && (
        <div>
          <Text fw={600} mb={4}>{definitif ? 'Seront effacés pour toujours :' : 'Cela mettra aussi à la corbeille :'}</Text>
          <List spacing={2}>{impact.map((x) => <List.Item key={x}>{x}</List.Item>)}</List>
        </div>
      )}
      {definitif ? (
        <>
          <Text size="sm">Les QR codes des reçus déjà envoyés afficheront « introuvable ».</Text>
          <Alert color="red" title="❌ Cette action est irréversible." />
          <TextInput
            label={<>Pour confirmer, tapez <b>{cible.libelle}</b></>}
            value={saisie}
            onChange={(e) => setSaisie(e.currentTarget.value)}
            data-autofocus
          />
        </>
      ) : (
        <>
          <Text size="sm">
            Ces éléments n'apparaîtront plus dans les listes ni dans les statistiques. Les reçus déjà envoyés resteront
            vérifiables avec la mention « supprimé ».
          </Text>
          <Alert color="green">✅ Vous pourrez tout restaurer depuis la Corbeille.</Alert>
        </>
      )}
      <Group justify="flex-end">
        <Button variant="default" onClick={fermer}>Annuler</Button>
        <Button color="red" onClick={valider} loading={envoi} disabled={!confirmeOk}>
          {definitif ? 'Supprimer définitivement' : 'Mettre à la corbeille'}
        </Button>
      </Group>
    </Stack>
  );
}

function ContenuDemande({ cible, espaceId, fermer }: { cible: CibleSuppression; espaceId: string; fermer: () => void }) {
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const valider = async () => {
    setEnvoi(true);
    try {
      const { error } = await supabase.from('demandes').insert({
        espace_id: espaceId, type: 'suppression', cible_table: cible.table, cible_id: cible.id,
        cible_libelle: cible.libelle, motif: motif.trim(),
      });
      if (error) throw error;
      notifierSucces('Demande envoyée au propriétaire');
      await rafraichirDonnees();
      fermer();
    } catch (e) {
      notifierErreur(e);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Stack>
      <Text size="sm">Seul le propriétaire peut supprimer. Expliquez-lui pourquoi : il recevra votre demande.</Text>
      <Textarea label="Motif" value={motif} onChange={(e) => setMotif(e.currentTarget.value)} autosize minRows={3} data-autofocus />
      <Group justify="flex-end">
        <Button variant="default" onClick={fermer}>Annuler</Button>
        <Button onClick={valider} loading={envoi} disabled={!motif.trim()}>Envoyer la demande</Button>
      </Group>
    </Stack>
  );
}

/** Ouvre la fenêtre de suppression adaptée au rôle (corbeille, ou demande pour un gestionnaire). */
export function useSupprimer() {
  const { espace, role } = useEspace();
  return (cible: CibleSuppression, opts?: { definitif?: boolean }) => {
    const id = `suppr-${cible.id}`;
    const fermer = () => modals.close(id);
    if (!peut('supprimer', role)) {
      modals.open({
        modalId: id,
        title: <Text fw={700}>Demander la suppression de {cible.type} « {cible.libelle} »</Text>,
        children: <ContenuDemande cible={cible} espaceId={espace!.id} fermer={fermer} />,
      });
      return;
    }
    const definitif = !!opts?.definitif;
    modals.open({
      modalId: id,
      size: 'lg',
      title: (
        <Text fw={800} c={definitif ? 'red' : undefined}>
          {definitif ? `⚠️ Supprimer DÉFINITIVEMENT ${cible.type} « ${cible.libelle} » ?` : `🗑️ Mettre ${cible.type} « ${cible.libelle} » à la corbeille ?`}
        </Text>
      ),
      children: <ContenuSuppression cible={cible} definitif={definitif} fermer={fermer} />,
    });
  };
}
