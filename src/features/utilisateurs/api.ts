import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { appelerFonction } from '@/lib/fonctions';
import { useEspaceCourant } from '@/espace/EspaceProvider';

export interface Membre {
  user_id: string;
  role: 'proprietaire' | 'gestionnaire' | 'consultation';
  actif: boolean;
  identifiant: string;
  nom_complet: string;
  telephone: string | null;
  email: string | null;
  maisons: { id: string; nom: string }[];
}

export function useMembres() {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['membres', espace.id],
    queryFn: async (): Promise<Membre[]> => {
      const [membres, maisons, portees] = await Promise.all([
        supabase.from('membres').select('user_id, role, actif, profil:profils(identifiant, nom_complet, telephone, email)').eq('espace_id', espace.id),
        supabase.from('maisons').select('id, nom, gestionnaire_id').eq('espace_id', espace.id).is('supprime_le', null),
        supabase.from('membre_maisons').select('user_id, maison_id').eq('espace_id', espace.id),
      ]);
      if (membres.error) throw membres.error;
      const toutes = maisons.data ?? [];
      return (membres.data as unknown as (Omit<Membre, 'maisons' | 'identifiant' | 'nom_complet' | 'telephone' | 'email'> & {
        profil: { identifiant: string; nom_complet: string; telephone: string | null; email: string | null };
      })[]).map((m) => ({
        user_id: m.user_id,
        role: m.role,
        actif: m.actif,
        ...m.profil,
        maisons: m.role === 'gestionnaire'
          ? toutes.filter((x) => x.gestionnaire_id === m.user_id).map(({ id, nom }) => ({ id, nom }))
          : toutes.filter((x) => (portees.data ?? []).some((p) => p.user_id === m.user_id && p.maison_id === x.id))
            .map(({ id, nom }) => ({ id, nom })),
      })).sort((a, b) => a.role.localeCompare(b.role) || a.nom_complet.localeCompare(b.nom_complet, 'fr'));
    },
  });
}

export interface NouveauCompte {
  identifiant: string;
  nom_complet: string;
  telephone?: string;
  email?: string;
  role: 'gestionnaire' | 'consultation';
  maisons: string[];
  mot_de_passe_provisoire: string;
  ajouter_existant?: boolean;
}

export function useCreerCompte() {
  const espace = useEspaceCourant();
  return useMutation({
    mutationFn: (c: NouveauCompte) => appelerFonction<{ user_id: string }>('creer-utilisateur', { ...c, espace_id: espace.id }),
    onSuccess: rafraichirDonnees,
  });
}

export function useReinitialiserMdp() {
  return useMutation({
    mutationFn: (v: { user_id: string; nouveau_mot_de_passe: string }) => appelerFonction('reinitialiser-mdp', v),
  });
}

export function useModifierMembre() {
  const espace = useEspaceCourant();
  return useMutation({
    mutationFn: async ({ m, actif, maisons }: { m: Membre; actif?: boolean; maisons?: string[] }) => {
      if (actif !== undefined) {
        const { error } = await supabase.from('membres').update({ actif }).eq('espace_id', espace.id).eq('user_id', m.user_id);
        if (error) throw error;
      }
      if (maisons) {
        if (m.role === 'gestionnaire') {
          const retirer = m.maisons.filter((x) => !maisons.includes(x.id)).map((x) => x.id);
          if (retirer.length) {
            const { error } = await supabase.from('maisons').update({ gestionnaire_id: null }).in('id', retirer);
            if (error) throw error;
          }
          if (maisons.length) {
            const { error } = await supabase.from('maisons').update({ gestionnaire_id: m.user_id }).in('id', maisons);
            if (error) throw error;
          }
        } else {
          await supabase.from('membre_maisons').delete().eq('espace_id', espace.id).eq('user_id', m.user_id);
          if (maisons.length) {
            const { error } = await supabase.from('membre_maisons')
              .insert(maisons.map((maison_id) => ({ espace_id: espace.id, user_id: m.user_id, maison_id })));
            if (error) throw error;
          }
        }
      }
    },
    onSuccess: rafraichirDonnees,
  });
}
