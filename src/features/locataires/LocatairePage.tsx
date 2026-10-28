import { useEffect, useState } from 'react';
import {
  ActionIcon, Badge, Button, Card, Divider, Group, Menu, Modal, SimpleGrid, Skeleton, Stack, Text, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBrandWhatsapp, IconCash, IconDots, IconDoorExit, IconEdit, IconKey, IconPhone, IconShieldCheck, IconTrash,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router';
import { useEspaceCourant } from '@/espace/EspaceProvider';
import { peut } from '@/espace/droits';
import { formatDate, formatFCFA, formatMois, LIBELLE_MODE } from '@/lib/format';
import { aujourdhui, premierDuMois } from '@/lib/dates';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { lienWhatsApp } from '@/lib/telephone';
import { PageEntete } from '@/layout/PageEntete';
import { EtatVide } from '@/ui/EtatVide';
import { StatutBadge } from '@/ui/StatutBadge';
import { MontantInput } from '@/ui/MontantInput';
import { useSupprimer } from '@/ui/ConfirmationSuppression';
import { useEncaisser } from '@/features/encaissement/EncaissementContext';
import { ActionsRecu } from '@/features/recus/ActionsRecu';
import { ActionsPaiement } from '@/features/demandes/ActionsPaiement';
import { EtiquettesReprise } from '@/features/reprise/Etiquettes';
import { BailForm } from '@/features/baux/BailForm';
import { FinBailDialog } from '@/features/baux/FinBailDialog';
import { CautionDialog } from '@/features/baux/CautionDialog';
import { useRevisionLoyer } from '@/features/baux/api';
import { MonthPickerInput } from '@mantine/dates';
import { useLocataire, type BailDetail } from './api';
import { LocataireForm } from './LocataireForm';
import { BlocsOrdonnes, BoutonPersonnaliser } from '@/perso/Personnaliser';
import { useAffichage, type DefBloc } from '@/perso/useAffichage';
import { journaliser } from '@/lib/audit';
import { HistoriqueFiche } from '@/features/admin/audit/HistoriqueFiche';

const BLOCS: DefBloc[] = [
  { cle: 'baux', libelle: 'Logement loué et Encaisser', essentiel: true },
  { cle: 'coordonnees', libelle: 'Coordonnées', mobile: true },
  { cle: 'paiements', libelle: 'Historique des paiements', mobile: true },
  { cle: 'caution', libelle: 'Caution', mobile: true },
  { cle: 'anciens_baux', libelle: 'Anciens baux', mobile: true },
];

export function LocatairePage() {
  const { id } = useParams();
  const espace = useEspaceCourant();
  const { data, isLoading } = useLocataire(id);
  const { ouvrir } = useEncaisser();
  const navigate = useNavigate();
  const supprimer = useSupprimer();
  const [edition, editionForm] = useDisclosure(false);
  const [nouveauBail, nouveauBailForm] = useDisclosure(false);
  const [finBail, setFinBail] = useState<BailDetail | null>(null);
  const [caution, setCaution] = useState<{ bail: BailDetail; sens: 'versement' | 'restitution' } | null>(null);
  const [revision, setRevision] = useState<BailDetail | null>(null);
  const affichage = useAffichage('locataire', BLOCS);
  const nomJournal = data ? `${data.locataire.nom} ${data.locataire.prenoms ?? ''}`.trim() : null;
  useEffect(() => {
    if (id && nomJournal) journaliser('consultation_locataire', { espace: espace.id, table: 'locataires', id, libelle: nomJournal });
  }, [id, nomJournal, espace.id]);

  if (isLoading) return <Skeleton h={300} />;
  if (!data || data.locataire.supprime_le) {
    return <EtatVide titre="Locataire introuvable" message="Il a peut-être été mis à la corbeille." />;
  }
  const { locataire, baux, paiements, mouvements } = data;
  const nom = `${locataire.nom} ${locataire.prenoms ?? ''}`.trim();
  const gerer = peut('gerer_baux', espace.role);
  const encaisser = peut('encaisser', espace.role);
  const actifs = baux.filter((b) => !b.date_fin);

  return (
    <>
      <PageEntete
        retour="/locataires"
        titre={nom}
        sousTitre={locataire.profession ?? undefined}
        actions={<>
          <BoutonPersonnaliser affichage={affichage} />
          {gerer && (
            <Menu position="bottom-end">
              <Menu.Target><ActionIcon variant="default" size="lg" aria-label="Plus"><IconDots /></ActionIcon></Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={16} />} onClick={editionForm.open}>Modifier les informations</Menu.Item>
                <Menu.Item leftSection={<IconKey size={16} />} onClick={nouveauBailForm.open}>Louer un autre logement</Menu.Item>
                <Menu.Item color="red" leftSection={<IconTrash size={16} />}
                  onClick={() => supprimer({ table: 'locataires', id: locataire.id, libelle: nom, type: 'le locataire', apres: () => navigate('/locataires') })}>
                  {peut('supprimer', espace.role) ? 'Mettre à la corbeille' : 'Demander la suppression'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </>}
      />

      <BlocsOrdonnes affichage={affichage} rendus={{
        baux: actifs.length > 0 && (
        <Stack gap="lg">
        {actifs.map((b) => (
          <Card key={b.id} withBorder radius="lg" padding="lg" style={{ borderColor: 'var(--mantine-color-espace-3)' }}>
            <Group justify="space-between" align="flex-start" mb="sm">
              <div>
                <Text fw={800} size="lg">{b.logement.maison.nom} · {b.logement.designation}</Text>
                <Text size="sm" c="dimmed">Loyer {formatFCFA(b.situation?.loyer ?? b.loyer)} / mois · depuis le {formatDate(b.date_debut)}</Text>
              </div>
              {b.situation && <StatutBadge statut={b.situation.statut} nbMois={b.situation.nb_mois_retard} />}
            </Group>
            <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
              <Bloc libelle="Dernier mois payé" valeur={b.situation?.dernier_mois_solde ? formatMois(b.situation.dernier_mois_solde) : 'Aucun'} />
              <Bloc libelle="Prochain mois dû" valeur={b.situation?.prochain_mois_du ? formatMois(b.situation.prochain_mois_du) : '—'} />
              <Bloc libelle="Reste à payer" valeur={formatFCFA(b.situation?.montant_du ?? 0)} accent={(b.situation?.montant_du ?? 0) > 0} />
            </SimpleGrid>
            <Group mt="md" gap="xs">
              {encaisser && (
                <Button leftSection={<IconCash size={18} />} onClick={() => ouvrir({ bailId: b.id })}>Encaisser</Button>
              )}
              {gerer && (
                <Menu>
                  <Menu.Target><Button variant="default" rightSection={<IconDots size={16} />}>Bail</Button></Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setRevision(b)}>Changer le loyer</Menu.Item>
                    <Menu.Item leftSection={<IconShieldCheck size={16} />} onClick={() => setCaution({ bail: b, sens: 'versement' })}>
                      Encaisser une caution
                    </Menu.Item>
                    <Menu.Item leftSection={<IconDoorExit size={16} />} onClick={() => setFinBail(b)}>Enregistrer le départ</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </Group>
            {b.caution_detenue > 0 && (
              <Group mt="sm" gap="xs">
                <Text size="sm">Caution détenue : <b>{formatFCFA(b.caution_detenue)}</b></Text>
                {gerer && <Button size="xs" variant="subtle" onClick={() => setCaution({ bail: b, sens: 'restitution' })}>Rendre la caution</Button>}
              </Group>
            )}
          </Card>
        ))}
        </Stack>
        ),
        coordonnees: (
        <Card withBorder radius="lg" padding="lg">
          <Title order={3} size="h4" mb="sm">Coordonnées</Title>
          <Stack gap={6}>
            <Text>{locataire.telephone ?? 'Pas de téléphone'}{locataire.telephone2 ? ` · ${locataire.telephone2}` : ''}</Text>
            {locataire.email && <Text>{locataire.email}</Text>}
            {locataire.piece_type && <Text size="sm" c="dimmed">{locataire.piece_type} {locataire.piece_numero}</Text>}
            {locataire.contact_urgence && <Text size="sm" c="dimmed">Urgence : {locataire.contact_urgence}</Text>}
          </Stack>
          {locataire.telephone && (
            <Group mt="md" gap="xs">
              <Button component="a" href={`tel:${locataire.telephone}`} variant="light" leftSection={<IconPhone size={18} />}>Appeler</Button>
              <Button component="a" href={lienWhatsApp(locataire.telephone)} target="_blank" variant="light" color="green"
                leftSection={<IconBrandWhatsapp size={18} />}>WhatsApp</Button>
            </Group>
          )}
        </Card>
        ),
        paiements: (
        <Card withBorder radius="lg" padding="lg">
          <Title order={3} size="h4" mb="sm">Historique des paiements</Title>
          {!paiements.length && <Text c="dimmed">Aucun paiement enregistré.</Text>}
          <Stack gap={0}>
            {paiements.map((p, i) => (
              <div key={p.id}>
                {i > 0 && <Divider />}
                <Group justify="space-between" py="sm" wrap="nowrap" align="flex-start">
                  <Stack gap={2} style={{ minWidth: 0, opacity: p.statut === 'annule' ? 0.55 : 1 }}>
                    <Text fw={700} td={p.statut === 'annule' ? 'line-through' : undefined}>
                      {p.mois.map((m) => formatMois(m)).join(', ') || '—'}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {formatDate(p.date_paiement)} · {LIBELLE_MODE[p.mode]} · par {p.reprise?.encaisseur ?? p.encaisse_par_nom}
                      {p.payeur !== nom ? ` · payé par ${p.payeur}` : ''}
                      {p.reprise ? ' · ancien logiciel' : ''}
                    </Text>
                    {p.statut === 'valide' && <EtiquettesReprise etiquettes={p.a_verifier} />}
                    {p.statut === 'annule' && <Badge color="red" variant="light" size="sm">Annulé : {p.motif_annulation}</Badge>}
                    {p.remise > 0 && <Text size="xs" c="dimmed">Remise accordée : {formatFCFA(p.remise)}</Text>}
                  </Stack>
                  <Group gap={4} wrap="nowrap">
                    <Text fw={700} className="montant">{formatFCFA(p.montant)}</Text>
                    {p.recu && <ActionsRecu recu={p.recu} telephone={locataire.telephone} etat={{ annule: p.statut === 'annule' }} />}
                    {p.statut === 'valide' && <ActionsPaiement paiement={p} />}
                  </Group>
                </Group>
              </div>
            ))}
          </Stack>
        </Card>
        ),
        caution: mouvements.length > 0 && (
          <Card withBorder radius="lg" padding="lg">
            <Title order={3} size="h4" mb="sm">Caution</Title>
            {mouvements.map((m) => (
              <Group key={m.id} justify="space-between" py={6}>
                <Text size="sm">
                  {formatDate(m.date_mouvement)} · {m.type === 'versement' ? 'Versée' : m.type === 'remboursement' ? 'Remboursée' : 'Retenue'}
                  {m.motif ? ` (${m.motif})` : ''}
                </Text>
                <Group gap={4}>
                  <Text fw={600} className="montant">{formatFCFA(m.montant)}</Text>
                  {m.recu && <ActionsRecu recu={m.recu} telephone={locataire.telephone} />}
                </Group>
              </Group>
            ))}
          </Card>
        ),
        anciens_baux: baux.some((b) => b.date_fin) && (
          <Card withBorder radius="lg" padding="lg">
            <Title order={3} size="h4" mb="sm">Anciens baux</Title>
            {baux.filter((b) => b.date_fin).map((b) => (
              <Group key={b.id} justify="space-between" py={6}>
                <Text size="sm">{b.logement.maison.nom} · {b.logement.designation} — du {formatDate(b.date_debut)} au {formatDate(b.date_fin)}</Text>
                {(b.situation?.montant_du ?? 0) > 0 && (
                  <Group gap="xs">
                    <Text size="sm" c="orange" fw={700}>{formatFCFA(b.situation!.montant_du)} dus</Text>
                    {encaisser && <Button size="xs" onClick={() => ouvrir({ bailId: b.id })}>Encaisser</Button>}
                  </Group>
                )}
              </Group>
            ))}
          </Card>
        ),
      }} />
      <HistoriqueFiche cibles={[
        { table: 'locataires', ids: [locataire.id] },
        { table: 'baux', ids: baux.map((b) => b.id) },
        { table: 'paiements', ids: paiements.map((p) => p.id) },
      ]} />

      <LocataireForm opened={edition} onClose={editionForm.close} locataire={locataire} />
      {nouveauBail && <BailForm opened onClose={nouveauBailForm.close} locataireId={locataire.id} />}
      {finBail && (
        <FinBailDialog opened onClose={() => setFinBail(null)} bailId={finBail.id}
          montantDu={finBail.situation?.montant_du ?? 0} cautionDetenue={finBail.caution_detenue} />
      )}
      {caution && (
        <CautionDialog opened onClose={() => setCaution(null)} bailId={caution.bail.id} sens={caution.sens}
          detenue={caution.bail.caution_detenue} />
      )}
      {revision && <RevisionDialog bail={revision} onClose={() => setRevision(null)} />}
    </>
  );
}

function Bloc({ libelle, valeur, accent }: { libelle: string; valeur: string; accent?: boolean }) {
  return (
    <Card radius="md" bg={accent ? 'orange.0' : 'gray.0'} padding="sm">
      <Text size="sm" c="dimmed">{libelle}</Text>
      <Text fw={800} size="lg" c={accent ? 'orange.8' : undefined} className="montant">{valeur}</Text>
    </Card>
  );
}

function RevisionDialog({ bail, onClose }: { bail: BailDetail; onClose: () => void }) {
  const [mois, setMois] = useState<string | null>(premierDuMois(aujourdhui()));
  const [montant, setMontant] = useState<number | null>(bail.situation?.loyer ?? bail.loyer);
  const reviser = useRevisionLoyer();
  const valider = async () => {
    if (!mois || !montant) return;
    try {
      await reviser.mutateAsync({ bailId: bail.id, moisEffet: premierDuMois(mois), montant });
      notifierSucces('Nouveau loyer enregistré');
      onClose();
    } catch (e) {
      notifierErreur(e);
    }
  };
  return (
    <Modal opened onClose={onClose} title="Changer le loyer">
      <Stack>
        <MonthPickerInput label="À partir du mois de" value={mois} onChange={setMois} valueFormat="MMMM YYYY" />
        <MontantInput label="Nouveau loyer mensuel" value={montant} onChange={setMontant} />
        <Text size="sm" c="dimmed">Les mois précédents gardent l'ancien montant.</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Annuler</Button>
          <Button onClick={valider} loading={reviser.isPending} disabled={!mois || !montant}>Enregistrer</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
