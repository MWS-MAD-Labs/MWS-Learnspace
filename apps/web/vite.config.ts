import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const repositoryRoot = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, repositoryRoot, '');

  return {
    envDir: repositoryRoot,
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(
        process.env.npm_package_version ?? 'unknown',
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target:
            env.VITE_API_PROXY_TARGET ||
            `http://localhost:${env.PORT || '4000'}`,
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'jsdom',
      setupFiles: './test/setup.ts',
      include: ['test/**/*.test.{ts,tsx}'],
    },
  };
});
