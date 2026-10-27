import { useMemo, useState } from 'react';
import { ActionIcon, Button, Card, Group, Modal, SimpleGrid, Stack, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import { BIBLIOTHEQUE_ICONES, chercherIcones, iconeMenu } from '@/espace/icones';
import { NAVIGATION } from '@/layout/navigation';

/** Choix des icônes du menu, entrée par entrée. `valeur` : { clé du menu → nom d'icône }. */
export function IconesMenu({ valeur, onChange, couleur }: {
  valeur: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  couleur: string;
}) {
  const [pour, setPour] = useState<string | null>(null);
  const entrees = NAVIGATION.filter((n) => n.cle !== 'admin');
  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={700} size="lg">Icônes du menu</Text>
          <Text size="sm" c="dimmed">Touchez une icône pour la changer.</Text>
        </div>
        <Button variant="subtle" leftSection={<IconRefresh size={16} />} disabled={!Object.keys(valeur).length} onClick={() => onChange({})}>
          Icônes par défaut
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
        {entrees.map((n) => {
          const I = iconeMenu(n.cle, n.icone, valeur);
          return (
            <UnstyledButton key={n.cle} onClick={() => setPour(n.cle)}
              style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 10, padding: '8px 12px' }}>
              <Group gap="sm" wrap="nowrap">
                <I size={24} stroke={1.7} color={couleur} />
                <Text fw={600}>{n.libelle}</Text>
                {valeur[n.cle] && <Text size="xs" c="dimmed" ml="auto">modifiée</Text>}
              </Group>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
      {pour && (
        <ChoixIcone
          titre={`Icône pour « ${NAVIGATION.find((n) => n.cle === pour)?.libelle} »`}
          actuelle={valeur[pour] ?? null}
          couleur={couleur}
          onClose={() => setPour(null)}
          onChoisir={(nom) => {
            const v = { ...valeur };
            if (nom) v[pour] = nom; else delete v[pour];
            onChange(v);
            setPour(null);
          }}
        />
      )}
    </Card>
  );
}

function ChoixIcone({ titre, actuelle, couleur, onClose, onChoisir }: {
  titre: string; actuelle: string | null; couleur: string; onClose: () => void; onChoisir: (nom: string | null) => void;
}) {
  const [recherche, setRecherche] = useState('');
  const noms = useMemo(() => chercherIcones(recherche), [recherche]);
  return (
    <Modal opened onClose={onClose} title={titre} size="lg" radius="lg">
      <Stack>
        <TextInput leftSection={<IconSearch size={18} />} placeholder="Chercher : maison, argent, reçu, clé…" data-autofocus
          value={recherche} onChange={(e) => setRecherche(e.currentTarget.value)} />
        {!noms.length && <Text c="dimmed" ta="center">Aucune icône pour « {recherche} ».</Text>}
        <SimpleGrid cols={{ base: 5, sm: 8 }} spacing={6}>
          {noms.map((nom) => {
            const I = BIBLIOTHEQUE_ICONES[nom].icone;
            const choisie = nom === actuelle;
            return (
              <Tooltip key={nom} label={BIBLIOTHEQUE_ICONES[nom].mots.split(' ')[0]} openDelay={300}>
                <ActionIcon size={48} radius="md" variant={choisie ? 'filled' : 'default'} color={couleur}
                  aria-label={BIBLIOTHEQUE_ICONES[nom].mots.split(' ')[0]} onClick={() => onChoisir(nom)}>
                  <I size={26} stroke={1.7} />
                </ActionIcon>
              </Tooltip>
            );
          })}
        </SimpleGrid>
        <Group justify="space-between">
          <Button variant="subtle" color="gray" onClick={() => onChoisir(null)}>Remettre l'icône par défaut</Button>
          <Button variant="default" onClick={onClose}>Annuler</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
