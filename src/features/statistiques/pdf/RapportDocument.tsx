import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { dayjs } from '@/lib/dates';
import type { Espace } from '@/lib/types';
import type { Indicateurs, StatsCompletes } from '../api';

// Helvetica ne connaît pas l'espace fine insécable : on formate avec des espaces simples (comme le reçu).
const nombre = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
const fcfa = (n: number | null | undefined) => `${nombre(n ?? 0)} FCFA`;
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n} %`);
const MODE: Record<string, string> = {
  especes: 'Espèces', mtn_momo: 'MTN Mobile Money', moov_money: 'Moov Money', celtiis_cash: 'Celtiis Cash',
  virement: 'Virement', cheque: 'Chèque', autre: 'Autre',
};
const PONCTUALITE: Record<string, string> = { exemplaire: 'Exemplaire', surveiller: 'À surveiller', critique: 'Critique' };

export interface OptionsRapport {
  espace: Pick<Espace, 'nom' | 'ville' | 'adresse' | 'telephone' | 'email' | 'couleur_primaire'>;
  logo: string | null;
  periode: string;
  filtres: string;
  domaine: string;
}

type Colonne<T> = { titre: string; largeur: number; valeur: (l: T) => string; droite?: boolean };

export function RapportDocument({ stats, comparaison, o }: { stats: StatsCompletes; comparaison: Indicateurs | null; o: OptionsRapport }) {
  const couleur = o.espace.couleur_primaire || '#0f766e';
  const s = styles(couleur);
  const i = stats.indicateurs;
  const initiales = o.espace.nom.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const Tableau = <T,>({ titre, lignes, colonnes, vide }: { titre: string; lignes: T[]; colonnes: Colonne<T>[]; vide?: string }) => (
    <View style={s.section} wrap>
      <Text style={s.h2}>{titre}</Text>
      {!lignes.length ? <Text style={s.vide}>{vide ?? 'Aucune donnée.'}</Text> : (
        <View>
          <View style={[s.ligne, s.enteteTableau]} fixed>
            {colonnes.map((c) => <Text key={c.titre} style={[s.cellule, { width: `${c.largeur}%`, textAlign: c.droite ? 'right' : 'left' }, s.gras]}>{c.titre}</Text>)}
          </View>
          {lignes.map((l, n) => (
            <View key={n} style={[s.ligne, n % 2 ? s.zebre : {}]} wrap={false}>
              {colonnes.map((c) => <Text key={c.titre} style={[s.cellule, { width: `${c.largeur}%`, textAlign: c.droite ? 'right' : 'left' }]}>{c.valeur(l)}</Text>)}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const indicateurs: [string, string, string | null][] = [
    ['Encaissé', fcfa(i.encaisse), comparaison ? fcfa(comparaison.encaisse) : null],
    ['Attendu', fcfa(i.attendu), comparaison ? fcfa(comparaison.attendu) : null],
    ['Reste à percevoir', fcfa(i.reste_a_percevoir), comparaison ? fcfa(comparaison.reste_a_percevoir) : null],
    ['Taux de recouvrement', pct(i.taux_recouvrement), comparaison ? pct(comparaison.taux_recouvrement) : null],
    ["Taux d'occupation", `${pct(i.taux_occupation)} (${i.logements_occupes} / ${i.logements_total})`, comparaison ? pct(comparaison.taux_occupation) : null],
    ['Délai moyen de paiement', i.delai_moyen_jours == null ? '—' : `${i.delai_moyen_jours} jours`, comparaison?.delai_moyen_jours != null ? `${comparaison.delai_moyen_jours} jours` : null],
    ['Cautions détenues', fcfa(i.cautions_detenues), null],
    ['Prévision du mois suivant', fcfa(i.prevision_mois_suivant), null],
  ];
  const maxMaison = Math.max(1, ...stats.par_maison.map((m) => m.encaisse));

  return (
    <Document title={`Statistiques ${o.periode}`} author={o.espace.nom} creator="Mes Loyers" language="fr">
      <Page size="A4" style={s.page}>
        <View style={s.filigrane} fixed>
          {o.logo ? <Image src={o.logo} style={s.logoFond} /> : <Text style={s.initialesFond}>{initiales}</Text>}
        </View>
        <View style={[s.bande, { backgroundColor: couleur }]} fixed />

        <View style={s.entete}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {o.logo ? <Image src={o.logo} style={s.logo} /> : (
              <View style={[s.logo, { backgroundColor: couleur, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Helvetica-Bold' }}>{initiales}</Text>
              </View>
            )}
            <View>
              <Text style={s.nomEspace}>{o.espace.nom}</Text>
              <Text style={s.coord}>{[o.espace.adresse, o.espace.ville].filter(Boolean).join(', ') || ' '}</Text>
              <Text style={s.coord}>{[o.espace.telephone, o.espace.email].filter(Boolean).join(' · ') || ' '}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.h1}>RAPPORT STATISTIQUE</Text>
            <Text style={s.coord}>Période {o.periode}</Text>
            <Text style={s.coord}>{o.filtres}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Indicateurs clés</Text>
          <View style={s.grille}>
            {indicateurs.map(([libelle, valeur, avant]) => (
              <View key={libelle} style={s.tuile}>
                <Text style={s.tuileLibelle}>{libelle}</Text>
                <Text style={s.tuileValeur}>{valeur}</Text>
                {avant && <Text style={s.tuileAvant}>Période de comparaison : {avant}</Text>}
              </View>
            ))}
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>Encaissé par maison</Text>
          {stats.par_maison.map((m) => (
            <View key={m.maison_id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ width: '28%', fontSize: 9 }}>{m.nom}</Text>
              <View style={{ width: '50%', height: 9, backgroundColor: '#f0efec', borderRadius: 2 }}>
                <View style={{ width: `${(100 * m.encaisse) / maxMaison}%`, height: 9, backgroundColor: '#2a78d6', borderRadius: 2 }} />
              </View>
              <Text style={{ width: '22%', fontSize: 9, textAlign: 'right' }}>{fcfa(m.encaisse)}</Text>
            </View>
          ))}
        </View>

        <Tableau titre="Par maison" lignes={stats.par_maison} colonnes={[
          { titre: 'Maison', largeur: 28, valeur: (m) => m.nom },
          { titre: 'Attendu', largeur: 18, valeur: (m) => fcfa(m.attendu), droite: true },
          { titre: 'Encaissé', largeur: 18, valeur: (m) => fcfa(m.encaisse), droite: true },
          { titre: 'Arriérés', largeur: 16, valeur: (m) => fcfa(m.reste), droite: true },
          { titre: 'Recouvr.', largeur: 10, valeur: (m) => pct(m.recouvrement), droite: true },
          { titre: 'Occupés', largeur: 10, valeur: (m) => `${m.occupes}/${m.logements}`, droite: true },
        ]} />

        <Tableau titre="Par mode de paiement" lignes={stats.par_mode} colonnes={[
          { titre: 'Mode', largeur: 50, valeur: (m) => MODE[m.mode] ?? m.mode },
          { titre: 'Paiements', largeur: 20, valeur: (m) => String(m.nb), droite: true },
          { titre: 'Montant', largeur: 30, valeur: (m) => fcfa(m.montant), droite: true },
        ]} />

        <Tableau titre="Impayés : qui doit combien" lignes={stats.debiteurs} vide="Personne ne doit rien." colonnes={[
          { titre: 'Locataire', largeur: 30, valeur: (d) => d.locataire + (d.parti ? ' (parti)' : '') },
          { titre: 'Logement', largeur: 30, valeur: (d) => `${d.maison} · ${d.logement}` },
          { titre: 'Mois', largeur: 10, valeur: (d) => String(d.nb_mois), droite: true },
          { titre: 'Ancienneté', largeur: 12, valeur: (d) => `${d.jours} j`, droite: true },
          { titre: 'Montant dû', largeur: 18, valeur: (d) => fcfa(d.montant), droite: true },
        ]} />
        <Text style={s.note}>
          Ancienneté des impayés : moins de 30 jours {fcfa(stats.anciennete.moins_30)} · 31 à 60 jours {fcfa(stats.anciennete.de_31_a_60)} · plus de 60 jours {fcfa(stats.anciennete.plus_60)}
        </Text>

        <Tableau titre="Logements libres" lignes={stats.logements_libres} vide="Tous les logements sont occupés." colonnes={[
          { titre: 'Logement', largeur: 45, valeur: (l) => `${l.maison} · ${l.logement}` },
          { titre: 'Libre depuis', largeur: 20, valeur: (l) => (l.libre_depuis ? dayjs(l.libre_depuis).format('DD/MM/YYYY') : 'jamais loué') },
          { titre: 'Jours', largeur: 15, valeur: (l) => String(l.jours), droite: true },
          { titre: 'Loyer estimé', largeur: 20, valeur: (l) => (l.loyer_estime ? fcfa(l.loyer_estime) : '—'), droite: true },
        ]} />
        <Text style={s.note}>Manque à gagner : {fcfa(stats.manque_a_gagner_mois)} par mois. Vacance moyenne : {stats.vacance_moyenne_jours ?? '—'} jours.</Text>

        <Tableau titre="Locataires" lignes={stats.locataires} colonnes={[
          { titre: 'Locataire', largeur: 26, valeur: (l) => l.locataire },
          { titre: 'Logement', largeur: 26, valeur: (l) => `${l.maison} · ${l.logement}` },
          { titre: 'Depuis', largeur: 12, valeur: (l) => dayjs(l.depuis).format('MM/YYYY') },
          { titre: 'Loyer', largeur: 16, valeur: (l) => fcfa(l.loyer), droite: true },
          { titre: 'Ponctualité', largeur: 20, valeur: (l) => PONCTUALITE[l.ponctualite] },
        ]} />

        {stats.gestionnaires.length > 0 && (
          <Tableau titre="Qui a encaissé" lignes={stats.gestionnaires} colonnes={[
            { titre: 'Nom', largeur: 34, valeur: (g) => g.nom ?? '—' },
            { titre: 'Encaissé', largeur: 22, valeur: (g) => fcfa(g.encaisse), droite: true },
            { titre: 'Paiements', largeur: 14, valeur: (g) => String(g.nb_paiements), droite: true },
            { titre: 'Reçus', largeur: 14, valeur: (g) => String(g.recus_emis), droite: true },
            { titre: 'Recouvr.', largeur: 16, valeur: (g) => pct(g.recouvrement), droite: true },
          ]} />
        )}

        <View style={s.pied} fixed>
          <Text>{o.espace.nom} · Rapport généré le {dayjs().format('DD/MM/YYYY à HH:mm')} · {o.domaine}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

const styles = (couleur: string) =>
  StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1f2937', paddingTop: 30, paddingBottom: 50, paddingHorizontal: 32 },
    bande: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
    filigrane: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    logoFond: { width: 300, height: 300, opacity: 0.04, objectFit: 'contain' },
    initialesFond: { fontSize: 200, color: couleur, opacity: 0.04, fontFamily: 'Helvetica-Bold' },
    entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10,
      borderBottomWidth: 1.5, borderBottomColor: couleur, marginBottom: 12 },
    logo: { width: 44, height: 44, objectFit: 'contain', borderRadius: 6 },
    nomEspace: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: couleur },
    coord: { fontSize: 8, color: '#6b7280', marginTop: 2 },
    h1: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', letterSpacing: 0.5 },
    h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: couleur, marginBottom: 6 },
    section: { marginBottom: 12 },
    grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tuile: { width: '23.8%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 6 },
    tuileLibelle: { fontSize: 7.5, color: '#6b7280' },
    tuileValeur: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 2 },
    tuileAvant: { fontSize: 6.5, color: '#6b7280', marginTop: 2 },
    ligne: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
    enteteTableau: { backgroundColor: '#f3f4f6' },
    zebre: { backgroundColor: '#fafafa' },
    cellule: { paddingHorizontal: 3, fontSize: 8.5 },
    gras: { fontFamily: 'Helvetica-Bold' },
    vide: { fontSize: 9, color: '#6b7280' },
    note: { fontSize: 8, color: '#4b5563', marginTop: -6, marginBottom: 12 },
    pied: { position: 'absolute', bottom: 18, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between',
      fontSize: 7.5, color: '#9ca3af', borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 5 },
  });
