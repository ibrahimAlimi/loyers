// Envoi des notifications en attente : e-mail (Brevo) et téléphone (Web Push).
// Appelée chaque minute par pg_cron (voir la migration 12) avec l'en-tête x-cron-secret ; jamais par le navigateur.
import webpush from 'npm:web-push@3.6.7';
import { clientAdmin } from '../_shared/admin.ts';

const LOT = 50;
const MAX_TENTATIVES = 5;

interface Ligne {
  id: string;
  user_id: string;
  titre: string;
  message: string | null;
  lien: string | null;
  email_statut: string | null;
  push_statut: string | null;
  tentatives: number;
  profil: { nom_complet: string; email: string | null } | null;
  espace: { nom: string; couleur_primaire: string } | null;
}

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function gabarit(n: Ligne, url: string): string {
  const couleur = /^#[0-9a-f]{6}$/i.test(n.espace?.couleur_primaire ?? '') ? n.espace!.couleur_primaire : '#0f766e';
  const nom = echapper(n.espace?.nom ?? 'Mes Loyers');
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${couleur};color:#fff;padding:16px 20px;font-size:18px;font-weight:bold">${nom}</td></tr>
<tr><td style="padding:20px">
<p style="font-size:17px;font-weight:bold;margin:0 0 8px">${echapper(n.titre)}</p>
${n.message ? `<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${echapper(n.message)}</p>` : ''}
<a href="${url}" style="display:inline-block;background:${couleur};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Ouvrir Mes Loyers</a>
</td></tr>
<tr><td style="padding:12px 20px;font-size:12px;color:#6b7280;border-top:1px solid #eee">
Vous recevez cet e-mail car vos notifications sont activées. Vous pouvez les régler dans « Mon profil ».
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || !egal(req.headers.get('x-cron-secret') ?? '', secret)) {
    return new Response('Interdit', { status: 403 });
  }
  const admin = clientAdmin();
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
  const brevo = Deno.env.get('BREVO_API_KEY');
  const expediteur = Deno.env.get('EMAIL_EXPEDITEUR');
  const vapidPublique = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivee = Deno.env.get('VAPID_PRIVATE_KEY');
  if (vapidPublique && vapidPrivee) {
    webpush.setVapidDetails(`mailto:${expediteur ?? 'contact@mes-loyers.app'}`, vapidPublique, vapidPrivee);
  }

  const { data, error } = await admin
    .from('notifications')
    .select('id, user_id, titre, message, lien, email_statut, push_statut, tentatives, profil:profils!notifications_user_id_fkey(nom_complet, email), espace:espaces(nom, couleur_primaire)')
    .or('email_statut.eq.a_envoyer,push_statut.eq.a_envoyer')
    .order('cree_le')
    .limit(LOT);
  if (error) return new Response(error.message, { status: 500 });

  let emails = 0;
  let pushs = 0;
  for (const n of (data ?? []) as unknown as Ligne[]) {
    const maj: Record<string, unknown> = {};
    const url = `${appUrl}${n.lien ?? '/'}`;
    let echec = false;

    if (n.email_statut === 'a_envoyer') {
      if (!brevo || !expediteur || !n.profil?.email) {
        maj.email_statut = null; // canal non configuré : on abandonne sans réessayer
      } else {
        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': brevo, 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            sender: { name: n.espace?.nom ?? 'Mes Loyers', email: expediteur },
            to: [{ email: n.profil.email, name: n.profil.nom_complet }],
            subject: n.titre,
            htmlContent: gabarit(n, url),
            textContent: `${n.titre}\n\n${n.message ?? ''}\n\n${url}`,
          }),
        }).catch(() => null);
        if (r?.ok) { maj.email_statut = 'envoye'; emails++; } else echec = true;
      }
    }

    if (n.push_statut === 'a_envoyer') {
      if (!vapidPublique || !vapidPrivee) {
        maj.push_statut = null;
      } else {
        const { data: abos } = await admin.from('abonnements_push').select('id, endpoint, p256dh, auth').eq('user_id', n.user_id);
        const charge = JSON.stringify({ titre: n.titre, message: n.message ?? '', lien: n.lien ?? '/', id: n.id });
        let unOk = false;
        for (const a of abos ?? []) {
          try {
            await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, { TTL: 86400 });
            unOk = true;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            // Abonnement expiré ou retiré par le téléphone : on l'oublie
            if (code === 404 || code === 410) await admin.from('abonnements_push').delete().eq('id', a.id);
          }
        }
        if (unOk) { maj.push_statut = 'envoye'; pushs++; } else if (!abos?.length) maj.push_statut = null; else echec = true;
      }
    }

    if (echec) {
      maj.tentatives = n.tentatives + 1;
      if (n.tentatives + 1 >= MAX_TENTATIVES) {
        if (n.email_statut === 'a_envoyer' && maj.email_statut === undefined) maj.email_statut = 'echec';
        if (n.push_statut === 'a_envoyer' && maj.push_statut === undefined) maj.push_statut = 'echec';
      }
    }
    if (Object.keys(maj).length) await admin.from('notifications').update(maj).eq('id', n.id);
  }

  return new Response(JSON.stringify({ traitees: data?.length ?? 0, emails, pushs }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
