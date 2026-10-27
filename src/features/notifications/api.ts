import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';

export interface Notification {
  id: string;
  type: string;
  titre: string;
  message: string | null;
  lien: string | null;
  lu_le: string | null;
  cree_le: string;
  canaux: string[];
}

const CLE = ['notifications'];

/** Les 50 dernières notifications de l'application, mises à jour en temps réel. */
export function useNotifications() {
  const { profil } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!profil) return;
    const canal = supabase
      .channel(`notifications-${profil.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profil.id}` },
        () => qc.invalidateQueries({ queryKey: CLE }))
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [profil, qc]);

  return useQuery({
    queryKey: CLE,
    enabled: !!profil,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, titre, message, lien, lu_le, cree_le, canaux')
        .contains('canaux', ['app'])
        .order('cree_le', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useMarquerLues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[] | null) => {
      const { error } = await supabase.rpc('marquer_notifications_lues', { p_ids: ids });
      if (error) throw error;
    },
    onMutate: async (ids) => {
      qc.setQueryData<Notification[]>(CLE, (l) => l?.map((n) => (!ids || ids.includes(n.id) ? { ...n, lu_le: n.lu_le ?? new Date().toISOString() } : n)));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CLE }),
  });
}
