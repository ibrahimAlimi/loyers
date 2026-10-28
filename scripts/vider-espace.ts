// Vide un espace : efface tout son contenu, en gardant l'espace, ses comptes et ses réglages.
// Simulation : npm run espace:vider -- <PRÉFIXE>               (affiche ce qui serait effacé)
// Effacer    : npm run espace:vider -- <PRÉFIXE> --confirmer   (irréversible)
// Pour supprimer l'espace de démonstration ET ses comptes : npm run demo:supprimer.
// Nécessite VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local.
import { createClient } from '@supabase/supabase-js';

const prefixe = process.argv.slice(2).find((a) => !a.startsWith('--'));
const confirmer = process.argv.includes('--confirmer');
const URL = process.env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!prefixe || !/^[A-Z]{3}$/.test(prefixe)) {
  console.error('Usage : npm run espace:vider -- <PRÉFIXE de 3 lettres> [--confirmer]');
  process.exit(1);
}
if (!URL || !SERVICE) {
  console.error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const { data: espace, error } = await admin.from('espaces').select('id, nom').eq('prefixe_recu', prefixe).maybeSingle();
if (error) throw error;
if (!espace) {
  console.error(`Aucun espace avec le préfixe ${prefixe} sur ${URL}.`);
  process.exit(1);
}

const { data: compte, error: err } = await admin.rpc('vider_espace', { p_espace: espace.id, p_simulation: !confirmer });
if (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}
const lignes = Object.entries(compte as Record<string, number>).map(([k, n]) => `  ${k.padEnd(14)} ${n}`).join('\n');
if (confirmer) {
  console.log(`✅ Espace « ${espace.nom} » (${URL}) vidé. Éléments effacés :\n${lignes}`);
} else {
  console.log(`Espace « ${espace.nom} » sur ${URL}\nSerait effacé :\n${lignes}`);
  console.log('\nL\'espace, ses comptes et ses réglages sont gardés. Pour effacer vraiment, relancez avec --confirmer.');
}
