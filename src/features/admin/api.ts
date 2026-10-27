import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { appelerFonction } from '@/lib/fonctions';
import type { Espace } from '@/lib/types';

export interface EspaceAdmin extends Espace {
  nb_logements: number;
  nb_membres: number;
  proprietaire: string | null;
}

export function useEspacesAdmin() {
  return useQuery({
    queryKey: ['admin-espaces'],
    queryFn: async (): Promise<EspaceAdmin[]> => {
      const [espaces, logements, membres] = await Promise.all([
        supabase.from('espaces').select('*').is('supprime_le', null).order('nom'),
        supabase.from('logements').select('espace_id').is('supprime_le', null),
        supabase.from('membres').select('espace_id, role, profil:profils(nom_complet)').eq('actif', true),
      ]);
      if (espaces.error) throw espaces.error;
      const ms = (membres.data ?? []) as unknown as { espace_id: string; role: string; profil: { nom_complet: string } }[];
      return (espaces.data as Espace[]).map((e) => ({
        ...e,
        nb_logements: (logements.data ?? []).filter((l) => l.espace_id === e.id).length,
        nb_membres: ms.filter((m) => m.espace_id === e.id).length,
        proprietaire: ms.find((m) => m.espace_id === e.id && m.role === 'proprietaire')?.profil.nom_complet ?? null,
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
