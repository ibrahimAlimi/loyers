import type { ReactNode } from 'react';
import { Anchor, Box, Button, Container, Group, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconHome } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';

/** Habillage des pages publiques : en-tête simple, pied de page avec les liens utiles. */
export function PublicLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const mobile = useMediaQuery('(max-width: 48em)');
  return (
    <Box mih="100vh" bg="var(--mantine-color-body)" style={{ display: 'flex', flexDirection: 'column' }}>
      <Box component="header" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Container size="lg" h={60}>
          <Group h="100%" justify="space-between" wrap="nowrap">
            <UnstyledButton onClick={() => navigate('/bienvenue')}>
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon size={34} radius="md"><IconHome size={20} /></ThemeIcon>
                <Text fw={800} size="lg">Mes Loyers</Text>
              </Group>
            </UnstyledButton>
            <Group gap="xs" wrap="nowrap">
              {!mobile && <Button variant="subtle" component={Link} to="/presentation">Présentation</Button>}
              {!mobile && <Button variant="subtle" component={Link} to="/installer">Installer</Button>}
              {session
                ? <Button component={Link} to="/">Ouvrir mes loyers</Button>
                : <Button variant="light" component={Link} to="/connexion">Se connecter</Button>}
            </Group>
          </Group>
        </Container>
      </Box>
      <Box component="main" style={{ flex: 1 }}>{children}</Box>
      <Box component="footer" py="lg" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
        <Container size="lg">
          <Group justify="space-between" gap="sm">
            <Text size="sm" c="dimmed">© {new Date().getFullYear()} Mes Loyers · Fait au Bénin</Text>
            <Group gap="md">
              <Anchor component={Link} to="/presentation" size="sm">Présentation</Anchor>
              <Anchor component={Link} to="/installer" size="sm">Installer l'application</Anchor>
              <Anchor component={Link} to="/demande-acces" size="sm">Demander un accès</Anchor>
              <Anchor component={Link} to="/conditions" size="sm">Conditions et confidentialité</Anchor>
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
