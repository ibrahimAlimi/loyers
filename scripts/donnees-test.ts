// Espace de démonstration pour tester l'application (données fictives).
// Créer    : npm run demo
// Supprimer: npm run demo:supprimer
// Nécessite VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY dans .env.local.
// Le CAPTCHA doit être désactivé dans Supabase pendant l'exécution (les comptes de démo se connectent).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SERVICE) {
  console.error('VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local');
  process.exit(1);
}

const PREFIXE = 'DEM';
const MDP = 'Demo-2026!';
const COMPTES = [
  { identifiant: 'demo.proprio', nom: 'Koffi Adjovi (démo)', role: 'proprietaire' },
  { identifiant: 'demo.gestion', nom: 'Paul Dossa (démo)', role: 'gestionnaire' },
  { identifiant: 'demo.consult', nom: 'Comptable (démo)', role: 'consultation' },
] as const;
const email = (id: string) => `${id}@comptes.mes-loyers.app`;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

// ---------- Dates ----------
const auj = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Porto-Novo' }));
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const AUJ = iso(auj);
const moisDecale = (n: number) => new Date(auj.getFullYear(), auj.getMonth() + n, 1);
const jourDuMois = (m: Date, j: number) => {
  const d = new Date(m.getFullYear(), m.getMonth(), j);
  return iso(d) > AUJ ? AUJ : iso(d);
};

// ---------- Suppression ----------
async function supprimer() {
  const { data: esp } = await admin.from('espaces').select('id').eq('prefixe_recu', PREFIXE).maybeSingle();
  if (esp) {
    await admin.from('espaces').delete().eq('id', esp.id); // cascade sur tout le contenu
    await admin.from('historique_modifications').delete().eq('espace_id', esp.id);
    console.log('Espace de démonstration supprimé.');
  }
  for (const c of COMPTES) {
    const { data: p } = await admin.from('profils').select('id').eq('identifiant', c.identifiant).maybeSingle();
    if (p) await admin.auth.admin.deleteUser(p.id);
  }
  console.log('Comptes de démonstration supprimés.');
}

// ---------- Création ----------
async function connecte(identifiant: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: email(identifiant), password: MDP });
  if (error) throw new Error(`Connexion ${identifiant} impossible : ${error.message} (CAPTCHA activé dans Supabase ?)`);
  return c;
}

function ok<T>(r: { data: T; error: { message: string } | null }, quoi: string): T {
  if (r.error) throw new Error(`${quoi} : ${r.error.message}`);
  return r.data;
}

type Profil = 'ponctuel' | 'retard1' | 'retard2' | 'critique' | 'partiel' | 'remise' | 'avance' | 'groupe' | 'parti';

interface Bail {
  nom: string; prenoms: string; tel: string; profession: string;
  maison: number; logement: string; type: string; niveau: string; loyer: number;
  debutMoisAvant: number; jourEntree: number; caution: number; profil: Profil;
}

const MAISONS = [
  { nom: 'Arouna', quartier: 'Gbégamey', ville: 'Cotonou', repere: 'Derrière la pharmacie du carrefour' },
  { nom: 'Les Cocotiers', quartier: 'Fidjrossè', ville: 'Cotonou', repere: 'Route des pêches, portail bleu' },
  { nom: 'Wahid', quartier: 'Zogbadjè', ville: 'Abomey-Calavi', repere: 'Face au campus' },
];

