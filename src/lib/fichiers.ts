import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';

export type Bucket = 'espaces' | 'profils';

/** URL signée (1 h) d'un fichier privé ; null si pas de chemin. */
export async function urlFichier(bucket: Bucket, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function useUrlFichier(bucket: Bucket, path: string | null | undefined) {
  return useQuery({
    queryKey: ['fichier', bucket, path],
    queryFn: () => urlFichier(bucket, path),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  }).data ?? null;
}

/** Envoie un fichier (écrase) et renvoie son chemin, suffixé pour casser le cache. */
export async function envoyerFichier(bucket: Bucket, path: string, blob: Blob): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/png',
    cacheControl: '60',
  });
  if (error) throw new Error("L'envoi du fichier a échoué. Réessayez.");
  return path;
}

/** Convertit une URL (signée) en data URL, pour les PDF. */
export async function enDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  const r = await fetch(url);
  if (!r.ok) return null;
  const blob = await r.blob();
  return await new Promise((resolve) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(lecteur.result as string);
    lecteur.onerror = () => resolve(null);
    lecteur.readAsDataURL(blob);
  });
}
