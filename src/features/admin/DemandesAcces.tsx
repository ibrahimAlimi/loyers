import { useState } from 'react';
import { Badge, Button, Card, Group, Modal, Progress, SimpleGrid, Stack, Text, Textarea, Title } from '@mantine/core';
import { IconBrandWhatsapp, IconCheck, IconX } from '@tabler/icons-react';
import { formatDateHeure } from '@/lib/format';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { lienWhatsApp } from '@/lib/telephone';
import { useDemandesAcces, useTraiterDemandeAcces, useUtilisation, type DemandeAcces } from './api';
import { EspaceForm } from './EspaceForm';

const mo = (o: number) => (o >= 1024 ** 3 ? `${(o / 1024 ** 3).toFixed(2)} GB` : `${Math.round(o / 1024 ** 2)} MB`);

/** Place utilisée par rapport aux limites gratuites (Supabase : 500 MB de base, 1 GB de fichiers). */
export function UtilisationPlateforme() {
  const { data: u } = useUtilisation();
  if (!u) return null;
  const jauge = (libelle: string, val: number, max: number) => {
    const pct = Math.min(100, Math.round((100 * val) / max));
    const couleur = pct >= 90 ? 'var(--statut-critique)' : pct >= 75 ? 'var(--statut-retard)' : 'var(--statut-ok)';
    return (
      <div>
        <Group justify="space-between" mb={4}>
          <Text size="sm" fw={600}>{libelle}</Text>
          <Text size="sm">{mo(val)} sur {mo(max)} · <b style={{ color: couleur }}>{pct} %{pct >= 75 ? ' ⚠' : ''}</b></Text>
        </Group>
        <Progress value={pct} color={couleur} size="lg" radius="xl" aria-label={`${libelle} : ${pct} %`} />
      </div>
    );
  };
  return (
    <Card withBorder radius="lg" padding="lg" mb="md">
      <Title order={3} size="h4" mb="sm">Place utilisée (offre gratuite)</Title>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {jauge('Base de données', u.base_octets, u.base_limite)}
        {jauge('Fichiers (logos, signatures)', u.stockage_octets, u.stockage_limite)}
      </SimpleGrid>
      <Text size="sm" c="dimmed" mt="sm">{u.nb_espaces} espace(s) · {u.nb_comptes} compte(s) actif(s) · {u.nb_logements} logement(s)</Text>
    </Card>
  );
}

/** Demandes d'accès reçues par le formulaire public. */
export function DemandesAcces() {
  const { data = [] } = useDemandesAcces();
  const traiter = useTraiterDemandeAcces();
  const [creation, setCreation] = useState<DemandeAcces | null>(null);
  const [refus, setRefus] = useState<DemandeAcces | null>(null);
  const [motif, setMotif] = useState('');
  if (!data.length) return null;

  const accepter = (d: DemandeAcces) => (espaceId: string, identifiant: string) => traiter.mutate(
    { id: d.id, accepter: true, espaceId, identifiant },
    { onSuccess: (r) => notifierSucces(r.envoye ? 'Demande acceptée, e-mail envoyé au demandeur' : 'Demande acceptée'), onError: notifierErreur },
  );

  return (
    <Card withBorder radius="lg" padding="lg" mb="md" style={{ borderColor: 'var(--mantine-color-espace-filled)' }}>
      <Group gap="xs" mb="sm"><Title order={3} size="h4">Demandes d'accès</Title><Badge color="red">{data.length}</Badge></Group>
      <Stack gap="sm">
        {data.map((d) => (
          <Card key={d.id} withBorder radius="md" padding="sm">
            <Group justify="space-between" wrap="wrap" align="flex-start">
              <div>
                <Text fw={800}>{d.nom}</Text>
                <Text size="sm">{d.telephone}{d.email ? ` · ${d.email}` : ''}</Text>
                <Text size="sm" c="dimmed">
                  {[d.ville, d.nb_logements && `environ ${d.nb_logements} logements`, `reçue le ${formatDateHeure(d.cree_le)}`].filter(Boolean).join(' · ')}
                </Text>
                {d.message && <Text size="sm" mt={4} fs="italic">« {d.message} »</Text>}
              </div>
              <Group gap="xs">
                <Button size="xs" variant="light" color="green" leftSection={<IconBrandWhatsapp size={16} />} component="a" target="_blank" rel="noopener"
                  href={lienWhatsApp(d.telephone, `Bonjour ${d.nom}, merci pour votre demande d'accès à Mes Loyers.`)}>Contacter</Button>
                <Button size="xs" leftSection={<IconCheck size={16} />} onClick={() => setCreation(d)}>Créer son espace</Button>
                <Button size="xs" variant="subtle" color="red" leftSection={<IconX size={16} />} onClick={() => { setMotif(''); setRefus(d); }}>Refuser</Button>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>
      {creation && (
        <EspaceForm opened onClose={() => setCreation(null)} onCree={accepter(creation)}
          prerempli={{ nom_complet: creation.nom, telephone: creation.telephone, email: creation.email, ville: creation.ville }} />
      )}
      <Modal opened={!!refus} onClose={() => setRefus(null)} title={`Refuser la demande de ${refus?.nom ?? ''}`} radius="lg">
        <Stack>
          <Textarea label="Message pour le demandeur (facultatif)" autosize minRows={2} value={motif} onChange={(e) => setMotif(e.currentTarget.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRefus(null)}>Annuler</Button>
            <Button color="red" loading={traiter.isPending} onClick={() => refus && traiter.mutate(
              { id: refus.id, accepter: false, reponse: motif },
              { onSuccess: () => { notifierSucces('Demande refusée'); setRefus(null); }, onError: notifierErreur },
            )}>Refuser</Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
