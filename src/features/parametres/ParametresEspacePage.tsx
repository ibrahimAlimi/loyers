import { useState } from 'react';
import {
  Alert, Button, Card, ColorInput, Group, Image, NumberInput, SimpleGrid, Stack, Tabs, Text, TextInput, Title, UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconEye, IconStar } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { rafraichirDonnees } from '@/lib/queryClient';
import { envoyerFichier, useUrlFichier } from '@/lib/fichiers';
import { notifierErreur, notifierSucces } from '@/lib/erreurs';
import { aujourdhui, premierDuMois } from '@/lib/dates';
import { useAuth } from '@/auth/AuthProvider';
import { useEspace, useEspaceCourant } from '@/espace/EspaceProvider';
import { COULEURS_PROPOSEES, contrasteAvecBlanc, rendreLisible, THEMES } from '@/espace/theme';
import { PageEntete } from '@/layout/PageEntete';
import { ImageUpload } from '@/ui/ImageUpload';
import { SignaturePad } from '@/ui/SignaturePad';
import type { Recu } from '@/lib/types';
import { genererCachet } from './cachet';
import { ReafficherRappel } from './ReafficherRappel';
import { ApercuApplication } from './ApercuApplication';
import { IconesMenu } from './IconesMenu';

type Champ = 'logo_path' | 'cachet_path' | 'signature_path';
const FICHIER: Record<Champ, string> = { logo_path: 'logo.png', cachet_path: 'cachet.png', signature_path: 'signature.png' };

