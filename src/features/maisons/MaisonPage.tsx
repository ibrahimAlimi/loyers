import { useState } from 'react';
import { ActionIcon, Badge, Button, Card, Group, Menu, Skeleton, Stack, Table, Text } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconDots, IconEdit, IconKey, IconPlus, IconTrash } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { formatFCFA, LIBELLE_TYPE_LOGEMENT } from '@/lib/format';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { StatutBadge } from '@/ui/StatutBadge';
import { useSupprimer } from '@/ui/ConfirmationSuppression';
import { BailForm } from '@/features/baux/BailForm';
import type { Logement } from '@/lib/types';
import { useMaison } from './api';
import { MaisonForm } from './MaisonForm';
import { LogementForm } from './LogementForm';
import { BoutonPersonnaliser } from '@/perso/Personnaliser';
import { useAffichage, type DefColonne } from '@/perso/useAffichage';

const COLONNES: DefColonne[] = [
  { cle: 'type', libelle: 'Type de logement', mobile: true },
  { cle: 'niveau', libelle: 'Niveau (étage)' },
  { cle: 'loyer', libelle: 'Loyer', mobile: true },
  { cle: 'locataire', libelle: 'Locataire et situation', mobile: true },
];

export function MaisonPage() {
  const { id } = useParams();
  const espace = useEspaceCourant();
  const { data, isLoading } = useMaison(id);
  const navigate = useNavigate();
  const mobile = useMediaQuery('(max-width: 48em)');
  const supprimer = useSupprimer();
  const [maisonOuverte, maisonForm] = useDisclosure(false);
  const [logementEdite, setLogementEdite] = useState<Logement | 'nouveau' | null>(null);
  const [bailPour, setBailPour] = useState<string | null>(null);
  const affichage = useAffichage('maison', [], COLONNES);
  const voir = affichage.colonne;

  if (isLoading) return <Skeleton h={300} />;
  if (!data || data.maison.supprime_le) return <EtatVide titre="Maison introuvable" message="Elle a peut-être été mise à la corbeille." />;
  const { maison, logements } = data;
  const gererMaison = peut('gerer_maisons', espace.role);
  const gererLogements = peut('gerer_baux', espace.role);

  const actionsLogement = (l: (typeof logements)[number]) => (
    <Group gap={4} wrap="nowrap" justify="flex-end">
      {!l.situation && gererLogements && (
        <Button size="xs" variant="light" leftSection={<IconKey size={16} />} onClick={() => setBailPour(l.id)}>
          Mettre en location
        </Button>
      )}
      {gererLogements && (
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" aria-label="Actions"><IconDots /></ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setLogementEdite(l)}>Modifier</Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={16} />}
              onClick={() => supprimer({ table: 'logements', id: l.id, libelle: `${maison.nom} · ${l.designation}`, type: 'le logement' })}>
              {peut('supprimer', espace.role) ? 'Mettre à la corbeille' : 'Demander la suppression'}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );

  const occupant = (l: (typeof logements)[number]) =>
    l.situation ? (
      <Stack gap={2}>
        <Text fw={600} c="espace" style={{ cursor: 'pointer' }} onClick={() => navigate(`/locataires/${l.situation!.locataire_id}`)}>
          {l.situation.locataire_nom}
        </Text>
        <StatutBadge statut={l.situation.statut} nbMois={l.situation.nb_mois_retard} />
      </Stack>
    ) : (
      <Badge variant="outline" color="gray">Libre</Badge>
    );

  return (
    <>
      <PageEntete
        retour="/maisons"
        titre={maison.nom}
        sousTitre={[maison.quartier, maison.ville, maison.repere].filter(Boolean).join(' · ')}
        actions={
          <>
            <BoutonPersonnaliser affichage={affichage} titreColonnes="Informations affichées sur chaque logement" />
            {gererLogements && (
              <Button leftSection={<IconPlus size={18} />} onClick={() => setLogementEdite('nouveau')}>Ajouter un logement</Button>
            )}
            {gererMaison && (
              <Menu position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="default" size="lg" aria-label="Plus"><IconDots /></ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconEdit size={16} />} onClick={maisonForm.open}>Modifier la maison</Menu.Item>
                  <Menu.Item color="red" leftSection={<IconTrash size={16} />}
                    onClick={() => supprimer({ table: 'maisons', id: maison.id, libelle: maison.nom, type: 'la maison', apres: () => navigate('/maisons') })}>
                    Mettre à la corbeille
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </>
        }
      />

      {!logements.length ? (
        <EtatVide titre="Aucun logement" message="Ajoutez les chambres, appartements ou boutiques de cette maison." />
      ) : mobile ? (
        <Stack>
          {logements.map((l) => (
            <Card key={l.id} withBorder radius="lg">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={4} style={{ minWidth: 0 }}>
                  <Text fw={700}>{l.designation}</Text>
                  <Text size="sm" c="dimmed">
                    {[voir('type') && LIBELLE_TYPE_LOGEMENT[l.type], voir('niveau') && l.niveau,
                      voir('loyer') && formatFCFA(l.situation?.loyer ?? l.loyer_reference ?? 0)].filter(Boolean).join(' · ')}
                  </Text>
                  {voir('locataire') && occupant(l)}
                </Stack>
                {actionsLogement(l)}
              </Group>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card withBorder radius="lg" p={0}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Logement</Table.Th>{voir('type') && <Table.Th>Type</Table.Th>}{voir('niveau') && <Table.Th>Niveau</Table.Th>}
                {voir('loyer') && <Table.Th>Loyer</Table.Th>}{voir('locataire') && <Table.Th>Locataire</Table.Th>}<Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logements.map((l) => (
                <Table.Tr key={l.id}>
                  <Table.Td fw={600}>{l.designation}</Table.Td>
                  {voir('type') && <Table.Td>{LIBELLE_TYPE_LOGEMENT[l.type]}</Table.Td>}
                  {voir('niveau') && <Table.Td>{l.niveau ?? '—'}</Table.Td>}
                  {voir('loyer') && <Table.Td className="montant">{formatFCFA(l.situation?.loyer ?? l.loyer_reference ?? 0)}</Table.Td>}
                  {voir('locataire') && <Table.Td>{occupant(l)}</Table.Td>}
                  <Table.Td>{actionsLogement(l)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <MaisonForm opened={maisonOuverte} onClose={maisonForm.close} maison={maison} />
      {logementEdite && (
        <LogementForm
          opened
          onClose={() => setLogementEdite(null)}
          maisonId={maison.id}
          espaceId={espace.id}
          logement={logementEdite === 'nouveau' ? undefined : logementEdite}
        />
      )}
      {bailPour && <BailForm opened onClose={() => setBailPour(null)} logementId={bailPour} />}
    </>
  );
}
