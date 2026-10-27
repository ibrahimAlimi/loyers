import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';

export type Preferences = Record<string, unknown>;

/**
 * Modifie les préférences du compte sans écraser celles écrites ailleurs entre-temps :
 * on relit la valeur en base, on applique la modification, puis on recharge le profil.
 */
export function useMajPreferences() {
  const { profil, rechargerProfil } = useAuth();
  return useCallback(async (modifier: (p: Preferences) => Preferences) => {
    if (!profil) return;
    const { data, error: e1 } = await supabase.from('profils').select('preferences').eq('id', profil.id).single();
    if (e1) throw e1;
    const suivantes = modifier({ ...((data?.preferences as Preferences) ?? {}) });
    const { error } = await supabase.from('profils').update({ preferences: suivantes }).eq('id', profil.id);
    if (error) throw error;
    await rechargerProfil();
  }, [profil, rechargerProfil]);
}
