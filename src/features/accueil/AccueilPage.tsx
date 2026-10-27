import { Button, Card, Group, SimpleGrid, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconBuildingEstate, IconCash, IconChartBar, IconReceipt, IconUsers, type Icon } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { iconeMenu } from '@/espace/icones';
import { peut } from '@/espace/droits';
import { aujourdhui, dayjs } from '@/lib/dates';
import { formatDate, formatDateLongue, formatFCFA } from '@/lib/format';
import { useEncaisser } from '@/features/encaissement/EncaissementContext';
import { useBauxEncaissables } from '@/features/encaissement/api';
import { CarteChiffre } from '@/features/statistiques/CarteChiffre';
import { useDerniersRecus, useResume } from '@/features/statistiques/api';
import { BlocsOrdonnes, BoutonPersonnaliser } from '@/perso/Personnaliser';
import { useAffichage, type DefBloc, type DefColonne } from '@/perso/useAffichage';
import { CompleterEspace } from './CompleterEspace';
import { BoutonAide } from '@/features/apprendre/ApprendreContext';

const BLOCS: DefBloc[] = [
  { cle: 'chiffres', libelle: 'Les chiffres du mois', mobile: true },
  { cle: 'raccourcis', libelle: 'Encaisser un loyer et les raccourcis', essentiel: true },
  { cle: 'non_recus', libelle: 'Loyers non reçus', mobile: true },
  { cle: 'derniers_recus', libelle: 'Derniers reçus' },
];
const CHIFFRES: DefColonne[] = [
  { cle: 'encaisse', libelle: 'Encaissé ce mois', mobile: true },
  { cle: 'reste', libelle: 'Reste à percevoir', mobile: true },
  { cle: 'recouvrement', libelle: 'Recouvrement', mobile: true },
  { cle: 'occupation', libelle: 'Occupation', mobile: true },
];

