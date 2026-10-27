import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const TAILLE_PAGE_AUDIT = 50;

export interface FiltresAudit {
  espace: string | null;
  utilisateur: string | null;
  action: string | null;
  debut: string | null;
  fin: string | null;
  recherche: string;
}

export interface EntreeJournal {
  id: number;
  le: string;
  user_id: string | null;
  identifiant: string | null;
  espace_id: string | null;
  action: string;
  cible_table: string | null;
  cible_id: string | null;
  libelle: string | null;
  details: Record<string, unknown> | null;
  reussi: boolean;
  ip: string | null;
  appareil: string | null;
  navigateur: string | null;
  profil: { nom_complet: string } | null;
}

export interface EntreeHistorique {
  id: number;
  le: string;
  table_nom: string;
  ligne_id: string;
  operation: 'insert' | 'update' | 'delete';
  avant: Record<string, unknown> | null;
  apres: Record<string, unknown> | null;
  champs_modifies: string[] | null;
  par: string | null;
  espace_id: string | null;
  ip: string | null;
  appareil: string | null;
  auteur: { nom_complet: string; identifiant: string } | null;
}

const finJournee = (d: string) => `${d}T23:59:59.999`;

function requeteJournal(f: FiltresAudit) {
  let q = supabase.from('journal_audit')
    .select('*, profil:profils!journal_audit_user_id_fkey(nom_complet)', { count: 'exact' })
    .order('le', { ascending: false });
  if (f.espace) q = q.eq('espace_id', f.espace);
  if (f.utilisateur) q = q.eq('user_id', f.utilisateur);
  if (f.action === 'connexion_echec') q = q.eq('action', 'connexion').eq('reussi', false);
  else if (f.action) q = q.eq('action', f.action);
  if (f.debut) q = q.gte('le', f.debut);
  if (f.fin) q = q.lte('le', finJournee(f.fin));
  if (f.recherche.trim()) {
    const t = f.recherche.trim().replace(/[%,()]/g, ' ');
    q = q.or(`libelle.ilike.%${t}%,identifiant.ilike.%${t}%,appareil.ilike.%${t}%`);
  }
  return q;
}

function requeteHistorique(f: FiltresAudit) {
  let q = supabase.from('historique_modifications')
    .select('*, auteur:profils!historique_modifications_par_fkey(nom_complet, identifiant)', { count: 'exact' })
    .order('le', { ascending: false });
  if (f.espace) q = q.eq('espace_id', f.espace);
  if (f.utilisateur) q = q.eq('par', f.utilisateur);
  if (f.action) q = q.eq('table_nom', f.action);
  if (f.debut) q = q.gte('le', f.debut);
  if (f.fin) q = q.lte('le', finJournee(f.fin));
  return q;
}

export function useJournal(f: FiltresAudit, page: number) {
  return useQuery({
    queryKey: ['audit-journal', f, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error, count } = await requeteJournal(f).range(page * TAILLE_PAGE_AUDIT, (page + 1) * TAILLE_PAGE_AUDIT - 1);
      if (error) throw error;
      return { lignes: data as EntreeJournal[], total: count ?? 0 };
    },
  });
}

export function useHistorique(f: FiltresAudit, page: number) {
  return useQuery({
    queryKey: ['audit-historique', f, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error, count } = await requeteHistorique(f).range(page * TAILLE_PAGE_AUDIT, (page + 1) * TAILLE_PAGE_AUDIT - 1);
      if (error) throw error;
      return { lignes: data as EntreeHistorique[], total: count ?? 0 };
    },
  });
}

/** Tout ce qui correspond aux filtres, par paquets de 1 000 (limite de l'API), pour l'export. */
export async function toutCharger<T>(type: 'journal' | 'historique', f: FiltresAudit, max = 20_000): Promise<T[]> {
  const lignes: T[] = [];
  for (let debut = 0; debut < max; debut += 1000) {
    const q = type === 'journal' ? requeteJournal(f) : requeteHistorique(f);
    const { data, error } = await q.range(debut, debut + 999);
    if (error) throw error;
    lignes.push(...(data as T[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return lignes;
}

/** Historique d'une fiche (et des lignes liées : baux d'un locataire, logements d'une maison…). */
export function useHistoriqueFiche(cibles: { table: string; ids: string[] }[], actif: boolean) {
  return useQuery({
    queryKey: ['historique-fiche', cibles],
    enabled: actif && cibles.some((c) => c.ids.length),
    queryFn: async () => {
      const filtre = cibles.filter((c) => c.ids.length)
        .map((c) => `and(table_nom.eq.${c.table},ligne_id.in.(${c.ids.join(',')}))`).join(',');
      const { data, error } = await supabase.from('historique_modifications')
        .select('*, auteur:profils!historique_modifications_par_fkey(nom_complet, identifiant)')
        .or(filtre).order('le', { ascending: false }).limit(200);
      if (error) throw error;
      return data as EntreeHistorique[];
    },
  });
}

export function useTailleJournaux(actif: boolean) {
  return useQuery({
    queryKey: ['taille-journaux'],
    enabled: actif,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('taille_journaux');
      if (error) throw error;
      return data as Record<'audit' | 'historique', { lignes: number; taille: string; plus_ancien: string | null }>;
    },
  });
}

export function useComptes() {
  return useQuery({
    queryKey: ['audit-comptes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profils').select('id, nom_complet, identifiant').order('nom_complet');
      if (error) throw error;
      return data as { id: string; nom_complet: string; identifiant: string }[];
    },
  });
}
