import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { emailDeConnexion, supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import type { Profil } from '@/lib/types';

export interface NiveauAuth {
  /** Niveau de la session : aal1 (mot de passe) ou aal2 (code vérifié). */
  actuel: 'aal1' | 'aal2' | null;
  /** aal2 si l'utilisateur a activé la double authentification. */
  requis: 'aal1' | 'aal2' | null;
}

interface AuthContexte {
  session: Session | null;
  profil: Profil | null;
  niveau: NiveauAuth;
  chargement: boolean;
  seConnecter: (identifiantOuEmail: string, motDePasse: string, captchaToken?: string) => Promise<void>;
  seDeconnecter: () => Promise<void>;
  rechargerProfil: () => Promise<void>;
  /** Relit le niveau d'authentification (après saisie ou activation du code). */
  rechargerNiveau: () => Promise<void>;
}

const Ctx = createContext<AuthContexte | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [niveau, setNiveau] = useState<NiveauAuth>({ actuel: null, requis: null });
  const [chargement, setChargement] = useState(true);

  const chargerNiveau = useCallback(async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setNiveau({ actuel: (data?.currentLevel as NiveauAuth['actuel']) ?? null, requis: (data?.nextLevel as NiveauAuth['requis']) ?? null });
  }, []);

  const chargerProfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      setNiveau({ actuel: null, requis: null });
      return;
    }
    await chargerNiveau();
    const { data } = await supabase.from('profils').select('*').eq('id', s.user.id).single();
    setProfil((data as Profil) ?? null);
  }, [chargerNiveau]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await chargerProfil(data.session);
      setChargement(false);
    });
    const { data: abo } = supabase.auth.onAuthStateChange((evenement, s) => {
      setSession(s);
      if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'MFA_CHALLENGE_VERIFIED'].includes(evenement)) {
        void chargerProfil(s);
      }
    });
    return () => abo.subscription.unsubscribe();
  }, [chargerProfil]);

  const seConnecter = async (saisie: string, motDePasse: string, captchaToken?: string) => {
    let identifiant = saisie.trim().toLowerCase();
    if (identifiant.includes('@')) {
      const { data } = await supabase.rpc('identifiant_pour_email', { p_email: identifiant });
      if (!data) throw new Error('Identifiant ou mot de passe incorrect');
      identifiant = data as string;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailDeConnexion(identifiant),
      password: motDePasse,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      if (/fetch/i.test(error.message)) throw new Error('Pas de connexion Internet. Vérifiez vos données mobiles et réessayez.');
      if (/captcha/i.test(error.message)) throw new Error('La vérification anti-robot a échoué. Réessayez.');
      if (/rate limit|too many/i.test(error.message)) throw new Error('Trop de tentatives. Patientez quelques minutes avant de réessayer.');
      throw new Error('Identifiant ou mot de passe incorrect');
    }
    await chargerProfil(data.session);
  };

  const seDeconnecter = async () => {
    // Un appareil déconnecté (souvent partagé) ne reçoit plus les notifications de ce compte.
    await import('@/features/notifications/push').then((m) => m.desactiverPush()).catch(() => undefined);
    await supabase.auth.signOut();
    queryClient.clear();
  };

  return (
    <Ctx.Provider
      value={{
        session, profil, niveau, chargement, seConnecter, seDeconnecter,
        rechargerProfil: () => chargerProfil(session),
        rechargerNiveau: async () => {
          await supabase.auth.refreshSession();
          await chargerProfil((await supabase.auth.getSession()).data.session);
          await queryClient.invalidateQueries();
        },
      }}
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
