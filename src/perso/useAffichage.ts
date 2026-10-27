import { useMemo, useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { notifierErreur } from '@/lib/erreurs';
import { useMajPreferences, type Preferences } from './preferences';

/** Un bloc d'une page (une carte, une section…). */
export interface DefBloc {
  cle: string;
  libelle: string;
  /** Toujours affiché : on ne peut pas le masquer (ex. « Encaisser un loyer »). */
  essentiel?: boolean;
  /** Affiché par défaut sur téléphone (sur ordinateur, tout est affiché par défaut). */
  mobile?: boolean;
}

/** Une information d'une liste (une colonne d'un tableau, une ligne d'une carte). */
export interface DefColonne {
  cle: string;
  libelle: string;
  essentiel?: boolean;
  mobile?: boolean;
  /** Masquée par défaut, même sur ordinateur. */
  facultative?: boolean;
}

export interface ChoixAffichage {
  ordre: string[];
  masques: string[];
  colonnes?: string[];
}

export type Appareil = 'ordinateur' | 'telephone';

type Stockage = Record<string, Partial<Record<Appareil, ChoixAffichage>>>;

export interface Affichage {
  appareil: Appareil;
  /** Tous les blocs, dans l'ordre choisi, avec leur visibilité. */
  blocs: (DefBloc & { visible: boolean })[];
  /** Clés des blocs visibles, dans l'ordre. */
  visibles: string[];
  voit: (cle: string) => boolean;
  colonnes: (DefColonne & { visible: boolean })[];
  colonne: (cle: string) => boolean;
  personnalise: boolean;
  enregistrer: (c: ChoixAffichage) => Promise<void>;
  reinitialiser: () => Promise<void>;
  defaut: ChoixAffichage;
}

function choixParDefaut(blocs: DefBloc[], colonnes: DefColonne[], appareil: Appareil): ChoixAffichage {
  const tel = appareil === 'telephone';
  return {
    ordre: blocs.map((b) => b.cle),
    masques: blocs.filter((b) => !b.essentiel && tel && !b.mobile).map((b) => b.cle),
    colonnes: colonnes.filter((c) => c.essentiel || (tel ? c.mobile : !c.facultative)).map((c) => c.cle),
  };
}

/**
 * Ce que l'utilisateur voit sur une page. Le choix est enregistré dans son compte,
 * séparément pour l'ordinateur et le téléphone (§6.8 de la spec).
 */
export function useAffichage(page: string, defBlocs: DefBloc[], defColonnes: DefColonne[] = []): Affichage {
  const { profil } = useAuth();
  const majPreferences = useMajPreferences();
  const appareil: Appareil = useMediaQuery('(max-width: 48em)') ? 'telephone' : 'ordinateur';
  const [local, setLocal] = useState<Partial<Record<Appareil, ChoixAffichage | null>>>({});

  const stocke = ((profil?.preferences as Preferences | undefined)?.affichage as Stockage | undefined)?.[page]?.[appareil];
  const choix = local[appareil] !== undefined ? local[appareil] : stocke;
  const defaut = useMemo(() => choixParDefaut(defBlocs, defColonnes, appareil), [defBlocs, defColonnes, appareil]);

  return useMemo(() => {
    const c = choix ?? defaut;
    // Les blocs ajoutés depuis le dernier choix prennent leur place par défaut, les clés disparues sont ignorées.
    const connus = c.ordre.filter((k) => defBlocs.some((b) => b.cle === k));
    for (const b of defBlocs) {
      if (connus.includes(b.cle)) continue;
      const i = defBlocs.indexOf(b);
      const avant = defBlocs.slice(0, i).reverse().find((x) => connus.includes(x.cle));
      connus.splice(avant ? connus.indexOf(avant.cle) + 1 : 0, 0, b.cle);
    }
    const nouveaux = choix ? defBlocs.filter((b) => !choix.ordre.includes(b.cle)) : [];
    const masques = new Set([...c.masques, ...nouveaux.filter((b) => defaut.masques.includes(b.cle)).map((b) => b.cle)]);
    const blocs = connus.map((k) => {
      const b = defBlocs.find((x) => x.cle === k)!;
      return { ...b, visible: !!b.essentiel || !masques.has(k) };
    });
    const colonnesVisibles = new Set(c.colonnes ?? defaut.colonnes);
    const colonnes = defColonnes.map((d) => ({ ...d, visible: !!d.essentiel || colonnesVisibles.has(d.cle) }));
    const visibles = blocs.filter((b) => b.visible).map((b) => b.cle);

    const ecrire = async (valeur: ChoixAffichage | null) => {
      setLocal((l) => ({ ...l, [appareil]: valeur }));
      try {
        await majPreferences((p) => {
          const tout = { ...((p.affichage as Stockage) ?? {}) };
          const pageChoix = { ...(tout[page] ?? {}) };
          if (valeur) pageChoix[appareil] = valeur;
          else delete pageChoix[appareil];
          tout[page] = pageChoix;
          return { ...p, affichage: tout };
        });
      } catch (e) {
        notifierErreur(e);
      }
    };

    return {
      appareil, blocs, visibles, colonnes, defaut,
      voit: (k: string) => visibles.includes(k),
      colonne: (k: string) => colonnes.some((x) => x.cle === k && x.visible),
      personnalise: !!choix,
      enregistrer: (v: ChoixAffichage) => ecrire(v),
      reinitialiser: () => ecrire(null),
    };
  }, [choix, defaut, defBlocs, defColonnes, appareil, page, majPreferences]);
}