export function AccueilPage() {
  const { profil } = useAuth();
  const { role, icones_menu } = useEspaceCourant();
  const navigate = useNavigate();
  const { ouvrir } = useEncaisser();
  const j = dayjs(aujourdhui());
  const { data: r, isLoading } = useResume(j.startOf('month').format('YYYY-MM-DD'), j.endOf('month').format('YYYY-MM-DD'));
  const { data: baux = [] } = useBauxEncaissables();
  const { data: recus = [] } = useDerniersRecus();
  const nonRecus = baux.filter((b) => b.situation.montant_du > 0).sort((a, b) => b.situation.montant_du - a.situation.montant_du);
  const mois = j.format('MMMM');
  const prenom = profil?.nom_complet.split(' ')[0];
  const affichage = useAffichage('accueil', BLOCS, CHIFFRES);

  const tuiles: { cle: string; libelle: string; icone: Icon; aller: () => void }[] = [
    { cle: 'locataires', libelle: 'Locataires', icone: iconeMenu('locataires', IconUsers, icones_menu), aller: () => navigate('/locataires') },
    { cle: 'maisons', libelle: 'Maisons', icone: iconeMenu('maisons', IconBuildingEstate, icones_menu), aller: () => navigate('/maisons') },
    { cle: 'recus', libelle: 'Reçus', icone: iconeMenu('recus', IconReceipt, icones_menu), aller: () => navigate('/recus') },
    { cle: 'statistiques', libelle: 'Statistiques', icone: iconeMenu('statistiques', IconChartBar, icones_menu), aller: () => navigate('/statistiques') },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1} size="h2">Bonjour {prenom} 👋</Title>
          <Text c="dimmed" tt="capitalize">{formatDateLongue(aujourdhui())}</Text>
        </div>
        <Group gap="xs">
          <BoutonPersonnaliser affichage={affichage} titreColonnes="Chiffres affichés" compact />
          <BoutonAide demo="encaisser" />
        </Group>
      </Group>

      <CompleterEspace />

      <BlocsOrdonnes affichage={affichage} demi={['non_recus', 'derniers_recus']} rendus={{
      chiffres: affichage.colonnes.some((c) => c.visible) && (
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        {affichage.colonne('encaisse') && <CarteChiffre chargement={isLoading} libelle={`Encaissé en ${mois}`} valeur={formatFCFA(r?.encaisse)} couleur="espace" />}
        {affichage.colonne('reste') && <CarteChiffre chargement={isLoading} libelle="Reste à percevoir" valeur={formatFCFA(r?.reste_a_percevoir)}
          couleur={(r?.reste_a_percevoir ?? 0) > 0 ? 'orange.8' : undefined}
          detail={r ? `${r.nb_retards} locataire${r.nb_retards > 1 ? 's' : ''} en retard` : undefined} />}
        {affichage.colonne('recouvrement') && <CarteChiffre chargement={isLoading} libelle="Recouvrement" valeur={r?.taux_recouvrement != null ? `${r.taux_recouvrement} %` : '—'} />}
        {affichage.colonne('occupation') && <CarteChiffre chargement={isLoading} libelle="Occupation" valeur={r ? `${r.logements_occupes} / ${r.logements_total}` : '—'}
          detail={r ? `${r.logements_total - r.logements_occupes} logement(s) libre(s)` : undefined} />}
      </SimpleGrid>
      ),
      raccourcis: (
      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm" data-tour="encaisser">
        {peut('encaisser', role) && (
          <UnstyledButton onClick={() => ouvrir()} style={{ gridColumn: 'span 2' }}>
            <Card radius="lg" padding="md" bg="espace" c="white" h="100%">
              <Group justify="center" gap="sm" h="100%">
                {(() => { const I = iconeMenu('encaisser', IconCash, icones_menu); return <I size={28} />; })()}
                <Text fw={800} size="lg">Encaisser un loyer</Text>
              </Group>
            </Card>
          </UnstyledButton>
        )}
        {tuiles.map((t) => (
          <UnstyledButton key={t.libelle} onClick={t.aller} data-tour={`tuile-${t.cle}`}>
            <Card withBorder radius="lg" padding="md" h="100%">
              <Stack align="center" gap={4}>
                <t.icone size={26} color="var(--mantine-color-espace-filled)" />
                <Text fw={700} size="sm">{t.libelle}</Text>
              </Stack>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>
      ),
      non_recus: (
        <Card withBorder radius="lg" padding="lg" h="100%">
          <Title order={3} size="h4" mb="sm">⚠️ Loyers non reçus</Title>
          {!nonRecus.length && <Text c="dimmed">Tous les loyers sont à jour. 🎉</Text>}
          {nonRecus.slice(0, 5).map((b) => (
            <Group key={b.bail_id} justify="space-between" py="xs" wrap="nowrap" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
              <div style={{ minWidth: 0 }}>
                <Text fw={700} truncate>{b.nom}</Text>
                <Text size="sm" c="dimmed" truncate>{b.maison} · {b.logement}</Text>
              </div>
              <Group gap="xs" wrap="nowrap">
                <Text fw={700} c="orange.8" className="montant">{formatFCFA(b.situation.montant_du)}</Text>
                {peut('encaisser', role) && <Button size="xs" variant="light" onClick={() => ouvrir({ bailId: b.bail_id })}>Encaisser</Button>}
              </Group>
            </Group>
          ))}
          {nonRecus.length > 5 && <Button variant="subtle" mt="xs" onClick={() => navigate('/statistiques')}>Voir les {nonRecus.length} retards →</Button>}
        </Card>
      ),
      derniers_recus: (
        <Card withBorder radius="lg" padding="lg" h="100%">
          <Title order={3} size="h4" mb="sm">🧾 Derniers reçus</Title>
          {!recus.length && <Text c="dimmed">Aucun reçu pour l'instant.</Text>}
          {recus.map((x) => (
            <Group key={x.id} justify="space-between" py="xs" wrap="nowrap" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
              <div style={{ minWidth: 0 }}>
                <Text fw={700} truncate>{x.contenu.locataire.nom_complet}</Text>
                <Text size="sm" c="dimmed" truncate>
                  N° {x.numero} · {formatDate(x.emis_le)}
                  {x.contenu.encaissant.role === 'gestionnaire' ? ` · par ${x.contenu.encaissant.nom} (gest.)` : ''}
                </Text>
              </div>
              <Text fw={700} className="montant">{formatFCFA(x.contenu.montant)}</Text>
            </Group>
          ))}
          {recus.length > 0 && <Button variant="subtle" mt="xs" onClick={() => navigate('/recus')}>Tous les reçus →</Button>}
        </Card>
      ),
      }} />
    </Stack>
  );
}
