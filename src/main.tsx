import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { scrubDemoIdentity, seedIfEmpty } from './seed/seed';

async function bootstrap() {
  // Seed before the first route reads IndexedDB so the demo never opens empty.
  await seedIfEmpty();
  await scrubDemoIdentity();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
