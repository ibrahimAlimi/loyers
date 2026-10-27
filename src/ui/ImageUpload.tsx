import { FileButton, Button } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';

/** Redimensionne (≤ 800 px) et, si demandé, rend transparent le fond blanc (signature, cachet). */
export async function preparerImage(fichier: File, retirerFondBlanc: boolean): Promise<Blob> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Image illisible. Essayez une photo JPG ou PNG.'));
      i.src = url;
    });
    const echelle = Math.min(1, 800 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * echelle);
    canvas.height = Math.round(img.height * echelle);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (retirerFondBlanc) {
      const donnees = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const p = donnees.data;
      for (let i = 0; i < p.length; i += 4) {
        const min = Math.min(p[i], p[i + 1], p[i + 2]);
        if (min > 235) p[i + 3] = 0;
        else if (min > 200) p[i + 3] = Math.round(p[i + 3] * ((235 - min) / 35)); // lissage de la frange
      }
      ctx.putImageData(donnees, 0, 0);
    }
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversion impossible'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImageUpload({ onValider, retirerFondBlanc, libelle = 'Choisir une image', enCours }: {
  onValider: (blob: Blob) => void;
  retirerFondBlanc?: boolean;
  libelle?: string;
  enCours?: boolean;
}) {
  return (
    <FileButton accept="image/png,image/jpeg,image/webp" onChange={async (f) => f && onValider(await preparerImage(f, !!retirerFondBlanc))}>
      {(props) => <Button variant="default" leftSection={<IconUpload size={18} />} loading={enCours} {...props}>{libelle}</Button>}
    </FileButton>
  );
}
