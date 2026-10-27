// Fournisseurs de synthèse vocale, derrière une interface unique : changer de service ne touche rien d'autre.
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const executer = promisify(execFile);

export interface FournisseurVoix {
  /** Identifiant stable (voix comprise) : il entre dans le nom des fichiers, pour tout régénérer si on change de voix. */
  id: string;
  synthetiser(texte: string, fichier: string): Promise<void>;
}

/** edge-tts (Python) : voix neuronale Microsoft, gratuite mais non officielle. `pip install edge-tts`. */
export function edgeTts(voix = 'fr-FR-DeniseNeural'): FournisseurVoix {
  const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
  return {
    id: `edge:${voix}`,
    async synthetiser(texte, fichier) {
      await executer(python, ['-m', 'edge_tts', '--voice', voix, '--rate=-8%', '--text', texte, '--write-media', fichier]);
    },
  };
}

/** Google Cloud Text-to-Speech (gratuit pour ce volume). Clé API dans GOOGLE_TTS_KEY. */
export function googleTts(voix = 'fr-FR-Neural2-A'): FournisseurVoix {
  const cle = process.env.GOOGLE_TTS_KEY;
  if (!cle) throw new Error('GOOGLE_TTS_KEY manquante');
  return {
    id: `google:${voix}`,
    async synthetiser(texte, fichier) {
      const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${cle}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: texte },
          voice: { languageCode: 'fr-FR', name: voix },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92 },
        }),
      });
      if (!r.ok) throw new Error(`Google TTS : ${r.status} ${await r.text()}`);
      const { audioContent } = (await r.json()) as { audioContent: string };
      await writeFile(fichier, Buffer.from(audioContent, 'base64'));
    },
  };
}
