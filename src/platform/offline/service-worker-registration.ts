/**
 * Registers the shell's service worker. Registration failures are logged and
 * ignored: the platform must still work without offline caching.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // In development the dev server owns module resolution; a worker caching
  // those responses causes confusing stale reloads.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.warn('Offline caching is unavailable:', error);
    });
  });
}

/** Called on sign-out so cached tenant data does not outlive the session. */
export function clearOfflineCaches(): void {
  navigator.serviceWorker?.controller?.postMessage({ type: 'clear-data-cache' });
}
