import { Button, Card, Center, Select, Stack, Text, Title } from '@mantine/core';
import { useEspace } from './EspaceProvider';

/** Liste déroulante d'espace (super admin, ou membre de plusieurs espaces). */
export function SelecteurEspace() {
  const { espaces, espace, changerEspace } = useEspace();
  if (espaces.length < 2) return null;
  return (
    <Select
      size="sm"
      aria-label="Espace"
      data={espaces.map((e) => ({ value: e.id, label: e.nom }))}
      value={espace?.id ?? null}
      onChange={(v) => v && changerEspace(v)}
      allowDeselect={false}
      searchable
      w={220}
    />
  );
}

/** Écran plein : choisir l'espace après connexion. */
export function ChoixEspacePage() {
  const { espaces, changerEspace } = useEspace();
  return (
    <Center mih="100vh" p="md">
      <Stack w="100%" maw={420}>
        <Title order={2} size="h3">Choisissez un espace</Title>
        <Text c="dimmed">Vous travaillez pour plusieurs propriétaires. Lequel voulez-vous ouvrir ?</Text>
        {espaces.map((e) => (
          <Card key={e.id} withBorder radius="lg" padding="md">
            <Button variant="subtle" size="lg" fullWidth justify="space-between" onClick={() => changerEspace(e.id)}>
              {e.nom}
            </Button>
          </Card>
        ))}
      </Stack>
    </Center>
  );
}
