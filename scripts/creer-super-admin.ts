// Crée le compte super administrateur.
// Usage : npm run super-admin -- <identifiant> "<Nom complet>" <mot_de_passe> [email]
// Nécessite VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local (jamais commité).
import { createClient } from '@supabase/supabase-js';

const [identifiantBrut, nomComplet, motDePasse, email] = process.argv.slice(2);
const url = process.env.VITE_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!identifiantBrut || !nomComplet || !motDePasse) {
  console.error('Usage : npm run super-admin -- <identifiant> "<Nom complet>" <mot_de_passe> [email]');
  process.exit(1);
}
if (!url || !cle) {
  console.error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local');
  process.exit(1);
}

const identifiant = identifiantBrut.trim().toLowerCase();
const admin = createClient(url, cle, { auth: { persistSession: false } });

const { data, error } = await admin.auth.admin.createUser({
  email: `${identifiant}@comptes.mes-loyers.app`,
  password: motDePasse,
  email_confirm: true,
  user_metadata: { identifiant },
});
if (error || !data.user) {
  console.error('Échec de la création du compte :', error?.message);
  process.exit(1);
}

const { error: errProfil } = await admin.from('profils').insert({
  id: data.user.id,
  identifiant,
  nom_complet: nomComplet,
  email: email?.toLowerCase() ?? null,
  est_super_admin: true,
  doit_changer_mdp: false,
});
if (errProfil) {
  await admin.auth.admin.deleteUser(data.user.id);
  console.error('Échec de la création du profil :', errProfil.message);
  process.exit(1);
}

console.log(`Super administrateur « ${identifiant} » créé.`);
