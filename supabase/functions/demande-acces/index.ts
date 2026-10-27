// Formulaire public « Demander un accès » : CAPTCHA (Turnstile, si configuré), contrôle des champs,
// puis enregistrement (3 par heure et par adresse IP) et notification du super admin.
import { corsHeaders, erreur, json } from '../_shared/cors.ts';
import { clientAdmin } from '../_shared/admin.ts';

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return erreur('Méthode non autorisée.', 405);
  const corps = await req.json().catch(() => ({}));
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;

  // Champ piège invisible : un robot le remplit, une personne non
  if (texte(corps.site_web, 200)) return json({ ok: true });

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (secret) {
    const verif = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: texte(corps.captcha, 2048), ...(ip ? { remoteip: ip } : {}) }),
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!verif.success) return erreur('La vérification anti-robot a échoué. Réessayez.', 400);
  }

  const nom = texte(corps.nom, 120);
  const telephone = texte(corps.telephone, 30);
  const email = texte(corps.email, 200);
  const nb = Number.parseInt(String(corps.nb_logements ?? ''), 10);
  if (nom.length < 2) return erreur('Indiquez votre nom.');
  if (telephone.replace(/\D/g, '').length < 8) return erreur('Indiquez un numéro de téléphone valide.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erreur("L'adresse e-mail n'est pas valide.");

  const admin = clientAdmin();
  const { error } = await admin.rpc('enregistrer_demande_acces', {
    p_nom: nom, p_telephone: telephone, p_email: email || null, p_ville: texte(corps.ville, 80) || null,
    p_nb_logements: Number.isFinite(nb) && nb > 0 ? Math.min(nb, 10000) : null,
    p_message: texte(corps.message, 1000) || null, p_ip: ip,
  });
  if (error) return erreur(/Trop de demandes/.test(error.message) ? error.message : "La demande n'a pas pu être envoyée. Réessayez.", 429);
  return json({ ok: true });
});
