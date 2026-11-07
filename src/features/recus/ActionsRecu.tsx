import { useEffect, useState } from 'react';
import {
  ActionIcon, Alert, Button, Center, Group, Image, Loader, Modal, SimpleGrid, Stack, Text, Textarea, Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBrandWhatsapp, IconFileTypePdf, IconPhoto, IconPrinter, IconReceipt } from '@tabler/icons-react';
import { messageErreur, notifierErreur } from '@/lib/erreurs';
import type { Recu } from '@/lib/types';
import { envoyerSurWhatsApp, fichierRecu, imprimerRecu, messageWhatsApp, telechargerRecu, type EtatRecu } from './partager';

/**
 * Aperçu du reçu (en image) avec ses actions : envoyer sur WhatsApp, imprimer, télécharger en PDF ou en image.
 * L'image est préparée à l'ouverture : le partage s'ouvre alors dès le toucher (le navigateur ne l'autorise
 * que juste après un toucher).
 */
export function ApercuRecu({ recu, etat }: { recu: Recu; etat?: EtatRecu }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [erreurApercu, setErreurApercu] = useState<string | null>(null);
  const [erreurPartage, setErreurPartage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [message, setMessage] = useState(() => messageWhatsApp(recu));
  const annule = !!etat?.annule;
  const supprime = !!etat?.supprime;

  useEffect(() => {
    let fini = false;
    let lien: string | null = null;
    fichierRecu(recu, 'image', { annule, supprime })
      .then((f) => {
        if (fini) return;
        setFichier(f);
        if (f.type === 'image/jpeg') {
          lien = URL.createObjectURL(f);
          setUrl(lien);
        }
      })
      .catch((e) => !fini && setErreurApercu(messageErreur(e)));
    return () => {
      fini = true;
      if (lien) URL.revokeObjectURL(lien);
    };
  }, [recu, annule, supprime]);

  const lancer = (nom: string, f: () => Promise<void>) => async () => {
    setEnCours(nom);
    try {
      await f();
    } catch (e) {
      notifierErreur(e);
    } finally {
      setEnCours(null);
    }
  };
  // Le toucher sur « Confirmer et partager » ouvre le partage du téléphone (le fichier est déjà prêt)
  const partager = async () => {
    if (!fichier) return;
    setConfirmation(false);
    setErreurPartage(null);
    setErreurPartage(await envoyerSurWhatsApp(recu, fichier, message.trim() || messageWhatsApp(recu)));
  };
  const icone = (nom: string, i: React.ReactNode) => (enCours === nom ? <Loader size={16} color="currentColor" /> : i);

  return (
    <Stack w="100%">
      {url ? (
        <Image src={url} alt={`Reçu ${recu.numero}`} radius="md" mah="55vh" fit="contain"
          style={{ border: '1px solid var(--mantine-color-default-border)' }} />
      ) : erreurApercu ? (
        <Alert color="red">L’aperçu n’a pas pu être préparé : {erreurApercu}</Alert>
      ) : fichier ? (
        <Text size="sm" c="dimmed" ta="center">Aperçu indisponible sur ce téléphone : le reçu sera envoyé en PDF.</Text>
      ) : (
        <Center h={200}><Stack align="center" gap="xs"><Loader /><Text size="sm" c="dimmed">Préparation du reçu…</Text></Stack></Center>
      )}
      <Button color="green" size="md" leftSection={<IconBrandWhatsapp size={20} />} disabled={!fichier}
        onClick={() => { setErreurPartage(null); setConfirmation(true); }}>
        Envoyer sur WhatsApp
      </Button>
      {confirmation && (
        <Modal opened onClose={() => setConfirmation(false)} title={<Text fw={700}>Envoyer ce reçu sur WhatsApp ?</Text>} centered>
          <Stack>
            <Text size="sm">
              Reçu N° <b>{recu.numero}</b> de <b>{recu.contenu.locataire.nom_complet}</b>, en image.
              Il sera aussi enregistré dans « Téléchargements ».
            </Text>
            <Textarea label="Message à coller dans WhatsApp" description="Vous pouvez le modifier. Il sera copié : dans WhatsApp, appuyez longuement dans la zone de texte, puis « Coller »."
              value={message} onChange={(e) => setMessage(e.currentTarget.value)} autosize minRows={3} />
            <Text size="xs" c="dimmed">Ensuite, dans le menu du téléphone : touchez WhatsApp, puis choisissez le contact.</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setConfirmation(false)}>Annuler</Button>
              <Button color="green" leftSection={<IconBrandWhatsapp size={18} />} onClick={partager}>Confirmer et partager</Button>
            </Group>
          </Stack>
        </Modal>
      )}
      {erreurPartage ? (
        <Alert color="orange" title="Le téléphone n’a pas ouvert le partage">
          <Text size="sm">
            Le reçu est dans « Téléchargements » : ouvrez-le (notification de téléchargement ou application « Mes fichiers »),
            puis touchez Partager › WhatsApp et choisissez le contact.
          </Text>
          <Text size="xs" c="dimmed" mt={4}>Détail : {erreurPartage}</Text>
        </Alert>
      ) : (
        <Text size="xs" c="dimmed">Vous pourrez vérifier le message avant l’envoi.</Text>
      )}
      <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs">
        <Button variant="default" leftSection={icone('imp', <IconPrinter size={18} />)} disabled={!!enCours}
          onClick={lancer('imp', () => imprimerRecu(recu, etat))}>
          Imprimer
        </Button>
        <Button variant="default" leftSection={icone('pdf', <IconFileTypePdf size={18} />)} disabled={!!enCours}
          onClick={lancer('pdf', () => telechargerRecu(recu, 'pdf', etat))}>
          Télécharger (PDF)
        </Button>
        <Button variant="default" leftSection={icone('img', <IconPhoto size={18} />)} disabled={!!enCours}
          onClick={lancer('img', () => telechargerRecu(recu, 'image', etat))}>
          Télécharger (image)
        </Button>
      </SimpleGrid>
    </Stack>
  );
}

/** Bouton « Reçu » des listes : ouvre l'aperçu du reçu et ses actions. */
export function ActionsRecu({ recu, etat }: { recu: Recu; etat?: EtatRecu }) {
  const mobile = useMediaQuery('(max-width: 48em)');
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Tooltip label={`Reçu ${recu.numero}`}>
        <ActionIcon variant="light" size="lg" aria-label={`Voir le reçu ${recu.numero}`} onClick={() => setOuvert(true)}>
          <IconReceipt size={20} />
        </ActionIcon>
      </Tooltip>
      {ouvert && (
        <Modal opened onClose={() => setOuvert(false)} title={<Text fw={700}>Reçu N° {recu.numero}</Text>}
          size="lg" fullScreen={mobile} radius={mobile ? 0 : 'lg'} closeButtonProps={{ 'aria-label': 'Fermer' }}>
          <ApercuRecu recu={recu} etat={etat} />
        </Modal>
      )}
    </>
  );
}
