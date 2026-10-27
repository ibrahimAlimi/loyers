// Prévient par e-mail (Brevo) le demandeur d'un accès, quand le super admin l'accepte ou la refuse.
// Le mot de passe n'est jamais envoyé par e-mail : le super admin le transmet à part (WhatsApp).
import { corsHeaders, erreur, json } from '../_shared/cors.ts';
import { appelant, clientAdmin } from '../_shared/admin.ts';

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = clientAdmin();
  const moi = await appelant(req, admin);
  if (!moi?.estSuperAdmin) return erreur('Réservé à l’administrateur.', 403);

  const { demande_id, identifiant } = await req.json().catch(() => ({}));
  const { data: d } = await admin.from('demandes_acces').select('nom, email, statut, reponse').eq('id', demande_id).maybeSingle();
  if (!d) return erreur('Demande introuvable.', 404);
  const brevo = Deno.env.get('BREVO_API_KEY');
  const expediteur = Deno.env.get('EMAIL_EXPEDITEUR');
  if (!d.email || !brevo || !expediteur) return json({ envoye: false });

  const url = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
  const accepte = d.statut === 'acceptee';
  const corps = accepte
    ? `<p>Bonjour ${echapper(d.nom)},</p><p>Votre espace <b>Mes Loyers</b> est prêt.</p>
       <p>Adresse : <a href="${url}/connexion">${url}/connexion</a><br>Identifiant : <b>${echapper(String(identifiant ?? ''))}</b></p>
       <p>Votre mot de passe provisoire vous sera transmis séparément (par exemple sur WhatsApp). Vous le changerez à la première connexion.</p>`
    : `<p>Bonjour ${echapper(d.nom)},</p><p>Votre demande d'accès à <b>Mes Loyers</b> n'a pas pu être acceptée pour le moment.</p>
       ${d.reponse ? `<p>${echapper(d.reponse)}</p>` : ''}`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevo, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Mes Loyers', email: expediteur },
      to: [{ email: d.email, name: d.nom }],
      subject: accepte ? 'Votre accès à Mes Loyers est prêt' : 'Votre demande d’accès à Mes Loyers',
      htmlContent: `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">${corps}</div>`,
    }),
  }).catch(() => null);
  return json({ envoye: !!r?.ok });
});
