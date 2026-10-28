import { useEffect, useState } from 'react';
import { Alert, Button, Center, Code, Image, Loader, Paper, PinInput, Stack, Text, Title } from '@mantine/core';
import { IconShieldLock } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/erreurs';
import { useAuth } from './AuthProvider';
import { journaliser } from '@/lib/audit';

/** Saisie du code à 6 chiffres (session déjà protégée par la double authentification). */
export function SaisieCodePage() {
  const { seDeconnecter, rechargerNiveau } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const valider = async (valeur = code) => {
    if (valeur.length !== 6) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const { data: facteurs, error: e1 } = await supabase.auth.mfa.listFactors();
      if (e1) throw e1;
      const totp = facteurs.totp.find((f) => f.status === 'verified');
      if (!totp) throw new Error('Aucune application d’authentification enregistrée.');
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: valeur });
      if (error) throw new Error('Code incorrect ou expiré. Saisissez le nouveau code affiché.');
      await rechargerNiveau();
      navigate('/', { replace: true });
    } catch (e) {
      setErreur(messageErreur(e));
      setCode('');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Cadre titre="Code de sécurité" texte="Ouvrez votre application d'authentification (Google Authenticator, Microsoft Authenticator…) et saisissez le code à 6 chiffres.">
      {erreur && <Alert color="red">{erreur}</Alert>}
      <Center>
        <PinInput length={6} type="number" oneTimeCode size="lg" value={code} autoFocus
          onChange={setCode} onComplete={(v) => void valider(v)} disabled={envoi} />
      </Center>
      <Button onClick={() => valider()} loading={envoi} disabled={code.length !== 6}>Valider</Button>
      <Button variant="subtle" color="gray" onClick={seDeconnecter}>Se déconnecter</Button>
    </Cadre>
  );
}

/** Activation de la double authentification (obligatoire pour le super admin). */
export function ActivationDoubleAuthPage() {
  const { profil, rechargerNiveau, seDeconnecter } = useAuth();
  const navigate = useNavigate();
  return (
    <Cadre
      titre="Protégez votre compte"
      texte={profil?.est_super_admin
        ? 'Votre compte administrateur peut tout faire : la double authentification est obligatoire.'
        : 'Ajoutez un code de sécurité à votre connexion.'}
    >
      <EnrolementTotp onTermine={async () => { await rechargerNiveau(); navigate('/', { replace: true }); }} />
      <Button variant="subtle" color="gray" onClick={seDeconnecter}>Se déconnecter</Button>
    </Cadre>
  );
}

/** QR code + vérification du premier code. Réutilisé dans « Mon profil ». */
export function EnrolementTotp({ onTermine }: { onTermine: () => void | Promise<void> }) {
  const [facteur, setFacteur] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      // Nettoie une tentative précédente non terminée
      const { data: existants } = await supabase.auth.mfa.listFactors();
      for (const f of existants?.all ?? []) {
        if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        // Nom unique : deux tentatives le même jour (ou un double montage) ne doivent pas entrer en conflit
        friendlyName: `Mes Loyers ${new Date().toISOString().slice(0, 10)} ${crypto.randomUUID().slice(0, 6)}`,
      });
      if (annule) return;
      if (error) setErreur(messageErreur(error));
      else setFacteur({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
    return () => { annule = true; };
  }, []);

  const valider = async (valeur = code) => {
    if (!facteur || valeur.length !== 6) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: facteur.id, code: valeur });
      if (error) throw new Error('Code incorrect. Vérifiez que l’heure de votre téléphone est juste et réessayez.');
      journaliser('double_auth_activee');
      await onTermine();
    } catch (e) {
      setErreur(messageErreur(e));
      setCode('');
    } finally {
      setEnvoi(false);
    }
  };

  if (!facteur && !erreur) return <Center><Loader /></Center>;
  return (
    <Stack>
      {erreur && <Alert color="red">{erreur}</Alert>}
      {facteur && (
        <>
          <Text size="sm"><b>1.</b> Installez <b>Google Authenticator</b> ou <b>Microsoft Authenticator</b> sur votre téléphone.</Text>
          <Text size="sm"><b>2.</b> Dans l'application, touchez « + » puis « Scanner un code QR » :</Text>
          <Center><Image src={facteur.qr} w={200} h={200} alt="QR code" bg="white" p="xs" radius="md" /></Center>
          <Text size="xs" c="dimmed" ta="center">Impossible de scanner ? Saisissez cette clé : <Code>{facteur.secret}</Code></Text>
          <Text size="sm"><b>3.</b> Saisissez le code à 6 chiffres affiché :</Text>
          <Center>
            <PinInput length={6} type="number" oneTimeCode size="lg" value={code}
              onChange={setCode} onComplete={(v) => void valider(v)} disabled={envoi} />
          </Center>
          <Button onClick={() => valider()} loading={envoi} disabled={code.length !== 6}>Activer</Button>
        </>
      )}
    </Stack>
  );
}

function Cadre({ titre, texte, children }: { titre: string; texte: string; children: React.ReactNode }) {
  return (
    <Center mih="100vh" p="md">
      <Paper withBorder radius="lg" p="lg" w="100%" maw={440}>
        <Stack>
          <Center><IconShieldLock size={44} color="var(--mantine-color-espace-filled)" /></Center>
          <Title order={2} size="h3" ta="center">{titre}</Title>
          <Text c="dimmed" size="sm" ta="center">{texte}</Text>
          {children}
        </Stack>
      </Paper>
    </Center>
  );
}
