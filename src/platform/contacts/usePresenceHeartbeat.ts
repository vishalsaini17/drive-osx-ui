import { useEffect } from 'react';
import { ContactsService, PRESENCE_HEARTBEAT_MS } from './ContactsService';

/**
 * Publishes the signed-in user's presence for as long as the desktop is open.
 *
 * Runs once in the shell rather than per application: presence is a property
 * of the session, not of whichever window happens to be focused, and several
 * apps competing to write it would produce a confused status.
 *
 * The server decays a stale heartbeat to `offline` on read, so a browser that
 * closes without warning resolves itself — this only has to be best-effort.
 */
export function usePresenceHeartbeat(isAuthenticated: boolean): void {
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const beat = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      // A failed heartbeat is not worth telling the user about: presence is
      // ambient, the next beat retries, and the server decays it meanwhile.
      void ContactsService.heartbeat({ status: 'online' }).catch(() => undefined);
    };

    beat();
    const timer = window.setInterval(beat, PRESENCE_HEARTBEAT_MS);

    // Coming back to the tab should refresh status immediately rather than
    // waiting out the interval.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // `pagehide` fires on tab close and on mobile backgrounding, where
    // `beforeunload` does not. sendBeacon cannot carry the auth header, so
    // this is a plain request that may or may not complete — the TTL is the
    // real guarantee.
    const onPageHide = () => {
      void ContactsService.goOffline().catch(() => undefined);
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      void ContactsService.goOffline().catch(() => undefined);
    };
  }, [isAuthenticated]);
}

export default usePresenceHeartbeat;
