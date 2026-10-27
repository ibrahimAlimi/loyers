import { Badge, Button, Drawer, Group, Paper, Select, Stack } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconAdjustmentsHorizontal, IconRefresh } from '@tabler/icons-react';
import { LIBELLE_MODE, LIBELLE_TYPE_LOGEMENT } from '@/lib/format';
import type { FiltresStats } from './api';
import { COMPARAISONS, PRESETS, type Comparaison, type Preset } from './periodes';

export interface EtatFiltres {
  preset: Preset;
  libre: [string | null, string | null];
  comparer: Comparaison;
  filtres: FiltresStats;
}

export const FILTRES_DEFAUT: EtatFiltres = {
  preset: 'annee', libre: [null, null], comparer: 'precedente',
  filtres: { maison: null, type: null, gestionnaire: null, mode: null },
};

const options = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export function FiltresBarre({ etat, onChange, maisons, gestionnaires }: {
  etat: EtatFiltres;
  onChange: (e: EtatFiltres) => void;
  maisons: { value: string; label: string }[];
  gestionnaires: { value: string; label: string }[] | null;
}) {
  const mobile = useMediaQuery('(max-width: 48em)');
  const [tiroir, { open, close }] = useDisclosure(false);
  const f = etat.filtres;
  const maj = (p: Partial<FiltresStats>) => onChange({ ...etat, filtres: { ...f, ...p } });
  const nbActifs = Object.values(f).filter(Boolean).length + (etat.comparer !== 'precedente' ? 1 : 0);
  const modifie = nbActifs > 0 || etat.preset !== FILTRES_DEFAUT.preset;

  const periode = (
    <>
      <Select label="Période" w={mobile ? undefined : 180} allowDeselect={false} value={etat.preset}
        onChange={(v) => onChange({ ...etat, preset: v as Preset })} data={PRESETS} />
      {etat.preset === 'libre' && (
        <DatePickerInput type="range" label="Dates" value={etat.libre} valueFormat="DD/MM/YYYY" w={mobile ? undefined : 240}
          onChange={(v) => onChange({ ...etat, libre: v as [string | null, string | null] })} />
      )}
    </>
  );
  const autres = (
    <>
      <Select label="Comparer à" w={mobile ? undefined : 210} allowDeselect={false} value={etat.comparer}
        onChange={(v) => onChange({ ...etat, comparer: v as Comparaison })} data={COMPARAISONS} />
      <Select label="Maison" w={mobile ? undefined : 180} placeholder="Toutes" clearable value={f.maison}
        onChange={(v) => maj({ maison: v })} data={maisons} />
      <Select label="Type de logement" w={mobile ? undefined : 170} placeholder="Tous" clearable value={f.type}
        onChange={(v) => maj({ type: v })} data={options(LIBELLE_TYPE_LOGEMENT)} />
      {gestionnaires && (
        <Select label="Gestionnaire" w={mobile ? undefined : 180} placeholder="Tous" clearable value={f.gestionnaire}
          onChange={(v) => maj({ gestionnaire: v })} data={gestionnaires} />
      )}
      <Select label="Mode de paiement" w={mobile ? undefined : 180} placeholder="Tous" clearable value={f.mode}
        onChange={(v) => maj({ mode: v })} data={options(LIBELLE_MODE)} />
    </>
  );
  const reinitialiser = modifie && (
    <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => { onChange(FILTRES_DEFAUT); close(); }}>
      Réinitialiser
    </Button>
  );

  return (
    <Paper withBorder radius="lg" p="sm" mb="md" shadow="xs"
      style={{ position: 'sticky', top: 68, zIndex: 90, background: 'var(--mantine-color-body)' }}>
      {mobile ? (
        <>
          <Group gap="xs" align="flex-end" wrap="nowrap">
            <div style={{ flex: 1 }}>{periode}</div>
            <Button variant="light" onClick={open} leftSection={<IconAdjustmentsHorizontal size={18} />}
              rightSection={nbActifs ? <Badge size="sm" circle>{nbActifs}</Badge> : null}>
              Filtres
            </Button>
          </Group>
          <Drawer opened={tiroir} onClose={close} position="bottom" size="auto" title="Filtres" radius="lg">
            <Stack>
              {autres}
              <Group justify="space-between">{reinitialiser || <span />}<Button onClick={close}>Voir les chiffres</Button></Group>
            </Stack>
          </Drawer>
        </>
      ) : (
        <Group gap="sm" align="flex-end">
          {periode}
          {autres}
          {reinitialiser}
        </Group>
      )}
    </Paper>
  );
}
