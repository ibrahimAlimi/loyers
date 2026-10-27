import { supabase } from './supabase';

export type ActionJournal =
  | 'connexion' | 'deconnexion' | 'export_statistiques' | 'export_audit' | 'consultation_locataire'
  | 'consultation_audit' | 'partage_recu' | 'double_auth_activee' | 'double_auth_desactivee';

/** Signale au journal d'audit une action que la base ne voit pas passer. Ne bloque jamais l'utilisateur. */
export function journaliser(action: ActionJournal, o: {
  espace?: string | null; table?: string; id?: string; libelle?: string; details?: Record<string, unknown>;
} = {}): void {
  void supabase.rpc('journaliser', {
    p_action: action, p_espace: o.espace ?? null, p_cible_table: o.table ?? null, p_cible_id: o.id ?? null,
    p_libelle: o.libelle ?? null, p_details: o.details ?? null,
  }).then(() => undefined, () => undefined);
}
