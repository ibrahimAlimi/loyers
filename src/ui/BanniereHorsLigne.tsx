import { Alert } from '@mantine/core';
import { useNetwork } from '@mantine/hooks';
import { IconWifiOff } from '@tabler/icons-react';

export function BanniereHorsLigne() {
  const { online } = useNetwork();
  if (online) return null;
  return (
    <Alert
      color="orange"
      icon={<IconWifiOff />}
      radius={0}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}
    >
      Pas de connexion Internet. Vérifiez vos données mobiles : rien ne sera enregistré tant que la connexion n'est pas revenue.
    </Alert>
  );
}
