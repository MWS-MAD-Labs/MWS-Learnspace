import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const root = createRoot(document.getElementById('root')!);
const render = (content: ReactNode) =>
  root.render(<StrictMode>{content}</StrictMode>);

const legacyExportEnabled =
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_LEGACY_EXPORT_TOOL === 'true' &&
  window.location.pathname === '/__dev/legacy-export';

if (legacyExportEnabled) {
  import('./dev/legacy-export/LegacyExportTool.tsx').then(({ default: Tool }) =>
    render(<Tool />),
  );
} else {
  import('./App.tsx').then(({ default: App }) => render(<App />));
}
