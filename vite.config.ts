import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Camera/microphone access (`getUserMedia`) is only exposed by browsers in a
 * "secure context" — https, or the exact host `localhost`/`127.0.0.1`. Plain
 * http on a LAN IP (e.g. opening the dev server from another machine at
 * `http://192.168.x.x:3000`, which `allowedHosts: true` below deliberately
 * permits) is NOT secure, so Meet's camera/mic request fails outright there
 * — this is a browser policy, not a bug in the app.
 *
 * `./certs/dev-key.pem` + `dev-cert.pem` are a self-signed cert generated for
 * `localhost`/`127.0.0.1`/the dev LAN IP (see certs/README or regenerate with
 * the openssl command below). They are optional: if absent, the server falls
 * back to plain http exactly as before, so a fresh checkout still runs.
 *
 *   openssl req -x509 -newkey rsa:2048 -nodes \
 *     -keyout certs/dev-key.pem -out certs/dev-cert.pem -days 825 \
 *     -subj "/CN=drive-osx-dev" \
 *     -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:<your-lan-ip>"
 *
 * Visiting the resulting `https://` origin, the browser will warn that the
 * certificate is self-signed — this is expected for local dev; proceed past
 * it once per browser/device, which is the only way to satisfy "secure
 * context" without a real CA-issued certificate for a private IP.
 */
function devHttps() {
  const keyPath = path.resolve(__dirname, 'certs/dev-key.pem');
  const certPath = path.resolve(__dirname, 'certs/dev-cert.pem');
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) return undefined;
  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

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
      https: devHttps(),
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
