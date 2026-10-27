import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEspaceCourant } from '@/espace/EspaceProvider';

export interface Resume {
  encaisse: number;
  remises: number;
  attendu: number;
  reste_a_percevoir: number;
  taux_recouvrement: number | null;
  logements_total: number;
  logements_occupes: number;
  nb_retards: number;
  cautions_detenues: number;
  prevision_mois_suivant: number;
}

export interface Indicateurs extends Resume {
  nb_paiements: number;
  taux_occupation: number | null;
  delai_moyen_jours: number | null;
}

export interface FiltresStats {
  maison: string | null;
  type: string | null;
  gestionnaire: string | null;
  mode: string | null;
}

export type Ponctualite = 'exemplaire' | 'surveiller' | 'critique';

export interface StatsCompletes {
  indicateurs: Indicateurs;
  par_mois: { mois: string; attendu: number; encaisse: number }[];
  par_maison: { maison_id: string; nom: string; encaisse: number; attendu: number; reste: number;
    recouvrement: number | null; logements: number; occupes: number }[];
  par_logement: { logement_id: string; maison: string; logement: string; encaisse: number }[];
  par_mode: { mode: string; montant: number; nb: number }[];
  journal: { id: string; date: string; locataire: string; maison: string; logement: string; montant: number;
    remise: number; mode: string; reference: string | null; payeur: string; encaissant: string | null; recu: string | null }[];
  anciennete: { moins_30: number; de_31_a_60: number; plus_60: number };
  debiteurs: { bail_id: string; locataire: string; telephone: string | null; maison: string; logement: string;
    parti: boolean; montant: number; nb_mois: number; jours: number; premier_mois: string }[];
  occupation_par_type: { type: string; total: number; occupes: number }[];
  occupation_12_mois: { mois: string; total: number; occupes: number; taux: number | null }[];
  logements_libres: { logement_id: string; maison: string; logement: string; type: string;
    loyer_estime: number | null; libre_depuis: string | null; jours: number }[];
  vacance_moyenne_jours: number | null;
  manque_a_gagner_mois: number;
  entrees_sorties: { mois: string; entrees: number; sorties: number }[];
  locataires: { bail_id: string; locataire: string; telephone: string | null; maison: string; logement: string;
    depuis: string; date_fin: string | null; mois_anciennete: number; loyer: number; caution: number;
    delai_moyen: number | null; mois_retard: number; ponctualite: Ponctualite;
    derniere_revision: string; a_reviser: boolean }[];
  fins_bail: { bail_id: string; locataire: string; maison: string; logement: string; date_fin: string }[];
  gestionnaires: { user_id: string; nom: string | null; role: string | null; encaisse: number; nb_paiements: number;
    recus_emis: number; annulations_demandees: number; nb_maisons: number; recouvrement: number | null }[];
}

const nettoyer = (f: FiltresStats) => Object.fromEntries(Object.entries(f).filter(([, v]) => v));

export function useStats(debut: string, fin: string, filtres: FiltresStats) {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['stats-completes', espace.id, debut, fin, filtres],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stats_completes', {
        p_espace: espace.id, p_debut: debut, p_fin: fin, p_filtres: nettoyer(filtres), p_complet: true,
      });
      if (error) throw error;
      return data as StatsCompletes;
    },
  });
}

/** Indicateurs seuls, pour la période de comparaison. */
export function useIndicateurs(bornes: [string, string] | null, filtres: FiltresStats) {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['stats-indicateurs', espace.id, bornes, filtres],
    enabled: !!bornes,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stats_completes', {
        p_espace: espace.id, p_debut: bornes![0], p_fin: bornes![1], p_filtres: nettoyer(filtres), p_complet: false,
      });
      if (error) throw error;
      return (data as { indicateurs: Indicateurs }).indicateurs;
    },
  });
}

export function useResume(debut: string, fin: string, maisonId: string | null = null) {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['stats-resume', espace.id, debut, fin, maisonId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stats_resume', {
        p_espace: espace.id, p_debut: debut, p_fin: fin, p_maison: maisonId,
      });
      if (error) throw error;
      return data as Resume;
    },
  });
}

export function useDerniersRecus(limite = 5) {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['derniers-recus', espace.id, limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recus')
        .select('id, numero, emis_le, contenu')
        .eq('espace_id', espace.id)
        .is('supprime_le', null)
        .order('emis_le', { ascending: false })
        .limit(limite);
      if (error) throw error;
      return data as { id: string; numero: string; emis_le: string;
        contenu: { montant: number; locataire: { nom_complet: string }; encaissant: { nom: string; role: string } } }[];
    },
  });
}
