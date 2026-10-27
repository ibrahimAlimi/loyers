import { useMemo } from 'react';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { queryClient } from './lib/queryClient';
import './lib/dates';
import { AuthProvider } from './auth/AuthProvider';
import { EspaceProvider, useEspace } from './espace/EspaceProvider';
import { genererThemeEspace } from './espace/theme';
import { EncaissementProvider } from './features/encaissement/EncaissementContext';
import { BanniereHorsLigne } from './ui/BanniereHorsLigne';
import { router } from './routes';

function AppTheme() {
  const { espace } = useEspace();
  const theme = useMemo(() => genererThemeEspace(espace?.couleur_primaire), [espace?.couleur_primaire]);
  return (
    <MantineProvider theme={theme} defaultColorScheme="light" forceColorScheme="light">
      <DatesProvider settings={{ locale: 'fr', firstDayOfWeek: 1 }}>
        <ModalsProvider labels={{ confirm: 'Confirmer', cancel: 'Annuler' }}>
          <Notifications position="top-center" />
          <BanniereHorsLigne />
          <EncaissementProvider>
            <RouterProvider router={router} />
          </EncaissementProvider>
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EspaceProvider>
          <AppTheme />
        </EspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
