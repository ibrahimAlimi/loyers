// Invite d'installation (Android, ordinateur) : le navigateur ne la propose qu'une fois, très tôt.
// On la garde pour le bouton « Installer maintenant ».

interface InviteInstallation extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let invite: InviteInstallation | null = null;
const abonnes = new Set<() => void>();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  invite = e as InviteInstallation;
  abonnes.forEach((f) => f());
});
window.addEventListener('appinstalled', () => { invite = null; abonnes.forEach((f) => f()); });

export const estInstallee = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export const installationPossible = () => !!invite;

export function surChangementInstallation(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** Ouvre la fenêtre d'installation du navigateur ; renvoie vrai si l'utilisateur a accepté. */
export async function installer(): Promise<boolean> {
  if (!invite) return false;
  await invite.prompt();
  const { outcome } = await invite.userChoice;
  invite = null;
  abonnes.forEach((f) => f());
  return outcome === 'accepted';
}
