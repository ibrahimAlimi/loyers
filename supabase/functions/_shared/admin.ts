import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const DOMAINE_COMPTES = 'comptes.mes-loyers.app';
export const emailDeConnexion = (identifiant: string) => `${identifiant.trim().toLowerCase()}@${DOMAINE_COMPTES}`;
export const IDENTIFIANT_VALIDE = /^[a-z0-9._-]{3,40}$/;

export function clientAdmin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Appelant {
  id: string;
  estSuperAdmin: boolean;
}

/** Niveau d'authentification (aal1 / aal2) lu dans le JWT, dont la signature est vérifiée par getUser. */
function niveauJeton(jeton: string): string {
  try {
    const b64 = jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const charge = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')));
    return charge.aal ?? 'aal1';
  } catch {
    return 'aal1';
  }
}

/**
 * Vérifie le JWT de la requête et renvoie l'appelant, ou null.
 * Double authentification : si l'utilisateur l'a activée, la session doit être aal2 ;
 * les pouvoirs de super admin exigent toujours aal2.
 */
export async function appelant(req: Request, admin: SupabaseClient): Promise<Appelant | null> {
  const jeton = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jeton) return null;
  const { data, error } = await admin.auth.getUser(jeton);
  if (error || !data.user) return null;
  const aal2 = niveauJeton(jeton) === 'aal2';
  const mfaActive = (data.user.factors ?? []).some((f) => f.status === 'verified');
  if (mfaActive && !aal2) return null;
  const { data: profil } = await admin.from('profils').select('est_super_admin, actif').eq('id', data.user.id).single();
  if (!profil?.actif) return null;
  return { id: data.user.id, estSuperAdmin: !!profil.est_super_admin && aal2 };
}

/** L'appelant est-il propriétaire actif de l'espace ? */
export async function estProprietaire(admin: SupabaseClient, userId: string, espaceId: string): Promise<boolean> {
  const { data } = await admin
    .from('membres')
    .select('role')
    .eq('espace_id', espaceId)
    .eq('user_id', userId)
    .eq('actif', true)
    .maybeSingle();
  return data?.role === 'proprietaire';
}
