import { notifications } from '@mantine/notifications';

/** Message lisible à partir d'une erreur Supabase / réseau. */
export function messageErreur(e: unknown): string {
  const brut = (e as { message?: string })?.message ?? String(e);
  if (/Failed to fetch|NetworkError|network/i.test(brut)) {
    return "Pas de connexion Internet. Vérifiez vos données mobiles et réessayez.";
  }
  if (/row-level security|permission denied/i.test(brut)) return "Vous n'avez pas le droit de faire cette action.";
  if (/duplicate key/i.test(brut)) return 'Cet élément existe déjà.';
  return brut;
}

export const notifierErreur = (e: unknown) =>
  notifications.show({ color: 'red', title: 'Oups', message: messageErreur(e) });

export const notifierSucces = (message: string) => notifications.show({ color: 'teal', message });
