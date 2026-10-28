import { useState } from 'react';
import { Badge, Button, Card, CopyButton, Group, Modal, NumberInput, Select, Skeleton, Stack, Switch, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDoorEnter, IconKey, IconPlus, IconSettings } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useEspace } from '@/espace/EspaceProvider';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { useEspacesAdmin, useModifierEspaceAdmin, type EspaceAdmin } from './api';
import { EspaceForm } from './EspaceForm';
import { DemandesAcces, UtilisationPlateforme } from './DemandesAcces';
import { useUtilisation } from './api';
import { formatDateHeure } from '@/lib/format';
import { motDePasseProvisoire } from '@/lib/fonctions';
import { useReinitialiserMdp } from '@/features/utilisateurs/api';

const FORMULES = [
  { value: 'decouverte', label: 'Découverte (3 logements, gratuit)', max: 3 },
  { value: 'essentiel', label: 'Essentiel (15 logements, 5 000 FCFA/mois)', max: 15 },
  { value: 'pro', label: 'Pro (50 logements, 12 000 FCFA/mois)', max: 50 },
  { value: 'sur_mesure', label: 'Sur mesure', max: null },
];

export function EspacesPage() {
  const { data = [], isLoading } = useEspacesAdmin();
  const { changerEspace, espace: courant } = useEspace();
  const [ouvert, { open, close }] = useDisclosure(false);
  const [edition, setEdition] = useState<EspaceAdmin | null>(null);
  const navigate = useNavigate();
  const { data: utilisation } = useUtilisation();
  const reinit = useReinitialiserMdp();
  const [mdp, setMdp] = useState<{ nom: string; mdp: string } | null>(null);

  const reinitialiser = async (e: EspaceAdmin) => {
    const nouveau = motDePasseProvisoire();
    try {
      await reinit.mutateAsync({ user_id: e.proprietaire_id!, nouveau_mot_de_passe: nouveau });
      setMdp({ nom: e.proprietaire ?? e.nom, mdp: nouveau });
    } catch (err) {
      notifierErreur(err);
    }
  };

  return (
    <>
      <PageEntete titre="Administration" sousTitre="Les espaces des propriétaires"
        actions={<Button leftSection={<IconPlus size={18} />} onClick={open}>Créer un propriétaire</Button>} />
      <DemandesAcces />
      <UtilisationPlateforme />
      {isLoading ? <Skeleton h={200} /> : !data.length ? (
        <EtatVide titre="Aucun espace" message="Créez le premier propriétaire (par exemple votre père) et son espace." />
      ) : (
        <Stack gap="xs">
          {data.map((e) => (
            <Card key={e.id} withBorder radius="md" padding="md" style={{ opacity: e.actif ? 1 : 0.55 }}>
              <Group justify="space-between" wrap="wrap">
                <div>
                  <Group gap="xs">
                    <Text fw={800}>{e.nom}</Text>
                    <Badge variant="light">{e.prefixe_recu}</Badge>
                    <Badge variant="outline" color="gray">{FORMULES.find((f) => f.value === e.formule)?.label.split(' (')[0]}</Badge>
                    {!e.actif && <Badge color="red">Désactivé</Badge>}
                    {courant?.id === e.id && <Badge color="green">Espace ouvert</Badge>}
                  </Group>
                  <Text size="sm" c="dimmed">
                    {e.proprietaire ?? 'Sans propriétaire'} · {e.nb_logements} logement(s) · {e.nb_membres} compte(s)
                    {e.limites_actives ? ` · limite ${e.max_logements} logements` : ''}
                    {utilisation?.activite[e.id] ? ` · dernière activité le ${formatDateHeure(utilisation.activite[e.id]!)}` : ''}
                  </Text>
                </div>
                <Group gap="xs">
                  <Button variant="light" leftSection={<IconDoorEnter size={18} />} onClick={() => { changerEspace(e.id); navigate('/'); }}>
                    Entrer dans cet espace
                  </Button>
                  <Button variant="default" leftSection={<IconSettings size={18} />} onClick={() => setEdition(e)}>Formule</Button>
                  {e.proprietaire_id && (
                    <Button variant="default" leftSection={<IconKey size={18} />} loading={reinit.isPending && reinit.variables?.user_id === e.proprietaire_id}
                      onClick={() => reinitialiser(e)}>
                      Mot de passe
                    </Button>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
      <EspaceForm opened={ouvert} onClose={close} />
      {edition && <FormuleDialog espace={edition} onClose={() => setEdition(null)} />}
      <Modal opened={!!mdp} onClose={() => setMdp(null)} title="Nouveau mot de passe provisoire">
        <Stack>
          <Text>Pour <b>{mdp?.nom}</b> : <b style={{ fontFamily: 'monospace', fontSize: 18 }}>{mdp?.mdp}</b></Text>
          <Text size="sm" c="dimmed">
            Il devra le changer à sa prochaine connexion. Sa double authentification, s'il l'avait activée, est retirée.
            Ce mot de passe ne sera plus affiché.
          </Text>
          <Group justify="flex-end">
            <CopyButton value={mdp?.mdp ?? ''}>{({ copied, copy }) => <Button variant="light" onClick={copy}>{copied ? 'Copié !' : 'Copier'}</Button>}</CopyButton>
            <Button onClick={() => setMdp(null)}>Fermer</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function FormuleDialog({ espace, onClose }: { espace: EspaceAdmin; onClose: () => void }) {
  const [formule, setFormule] = useState(espace.formule);
  const [limites, setLimites] = useState(espace.limites_actives);
  const [max, setMax] = useState<number | string>(espace.max_logements ?? FORMULES.find((f) => f.value === espace.formule)?.max ?? '');
  const [actif, setActif] = useState(espace.actif);
  const modifier = useModifierEspaceAdmin();
  return (
    <Modal opened onClose={onClose} title={`Formule de ${espace.nom}`}>
      <Stack>
        <Select label="Formule" data={FORMULES} value={formule} allowDeselect={false}
          onChange={(v) => { setFormule(v!); const m = FORMULES.find((f) => f.value === v)?.max; if (m) setMax(m); }} />
        <Switch label="Appliquer la limite de logements" checked={limites} onChange={(e) => setLimites(e.currentTarget.checked)} />
        {limites && <NumberInput label="Nombre maximum de logements" min={1} value={max} onChange={setMax} />}
        <Text size="xs" c="dimmed">Aucune facturation n'est faite dans cette version : la formule sert au suivi et aux limites.</Text>
        <Switch label="Espace actif (désactivé = plus personne ne peut s'y connecter)" checked={actif} color="green"
          onChange={(e) => setActif(e.currentTarget.checked)} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Annuler</Button>
          <Button loading={modifier.isPending} onClick={() => modifier.mutate(
            { id: espace.id, formule, limites_actives: limites, max_logements: limites && max ? Number(max) : null, actif },
            { onSuccess: () => { notifierSucces('Espace mis à jour'); onClose(); }, onError: notifierErreur },
          )}>Enregistrer</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
