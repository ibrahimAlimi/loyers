import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { emailDeConnexion, supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import type { Profil } from '@/lib/types';

interface AuthContexte {
  session: Session | null;
  profil: Profil | null;
  chargement: boolean;
  seConnecter: (identifiantOuEmail: string, motDePasse: string) => Promise<void>;
  seDeconnecter: () => Promise<void>;
  rechargerProfil: () => Promise<void>;
}

const Ctx = createContext<AuthContexte | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);

  const chargerProfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const { data } = await supabase.from('profils').select('*').eq('id', s.user.id).single();
    setProfil((data as Profil) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await chargerProfil(data.session);
      setChargement(false);
    });
    const { data: abo } = supabase.auth.onAuthStateChange((evenement, s) => {
      setSession(s);
      if (evenement === 'SIGNED_IN' || evenement === 'SIGNED_OUT' || evenement === 'USER_UPDATED') {
        void chargerProfil(s);
      }
    });
    return () => abo.subscription.unsubscribe();
  }, [chargerProfil]);

  const seConnecter = async (saisie: string, motDePasse: string) => {
    let identifiant = saisie.trim().toLowerCase();
    if (identifiant.includes('@')) {
      const { data } = await supabase.rpc('identifiant_pour_email', { p_email: identifiant });
      if (!data) throw new Error('Identifiant ou mot de passe incorrect');
      identifiant = data as string;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailDeConnexion(identifiant),
      password: motDePasse,
    });
    if (error) {
      throw new Error(/fetch/i.test(error.message)
        ? 'Pas de connexion Internet. Vérifiez vos données mobiles et réessayez.'
        : 'Identifiant ou mot de passe incorrect');
    }
    await chargerProfil(data.session);
  };

  const seDeconnecter = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  };

  return (
    <Ctx.Provider
      value={{ session, profil, chargement, seConnecter, seDeconnecter, rechargerProfil: () => chargerProfil(session) }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthContexte {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth hors AuthProvider');
  return c;
}
