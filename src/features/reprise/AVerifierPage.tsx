import { useState } from 'react';
import { Anchor, Button, Card, Divider, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconBan, IconCalendarEvent, IconCircleCheck, IconConfetti } from '@tabler/icons-react';
import { Link } from 'react-router';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { formatDate, formatFCFA, formatMois } from '@/lib/format';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { AnnulationDialog } from '@/features/demandes/ActionsPaiement';
import { ChangerMoisDialog } from './ChangerMoisDialog';
import { EtiquettesReprise } from './Etiquettes';
import { useAVerifier, useValiderPaiementRepris, type PaiementAVerifier } from './api';

/** Paiements repris de l'ancien logiciel qui portent une étiquette « à vérifier », par locataire. */
export function AVerifierPage() {
  const espace = useEspaceCourant();
  const proprio = peut('supprimer', espace.role);
  const { data = [], isLoading } = useAVerifier();
  const valider = useValiderPaiementRepris();
  const [changer, setChanger] = useState<PaiementAVerifier | null>(null);
  const [annuler, setAnnuler] = useState<PaiementAVerifier | null>(null);

  const groupes = new Map<string, PaiementAVerifier[]>();
  for (const p of data) groupes.set(p.locataire.id, [...(groupes.get(p.locataire.id) ?? []), p]);

  return (
    <>
      <PageEntete titre="Paiements à vérifier" retour="/"
        sousTitre="Des paiements de l'ancien logiciel semblent mal saisis. Pour chacun : changez le mois, confirmez qu'il est correct, ou annulez-le s'il a été saisi deux fois." />
      {isLoading ? <Skeleton h={240} /> : !data.length ? (
        <EtatVide icone={<IconConfetti size={30} />} titre="Tout est vérifié" message="Aucun paiement de l'ancien logiciel n'attend de vérification." />
      ) : (
        <Stack gap="md">
          {[...groupes.values()].map((ps) => (
            <Card key={ps[0].locataire.id} withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Title order={3} size="h4">
                    <Anchor component={Link} to={`/locataires/${ps[0].locataire.id}`} inherit>{ps[0].locataire.nom}</Anchor>
                  </Title>
                  <Text size="sm" c="dimmed">{ps[0].maison} · {ps[0].logement}</Text>
                </Stack>
                <Text size="sm" c="dimmed">{ps.length} à vérifier</Text>
              </Group>
              <Stack gap={0}>
                {ps.map((p, i) => (
                  <div key={p.id}>
                    {i > 0 && <Divider />}
                    <Group justify="space-between" py="sm" align="flex-start" wrap="wrap" gap="sm">
                      <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                        <Text fw={700}>
                          {p.mois.map((m) => formatMois(m, { majuscule: true })).join(', ')} · <span className="montant">{formatFCFA(p.montant)}</span>
                        </Text>
                        <Text size="sm" c="dimmed">
                          Payé le {formatDate(p.date_paiement)}{p.reprise.encaisseur ? ` · encaissé par ${p.reprise.encaisseur}` : ''}
                        </Text>
                        <EtiquettesReprise etiquettes={p.a_verifier} />
                      </Stack>
                      {proprio && (
                        <Group gap="xs">
                          {p.mois.length === 1 && (
                            <Button size="xs" variant="light" leftSection={<IconCalendarEvent size={16} />} onClick={() => setChanger(p)}>
                              Changer le mois
                            </Button>
                          )}
                          <Button size="xs" variant="light" color="teal" leftSection={<IconCircleCheck size={16} />}
                            loading={valider.isPending && valider.variables === p.id}
                            onClick={() => valider.mutate(p.id, { onSuccess: () => notifierSucces('Paiement vérifié'), onError: notifierErreur })}>
                            C'est correct
                          </Button>
                          <Button size="xs" variant="subtle" color="orange" leftSection={<IconBan size={16} />} onClick={() => setAnnuler(p)}>
                            Annuler
                          </Button>
                        </Group>
                      )}
                    </Group>
                  </div>
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
      {changer && <ChangerMoisDialog paiement={changer} onClose={() => setChanger(null)} />}
      {annuler && (
        <AnnulationDialog paiement={annuler} demande={false} espaceId={espace.id}
          libelle={`${formatFCFA(annuler.montant)} du ${formatDate(annuler.date_paiement)}`} onClose={() => setAnnuler(null)} />
      )}
    </>
  );
}
