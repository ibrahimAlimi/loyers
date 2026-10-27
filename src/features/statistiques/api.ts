import { useQuery } from '@tanstack/react-query';
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

export function useParMois(debut: string, fin: string, maisonId: string | null = null) {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['stats-mois', espace.id, debut, fin, maisonId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stats_par_mois', {
        p_espace: espace.id, p_debut: debut, p_fin: fin, p_maison: maisonId,
      });
      if (error) throw error;
      return data as { mois: string; attendu: number; encaisse: number }[];
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
