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

  if (!moi.estSuperAdmin) {
    // Le propriétaire peut réinitialiser un gestionnaire ou un compte Consultation de l'un de ses espaces
    const { data: espacesProprio } = await admin
      .from('membres')
      .select('espace_id')
      .eq('user_id', moi.id)
      .eq('role', 'proprietaire')
      .eq('actif', true);
    const ids = (espacesProprio ?? []).map((e) => e.espace_id);
    const { data: cible } = ids.length
      ? await admin.from('membres').select('role').eq('user_id', user_id).in('espace_id', ids).neq('role', 'proprietaire')
      : { data: [] };
    if (!cible?.length) return erreur('Vous ne pouvez pas réinitialiser ce compte.', 403);
  }

  const { error } = await admin.auth.admin.updateUserById(user_id, { password: nouveau_mot_de_passe });
  if (error) return erreur(error.message, 500);
  await admin.from('profils').update({ doit_changer_mdp: true }).eq('id', user_id);
  return json({ ok: true });
});
