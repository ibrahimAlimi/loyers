import {
  IconAlertTriangle, IconArrowDown, IconArrowUp, IconBrandWhatsapp, IconBuildingEstate, IconCash, IconChartBar,
  IconCheck, IconDeviceMobile, IconDots, IconDownload, IconFileTypePdf, IconHome, IconPhoto, IconPlus, IconPrinter,
  IconReceipt, IconRestore, IconSchool, IconSettings, IconShare, IconSignature, IconTrash, IconUserPlus, IconUsers,
  IconUsersGroup, IconPencil, IconArrowUpRight,
} from '@tabler/icons-react';
import { Button, Switch } from '@mantine/core';
import type { Demo } from './LecteurDemo';
import {
  Badge, Bouton, Bulle, Card, Champ, Chiffre, Ecran, Group, Icone, Ligne, Retard, SimpleGrid, Stack, Text, Tuile,
} from './scenes';

const accueil = (
  <Ecran titre="Immobilier Démo" perso>
    <Text fw={800}>Bonjour Ibrahim 👋</Text>
    <SimpleGrid cols={2} spacing="xs">
      <Chiffre libelle="Encaissé ce mois" valeur="420 000 FCFA" couleur="espace" />
      <Chiffre libelle="Reste à percevoir" valeur="140 000 FCFA" couleur="orange.8" />
    </SimpleGrid>
    <SimpleGrid cols={2} spacing="xs">
      <div style={{ gridColumn: 'span 2' }}><Tuile id="encaisser" icone={IconCash} libelle="Encaisser un loyer" principale /></div>
      <Tuile id="locataires" icone={IconUsers} libelle="Locataires" />
      <Tuile id="maisons" icone={IconBuildingEstate} libelle="Maisons" />
      <Tuile id="recus" icone={IconReceipt} libelle="Reçus" />
      <Tuile id="statistiques" icone={IconChartBar} libelle="Statistiques" />
    </SimpleGrid>
  </Ecran>
);

const listeRecus = (avecRecherche?: string) => (
  <Ecran titre="Reçus" perso>
    <Champ id="recherche" label="Chercher" valeur={avecRecherche} indice="Numéro de reçu ou nom du locataire" />
    <Ligne titre="Koffi Houngbo" sous="DEM-2026-000124 · Octobre 2026"
      droite={<Group gap={4}><Text fw={700} size="sm">70 000 FCFA</Text><Bouton id="whatsapp" variant="light" couleur="green" icone={IconBrandWhatsapp}>{''}</Bouton><Bouton id="points" variant="subtle" icone={IconDots}>{''}</Bouton></Group>} />
    {!avecRecherche && (
      <>
        <Ligne titre="Awa Sanni" sous="DEM-2026-000123 · Octobre 2026" droite={<Text fw={700} size="sm">45 000 FCFA</Text>} />
        <Ligne titre="Jean Dossou" sous="DEM-2026-000122 · Septembre 2026" droite={<Text fw={700} size="sm">25 000 FCFA</Text>} />
      </>
    )}
  </Ecran>
);

const maisonDetail = (logements: { nom: string; libre: boolean }[], bouton = true) => (
  <Ecran titre="Résidence Arouna" retour perso>
    {bouton && <Bouton id="ajouter-logement" icone={IconPlus}>Ajouter un logement</Bouton>}
    {logements.map((l, n) => (
      <Ligne key={l.nom} titre={l.nom} sous="Chambre-salon · 45 000 FCFA"
        droite={l.libre ? <Group gap={4}><Badge variant="outline" color="gray">Libre</Badge><Bouton id={n === 0 ? 'louer' : undefined} variant="light">Louer</Bouton></Group> : <Text size="sm" fw={600}>Awa Sanni</Text>} />
    ))}
  </Ecran>
);

