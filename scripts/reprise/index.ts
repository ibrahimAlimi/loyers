// Reprise des données de l'ancien logiciel Access (spec §6.15).
// 1. pwsh scripts/reprise/exporter-access.ps1 -Base <LOYERS.mdb> -Sortie <dossier>
// 2. npm run reprise -- <dossier> <PRÉFIXE>              simulation : écrit <dossier>/rapport-reprise.md
// 3. npm run reprise -- <dossier> <PRÉFIXE> --importer   importe dans l'espace (vide) qui a ce préfixe
// Nécessite VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local.
// Le dossier CSV et le rapport contiennent des données personnelles : ne jamais les commiter.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const [dossier, prefixe] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const importer = process.argv.includes('--importer');
if (!dossier || !prefixe || !/^[A-Z]{3}$/.test(prefixe)) {
  console.error('Usage : npm run reprise -- <dossier_csv> <PRÉFIXE de 3 lettres> [--importer]');
  process.exit(1);
}

// ---------- Lecture des CSV (séparateur « ; », guillemets, retours à la ligne dans les champs) ----------
type Ligne = Record<string, string>;
function lireCsv(nom: string): Ligne[] {
  const texte = readFileSync(join(dossier, `${nom}.csv`), 'utf8').replace(/^﻿/, '');
  const lignes: string[][] = [];
  let champ = '';
  let ligne: string[] = [];
  let guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c !== '"') champ += c;
      else if (texte[i + 1] === '"') { champ += '"'; i++; }
      else guillemets = false;
    } else if (c === '"') guillemets = true;
    else if (c === ';') { ligne.push(champ); champ = ''; }
    else if (c === '\n') { ligne.push(champ.replace(/\r$/, '')); lignes.push(ligne); ligne = []; champ = ''; }
    else champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ.replace(/\r$/, '')); lignes.push(ligne); }
  const [entete, ...reste] = lignes;
  return reste.filter((l) => l.some((v) => v.trim())).map((l) => Object.fromEntries(entete.map((h, i) => [h, (l[i] ?? '').trim()])));
}

const IMMEUBLE = lireCsv('IMMEUBLE');
const APPARTEMENT = lireCsv('APPARTEMENT');
const LOCATAIRE = lireCsv('LOCATAIRE');
const CONTRAT = lireCsv('CONTRAT');
const LOYERS = lireCsv('LOYERS');

// ---------- Dates ----------
const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};
const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const AUJ = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo' }).format(new Date());
const MOIS_COURANT = `${AUJ.slice(0, 7)}-01`;
const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const libMois = (m: string) => `${NOMS_MOIS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const moisSuivant = (m: string) => {
  const [a, mo] = m.split('-').map(Number);
  return mo === 12 ? `${a + 1}-01-01` : `${a}-${String(mo + 1).padStart(2, '0')}-01`;
};
const fr = (d: string) => d.split('-').reverse().join('/');
const fcfa = (n: number) => `${n.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`;
const entier = (s: string) => (s && /^-?\d+$/.test(s) ? Number(s) : 0);

// ---------- Rapport ----------
const aFaire: string[] = [];
const ignores: string[] = [];

// ---------- Maisons ----------
const A_CLASSER = '__a_classer__';
const maisons = IMMEUBLE.filter((i) => i.NomImmeuble).map((i) => ({
  cle: i.NomImmeuble,
  nom: i.NomImmeuble,
  quartier: i.Quartier,
  notes: [i.Niveau, i.Type, i.Indication, i.Renseignements].filter(Boolean).join(' · '),
}));
const nomsMaisons = new Set(maisons.map((m) => m.cle));

// ---------- Logements ----------
const logementsSousContrat = new Set(CONTRAT.map((c) => c.CodeAppart));
const logements: { cle: string; maison: string; type: string; designation: string; niveau: string; loyer_reference: number | null; notes: string }[] = [];
for (const a of APPARTEMENT) {
  let maison = a.NomImmeuble;
  const designation = a.NomAppart || 'Sans nom';
  if (!nomsMaisons.has(maison)) {
    if (!logementsSousContrat.has(a.CodeAppart)) {
      ignores.push(`Logement « ${designation} » (n° ${a.CodeAppart}) : sans immeuble et sans contrat.`);
      continue;
    }
    maison = A_CLASSER;
    aFaire.push(`Logement « ${designation} » : il n'avait pas d'immeuble dans Access. Il est dans la maison « À classer ». Ouvrez-le et choisissez sa vraie maison.`);
  }
  if (!a.NomAppart) aFaire.push(`Un logement de la maison ${maison === A_CLASSER ? '« À classer »' : maison} n'avait pas de nom : il s'appelle « Sans nom ». Renommez-le.`);
  logements.push({
    cle: a.CodeAppart,
    maison,
    type: maison === 'MAGASIN' ? 'magasin' : 'appartement',
    designation,
    niveau: a.NiveauAppart,
    loyer_reference: entier(a.Prix) > 0 ? entier(a.Prix) : null,
    notes: [
      a.NbPieces && `${a.NbPieces} pièce(s)`, a.NbDouches && `${a.NbDouches} douche(s)`, a.TypeCarelage && `Carrelage : ${a.TypeCarelage}`,
      a.CompteurEau && `Compteur d'eau : ${a.CompteurEau}`, a.CompteurElectricite && `Compteur électrique : ${a.CompteurElectricite}`,
    ].filter(Boolean).join(' · '),
  });
}
if (logements.some((l) => l.maison === A_CLASSER)) maisons.push({ cle: A_CLASSER, nom: 'À classer', quartier: '', notes: 'Logements sans immeuble dans l\'ancien logiciel' });
const logementParCle = new Map(logements.map((l) => [l.cle, l]));

