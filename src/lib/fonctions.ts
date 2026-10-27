import { supabase } from './supabase';

/** Appelle une Edge Function et renvoie un message d'erreur lisible. */
export async function appelerFonction<T>(nom: string, corps: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nom, { body: corps as Record<string, unknown> });
  if (error) {
    let message = "L'opération a échoué. Réessayez.";
    try {
      const detail = await (error as { context?: Response }).context?.json();
      if (detail?.erreur) message = detail.erreur;
    } catch {
      /* corps non JSON */
    }
    throw new Error(message);
  }
  return data as T;
}

/** Mot de passe provisoire lisible (sans caractères ambigus). */
export function motDePasseProvisoire(): string {
  const lettres = 'abcdefghjkmnpqrstuvwxyz';
  const chiffres = '23456789';
  const tirer = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const partie = (n: number) => Array.from({ length: n }, () => tirer(lettres)).join('');
  return `${partie(4)}-${Array.from({ length: 4 }, () => tirer(chiffres)).join('')}`;
}
