import { supabase } from '@/lib/supabase';

const CLE_PUBLIQUE = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushDisponible = () =>
  !!CLE_PUBLIQUE && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function enOctets(base64: string): Uint8Array<ArrayBuffer> {
  const b = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const brut = atob(b);
  const sortie = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) sortie[i] = brut.charCodeAt(i);
  return sortie;
}

/** Abonnement de ce téléphone (ou de cet ordinateur), s'il existe. */
export async function abonnementActuel(): Promise<PushSubscription | null> {
  if (!pushDisponible()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

const appareil = () => {
  const ua = navigator.userAgent;
  const systeme = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : 'Appareil';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return `${systeme}${nav ? ` · ${nav}` : ''}`;
};

export async function activerPush(): Promise<void> {
  if (!pushDisponible()) throw new Error("Ce téléphone ne permet pas les notifications. Installez d'abord l'application sur l'écran d'accueil.");
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Les notifications sont bloquées. Autorisez-les dans les réglages du navigateur, puis réessayez.');
  }
  const reg = await navigator.serviceWorker.ready;
  const abo = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: enOctets(CLE_PUBLIQUE!) }));
  const j = abo.toJSON();
  const { error } = await supabase.rpc('enregistrer_abonnement_push', {
    p_endpoint: abo.endpoint, p_p256dh: j.keys!.p256dh, p_auth: j.keys!.auth, p_appareil: appareil(),
  });
  if (error) throw error;
}

export async function desactiverPush(): Promise<void> {
  const abo = await abonnementActuel();
  if (!abo) return;
  await supabase.from('abonnements_push').delete().eq('endpoint', abo.endpoint);
  await abo.unsubscribe();
}
