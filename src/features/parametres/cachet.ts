/** Dessine un cachet rond (nom en arc, ville, étoiles) dans la couleur de l'espace ; PNG transparent. */
export async function genererCachet(nom: string, ville: string | null, couleur: string): Promise<Blob> {
  const taille = 600;
  const c = document.createElement('canvas');
  c.width = taille;
  c.height = taille;
  const ctx = c.getContext('2d')!;
  const centre = taille / 2;
  ctx.strokeStyle = couleur;
  ctx.fillStyle = couleur;

  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(centre, centre, 280, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(centre, centre, 200, 0, Math.PI * 2);
  ctx.stroke();

  const arc = (texte: string, rayon: number, haut: boolean) => {
    const lettres = texte.toUpperCase().split('');
    ctx.font = 'bold 52px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const pas = Math.min(0.2, (Math.PI * 0.9) / Math.max(lettres.length, 1));
    const debut = (haut ? -Math.PI / 2 : Math.PI / 2) - (pas * (lettres.length - 1)) / 2 * (haut ? 1 : -1);
    lettres.forEach((l, i) => {
      const angle = debut + pas * i * (haut ? 1 : -1);
      ctx.save();
      ctx.translate(centre + rayon * Math.cos(angle), centre + rayon * Math.sin(angle));
      ctx.rotate(angle + (haut ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillText(l, 0, 0);
      ctx.restore();
    });
  };
  arc(nom.slice(0, 26), 240, true);
  if (ville) arc(ville.slice(0, 20), 240, false);

  ctx.font = 'bold 60px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ ★ ★', centre, centre - 40);
  ctx.font = 'bold 44px Helvetica, Arial, sans-serif';
  const initiales = nom.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase();
  ctx.fillText(initiales, centre, centre + 40);

  return await new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Cachet impossible'))), 'image/png'));
}
