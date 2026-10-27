import { Button, Card, Group, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconBrandWhatsapp, IconClock, IconHourglass } from '@tabler/icons-react';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { formatFCFA, formatMois } from '@/lib/format';
import { lienWhatsApp } from '@/lib/telephone';
import { useEncaisser } from '@/features/encaissement/EncaissementContext';
import type { StatsCompletes } from '../api';
import { BarresHorizontales, STATUT } from '../graphiques';
import { Bloc, duree } from './commun';

export function BlocAnciennete({ s }: { s: StatsCompletes }) {
  const a = s.anciennete;
  const total = a.moins_30 + a.de_31_a_60 + a.plus_60;
  const tranches = [
    { libelle: 'Moins de 30 jours', montant: a.moins_30, couleur: STATUT.attention, Icone: IconClock },
    { libelle: '31 à 60 jours', montant: a.de_31_a_60, couleur: STATUT.serieux, Icone: IconHourglass },
    { libelle: 'Plus de 60 jours', montant: a.plus_60, couleur: STATUT.critique, Icone: IconAlertTriangle },
  ];
  return (
    <Bloc titre="Ancienneté des impayés" sousTitre={`Total : ${formatFCFA(total)}`}>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        {tranches.map((t) => (
          <Card key={t.libelle} withBorder radius="md" padding="sm" style={{ borderLeft: `4px solid ${t.couleur}` }}>
            <Group gap={6} wrap="nowrap">
              <t.Icone size={18} color={t.couleur} />
              <Text size="sm" c="dimmed">{t.libelle}</Text>
            </Group>
            <Text fw={800} size="lg" className="montant">{formatFCFA(t.montant)}</Text>
            <Text size="xs" c="dimmed">{total ? Math.round((100 * t.montant) / total) : 0} % du total</Text>
          </Card>
        ))}
      </SimpleGrid>
    </Bloc>
  );
}

export function BlocDebiteurs({ s }: { s: StatsCompletes }) {
  const espace = useEspaceCourant();
  const { ouvrir } = useEncaisser();
  const message = (d: StatsCompletes['debiteurs'][number]) =>
    `Bonjour ${d.locataire}, sauf erreur de notre part, il reste ${formatFCFA(d.montant)} de loyer à régler pour ${d.logement} `
    + `(${d.nb_mois} mois, depuis ${formatMois(d.premier_mois)}). Merci de bien vouloir régulariser. ${espace.nom}`;
  return (
    <Bloc titre="Qui doit combien" sousTitre={s.debiteurs.length ? `${s.debiteurs.length} locataire${s.debiteurs.length > 1 ? 's' : ''}` : undefined}>
      {!s.debiteurs.length && <Text c="dimmed">Personne ne doit rien. 🎉</Text>}
      <Stack gap={0}>
        {s.debiteurs.map((d) => (
          <Group key={d.bail_id} justify="space-between" py="xs" wrap="wrap" gap="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text fw={700} truncate>{d.locataire}{d.parti ? ' (parti)' : ''}</Text>
              <Text size="sm" c="dimmed" truncate>{d.maison} · {d.logement}</Text>
            </div>
            <Stack gap={0} align="flex-end">
              <Text fw={700} className="montant">{formatFCFA(d.montant)}</Text>
              <Text size="xs" c="dimmed">{d.nb_mois} mois · {duree(d.jours)}</Text>
            </Stack>
            <Group gap="xs" wrap="nowrap">
              <Tooltip label="Pas de numéro de téléphone" disabled={!!d.telephone}>
                <Button size="xs" variant="light" color="green" leftSection={<IconBrandWhatsapp size={16} />}
                  component="a" href={d.telephone ? lienWhatsApp(d.telephone, message(d)) : undefined}
                  target="_blank" rel="noopener" disabled={!d.telephone}>
                  Relancer
                </Button>
              </Tooltip>
              {peut('encaisser', espace.role) && !d.parti && <Button size="xs" onClick={() => ouvrir({ bailId: d.bail_id })}>Encaisser</Button>}
            </Group>
          </Group>
        ))}
      </Stack>
    </Bloc>
  );
}

export function BlocArrieresMaison({ s }: { s: StatsCompletes }) {
  const donnees = s.par_maison.filter((m) => m.reste > 0).sort((a, b) => b.reste - a.reste)
    .map((m) => ({ libelle: m.nom, valeur: m.reste }));
  return (
    <Bloc titre="Arriérés par maison">
      {donnees.length ? <BarresHorizontales donnees={donnees} nomSerie="Arriérés" couleur={STATUT.serieux} />
        : <Text c="dimmed">Aucun arriéré.</Text>}
    </Bloc>
  );
}
