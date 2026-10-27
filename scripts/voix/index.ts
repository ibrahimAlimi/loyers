// Génère la voix off des démos et de la visite guidée : `npm run voix`.
// Un fichier MP3 par phrase, nommé d'après le texte et la voix : seuls les textes modifiés sont régénérés.
// Fournisseur : edge-tts par défaut (`pip install edge-tts`), ou VOIX_FOURNISSEUR=google avec GOOGLE_TTS_KEY.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NARRATIONS } from '../../src/features/apprendre/narrations';
import { edgeTts, googleTts, type FournisseurVoix } from './fournisseurs';

const DOSSIER = join(process.cwd(), 'public', 'voix');

async function main() {
  const fournisseur: FournisseurVoix = process.env.VOIX_FOURNISSEUR === 'google' ? googleTts() : edgeTts();
  await mkdir(DOSSIER, { recursive: true });
  const manifeste: Record<string, string> = {};
  let crees = 0;

  for (const [demo, phrases] of Object.entries(NARRATIONS)) {
    for (const [i, texte] of phrases.entries()) {
      const nom = `${createHash('sha1').update(`${fournisseur.id}|${texte}`).digest('hex').slice(0, 16)}.mp3`;
      manifeste[`${demo}.${i}`] = nom;
      if (existsSync(join(DOSSIER, nom))) continue;
      process.stdout.write(`${demo}.${i} … `);
      await fournisseur.synthetiser(texte, join(DOSSIER, nom));
      crees++;
      console.log('ok');
    }
  }

  // Les anciens fichiers qui ne servent plus sont supprimés
  const utiles = new Set(Object.values(manifeste));
  for (const f of await readdir(DOSSIER)) {
    if (f.endsWith('.mp3') && !utiles.has(f)) await rm(join(DOSSIER, f));
  }
  await writeFile(join(DOSSIER, 'manifest.json'), `${JSON.stringify(manifeste, null, 2)}\n`);
  console.log(`${crees} fichier(s) créé(s), ${Object.keys(manifeste).length} phrases au total.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  console.error('edge-tts est-il installé ?  pip install edge-tts');
  process.exit(1);
});
