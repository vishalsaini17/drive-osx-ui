import { tokens } from '../api/http';
import { EventBus } from '../events/EventBus';

/**
 * The shell's connection to the realtime gateway.
 *
 * The API has published per-user notifications over `/ws` since it was built
 * (`infrastructure/realtime/signaling.ts` → `deliverToUser`), but nothing in
 * the browser ever connected: the only WebSocket client was inside the Meet
 * application, so every notification the server pushed went nowhere. This is
 * that missing consumer.
 *
 * It belongs to the shell, not to an application, for the same reason presence
 * does: an application only exists while its window is open, and the whole
 * point is to hear about a message when Messenger is *closed*.
 */

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  userId: string;
  organizationId: string | null;
  data: Record<string, unknown>;
}

/** Fired for every notification the server pushes. */
export const REALTIME_NOTIFICATION = 'realtime:notification';
/** Fired when the connection state changes, for status indicators. */
export const REALTIME_STATUS = 'realtime:status';

export type RealtimeStatus = 'connecting' | 'open' | 'closed';

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;
/** Well inside any idle-timeout a proxy in front of the API is likely to have. */
const HEARTBEAT_MS = 25_000;

class RealtimeClientService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private wantConnection = false;
  private status: RealtimeStatus = 'closed';

  /**
   * Ids already delivered to listeners.
   *
   * The same notification can arrive twice — a reconnect that overlaps an
   * in-flight delivery, or two tabs of the same account. Listeners raise system
   * notifications, so a duplicate is user-visible and worth suppressing here
   * rather than in each listener.
   */
  private seen = new Set<string>();

  connect(): void {
    this.wantConnection = true;
    this.open();
  }

  disconnect(): void {
    this.wantConnection = false;
    this.clearTimers();
    this.reconnectAttempts = 0;
    this.seen.clear();

    if (this.socket) {
      // 1000 = normal closure, so the server does not treat it as a drop.
      this.socket.close(1000, 'Client signed out');
      this.socket = null;
    }
    this.setStatus('closed');
  }

  currentStatus(): RealtimeStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private open(): void {
    if (!this.wantConnection) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = tokens.access();
    if (!token) {
      // Not signed in yet. Retry rather than giving up: the shell calls
      // connect() as soon as it is authenticated, but a token refresh may be
      // in flight at this exact moment.
      this.scheduleReconnect();
      return;
    }

    this.setStatus('connecting');

    let socket: WebSocket;
    try {
      // The token goes in the query string because the WebSocket API cannot
      // set an Authorization header.
      const base = window.location.origin.replace(/^http/, 'ws');
      socket = new WebSocket(`${base}/ws?token=${encodeURIComponent(token)}`);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('open');
      this.startHeartbeat();
    };

    socket.onmessage = (event) => {
      this.handleFrame(event.data);
    };

    socket.onerror = () => {
      // `onclose` always follows, and does the reconnecting.
    };

    socket.onclose = (event) => {
      this.stopHeartbeat();
      this.socket = null;
      this.setStatus('closed');

      // 4401 is the gateway rejecting the token. Reconnecting immediately with
      // the same token would spin, so back off and let the HTTP layer's
      // refresh put a usable one in place first.
      if (event.code === 4401) this.reconnectAttempts = Math.max(this.reconnectAttempts, 3);

      if (this.wantConnection) this.scheduleReconnect();
    };
  }

  private handleFrame(raw: unknown): void {
    if (typeof raw !== 'string') return;

    let frame: { type?: string; payload?: RealtimeNotification };
    try {
      frame = JSON.parse(raw);
    } catch {
      return;
    }

    if (frame.type !== 'notification' || !frame.payload) return;

    const notification = frame.payload;
    const key = notification.id ?? `${notification.type}:${JSON.stringify(notification.data ?? {})}`;

    if (this.seen.has(key)) return;
    this.seen.add(key);
    // Bounded so a long session cannot grow this without limit.
    if (this.seen.size > 500) {
      this.seen = new Set([...this.seen].slice(-250));
    }

    EventBus.emit(REALTIME_NOTIFICATION, notification);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;

    // Exponential backoff with jitter, so a server restart does not bring every
    // client back in the same instant.
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.reconnectAttempts, MAX_BACKOFF_MS);
    const jittered = delay * (0.7 + Math.random() * 0.6);
    this.reconnectAttempts += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, jittered);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return;
    this.status = status;
    EventBus.emit(REALTIME_STATUS, status);
  }
}

export const RealtimeClient = new RealtimeClientService();
export default RealtimeClient;
