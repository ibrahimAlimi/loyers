import type { ReactNode } from 'react';
import { ActionIcon, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router';
import { BoutonAide } from '@/features/apprendre/ApprendreContext';

// Démo ouverte par le bouton « ? » de chaque écran
const AIDE: [RegExp, string][] = [
  [/^\/locataires\/[^/]+$/, 'encaisser'],
  [/^\/locataires$/, 'locataire_bail'],
  [/^\/maisons\/[^/]+$/, 'locataire_bail'],
  [/^\/maisons$/, 'maison_logements'],
  [/^\/recus$/, 'recu_whatsapp'],
  [/^\/statistiques$/, 'lire_chiffres'],
  [/^\/(comptes|demandes)$/, 'gestionnaires'],
  [/^\/parametres$/, 'identite'],
  [/^\/corbeille$/, 'corbeille'],
  [/^\/a-verifier$/, 'a_verifier'],
];

const ACCUEILS = ['/', '/admin'];

export function PageEntete({ titre, sousTitre, actions, retour, aide }: {
  titre: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  /** Écran parent, utilisé quand il n'y a pas d'écran précédent (lien ouvert directement). */
  retour?: string;
  /** Démo du bouton « ? » ; par défaut, celle de l'écran courant. */
  aide?: string;
}) {
  const navigate = useNavigate();
  const { pathname, key } = useLocation();
  const demo = aide ?? AIDE.find(([re]) => re.test(pathname))?.[1];
  // Pas de flèche sur les écrans d'accueil ; ailleurs, retour à l'écran précédent (utile dans l'application installée)
  const avecRetour = !ACCUEILS.includes(pathname);
  const revenir = () => (key !== 'default' ? navigate(-1) : navigate(retour ?? '/'));
  return (
    <Group justify="space-between" align="flex-start" mb="lg" gap="sm">
      <Group gap="xs" align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
        {avecRetour && (
          <ActionIcon variant="subtle" size="lg" onClick={revenir} aria-label="Revenir à l'écran précédent" title="Retour" mt={2}>
            <IconArrowLeft />
          </ActionIcon>
        )}
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Title order={1} size="h2">{titre}</Title>
          {sousTitre && <Text c="dimmed">{sousTitre}</Text>}
        </Stack>
      </Group>
      {(actions || demo) && <Group gap="xs">{actions}{demo && <BoutonAide demo={demo} />}</Group>}
    </Group>
  );
}
