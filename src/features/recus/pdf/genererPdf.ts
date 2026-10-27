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

/** Page 1 du PDF en JPEG (pour WhatsApp). */
export async function recuEnImage(pdfBlob: Blob): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await pdfBlob.arrayBuffer() }).promise;
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
}
