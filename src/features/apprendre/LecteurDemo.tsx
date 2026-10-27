import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ActionIcon, Box, Button, Group, Paper, Progress, Text, Tooltip } from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay, IconRotate, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { NARRATIONS, RAPPEL_PERSONNALISER } from './narrations';
import { lire, type Lecture } from './voix';

export interface EtapeDemo {
  scene: string;
  /** `data-demo` de l'élément que le doigt montre. */
  doigt?: string;
  geste?: 'toucher' | 'montrer';
  etat?: Record<string, unknown>;
}

export interface Demo {
  id: string;
  titre: string;
  description: string;
  icone: Icon;
  /** Termine par le rappel « Personnaliser » (écrans personnalisables). */
  personnaliser?: boolean;
  etapes: EtapeDemo[];
  scenes: Record<string, (etat: Record<string, unknown>) => ReactNode>;
}

const CLE_MUET = 'mes-loyers:demo-muet';
const lireMuet = () => { try { return localStorage.getItem(CLE_MUET) === '1'; } catch { return false; } };
const ecrireMuet = (v: boolean) => { try { localStorage.setItem(CLE_MUET, v ? '1' : '0'); } catch { /* stockage indisponible */ } };

interface Position { x: number; y: number; l: number; h: number }

/** Mode export vidéo : son coupé dans la page, durées imposées, étapes signalées au script d'enregistrement. */
export interface ExportVideo {
  durees: number[];
  surEtape: (i: number) => void;
  surFin: () => void;
}

/** Joue une démo : scènes scriptées, doigt animé, surbrillance, sous-titres et voix off. */
export function LecteurDemo({ demo, onTermine, hauteur = 520, exportVideo }: {
  demo: Demo; onTermine: () => void; hauteur?: number | string; exportVideo?: ExportVideo;
}) {
  const textes = NARRATIONS[demo.id] ?? [];
  const etapes = demo.personnaliser
    ? [...demo.etapes, { ...demo.etapes[demo.etapes.length - 1], doigt: 'personnaliser', geste: 'montrer' as const }]
    : demo.etapes;
  const texte = (i: number) => (demo.personnaliser && i === etapes.length - 1 ? RAPPEL_PERSONNALISER : textes[i] ?? '');
  const cle = (i: number) => (demo.personnaliser && i === etapes.length - 1 ? 'rappel.0' : `${demo.id}.${i}`);

  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const [muet, setMuet] = useState(lireMuet);
  const [fini, setFini] = useState(false);
  const [doigt, setDoigt] = useState<Position | null>(null);
  const [tape, setTape] = useState(0);
  const scene = useRef<HTMLDivElement>(null);
  const lecture = useRef<Lecture | null>(null);
  const etape = etapes[Math.min(i, etapes.length - 1)];

  // Voix et enchaînement des étapes
  useEffect(() => {
    if (fini) { exportVideo?.surFin(); return; }
    exportVideo?.surEtape(i);
    const l = lire(cle(i), texte(i), {
      muet: muet || !!exportVideo,
      duree: exportVideo?.durees[i],
      onFin: () => setTimeout(() => (i + 1 >= etapes.length ? setFini(true) : setI(i + 1)), 700),
    });
    lecture.current = l;
    return () => l.arreter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, muet, fini]);

  useEffect(() => { if (pause) lecture.current?.pause(); else lecture.current?.reprendre(); }, [pause, i]);

  // Le doigt rejoint l'élément montré, puis « touche » si besoin
  useLayoutEffect(() => {
    const cadre = scene.current;
    const cible = etape.doigt ? cadre?.querySelector<HTMLElement>(`[data-demo="${etape.doigt}"]`) : null;
    if (!cadre || !cible) { setDoigt(null); return; }
    const a = cadre.getBoundingClientRect();
    const b = cible.getBoundingClientRect();
    setDoigt({ x: b.left - a.left, y: b.top - a.top, l: b.width, h: b.height });
    if (etape.geste === 'toucher') {
      const t = setTimeout(() => setTape((n) => n + 1), 900);
      return () => clearTimeout(t);
    }
  }, [i, etape.doigt, etape.geste]);

  const revoir = useCallback(() => { setFini(false); setPause(false); setI(0); }, []);
  const basculerSon = () => { ecrireMuet(!muet); setMuet(!muet); };

  return (
    <Box>
      <Paper withBorder radius="lg" style={{ overflow: 'hidden', position: 'relative', height: hauteur, background: 'var(--mantine-color-gray-0)' }}>
        <div ref={scene} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
          {demo.scenes[etape.scene]?.(etape.etat ?? {})}
          {doigt && (
            <>
              <div className="demo-surbrillance" style={{ left: doigt.x - 4, top: doigt.y - 4, width: doigt.l + 8, height: doigt.h + 8 }} />
              {etape.geste === 'toucher' && tape > 0 && (
                <div key={tape} className="demo-onde" style={{ left: doigt.x + doigt.l / 2 - 22, top: doigt.y + doigt.h / 2 - 22 }} />
              )}
              <div className="demo-doigt" style={{ left: doigt.x + doigt.l / 2 - 6, top: doigt.y + doigt.h / 2 - 2 }}>👆</div>
            </>
          )}
        </div>
      </Paper>

      {/* Sous-titres, toujours affichés */}
      <Paper radius="md" p="sm" mt="sm" bg="dark.7" c="white" mih={64} aria-live="polite">
        <Text size="md" fw={500}>{fini ? 'Terminé.' : texte(i)}</Text>
      </Paper>

      <Progress value={fini ? 100 : (100 * i) / etapes.length} size="sm" mt="xs" radius="xl" aria-label="Avancement" />
      {!exportVideo && <Group justify="space-between" mt="sm">
        <Group gap={6}>
          <Tooltip label="Revoir"><ActionIcon variant="default" size="lg" aria-label="Revoir" onClick={revoir}><IconRotate size={20} /></ActionIcon></Tooltip>
          <Tooltip label={pause ? 'Reprendre' : 'Pause'}>
            <ActionIcon variant="default" size="lg" aria-label={pause ? 'Reprendre' : 'Pause'} disabled={fini} onClick={() => setPause(!pause)}>
              {pause ? <IconPlayerPlay size={20} /> : <IconPlayerPause size={20} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label={muet ? 'Remettre le son' : 'Couper le son'}>
            <ActionIcon variant="default" size="lg" aria-label={muet ? 'Remettre le son' : 'Couper le son'} onClick={basculerSon}>
              {muet ? <IconVolumeOff size={20} /> : <IconVolume size={20} />}
            </ActionIcon>
          </Tooltip>
        </Group>
        <Button onClick={onTermine}>J'ai compris</Button>
      </Group>}
    </Box>
  );
}
