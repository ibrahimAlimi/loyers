import { useEffect, useRef } from 'react';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import SignaturePadLib from 'signature_pad';

/** Zone de signature au doigt ou à la souris ; exporte un PNG transparent. */
export function SignaturePad({ onValider, enCours }: { onValider: (blob: Blob) => void; enCours?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pad = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const ajuster = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      c.width = c.offsetWidth * ratio;
      c.height = c.offsetHeight * ratio;
      c.getContext('2d')!.scale(ratio, ratio);
      pad.current?.clear();
    };
    pad.current = new SignaturePadLib(c, { penColor: '#1e3a8a', minWidth: 1, maxWidth: 2.8 });
    ajuster();
    window.addEventListener('resize', ajuster);
    return () => {
      window.removeEventListener('resize', ajuster);
      pad.current?.off();
    };
  }, []);

  const valider = () => {
    if (!pad.current || pad.current.isEmpty()) return;
    canvas.current!.toBlob((b) => b && onValider(b), 'image/png');
  };

  return (
    <Stack gap="xs">
      <Paper withBorder radius="md" style={{ touchAction: 'none' }}>
        <canvas ref={canvas} style={{ width: '100%', height: 180, display: 'block' }} />
      </Paper>
      <Text size="xs" c="dimmed">Signez dans le cadre avec le doigt ou la souris.</Text>
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={() => pad.current?.clear()}>Effacer</Button>
        <Button onClick={valider} loading={enCours}>Valider la signature</Button>
      </Group>
    </Stack>
  );
}
