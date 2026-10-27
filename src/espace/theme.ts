import { createTheme, type MantineThemeOverride } from '@mantine/core';
import { generateColors } from '@mantine/colors-generator';

export const COULEUR_DEFAUT = '#0f766e';

/** Thèmes prêts à l'emploi (tous lisibles avec du texte blanc, contraste ≥ 4,5). */
export const THEMES: { nom: string; couleur: string }[] = [
  { nom: 'Lagune', couleur: '#0f766e' },
  { nom: 'Bleu roi', couleur: '#1d4ed8' },
  { nom: 'Terre cuite', couleur: '#7c2d12' },
  { nom: 'Bordeaux', couleur: '#9f1239' },
  { nom: 'Violet', couleur: '#6d28d9' },
  { nom: 'Forêt', couleur: '#15803d' },
  { nom: 'Ocre', couleur: '#b45309' },
  { nom: 'Océan', couleur: '#0e7490' },
  { nom: 'Ardoise', couleur: '#334155' },
  { nom: 'Prune', couleur: '#a21caf' },
];

export const COULEURS_PROPOSEES = THEMES.map((t) => t.couleur);

/** Thème Mantine généré à partir de la couleur principale de l'espace. */
export function genererThemeEspace(couleur: string | null | undefined): MantineThemeOverride {
  const base = (couleur || COULEUR_DEFAUT).toLowerCase();
  let palette;
  try {
    palette = generateColors(base);
  } catch {
    palette = generateColors(COULEUR_DEFAUT);
  }
  // La nuance principale doit être exactement la couleur choisie (sinon le générateur peut prendre une teinte trop claire)
  const index = palette.findIndex((c) => c.toLowerCase() === base);
  const nuance = (index >= 0 ? index : 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  return createTheme({
    colors: { espace: palette },
    primaryColor: 'espace',
    primaryShade: nuance,
    defaultRadius: 'md',
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
    headings: { fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif', fontWeight: '700' },
    components: {
      Button: { defaultProps: { size: 'md' } },
      TextInput: { defaultProps: { size: 'md' } },
      NumberInput: { defaultProps: { size: 'md' } },
      Select: { defaultProps: { size: 'md' } },
      Textarea: { defaultProps: { size: 'md' } },
      DateInput: { defaultProps: { size: 'md', valueFormat: 'DD/MM/YYYY' } },
      Modal: { defaultProps: { radius: 'lg' } },
    },
  });
}

/** Contraste WCAG entre une couleur et le blanc. */
export function contrasteAvecBlanc(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 21;
  const v = parseInt(m[1], 16);
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal((v >> 16) & 255) + 0.7152 * canal((v >> 8) & 255) + 0.0722 * canal(v & 255);
  return 1.05 / (l + 0.05);
}

/** Assombrit progressivement jusqu'à un contraste ≥ 4,5:1 avec le blanc. */
export function rendreLisible(hex: string): string {
  let couleur = hex;
  for (let i = 0; i < 20 && contrasteAvecBlanc(couleur) < 4.5; i++) {
    const v = parseInt(couleur.slice(1), 16);
    const r = Math.round(((v >> 16) & 255) * 0.9);
    const g = Math.round(((v >> 8) & 255) * 0.9);
    const b = Math.round((v & 255) * 0.9);
    couleur = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
  return couleur;
}
