/**
 * Native operating-system notifications.
 *
 * These appear in the OS notification centre, outside the browser and outside
 * the Drive OSX shell — which is the point. An in-app toast is useless when the
 * user has closed the application or switched to another window, and that is
 * exactly when a new message most needs to reach them.
 *
 * Everything here degrades quietly: notifications are permission-gated, are
 * unavailable in insecure contexts, and are unsupported in some browsers. None
 * of that is an error condition — the in-app notification centre still records
 * the event either way.
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface SystemNotificationInput {
  title: string;
  body: string;
  /**
   * Groups related notifications. A second message in the same conversation
   * replaces the first rather than stacking, which is what stops a busy chat
   * from burying the rest of the notification centre.
   */
  tag?: string;
  icon?: string;
  /** Delivered to the click handler, used to route to the right place. */
  data?: Record<string, unknown>;
  /** True to leave it on screen until dismissed. */
  requireInteraction?: boolean;
}

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export const SystemNotifier = {
  isSupported: supported,

  permission(): NotificationPermissionState {
    if (!supported()) return 'unsupported';
    return Notification.permission as NotificationPermissionState;
  },

  /**
   * Asks for permission.
   *
   * Browsers only honour this from a user gesture, and some permanently block
   * an origin that asks unprompted on load. The shell therefore calls this
   * after a deliberate action, not at startup.
   */
  async requestPermission(): Promise<NotificationPermissionState> {
    if (!supported()) return 'unsupported';
    if (Notification.permission !== 'default') {
      return Notification.permission as NotificationPermissionState;
    }

    try {
      return (await Notification.requestPermission()) as NotificationPermissionState;
    } catch {
      // Older Safari used a callback form and can reject the promise API.
      return Notification.permission as NotificationPermissionState;
    }
  },

  /**
   * Raises a system notification.
   *
   * Returns false when nothing was shown — no permission, no support, or the
   * platform refused — so the caller can fall back to an in-app surface.
   */
  show(input: SystemNotificationInput, onClick?: (data: Record<string, unknown>) => void): boolean {
    if (!supported() || Notification.permission !== 'granted') return false;

    try {
      const notification = new Notification(input.title, {
        body: input.body,
        tag: input.tag,
        icon: input.icon ?? '/favicon.ico',
        badge: input.icon ?? '/favicon.ico',
        data: input.data ?? {},
        requireInteraction: input.requireInteraction ?? false,
        // Replacing a same-tag notification should be quiet; only the first
        // one in a conversation is worth making a sound about.
        renotify: false,
      } as NotificationOptions);

      notification.onclick = () => {
        // Bring the shell forward before routing, or the user is taken to the
        // right conversation in a window they cannot see.
        try {
          window.focus();
        } catch {
          // Focus is not always permitted; routing still works.
        }
        onClick?.(input.data ?? {});
        notification.close();
      };

      return true;
    } catch {
      // Some platforms throw when constructing a Notification directly and
      // require a service-worker registration instead. Treated as "not shown".
      return false;
    }
  },
};

export default SystemNotifier;
