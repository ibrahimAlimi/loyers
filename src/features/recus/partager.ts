import { supabase } from '@/lib/supabase';
import { lienWhatsApp } from '@/lib/telephone';
import { formatMois } from '@/lib/format';
import { rafraichirDonnees } from '@/lib/queryClient';
import type { Recu } from '@/lib/types';
import { journaliser } from '@/lib/audit';
import { notifierSucces } from '@/lib/erreurs';

export interface EtatRecu {
  annule?: boolean;
  supprime?: boolean;
}

// Les PDF générés pendant la session sont réutilisés : envoyer puis imprimer juste après
// ne crée pas de duplicata. Une nouvelle génération (autre session / rechargement) en crée un.
const cache = new Map<string, Blob>();

async function obtenirPdf(recu: Recu, etat: EtatRecu): Promise<Blob> {
  const cle = `${recu.id}:${etat.annule ? 'a' : ''}${etat.supprime ? 's' : ''}`;
  const enCache = cache.get(cle);
  if (enCache) return enCache;
  const { data, error } = await supabase.rpc('generation_recu', { p_recu: recu.id });
  if (error) throw error;
  const g = data as { original: boolean; reimprime_le?: string };
  const { genererRecuPdf } = await import('./pdf/genererPdf');
  const blob = await genererRecuPdf(recu, {
    duplicata: g.original ? null : { le: g.reimprime_le ?? new Date().toISOString() },
    annule: etat.annule,
    supprime: etat.supprime,
  });
  cache.set(cle, blob);
  if (!g.original) void rafraichirDonnees();
  return blob;
}

// Nom unique et lisible dans le téléphone : « Recu_ABD-2026-000124_Koffi-Houngbo.jpg » (le numéro ne sert qu'une fois)
const nomFichier = (recu: Recu, ext: string) => {
  const nom = recu.contenu.locataire.nom_complet
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `Recu_${recu.numero}${nom ? `_${nom}` : ''}.${ext}`;
};
export const IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function messageWhatsApp(recu: Recu): string {
  const c = recu.contenu;
  const prenom = c.locataire.nom_complet.split(' ').slice(-1)[0];
  const objet = c.type === 'loyer'
    ? `votre reçu de loyer N° ${recu.numero} pour ${c.mois.map((m) => formatMois(m)).join(', ')}`
    : `votre reçu N° ${recu.numero}`;
  return `Bonjour ${prenom}, voici ${objet}. Merci.`;
}

export interface EnvoiPret {
  fichier: File;
  message: string;
  titre: string;
}

/**
 * Prépare le reçu à envoyer (PDF ou image) et l'enregistre dans le téléphone (dossier « Téléchargements »).
 * Sur iPhone, Safari ne sait pas enregistrer en silence : « Enregistrer dans Fichiers » est dans le menu de partage.
 */
export async function preparerEnvoi(recu: Recu, format: 'pdf' | 'image', etat: EtatRecu = {}): Promise<EnvoiPret> {
  const pdf = await obtenirPdf(recu, etat);
  const blob = format === 'pdf' ? pdf : await (await import('./pdf/genererPdf')).recuEnImage(pdf);
  const fichier = new File([blob], nomFichier(recu, format === 'pdf' ? 'pdf' : 'jpg'), { type: blob.type });
  journaliser('partage_recu', { espace: recu.espace_id, table: 'recus', id: recu.id, libelle: `Reçu N° ${recu.numero}`, details: { format } });
  if (!IOS) {
    telecharger(blob, fichier.name);
    notifierSucces(`Reçu enregistré dans « Téléchargements » : ${fichier.name}`);
  }
  return { fichier, message: messageWhatsApp(recu), titre: `Reçu ${recu.numero}` };
}

/** Ouvre le partage du téléphone avec le fichier joint (à appeler juste après un toucher) : on touche WhatsApp, puis le contact. */
export async function partagerSurWhatsApp(e: EnvoiPret) {
  try {
    await navigator.share({ files: [e.fichier], text: e.message, title: e.titre });
  } catch (err) {
    if ((err as Error).name !== 'AbortError') window.open(lienWhatsApp(null, e.message), '_blank');
  }
}

export async function telechargerRecu(recu: Recu, etat: EtatRecu = {}) {
  telecharger(await obtenirPdf(recu, etat), nomFichier(recu, 'pdf'));
}

export async function voirRecu(recu: Recu, etat: EtatRecu = {}) {
  const url = URL.createObjectURL(await obtenirPdf(recu, etat));
  window.open(url, '_blank');
}

export async function imprimerRecu(recu: Recu, etat: EtatRecu = {}) {
  const url = URL.createObjectURL(await obtenirPdf(recu, etat));
  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    window.open(url, '_blank'); // impression depuis la visionneuse du téléphone
    return;
  }
  const cadre = document.createElement('iframe');
  cadre.style.position = 'fixed';
  cadre.style.width = '0';
  cadre.style.height = '0';
  cadre.style.border = '0';
  cadre.src = url;
  cadre.onload = () => {
    cadre.contentWindow?.focus();
    cadre.contentWindow?.print();
    setTimeout(() => cadre.remove(), 60_000);
  };
  document.body.appendChild(cadre);
}
