import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { ajouterMois, aujourdhui } from '@/lib/dates';
import { nomComplet } from '@/lib/format';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import type { Echeance, EtiquetteReprise, RepriseAccess } from '@/lib/types';

export interface PaiementAVerifier {
  id: string;
  bail_id: string;
  date_paiement: string;
  montant: number;
  mois: string[];
  a_verifier: EtiquetteReprise[];
  reprise: RepriseAccess;
  locataire: { id: string; nom: string };
  logement: string;
  maison: string;
}

/** Nombre de paiements repris de l'ancien logiciel qui restent à vérifier. */
export function useNbAVerifier(actif = true) {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['a-verifier', espace.id, 'nombre'],
    enabled: actif,
    queryFn: async () => {
      const { count, error } = await supabase.from('paiements').select('id', { count: 'exact', head: true })
        .eq('espace_id', espace.id).eq('statut', 'valide').is('supprime_le', null).neq('a_verifier', '{}');
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useAVerifier() {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['a-verifier', espace.id],
    queryFn: async (): Promise<PaiementAVerifier[]> => {
      const { data, error } = await supabase
        .from('paiements')
        .select('id, bail_id, date_paiement, montant, a_verifier, reprise, imputations(mois, montant, remise, supprime_le), '
          + 'bail:baux(locataire:locataires(id, nom, prenoms), logement:logements(designation, maison:maisons(nom)))')
        .eq('espace_id', espace.id).eq('statut', 'valide').is('supprime_le', null).neq('a_verifier', '{}')
        .order('date_paiement');
      if (error) throw error;
      type Brut = {
        id: string; bail_id: string; date_paiement: string; montant: number; a_verifier: string[]; reprise: unknown;
        imputations: { mois: string; montant: number; remise: number; supprime_le: string | null }[];
        bail: { locataire: { id: string; nom: string; prenoms: string | null }; logement: { designation: string; maison: { nom: string } } };
      };
      return (data as unknown as Brut[]).map((p) => ({
        id: p.id, bail_id: p.bail_id, date_paiement: p.date_paiement, montant: p.montant,
        a_verifier: p.a_verifier as EtiquetteReprise[], reprise: p.reprise as RepriseAccess,
        mois: p.imputations.filter((i) => !i.supprime_le && (i.montant > 0 || i.remise > 0)).map((i) => i.mois).sort(),
        locataire: { id: p.bail.locataire.id, nom: nomComplet(p.bail.locataire) },
        logement: p.bail.logement.designation,
        maison: p.bail.logement.maison.nom,
      })).sort((a, b) => a.locataire.nom.localeCompare(b.locataire.nom, 'fr') || (a.mois[0] ?? '').localeCompare(b.mois[0] ?? ''));
    },
  });
}

/** Mois du bail, du début jusqu'à un an après aujourd'hui, avec ce qui reste dû. */
export function useMoisDuBail(bailId: string, actif: boolean) {
  return useQuery({
    queryKey: ['echeances', bailId, 'reprise'],
    enabled: actif,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('echeances_bail', { p_bail: bailId, p_jusqua: ajouterMois(aujourdhui(), 12) });
      if (error) throw error;
      return data as Echeance[];
    },
  });
}

export function useChangerMois() {
  return useMutation({
    mutationFn: async ({ paiementId, mois }: { paiementId: string; mois: string }) => {
      const { error } = await supabase.rpc('changer_mois_paiement_repris', { p_paiement: paiementId, p_mois: mois });
      if (error) throw error;
    },
    onSuccess: rafraichirDonnees,
  });
}

export function useValiderPaiementRepris() {
  return useMutation({
    mutationFn: async (paiementId: string) => {
      const { error } = await supabase.rpc('valider_paiement_repris', { p_paiement: paiementId });
      if (error) throw error;
    },
    onSuccess: rafraichirDonnees,
  });
}
