import { useState } from 'react';
import { ActionIcon, Badge, Button, Card, CopyButton, Group, Menu, Modal, MultiSelect, Skeleton, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDots, IconHomeEdit, IconKey, IconUserOff, IconUserPlus, IconUserCheck } from '@tabler/icons-react';
import { LIBELLE_ROLE } from '@/lib/format';
import { motDePasseProvisoire } from '@/lib/fonctions';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { useMaisons } from '@/features/maisons/api';
import { useMembres, useModifierMembre, useReinitialiserMdp, type Membre } from './api';
import { UtilisateurForm } from './UtilisateurForm';

export function UtilisateursPage() {
  const { data = [], isLoading } = useMembres();
  const [ouvert, { open, close }] = useDisclosure(false);
  const modifier = useModifierMembre();
  const reinit = useReinitialiserMdp();
  const [mdp, setMdp] = useState<{ nom: string; mdp: string } | null>(null);
  const [maisonsDe, setMaisonsDe] = useState<Membre | null>(null);

  const reinitialiser = async (m: Membre) => {
    const nouveau = motDePasseProvisoire();
    try {
      await reinit.mutateAsync({ user_id: m.user_id, nouveau_mot_de_passe: nouveau });
      setMdp({ nom: m.nom_complet, mdp: nouveau });
    } catch (e) {
      notifierErreur(e);
    }
  };

  return (
    <>
      <PageEntete titre="Comptes" sousTitre="Les personnes qui ont accès à votre espace"
        actions={<Button leftSection={<IconUserPlus size={18} />} onClick={open}>Ajouter un compte</Button>} />
      {isLoading ? <Skeleton h={200} /> : !data.length ? <EtatVide titre="Aucun compte" /> : (
        <Stack gap="xs">
          {data.map((m) => (
            <Card key={m.user_id} withBorder radius="md" padding="md" style={{ opacity: m.actif ? 1 : 0.55 }}>
              <Group justify="space-between" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Group gap="xs">
                    <Text fw={700}>{m.nom_complet}</Text>
                    <Badge variant="light" color={m.role === 'proprietaire' ? 'espace' : m.role === 'gestionnaire' ? 'blue' : 'gray'}>
                      {LIBELLE_ROLE[m.role]}
                    </Badge>
                    {!m.actif && <Badge color="red" variant="outline">Désactivé</Badge>}
                  </Group>
                  <Text size="sm" c="dimmed">Identifiant : {m.identifiant}{m.telephone ? ` · ${m.telephone}` : ''}</Text>
                  {m.role !== 'proprietaire' && (
                    <Text size="sm" c="dimmed">
                      {m.role === 'gestionnaire' ? 'Maisons : ' : 'Portée : '}
                      {m.maisons.length ? m.maisons.map((x) => x.nom).join(', ') : m.role === 'gestionnaire' ? 'aucune' : 'toutes les maisons'}
                    </Text>
                  )}
                </div>
                {m.role !== 'proprietaire' && (
                  <Menu position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" size="lg" aria-label="Actions"><IconDots /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconHomeEdit size={16} />} onClick={() => setMaisonsDe(m)}>Changer les maisons</Menu.Item>
                      <Menu.Item leftSection={<IconKey size={16} />} onClick={() => reinitialiser(m)}>Réinitialiser le mot de passe</Menu.Item>
                      <Menu.Item
                        leftSection={m.actif ? <IconUserOff size={16} /> : <IconUserCheck size={16} />}
                        color={m.actif ? 'red' : undefined}
                        onClick={() => modifier.mutate({ m, actif: !m.actif }, {
                          onSuccess: () => notifierSucces(m.actif ? 'Compte désactivé : il ne peut plus accéder à votre espace' : 'Compte réactivé'),
                          onError: notifierErreur,
                        })}
                      >
                        {m.actif ? 'Désactiver' : 'Réactiver'}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      )}
      <UtilisateurForm opened={ouvert} onClose={close} />
      <Modal opened={!!mdp} onClose={() => setMdp(null)} title="Nouveau mot de passe provisoire">
        <Stack>
          <Text>Pour <b>{mdp?.nom}</b> : <b style={{ fontFamily: 'monospace', fontSize: 18 }}>{mdp?.mdp}</b></Text>
          <Text size="sm" c="dimmed">Il devra le changer à sa prochaine connexion. Ce mot de passe ne sera plus affiché.</Text>
          <Group justify="flex-end">
            <CopyButton value={mdp?.mdp ?? ''}>{({ copied, copy }) => <Button variant="light" onClick={copy}>{copied ? 'Copié !' : 'Copier'}</Button>}</CopyButton>
            <Button onClick={() => setMdp(null)}>Fermer</Button>
          </Group>
        </Stack>
      </Modal>
      {maisonsDe && <MaisonsDialog membre={maisonsDe} onClose={() => setMaisonsDe(null)} />}
    </>
  );
}

function MaisonsDialog({ membre, onClose }: { membre: Membre; onClose: () => void }) {
  const { data: maisons = [] } = useMaisons();
  const [choix, setChoix] = useState(membre.maisons.map((m) => m.id));
  const modifier = useModifierMembre();
  return (
    <Modal opened onClose={onClose} title={`Maisons de ${membre.nom_complet}`}>
      <Stack>
        <MultiSelect data={maisons.map((m) => ({ value: m.id, label: m.nom }))} value={choix} onChange={setChoix}
          label={membre.role === 'gestionnaire' ? 'Maisons confiées' : 'Limiter à ces maisons (vide = toutes)'} />
        {membre.role === 'gestionnaire' && (
          <Text size="sm" c="dimmed">Une maison n'a qu'un gestionnaire : la confier à {membre.nom_complet} la retire à son gestionnaire actuel.</Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Annuler</Button>
          <Button loading={modifier.isPending} onClick={() => modifier.mutate({ m: membre, maisons: choix }, {
            onSuccess: () => { notifierSucces('Maisons mises à jour'); onClose(); },
            onError: notifierErreur,
          })}>Enregistrer</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