// ---------- Locataires ----------
const A_RENOMMER = 'Locataire à renommer';
const locataires = LOCATAIRE.map((l) => ({
  cle: l.CodeLocataire,
  nom: l.Identite || A_RENOMMER,
  notes: [
    l.Profession && `Profession : ${l.Profession}`, l.Service && `Service : ${l.Service}`, l.Contacts && `Contacts : ${l.Contacts}`,
    l.Mail && `E-mail : ${l.Mail}`, l.Marié === 'true' && 'Marié(e)', entier(l.NbEnfants) > 0 && `${l.NbEnfants} enfant(s)`, l.Details,
  ].filter(Boolean).join(' · '),
}));
const locataireParCle = new Map(locataires.map((l) => [l.cle, l]));
const sansNom = CONTRAT.filter((c) => locataireParCle.get(c.CodeLocataire)?.nom === A_RENOMMER);
if (sansNom.length) {
  aFaire.push(`Un locataire n'avait pas de nom dans Access : il s'appelle « ${A_RENOMMER} » et porte ${sansNom.length} bail(s). Renommez-le : ses anciens reçus seront mis à jour.`);
}

// ---------- Baux, révisions et paiements ----------
interface Paiement { bail: string; date: string; montant: number; mois: string; payeur: string; a_verifier: string[]; reprise: Record<string, unknown>; ordre: number }
const baux: { cle: string; logement: string; locataire: string; reference: string; date_debut: string; loyer: number; revisions: { mois: string; montant: number }[] }[] = [];
const paiements: Paiement[] = [];
const resumeBaux: string[] = [];
const logementsOccupes = new Map<string, string>();

