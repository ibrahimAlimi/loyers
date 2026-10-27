import { Badge, Button, Card, CloseButton, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck, IconPhoto, IconPhone, IconSignature, IconStar } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { notifierErreur } from '@/lib/erreurs';
import { useAuth } from '@/auth/AuthProvider';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';

type Cle = 'coordonnees' | 'logo' | 'signature' | 'cachet';

const ELEMENTS: { cle: Cle; titre: string; texte: string; pasBesoin: string; onglet: string; icone: typeof IconPhoto }[] = [
  { cle: 'coordonnees', titre: 'Vos coordonnées', texte: 'Téléphone et adresse, affichés en haut des reçus.', pasBesoin: 'Pas maintenant', onglet: 'infos', icone: IconPhone },
  { cle: 'logo', titre: 'Votre logo', texte: 'Facultatif. Sans logo, les initiales de votre espace s’affichent.', pasBesoin: 'Je n’ai pas de logo', onglet: 'identite', icone: IconPhoto },
  { cle: 'signature', titre: 'Votre signature', texte: 'Facultatif. Utile pour les reçus envoyés sur WhatsApp.', pasBesoin: 'Je signe à la main', onglet: 'signature', icone: IconSignature },
  { cle: 'cachet', titre: 'Votre cachet', texte: 'Facultatif. Vous pouvez aussi l’apposer après impression.', pasBesoin: 'Je le mets à la main', onglet: 'signature', icone: IconStar },
];

/** Rappel sur l'Accueil : éléments facultatifs de l'espace, chacun peut être écarté (« Pas besoin »). */
export function CompleterEspace() {
  const espace = useEspaceCourant();
  const { profil, rechargerProfil } = useAuth();
  const navigate = useNavigate();
  if (!peut('parametres_espace', espace.role) || !profil) return null;

  const prefs = (profil.preferences ?? {}) as { rappels_ecartes?: Record<string, Cle[] | 'tout'> };
  const ecartes = prefs.rappels_ecartes?.[espace.id];
  if (ecartes === 'tout') return null;

  const fait: Record<Cle, boolean> = {
    coordonnees: !!(espace.telephone && (espace.adresse || espace.ville)),
    logo: !!espace.logo_path,
    signature: !!espace.signature_path,
    cachet: !!espace.cachet_path,
  };
  const restants = ELEMENTS.filter((e) => !fait[e.cle] && !(ecartes ?? []).includes(e.cle));
  if (!restants.length) return null;

  const ecarter = async (valeur: Cle[] | 'tout') => {
    const nouvelles = { ...prefs, rappels_ecartes: { ...(prefs.rappels_ecartes ?? {}), [espace.id]: valeur } };
    const { error } = await supabase.from('profils').update({ preferences: nouvelles }).eq('id', profil.id);
    if (error) notifierErreur(error);
    else await rechargerProfil();
  };

  return (
    <Card withBorder radius="lg" padding="lg" style={{ borderColor: 'var(--mantine-color-espace-3)' }}>
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <div>
          <Title order={3} size="h4">Complétez votre espace</Title>
          <Text size="sm" c="dimmed">Pour des reçus encore plus professionnels. Rien n'est obligatoire.</Text>
        </div>
        <CloseButton aria-label="Masquer ce rappel" onClick={() => ecarter('tout')} />
      </Group>
      <Stack gap="sm" mt="sm">
        {restants.map((e) => (
          <Group key={e.cle} justify="space-between" wrap="wrap" gap="xs">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
              <ThemeIcon variant="light" radius="xl" size="lg"><e.icone size={20} /></ThemeIcon>
              <div style={{ minWidth: 0 }}>
                <Group gap={6}>
                  <Text fw={700}>{e.titre}</Text>
                  {e.cle !== 'coordonnees' && <Badge size="xs" variant="light" color="gray">Facultatif</Badge>}
                </Group>
                <Text size="sm" c="dimmed">{e.texte}</Text>
              </div>
            </Group>
            <Group gap="xs">
              <Button size="xs" onClick={() => navigate(`/parametres?onglet=${e.onglet}`)}>Ajouter</Button>
              <Button size="xs" variant="subtle" color="gray" leftSection={<IconCheck size={14} />}
                onClick={() => ecarter([...((ecartes as Cle[] | undefined) ?? []), e.cle])}>
                {e.pasBesoin}
              </Button>
            </Group>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
