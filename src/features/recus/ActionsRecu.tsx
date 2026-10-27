import { useState } from 'react';
import { ActionIcon, Button, Loader, Menu, SimpleGrid, Tooltip } from '@mantine/core';
import { IconBrandWhatsapp, IconDownload, IconEye, IconPhoto, IconPrinter, IconReceipt } from '@tabler/icons-react';
import { notifierErreur } from '@/lib/erreurs';
import type { Recu } from '@/lib/types';
import { imprimerRecu, partagerRecu, telechargerRecu, voirRecu, type EtatRecu } from './partager';

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

/** Petit menu « Reçu » (listes). */
export function ActionsRecu({ recu, telephone, etat }: { recu: Recu; telephone: string | null; etat?: EtatRecu }) {
  const { enCours, lancer } = useAction();
  return (
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
        <Menu.Item leftSection={<IconBrandWhatsapp size={16} />} onClick={lancer('pdf', () => partagerRecu(recu, 'pdf', telephone, etat))}>
          Envoyer (PDF)
        </Menu.Item>
        <Menu.Item leftSection={<IconPhoto size={16} />} onClick={lancer('img', () => partagerRecu(recu, 'image', telephone, etat))}>
          Envoyer (image)
        </Menu.Item>
        <Menu.Item leftSection={<IconPrinter size={16} />} onClick={lancer('imp', () => imprimerRecu(recu, etat))}>Imprimer</Menu.Item>
        <Menu.Item leftSection={<IconDownload size={16} />} onClick={lancer('dl', () => telechargerRecu(recu, etat))}>Télécharger</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** Gros boutons (fin de l'assistant d'encaissement). */
export function BoutonsRecu({ recu, telephone }: { recu: Recu; telephone: string | null }) {
  const { enCours, lancer } = useAction();
  const icone = (nom: string, i: React.ReactNode) => (enCours === nom ? <Loader size={16} color="currentColor" /> : i);
  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs" w="100%" maw={460}>
      <Button color="green" leftSection={icone('wa', <IconBrandWhatsapp size={20} />)} disabled={!!enCours}
        onClick={lancer('wa', () => partagerRecu(recu, 'image', telephone))}>
        Envoyer sur WhatsApp
      </Button>
      <Button variant="default" leftSection={icone('pdf', <IconReceipt size={20} />)} disabled={!!enCours}
        onClick={lancer('pdf', () => partagerRecu(recu, 'pdf', telephone))}>
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
    </SimpleGrid>
  );
}
