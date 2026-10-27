import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { montantEnLettres } from '@/lib/montant-en-lettres';
import type { ContenuRecu } from '@/lib/types';
import { dayjs } from '@/lib/dates';

// Police standard Helvetica (aucun fichier à charger). Les espaces fines insécables n'existant pas
// dans son jeu de caractères, on formate ici avec des espaces simples.
const nombre = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
const fcfa = (n: number) => `${nombre(n)} FCFA`;
const mois = (m: string) => {
  const s = dayjs(m).format('MMMM YYYY');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const MODE: Record<string, string> = {
  especes: 'Espèces', mtn_momo: 'MTN Mobile Money', moov_money: 'Moov Money', celtiis_cash: 'Celtiis Cash',
  virement: 'Virement', cheque: 'Chèque', autre: 'Autre',
};

export interface ImagesRecu {
  logo: string | null;
  cachet: string | null;
  signature: string | null;
  qr: string;
}

export interface OptionsRecu {
  duplicata?: { le: string } | null;
  annule?: boolean;
  supprime?: boolean;
  domaine: string;
}

export function RecuDocument({ c, images, options }: { c: ContenuRecu; images: ImagesRecu; options: OptionsRecu }) {
  const couleur = c.espace.couleur || '#0f766e';
  const s = styles(couleur);
  const titre = c.type === 'loyer' ? 'REÇU DE PAIEMENT DE LOYER'
    : c.type === 'caution' ? 'REÇU DE CAUTION' : 'REÇU DE RESTITUTION DE CAUTION';
  const filigrane = options.annule ? 'ANNULÉ' : options.supprime ? 'SUPPRIMÉ' : options.duplicata ? 'DUPLICATA' : 'PAYÉ';
  const couleurFiligrane = options.annule || options.supprime ? '#d03b3b' : options.duplicata ? '#475569' : '#16a34a';
  const initialesEspace = c.espace.nom.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const gestionnaire = c.encaissant.role === 'gestionnaire';

  return (
    <Document title={`Reçu ${c.numero}`} author={c.espace.nom} creator="Mes Loyers" language="fr">
      <Page size="A4" style={s.page}>
        {/* Filigrane */}
        <View style={s.filigrane} fixed>
          {images.logo ? <Image src={images.logo} style={s.logoFond} /> : <Text style={s.initialesFond}>{initialesEspace}</Text>}
          <Text style={[s.mentionFond, { color: couleurFiligrane, borderColor: couleurFiligrane }]}>{filigrane}</Text>
        </View>

        {/* En-tête */}
        <View style={s.entete}>
          <View style={s.marque}>
            {images.logo ? <Image src={images.logo} style={s.logo} /> : (
              <View style={[s.logo, { backgroundColor: couleur, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: 'white', fontSize: 18, fontFamily: 'Helvetica-Bold' }}>{initialesEspace}</Text>
              </View>
            )}
            <View>
              <Text style={s.nomEspace}>{c.espace.nom}</Text>
              <Text style={s.coord}>{[c.espace.adresse, c.espace.ville].filter(Boolean).join(', ') || ' '}</Text>
              <Text style={s.coord}>{[c.espace.telephone, c.espace.email].filter(Boolean).join(' · ') || ' '}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.petitTitre}>REÇU N°</Text>
            <Text style={s.numero}>{c.numero}</Text>
            <Text style={s.coord}>Émis le {dayjs(c.emis_le).format('DD/MM/YYYY à HH:mm')}</Text>
          </View>
        </View>

        <View style={s.titre}>
          <Text style={s.h1}>{titre}</Text>
          <Text style={[s.sousTitre, options.duplicata ? { color: '#b91c1c', fontFamily: 'Helvetica-Bold' } : {}]}>
            {options.duplicata ? `DUPLICATA — réimprimé le ${dayjs(options.duplicata.le).format('DD/MM/YYYY à HH:mm')}` : 'Original · à conserver précieusement'}
          </Text>
        </View>

        <View style={s.corps}>
          <View style={s.grille}>
            <View style={s.boite}>
              <Text style={s.boiteTitre}>LOGEMENT</Text>
              <Ligne k="Immeuble" v={c.logement.immeuble} />
              <Ligne k="Quartier" v={c.logement.quartier} />
              <Ligne k="Logement" v={c.logement.designation} />
              <Ligne k="Niveau" v={c.logement.niveau} />
              <Ligne k="Réf. contrat" v={c.logement.reference_bail} />
            </View>
            <View style={s.boite}>
              <Text style={s.boiteTitre}>LOCATAIRE & PAYEUR</Text>
              <Ligne k="Locataire" v={c.locataire.nom_complet} />
              <Ligne k="Payé par" v={c.payeur} />
              <Ligne k="Moyen" v={c.mode ? MODE[c.mode] : null} />
              <Ligne k="Réf. transaction" v={c.reference_transaction} />
              <Ligne k="Encaissé par" v={`${c.encaissant.nom}${gestionnaire ? ' (gestionnaire)' : ''}`} />
            </View>
          </View>

          <View style={s.montant}>
            <View style={{ flex: 1 }}>
              <Text style={s.montantLib}>{c.type === 'restitution' ? 'MONTANT RESTITUÉ' : 'MONTANT REÇU'}</Text>
              <Text style={s.montantVal}>{fcfa(c.montant)}</Text>
              <Text style={s.lettres}>{montantEnLettres(c.montant)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', maxWidth: 240 }}>
              {c.type === 'loyer' ? (
                <>
                  <Text style={s.montantLib}>PÉRIODE PAYÉE · {c.nb_mois} MOIS</Text>
                  <View style={s.pastilles}>
                    {c.mois.map((m) => <Text key={m} style={s.pastille}>{mois(m)}</Text>)}
                  </View>
                </>
              ) : (
                <Text style={s.montantLib}>{c.caution?.mouvement === 'retenue' ? 'RETENUE SUR CAUTION' : c.type === 'caution' ? 'CAUTION' : 'REMBOURSEMENT'}</Text>
              )}
              <Text style={s.lettres}>Date du paiement : {dayjs(c.date_paiement).format('dddd D MMMM YYYY')}</Text>
            </View>
          </View>

          {c.remise > 0 && (
            <Text style={s.remise}>Remise accordée : {fcfa(c.remise)}{c.motif_remise ? ` (${c.motif_remise})` : ''}</Text>
          )}

          {c.type === 'loyer' ? (
            <View style={s.situation}>
              <Text>
                Situation après ce paiement : loyers payés jusqu'à {c.situation.paye_jusqua ? mois(c.situation.paye_jusqua).toLowerCase() : '—'}.
                {c.situation.montant_du > 0
                  ? ` Reste dû : ${c.situation.nb_mois_dus} mois, soit ${fcfa(c.situation.montant_du)}.`
                  : ' Le locataire est à jour.'}
              </Text>
            </View>
          ) : c.caution && (
            <View style={s.situation}>
              <Text>
                {c.caution.motif ? `Motif : ${c.caution.motif}. ` : ''}Caution détenue après cette opération : {fcfa(c.caution.solde)}.
              </Text>
            </View>
          )}

          <View style={s.signatures}>
            <View style={s.signature}>
              <View style={{ height: 70 }} />
              <Text style={s.signLib}>Signature du payeur</Text>
            </View>
            <View style={s.signature}>
              <View style={{ height: 70, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
                {images.cachet && <Image src={images.cachet} style={s.cachet} />}
                {images.signature && <Image src={images.signature} style={s.imgSignature} />}
              </View>
              <Text style={s.signLib}>{gestionnaire ? `Le Gestionnaire — ${c.encaissant.nom}` : 'Le Propriétaire'}</Text>
            </View>
            <View style={s.qr}>
              <Image src={images.qr} style={{ width: 86, height: 86 }} />
              <Text style={s.qrLib}>Scannez pour vérifier{'\n'}l'authenticité</Text>
            </View>
          </View>
        </View>

        <View style={s.pied} fixed>
          <Text style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: '#374151' }}>NB : conservez précieusement ce reçu. </Text>
            Tout duplicata portera la mention « DUPLICATA ». Authenticité vérifiable sur {options.domaine}/v avec le QR code.
          </Text>
          <Text style={{ textAlign: 'right' }}>
            Généré par Mes Loyers{'\n'}{dayjs().format('DD/MM/YYYY HH:mm')} · Page 1/1
          </Text>
        </View>
        <View style={[s.bande, { backgroundColor: couleur }]} fixed />
      </Page>
    </Document>
  );
}

function Ligne({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 }}>
      <Text style={{ color: '#6b7280' }}>{k}</Text>
      <Text style={{ fontFamily: 'Helvetica-Bold', maxWidth: 150, textAlign: 'right' }}>{v || '—'}</Text>
    </View>
  );
}

