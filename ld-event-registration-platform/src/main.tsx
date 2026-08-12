import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initMonitoring, captureError } from './lib/monitoring';
// Self-hosted fonts (variable), bundled so the app never depends on Google Fonts at
// runtime — required behind the internal proxy + the `font-src 'self'` CSP. Inter is the
// body/UI face; Sora is the display face for headings/titles in the dark employee app.
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import './styles.css';

initMonitoring();

window.addEventListener('unhandledrejection', (event) => {
  captureError(event.reason, { operation: 'unhandledRejection' });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
