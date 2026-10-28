import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { nomComplet } from '@/lib/format';
import type { Bail, EtiquetteReprise, Locataire, ModePaiement, Recu, RepriseAccess, SituationBail } from '@/lib/types';

export interface LigneLocataire {
  locataire: Locataire;
  nom: string;
  bail: Bail | null;
  situation: SituationBail | null;
  maison_id: string | null;
  maison_nom: string | null;
  logement: string | null;
}

/** Une ligne par bail actif, plus les anciens locataires (sans bail actif). */
export function useLocataires() {
  const espace = useEspaceCourant();
  return useQuery({
    queryKey: ['locataires', espace.id],
    queryFn: async (): Promise<LigneLocataire[]> => {
      const [locs, baux, sits] = await Promise.all([
        supabase.from('locataires').select('*').eq('espace_id', espace.id).is('supprime_le', null).order('nom'),
        supabase.from('baux').select('*, logement:logements(designation, maison:maisons(id, nom))')
          .eq('espace_id', espace.id).is('supprime_le', null).is('date_fin', null),
        supabase.from('v_situation_baux').select('*').eq('espace_id', espace.id),
      ]);
      if (locs.error) throw locs.error;
      type BailJoint = Bail & { logement: { designation: string; maison: { id: string; nom: string } } };
      const lignes: LigneLocataire[] = [];
      for (const l of locs.data as Locataire[]) {
        const actifs = ((baux.data ?? []) as BailJoint[]).filter((b) => b.locataire_id === l.id);
        if (!actifs.length) {
          lignes.push({ locataire: l, nom: nomComplet(l), bail: null, situation: null, maison_id: null, maison_nom: null, logement: null });
        }
        for (const b of actifs) {
          lignes.push({
            locataire: l,
            nom: nomComplet(l),
            bail: b,
            situation: ((sits.data ?? []) as SituationBail[]).find((s) => s.bail_id === b.id) ?? null,
            maison_id: b.logement.maison.id,
            maison_nom: b.logement.maison.nom,
            logement: b.logement.designation,
          });
        }
      }
      return lignes;
    },
  });
}

export interface PaiementDetail {
  id: string;
  bail_id: string;
  date_paiement: string;
  montant: number;
  remise: number;
  mode: ModePaiement;
  payeur: string;
  reference_transaction: string | null;
  statut: 'valide' | 'annule';
  motif_annulation: string | null;
  encaisse_par_nom: string;
  mois: string[];
  recu: Recu | null;
  /** Paiement repris de l'ancien logiciel (null = saisi dans l'application). */
  reprise: RepriseAccess | null;
  a_verifier: EtiquetteReprise[];
}

export interface MouvementCaution {
  id: string;
  bail_id: string;
  type: 'versement' | 'remboursement' | 'retenue';
  montant: number;
  date_mouvement: string;
  motif: string | null;
  recu: Recu | null;
}

export interface BailDetail extends Bail {
  logement: { id: string; designation: string; niveau: string | null; maison: { id: string; nom: string } };
  situation: SituationBail | null;
  caution_detenue: number;
}

export function useLocataire(id: string | undefined) {
  return useQuery({
    queryKey: ['locataire', id],
    enabled: !!id,
    queryFn: async () => {
      const loc = await supabase.from('locataires').select('*').eq('id', id!).single();
      if (loc.error) throw loc.error;
      const baux = await supabase
        .from('baux')
        .select('*, logement:logements(id, designation, niveau, maison:maisons(id, nom))')
        .eq('locataire_id', id!)
        .is('supprime_le', null)
        .order('date_debut', { ascending: false });
      const bauxIds = (baux.data ?? []).map((b) => b.id as string);
      const [sits, paiements, mouvements] = await Promise.all([
        supabase.from('v_situation_baux').select('*').in('bail_id', bauxIds),
        supabase
          .from('paiements')
          .select('*, encaisseur:profils!paiements_encaisse_par_fkey(nom_complet), imputations(mois, montant, remise), recus(*)')
          .in('bail_id', bauxIds)
          .is('supprime_le', null)
          .order('date_paiement', { ascending: false })
          .order('cree_le', { ascending: false }),
        supabase.from('mouvements_caution').select('*, recus(*)').in('bail_id', bauxIds).is('supprime_le', null)
          .order('date_mouvement', { ascending: false }),
      ]);
      const cautions = new Map<string, number>();
      for (const m of mouvements.data ?? []) {
        cautions.set(m.bail_id, (cautions.get(m.bail_id) ?? 0) + (m.type === 'versement' ? m.montant : -m.montant));
      }
      return {
        locataire: loc.data as Locataire & { supprime_le: string | null },
        baux: ((baux.data ?? []) as BailDetail[]).map((b) => ({
          ...b,
          situation: ((sits.data ?? []) as SituationBail[]).find((s) => s.bail_id === b.id) ?? null,
          caution_detenue: cautions.get(b.id) ?? 0,
        })),
        paiements: (paiements.data ?? []).map((p): PaiementDetail => ({
          ...p,
          encaisse_par_nom: p.encaisseur?.nom_complet ?? '',
          mois: (p.imputations as { mois: string; montant: number; remise: number }[])
            .filter((i) => i.montant > 0 || i.remise > 0)
            .map((i) => i.mois)
            .sort(),
          recu: premier(p.recus as Recu | Recu[] | null),
          reprise: p.reprise as RepriseAccess | null,
          a_verifier: (p.a_verifier ?? []) as EtiquetteReprise[],
        })),
        mouvements: (mouvements.data ?? []).map((m): MouvementCaution => ({ ...m, recu: premier(m.recus as Recu | Recu[] | null) })),
      };
    },
  });
}

export function useEnregistrerLocataire() {
  const espace = useEspaceCourant();
  return useMutation({
    mutationFn: async (l: Partial<Locataire> & { nom: string }) => {
      const champs = ['prenoms', 'telephone', 'telephone2', 'email', 'piece_type', 'piece_numero', 'profession',
        'contact_urgence', 'notes'] as const;
      const valeurs: Record<string, string | null> = { nom: l.nom.trim() };
      for (const c of champs) valeurs[c] = (l[c] as string | null | undefined)?.trim() || null;
      const r = l.id
        ? await supabase.from('locataires').update(valeurs).eq('id', l.id).select('id').single()
        : await supabase.from('locataires').insert({ ...valeurs, espace_id: espace.id }).select('id').single();
      if (r.error) throw r.error;
      return r.data.id as string;
    },
    onSuccess: rafraichirDonnees,
  });
}

/** Relation 1-1 PostgREST : objet ou tableau selon la détection de l'unicité. */
function premier<T>(x: T | T[] | null | undefined): T | null {
  return Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
}