export const DEMOS: Demo[] = [
  {
    id: 'encaisser', titre: 'Encaisser un loyer', description: 'Du choix du locataire jusqu’au reçu.', icone: IconCash, personnaliser: true,
    scenes: {
      accueil: () => accueil,
      choix: () => (
        <Ecran titre="Encaisser · 1/4">
          <Text fw={700}>Quel locataire ?</Text>
          <Ligne id="locataire" titre="Koffi Houngbo" sous="Résidence Arouna · En bas à droite N°2" droite={<Retard mois={2} />} />
          <Ligne titre="Awa Sanni" sous="Résidence Arouna · Chambre 4" droite={<Retard mois={1} />} />
          <Ligne titre="Jean Dossou" sous="Villa Gbégamey · Boutique" droite={<Retard mois={0} />} />
        </Ecran>
      ),
      montant: (e) => (
        <Ecran titre="Encaisser · 2/4">
          <Text fw={700}>Koffi Houngbo doit 140 000 FCFA (2 mois)</Text>
          <Champ id="montant" label="Montant reçu (FCFA)" valeur={String(e.montant ?? '')} />
          <Group gap={6}><Badge size="lg" variant="light">Septembre 2026</Badge><Badge size="lg" variant="outline" color="gray">Octobre 2026</Badge></Group>
        </Ecran>
      ),
      mode: (e) => (
        <Ecran titre="Encaisser · 3/4">
          <Text fw={700}>Comment a-t-il payé ?</Text>
          <SimpleGrid cols={2} spacing="xs">
            {[['especes', 'Espèces'], ['mtn', 'MTN Mobile Money'], ['moov', 'Moov Money'], ['celtiis', 'Celtiis Cash']].map(([id, l]) => (
              <Bouton key={id} id={id} variant={e.mode === id ? 'filled' : 'default'}>{l}</Bouton>
            ))}
          </SimpleGrid>
          {e.mode === 'mtn' && <Champ label="Référence de la transaction (facultatif)" valeur="MP261005.1042.A77" />}
        </Ecran>
      ),
      resume: () => (
        <Ecran titre="Encaisser · 4/4">
          <Card withBorder radius="md">
            <Stack gap={4}>
              <Text size="sm">Locataire : <b>Koffi Houngbo</b></Text>
              <Text size="sm">Montant : <b>70 000 FCFA</b></Text>
              <Text size="sm">Mois payé : <b>Septembre 2026</b></Text>
              <Text size="sm">Mode : <b>MTN Mobile Money</b></Text>
              <Text size="sm" c="orange.8">Il restera 70 000 FCFA (octobre).</Text>
            </Stack>
          </Card>
          <Bouton id="valider" plein icone={IconCheck}>Valider l’encaissement</Bouton>
        </Ecran>
      ),
      recu: () => (
        <Ecran titre="Reçu prêt">
          <Stack align="center" gap="xs" mt="md">
            <Text size="40px">✅</Text>
            <Text fw={800}>Reçu N° DEM-2026-000124</Text>
            <Text size="sm" c="dimmed">70 000 FCFA · Septembre 2026</Text>
          </Stack>
          <Bouton id="envoyer" couleur="green" plein icone={IconBrandWhatsapp}>Envoyer sur WhatsApp</Bouton>
          <Bouton variant="default" plein icone={IconPrinter}>Imprimer</Bouton>
        </Ecran>
      ),
    },
    etapes: [
      { scene: 'accueil', doigt: 'encaisser', geste: 'toucher' },
      { scene: 'choix', doigt: 'locataire', geste: 'toucher' },
      { scene: 'montant', doigt: 'montant', geste: 'montrer', etat: { montant: '70 000' } },
      { scene: 'mode', doigt: 'mtn', geste: 'toucher', etat: { mode: 'mtn' } },
      { scene: 'resume', doigt: 'valider', geste: 'toucher' },
      { scene: 'recu', doigt: 'envoyer', geste: 'montrer' },
    ],
  },
  {
    id: 'recu_whatsapp', titre: 'Envoyer un reçu sur WhatsApp', description: 'Image ou PDF, avec un message déjà écrit.', icone: IconBrandWhatsapp, personnaliser: true,
    scenes: {
      accueil: () => accueil,
      liste: (e) => listeRecus(e.recherche as string | undefined),
      format: () => (
        <Ecran titre="Envoyer le reçu">
          <Text fw={700}>Sous quelle forme ?</Text>
          <Bouton id="image" plein icone={IconPhoto}>En image (conseillé sur téléphone)</Bouton>
          <Bouton variant="default" plein icone={IconFileTypePdf}>En PDF</Bouton>
        </Ecran>
      ),
      whatsapp: () => (
        <Stack h="100%" gap="xs" p="sm" style={{ background: '#efeae2' }}>
          <Group h={40} px="xs" bg="#075e54" c="white" style={{ borderRadius: 8 }}><Text fw={700} size="sm">Koffi Houngbo</Text></Group>
          <Bulle droite><Text size="xs">🧾 Recu-DEM-2026-000124.jpg</Text></Bulle>
          <Bulle droite><Text size="sm">Bonjour Koffi, voici votre reçu de loyer N° DEM-2026-000124 pour septembre 2026. Merci.</Text></Bulle>
          <Group justify="flex-end" mt="auto"><Bouton id="envoyer" couleur="green">Envoyer</Bouton></Group>
        </Stack>
      ),
    },
    etapes: [
      { scene: 'accueil', doigt: 'recus', geste: 'toucher' },
      { scene: 'liste', doigt: 'recherche', geste: 'montrer', etat: { recherche: 'Koffi' } },
      { scene: 'liste', doigt: 'whatsapp', geste: 'toucher', etat: { recherche: 'Koffi' } },
      { scene: 'format', doigt: 'image', geste: 'toucher' },
      { scene: 'whatsapp', doigt: 'envoyer', geste: 'montrer' },
    ],
  },
  {
    id: 'reimprimer', titre: 'Réimprimer un reçu', description: 'Le duplicata, daté, sans toucher à l’original.', icone: IconPrinter, personnaliser: true,
    scenes: {
      liste: () => listeRecus('Koffi'),
      menu: () => (
        <Ecran titre="Reçus">
          <Ligne titre="Koffi Houngbo" sous="DEM-2026-000124 · Octobre 2026" droite={<Text fw={700} size="sm">70 000 FCFA</Text>} />
          <Card withBorder shadow="md" radius="md" p={4} ml="auto" w={200}>
            <Stack gap={2}>
              <Bouton variant="subtle">Voir</Bouton>
              <Bouton id="imprimer" variant="subtle" icone={IconPrinter}>Imprimer</Bouton>
              <Bouton variant="subtle" icone={IconDownload}>Télécharger</Bouton>
            </Stack>
          </Card>
        </Ecran>
      ),
      duplicata: () => (
        <Ecran titre="Aperçu">
          <Card withBorder radius="md" style={{ position: 'relative', overflow: 'hidden' }}>
            <Text fw={800} c="espace">Immobilier Démo</Text>
            <Text size="xs">REÇU N° DEM-2026-000124</Text>
            <Text size="xs" c="red.8" fw={700} id="d">DUPLICATA, réimprimé le 27/10/2026 à 10:42</Text>
            <Text size="sm" mt="xs">Reçu de M. Koffi Houngbo la somme de 70 000 FCFA…</Text>
            <Text data-demo="filigrane" fw={900} size="34px" c="gray.5" ta="center" mt="md" style={{ transform: 'rotate(-18deg)', border: '3px solid', borderRadius: 8 }}>DUPLICATA</Text>
          </Card>
        </Ecran>
      ),
      notif: () => (
        <Ecran titre="Notifications">
          <Card data-demo="notif" withBorder radius="md" bg="var(--mantine-color-espace-light)">
            <Text fw={700} size="sm">Duplicata du reçu N° DEM-2026-000124 imprimé par Sylvie</Text>
            <Text size="xs" c="dimmed">Koffi Houngbo · 70 000 FCFA · à l’instant</Text>
          </Card>
        </Ecran>
      ),
    },
    etapes: [
      { scene: 'liste', doigt: 'recherche', geste: 'montrer' },
      { scene: 'menu', doigt: 'imprimer', geste: 'toucher' },
      { scene: 'duplicata', doigt: 'filigrane', geste: 'montrer' },
      { scene: 'notif', doigt: 'notif', geste: 'montrer' },
    ],
  },
  {
    id: 'maison_logements', titre: 'Ajouter une maison et ses logements', description: 'La maison, puis chaque chambre ou boutique.', icone: IconBuildingEstate, personnaliser: true,
    scenes: {
      maisons: () => (
        <Ecran titre="Maisons" perso>
          <Bouton id="ajouter-maison" icone={IconPlus}>Ajouter une maison</Bouton>
          <Card withBorder radius="md"><Text fw={800}>Villa Gbégamey</Text><Text size="xs" c="dimmed">3 / 3 occupés · Cotonou</Text></Card>
        </Ecran>
      ),
      formMaison: () => (
        <Ecran titre="Nouvelle maison">
          <Champ label="Nom de la maison" valeur="Résidence Arouna" />
          <Champ label="Quartier" valeur="Gbégamey" />
          <Champ label="Ville" valeur="Cotonou" />
          <Bouton id="enregistrer" plein>Enregistrer</Bouton>
        </Ecran>
      ),
      vide: () => maisonDetail([]),
      formLogement: () => (
        <Ecran titre="Nouveau logement">
          <Champ id="type" label="Type" valeur="Chambre-salon" />
          <Champ label="Désignation" valeur="Chambre 4, à l’étage" />
          <Champ label="Loyer habituel (FCFA)" valeur="45 000" />
          <Bouton plein>Enregistrer</Bouton>
        </Ecran>
      ),
      plein: () => maisonDetail([{ nom: 'Chambre 4, à l’étage', libre: true }, { nom: 'Chambre 5', libre: true }, { nom: 'Boutique', libre: false }], false),
    },
    etapes: [
      { scene: 'maisons', doigt: 'ajouter-maison', geste: 'toucher' },
      { scene: 'formMaison', doigt: 'enregistrer', geste: 'toucher' },
      { scene: 'vide', doigt: 'ajouter-logement', geste: 'toucher' },
      { scene: 'formLogement', doigt: 'type', geste: 'montrer' },
      { scene: 'plein', doigt: 'louer', geste: 'montrer' },
    ],
  },
  {
    id: 'locataire_bail', titre: 'Ajouter un locataire et son bail', description: 'Installer un locataire dans un logement libre.', icone: IconUserPlus, personnaliser: true,
    scenes: {
      maison: () => maisonDetail([{ nom: 'Chambre 4, à l’étage', libre: true }, { nom: 'Boutique', libre: false }], false),
      locataire: () => (
        <Ecran titre="Louer · Chambre 4">
          <Champ id="nom" label="Nom" valeur="Houngbo" />
          <Champ label="Prénoms" valeur="Koffi" />
          <Champ label="Téléphone" valeur="97 00 00 00" />
        </Ecran>
      ),
      bail: () => (
        <Ecran titre="Louer · Chambre 4">
          <Champ id="debut" label="Date d’entrée" valeur="01/11/2026" />
          <Champ label="Loyer mensuel (FCFA)" valeur="45 000" />
          <Champ label="Premier mois (facultatif)" valeur="30 000" />
        </Ecran>
      ),
      caution: () => (
        <Ecran titre="Louer · Chambre 4">
          <Champ id="caution" label="Caution (FCFA)" valeur="90 000" />
          <Bouton id="enregistrer" plein>Enregistrer</Bouton>
        </Ecran>
      ),
      liste: () => (
        <Ecran titre="Locataires" perso>
          <Ligne id="nouveau" titre="Houngbo Koffi" sous="Résidence Arouna · Chambre 4" droite={<Retard mois={0} />} />
          <Ligne titre="Sanni Awa" sous="Résidence Arouna · Boutique" droite={<Retard mois={1} />} />
        </Ecran>
      ),
    },
    etapes: [
      { scene: 'maison', doigt: 'louer', geste: 'toucher' },
      { scene: 'locataire', doigt: 'nom', geste: 'montrer' },
      { scene: 'bail', doigt: 'debut', geste: 'montrer' },
      { scene: 'caution', doigt: 'caution', geste: 'montrer' },
      { scene: 'liste', doigt: 'nouveau', geste: 'montrer' },
    ],
  },
  {
    id: 'lire_chiffres', titre: 'Lire mes chiffres', description: 'Encaissé, reste à percevoir, comparaison, relances.', icone: IconChartBar, personnaliser: true,
    scenes: {
      stats: () => (
        <Ecran titre="Statistiques" perso>
          <Group gap="xs" wrap="nowrap">
            <Champ id="periode" label="Période" valeur="Cette année" />
            <Bouton id="exporter" variant="light" icone={IconDownload}>Exporter</Bouton>
          </Group>
          <SimpleGrid cols={2} spacing="xs">
            <Chiffre id="encaisse" libelle="💰 Encaissé" valeur="3 150 000 FCFA" couleur="espace"
              ecart={<Group gap={2} data-demo="ecart"><IconArrowUpRight size={14} color="var(--statut-ok)" /><Text size="xs" fw={700} style={{ color: 'var(--statut-ok)' }}>+12 %</Text></Group>} />
            <Chiffre libelle="⏳ Reste à percevoir" valeur="140 000 FCFA" couleur="orange.8" />
          </SimpleGrid>
          <Text fw={700} size="sm">Qui doit combien</Text>
          <Ligne titre="Koffi Houngbo" sous="2 mois · 140 000 FCFA"
            droite={<Bouton id="relancer" variant="light" couleur="green" icone={IconBrandWhatsapp}>Relancer</Bouton>} />
        </Ecran>
      ),
    },
    etapes: [
      { scene: 'stats', doigt: 'periode', geste: 'montrer' },
      { scene: 'stats', doigt: 'periode', geste: 'toucher' },
      { scene: 'stats', doigt: 'encaisse', geste: 'montrer' },
      { scene: 'stats', doigt: 'ecart', geste: 'montrer' },
      { scene: 'stats', doigt: 'relancer', geste: 'toucher' },
      { scene: 'stats', doigt: 'exporter', geste: 'montrer' },
    ],
  },
  {
    id: 'personnaliser', titre: 'Choisir ce que je vois à l’écran', description: 'Afficher, masquer, changer l’ordre.', icone: IconPencil,
    scenes: {
      page: () => accueil,
      fenetre: (e) => (
        <Ecran titre="Choisir ce que je vois">
          <Text size="xs" c="dimmed">Ce choix vaut pour votre téléphone.</Text>
          {[['chiffres', 'Les chiffres du mois'], ['non_recus', 'Loyers non reçus'], ['derniers', 'Derniers reçus']].map(([id, l], n) => (
            <Card key={id} withBorder radius="md" p={6}>
              <Group justify="space-between" wrap="nowrap">
                <Switch data-demo={`sw-${id}`} label={l} checked={!(e.masque === id)} readOnly />
                <Group gap={2}>
                  <Bouton id={n === 2 ? 'monter' : undefined} variant="subtle" icone={IconArrowUp}>{''}</Bouton>
                  <Bouton variant="subtle" icone={IconArrowDown}>{''}</Bouton>
                </Group>
              </Group>
            </Card>
          ))}
          <Group justify="space-between">
            <Bouton id="defaut" variant="subtle">Revenir au choix par défaut</Bouton>
            <Bouton>Enregistrer</Bouton>
          </Group>
        </Ecran>
      ),
    },
    etapes: [
      { scene: 'page', doigt: 'personnaliser', geste: 'toucher' },
      { scene: 'fenetre', doigt: 'sw-derniers', geste: 'toucher', etat: { masque: 'derniers' } },
      { scene: 'fenetre', doigt: 'monter', geste: 'toucher', etat: { masque: 'derniers' } },
      { scene: 'fenetre', geste: 'montrer', etat: { masque: 'derniers' } },
      { scene: 'fenetre', doigt: 'defaut', geste: 'montrer' },
    ],
  },
  {
    id: 'identite', titre: 'Personnaliser mon espace', description: 'Logo, couleurs, icônes, signature, cachet.', icone: IconSettings,
    scenes: {
      parametres: () => (
        <Ecran titre="Paramètres">
          <Group gap={4}>
            <Badge size="lg" variant="outline">Informations</Badge>
            <Badge data-demo="onglet" size="lg">Logo et couleur</Badge>
            <Badge data-demo="onglet-signature" size="lg" variant="outline">Signature et cachet</Badge>
          </Group>
          <Text size="sm">Choisissez une couleur :</Text>
          <Group data-demo="couleurs" gap={6}>
            {['#0f766e', '#1d4ed8', '#7c2d12', '#9f1239', '#6d28d9', '#15803d'].map((c) => <div key={c} style={{ width: 34, height: 26, borderRadius: 6, background: c }} />)}
          </Group>
          <Card withBorder radius="md" p="xs">
            <Text size="xs" c="dimmed">Aperçu en direct</Text>
            <Group gap={6} mt={4}><IconHome size={18} color="#1d4ed8" /><Text fw={800} c="#1d4ed8">Immobilier Démo</Text></Group>
            <Button mt={6} size="xs" color="#1d4ed8">Encaisser un loyer</Button>
          </Card>
          <Text size="sm">Icônes du menu :</Text>
          <Group data-demo="icones" gap="xs">
            <IconUsers /><IconBuildingEstate /><IconReceipt /><IconChartBar />
          </Group>
        </Ecran>
      ),
      signature: () => (
        <Ecran titre="Paramètres">
          <Text fw={700}>Signature du propriétaire</Text>
          <Card data-demo="pad" withBorder radius="md" h={120} style={{ display: 'grid', placeItems: 'center' }}>
            <Text size="28px" style={{ fontFamily: 'cursive' }}>I. Alimi</Text>
          </Card>
          <Group gap="xs"><Bouton variant="light" icone={IconSignature}>Valider</Bouton><Bouton variant="default" icone={IconPhoto}>Envoyer une photo</Bouton></Group>
        </Ecran>
      ),
      facultatif: () => (
        <Ecran titre="Paramètres">
          <Card data-demo="note" withBorder radius="md" bg="gray.0">
            <Text size="sm">✔ Logo, signature et cachet sont <b>facultatifs</b>.</Text>
            <Text size="sm" mt={4}>Vous pouvez les ajouter, les changer ou les retirer quand vous voulez.</Text>
          </Card>
        </Ecran>
      ),
    },
    etapes: [
      { scene: 'parametres', doigt: 'onglet', geste: 'toucher' },
      { scene: 'parametres', doigt: 'couleurs', geste: 'toucher' },
      { scene: 'parametres', doigt: 'icones', geste: 'montrer' },
      { scene: 'signature', doigt: 'pad', geste: 'montrer' },
      { scene: 'facultatif', doigt: 'note', geste: 'montrer' },
    ],
  },
  {
    id: 'gestionnaires', titre: 'Gérer mes gestionnaires', description: 'Créer un compte et lui confier des maisons.', icone: IconUsersGroup,
    scenes: {
      intro: () => (
        <Ecran titre="Comptes">
          <Card data-demo="intro" withBorder radius="md"><Text size="sm">👤 <b>Sylvie</b>, gestionnaire : Résidence Arouna</Text></Card>
          <Bouton id="ajouter" icone={IconUserPlus}>Ajouter un compte</Bouton>
        </Ecran>
      ),
      form: () => (
        <Ecran titre="Nouveau compte">
          <Champ label="Nom complet" valeur="Sylvie Agossou" />
          <Champ id="role" label="Rôle" valeur="Gestionnaire" />
          <Champ label="Identifiant" valeur="sylvie" />
          <Champ label="Mot de passe provisoire" valeur="••••••••" />
        </Ecran>
      ),
      maison: () => (
        <Ecran titre="Modifier la maison">
          <Champ label="Nom" valeur="Résidence Arouna" />
          <Champ id="gestionnaire" label="Gestionnaire" valeur="Sylvie Agossou" />
          <Bouton plein>Enregistrer</Bouton>
        </Ecran>
      ),
      notif: () => (
        <Ecran titre="Notifications">
          <Card data-demo="notif" withBorder radius="md" bg="var(--mantine-color-espace-light)">
            <Text fw={700} size="sm">Paiement encaissé par Sylvie Agossou</Text>
            <Text size="xs" c="dimmed">45 000 FCFA de Awa Sanni (Résidence Arouna · Chambre 4)</Text>
          </Card>
          <Card withBorder radius="md">
            <Text fw={700} size="sm">Demande d’annulation d’un paiement par Sylvie</Text>
            <Group gap="xs" mt={6}><Bouton variant="light" couleur="green">Accepter</Bouton><Bouton variant="light" couleur="red">Refuser</Bouton></Group>
          </Card>
        </Ecran>
      ),
    },
    etapes: [
      { scene: 'intro', doigt: 'intro', geste: 'montrer' },
      { scene: 'intro', doigt: 'ajouter', geste: 'toucher' },
      { scene: 'form', doigt: 'role', geste: 'montrer' },
      { scene: 'maison', doigt: 'gestionnaire', geste: 'montrer' },
      { scene: 'notif', doigt: 'notif', geste: 'montrer' },
    ],
  },
  {
    id: 'corbeille', titre: 'La Corbeille', description: 'Rien n’est perdu par erreur.', icone: IconTrash,
    scenes: {
      fiche: () => (
        <Ecran titre="Koffi Houngbo" retour>
          <Card withBorder shadow="md" radius="md" p={4} ml="auto" w={230}>
            <Stack gap={2}>
              <Bouton variant="subtle">Modifier les informations</Bouton>
              <Bouton id="corbeille" variant="subtle" couleur="red" icone={IconTrash}>Mettre à la corbeille</Bouton>
            </Stack>
          </Card>
        </Ecran>
      ),
      confirmation: () => (
        <Ecran titre="Mettre à la corbeille ?">
          <Card data-demo="impact" withBorder radius="md" bg="orange.0">
            <Group gap={6}><IconAlertTriangle size={18} color="var(--statut-retard)" /><Text fw={700} size="sm">Ce qui sera touché</Text></Group>
            <Text size="sm">1 locataire, 1 bail, 12 paiements, 12 reçus.</Text>
            <Text size="sm">Vous pourrez tout restaurer depuis la Corbeille.</Text>
          </Card>
          <Group justify="flex-end"><Bouton variant="default">Annuler</Bouton><Bouton couleur="red">Mettre à la corbeille</Bouton></Group>
        </Ecran>
      ),
      corbeille: () => (
        <Ecran titre="Corbeille">
          <Ligne titre="Koffi Houngbo" sous="Locataire · 26 éléments · aujourd’hui"
            droite={<Bouton id="restaurer" variant="light" icone={IconRestore}>Restaurer</Bouton>} />
        </Ecran>
      ),
      admin: () => (
        <Ecran titre="Corbeille">
          <Card data-demo="admin" withBorder radius="md" bg="red.0">
            <Text size="sm">🔒 La suppression définitive est réservée à l’administrateur, avec une confirmation renforcée.</Text>
          </Card>
        </Ecran>
      ),
    },
    etapes: [
      { scene: 'fiche', doigt: 'corbeille', geste: 'toucher' },
      { scene: 'confirmation', doigt: 'impact', geste: 'montrer' },
      { scene: 'corbeille', doigt: 'restaurer', geste: 'toucher' },
      { scene: 'admin', doigt: 'admin', geste: 'montrer' },
    ],
  },
  {
    id: 'installer', titre: 'Installer l’application', description: 'Une icône sur l’écran d’accueil du téléphone.', icone: IconDeviceMobile,
    scenes: {
      intro: () => (
        <Stack h="100%" align="center" justify="center" p="md" bg="white">
          <Text size="48px">📲</Text>
          <Text fw={800} ta="center" data-demo="intro">Mes Loyers, comme une vraie application</Text>
        </Stack>
      ),
      android: () => (
        <Stack h="100%" gap={0} bg="white">
          <Group h={44} px="sm" justify="space-between" bg="gray.1">
            <Text size="xs" c="dimmed">loyers-5wk.pages.dev</Text>
            <IconDots data-demo="points" size={22} />
          </Group>
          <Card withBorder shadow="md" radius="md" p={4} ml="auto" mr="xs" mt={4} w={230}>
            <Stack gap={2}>
              <Bouton variant="subtle">Nouvel onglet</Bouton>
              <Bouton id="ajouter" variant="subtle" icone={IconPlus}>Ajouter à l’écran d’accueil</Bouton>
            </Stack>
          </Card>
        </Stack>
      ),
      iphone: () => (
        <Stack h="100%" gap={0} bg="white" justify="space-between">
          <Group h={44} px="sm" justify="center" bg="gray.1"><Text size="xs" c="dimmed">loyers-5wk.pages.dev</Text></Group>
          <Card withBorder radius="md" m="xs">
            <Bouton id="ecran-accueil" variant="subtle" icone={IconPlus}>Sur l’écran d’accueil</Bouton>
          </Card>
          <Group h={50} justify="center" bg="gray.1"><IconShare data-demo="partager" size={26} color="#1d4ed8" /></Group>
        </Stack>
      ),
      ecran: () => (
        <SimpleGrid cols={4} p="md" h="100%" style={{ background: 'linear-gradient(160deg,#1e3a8a,#0f766e)', alignContent: 'start' }}>
          <Icone icone={IconPhoto} couleur="pink" libelle="Photos" />
          <Icone icone={IconBrandWhatsapp} couleur="green" libelle="WhatsApp" />
          <Icone icone={IconSchool} couleur="orange" libelle="École" />
          <Icone id="icone" icone={IconHome} libelle="Loyers" />
        </SimpleGrid>
      ),
    },
    etapes: [
      { scene: 'intro', doigt: 'intro', geste: 'montrer' },
      { scene: 'android', doigt: 'ajouter', geste: 'toucher' },
      { scene: 'iphone', doigt: 'ecran-accueil', geste: 'toucher' },
      { scene: 'ecran', doigt: 'icone', geste: 'toucher' },
    ],
  },
];

export const demo = (id: string) => DEMOS.find((d) => d.id === id);
