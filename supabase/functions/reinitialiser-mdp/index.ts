// Réinitialisation du mot de passe d'un compte par le super admin ou par le propriétaire (ses comptes).
import { corsHeaders, erreur, json } from '../_shared/cors.ts';
import { appelant, clientAdmin } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = clientAdmin();
  const moi = await appelant(req, admin);
  if (!moi) return erreur('Vous devez être connecté.', 401);

  const { user_id, nouveau_mot_de_passe } = await req.json().catch(() => ({}));
  if (!user_id || (nouveau_mot_de_passe ?? '').length < 8) {
    return erreur('Le mot de passe doit faire au moins 8 caractères.');
  }
  if (user_id === moi.id) return erreur('Changez votre propre mot de passe depuis « Mon profil ».', 400);

  const { data: cibleProfil } = await admin.from('profils').select('est_super_admin').eq('id', user_id).maybeSingle();
  if (!cibleProfil) return erreur('Compte introuvable.', 404);

  if (!moi.estSuperAdmin) {
    if (cibleProfil.est_super_admin) return erreur('Vous ne pouvez pas réinitialiser ce compte.', 403);
    // Espaces où l'appelant est propriétaire
    const { data: espacesProprio } = await admin
      .from('membres').select('espace_id').eq('user_id', moi.id).eq('role', 'proprietaire').eq('actif', true);
    const mesEspaces = new Set((espacesProprio ?? []).map((e) => e.espace_id as string));
    // Toutes les appartenances de la cible : elles doivent toutes être dans mes espaces, sans rôle propriétaire.
    // Sinon, réinitialiser son mot de passe donnerait accès aux espaces d'un autre propriétaire.
    const { data: appartenances } = await admin.from('membres').select('espace_id, role').eq('user_id', user_id);
    const autorise = !!appartenances?.length
      && appartenances.every((a) => mesEspaces.has(a.espace_id as string) && a.role !== 'proprietaire');
    if (!autorise) {
      return erreur('Ce compte est aussi utilisé chez un autre propriétaire : seul l\'administrateur peut le réinitialiser.', 403);
    }
  }

  const { error } = await admin.auth.admin.updateUserById(user_id, { password: nouveau_mot_de_passe });
  if (error) return erreur(error.message, 500);
  await admin.from('profils').update({ doit_changer_mdp: true }).eq('id', user_id);
  return json({ ok: true });
});
