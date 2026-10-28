import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { appelerFonction } from '@/lib/fonctions';
import type { Espace } from '@/lib/types';

export interface EspaceAdmin extends Espace {
  nb_logements: number;
  nb_membres: number;
  proprietaire: string | null;
  proprietaire_id: string | null;
}

export function useEspacesAdmin() {
  return useQuery({
    queryKey: ['admin-espaces'],
    queryFn: async (): Promise<EspaceAdmin[]> => {
      const [espaces, logements, membres] = await Promise.all([
        supabase.from('espaces').select('*').is('supprime_le', null).order('nom'),
        supabase.from('logements').select('espace_id').is('supprime_le', null),
        supabase.from('membres').select('espace_id, role, user_id, profil:profils(nom_complet)').eq('actif', true),
      ]);
      if (espaces.error) throw espaces.error;
      const ms = (membres.data ?? []) as unknown as { espace_id: string; role: string; user_id: string; profil: { nom_complet: string } }[];
      return (espaces.data as Espace[]).map((e) => ({
        ...e,
        nb_logements: (logements.data ?? []).filter((l) => l.espace_id === e.id).length,
        nb_membres: ms.filter((m) => m.espace_id === e.id).length,
        proprietaire: ms.find((m) => m.espace_id === e.id && m.role === 'proprietaire')?.profil.nom_complet ?? null,
        proprietaire_id: ms.find((m) => m.espace_id === e.id && m.role === 'proprietaire')?.user_id ?? null,
      }));
    },
  });
}

export interface NouvelEspace {
  espace: { nom: string; prefixe_recu: string; ville: string };
  identifiant: string;
  nom_complet: string;
  telephone: string;
  email: string;
  mot_de_passe_provisoire: string;
}

export function useCreerEspace() {
  return useMutation({
    mutationFn: (v: NouvelEspace) => appelerFonction<{ espace_id: string }>('creer-utilisateur', v),
    onSuccess: rafraichirDonnees,
  });
}

export function useModifierEspaceAdmin() {
  return useMutation({
    mutationFn: async ({ id, ...v }: Partial<Espace> & { id: string }) => {
      const { error } = await supabase.from('espaces').update(v).eq('id', id);
      if (error) throw error;
    },
    onSuccess: rafraichirDonnees,
  });
}

export interface DemandeAcces {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  ville: string | null;
  nb_logements: number | null;
  message: string | null;
  statut: 'en_attente' | 'acceptee' | 'refusee';
  cree_le: string;
}

export function useDemandesAcces() {
  return useQuery({
    queryKey: ['demandes-acces'],
    queryFn: async () => {
      const { data, error } = await supabase.from('demandes_acces').select('*')
        .eq('statut', 'en_attente').order('cree_le', { ascending: false });
      if (error) throw error;
      return data as DemandeAcces[];
    },
  });
}

/** Accepte ou refuse une demande, puis prévient le demandeur par e-mail s'il en a donné un. */
export function useTraiterDemandeAcces() {
  return useMutation({
    mutationFn: async (v: { id: string; accepter: boolean; espaceId?: string; reponse?: string; identifiant?: string }) => {
      const { error } = await supabase.rpc('traiter_demande_acces', {
        p_id: v.id, p_accepter: v.accepter, p_espace: v.espaceId ?? null, p_reponse: v.reponse ?? null,
      });
      if (error) throw error;
      return appelerFonction<{ envoye: boolean }>('repondre-demande-acces', { demande_id: v.id, identifiant: v.identifiant })
        .catch(() => ({ envoye: false }));
    },
    onSuccess: rafraichirDonnees,
  });
}

export interface Utilisation {
  base_octets: number;
  base_limite: number;
  stockage_octets: number;
  stockage_limite: number;
  nb_espaces: number;
  nb_comptes: number;
  nb_logements: number;
  demandes_en_attente: number;
  activite: Record<string, string | null>;
}

export function useUtilisation() {
  return useQuery({
    queryKey: ['utilisation-plateforme'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('utilisation_plateforme');
      if (error) throw error;
      return data as Utilisation;
    },
  });
}