const BAUX: Bail[] = [
  { nom: 'Aguemon', prenoms: 'Fawaz', tel: '0197112233', profession: 'Enseignant', maison: 0, logement: 'En bas à droite N°2', type: 'appartement', niveau: 'Rez-de-chaussée', loyer: 70000, debutMoisAvant: 14, jourEntree: 1, caution: 140000, profil: 'retard2' },
  { nom: 'Dossou', prenoms: 'Aïcha', tel: '0196445566', profession: 'Infirmière', maison: 0, logement: 'Appartement A', type: 'appartement', niveau: '1er étage', loyer: 60000, debutMoisAvant: 11, jourEntree: 1, caution: 120000, profil: 'ponctuel' },
  { nom: 'Houngbo', prenoms: 'Koffi', tel: '0167889900', profession: 'Commerçant', maison: 0, logement: 'Chambre 2', type: 'chambre_salon', niveau: 'Rez-de-chaussée', loyer: 45000, debutMoisAvant: 9, jourEntree: 15, caution: 90000, profil: 'retard1' },
  { nom: 'Zinsou', prenoms: 'Mariam', tel: '0151223344', profession: 'Couturière', maison: 0, logement: 'Chambre 4', type: 'chambre', niveau: 'Rez-de-chaussée', loyer: 35000, debutMoisAvant: 10, jourEntree: 1, caution: 70000, profil: 'critique' },
  { nom: 'Ahouansou', prenoms: 'Sèna', tel: '0162334455', profession: 'Coiffeuse', maison: 0, logement: 'Boutique 1', type: 'boutique', niveau: 'Façade', loyer: 20000, debutMoisAvant: 7, jourEntree: 1, caution: 40000, profil: 'partiel' },
  { nom: 'Agbo', prenoms: 'Rodrigue', tel: '0195667788', profession: 'Informaticien', maison: 1, logement: 'Villa 1', type: 'appartement', niveau: 'Plain-pied', loyer: 150000, debutMoisAvant: 13, jourEntree: 1, caution: 300000, profil: 'ponctuel' },
  { nom: 'Kpadé', prenoms: 'Fifamè', tel: '0161112233', profession: 'Juriste', maison: 1, logement: 'Appartement B', type: 'appartement', niveau: '1er étage', loyer: 80000, debutMoisAvant: 8, jourEntree: 1, caution: 160000, profil: 'avance' },
  { nom: 'Sossa', prenoms: 'Gislain', tel: '0197001122', profession: 'Chauffeur', maison: 1, logement: 'Chambre-salon 3', type: 'chambre_salon', niveau: 'Rez-de-chaussée', loyer: 40000, debutMoisAvant: 12, jourEntree: 1, caution: 80000, profil: 'remise' },
  { nom: 'Noukounon', prenoms: 'Henri', tel: '0166554433', profession: 'Mécanicien', maison: 1, logement: 'Magasin', type: 'magasin', niveau: 'Façade', loyer: 50000, debutMoisAvant: 10, jourEntree: 1, caution: 100000, profil: 'groupe' },
  { nom: 'Gnahoui', prenoms: 'Marlène', tel: '0154443322', profession: 'Étudiante', maison: 2, logement: 'Chambre 1', type: 'chambre', niveau: 'Rez-de-chaussée', loyer: 25000, debutMoisAvant: 6, jourEntree: 1, caution: 50000, profil: 'ponctuel' },
  { nom: 'Fousséni', prenoms: 'Sikiratou', tel: '0198887766', profession: 'Étudiante', maison: 2, logement: 'Chambre 2', type: 'chambre', niveau: 'Rez-de-chaussée', loyer: 25000, debutMoisAvant: 5, jourEntree: 10, caution: 50000, profil: 'retard1' },
  { nom: 'Zannou', prenoms: 'Crédo', tel: '0169990011', profession: 'Étudiant', maison: 2, logement: 'Chambre 3', type: 'chambre', niveau: '1er étage', loyer: 30000, debutMoisAvant: 9, jourEntree: 1, caution: 60000, profil: 'parti' },
];
// Logements libres (pour tester « Mettre en location »)
const LIBRES = [
  { maison: 1, designation: 'Studio 4', type: 'chambre_salon', niveau: '1er étage', loyer: 45000 },
  { maison: 2, designation: 'Chambre 4', type: 'chambre', niveau: '1er étage', loyer: 30000 },
];