for (const c of CONTRAT) {
  const log = logementParCle.get(c.CodeAppart);
  const loc = locataireParCle.get(c.CodeLocataire);
  if (!log || !loc) {
    ignores.push(`Contrat n° ${c.NumContrat} : ${!log ? 'logement' : 'locataire'} introuvable.`);
    continue;
  }
  if (logementsOccupes.has(c.CodeAppart)) {
    throw new Error(`Les contrats ${logementsOccupes.get(c.CodeAppart)} et ${c.NumContrat} occupent le même logement : à trancher avant l'import.`);
  }
  logementsOccupes.set(c.CodeAppart, c.NumContrat);

  // Lignes de loyer de ce contrat, avec leur mois
  const lignes = LOYERS.filter((l) => l.NumContrat === c.NumContrat).flatMap((l) => {
    const m = MOIS[sansAccent(l.Mois)];
    if (!m || !/^\d{4}$/.test(l.Annee) || entier(l.Montant) <= 0) {
      ignores.push(`Paiement Access n° ${l.NumLoyer} (${loc.nom}) : ${l.Mois || '?'} ${l.Annee || '(année manquante)'}, ${fcfa(entier(l.Montant))}${l.DateLoyer ? ` du ${fr(l.DateLoyer)}` : ''}. Mois ou montant illisible : à ressaisir si besoin.`);
      return [];
    }
    return [{ l, mois: `${l.Annee}-${String(m).padStart(2, '0')}-01` }];
  }).sort((a, b) => a.mois.localeCompare(b.mois) || (a.l.DateLoyer || '').localeCompare(b.l.DateLoyer || '') || entier(a.l.NumLoyer) - entier(b.l.NumLoyer));

  const loyerContrat = entier(c.Loyer);
  const nomLog = `${log.designation} (${log.maison === A_CLASSER ? 'À classer' : log.maison})`;

  // Début du bail : date du contrat ou plus ancien mois payé
  let dateDebut = [c.DateContrat, lignes[0]?.mois].filter(Boolean).sort()[0];
  if (!dateDebut) {
    dateDebut = MOIS_COURANT;
    aFaire.push(`Bail de ${loc.nom} — ${nomLog} : aucune date ni aucun paiement dans Access. Début fixé à ${libMois(MOIS_COURANT)} : corrigez la date d'entrée, ou mettez fin au bail s'il n'existe plus.`);
  } else if (!lignes.length) {
    aFaire.push(`Bail de ${loc.nom} — ${nomLog} : commencé le ${fr(dateDebut)}, aucun paiement enregistré dans Access${entier(c.Avance) ? ` (avance indiquée : ${c.Avance})` : ''}. Vérifiez s'il doit des loyers.`);
  }

  // Loyer et révisions, déduits des montants : un nouveau montant qui tient 2 mois de suite = révision
  const parMois = new Map<string, number[]>();
  for (const { l, mois } of lignes) parMois.set(mois, [...(parMois.get(mois) ?? []), entier(l.Montant)]);
  const valeurs = [...parMois.entries()].map(([mois, ms]) => ({ mois, montant: ms.every((x) => x === ms[0]) ? ms[0] : null }));
  let courant = valeurs.find((v) => v.montant !== null)?.montant ?? (loyerContrat || log.loyer_reference || 0);
  const loyer = courant;
  const revisions: { mois: string; montant: number }[] = [];
  for (let k = 1; k < valeurs.length; k++) {
    const v = valeurs[k].montant;
    if (v !== null && v !== courant && valeurs[k + 1]?.montant === v) {
      revisions.push({ mois: valeurs[k].mois, montant: v });
      courant = v;
    }
  }
  if (lignes.length && loyerContrat > 0 && loyerContrat !== courant) {
    const m = moisSuivant(lignes[lignes.length - 1].mois);
    revisions.push({ mois: m, montant: loyerContrat });
    aFaire.push(`Bail de ${loc.nom} — ${nomLog} : les derniers paiements sont de ${fcfa(courant)}, mais le contrat Access indique ${fcfa(loyerContrat)}. Le loyer passe à ${fcfa(loyerContrat)} à partir de ${libMois(m)} : vérifiez.`);
  }
  if (loyer <= 0) {
    ignores.push(`Contrat n° ${c.NumContrat} (${loc.nom}) : aucun loyer connu.`);
    continue;
  }
  const loyerDuMois = (m: string) => [...revisions].reverse().find((r) => r.mois <= m)?.montant ?? loyer;

  const cle = c.NumContrat;
  baux.push({ cle, logement: log.cle, locataire: loc.cle, reference: `Access n° ${c.NumContrat}`, date_debut: dateDebut, loyer, revisions });

  // Paiements et étiquettes « à vérifier »
  const vus = new Set<string>();
  let nbAVerifier = 0;
  for (const { l, mois } of lignes) {
    const etiquettes: string[] = [];
    const montant = entier(l.Montant);
    if (vus.has(mois)) etiquettes.push('doublon');
    vus.add(mois);
    if (montant !== loyerDuMois(mois)) etiquettes.push('montant');
    let date = l.DateLoyer;
    if (!date) { date = mois; etiquettes.push('date'); }
    else if (date > AUJ) {
      const unAnAvant = `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
      date = unAnAvant <= AUJ ? unAnAvant : AUJ;
      etiquettes.push('date');
    }
    if (etiquettes.length) nbAVerifier++;
    paiements.push({
      bail: cle, date, montant, mois, payeur: loc.nom, a_verifier: etiquettes, ordre: entier(l.NumLoyer),
      reprise: {
        source: 'access', numero_access: entier(l.NumLoyer), contrat_access: entier(c.NumContrat),
        mois_access: `${l.Mois} ${l.Annee}`, date_access: l.DateLoyer || null, encaisseur: l.Payeur || null,
      },
    });
  }
  resumeBaux.push(`| ${loc.nom} | ${nomLog} | ${fr(dateDebut)} | ${fcfa(loyer)}${revisions.map((r) => ` → ${fcfa(r.montant)} (${libMois(r.mois)})`).join('')} | ${lignes.length} | ${nbAVerifier} |`);
}
paiements.sort((a, b) => a.date.localeCompare(b.date) || a.mois.localeCompare(b.mois) || a.ordre - b.ordre);

// ---------- Rapport de reprise ----------
const ETIQUETTE: Record<string, string> = { doublon: 'mois déjà payé', montant: 'montant ≠ loyer', date: 'date corrigée' };
const nomBail = new Map(baux.map((b) => [b.cle, `${locataireParCle.get(b.locataire)!.nom} — ${logementParCle.get(b.logement)!.designation}`]));
const aVerifier = paiements.filter((p) => p.a_verifier.length);
const compte = (e: string) => aVerifier.filter((p) => p.a_verifier.includes(e)).length;
const total = paiements.reduce((s, p) => s + p.montant, 0);

const rapport = [
  `# Rapport de reprise Access — ${fr(AUJ)}`,
  '',
  `Mode : **${importer ? 'import' : 'simulation (rien n\'a été écrit)'}** · préfixe des reçus : **${prefixe}** · reçus repris : \`${prefixe}-R-AAAA-NNNNNN\``,
  '',
  '## Éléments repris',
  `- ${maisons.length} maisons, ${logements.length} logements, ${locataires.length} locataires, ${baux.length} baux, ${baux.reduce((s, b) => s + b.revisions.length, 0)} révisions de loyer`,
  `- ${paiements.length} paiements (${fcfa(total)}), du ${fr(paiements[0]?.date ?? AUJ)} au ${fr(paiements[paiements.length - 1]?.date ?? AUJ)}, chacun avec son reçu repris`,
  `- ${aVerifier.length} paiements à vérifier : ${compte('doublon')} mois déjà payé, ${compte('montant')} montant différent du loyer, ${compte('date')} date corrigée`,
  '',
  '## À faire dans l\'application',
  ...(aFaire.length ? aFaire.map((t) => `- ${t}`) : ['- Rien.']),
  `- Ouvrez **Paiements à vérifier** : pour chaque ligne, « Changer le mois », « C'est correct » ou « Annuler ce paiement ».`,
  '',
  '## Baux',
  '| Locataire | Logement | Début | Loyer | Paiements | À vérifier |',
  '|---|---|---|---|---|---|',
  ...resumeBaux,
  '',
  '## Paiements à vérifier',
  '| Bail | Mois (Access) | Montant | Payé le | Pourquoi |',
  '|---|---|---|---|---|',
  ...aVerifier.map((p) => `| ${nomBail.get(p.bail)} | ${p.reprise.mois_access} | ${fcfa(p.montant)} | ${fr(p.date)}${p.reprise.date_access && p.reprise.date_access !== p.date ? ` (Access : ${fr(String(p.reprise.date_access))})` : ''} | ${p.a_verifier.map((e) => ETIQUETTE[e]).join(', ')} |`),
  '',
  '## Non repris',
  ...(ignores.length ? ignores.map((t) => `- ${t}`) : ['- Rien.']),
  '',
].join('\n');
const fichierRapport = join(dossier, 'rapport-reprise.md');
writeFileSync(fichierRapport, rapport, 'utf8');

console.log(`${maisons.length} maisons, ${logements.length} logements, ${locataires.length} locataires, ${baux.length} baux, ${paiements.length} paiements (${fcfa(total)}).`);
console.log(`${aVerifier.length} paiements à vérifier, ${aFaire.length} points à corriger, ${ignores.length} éléments non repris.`);
console.log(`Rapport : ${fichierRapport}`);

// ---------- Import ----------
const URL = process.env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  if (importer) { console.error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local'); process.exit(1); }
  process.exit(0);
}
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const { data: espace, error: errEspace } = await admin.from('espaces').select('id, nom').eq('prefixe_recu', prefixe).is('supprime_le', null).maybeSingle();
if (errEspace) throw errEspace;
if (!espace) {
  console.error(`\nAucun espace avec le préfixe ${prefixe} sur ${URL}. Créez-le d'abord (Administration > Créer un propriétaire).`);
  process.exit(importer ? 1 : 0);
}
console.log(`\nEspace cible : « ${espace.nom} » sur ${URL}`);
if (!importer) {
  console.log('Simulation terminée. Relisez le rapport, puis relancez avec --importer.');
  process.exit(0);
}

const { data: resultat, error } = await admin.rpc('importer_reprise', {
  p_espace: espace.id,
  p_donnees: {
    maisons, logements, locataires, baux,
    paiements: paiements.map(({ ordre: _ordre, ...p }) => p),
  },
});
if (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}
console.log('✅ Reprise terminée :', resultat);
