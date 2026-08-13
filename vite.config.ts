import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // Disable HMR and file watching when requested by the environment.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/v1': {
          target: 'http://drive-osx-api:7000',
          changeOrigin: true,
        },
        // Realtime gateway: meeting signalling and notification delivery.
        // `ws: true` is what makes the dev server perform the HTTP upgrade —
        // without it this path 404s and every socket fails to connect, which
        // is why realtime worked behind the production nginx (which does proxy
        // /ws) but never in development.
        '/ws': {
          target: 'ws://drive-osx-api:7000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
