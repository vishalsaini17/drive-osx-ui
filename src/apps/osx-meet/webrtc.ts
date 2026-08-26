/// <reference types="vite/client" />
import { useCallback, useEffect, useRef, useState } from 'react';
import { MeetingService } from '../../platform/meetings/MeetingService';
import { tokens } from '../../platform/api/http';
import type { Poll } from './types';

/**
 * Mesh WebRTC for a meeting room, signalled over the platform's existing
 * `/ws` relay (`drive-osx-api/src/infrastructure/realtime/signaling.ts`).
 *
 * One `RTCPeerConnection` per remote participant. To avoid offer glare in a
 * mesh (everyone would otherwise connect to everyone twice), only the side
 * with the lexicographically smaller userId sends the initial offer; the
 * other side waits for it.
 */

/**
 * A participant's persistent-ish call state — mic/camera/hand/presenting.
 * Broadcast (and stored per-sender) as partial updates, merged on receipt
 * rather than replaced wholesale, so e.g. raising a hand can't clobber a mic
 * badge someone else's toggle broadcast a moment earlier. See the 'state'
 * case in the socket handler below.
 */
export interface RemoteParticipantState {
  isMuted: boolean;
  isVideoOn: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
}

/**
 * One-off, transient occurrences — never merged into `remoteParticipantState`,
 * just handed to the caller's `onRemoteEvent` as they arrive (CLAUDE.md §19:
 * these model an event stream, not persisted state).
 */
export type MeetingRealtimeEvent =
  | { kind: 'reaction'; id: string; emoji: string }
  | { kind: 'caption'; id: string; speaker: string; text: string; final: boolean }
  | { kind: 'poll-create'; poll: Poll }
  | { kind: 'poll-vote'; pollId: string; optionId: string; voterId: string }
  | { kind: 'poll-delete'; pollId: string }
  /** Host → room: every recipient that matches `targetUserId` (or everyone,
   *  for `'all'`) must mute *itself* on receipt — no client can flip another
   *  client's hardware, so this is a command each client obeys locally (see
   *  `onRemoteEvent` in `index.tsx`), never something the sender applies to
   *  anyone else directly. */
  | { kind: 'force-mute'; targetUserId: string | 'all' }
  /** Host → room: a *request*, never a force — unmuting someone else's mic
   *  without consent is a real privacy problem, so recipients only ever see
   *  a dismissible prompt and must unmute themselves. */
  | { kind: 'unmute-request'; targetUserId: string | 'all' };

/** The wire shape of a mic/camera/hand/presenting update — a `'presence'`
 *  tag plus whichever `RemoteParticipantState` fields actually changed. */
type PresencePayload = { kind: 'presence' } & Partial<RemoteParticipantState>;

type StatePayload = PresencePayload | MeetingRealtimeEvent;

interface SignallingFrame {
  type: string;
  userId?: string;
  username?: string;
  from?: string;
  target?: string | null;
  participants?: string[];
  payload?: unknown;
}

interface UseMeetingConnectionParams {
  /** The room to join. `null`/empty means "not in a call yet" — the hook is a no-op. */
  meetingId: string | null;
  /** This user's id, as issued in the access token (see `getSelfUserId`). */
  selfUserId: string | null;
  /** The local camera/mic capture already held by the caller. Its tracks are
   *  attached to every peer connection created while it is set. */
  localStream: MediaStream | null;
  /** Called for every non-presence 'state' frame from someone else — the
   *  transient events (reactions, captions, poll actions). Read via a ref
   *  internally, so a new function identity each render doesn't reset the
   *  socket. */
  onRemoteEvent?: (fromUserId: string, event: MeetingRealtimeEvent) => void;
}

interface UseMeetingConnectionResult {
  remoteStreams: Record<string, MediaStream>;
  remoteParticipantState: Record<string, RemoteParticipantState>;
  connectionState: Record<string, RTCPeerConnectionState>;
  /** Sends a partial mic/camera/hand/presenting update, merged by every
   *  receiver into what it already knows about this sender. */
  broadcastState: (state: Partial<RemoteParticipantState>) => void;
  /** Sends a one-off event (reaction, caption line, poll action) to the room. */
  broadcastEvent: (event: MeetingRealtimeEvent) => void;
  /** Swaps the outgoing video track on every current (and future) peer
   *  connection to `track` — the local screen-capture track while
   *  presenting — or back to the camera track when `track` is `null`.
   *  Uses `RTCRtpSender.replaceTrack`, so no renegotiation/signalling is
   *  needed; each peer's existing `<video>` just starts showing the new
   *  source. */
  setScreenShareTrack: (track: MediaStreamTrack | null) => void;
}

