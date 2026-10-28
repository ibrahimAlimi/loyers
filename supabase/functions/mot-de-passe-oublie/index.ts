// « Mot de passe oublié » (public) : CAPTCHA (Turnstile, si configuré), limite par IP et par compte.
// Compte avec e-mail : lien de réinitialisation valable 1 heure, envoyé par Brevo.
// Sans e-mail (ou envoi impossible) : le propriétaire, ou l'administrateur pour un propriétaire, est prévenu.
// La réponse est toujours la même, pour ne pas révéler si un identifiant existe.
import { corsHeaders, erreur, json } from '../_shared/cors.ts';
import { clientAdmin } from '../_shared/admin.ts';

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const echapper = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return erreur('Méthode non autorisée.', 405);
  const corps = await req.json().catch(() => ({}));
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const reponse = json({ ok: true });

  if (texte(corps.site_web, 200)) return reponse; // champ piège pour les robots

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (secret) {
    const verif = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: texte(corps.captcha, 2048), ...(ip ? { remoteip: ip } : {}) }),
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!verif.success) return erreur('La vérification anti-robot a échoué. Réessayez.', 400);
  }

  const saisie = texte(corps.identifiant, 200);
  if (saisie.length < 3) return erreur('Indiquez votre identifiant ou votre e-mail.');

  const admin = clientAdmin();
  const { data, error } = await admin.rpc('demande_mot_de_passe_oublie', { p_saisie: saisie, p_ip: ip });
  if (error) return erreur(/Trop de demandes/.test(error.message) ? error.message : 'La demande n\'a pas pu être envoyée. Réessayez.', 429);
  const compte = data as { trouve: boolean; user_id?: string; nom?: string; email?: string | null };
  if (!compte.trouve || !compte.user_id) return reponse;

  const brevo = Deno.env.get('BREVO_API_KEY');
  const expediteur = Deno.env.get('EMAIL_EXPEDITEUR');
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
  let envoye = false;

  if (compte.email && brevo && expediteur && appUrl) {
    const { data: u } = await admin.auth.admin.getUserById(compte.user_id);
    const { data: lien } = u.user?.email
      ? await admin.auth.admin.generateLink({ type: 'recovery', email: u.user.email })
      : { data: null };
    const jeton = lien?.properties?.hashed_token;
    if (jeton) {
      const url = `${appUrl}/nouveau-mot-de-passe?jeton=${encodeURIComponent(jeton)}`;
      const nom = echapper(compte.nom ?? '');
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevo, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: 'Mes Loyers', email: expediteur },
          to: [{ email: compte.email, name: compte.nom }],
          subject: 'Choisir un nouveau mot de passe',
          htmlContent: `<div style="font-family:Arial,sans-serif;font-size:16px;color:#1f2937;max-width:520px">
<p>Bonjour ${nom},</p>
<p>Vous avez demandé à changer votre mot de passe Mes Loyers.</p>
<p><a href="${url}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Choisir un nouveau mot de passe</a></p>
<p style="color:#6b7280;font-size:14px">Ce lien est valable 1 heure et ne sert qu'une fois. Si vous n'avez rien demandé, ignorez cet e-mail : votre mot de passe ne change pas.</p>
</div>`,
          textContent: `Bonjour ${compte.nom},\n\nPour choisir un nouveau mot de passe Mes Loyers, ouvrez ce lien (valable 1 heure) :\n${url}\n\nSi vous n'avez rien demandé, ignorez cet e-mail.`,
        }),
      }).catch(() => null);
      envoye = !!r?.ok;
    }
  }

  if (envoye) await admin.rpc('marquer_mot_de_passe_envoye', { p_user: compte.user_id });
  else await admin.rpc('notifier_mot_de_passe_oublie', { p_user: compte.user_id });
  return reponse;
});
