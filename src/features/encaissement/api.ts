import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { ajouterMois, aujourdhui, finDuMois } from '@/lib/dates';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { nomComplet } from '@/lib/format';
import type { Echeance, ModePaiement, Recu, SituationBail } from '@/lib/types';

export interface BailEncaissable {
  bail_id: string;
  locataire_id: string;
  nom: string;
  prenoms: string | null;
  telephone: string | null;
  maison: string;
  logement: string;
  situation: SituationBail;
  parti: boolean;
}

/** Baux actifs + baux terminés qui ont encore des arriérés. */
export function useBauxEncaissables() {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['encaissables', espace.id],
    queryFn: async (): Promise<BailEncaissable[]> => {
      const { data, error } = await supabase
        .from('v_situation_baux')
        .select('*, locataire:locataires(nom, prenoms, telephone, supprime_le), logement:logements(designation, maison:maisons(nom))')
        .eq('espace_id', espace.id);
      if (error) throw error;
      type Ligne = SituationBail & {
        locataire: { nom: string; prenoms: string | null; telephone: string | null; supprime_le: string | null };
        logement: { designation: string; maison: { nom: string } };
      };
      return (data as Ligne[])
        .filter((s) => !s.locataire.supprime_le && (s.actif || s.montant_du > 0))
        .map((s) => ({
          bail_id: s.bail_id,
          locataire_id: s.locataire_id,
          nom: nomComplet(s.locataire),
          prenoms: s.locataire.prenoms,
          telephone: s.locataire.telephone,
          maison: s.logement.maison.nom,
          logement: s.logement.designation,
          situation: s,
          parti: !s.actif,
        }))
        .sort((a, b) => Number(a.parti) - Number(b.parti)
          || b.situation.nb_mois_retard - a.situation.nb_mois_retard
          || a.nom.localeCompare(b.nom, 'fr'));
    },
  });
}

/** Échéances jusqu'à 12 mois après le mois courant (pour proposer aussi l'avance). */
export function useEcheances(bailId: string | null) {
  return useQuery({
    queryKey: ['echeances', bailId],
    enabled: !!bailId,
    queryFn: async (): Promise<Echeance[]> => {
      const { data, error } = await supabase.rpc('echeances_bail', {
        p_bail: bailId!,
        p_jusqua: finDuMois(ajouterMois(aujourdhui(), 12)),
      });
      if (error) throw error;
      return data as Echeance[];
    },
  });
}

export interface Encaissement {
  bailId: string;
  date: string;
  montant: number;
  mode: ModePaiement;
  reference: string;
  payeur: string;
  mois: string[];
  reste: 'partiel' | 'remise';
  motifRemise: string;
  cle: string;
  remplace?: string;
}

export function useEncaisserMutation() {
  return useMutation({
    mutationFn: async (e: Encaissement): Promise<Recu> => {
      const { data, error } = await supabase.rpc('encaisser', {
        p_bail: e.bailId,
        p_date: e.date,
        p_montant: e.montant,
        p_mode: e.mode,
        p_reference: e.reference,
        p_payeur: e.payeur,
        p_cle_idempotence: e.cle,
        p_mois: e.mois.length ? e.mois : null,
        p_reste: e.reste,
        p_motif_remise: e.motifRemise || null,
        p_remplace: e.remplace ?? null,
      });
      if (error) throw error;
      return data as Recu;
    },
    onSuccess: rafraichirDonnees,
  });
}
