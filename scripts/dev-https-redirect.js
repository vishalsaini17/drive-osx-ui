// Dev-only convenience: browsers default to http:// on port 80 when a URL is
// typed with no scheme and no port (e.g. just "192.168.1.74"). The app itself
// is https-only (see vite.config.ts's dev TLS cert), so without this, that
// habitual bare-address typing hits a plain port 80 with nothing listening —
// or, worse, silently degrades — instead of reaching the app at all.
//
// This is a plain 301 redirect to the same host the browser actually asked
// for, on the app's https port, so it works for localhost, the LAN IP, or
// any other host the compose network answers to, without hardcoding one.
const http = require('http');

const PORT = Number(process.env.PORT || 80);
const TARGET_HTTPS_PORT = process.env.TARGET_HTTPS_PORT || 3000;

http
  .createServer((req, res) => {
    const host = (req.headers.host || 'localhost').split(':')[0];
    res.writeHead(301, { Location: `https://${host}:${TARGET_HTTPS_PORT}${req.url || ''}` });
    res.end();
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`dev-https-redirect: :${PORT} -> https://<host>:${TARGET_HTTPS_PORT}`);
  });
