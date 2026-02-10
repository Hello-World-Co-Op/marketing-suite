/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IC_HOST: string;
  readonly VITE_AUTH_CANISTER_ID: string;
  readonly VITE_USER_SERVICE_CANISTER_ID: string;
  readonly VITE_NETWORK: string;
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
  readonly VITE_ORACLE_BRIDGE_URL: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_HOST: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_ANALYTICS_ENDPOINT: string;
  readonly VITE_DEV_AUTH_BYPASS: string;
  readonly VITE_E2E_AUTH_BYPASS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
