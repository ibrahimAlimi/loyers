import { Badge, Button, Card, Group, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBuildingEstate, IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { formatFCFA } from '@/lib/format';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { useMaisons } from './api';
import { MaisonForm } from './MaisonForm';
import { BoutonPersonnaliser } from '@/perso/Personnaliser';
import { useAffichage, type DefColonne } from '@/perso/useAffichage';

const INFOS: DefColonne[] = [
  { cle: 'occupation', libelle: 'Logements occupés', mobile: true },
  { cle: 'adresse', libelle: 'Quartier et ville', mobile: true },
  { cle: 'encaisse', libelle: 'Encaissé ce mois', mobile: true },
  { cle: 'gestionnaire', libelle: 'Gestionnaire' },
];

export function MaisonsPage() {
  const { role } = useEspaceCourant();
  const { data, isLoading } = useMaisons();
  const [ouvert, { open, close }] = useDisclosure(false);
  const navigate = useNavigate();
  const affichage = useAffichage('maisons', [], INFOS);
  const voir = affichage.colonne;
  const ajouter = peut('gerer_maisons', role) && (
    <Button leftSection={<IconPlus size={18} />} onClick={open}>Ajouter une maison</Button>
  );

  return (
    <>
      <PageEntete titre="Maisons" sousTitre="Vos immeubles et leurs logements"
        actions={<><BoutonPersonnaliser affichage={affichage} titreColonnes="Informations affichées sur chaque maison" />{ajouter}</>} />
      {isLoading ? (
        <Skeleton h={140} />
      ) : !data?.length ? (
        <EtatVide icone={<IconBuildingEstate size={30} />} titre="Aucune maison"
          message="Commencez par ajouter une maison, puis ses logements (chambres, appartements, boutiques)." action={ajouter} />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {data.map((m) => (
            <Card key={m.id} withBorder radius="lg" padding="lg" style={{ cursor: 'pointer' }} onClick={() => navigate(`/maisons/${m.id}`)}>
              <Stack gap={6}>
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={800} size="lg" truncate>{m.nom}</Text>
                  {voir('occupation') && <Badge variant="light">{m.nb_occupes} / {m.nb_logements} occupés</Badge>}
                </Group>
                {voir('adresse') && <Text c="dimmed" size="sm">{[m.quartier, m.ville].filter(Boolean).join(' · ') || '—'}</Text>}
                {voir('encaisse') && (
                  <Group justify="space-between">
                    <Text size="sm">Encaissé ce mois</Text>
                    <Text fw={700} className="montant">{formatFCFA(m.encaisse_mois)}</Text>
                  </Group>
                )}
                {voir('gestionnaire') && <Text size="sm" c="dimmed">Gestionnaire : {m.gestionnaire_nom ?? 'vous-même'}</Text>}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
      <MaisonForm opened={ouvert} onClose={close} onCree={(id) => navigate(`/maisons/${id}`)} />
    </>
  );
}
