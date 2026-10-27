import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définis dans .env.local');
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Domaine technique des e-mails de connexion synthétiques (voir ADR 0003). */
export const DOMAINE_COMPTES = 'comptes.mes-loyers.app';
export const emailDeConnexion = (identifiant: string) =>
  `${identifiant.trim().toLowerCase()}@${DOMAINE_COMPTES}`;
