// Montant en toutes lettres, règles traditionnelles (avant la réforme de 1990).
const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

/** 0–99. `final` : rien ne suit (ou un nom comme « million »), donc « quatre-vingts » prend un s. */
function moinsDeCent(n: number, final: boolean): string {
  if (n < 17) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7) return u === 1 ? 'soixante et onze' : `soixante-${moinsDeCent(10 + u, false)}`;
  if (d === 8) return u === 0 ? `quatre-vingt${final ? 's' : ''}` : `quatre-vingt-${UNITES[u]}`;
  if (d === 9) return `quatre-vingt-${moinsDeCent(10 + u, false)}`;
  if (u === 0) return DIZAINES[d];
  if (u === 1) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

/** 0–999. */
function moinsDeMille(n: number, final: boolean): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c > 0) parts.push(c === 1 ? 'cent' : `${UNITES[c]} cent${r === 0 && final ? 's' : ''}`);
  if (r > 0) parts.push(moinsDeCent(r, final));
  return parts.join(' ');
}

export function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro';
  const milliards = Math.floor(n / 1e9);
  const millions = Math.floor(n / 1e6) % 1000;
  const milliers = Math.floor(n / 1000) % 1000;
  const reste = n % 1000;
  const parts: string[] = [];
  if (milliards) parts.push(`${moinsDeMille(milliards, true)} milliard${milliards > 1 ? 's' : ''}`);
  if (millions) parts.push(`${moinsDeMille(millions, true)} million${millions > 1 ? 's' : ''}`);
  if (milliers) parts.push(milliers === 1 ? 'mille' : `${moinsDeMille(milliers, false)} mille`);
  if (reste) parts.push(moinsDeMille(reste, true));
  return parts.join(' ');
}

/** 70000 → « Soixante-dix mille francs CFA ». */
export function montantEnLettres(n: number): string {
  const mots = nombreEnLettres(Math.trunc(n));
  return `${mots.charAt(0).toUpperCase()}${mots.slice(1)} ${Math.abs(n) > 1 ? 'francs' : 'franc'} CFA`;
}
