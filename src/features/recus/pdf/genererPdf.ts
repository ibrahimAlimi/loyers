import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { enDataUrl, urlFichier } from '@/lib/fichiers';
import type { Recu } from '@/lib/types';
import { RecuDocument, type OptionsRecu } from './RecuDocument';

export const urlVerification = (code: string) => `${window.location.origin}/v/${code}`;

export async function genererRecuPdf(recu: Recu, options: Omit<OptionsRecu, 'domaine'>): Promise<Blob> {
  const c = recu.contenu;
  const signatureBucket = c.encaissant.role === 'gestionnaire' ? 'profils' : 'espaces';
  const [logo, cachet, signature, qr] = await Promise.all([
    urlFichier('espaces', c.espace.logo_path).then(enDataUrl),
    urlFichier('espaces', c.espace.cachet_path).then(enDataUrl),
    urlFichier(signatureBucket, c.encaissant.signature_path).then(enDataUrl),
    QRCode.toDataURL(urlVerification(recu.code_verification), { margin: 1, width: 300, errorCorrectionLevel: 'M' }),
  ]);
  const element = createElement(RecuDocument, {
    c,
    images: { logo, cachet, signature, qr },
    options: { ...options, domaine: window.location.host },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await pdf(element as any).toBlob();
}

type Pdfjs = typeof import('pdfjs-dist');

// Deux versions de pdf.js, essayées dans l'ordre : la « legacy » embarque les fonctions JavaScript récentes
// (Map.getOrInsertComputed…) que les navigateurs des téléphones n'ont pas encore (sinon : « getOrInsertComputed
// is not a function ») ; si elle échoue, on bascule sur la version récente.
const VERSIONS_PDFJS: (() => Promise<Pdfjs>)[] = [
  async () => {
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as Pdfjs;
    pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
    return pdfjs;
  },
  async () => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    return pdfjs;
  },
];

/** Page 1 du PDF en JPEG (pour WhatsApp). */
export async function recuEnImage(pdfBlob: Blob): Promise<Blob> {
  const donnees = await pdfBlob.arrayBuffer();
  let erreur: unknown;
  for (const charger of VERSIONS_PDFJS) {
    try {
      // Copie à chaque essai : pdf.js transfère les données à son worker, qui les rend inutilisables ensuite
      return await pageEnJpeg(await charger(), donnees.slice(0));
    } catch (e) {
      erreur = e;
      console.warn('Conversion du reçu en image : échec avec cette version de pdf.js, essai avec la suivante', e);
    }
  }
  throw erreur;
}

async function pageEnJpeg(pdfjs: Pdfjs, donnees: ArrayBuffer): Promise<Blob> {
  // Seuls nos propres PDF sont lus ici (pdfjs-dist ≥ 6 : plus d'évaluation de code, faille GHSA-hq66-cqwq-w95j corrigée).
  const tache = pdfjs.getDocument({ data: donnees });
  const doc = await tache.promise;
  try {
    const page = await doc.getPage(1);
    const vue = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = vue.width;
    canvas.height = vue.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vue, canvas }).promise;
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible'))), 'image/jpeg', 0.9),
    );
  } finally {
    void tache.destroy();
  }
}
