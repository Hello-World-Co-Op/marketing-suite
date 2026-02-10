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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
