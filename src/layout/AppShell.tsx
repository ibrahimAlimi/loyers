import { useEffect } from 'react';
import {
  Affix, AppShell as Shell, Avatar, Badge, Burger, Button, Center, Divider, Group, Loader, NavLink, ScrollArea,
  Stack, Text, ThemeIcon, UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconCash, IconHome, IconLogout } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { ChoixEspacePage, SelecteurEspace } from '@/espace/SelecteurEspace';
import { useEspace } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { iconeMenu } from '@/espace/icones';
import { useEncaisser } from '@/features/encaissement/EncaissementContext';
import { Cloche } from '@/features/notifications/Cloche';
import { useUrlFichier } from '@/lib/fichiers';
import { LIBELLE_ROLE } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { EtatVide } from '@/ui/EtatVide';
import { NAVIGATION, type EntreeNavigation } from './navigation';

export function AppShell() {
  const { profil, seDeconnecter } = useAuth();
  const { espace, role, chargement, choixRequis, espaces } = useEspace();
  const [ouvert, { toggle, close }] = useDisclosure(false);
  const mobile = useMediaQuery('(max-width: 48em)');
  const lieu = useLocation();
  const navigate = useNavigate();
  const { ouvrir } = useEncaisser();
  const logo = useUrlFichier('espaces', espace?.logo_path);

  useEffect(close, [lieu.pathname, close]);

  const { data: nbDemandes = 0 } = useQuery({
    queryKey: ['demandes-en-attente', espace?.id],
    enabled: !!espace && peut('traiter_demandes', role),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('demandes')
        .select('id', { count: 'exact', head: true })
        .eq('espace_id', espace!.id)
        .eq('statut', 'en_attente')
        .is('supprime_le', null);
      return count ?? 0;
    },
  });

  if (chargement) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (choixRequis) return <ChoixEspacePage />;

  const sansEspace = !espace;
  if (sansEspace && role !== 'super_admin' && !profil?.est_super_admin) {
    return (
      <EtatVide
        titre="Aucun espace"
        message="Votre compte n'est rattaché à aucun espace actif. Contactez votre propriétaire ou l'administrateur."
        action={<Button variant="light" onClick={seDeconnecter}>Se déconnecter</Button>}
      />
    );
  }
  if (sansEspace && !lieu.pathname.startsWith('/admin') && lieu.pathname !== '/profil') return <Navigate to="/admin" replace />;

  const roleEffectif = profil?.est_super_admin ? 'super_admin' : role;
  // Bouton flottant « Encaisser » : seulement sur les pages de travail, pas sur les formulaires de réglages
  const SANS_BOUTON = ['/parametres', '/profil', '/comptes', '/admin', '/corbeille', '/demandes'];
  const boutonFlottant = !!mobile && !!espace && peut('encaisser', roleEffectif)
    && !SANS_BOUTON.some((c) => lieu.pathname.startsWith(c));
  const visibles = NAVIGATION.filter((n) => {
    if (sansEspace) return ['admin', 'audit', 'profil'].includes(n.cle);
    if (n.cle === 'demandes') return roleEffectif !== 'consultation';
    return !n.droit || peut(n.droit, roleEffectif);
  });

  const lien = (n: EntreeNavigation) => {
    const actif = n.chemin === '/' ? lieu.pathname === '/'
      : n.chemin === '/admin' ? lieu.pathname === '/admin' : !!n.chemin && lieu.pathname.startsWith(n.chemin);
    const Icone = iconeMenu(n.cle, n.icone, espace?.icones_menu);
    return (
      <NavLink
        key={n.cle}
        label={n.libelle}
        active={actif}
        leftSection={<Icone size={22} stroke={1.7} />}
        data-tour={`menu-${n.cle}`}
        rightSection={n.cle === 'demandes' && nbDemandes > 0 ? <Badge size="sm" circle color="red">{nbDemandes}</Badge> : null}
        onClick={() => (n.action === 'encaisser' ? ouvrir() : navigate(n.chemin!))}
        variant="filled"
        styles={{ root: { borderRadius: 10, minHeight: 44 }, label: { fontSize: 15, fontWeight: 600 } }}
      />
    );
  };

  return (
    <Shell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !ouvert } }}
      padding={{ base: 'sm', sm: 'lg' }}
    >
      <Shell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={ouvert} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <UnstyledButton onClick={() => navigate('/')}>
              <Group gap="xs" wrap="nowrap">
                {logo ? (
                  <Avatar src={logo} radius="md" size={36} />
                ) : (
                  <ThemeIcon size={36} radius="md"><IconHome size={22} /></ThemeIcon>
                )}
                <Text fw={800} size="lg" truncate maw={mobile ? 150 : 320}>{espace?.nom ?? 'Mes Loyers'}</Text>
              </Group>
            </UnstyledButton>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {(profil?.est_super_admin || espaces.length > 1) && !mobile && <SelecteurEspace />}
            <Cloche />
          </Group>
        </Group>
      </Shell.Header>

      <Shell.Navbar p="sm">
        <Shell.Section grow component={ScrollArea}>
          <Stack gap={4}>{visibles.filter((n) => !n.bas).map(lien)}</Stack>
          <Divider my="sm" />
          <Stack gap={4}>{visibles.filter((n) => n.bas).map(lien)}</Stack>
          {(profil?.est_super_admin || espaces.length > 1) && mobile && (
            <>
              <Divider my="sm" />
              <SelecteurEspace />
            </>
          )}
        </Shell.Section>
        <Shell.Section>
          <Divider mb="sm" />
          <Group justify="space-between" wrap="nowrap">
            <div style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" truncate>{profil?.nom_complet}</Text>
              <Text size="xs" c="dimmed">{LIBELLE_ROLE[roleEffectif ?? ''] ?? ''}</Text>
            </div>
            <Button variant="subtle" size="xs" color="gray" leftSection={<IconLogout size={16} />} onClick={seDeconnecter}>
              Quitter
            </Button>
          </Group>
        </Shell.Section>
      </Shell.Navbar>

      <Shell.Main pb={boutonFlottant ? 96 : undefined}>
        <Outlet />
      </Shell.Main>

      {boutonFlottant && (
        <Affix position={{ bottom: 20, right: 16 }} zIndex={150}>
          <Button radius="xl" size="md" leftSection={<IconCash size={20} />} onClick={() => ouvrir()} style={{ boxShadow: '0 6px 18px rgba(0,0,0,.25)' }}>
            Encaisser
          </Button>
        </Affix>
      )}
    </Shell>
  );
}
