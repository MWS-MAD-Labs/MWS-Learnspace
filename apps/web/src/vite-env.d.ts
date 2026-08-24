/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_DEMO_ROLE_SWITCHER?: string;
  readonly VITE_FAKE_DATA_MODE?: string;
  readonly VITE_ENABLE_LEGACY_EXPORT_TOOL?: string;
}

declare const __APP_VERSION__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