function iceServers(): RTCIceServer[] {
  const raw = (import.meta.env.VITE_STUN_URLS as string | undefined) || 'stun:stun.l.google.com:19302';
  const urls = raw
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  return [{ urls }];
}

/**
 * Decodes the `id` claim out of the current access token — the same value
 * the signalling server assigns this connection as `userId` (both derive
 * from the same JWT; see `drive-osx-api/src/platform/authentication/tokens.ts`
 * and `signaling.ts`'s `claims.id ?? claims.sub`). Decoding locally avoids an
 * extra round trip just to learn who we are.
 */
export function getSelfUserId(): string | null {
  const token = tokens.access();
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(normalized)) as { id?: string; sub?: string };
    return json.id || json.sub || null;
  } catch {
    return null;
  }
}

export function useMeetingConnection({
  meetingId,
  selfUserId,
  localStream,
  onRemoteEvent,
}: UseMeetingConnectionParams): UseMeetingConnectionResult {
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteParticipantState, setRemoteParticipantState] = useState<Record<string, RemoteParticipantState>>({});
  const [connectionState, setConnectionState] = useState<Record<string, RTCPeerConnectionState>>({});

  const socketRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  // The outgoing video `RTCRtpSender` per peer, recorded at creation time so
  // `setScreenShareTrack` can retarget it without hunting through
  // `pc.getSenders()` (whose `.track` briefly reads `null` mid-swap).
  const videoSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  // The active screen-capture track, if any — read by `getOrCreatePeer` so a
  // peer who joins mid-presentation is shown the screen immediately instead
  // of the camera.
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  // Latest `onRemoteEvent`, read from inside the socket's `onmessage`
  // closure. A ref (rather than a `useEffect` dependency that reopens the
  // socket) because the caller typically passes a fresh function identity
  // every render.
  const onRemoteEventRef = useRef(onRemoteEvent);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    onRemoteEventRef.current = onRemoteEvent;
  }, [onRemoteEvent]);

  const send = useCallback((frame: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(frame));
    }
  }, []);

  const dropPeer = useCallback((userId: string) => {
    const pc = peersRef.current.get(userId);
    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
    }
    videoSendersRef.current.delete(userId);
    setRemoteStreams((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setConnectionState((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setRemoteParticipantState((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const getOrCreatePeer = useCallback(
    (otherUserId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(otherUserId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      peersRef.current.set(otherUserId, pc);

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, stream);
          if (track.kind === 'video') {
            videoSendersRef.current.set(otherUserId, sender);
            // Already presenting when this peer joins — show them the
            // screen straight away instead of the camera.
            if (screenTrackRef.current) sender.replaceTrack(screenTrackRef.current).catch(() => {});
          }
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({ type: 'ice-candidate', target: otherUserId, payload: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        const [stream0] = event.streams;
        if (!stream0) return;
        setRemoteStreams((prev) => ({ ...prev, [otherUserId]: stream0 }));
      };

      pc.onconnectionstatechange = () => {
        setConnectionState((prev) => ({ ...prev, [otherUserId]: pc.connectionState }));
      };

      setConnectionState((prev) => ({ ...prev, [otherUserId]: pc.connectionState }));

      return pc;
    },
    [send],
  );

  useEffect(() => {
    if (!meetingId || !localStream || !selfUserId) return;
    const token = tokens.access();
    if (!token) return;

    let cancelled = false;
    const socket = MeetingService.connectSignalling(token);
    socketRef.current = socket;

    socket.onopen = () => {
      if (!cancelled) send({ type: 'join', meetingId });
    };

    socket.onmessage = (event) => {
      if (cancelled) return;
      let frame: SignallingFrame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (frame.type) {
        case 'user-joined': {
          const participants = frame.participants ?? [];
          participants
            .filter((id) => id !== selfUserId && !peersRef.current.has(id))
            .forEach((otherUserId) => {
              const pc = getOrCreatePeer(otherUserId);
              // Only the lexicographically-smaller id offers, so the two
              // sides don't race each other with simultaneous offers.
              if (selfUserId < otherUserId) {
                pc.createOffer()
                  .then((offer) => pc.setLocalDescription(offer).then(() => offer))
                  .then((offer) => send({ type: 'offer', target: otherUserId, payload: offer }))
                  .catch(() => {
                    // The peer connection's own state change covers surfacing this.
                  });
              }
            });
          break;
        }

        case 'user-left': {
          if (frame.userId && frame.userId !== selfUserId) dropPeer(frame.userId);
          break;
        }

        case 'offer': {
          if (frame.target !== selfUserId || !frame.from || frame.from === selfUserId) return;
          const from = frame.from;
          const pc = getOrCreatePeer(from);
          pc.setRemoteDescription(new RTCSessionDescription(frame.payload as RTCSessionDescriptionInit))
            .then(() => pc.createAnswer())
            .then((answer) => pc.setLocalDescription(answer).then(() => answer))
            .then((answer) => send({ type: 'answer', target: from, payload: answer }))
            .catch(() => {});
          break;
        }

        case 'answer': {
          if (frame.target !== selfUserId || !frame.from || frame.from === selfUserId) return;
          const pc = peersRef.current.get(frame.from);
          if (pc) {
            pc.setRemoteDescription(new RTCSessionDescription(frame.payload as RTCSessionDescriptionInit)).catch(
              () => {},
            );
          }
          break;
        }

        case 'ice-candidate': {
          if (frame.target !== selfUserId || !frame.from || frame.from === selfUserId) return;
          const pc = peersRef.current.get(frame.from);
          if (pc && frame.payload) {
            pc.addIceCandidate(new RTCIceCandidate(frame.payload as RTCIceCandidateInit)).catch(() => {});
          }
          break;
        }

        case 'state': {
          const from = frame.from;
          if (!from || from === selfUserId || !frame.payload) break;
          const payload = frame.payload as StatePayload;
          if (payload.kind === 'presence') {
            const { kind: _kind, ...fields } = payload;
            // Merge, never replace: a hand-raise broadcast only carries
            // `isHandRaised`, and must not blank out the mic/camera fields a
            // separate toggle broadcast a moment earlier.
            setRemoteParticipantState((prev) => ({
              ...prev,
              [from]: { ...prev[from], ...fields } as RemoteParticipantState,
            }));
          } else {
            onRemoteEventRef.current?.(from, payload);
          }
          break;
        }

        default:
          break;
      }
    };

    return () => {
      cancelled = true;
      send({ type: 'leave' });
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      videoSendersRef.current.clear();
      screenTrackRef.current = null;
      setRemoteStreams({});
      setConnectionState({});
      setRemoteParticipantState({});
      socket.close();
      socketRef.current = null;
    };
    // `localStream` is intentionally read via `localStreamRef` (kept fresh by
    // the effect above) rather than listed here: toggling the mic/camera
    // flips `track.enabled` on the same stream instance and must not tear
    // this connection down and rejoin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, selfUserId, Boolean(localStream), send, getOrCreatePeer, dropPeer]);

  const broadcastState = useCallback(
    (state: Partial<RemoteParticipantState>) => {
      send({ type: 'state', payload: { kind: 'presence', ...state } });
    },
    [send],
  );

  const broadcastEvent = useCallback(
    (event: MeetingRealtimeEvent) => {
      send({ type: 'state', payload: event });
    },
    [send],
  );

  const setScreenShareTrack = useCallback((track: MediaStreamTrack | null) => {
    screenTrackRef.current = track;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    const nextTrack = track ?? cameraTrack;
    videoSendersRef.current.forEach((sender) => {
      sender.replaceTrack(nextTrack).catch(() => {
        // The peer connection may already be closing; nothing to recover.
      });
    });
  }, []);

  return {
    remoteStreams,
    remoteParticipantState,
    connectionState,
    broadcastState,
    broadcastEvent,
    setScreenShareTrack,
  };
}
