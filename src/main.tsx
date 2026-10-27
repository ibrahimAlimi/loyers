import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';

const racine = createRoot(document.getElementById('root')!);

// Import dynamique : une erreur de configuration (clés manquantes) affiche un message au lieu d'une page blanche.
import('./App')
  .then(({ App }) =>
    racine.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((e: Error) =>
    racine.render(
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '15vh auto', padding: 24, lineHeight: 1.5 }}>
        <h1 style={{ fontSize: 22 }}>L'application ne peut pas démarrer</h1>
        <p style={{ color: '#b91c1c' }}>{e.message}</p>
        <p style={{ color: '#6b7280' }}>Vérifiez le fichier .env.local, puis relancez « npm run dev ».</p>
      </div>,
    ),
  );
