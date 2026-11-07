import { useEffect, useState } from 'react';
import { ActionIcon, Alert, Button, Center, Image, Loader, Modal, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBrandWhatsapp, IconFileTypePdf, IconPhoto, IconPrinter, IconReceipt } from '@tabler/icons-react';
import { messageErreur, notifierErreur } from '@/lib/erreurs';
import type { Recu } from '@/lib/types';
import { envoyerSurWhatsApp, fichierRecu, imprimerRecu, telechargerRecu, type EtatRecu } from './partager';

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
  const partager = async () => {
    if (!fichier) return;
    setErreurPartage(null);
    setErreurPartage(await envoyerSurWhatsApp(recu, fichier));
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
      <Button color="green" size="md" leftSection={<IconBrandWhatsapp size={20} />} disabled={!fichier} onClick={partager}>
        Envoyer sur WhatsApp
      </Button>
      {erreurPartage ? (
        <Alert color="orange" title="Le téléphone n’a pas ouvert le partage">
          <Text size="sm">
            Le reçu est dans « Téléchargements » : ouvrez-le (notification de téléchargement ou application « Mes fichiers »),
            puis touchez Partager › WhatsApp et choisissez le contact.
          </Text>
          <Text size="xs" c="dimmed" mt={4}>Détail : {erreurPartage}</Text>
        </Alert>
      ) : (
        <Text size="xs" c="dimmed">
          Touchez WhatsApp, puis le contact. Le message est copié : appuyez longuement dans la zone de texte, puis « Coller ».
        </Text>
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
