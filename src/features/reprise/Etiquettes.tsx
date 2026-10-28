import { Badge, Group, Tooltip } from '@mantine/core';
import type { EtiquetteReprise } from '@/lib/types';

export const LIBELLE_ETIQUETTE: Record<EtiquetteReprise, { court: string; aide: string }> = {
  doublon: { court: 'Mois déjà payé', aide: 'Ce mois était déjà payé dans l’ancien logiciel : le mois a sans doute été mal saisi.' },
  montant: { court: 'Montant différent du loyer', aide: 'Le montant ne correspond pas au loyer de ce mois.' },
  date: { court: 'Date corrigée', aide: 'La date de l’ancien logiciel était impossible ou manquante : elle a été corrigée à l’import.' },
};

/** Les étiquettes « à vérifier » d'un paiement repris de l'ancien logiciel. */
export function EtiquettesReprise({ etiquettes }: { etiquettes: EtiquetteReprise[] }) {
  if (!etiquettes.length) return null;
  return (
    <Group gap={4}>
      {etiquettes.map((e) => (
        <Tooltip key={e} label={LIBELLE_ETIQUETTE[e]?.aide} multiline w={260} withArrow>
          <Badge color="orange" variant="light" size="sm">À vérifier : {LIBELLE_ETIQUETTE[e]?.court ?? e}</Badge>
        </Tooltip>
      ))}
    </Group>
  );
}