const styles = (couleur: string) =>
  StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937', paddingBottom: 70 },
    filigrane: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    logoFond: { width: 300, height: 300, opacity: 0.05, objectFit: 'contain' },
    initialesFond: { fontSize: 200, color: couleur, opacity: 0.05, fontFamily: 'Helvetica-Bold' },
    mentionFond: {
      position: 'absolute', fontSize: 84, fontFamily: 'Helvetica-Bold', opacity: 0.09, transform: 'rotate(-28deg)',
      borderWidth: 8, borderRadius: 16, paddingHorizontal: 20, letterSpacing: 8,
    },
    entete: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 34, paddingTop: 28,
      paddingBottom: 16, borderBottomWidth: 4, borderBottomColor: couleur,
    },
    marque: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo: { width: 56, height: 56, borderRadius: 12, objectFit: 'contain' },
    nomEspace: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: couleur },
    coord: { fontSize: 9, color: '#6b7280', marginTop: 2 },
    petitTitre: { fontSize: 9, color: '#6b7280', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold' },
    numero: { fontSize: 15, fontFamily: 'Courier-Bold', color: '#111827', marginTop: 2 },
    titre: { alignItems: 'center', paddingTop: 18, paddingBottom: 6 },
    h1: { fontSize: 17, fontFamily: 'Helvetica-Bold', letterSpacing: 2, color: '#111827' },
    sousTitre: { fontSize: 9, color: '#6b7280', marginTop: 4 },
    corps: { paddingHorizontal: 34 },
    grille: { flexDirection: 'row', gap: 12, marginTop: 12 },
    boite: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 11, backgroundColor: 'rgba(255,255,255,0.85)' },
    boiteTitre: { fontSize: 8.5, letterSpacing: 1.5, color: couleur, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
    montant: {
      marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: couleur, padding: 14, flexDirection: 'row',
      justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(240,253,250,0.6)',
    },
    montantLib: { fontSize: 8.5, letterSpacing: 1.2, fontFamily: 'Helvetica-Bold', color: '#374151' },
    montantVal: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: couleur, marginTop: 2 },
    lettres: { fontSize: 9, fontFamily: 'Helvetica-Oblique', color: '#374151', marginTop: 3 },
    pastilles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
    pastille: { fontSize: 9, backgroundColor: couleur, color: 'white', paddingVertical: 2.5, paddingHorizontal: 8, borderRadius: 9 },
    remise: { marginTop: 8, fontSize: 9.5, color: '#374151' },
    situation: {
      marginTop: 12, fontSize: 10, borderLeftWidth: 4, borderLeftColor: '#f59e0b', backgroundColor: '#fffbeb', padding: 9,
      lineHeight: 1.5,
    },
    signatures: { flexDirection: 'row', gap: 12, marginTop: 20, alignItems: 'flex-end' },
    signature: { flex: 1 },
    signLib: { borderTopWidth: 1, borderTopColor: '#9ca3af', paddingTop: 5, fontSize: 9, color: '#6b7280', textAlign: 'center' },
    imgSignature: { height: 52, maxWidth: 160, objectFit: 'contain' },
    cachet: { position: 'absolute', height: 74, width: 74, opacity: 0.85, objectFit: 'contain', bottom: -4 },
    qr: { width: 110, alignItems: 'center' },
    qrLib: { fontSize: 8, color: '#6b7280', textAlign: 'center', marginTop: 3 },
    pied: {
      position: 'absolute', bottom: 8, left: 34, right: 34, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10,
      fontSize: 8, color: '#6b7280', lineHeight: 1.5, flexDirection: 'row', gap: 16,
    },
    bande: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 6 },
  });
