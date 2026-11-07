import { useState } from 'react';
import { ActionIcon, Button, Loader, Menu, Modal, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconBrandWhatsapp, IconDownload, IconEye, IconPhoto, IconPrinter, IconReceipt } from '@tabler/icons-react';
import { notifierErreur } from '@/lib/erreurs';
import { lienWhatsApp } from '@/lib/telephone';
import type { Recu } from '@/lib/types';
import {
  imprimerRecu, IOS, partagerSurWhatsApp, preparerEnvoi, telechargerRecu, voirRecu, type EnvoiPret, type EtatRecu,
} from './partager';

function useAction() {
  const [enCours, setEnCours] = useState<string | null>(null);
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
  return { enCours, lancer };
}

/**
 * Envoi sur WhatsApp en deux temps : le reçu est préparé et enregistré dans le téléphone, puis un bouton ouvre
 * le partage. Le navigateur n'autorise le partage d'un fichier que juste après un toucher : la préparation
 * prend quelques secondes, d'où ce second toucher.
 */
function useEnvoi() {
  const [pret, setPret] = useState<EnvoiPret | null>(null);
  const envoyer = async (recu: Recu, format: 'pdf' | 'image', etat?: EtatRecu) => setPret(await preparerEnvoi(recu, format, etat));
  const partageFichier = !!pret && !!navigator.canShare?.({ files: [pret.fichier] });
  const fenetre = pret && (
    <Modal opened onClose={() => setPret(null)} title="Reçu prêt à envoyer" centered>
      <Stack>
        <Text size="sm">
          {IOS ? 'Le reçu est prêt.' : <>Le reçu est enregistré dans « Téléchargements » : <b>{pret.fichier.name}</b></>}
        </Text>
        {partageFichier ? (
          <Button color="green" size="md" leftSection={<IconBrandWhatsapp size={20} />}
            onClick={() => { void partagerSurWhatsApp(pret); setPret(null); }}>
            Partager sur WhatsApp
          </Button>
        ) : (
          // Sans partage de fichier (ordinateur, ancien navigateur) : un vrai lien, jamais bloqué
          <Button component="a" href={lienWhatsApp(null, pret.message)} target="_blank" rel="noopener noreferrer"
            color="green" size="md" leftSection={<IconBrandWhatsapp size={20} />} onClick={() => setPret(null)}>
            Ouvrir WhatsApp
          </Button>
        )}
        <Text size="xs" c="dimmed">
          {partageFichier
            ? 'Dans le menu qui s’ouvre, touchez WhatsApp, puis choisissez le contact.'
            : 'Choisissez le contact, puis joignez le reçu avec le trombone 📎 (il est dans « Téléchargements »).'}
        </Text>
      </Stack>
    </Modal>
  );
  return { envoyer, fenetre };
}

/** Petit menu « Reçu » (listes). */
export function ActionsRecu({ recu, etat }: { recu: Recu; etat?: EtatRecu }) {
  const { enCours, lancer } = useAction();
  const { envoyer, fenetre } = useEnvoi();
  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Tooltip label={`Reçu ${recu.numero}`}>
            <ActionIcon variant="light" size="lg" aria-label="Reçu" loading={!!enCours}>
              <IconReceipt size={20} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{recu.numero}</Menu.Label>
          <Menu.Item leftSection={<IconEye size={16} />} onClick={lancer('voir', () => voirRecu(recu, etat))}>Voir</Menu.Item>
          <Menu.Item leftSection={<IconBrandWhatsapp size={16} />} onClick={lancer('pdf', () => envoyer(recu, 'pdf', etat))}>
            Envoyer (PDF)
          </Menu.Item>
          <Menu.Item leftSection={<IconPhoto size={16} />} onClick={lancer('img', () => envoyer(recu, 'image', etat))}>
            Envoyer (image)
          </Menu.Item>
          <Menu.Item leftSection={<IconPrinter size={16} />} onClick={lancer('imp', () => imprimerRecu(recu, etat))}>Imprimer</Menu.Item>
          <Menu.Item leftSection={<IconDownload size={16} />} onClick={lancer('dl', () => telechargerRecu(recu, etat))}>Télécharger</Menu.Item>
        </Menu.Dropdown>
      </Menu>
      {fenetre}
    </>
  );
}

/** Gros boutons (fin de l'assistant d'encaissement). */
export function BoutonsRecu({ recu }: { recu: Recu }) {
  const { enCours, lancer } = useAction();
  const { envoyer, fenetre } = useEnvoi();
  const icone = (nom: string, i: React.ReactNode) => (enCours === nom ? <Loader size={16} color="currentColor" /> : i);
  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs" w="100%" maw={460}>
      <Button color="green" leftSection={icone('wa', <IconBrandWhatsapp size={20} />)} disabled={!!enCours}
        onClick={lancer('wa', () => envoyer(recu, 'image'))}>
        Envoyer sur WhatsApp
      </Button>
      <Button variant="default" leftSection={icone('pdf', <IconReceipt size={20} />)} disabled={!!enCours}
        onClick={lancer('pdf', () => envoyer(recu, 'pdf'))}>
        Envoyer en PDF
      </Button>
      <Button variant="default" leftSection={icone('imp', <IconPrinter size={20} />)} disabled={!!enCours}
        onClick={lancer('imp', () => imprimerRecu(recu))}>
        Imprimer
      </Button>
      <Button variant="default" leftSection={icone('dl', <IconDownload size={20} />)} disabled={!!enCours}
        onClick={lancer('dl', () => telechargerRecu(recu))}>
        Télécharger
      </Button>
      {fenetre}
    </SimpleGrid>
  );
}
