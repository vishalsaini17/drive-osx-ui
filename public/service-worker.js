/*
 * Service worker for the Drive OSX shell.
 *
 * Scope is deliberately narrow (CLAUDE.md §18): it makes the shell itself
 * available offline and serves cached GET responses for read-only API calls
 * when the network is gone. It never caches mutations and never invents a
 * successful response — writes are the sync engine's job, and a cached read is
 * always reported to the page as coming from the cache.
 */
const VERSION = 'v1';
const SHELL_CACHE = `drive-osx-shell-${VERSION}`;
const DATA_CACHE = `drive-osx-data-${VERSION}`;

const SHELL_ASSETS = ['/', '/index.html'];

// Read-only endpoints whose last response is worth keeping for offline use.
const CACHEABLE_API_PATTERNS = [
  /\/api\/v1\/files\/children/,
  /\/api\/v1\/files\/starred/,
  /\/api\/v1\/files\/pinned/,
  /\/api\/v1\/files\/recent/,
  /\/api\/v1\/profile/,
  /\/api\/v1\/organizations$/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, url));
    return;
  }

  // Navigations fall back to the cached shell so the OS still boots offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((cached) => cached ?? offlineResponse())),
    );
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request, url) {
  const cacheable = CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url.pathname));

  try {
    const response = await fetch(request);
    if (cacheable && response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (!cacheable) throw error;

    const cached = await caches.match(request);
    if (!cached) throw error;

    // Mark the response so the page knows it is looking at cached data.
    const headers = new Headers(cached.headers);
    headers.set('X-Served-From', 'service-worker-cache');
    return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

function offlineResponse() {
  return new Response('Drive OSX is offline and no cached shell is available.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// The page asks the worker to drop cached tenant data on sign-out.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'clear-data-cache') {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});
