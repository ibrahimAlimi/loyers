import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import type { ModePaiement, Recu } from '@/lib/types';

export interface LogementLibre {
  value: string;
  label: string;
  loyer_reference: number | null;
}

export function useLogementsLibres() {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['logements-libres', espace.id],
    queryFn: async (): Promise<LogementLibre[]> => {
      const [logs, actifs] = await Promise.all([
        supabase.from('logements').select('id, designation, loyer_reference, maison:maisons!inner(nom, supprime_le)')
          .eq('espace_id', espace.id).is('supprime_le', null).is('maison.supprime_le', null),
        supabase.from('baux').select('logement_id').eq('espace_id', espace.id).is('date_fin', null).is('supprime_le', null),
      ]);
      const occupes = new Set((actifs.data ?? []).map((b) => b.logement_id));
      return ((logs.data ?? []) as unknown as { id: string; designation: string; loyer_reference: number | null; maison: { nom: string } }[])
        .filter((l) => !occupes.has(l.id))
        .map((l) => ({ value: l.id, label: `${l.maison.nom} · ${l.designation}`, loyer_reference: l.loyer_reference }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    },
  });
}

export interface NouveauBail {
  logement_id: string;
  locataire_id: string;
  reference: string | null;
  date_debut: string;
  jour_echeance: number;
  loyer: number;
  premier_mois_montant: number | null;
  caution_montant: number;
}

export function useCreerBail() {
  return useMutation({
    mutationFn: async (b: NouveauBail) => {
      // espace_id est imposé par la base à partir du logement
      const { data, error } = await supabase.from('baux').insert({ ...b, espace_id: undefined }).select('id').single();
      if (error) {
        if (/baux_un_actif_par_logement/.test(error.message)) throw new Error('Ce logement a déjà un bail en cours.');
        throw error;
      }
      return data.id as string;
    },
    onSuccess: rafraichirDonnees,
  });
}

export function useTerminerBail() {
  return useMutation({
    mutationFn: async ({ bailId, dateFin }: { bailId: string; dateFin: string }) => {
      const { error } = await supabase.from('baux').update({ date_fin: dateFin }).eq('id', bailId);
      if (error) throw error;
    },
    onSuccess: rafraichirDonnees,
  });
}

export function useRevisionLoyer() {
  return useMutation({
    mutationFn: async ({ bailId, moisEffet, montant }: { bailId: string; moisEffet: string; montant: number }) => {
      const { error } = await supabase.from('revisions_loyer').upsert(
        { bail_id: bailId, mois_effet: moisEffet, montant },
        { onConflict: 'bail_id,mois_effet' },
      );
      if (error) throw error;
    },
    onSuccess: rafraichirDonnees,
  });
}

export function useMouvementCaution() {
  return useMutation({
    mutationFn: async (m: {
      bailId: string; type: 'versement' | 'remboursement' | 'retenue'; montant: number; date: string;
      motif?: string; mode?: ModePaiement;
    }): Promise<Recu> => {
      const { data, error } = await supabase.rpc('enregistrer_mouvement_caution', {
        p_bail: m.bailId, p_type: m.type, p_montant: m.montant, p_date: m.date,
        p_motif: m.motif ?? null, p_mode: m.mode ?? 'especes',
      });
      if (error) throw error;
      return data as Recu;
    },
    onSuccess: rafraichirDonnees,
  });
}
