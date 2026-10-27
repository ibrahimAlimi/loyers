// Formules affichées sur la page publique (§6.13 de la spec). Aucune facturation en v1.
export const FORMULES: { cle: string; nom: string; logements: string; prix: string; detail: string; misEnAvant?: boolean }[] = [
  { cle: 'decouverte', nom: 'Découverte', logements: "Jusqu'à 3 logements", prix: 'Gratuit', detail: 'Pour essayer, sans engagement.' },
  { cle: 'essentiel', nom: 'Essentiel', logements: "Jusqu'à 15 logements", prix: '5 000 FCFA / mois', detail: 'Pour un propriétaire avec une ou deux maisons.', misEnAvant: true },
  { cle: 'pro', nom: 'Pro', logements: "Jusqu'à 50 logements", prix: '12 000 FCFA / mois', detail: 'Pour plusieurs maisons et des gestionnaires.' },
  { cle: 'sur_mesure', nom: 'Sur mesure', logements: 'Au-delà de 50 logements', prix: 'À discuter', detail: 'Pour les agences et les grands parcs.' },
];

export const LIBELLE_FORMULE: Record<string, string> = Object.fromEntries(FORMULES.map((f) => [f.cle, f.nom]));
