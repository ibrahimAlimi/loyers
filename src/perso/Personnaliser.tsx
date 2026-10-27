import { useState, type ReactNode } from 'react';
import {
  ActionIcon, Badge, Button, Checkbox, Divider, Group, Modal, Paper, SimpleGrid, Stack, Switch, Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowDown, IconArrowUp, IconDeviceDesktop, IconDeviceMobile, IconLock, IconPencil, IconRefresh } from '@tabler/icons-react';
import type { Affichage, ChoixAffichage } from './useAffichage';

/** Bouton « ✏️ Personnaliser » et sa fenêtre : afficher, masquer, réordonner les blocs ; choisir les informations. */
export function BoutonPersonnaliser({ affichage, titreColonnes = 'Informations affichées', compact }: {
  affichage: Affichage;
  titreColonnes?: string;
  compact?: boolean;
}) {
  const [ouvert, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button variant="default" size={compact ? 'xs' : 'sm'} leftSection={<IconPencil size={16} />} onClick={open}
        data-tour="personnaliser">
        Personnaliser
      </Button>
      {ouvert && <FenetrePersonnaliser affichage={affichage} titreColonnes={titreColonnes} onClose={close} />}
    </>
  );
}

function FenetrePersonnaliser({ affichage, titreColonnes, onClose }: {
  affichage: Affichage; titreColonnes: string; onClose: () => void;
}) {
  const [ordre, setOrdre] = useState(affichage.blocs.map((b) => b.cle));
  const [masques, setMasques] = useState(affichage.blocs.filter((b) => !b.visible).map((b) => b.cle));
  const [colonnes, setColonnes] = useState(affichage.colonnes.filter((c) => c.visible).map((c) => c.cle));
  const [enCours, setEnCours] = useState(false);
  const def = (k: string) => affichage.blocs.find((b) => b.cle === k)!;
  const tel = affichage.appareil === 'telephone';

  const deplacer = (i: number, sens: -1 | 1) => {
    const n = [...ordre];
    [n[i], n[i + sens]] = [n[i + sens], n[i]];
    setOrdre(n);
  };
  const valider = async (c: ChoixAffichage | null) => {
    setEnCours(true);
    await (c ? affichage.enregistrer(c) : affichage.reinitialiser());
    setEnCours(false);
    onClose();
  };

  return (
    <Modal opened onClose={onClose} title="Choisir ce que je vois" size="lg" radius="lg">
      <Group gap={6} mb="md">
        {tel ? <IconDeviceMobile size={18} /> : <IconDeviceDesktop size={18} />}
        <Text size="sm" c="dimmed">
          Ce choix vaut pour votre <b>{tel ? 'téléphone' : 'ordinateur'}</b>. Il est gardé dans votre compte.
        </Text>
      </Group>

      {affichage.blocs.length > 1 && (
        <>
          <Text fw={700} mb={4}>Blocs de la page</Text>
          <Text size="sm" c="dimmed" mb="xs">Cochez ce que vous voulez voir. Les flèches changent l'ordre.</Text>
          <Stack gap={6}>
            {ordre.map((k, i) => {
              const b = def(k);
              return (
                <Paper key={k} withBorder radius="md" px="sm" py={6}>
                  <Group justify="space-between" wrap="nowrap">
                    <Switch
                      label={b.libelle}
                      checked={b.essentiel || !masques.includes(k)}
                      disabled={b.essentiel}
                      onChange={(e) => setMasques(e.currentTarget.checked ? masques.filter((x) => x !== k) : [...masques, k])}
                    />
                    <Group gap={4} wrap="nowrap">
                      {b.essentiel && <Badge variant="light" color="gray" leftSection={<IconLock size={12} />}>Toujours affiché</Badge>}
                      <ActionIcon variant="subtle" aria-label="Monter" disabled={i === 0} onClick={() => deplacer(i, -1)}><IconArrowUp size={18} /></ActionIcon>
                      <ActionIcon variant="subtle" aria-label="Descendre" disabled={i === ordre.length - 1} onClick={() => deplacer(i, 1)}><IconArrowDown size={18} /></ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}

      {affichage.colonnes.length > 0 && (
        <>
          {affichage.blocs.length > 1 && <Divider my="md" />}
          <Text fw={700} mb="xs">{titreColonnes}</Text>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={8}>
            {affichage.colonnes.map((c) => (
              <Checkbox key={c.cle} label={c.libelle} disabled={c.essentiel}
                checked={c.essentiel || colonnes.includes(c.cle)}
                onChange={(e) => setColonnes(e.currentTarget.checked ? [...colonnes, c.cle] : colonnes.filter((x) => x !== c.cle))} />
            ))}
          </SimpleGrid>
        </>
      )}

      <Group justify="space-between" mt="lg">
        <Button variant="subtle" color="gray" leftSection={<IconRefresh size={16} />} disabled={!affichage.personnalise || enCours}
          onClick={() => valider(null)}>
          Revenir au choix par défaut
        </Button>
        <Button loading={enCours} onClick={() => valider({ ordre, masques, colonnes })}>Enregistrer</Button>
      </Group>
    </Modal>
  );
}

/**
 * Affiche les blocs visibles, dans l'ordre choisi. Un rendu `null` (bloc sans contenu) est ignoré.
 * Deux blocs `demi` qui se suivent partagent une ligne sur ordinateur.
 */
export function BlocsOrdonnes({ affichage, rendus, demi = [], gap = 'lg' }: {
  affichage: Affichage;
  rendus: Record<string, ReactNode>;
  demi?: string[];
  gap?: string;
}) {
  const cles = affichage.visibles.filter((k) => rendus[k]);
  const lignes: string[][] = [];
  for (const k of cles) {
    const der = lignes[lignes.length - 1];
    if (demi.includes(k) && der?.length === 1 && demi.includes(der[0])) der.push(k);
    else lignes.push([k]);
  }
  return (
    <Stack gap={gap}>
      {lignes.map((l) => (l.length === 2 ? (
        <SimpleGrid key={l.join('+')} cols={{ base: 1, md: 2 }} spacing="md">
          {l.map((k) => <div key={k}>{rendus[k]}</div>)}
        </SimpleGrid>
      ) : <div key={l[0]}>{rendus[l[0]]}</div>))}
    </Stack>
  );
}
