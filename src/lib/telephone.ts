/** Numéro béninois au format international (229…), pour wa.me. */
export function numeroInternational(tel: string): string {
  const chiffres = tel.replace(/\D/g, '');
  if (chiffres.startsWith('00')) return chiffres.slice(2);
  if (chiffres.startsWith('229')) return chiffres;
  return `229${chiffres}`;
}

export function lienWhatsApp(tel: string | null | undefined, message?: string): string {
  const base = tel ? `https://wa.me/${numeroInternational(tel)}` : 'https://wa.me/';
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
