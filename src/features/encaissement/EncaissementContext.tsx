import { createContext, lazy, Suspense, useContext, useState, type ReactNode } from 'react';
import type { ModePaiement } from '@/lib/types';

export interface PreRemplissage {
  bailId?: string;
  mois?: string[];
  montant?: number;
  mode?: ModePaiement;
  payeur?: string;
  reference?: string;
  remplacePaiementId?: string;
}

interface EncaissementContexte {
  ouvrir: (pre?: PreRemplissage) => void;
}

const Ctx = createContext<EncaissementContexte | null>(null);
const EncaisserWizard = lazy(() => import('./EncaisserWizard'));

export function EncaissementProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<{ ouvert: boolean; pre?: PreRemplissage; cle: number }>({ ouvert: false, cle: 0 });

  return (
    <Ctx.Provider value={{ ouvrir: (pre) => setEtat((e) => ({ ouvert: true, pre, cle: e.cle + 1 })) }}>
      {children}
      {etat.ouvert && (
        <Suspense fallback={null}>
          <EncaisserWizard key={etat.cle} pre={etat.pre} onFermer={() => setEtat((e) => ({ ...e, ouvert: false }))} />
        </Suspense>
      )}
    </Ctx.Provider>
  );
}

export function useEncaisser(): EncaissementContexte {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEncaisser hors EncaissementProvider');
  return c;
}
