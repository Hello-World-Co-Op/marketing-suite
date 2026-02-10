import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './utils/i18n'; // Initialize i18next before rendering
import './index.css';

// Production environment validation
if (import.meta.env.PROD) {
  const required = ['VITE_USER_SERVICE_CANISTER_ID', 'VITE_IC_HOST'];
  const missing = required.filter(key => !import.meta.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

const rootElement = document.getElementById('root')!;

// If the root element has pre-rendered content (from the build-time prerender step),
// use hydrateRoot so React attaches event handlers to existing DOM.
// Otherwise, use createRoot for a fresh render (e.g., during development).
if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(
    rootElement,
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
