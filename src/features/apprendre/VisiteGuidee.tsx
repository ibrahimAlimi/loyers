import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Group, Paper, Portal, Text } from '@mantine/core';
import { IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { NARRATIONS } from './narrations';
import { lire, type Lecture } from './voix';

// Pour chaque étape : les éléments possibles (`data-tour`), le premier visible à l'écran est entouré.
// Sur téléphone, le menu est replié : on montre alors les tuiles de l'Accueil.
const CIBLES: string[][] = [
  [],
  ['encaisser', 'menu-encaisser'],
  ['menu-locataires', 'tuile-locataires'],
  ['menu-recus', 'tuile-recus'],
  ['menu-statistiques', 'tuile-statistiques'],
  ['notifications'],
  ['personnaliser'],
  [],
];

const CLE_MUET = 'mes-loyers:demo-muet';
const lireMuet = () => { try { return localStorage.getItem(CLE_MUET) === '1'; } catch { return false; } };

function trouver(cles: string[]): HTMLElement | null {
  for (const c of cles) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${c}"]`)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth) return el;
    }
  }
  return null;
}

/** Visite guidée : l'écran s'assombrit, l'élément à toucher est entouré, une bulle explique. */
export function VisiteGuidee({ onFin }: { onFin: () => void }) {
  const textes = NARRATIONS.visite;
  const [i, setI] = useState(0);
  const [muet, setMuet] = useState(lireMuet);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const lecture = useRef<Lecture | null>(null);
  const derniere = i === textes.length - 1;

  const mesurer = useCallback(() => {
    const el = trouver(CIBLES[i] ?? []);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [i]);

  useLayoutEffect(() => {
    trouver(CIBLES[i] ?? [])?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    mesurer();
    window.addEventListener('resize', mesurer);
    window.addEventListener('scroll', mesurer, true);
    return () => { window.removeEventListener('resize', mesurer); window.removeEventListener('scroll', mesurer, true); };
  }, [mesurer, i]);

  useEffect(() => {
    if (muet) return;
    const l = lire(`visite.${i}`, textes[i], { muet: false, onFin: () => undefined });
    lecture.current = l;
    return () => l.arreter();
  }, [i, muet, textes]);

  const basculerSon = () => {
    try { localStorage.setItem(CLE_MUET, muet ? '0' : '1'); } catch { /* stockage indisponible */ }
    setMuet(!muet);
  };

  // Bulle sous l'élément s'il y a la place, sinon au-dessus ; centrée quand il n'y a pas d'élément
  const largeur = Math.min(340, window.innerWidth - 24);
  const bulle: React.CSSProperties = rect
    ? {
        left: Math.min(Math.max(12, rect.left + rect.width / 2 - largeur / 2), window.innerWidth - largeur - 12),
        ...(rect.bottom + 200 < window.innerHeight ? { top: rect.bottom + 14 } : { bottom: window.innerHeight - rect.top + 14 }),
      }
    : { left: (window.innerWidth - largeur) / 2, top: window.innerHeight / 2 - 90 };

  return (
    <Portal>
      <div className="visite-voile" onClick={(e) => e.stopPropagation()} style={rect ? undefined : { background: 'rgba(15,23,42,.62)' }} />
      {rect && <div className="visite-trou" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />}
      <Paper role="dialog" aria-live="polite" shadow="xl" radius="lg" p="md" w={largeur}
        style={{ position: 'fixed', zIndex: 401, ...bulle }}>
        <Text size="xs" c="dimmed" mb={4}>Étape {i + 1} sur {textes.length}</Text>
        <Text size="md" fw={500}>{textes[i]}</Text>
        <Group justify="space-between" mt="md" wrap="nowrap">
          <Group gap={4} wrap="nowrap">
            <ActionIcon variant="subtle" color="gray" aria-label={muet ? 'Remettre le son' : 'Couper le son'} onClick={basculerSon}>
              {muet ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
            </ActionIcon>
            {!derniere && <Button variant="subtle" color="gray" size="xs" onClick={onFin}>Passer</Button>}
          </Group>
          <Group gap={6} wrap="nowrap">
            {i > 0 && <Button variant="default" size="xs" onClick={() => setI(i - 1)}>Retour</Button>}
            <Button size="xs" onClick={() => (derniere ? onFin() : setI(i + 1))}>{derniere ? 'Terminer' : 'Suivant'}</Button>
          </Group>
        </Group>
      </Paper>
    </Portal>
  );
}
