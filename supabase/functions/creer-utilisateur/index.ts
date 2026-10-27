// Création d'un compte (et, pour le super admin, d'un nouvel espace propriétaire).
import { corsHeaders, erreur, json } from '../_shared/cors.ts';
import { appelant, clientAdmin, emailDeConnexion, estProprietaire, IDENTIFIANT_VALIDE } from '../_shared/admin.ts';

type Role = 'proprietaire' | 'gestionnaire' | 'consultation';

interface Corps {
  identifiant: string;
  nom_complet: string;
  telephone?: string;
  email?: string;
  mot_de_passe_provisoire: string;
  role?: Role;
  espace_id?: string;
  espace?: { nom: string; prefixe_recu: string; ville?: string; telephone?: string };
  maisons?: string[];
  /** Ajouter un utilisateur existant (même identifiant) à cet espace. */
  ajouter_existant?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = clientAdmin();
  const moi = await appelant(req, admin);
  if (!moi) return erreur('Vous devez être connecté.', 401);

  let c: Corps;
  try {
    c = await req.json();
  } catch {
    return erreur('Requête invalide.');
  }

  const identifiant = (c.identifiant ?? '').trim().toLowerCase();
  const creationEspace = !!c.espace;
  const role: Role = creationEspace ? 'proprietaire' : (c.role ?? 'gestionnaire');

  // ---- Droits ----
  if (creationEspace || role === 'proprietaire') {
    if (!moi.estSuperAdmin) return erreur('Seul l\'administrateur peut créer un propriétaire.', 403);
  } else {
    if (!c.espace_id) return erreur('Espace manquant.');
    if (!moi.estSuperAdmin && !(await estProprietaire(admin, moi.id, c.espace_id))) {
      return erreur('Seul le propriétaire peut créer des comptes dans son espace.', 403);
    }
  }

  // ---- Utilisateur existant ? ----
  const { data: existant } = await admin.from('profils').select('id').eq('identifiant', identifiant).maybeSingle();
  if (existant && !c.ajouter_existant) return erreur('Cet identifiant est déjà utilisé.', 409);

  let userId = existant?.id as string | undefined;
  let espaceId = c.espace_id;
  let authCree = false;

  try {
    if (!userId) {
      if (!IDENTIFIANT_VALIDE.test(identifiant)) {
        return erreur('Identifiant invalide : 3 à 40 caractères, lettres minuscules, chiffres, point, tiret.');
      }
      if (!c.nom_complet?.trim()) return erreur('Indiquez le nom complet.');
      if ((c.mot_de_passe_provisoire ?? '').length < 8) return erreur('Le mot de passe doit faire au moins 8 caractères.');

      const { data: cree, error } = await admin.auth.admin.createUser({
        email: emailDeConnexion(identifiant),
        password: c.mot_de_passe_provisoire,
        email_confirm: true,
        user_metadata: { identifiant },
      });
      if (error || !cree.user) throw new Error(error?.message ?? 'Création du compte impossible.');
      userId = cree.user.id;
      authCree = true;

      const { error: errProfil } = await admin.from('profils').insert({
        id: userId,
        identifiant,
        nom_complet: c.nom_complet.trim(),
        telephone: c.telephone?.trim() || null,
        email: c.email?.trim().toLowerCase() || null,
        doit_changer_mdp: true,
      });
      if (errProfil) throw new Error(errProfil.message);
    }

    if (creationEspace) {
      const { data: esp, error: errEsp } = await admin
        .from('espaces')
        .insert({
          nom: c.espace!.nom.trim(),
          prefixe_recu: c.espace!.prefixe_recu.trim().toUpperCase(),
          ville: c.espace!.ville?.trim() || null,
          telephone: c.espace!.telephone?.trim() || c.telephone?.trim() || null,
          cree_par: moi.id,
        })
        .select('id')
        .single();
      if (errEsp) {
        throw new Error(errEsp.message.includes('prefixe_recu') ? 'Ce préfixe de reçu est déjà utilisé.' : errEsp.message);
      }
      espaceId = esp.id;
    }

    const { error: errMembre } = await admin
      .from('membres')
      .upsert({ espace_id: espaceId, user_id: userId, role, actif: true });
    if (errMembre) throw new Error(errMembre.message);

    if (c.maisons?.length) {
      if (role === 'gestionnaire') {
        await admin.from('maisons').update({ gestionnaire_id: userId }).in('id', c.maisons).eq('espace_id', espaceId);
      } else if (role === 'consultation') {
        await admin
          .from('membre_maisons')
          .insert(c.maisons.map((maison_id) => ({ espace_id: espaceId, user_id: userId, maison_id })));
      }
    }

    return json({ user_id: userId, identifiant, espace_id: espaceId });
  } catch (e) {
    if (authCree && userId) await admin.auth.admin.deleteUser(userId);
    return erreur(e instanceof Error ? e.message : 'Erreur inattendue.', 500);
  }
});
