import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
});

/** Après une écriture : tout recharger (volumes faibles, cohérence garantie entre les écrans). */
export const rafraichirDonnees = () => queryClient.invalidateQueries();
