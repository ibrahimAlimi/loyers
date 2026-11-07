import { useState } from 'react';
import { ActionIcon, Loader, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

/**
 * Actualiser : cherche une nouvelle version de l'application (service worker), puis recharge la page.
 * Utile dans l'application installée, qui n'a pas de bouton « recharger » et peut garder l'ancienne version.
 */
export function BoutonActualiser() {
  const [enCours, setEnCours] = useState(false);
  const actualiser = async () => {
    setEnCours(true);
    try {
      const enregistrement = await navigator.serviceWorker?.getRegistration();
      await enregistrement?.update();
    } catch {
      // Pas de service worker (navigation privée, développement) : un simple rechargement suffit
    }
    window.location.reload();
  };
  return (
    <Tooltip label="Actualiser">
      <ActionIcon variant="subtle" color="gray" size="lg" onClick={actualiser} disabled={enCours}
        aria-label="Actualiser l'application">
        {enCours ? <Loader size={20} color="gray" /> : <IconRefresh size={24} stroke={1.7} />}
      </ActionIcon>
    </Tooltip>
  );
}