export function ParametresEspacePage() {
  const espace = useEspaceCourant();
  const { rafraichir } = useEspace();
  const { profil } = useAuth();
  const [params] = useSearchParams();
  const form = useForm({
    initialValues: {
      nom: espace.nom,
      ville: espace.ville ?? '',
      adresse: espace.adresse ?? '',
      telephone: espace.telephone ?? '',
      email: espace.email ?? '',
      couleur_primaire: espace.couleur_primaire,
      delai_retard_jours: espace.delai_retard_jours,
    },
    validate: { nom: (v) => (v.trim() ? null : "Donnez un nom à l'espace") },
  });

  const enregistrer = useMutation({
    mutationFn: async (v: typeof form.values) => {
      const { error } = await supabase.from('espaces').update({
        nom: v.nom.trim(), ville: v.ville.trim() || null, adresse: v.adresse.trim() || null,
        telephone: v.telephone.trim() || null, email: v.email.trim() || null,
        couleur_primaire: v.couleur_primaire, delai_retard_jours: v.delai_retard_jours,
      }).eq('id', espace.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      notifierSucces('Paramètres enregistrés');
      await rafraichirDonnees();
      rafraichir();
    },
    onError: notifierErreur,
  });

  const fichier = useMutation({
    mutationFn: async ({ champ, blob }: { champ: Champ; blob: Blob | null }) => {
      let chemin: string | null = null;
      if (blob) chemin = await envoyerFichier('espaces', `${espace.id}/${FICHIER[champ]}`, blob);
      else await supabase.storage.from('espaces').remove([`${espace.id}/${FICHIER[champ]}`]);
      const { error } = await supabase.from('espaces').update({ [champ]: chemin }).eq('id', espace.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      notifierSucces('Image enregistrée');
      await rafraichirDonnees();
      rafraichir();
    },
    onError: notifierErreur,
  });

  const [icones, setIcones] = useState<Record<string, string>>(espace.icones_menu ?? {});
  const logo = useUrlFichier('espaces', espace.logo_path);
  const apparenceModifiee = form.values.couleur_primaire !== espace.couleur_primaire
    || JSON.stringify(icones) !== JSON.stringify(espace.icones_menu ?? {});
  const apparence = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('espaces')
        .update({ couleur_primaire: form.values.couleur_primaire, icones_menu: icones }).eq('id', espace.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      notifierSucces('Apparence enregistrée');
      await rafraichirDonnees();
      rafraichir();
    },
    onError: notifierErreur,
  });

  const contraste = contrasteAvecBlanc(form.values.couleur_primaire);
  const [apercu, setApercu] = useState(false);
  const voirApercu = async () => {
    setApercu(true);
    try {
      const { genererRecuPdf } = await import('@/features/recus/pdf/genererPdf');
      const blob = await genererRecuPdf(recuFictif({ ...espace, nom: form.values.nom || espace.nom, couleur_primaire: form.values.couleur_primaire },
        profil?.nom_complet ?? ''), { duplicata: null });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) {
      notifierErreur(e);
    } finally {
      setApercu(false);
    }
  };

  return (
    <>
      <PageEntete titre="Paramètres de l'espace" sousTitre={`Préfixe des reçus : ${espace.prefixe_recu}`}
        actions={<Button variant="light" leftSection={<IconEye size={18} />} loading={apercu} onClick={voirApercu}>Aperçu du reçu</Button>} />
      <Tabs defaultValue={params.get('onglet') ?? 'infos'} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="infos">Informations</Tabs.Tab>
          <Tabs.Tab value="identite">Logo et couleur</Tabs.Tab>
          <Tabs.Tab value="signature">Signature et cachet</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="infos">
          <Card withBorder radius="lg" padding="lg" maw={720}>
            <form onSubmit={form.onSubmit((v) => enregistrer.mutate(v))}>
              <Stack>
                <TextInput label="Nom de l'espace (affiché sur les reçus)" placeholder="Ex. Immobilier Adjovi" {...form.getInputProps('nom')} />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label="Ville" {...form.getInputProps('ville')} />
                  <TextInput label="Adresse" {...form.getInputProps('adresse')} />
                  <TextInput label="Téléphone" inputMode="tel" {...form.getInputProps('telephone')} />
                  <TextInput label="E-mail" inputMode="email" {...form.getInputProps('email')} />
                </SimpleGrid>
                <NumberInput label="Jours de tolérance avant de compter un loyer en retard" min={0} max={60}
                  {...form.getInputProps('delai_retard_jours')} />
                <Group justify="flex-end"><Button type="submit" loading={enregistrer.isPending}>Enregistrer</Button></Group>
              </Stack>
            </form>
          </Card>
          <ReafficherRappel espaceId={espace.id} />
        </Tabs.Panel>

        <Tabs.Panel value="identite">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Stack>
              <Card withBorder radius="lg" padding="lg">
                <Title order={3} size="h4" mb="sm">Logo</Title>
                <ApercuImage chemin={espace.logo_path} />
                <Group mt="md" gap="xs">
                  <ImageUpload libelle="Envoyer un logo" enCours={fichier.isPending} onValider={(blob) => fichier.mutate({ champ: 'logo_path', blob })} />
                  {espace.logo_path && <Button variant="subtle" color="red" onClick={() => fichier.mutate({ champ: 'logo_path', blob: null })}>Retirer</Button>}
                </Group>
              </Card>
              <Card withBorder radius="lg" padding="lg">
                <Title order={3} size="h4" mb={4}>Couleurs</Title>
                <Text size="sm" c="dimmed" mb="sm">Choisissez un thème, ou votre propre couleur.</Text>
                <SimpleGrid cols={{ base: 2, xs: 5 }} spacing="xs" mb="md">
                  {THEMES.map((t) => {
                    const choisi = form.values.couleur_primaire.toLowerCase() === t.couleur;
                    return (
                      <UnstyledButton key={t.couleur} onClick={() => form.setFieldValue('couleur_primaire', t.couleur)}
                        aria-pressed={choisi}
                        style={{ border: `2px solid ${choisi ? t.couleur : 'var(--mantine-color-gray-3)'}`, borderRadius: 10, padding: 6 }}>
                        <div style={{ height: 26, borderRadius: 6, background: t.couleur, display: 'grid', placeItems: 'center' }}>
                          {choisi && <IconCheck size={16} color="white" />}
                        </div>
                        <Text size="xs" ta="center" mt={4} fw={choisi ? 700 : 500}>{t.nom}</Text>
                      </UnstyledButton>
                    );
                  })}
                </SimpleGrid>
                <ColorInput label="Couleur personnalisée" format="hex" swatches={COULEURS_PROPOSEES} swatchesPerRow={10} {...form.getInputProps('couleur_primaire')} />
                {contraste < 4.5 && (
                  <Alert color="orange" mt="sm">
                    Cette couleur rend le texte blanc difficile à lire.
                    <Button size="xs" variant="light" ml="sm" onClick={() => form.setFieldValue('couleur_primaire', rendreLisible(form.values.couleur_primaire))}>
                      Utiliser une version plus foncée
                    </Button>
                  </Alert>
                )}
              </Card>
              <IconesMenu valeur={icones} onChange={setIcones} couleur={form.values.couleur_primaire} />
              <Group justify="flex-end">
                <Button size="md" loading={apparence.isPending} disabled={!apparenceModifiee}
                  onClick={() => apparence.mutate()}>Enregistrer l'apparence</Button>
              </Group>
            </Stack>
            <div>
              <Stack style={{ position: 'sticky', top: 76 }}>
                <Group justify="space-between">
                  <Title order={3} size="h4">Aperçu en direct</Title>
                  <Button size="xs" variant="light" leftSection={<IconEye size={16} />} loading={apercu} onClick={voirApercu}>Aperçu du reçu</Button>
                </Group>
                <ApercuApplication couleur={form.values.couleur_primaire} nom={form.values.nom} logo={logo} icones={icones} />
                {apparenceModifiee && <Text size="sm" c="orange.8">Modifications non enregistrées.</Text>}
              </Stack>
            </div>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="signature">
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Card withBorder radius="lg" padding="lg">
              <Title order={3} size="h4" mb={4}>Signature du propriétaire</Title>
              <Text size="sm" c="dimmed" mb="sm">Elle apparaît sur les reçus que vous encaissez vous-même.</Text>
              <ApercuImage chemin={espace.signature_path} />
              <Stack mt="md">
                <SignaturePad enCours={fichier.isPending} onValider={(blob) => fichier.mutate({ champ: 'signature_path', blob })} />
                <Group gap="xs">
                  <Text size="sm">ou</Text>
                  <ImageUpload libelle="Envoyer une photo de la signature" retirerFondBlanc
                    onValider={(blob) => fichier.mutate({ champ: 'signature_path', blob })} />
                  {espace.signature_path && (
                    <Button variant="subtle" color="red" onClick={() => fichier.mutate({ champ: 'signature_path', blob: null })}>
                      Retirer (je signe à la main)
                    </Button>
                  )}
                </Group>
              </Stack>
            </Card>
            <Card withBorder radius="lg" padding="lg">
              <Title order={3} size="h4" mb={4}>Cachet</Title>
              <Text size="sm" c="dimmed" mb="sm">Il apparaît sur tous les reçus, y compris ceux des gestionnaires.</Text>
              <ApercuImage chemin={espace.cachet_path} />
              <Group mt="md" gap="xs">
                <ImageUpload libelle="Envoyer la photo du cachet" retirerFondBlanc enCours={fichier.isPending}
                  onValider={(blob) => fichier.mutate({ champ: 'cachet_path', blob })} />
                <Button variant="light" leftSection={<IconStar size={18} />}
                  onClick={async () => fichier.mutate({ champ: 'cachet_path', blob: await genererCachet(espace.nom, espace.ville, espace.couleur_primaire) })}>
                  Générer un cachet
                </Button>
                {espace.cachet_path && <Button variant="subtle" color="red" onClick={() => fichier.mutate({ champ: 'cachet_path', blob: null })}>Retirer</Button>}
              </Group>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

function ApercuImage({ chemin }: { chemin: string | null }) {
  const url = useUrlFichier('espaces', chemin);
  return (
    <Card withBorder radius="md" h={140} padding="xs" bg="gray.0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? <Image src={`${url}`} h={120} fit="contain" alt="" /> : <Text c="dimmed" size="sm">Aucune image</Text>}
    </Card>
  );
}

function recuFictif(e: ReturnType<typeof useEspaceCourant>, nomEncaissant: string): Recu {
  const mois = premierDuMois(aujourdhui());
  return {
    id: 'apercu', espace_id: e.id, type: 'loyer', paiement_id: null, mouvement_caution_id: null,
    numero: `${e.prefixe_recu}-${mois.slice(0, 4)}-000000`, code_verification: 'apercu', emis_le: new Date().toISOString(),
    nb_duplicatas: 0, original_genere: true, supprime_le: null,
    contenu: {
      type: 'loyer', numero: `${e.prefixe_recu}-${mois.slice(0, 4)}-000000`,
      espace: { id: e.id, nom: e.nom, ville: e.ville, adresse: e.adresse, telephone: e.telephone, email: e.email,
        logo_path: e.logo_path, cachet_path: e.cachet_path, couleur: e.couleur_primaire },
      logement: { immeuble: 'Arouna', quartier: 'Gbégamey', ville: e.ville, designation: 'En bas à droite N°2', niveau: 'Rez-de-chaussée', type: 'appartement', reference_bail: 'BAIL-ARO-002' },
      locataire: { nom_complet: 'Koffi Houngbo (exemple)', initiales: 'K. H.', telephone: null },
      payeur: 'Wahid Sanni', mode: 'mtn_momo', reference_transaction: 'MP261005.1042.A77', montant: 70000, remise: 0,
      motif_remise: null, mois: [mois], nb_mois: 1, date_paiement: aujourdhui(), loyer_mensuel: 70000,
      encaissant: { id: '', nom: nomEncaissant, role: 'proprietaire', signature_path: e.signature_path },
      situation: { paye_jusqua: mois, nb_mois_dus: 0, montant_du: 0 }, caution: null, emis_le: new Date().toISOString(),
    },
  };
}
