import { Alert, Card, Center, Divider, Group, Loader, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { formatDate, formatDateHeure, formatFCFA, formatMois } from '@/lib/format';

interface Verification {
  trouve: boolean;
  numero?: string;
  type?: 'loyer' | 'caution' | 'restitution';
  espace?: string;
  montant?: number;
  mois?: string[];
  date_paiement?: string;
  initiales?: string;
  immeuble?: string;
  statut?: 'valide' | 'annule' | 'supprime';
  emis_le?: string;
  nb_duplicatas?: number;
}

/** Page publique ouverte par le QR code d'un reçu. */
export function VerificationPage() {
  const { code } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verification', code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('verifier_recu', { p_code: code! });
      if (error) throw error;
      return data as Verification;
    },
  });

  return (
    <Center mih="100vh" p="md" bg="gray.0">
      <Card withBorder radius="lg" padding="xl" w="100%" maw={460} shadow="sm">
        {isLoading ? <Center><Loader /></Center> : isError || !data?.trouve ? (
          <Stack align="center" ta="center">
            <ThemeIcon size={72} radius="xl" color="red"><IconCircleX size={44} /></ThemeIcon>
            <Title order={2} size="h3">Reçu introuvable</Title>
            <Text c="dimmed">Ce reçu n'existe pas dans notre système. Il n'est pas authentique, ou il a été supprimé définitivement.</Text>
          </Stack>
        ) : (
          <Stack>
            <Stack align="center" ta="center" gap="xs">
              <ThemeIcon size={72} radius="xl" color="green"><IconCircleCheck size={44} /></ThemeIcon>
              <Title order={2} size="h3">Reçu authentique</Title>
              <Text c="dimmed">émis par <b>{data.espace}</b></Text>
            </Stack>
            {data.statut === 'annule' && <Alert color="orange">Ce paiement a été annulé.</Alert>}
            {data.statut === 'supprime' && <Alert color="orange">Ce reçu a été supprimé par son émetteur.</Alert>}
            <Divider />
            <Ligne k="Numéro" v={data.numero!} />
            <Ligne k="Montant" v={formatFCFA(data.montant)} />
            {data.type === 'loyer' && <Ligne k="Mois payés" v={(data.mois ?? []).map((m) => formatMois(m)).join(', ')} />}
            {data.type !== 'loyer' && <Ligne k="Objet" v={data.type === 'caution' ? 'Caution' : 'Restitution de caution'} />}
            <Ligne k="Date du paiement" v={formatDate(data.date_paiement)} />
            <Ligne k="Locataire" v={data.initiales ?? ''} />
            <Ligne k="Immeuble" v={data.immeuble ?? ''} />
            <Divider />
            <Text size="sm" c="dimmed" ta="center">
              Original émis le {formatDateHeure(data.emis_le!)} · {data.nb_duplicatas ?? 0} duplicata{(data.nb_duplicatas ?? 0) > 1 ? 's' : ''}
            </Text>
            <Text size="xs" c="dimmed" ta="center">Comparez ces informations avec le reçu papier ou PDF.</Text>
          </Stack>
        )}
      </Card>
    </Center>
  );
}

function Ligne({ k, v }: { k: string; v: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text c="dimmed">{k}</Text>
      <Text fw={700} ta="right">{v}</Text>
    </Group>
  );
}
