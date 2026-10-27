import type { ReactNode } from 'react';
import { Alert, Container, Stack, Text, Title } from '@mantine/core';
import { PublicLayout } from './PublicLayout';

const Section = ({ titre, children }: { titre: string; children: ReactNode }) => (
  <div>
    <Title order={2} size="h4" mb={6}>{titre}</Title>
    <Stack gap={6}>{children}</Stack>
  </div>
);

/** Conditions d'utilisation et politique de confidentialité : modèle à compléter (§6.1). */
export function ConditionsPage() {
  return (
    <PublicLayout>
      <Container size="md" py="xl">
        <Title order={1} size="h2" mb="md">Conditions d'utilisation et confidentialité</Title>
        <Alert color="orange" mb="lg">
          Modèle à compléter : les passages entre crochets [ ] doivent être remplis par l'éditeur avant l'ouverture au public.
        </Alert>
        <Stack gap="lg">
          <Section titre="1. Qui édite le service">
            <Text>Mes Loyers est édité par [nom ou raison sociale], [adresse], Bénin. Contact : [téléphone] · [e-mail].</Text>
          </Section>
          <Section titre="2. Le service">
            <Text>Mes Loyers permet à un propriétaire de gérer ses maisons, logements, locataires, baux, encaissements et reçus, seul ou avec des gestionnaires qu'il désigne.</Text>
            <Text>Chaque propriétaire dispose d'un espace séparé : les données d'un espace ne sont visibles que par les comptes de cet espace et par l'administrateur du service.</Text>
          </Section>
          <Section titre="3. Comptes et sécurité">
            <Text>Chaque utilisateur garde son mot de passe secret et le change à la première connexion. La double authentification est recommandée, et obligatoire pour l'administrateur.</Text>
            <Text>Le propriétaire est responsable des comptes qu'il crée pour ses gestionnaires et des droits qu'il leur donne.</Text>
          </Section>
          <Section titre="4. Formules et prix">
            <Text>Les formules et leurs prix sont affichés sur la page d'accueil. [Conditions de paiement, de résiliation et de remboursement à préciser.]</Text>
          </Section>
          <Section titre="5. Données personnelles">
            <Text><b>Données traitées</b> : identité et coordonnées des utilisateurs et des locataires, pièces d'identité (type et numéro), baux, paiements et reçus, journal des connexions (date, appareil, adresse IP).</Text>
            <Text><b>Finalité</b> : la gestion locative du propriétaire, la sécurité du service et la preuve des opérations. Les données ne sont ni vendues ni utilisées à des fins publicitaires.</Text>
            <Text><b>Responsable</b> : le propriétaire pour les données de ses locataires ; l'éditeur pour les comptes et le journal de sécurité.</Text>
            <Text><b>Hébergement</b> : Supabase (base de données et fichiers) et Cloudflare (site), [région d'hébergement à préciser].</Text>
            <Text><b>Durée de conservation</b> : tant que l'espace est actif, puis [durée] après sa fermeture. Le journal de sécurité est conservé [durée].</Text>
            <Text><b>Vos droits</b> : accès, rectification et suppression, en écrivant à [e-mail], conformément à la loi n° 2017-20 portant code du numérique en République du Bénin. Vous pouvez aussi saisir l'APDP (Autorité de protection des données personnelles).</Text>
          </Section>
          <Section titre="6. Reçus et vérification">
            <Text>Chaque reçu porte un code QR qui permet à quiconque de vérifier son authenticité. La page de vérification affiche le numéro, le propriétaire, la maison, les mois, la date, le montant et l'état du reçu ; du locataire, seulement ses initiales.</Text>
          </Section>
          <Section titre="7. Disponibilité et responsabilité">
            <Text>Le service est fourni en l'état. [Engagements de disponibilité, sauvegardes et limites de responsabilité à préciser.]</Text>
          </Section>
          <Text size="sm" c="dimmed">Dernière mise à jour : [date].</Text>
        </Stack>
      </Container>
    </PublicLayout>
  );
}
