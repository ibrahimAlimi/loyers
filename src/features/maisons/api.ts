import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { aujourdhui, finDuMois, premierDuMois } from '@/lib/dates';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import type { Logement, Maison, SituationBail } from '@/lib/types';

export interface MaisonResume extends Maison {
  gestionnaire_nom: string | null;
  nb_logements: number;
  nb_occupes: number;
  encaisse_mois: number;
}

export function useMaisons() {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['maisons', espace.id],
    queryFn: async (): Promise<MaisonResume[]> => {
      const debut = premierDuMois(aujourdhui());
      const [maisons, logements, situations, paiements] = await Promise.all([
        supabase.from('maisons').select('*, gestionnaire:profils!maisons_gestionnaire_id_fkey(nom_complet)')
          .eq('espace_id', espace.id).is('supprime_le', null).order('nom'),
        supabase.from('logements').select('id, maison_id').eq('espace_id', espace.id).is('supprime_le', null),
        supabase.from('v_situation_baux').select('maison_id, logement_id').eq('espace_id', espace.id).eq('actif', true),
        supabase.from('paiements').select('montant, bail:baux(logement:logements(maison_id))')
          .eq('espace_id', espace.id).eq('statut', 'valide').is('supprime_le', null)
          .gte('date_paiement', debut).lte('date_paiement', finDuMois(debut)),
      ]);
      if (maisons.error) throw maisons.error;
      const encaisse = new Map<string, number>();
      for (const p of (paiements.data ?? []) as unknown as { montant: number; bail: { logement: { maison_id: string } } }[]) {
        const id = p.bail?.logement?.maison_id;
        if (id) encaisse.set(id, (encaisse.get(id) ?? 0) + p.montant);
      }
      return (maisons.data as (Maison & { gestionnaire: { nom_complet: string } | null })[]).map((m) => ({
        ...m,
        gestionnaire_nom: m.gestionnaire?.nom_complet ?? null,
        nb_logements: (logements.data ?? []).filter((l) => l.maison_id === m.id).length,
        nb_occupes: new Set((situations.data ?? []).filter((s) => s.maison_id === m.id).map((s) => s.logement_id)).size,
        encaisse_mois: encaisse.get(m.id) ?? 0,
      }));
    },
  });
}

export interface LogementDetail extends Logement {
  situation: (SituationBail & { locataire_nom: string }) | null;
}

export function useMaison(id: string | undefined) {
  return useQuery({
    queryKey: ['maison', id],
    enabled: !!id,
    queryFn: async () => {
      const [maison, logements, situations] = await Promise.all([
        supabase.from('maisons').select('*').eq('id', id!).single(),
        supabase.from('logements').select('*').eq('maison_id', id!).is('supprime_le', null).order('designation'),
        supabase.from('v_situation_baux').select('*, locataire:locataires(nom, prenoms)').eq('maison_id', id!).eq('actif', true),
      ]);
      if (maison.error) throw maison.error;
      const sit = (situations.data ?? []) as (SituationBail & { locataire: { nom: string; prenoms: string | null } })[];
      return {
        maison: maison.data as Maison & { supprime_le: string | null },
        logements: ((logements.data ?? []) as Logement[]).map((l): LogementDetail => {
          const s = sit.find((x) => x.logement_id === l.id);
          return { ...l, situation: s ? { ...s, locataire_nom: `${s.locataire.nom} ${s.locataire.prenoms ?? ''}`.trim() } : null };
        }),
      };
    },
  });
}

export function useGestionnaires() {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['gestionnaires', espace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membres')
        .select('user_id, profil:profils(nom_complet)')
        .eq('espace_id', espace.id)
        .eq('role', 'gestionnaire')
        .eq('actif', true);
      if (error) throw error;
      return (data as unknown as { user_id: string; profil: { nom_complet: string } }[]).map((m) => ({
        value: m.user_id,
        label: m.profil.nom_complet,
      }));
    },
  });
}

export function useEnregistrerMaison() {
  const espace = useEspaceCourant();
  return useMutation({
    mutationFn: async (m: Partial<Maison> & { nom: string }) => {
      const valeurs = {
        nom: m.nom.trim(),
        quartier: m.quartier?.trim() || null,
        ville: m.ville?.trim() || null,
        repere: m.repere?.trim() || null,
        notes: m.notes?.trim() || null,
        gestionnaire_id: m.gestionnaire_id || null,
      };
      const r = m.id
        ? await supabase.from('maisons').update(valeurs).eq('id', m.id).select('id').single()
        : await supabase.from('maisons').insert({ ...valeurs, espace_id: espace.id }).select('id').single();
      if (r.error) throw r.error;
      return r.data.id as string;
    },
    onSuccess: rafraichirDonnees,
  });
}

export function useEnregistrerLogement() {
  return useMutation({
    mutationFn: async (l: Partial<Logement> & { maison_id: string; designation: string; type: Logement['type'] }) => {
      const valeurs = {
        maison_id: l.maison_id,
        type: l.type,
        designation: l.designation.trim(),
        niveau: l.niveau?.trim() || null,
        loyer_reference: l.loyer_reference ?? null,
        notes: l.notes?.trim() || null,
      };
      // espace_id est imposé par la base à partir de la maison
      const r = l.id
        ? await supabase.from('logements').update(valeurs).eq('id', l.id).select('id').single()
        : await supabase.from('logements').insert({ ...valeurs, espace_id: l.espace_id }).select('id').single();
      if (r.error) throw r.error;
      return r.data.id as string;
    },
    onSuccess: rafraichirDonnees,
  });
}
