import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { dayjs } from '@/lib/dates';
import type { Recu } from '@/lib/types';

export interface LigneRecu extends Recu {
  annule: boolean;
}

export const TAILLE_PAGE = 30;

/** Mois (YYYY-MM-01) de début à fin inclus, au plus 60. */
function moisEntre(debut: string, fin: string): string[] {
  const liste: string[] = [];
  for (let m = dayjs(debut).startOf('month'); !m.isAfter(dayjs(fin), 'month') && liste.length < 60; m = m.add(1, 'month')) {
    liste.push(m.format('YYYY-MM-DD'));
  }
  return liste;
}

export function useRecus(filtres: {
  recherche: string; type: string | null; debut: string | null; fin: string | null;
  /** Mois payés : reçus dont un des mois est dans cette plage (YYYY-MM-01). */
  moisDebut: string | null; moisFin: string | null; page: number;
}) {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['recus', espace.id, filtres],
    placeholderData: (precedent) => precedent,
    queryFn: async () => {
      let q = supabase
        .from('recus')
        .select('*, paiement:paiements(statut)', { count: 'exact' })
        .eq('espace_id', espace.id)
        .is('supprime_le', null)
        .order('emis_le', { ascending: false })
        .range(filtres.page * TAILLE_PAGE, filtres.page * TAILLE_PAGE + TAILLE_PAGE - 1);
      if (filtres.type) q = q.eq('type', filtres.type);
      if (filtres.debut) q = q.gte('emis_le', filtres.debut);
      if (filtres.fin) q = q.lte('emis_le', `${filtres.fin}T23:59:59`);
      if (filtres.moisDebut) {
        const mois = moisEntre(filtres.moisDebut, filtres.moisFin ?? filtres.moisDebut);
        q = q.or(mois.map((m) => `contenu->mois.cs.["${m}"]`).join(','));
      }
      const r = filtres.recherche.trim().replace(/[,()]/g, ' ');
      if (r) q = q.or(`numero.ilike.%${r}%,contenu->locataire->>nom_complet.ilike.%${r}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return {
        total: count ?? 0,
        lignes: (data as (Recu & { paiement: { statut: string } | null })[]).map((x) => ({
          ...x,
          annule: x.paiement?.statut === 'annule',
        })) as LigneRecu[],
      };
    },
  });
}
