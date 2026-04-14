import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { seedIfEmpty } from './seed/seed';
import { initAuth } from './db/auth';
import { startSyncWorker } from './lib/syncWorker';

// Seed IndexedDB on first load so the app always has demo data.
void seedIfEmpty();

// Fire-and-forget: initialize auth so the current session (if any) is
// available, then start the sync worker. Worker is a no-op when Supabase
// isn't configured, so this is safe to run unconditionally.
void initAuth().then(() => {
  startSyncWorker();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
