import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActionIcon, Modal, Tooltip } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { useLocation } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { useEspace } from '@/espace/EspaceProvider';
import { useMajPreferences } from '@/perso/preferences';
import { demo as trouverDemo } from './demos';
import { LecteurDemo } from './LecteurDemo';
import { VisiteGuidee } from './VisiteGuidee';

interface Tutoriels {
  visite?: string;
  vues?: Record<string, string>;
}

interface ContexteApprendre {
  ouvrirDemo: (id: string) => void;
  lancerVisite: () => void;
  vues: Record<string, string>;
}

const Ctx = createContext<ContexteApprendre | null>(null);

// Mémoire locale en plus du compte : même si l'enregistrement en ligne échoue (réseau),
// la visite ne revient pas à chaque rechargement sur cet appareil.
const cleVisite = (id: string) => `mes-loyers:visite-vue:${id}`;
const visiteVueIci = (id: string | undefined) => { try { return !!id && localStorage.getItem(cleVisite(id)) === '1'; } catch { return false; } };
const noterVisiteIci = (id: string | undefined) => { try { if (id) localStorage.setItem(cleVisite(id), '1'); } catch { /* stockage indisponible */ } };

export function ApprendreProvider({ children }: { children: ReactNode }) {
  const { profil } = useAuth();
  const { espace } = useEspace();
  const majPreferences = useMajPreferences();
  const lieu = useLocation();
  const [demoId, setDemoId] = useState<string | null>(null);
  const [visite, setVisite] = useState(false);
  const [vueIci, setVueIci] = useState(() => visiteVueIci(profil?.id));
  useEffect(() => { setVueIci(visiteVueIci(profil?.id)); }, [profil?.id]);
  const tutos = ((profil?.preferences as Record<string, unknown> | undefined)?.tutoriels ?? {}) as Tutoriels;

  const enregistrer = useCallback((modifier: (t: Tutoriels) => Tutoriels) => {
    void majPreferences((p) => ({ ...p, tutoriels: modifier({ ...((p.tutoriels as Tutoriels) ?? {}) }) })).catch(() => undefined);
  }, [majPreferences]);

  // Première connexion : la visite guidée démarre seule sur l'Accueil, une seule fois.
  // Terminée ou passée, elle ne revient plus ; on la relance soi-même depuis « Apprendre ».
  useEffect(() => {
    if (!profil || !espace || tutos.visite || vueIci || visite || lieu.pathname !== '/' || profil.doit_changer_mdp) return;
    const t = setTimeout(() => setVisite(true), 900);
    return () => clearTimeout(t);
  }, [profil, espace, tutos.visite, vueIci, visite, lieu.pathname]);

  const finVisite = () => {
    setVisite(false);
    setVueIci(true);
    noterVisiteIci(profil?.id);
    if (!tutos.visite) enregistrer((t) => ({ ...t, visite: new Date().toISOString() }));
  };
  const finDemo = () => {
    if (demoId) enregistrer((t) => ({ ...t, vues: { ...(t.vues ?? {}), [demoId]: new Date().toISOString() } }));
    setDemoId(null);
  };

  const valeur = useMemo<ContexteApprendre>(() => ({
    ouvrirDemo: setDemoId,
    lancerVisite: () => setVisite(true),
    vues: tutos.vues ?? {},
  }), [tutos.vues]);
  const d = demoId ? trouverDemo(demoId) : null;

  return (
    <Ctx.Provider value={valeur}>
      {children}
      <Modal opened={!!d} onClose={finDemo} title={d?.titre} size="md" radius="lg" centered>
        {d && <LecteurDemo key={d.id} demo={d} onTermine={finDemo} />}
      </Modal>
      {visite && <VisiteGuidee onFin={finVisite} />}
    </Ctx.Provider>
  );
}

export function useApprendre(): ContexteApprendre {
  const c = useContext(Ctx);
  if (!c) throw new Error('ApprendreProvider manquant');
  return c;
}

/** Bouton « ? » d'un écran : ouvre la démo animée de cet écran. */
export function BoutonAide({ demo }: { demo: string }) {
  const c = useContext(Ctx);
  if (!c) return null; // page publique, hors de l'application connectée
  const { ouvrirDemo } = c;
  return (
    <Tooltip label="Voir comment faire">
      <ActionIcon variant="light" radius="xl" size="lg" aria-label="Aide : voir comment faire" onClick={() => ouvrirDemo(demo)}>
        <IconHelp size={22} />
      </ActionIcon>
    </Tooltip>
  );
}
