import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import type { Espace, Role } from '@/lib/types';

interface EspaceAvecRole extends Espace {
  role: Role;
}

interface EspaceContexte {
  espace: EspaceAvecRole | null;
  role: Role | null;
  espaces: EspaceAvecRole[];
  chargement: boolean;
  /** Plusieurs espaces et aucun choix encore fait. */
  choixRequis: boolean;
  changerEspace: (id: string) => void;
  rafraichir: () => void;
}

const CLE = 'mes-loyers:espace';
const lire = () => {
  try {
    return localStorage.getItem(CLE);
  } catch {
    return null;
  }
};
const ecrire = (id: string) => {
  try {
    localStorage.setItem(CLE, id);
  } catch {
    /* stockage indisponible */
  }
};

const Ctx = createContext<EspaceContexte | null>(null);

export function EspaceProvider({ children }: { children: ReactNode }) {
  const { profil } = useAuth();
  const [choisi, setChoisi] = useState<string | null>(lire);

  const requete = useQuery({
    queryKey: ['mes-espaces', profil?.id, profil?.est_super_admin],
    enabled: !!profil,
    queryFn: async (): Promise<EspaceAvecRole[]> => {
      if (profil!.est_super_admin) {
        const { data, error } = await supabase.from('espaces').select('*').is('supprime_le', null).order('nom');
        if (error) throw error;
        return (data as Espace[]).map((e) => ({ ...e, role: 'super_admin' as Role }));
      }
      const { data, error } = await supabase
        .from('membres')
        .select('role, espace:espaces(*)')
        .eq('user_id', profil!.id)
        .eq('actif', true);
      if (error) throw error;
      return (data as unknown as { role: Role; espace: Espace | null }[])
        .filter((m) => m.espace && m.espace.actif)
        .map((m) => ({ ...(m.espace as Espace), role: m.role }));
    },
  });

  const espaces = useMemo(() => requete.data ?? [], [requete.data]);
  const espace = useMemo(() => {
    if (!espaces.length) return null;
    return espaces.find((e) => e.id === choisi) ?? (espaces.length === 1 || profil?.est_super_admin ? espaces[0] : null);
  }, [espaces, choisi, profil?.est_super_admin]);

  useEffect(() => {
    if (espace && espace.id !== choisi) setChoisi(espace.id);
  }, [espace, choisi]);

  const valeur: EspaceContexte = {
    espace,
    role: profil?.est_super_admin ? 'super_admin' : (espace?.role ?? null),
    espaces,
    chargement: !!profil && requete.isLoading,
    choixRequis: !profil?.est_super_admin && espaces.length > 1 && !espace,
    changerEspace: (id) => {
      ecrire(id);
      setChoisi(id);
    },
    rafraichir: () => void requete.refetch(),
  };

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useEspace(): EspaceContexte {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEspace hors EspaceProvider');
  return c;
}

/** Espace courant, garanti non nul (à utiliser sous AppShell). */
export function useEspaceCourant(): EspaceAvecRole & { role: Role } {
  const { espace, role } = useEspace();
  if (!espace || !role) throw new Error('Aucun espace sélectionné');
  return { ...espace, role };
}
