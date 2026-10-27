// Lecture de la voix off : fichier MP3 généré (`npm run voix`) s'il existe, sinon la voix du téléphone
// (Web Speech API), sinon une simple minuterie quand le son est coupé. Les sous-titres sont toujours affichés.

let manifeste: Promise<Record<string, string>> | null = null;
const chargerManifeste = (): Promise<Record<string, string>> =>
  (manifeste ??= fetch('/voix/manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
    .catch(() => ({})));

/** Durée de lecture estimée d'un texte (pour le mode sans son). */
export const dureeTexte = (texte: string) => Math.max(2500, texte.length * 65 + 900);

export interface Lecture {
  arreter(): void;
  pause(): void;
  reprendre(): void;
}

function voixFrancaise(): SpeechSynthesisVoice | undefined {
  const voix = window.speechSynthesis?.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr')) ?? [];
  // On préfère une voix féminine (les noms les plus courants), sinon la première voix française
  return voix.find((v) => /denise|julie|amelie|amélie|audrey|marie|hortense|female|femme|google français/i.test(v.name)) ?? voix[0];
}

/** Minuterie qu'on peut mettre en pause. */
function minuterie(ms: number, fin: () => void): Lecture {
  let reste = ms;
  let debut = Date.now();
  let id: ReturnType<typeof setTimeout> | null = setTimeout(fin, reste);
  return {
    arreter: () => { if (id) clearTimeout(id); id = null; },
    pause: () => { if (id) { clearTimeout(id); id = null; reste -= Date.now() - debut; } },
    reprendre: () => { if (!id) { debut = Date.now(); id = setTimeout(fin, Math.max(0, reste)); } },
  };
}

export function lire(cle: string, texte: string, { muet, onFin }: { muet: boolean; onFin: () => void }): Lecture {
  let actuelle: Lecture | null = null;
  let annule = false;
  let enPause = false;
  const finir = () => { if (!annule) onFin(); };

  const viaSynthese = () => {
    const synth = window.speechSynthesis;
    if (!synth) { actuelle = minuterie(dureeTexte(texte), finir); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    const v = voixFrancaise();
    if (v) u.voice = v;
    // Certains navigateurs n'émettent jamais « end » : une minuterie de secours prend le relais
    const secours = minuterie(dureeTexte(texte) * 1.6, finir);
    u.onend = () => { secours.arreter(); finir(); };
    u.onerror = () => { secours.arreter(); finir(); };
    synth.speak(u);
    actuelle = {
      arreter: () => { secours.arreter(); u.onend = null; synth.cancel(); },
      pause: () => { secours.pause(); synth.pause(); },
      reprendre: () => { secours.reprendre(); synth.resume(); },
    };
  };

  if (muet) {
    actuelle = minuterie(dureeTexte(texte), finir);
  } else {
    void chargerManifeste().then((m) => {
      if (annule) return;
      const fichier = m[cle];
      if (!fichier) { viaSynthese(); if (enPause) actuelle?.pause(); return; }
      const audio = new Audio(`/voix/${fichier}`);
      audio.onended = finir;
      audio.onerror = () => { if (!annule) viaSynthese(); };
      actuelle = {
        arreter: () => { audio.onended = null; audio.onerror = null; audio.pause(); },
        pause: () => audio.pause(),
        reprendre: () => { void audio.play().catch(() => undefined); },
      };
      if (!enPause) audio.play().catch(() => { if (!annule) { actuelle?.arreter(); viaSynthese(); } });
    });
  }

  return {
    arreter: () => { annule = true; actuelle?.arreter(); },
    pause: () => { enPause = true; actuelle?.pause(); },
    reprendre: () => { enPause = false; actuelle?.reprendre(); },
  };
}
