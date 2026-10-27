import { useState } from 'react';
import { Badge, Button, Card, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { useAuth } from '@/auth/AuthProvider';
import { EnrolementTotp } from '@/auth/DoubleAuthPage';

/** Activer / désactiver la double authentification (obligatoire et non désactivable pour le super admin). */
export function DoubleAuthCarte() {
  const { profil, niveau, rechargerNiveau } = useAuth();
  const [activation, setActivation] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const active = niveau.requis === 'aal2';

  const desactiver = async () => {
    setEnvoi(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.all ?? []) await supabase.auth.mfa.unenroll({ factorId: f.id });
      await rechargerNiveau();
      notifierSucces('Double authentification désactivée');
    } catch (e) {
      notifierErreur(e);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" mb={4}>
        <Title order={3} size="h4">Double authentification</Title>
        {active ? <Badge color="green" leftSection={<IconShieldCheck size={14} />}>Activée</Badge> : <Badge color="gray">Désactivée</Badge>}
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        En plus du mot de passe, un code à 6 chiffres de votre téléphone est demandé à chaque connexion.
        Même si quelqu'un découvre votre mot de passe, il ne pourra pas entrer.
      </Text>
      {!active && <Button onClick={() => setActivation(true)}>Activer</Button>}
      {active && !profil?.est_super_admin && (
        <Button variant="default" color="red" loading={envoi} onClick={desactiver}>Désactiver</Button>
      )}
      {active && profil?.est_super_admin && (
        <Text size="sm">Obligatoire pour le compte administrateur.</Text>
      )}
      <Modal opened={activation} onClose={() => setActivation(false)} title="Activer la double authentification">
        <Stack>
          <EnrolementTotp onTermine={async () => {
            await rechargerNiveau();
            setActivation(false);
            notifierSucces('Double authentification activée');
          }} />
        </Stack>
      </Modal>
    </Card>
  );
}
