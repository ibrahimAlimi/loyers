// Exporte la vidéo de présentation en MP4 (pour WhatsApp ou Facebook) : `npm run video -- [adresse]`.
// 1. lit la durée de chaque phrase de voix (public/voix, générées par `npm run voix`) ;
// 2. enregistre /presentation?export=1 dans un navigateur automatisé (Playwright), au rythme de la voix ;
// 3. pose chaque phrase au bon moment et assemble le tout avec ffmpeg.
// Prérequis : `npm run dev` lancé (ou une adresse en argument), ffmpeg installé,
// et `npm i -D playwright && npx playwright install chromium`.
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { NARRATIONS } from '../src/features/apprendre/narrations';

const executer = promisify(execFile);
const adresse = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const sortie = join(process.cwd(), 'presentation-mes-loyers.mp4');

async function duree(fichier: string): Promise<number> {
  const { stdout } = await executer('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fichier]);
  return Math.round(parseFloat(stdout) * 1000);
}

async function main() {
  const manifeste = JSON.parse(await readFile(join('public', 'voix', 'manifest.json'), 'utf8')) as Record<string, string>;
  const phrases = NARRATIONS.presentation.map((_, i) => manifeste[`presentation.${i}`]);
  if (phrases.some((f) => !f)) throw new Error('Voix manquantes : lancez d’abord « npm run voix ».');
  const fichiers = phrases.map((f) => join('public', 'voix', f));
  const durees = await Promise.all(fichiers.map(duree));
  console.log(`${durees.length} phrases, ${Math.round(durees.reduce((a, b) => a + b, 0) / 1000)} s de voix.`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { chromium } = (await import('playwright' as string)) as any;
  const dossier = await mkdtemp(join(tmpdir(), 'mes-loyers-video-'));
  const navigateur = await chromium.launch();
  const contexte = await navigateur.newContext({
    viewport: { width: 1328, height: 820 }, deviceScaleFactor: 1, locale: 'fr-FR',
    recordVideo: { dir: dossier, size: { width: 1328, height: 820 } },
  });
  const debutVideo = Date.now();
  const page = await contexte.newPage();
  await page.addInitScript((d: number[]) => { (window as unknown as { __durees: number[] }).__durees = d; }, durees);
  await page.goto(`${adresse}/presentation?export=1`);
  await page.waitForFunction(() => (window as unknown as { __fini?: boolean }).__fini === true, null,
    { timeout: durees.reduce((a, b) => a + b, 0) + 120_000, polling: 500 });
  await page.waitForTimeout(1500);
  const debuts = (await page.evaluate(() => (window as unknown as { __debuts: number[] }).__debuts)) as number[];
  await contexte.close();
  await navigateur.close();

  const webm = (await readdir(dossier)).find((f) => f.endsWith('.webm'));
  if (!webm) throw new Error('Enregistrement introuvable.');
  const decalages = debuts.map((t) => Math.max(0, t - debutVideo));
  const filtres = fichiers.map((_, i) => `[${i + 1}:a]adelay=${decalages[i]}|${decalages[i]}[a${i}]`).join(';');
  const melange = `${fichiers.map((_, i) => `[a${i}]`).join('')}amix=inputs=${fichiers.length}:normalize=0[voix]`;
  await executer('ffmpeg', [
    '-y', '-i', join(dossier, webm), ...fichiers.flatMap((f) => ['-i', f]),
    '-filter_complex', `${filtres};${melange}`,
    '-map', '0:v', '-map', '[voix]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', sortie,
  ], { maxBuffer: 64 * 1024 * 1024 });
  await rm(dossier, { recursive: true, force: true });
  console.log(`Vidéo prête : ${sortie}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
