import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { applyDesignTokens } from './design-system/tokens';
import { startSyncEngine } from './platform/offline/sync-engine';
import { registerServiceWorker } from './platform/offline/service-worker-registration';
import './index.css';

// Platform services start before the shell renders: design tokens become CSS
// variables, queued offline work begins replaying, and the shell is cached for
// offline boot.
applyDesignTokens();
startSyncEngine();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
