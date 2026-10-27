import { useMemo, useState } from 'react';
import { Button, Card, Chip, Group, ScrollArea, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronRight, IconSearch, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { formatFCFA } from '@/lib/format';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { StatutBadge } from '@/ui/StatutBadge';
import { useLocataires } from './api';
import { LocataireForm } from './LocataireForm';

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function LocatairesPage() {
  const { role } = useEspaceCourant();
  const { data = [], isLoading } = useLocataires();
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [ouvert, { open, close }] = useDisclosure(false);
  const navigate = useNavigate();

  const maisons = useMemo(
    () => Array.from(new Map(data.filter((l) => l.maison_id).map((l) => [l.maison_id!, l.maison_nom!])).entries()),
    [data],
  );

  const lignes = useMemo(() => {
    const q = sansAccents(recherche.trim());
    return data
      .filter((l) => {
        if (filtre === 'anciens') return !l.bail;
        if (!l.bail) return false;
        if (filtre === 'retard') return l.situation && l.situation.statut !== 'a_jour';
        if (filtre !== 'tous') return l.maison_id === filtre;
        return true;
      })
      .filter((l) => !q || sansAccents([l.nom, l.locataire.telephone, l.maison_nom, l.logement].filter(Boolean).join(' ')).includes(q))
      .sort((a, b) => (b.situation?.nb_mois_retard ?? 0) - (a.situation?.nb_mois_retard ?? 0) || a.nom.localeCompare(b.nom, 'fr'));
  }, [data, recherche, filtre]);

  const ajouter = peut('gerer_baux', role) && (
    <Button leftSection={<IconUserPlus size={18} />} onClick={open}>Ajouter un locataire</Button>
  );

  return (
    <>
      <PageEntete titre="Locataires" sousTitre={`${data.filter((l) => l.bail).length} baux en cours`} actions={ajouter} />
      <Stack gap="sm" mb="md">
        <TextInput
          leftSection={<IconSearch size={18} />}
          placeholder="Chercher un nom, un téléphone, une maison…"
          value={recherche}
          onChange={(e) => setRecherche(e.currentTarget.value)}
          size="md"
        />
        <ScrollArea type="never">
          <Chip.Group value={filtre} onChange={(v) => setFiltre(v as string)}>
            <Group gap="xs" wrap="nowrap">
              <Chip value="tous">Tous</Chip>
              <Chip value="retard" color="orange">En retard</Chip>
              {maisons.map(([id, nom]) => <Chip key={id} value={id}>{nom}</Chip>)}
              <Chip value="anciens" color="gray">Anciens locataires</Chip>
            </Group>
          </Chip.Group>
        </ScrollArea>
      </Stack>

      {isLoading ? (
        <Skeleton h={200} />
      ) : !lignes.length ? (
        <EtatVide icone={<IconUsers size={30} />} titre="Aucun locataire"
          message={data.length ? 'Aucun résultat pour cette recherche.' : 'Mettez un logement en location depuis la page Maisons.'} />
      ) : (
        <Card withBorder radius="lg" p={0}>
          {lignes.map((l, i) => (
            <Group
              key={`${l.locataire.id}-${l.bail?.id ?? 'x'}`}
              justify="space-between"
              wrap="nowrap"
              px="md"
              py="sm"
              style={{ cursor: 'pointer', borderTop: i ? '1px solid var(--mantine-color-gray-2)' : undefined, minHeight: 64 }}
              onClick={() => navigate(`/locataires/${l.locataire.id}`)}
            >
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={700} truncate>{l.nom}</Text>
                <Text size="sm" c="dimmed" truncate>
                  {l.bail ? `${l.maison_nom} · ${l.logement}` : 'Ancien locataire'}
                </Text>
              </Stack>
              <Group gap="xs" wrap="nowrap">
                {l.situation && (
                  <Stack gap={2} align="flex-end">
                    <StatutBadge statut={l.situation.statut} nbMois={l.situation.nb_mois_retard} />
                    {l.situation.montant_du > 0 && <Text size="xs" c="dimmed" className="montant">{formatFCFA(l.situation.montant_du)} dus</Text>}
                  </Stack>
                )}
                <IconChevronRight size={18} color="var(--mantine-color-gray-5)" />
              </Group>
            </Group>
          ))}
        </Card>
      )}
      <LocataireForm opened={ouvert} onClose={close} onCree={(id) => navigate(`/locataires/${id}`)} />
    </>
  );
}
