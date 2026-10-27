import { Button, Card, Group, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { useAuth } from '@/auth/AuthProvider';

/** Fait réapparaître l'encadré « Complétez votre espace » sur l'Accueil, s'il a été masqué. */
export function ReafficherRappel({ espaceId }: { espaceId: string }) {
  const { profil, rechargerProfil } = useAuth();
  const prefs = (profil?.preferences ?? {}) as { rappels_ecartes?: Record<string, unknown> };
  if (!profil || !prefs.rappels_ecartes?.[espaceId]) return null;

  const reafficher = async () => {
    const reste = { ...(prefs.rappels_ecartes ?? {}) };
    delete reste[espaceId];
    const { error } = await supabase.from('profils').update({ preferences: { ...prefs, rappels_ecartes: reste } }).eq('id', profil.id);
    if (error) return notifierErreur(error);
    await rechargerProfil();
    notifierSucces("Le rappel « Complétez votre espace » est de nouveau affiché sur l'Accueil");
  };

  return (
    <Card withBorder radius="lg" padding="md" maw={720} mt="md">
      <Group justify="space-between" wrap="wrap">
        <Text size="sm" c="dimmed">Vous avez masqué le rappel « Complétez votre espace » sur l'Accueil.</Text>
        <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={reafficher}>Le réafficher</Button>
      </Group>
    </Card>
  );
}
