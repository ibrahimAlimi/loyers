import { supabase } from '@/lib/supabase';
import { formatMois } from '@/lib/format';
import { dayjs, FUSEAU } from '@/lib/dates';
import { rafraichirDonnees } from '@/lib/queryClient';
import type { Recu } from '@/lib/types';
import { journaliser } from '@/lib/audit';
import { notifierSucces } from '@/lib/erreurs';

export interface EtatRecu {
  annule?: boolean;
  supprime?: boolean;
}

// Les PDF générés pendant la session sont réutilisés : voir puis envoyer ou imprimer juste après ne crée pas
// de duplicata. Une nouvelle génération (autre session / rechargement) en crée un. On garde la promesse :
// deux demandes simultanées ne génèrent qu'une fois.
const cache = new Map<string, Promise<Blob>>();

function obtenirPdf(recu: Recu, etat: EtatRecu): Promise<Blob> {
  const cle = `${recu.id}:${etat.annule ? 'a' : ''}${etat.supprime ? 's' : ''}`;
  let promesse = cache.get(cle);
  if (!promesse) {
    promesse = genererPdf(recu, etat);
    promesse.catch(() => cache.delete(cle));
    cache.set(cle, promesse);
  }
  return promesse;
}

async function genererPdf(recu: Recu, etat: EtatRecu): Promise<Blob> {
  const { data, error } = await supabase.rpc('generation_recu', { p_recu: recu.id });
  if (error) throw error;
  const g = data as { original: boolean; reimprime_le?: string };
  const { genererRecuPdf } = await import('./pdf/genererPdf');
  const blob = await genererRecuPdf(recu, {
    duplicata: g.original ? null : { le: g.reimprime_le ?? new Date().toISOString() },
    annule: etat.annule,
    supprime: etat.supprime,
  });
  if (!g.original) void rafraichirDonnees();
  return blob;
}

// Nom lisible et unique dans « Téléchargements », même si le même reçu est envoyé plusieurs fois :
// « Recu_ABD-2026-000124_Koffi-Houngbo_20261107-230512.jpg »
const nomFichier = (recu: Recu, ext: string) => {
  const nom = recu.contenu.locataire.nom_complet
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const horodatage = dayjs().tz(FUSEAU).format('YYYYMMDD-HHmmss');
  return `Recu_${recu.numero}${nom ? `_${nom}` : ''}_${horodatage}.${ext}`;
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

/** Le reçu en image JPEG ou en PDF. Si l'image ne peut pas être créée sur ce téléphone, on donne le PDF. */
export async function fichierRecu(recu: Recu, format: 'pdf' | 'image', etat: EtatRecu = {}): Promise<File> {
  const pdf = await obtenirPdf(recu, etat);
  if (format === 'image') {
    try {
      const image = await (await import('./pdf/genererPdf')).recuEnImage(pdf);
      return new File([image], nomFichier(recu, 'jpg'), { type: 'image/jpeg' });
    } catch (e) {
      console.warn('Reçu en image impossible, PDF à la place', e);
    }
  }
  return new File([pdf], nomFichier(recu, 'pdf'), { type: 'application/pdf' });
}

/**
 * Envoi sur WhatsApp (à appeler directement dans le toucher, avec un fichier déjà prêt) : le reçu est
 * enregistré dans « Téléchargements » sous un nom unique, puis le partage du téléphone s'ouvre (WhatsApp, puis
 * le contact). Le message va dans le presse-papiers : Chrome sur Android refuse un fichier partagé avec un texte.
 * Renvoie null si c'est fait (ou fermé par l'utilisateur), sinon l'erreur du navigateur.
 * Sur iPhone, Safari ne sait pas enregistrer en silence : « Enregistrer dans Fichiers » est dans le menu de partage.
 */
export async function envoyerSurWhatsApp(recu: Recu, pret: File): Promise<string | null> {
  const fichier = new File([pret], nomFichier(recu, pret.type === 'image/jpeg' ? 'jpg' : 'pdf'), { type: pret.type });
  journaliser('partage_recu', {
    espace: recu.espace_id, table: 'recus', id: recu.id, libelle: `Reçu N° ${recu.numero}`,
    details: { format: fichier.type === 'image/jpeg' ? 'image' : 'pdf' },
  });
  if (!IOS) {
    telecharger(fichier, fichier.name);
    notifierSucces(`Reçu enregistré dans « Téléchargements » : ${fichier.name}`);
  }
  void navigator.clipboard?.writeText(messageWhatsApp(recu)).catch(() => undefined);
  if (!navigator.canShare?.({ files: [fichier] })) {
    return 'Ce navigateur ne sait pas partager de fichier.';
  }
  try {
    await navigator.share({ files: [fichier] });
    return null;
  } catch (err) {
    const { name, message } = err as Error;
    if (name === 'AbortError') return null;
    console.warn('Partage du reçu refusé par le navigateur', err);
    return `${name} : ${message}`;
  }
}

export async function telechargerRecu(recu: Recu, format: 'pdf' | 'image', etat: EtatRecu = {}) {
  const fichier = await fichierRecu(recu, format, etat);
  if (format === 'image' && fichier.type !== 'image/jpeg') {
    notifierSucces('L’image n’a pas pu être créée sur ce téléphone : le reçu est en PDF.');
  }
  telecharger(fichier, fichier.name);
  if (!IOS) notifierSucces(`Reçu enregistré dans « Téléchargements » : ${fichier.name}`);
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
