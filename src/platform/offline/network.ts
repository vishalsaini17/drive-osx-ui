/**
 * Network state as a first-class platform capability. `navigator.onLine` only
 * reports whether an interface exists, so reachability of the API is tracked
 * separately — a captive portal or a stopped backend is not "online" for us.
 */
export type NetworkStatus = 'online' | 'offline' | 'unreachable';

type Listener = (status: NetworkStatus) => void;

const listeners = new Set<Listener>();
let apiReachable = true;

function currentStatus(): NetworkStatus {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  return apiReachable ? 'online' : 'unreachable';
}

function notify(): void {
  const status = currentStatus();
  listeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // One bad subscriber must not stop the others from being told.
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Assume the API is reachable again; the next failed request corrects it.
    apiReachable = true;
    notify();
  });
  window.addEventListener('offline', notify);
}

export const network = {
  status: currentStatus,

  isOnline(): boolean {
    return currentStatus() === 'online';
  },

  /** Called by the API layer so UI state reflects real reachability. */
  reportReachable(reachable: boolean): void {
    if (apiReachable === reachable) return;
    apiReachable = reachable;
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(currentStatus());
    return () => listeners.delete(listener);
  },
};