async function creer() {
  await supprimer();

  // Comptes
  const ids: Record<string, string> = {};
  for (const c of COMPTES) {
    const u = ok(await admin.auth.admin.createUser({ email: email(c.identifiant), password: MDP, email_confirm: true }), `compte ${c.identifiant}`);
    ids[c.identifiant] = u.user!.id;
    ok(await admin.from('profils').insert({ id: u.user!.id, identifiant: c.identifiant, nom_complet: c.nom, telephone: '0100000000', doit_changer_mdp: false }), 'profil');
  }
  const espace = ok(await admin.from('espaces').insert({
    nom: 'Immobilier Démo', prefixe_recu: PREFIXE, ville: 'Cotonou', adresse: 'Gbégamey', telephone: '+229 01 97 00 00 00',
    email: 'demo@exemple.bj', couleur_primaire: '#0f766e',
  }).select('id').single(), 'espace');
  for (const c of COMPTES) {
    ok(await admin.from('membres').insert({ espace_id: espace.id, user_id: ids[c.identifiant], role: c.role }), 'membre');
  }
  console.log('Comptes et espace créés.');

  // Tout le reste se fait connecté, via l'API normale (les règles de sécurité s'appliquent)
  const proprio = await connecte('demo.proprio');
  const gestion = await connecte('demo.gestion');

  const maisons: string[] = [];
  for (const [i, m] of MAISONS.entries()) {
    const r = ok(await proprio.from('maisons').insert({
      ...m, espace_id: espace.id, gestionnaire_id: i === 2 ? ids['demo.gestion'] : null,
    }).select('id').single(), 'maison');
    maisons.push(r.id);
  }

  for (const l of LIBRES) {
    ok(await proprio.from('logements').insert({ espace_id: espace.id, maison_id: maisons[l.maison], type: l.type,
      designation: l.designation, niveau: l.niveau, loyer_reference: l.loyer }), 'logement libre');
  }

  let nbPaiements = 0;
  for (const b of BAUX) {
    // Gestionnaire pour la maison « Wahid », propriétaire ailleurs
    const client = b.maison === 2 ? gestion : proprio;
    const logement = ok(await client.from('logements').insert({ espace_id: espace.id, maison_id: maisons[b.maison], type: b.type,
      designation: b.logement, niveau: b.niveau, loyer_reference: b.loyer }).select('id').single(), 'logement');
    const locataire = ok(await client.from('locataires').insert({ espace_id: espace.id, nom: b.nom, prenoms: b.prenoms,
      telephone: b.tel, profession: b.profession, piece_type: 'CNI' }).select('id').single(), 'locataire');

    const debut = moisDecale(-b.debutMoisAvant);
    const dateDebut = iso(new Date(debut.getFullYear(), debut.getMonth(), b.jourEntree));
    const bail = ok(await client.from('baux').insert({
      espace_id: espace.id, logement_id: logement.id, locataire_id: locataire.id, reference: `BAIL-${b.nom.slice(0, 3).toUpperCase()}-${b.logement.replace(/\D/g, '') || '1'}`,
      date_debut: dateDebut, loyer: b.loyer, caution_montant: b.caution,
      premier_mois_montant: b.jourEntree > 1 ? Math.round(b.loyer / 2) : null,
    }).select('id').single(), 'bail');

    ok(await client.rpc('enregistrer_mouvement_caution', { p_bail: bail.id, p_type: 'versement', p_montant: b.caution, p_date: dateDebut, p_mode: 'especes' }), 'caution');

    // Mois du bail jusqu'au mois courant
    const mois: Date[] = [];
    for (let n = -b.debutMoisAvant; n <= 0; n++) mois.push(moisDecale(n));
    const nonPayes = { retard1: 1, retard2: 2, critique: 4, parti: 0 }[b.profil as string] ?? 0;
    const aPayer = mois.slice(0, mois.length - nonPayes);
    if (b.profil === 'parti') aPayer.splice(-3); // parti il y a 2 mois, en laissant 1 mois impayé

    const payer = async (m: Date[], montant: number, extra: Record<string, unknown> = {}) => {
      const modes = ['especes', 'especes', 'mtn_momo', 'moov_money', 'celtiis_cash'];
      const mode = modes[nbPaiements % modes.length];
      ok(await client.rpc('encaisser', {
        p_bail: bail.id, p_date: jourDuMois(m[m.length - 1], 2 + (nbPaiements % 6)), p_montant: montant, p_mode: mode,
        p_reference: mode === 'especes' ? null : `MP${Date.now().toString().slice(-8)}`, p_payeur: `${b.nom} ${b.prenoms}`,
        p_cle_idempotence: randomUUID(), p_mois: m.map(iso), ...extra,
      }), `paiement ${b.nom}`);
      nbPaiements++;
    };
    const du = (i: number) => (i === 0 && b.jourEntree > 1 ? Math.round(b.loyer / 2) : b.loyer);

    for (let i = 0; i < aPayer.length; i++) {
      const dernier = i === aPayer.length - 1;
      if (b.profil === 'groupe' && i + 1 < aPayer.length) {
        await payer([aPayer[i], aPayer[i + 1]], du(i) + du(i + 1));
        i++;
      } else if (b.profil === 'partiel' && dernier) {
        await payer([aPayer[i]], Math.round(du(i) / 2));
      } else if (b.profil === 'remise' && i === aPayer.length - 3) {
        await payer([aPayer[i]], du(i) - 10000, { p_reste: 'remise', p_motif_remise: 'Travaux de peinture faits par le locataire' });
      } else {
        await payer([aPayer[i]], du(i));
      }
    }
    if (b.profil === 'avance') await payer([moisDecale(0), moisDecale(1)].map((m) => m), b.loyer * 2).catch(() => undefined);

    if (b.profil === 'parti') {
      ok(await client.from('baux').update({ date_fin: iso(new Date(auj.getFullYear(), auj.getMonth() - 2, 28)) }).eq('id', bail.id), 'fin de bail');
    }
  }

  console.log(`\n✅ Espace « Immobilier Démo » prêt : ${MAISONS.length} maisons, ${BAUX.length + LIBRES.length} logements, ${BAUX.length} locataires, ${nbPaiements} paiements.`);
  console.log('\nComptes de test (mot de passe pour tous : ' + MDP + ') :');
  console.log('  demo.proprio  → propriétaire (tout l\'espace)');
  console.log('  demo.gestion  → gestionnaire (maison « Wahid » uniquement)');
  console.log('  demo.consult  → consultation (lecture seule)');
  console.log('\nAvec ton compte « ibrahim » : Administration > « Entrer dans cet espace ».');
}

(process.argv.includes('--supprimer') ? supprimer() : creer()).catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
