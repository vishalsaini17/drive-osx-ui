import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AppShell from '../../design-system/components/AppShell';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MessageSquare,
  Users,
  Hand,
  Smile,
  Copy,
  Check,
  Calendar as CalendarIcon,
  Clock,
  X,
  Send,
  Volume2,
  Sparkles,
  Link,
  Info,
  RefreshCw,
  AlertTriangle,
  Camera,
  Lock,
  ShieldCheck,
  Disc,
  Pause,
  Download,
  BarChart2,
  Split,
  UserPlus,
  Paperclip,
  FileText,
  Pin,
  UserX,
  UserCheck,
  VolumeX,
  Settings,
  Filter,
  LayoutGrid,
  Captions,
  MoreVertical,
  PictureInPicture2,
} from 'lucide-react';
import { useSystemStore } from '../../shell/state/systemStore';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import { MeetingService, MeetingParticipant, Meeting } from '../../platform/meetings/MeetingService';
import { MessagingService, Message } from '../../platform/messaging/MessagingService';
import { ApiError } from '../../platform/api/http';
import { Participant, Poll, MeetingSecuritySettings, WaitingParticipant } from './types';
import WhiteboardModal from './components/WhiteboardModal';
import PollsDrawer from './components/PollsDrawer';
import BreakoutRoomsModal from './components/BreakoutRoomsModal';
import SecurityModal from './components/SecurityModal';
import InviteModal from './components/InviteModal';
import { themeFamily } from '../../platform/theme/themes';
import { useMeetingConnection, getSelfUserId, MeetingRealtimeEvent } from './webrtc';
import { useMeetTheme } from './useMeetTheme';

/**
 * Applies one vote (cast or changed) to a poll, keyed by voter so a remote
 * vote broadcast can be merged without needing to know about any other
 * voter's choice. Pure and side-effect free so both the local vote handler
 * and the remote-event handler can share it.
 */
function applyVote(poll: Poll, voterId: string, optionId: string): Poll {
  const previousOptionId = poll.votesByVoter[voterId];
  if (previousOptionId === optionId) return poll;
  const votesByVoter = { ...poll.votesByVoter, [voterId]: optionId };
  const options = poll.options.map((opt) => {
    let votes = opt.votes;
    if (opt.id === optionId) votes += 1;
    if (opt.id === previousOptionId) votes = Math.max(0, votes - 1);
    return { ...opt, votes };
  });
  const totalVotes = options.reduce((acc, opt) => acc + opt.votes, 0);
  return { ...poll, options, totalVotes, votesByVoter };
}

/** A small deterministic palette for real remote participants' fallback tiles. */
const TILE_GRADIENTS = [
  'from-cyan-600 to-blue-700',
  'from-fuchsia-600 to-purple-700',
  'from-emerald-600 to-teal-700',
  'from-orange-500 to-red-600',
  'from-indigo-600 to-violet-700',
];
function gradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return TILE_GRADIENTS[Math.abs(hash) % TILE_GRADIENTS.length];
}

/** Initials fallback for a participant with no avatar image — same idea as Messenger's `Avatar`. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Canvas component for Virtual Studio Camera or live webcam feed.
// The canvas backing store tracks its container so the picture never stretches:
// the source frame is scaled by a single factor and centred, cropping evenly
// ("cover") or letterboxing ("contain") instead of distorting the aspect ratio.
function VirtualCameraCanvas({
  stream,
  mirrored = true,
  fit = 'cover',
  compact = false,
}: {
  name?: string;
  stream?: MediaStream | null;
  mirrored?: boolean;
  fit?: 'cover' | 'contain';
  compact?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep the backing store in step with the rendered size (and pixel density),
  // so a resized window re-renders sharp rather than scaling a stale bitmap.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(wrapper.clientWidth));
      const height = Math.max(1, Math.round(wrapper.clientHeight));
      const nextW = Math.round(width * dpr);
      const nextH = Math.round(height * dpr);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    // Logical (CSS pixel) drawing size for the current frame.
    const frame = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: canvas.width / dpr, h: canvas.height / dpr };
    };

    if (stream) {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});

      const render = () => {
        const { w, h } = frame();
        ctx.clearRect(0, 0, w, h);

        const sw = video.videoWidth;
        const sh = video.videoHeight;
        if (video.readyState >= 2 && sw > 0 && sh > 0) {
          // One scale factor for both axes: the picture keeps its shape.
          const scale = fit === 'cover' ? Math.max(w / sw, h / sh) : Math.min(w / sw, h / sh);
          const dw = sw * scale;
          const dh = sh * scale;
          const dx = (w - dw) / 2;
          const dy = (h - dh) / 2;

          ctx.save();
          if (mirrored) {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, dx, dy, dw, dh);
          ctx.restore();
        }
        animationFrameId = requestAnimationFrame(render);
      };

      render();

      return () => {
        cancelAnimationFrame(animationFrameId);
        video.pause();
        video.srcObject = null;
      };
    }

    const render = () => {
      t += 0.04;
      const { w, h } = frame();

      // Dark studio background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle moving grid mesh
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      const shiftX = (Math.sin(t * 0.5) * 15) % gridSize;
      const shiftY = (Math.cos(t * 0.5) * 15) % gridSize;
      for (let x = shiftX; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = shiftY; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // The synthetic avatar is sized from the shorter edge so it stays in
      // proportion in a small tile and in a full-width preview alike.
      const unit = Math.min(w, h) / 320;
      const cx = w / 2;
      const cy = h / 2 - 10 * unit;

      // Animated ambient studio light orb behind head
      const orbRadius = Math.max(w, h) * 0.45;
      const lightGrad = ctx.createRadialGradient(
        cx + Math.sin(t) * 20 * unit,
        cy + Math.cos(t * 0.7) * 15 * unit,
        10 * unit,
        cx,
        cy,
        orbRadius
      );
      lightGrad.addColorStop(0, 'rgba(129, 140, 248, 0.35)');
      lightGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.12)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw stylized head & shoulders silhouette / avatar
      const headR = 32 * unit;
      const headY = cy - 25 * unit + Math.sin(t * 1.2) * 3 * unit;
      const ringR = headR * 1.2 + Math.sin(t * 1.5) * 2 * unit;

      // Shoulders
      ctx.fillStyle = 'rgba(224, 231, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, headY + 80 * unit, 75 * unit, 40 * unit, 0, 0, Math.PI, true);
      ctx.fill();

      // Head
      ctx.fillStyle = 'rgba(238, 242, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(cx, headY, headR, 0, Math.PI * 2);
      ctx.fill();

      // Face tracking / AR contour ring
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + Math.sin(t * 2) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, headY, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // AR Face landmark points
      ctx.fillStyle = '#60a5fa';
      for (let i = 0; i < 4; i++) {
        const angle = t * 1.5 + (i * Math.PI) / 2;
        const px = cx + Math.cos(angle) * ringR;
        const py = headY + Math.sin(angle) * ringR;
        ctx.beginPath();
        ctx.arc(px, py, 2.5 * unit, 0, Math.PI * 2);
        ctx.fill();
      }

      // Overlay chrome is noise in a small tile, so it is drawn only when
      // the surface is large enough to read it.
      if (!compact && w > 220) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px sans-serif';
        ctx.fillText('✨ OSX VIRTUAL CAM HD', 12, 20);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(w - 20, 16, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px monospace';
        const timeStr = new Date().toLocaleTimeString([], { hour12: false });
        ctx.fillText(timeStr, w - 75, 20);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stream, mirrored, fit, compact]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative bg-slate-900 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

// Canvas component for simulated Screen Share stream
function ScreenShareCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const render = () => {
      t += 0.03;
      const w = canvas.width;
      const h = canvas.height;

      // Light IDE code editor screen background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Top IDE window titlebar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, 28);

      // Window controls dots
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(12, 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(24, 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(36, 14, 4, 0, Math.PI * 2);
      ctx.fill();

      // Tab text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('💻 App.tsx — DriveOSX Studio', 50, 18);

      // Fake Code Lines
      const lines = [
        'import React from "react";',
        'import { DriveOSX } from "@drive/core";',
        '',
        'export default function WorkspaceApp() {',
        '  const [active, setActive] = useState(true);',
        '  return (',
        '    <div className="osx-desktop">',
        '      <HDStreamResolution fps={60} bitrate="8Mbps" />',
        '      <CollaborativeWhiteboard active={active} />',
        '    </div>',
        '  );',
        '}',
      ];

      ctx.font = '11px monospace';
      lines.forEach((line, i) => {
        const y = 50 + i * 18;
        if (line.includes('import')) ctx.fillStyle = '#f472b6';
        else if (line.includes('function') || line.includes('const')) ctx.fillStyle = '#38bdf8';
        else if (line.includes('<')) ctx.fillStyle = '#818cf8';
        else ctx.fillStyle = '#cbd5e1';
        ctx.fillText(line, 20, y);
      });

      // Moving cursor
      const cursorX = 180 + Math.sin(t * 1.5) * 80;
      const cursorY = 120 + Math.cos(t * 1.2) * 50;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(cursorX, cursorY);
      ctx.lineTo(cursorX + 10, cursorY + 12);
      ctx.lineTo(cursorX + 4, cursorY + 14);
      ctx.lineTo(cursorX, cursorY + 20);
      ctx.closePath();
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-slate-900 overflow-hidden">
      <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-contain" />
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md">
        <Monitor size={12} />
        <span>You are sharing your screen</span>
      </div>
    </div>
  );
}

/**
 * One participant frame. Every layout uses this, so the video framing, the
 * name tag and the hand/mute state stay identical whether the tile is a
 * thumbnail in a strip or the full spotlight.
 */
function RemoteVideoTile({ stream }: { stream: MediaStream }) {
  return (
    <video
      autoPlay
      playsInline
      className="w-full h-full object-cover"
      ref={(el) => {
        if (el && el.srcObject !== stream) el.srcObject = stream;
      }}
    />
  );
}

function AvatarBadge({ name, avatar, size }: { name: string; avatar: string; size: 'sm' | 'lg' }) {
  const dims = size === 'sm' ? 'w-8 h-8' : 'w-14 h-14 sm:w-20 sm:h-20';
  const fontSize = size === 'sm' ? 'text-[10px]' : 'text-base sm:text-xl';
  return avatar.startsWith('http') ? (
    <img src={avatar} alt={name} className={`${dims} rounded-full object-cover`} />
  ) : (
    <div
      className={`${dims} ${fontSize} rounded-full bg-white/15 border-2 border-white/20 flex items-center justify-center font-bold text-white shrink-0`}
    >
      {initials(name)}
    </div>
  );
}

function ParticipantTile({
  participant,
  isMe,
  isVideoOn,
  isMicOn,
  webcamStream,
  remoteStream,
  peerConnectionState,
  pinnedParticipantId,
  onTogglePin,
  reactions = [],
  compact = false,
  className = '',
}: {
  participant: Participant;
  isMe: boolean;
  isVideoOn: boolean;
  isMicOn: boolean;
  webcamStream: MediaStream | null;
  remoteStream?: MediaStream | null;
  peerConnectionState?: RTCPeerConnectionState;
  pinnedParticipantId: string | null;
  onTogglePin: (id: string | null) => void;
  /** The room's full in-flight reaction list; filtered below to just this
   *  tile's participant, so the emoji floats over whichever layout renders
   *  the sender's tile (tiled, spotlight strip, sidebar, ...). */
  reactions?: { id: string; emoji: string; participantId: string }[];
  compact?: boolean;
  className?: string;
}) {
  const showVideo = isMe ? isVideoOn : participant.isVideoOn;
  const showMuted = isMe ? !isMicOn : participant.isMuted;
  const isPinned = pinnedParticipantId === participant.id;
  const isConnecting =
    !isMe && showVideo && !remoteStream && (peerConnectionState === 'connecting' || peerConnectionState === 'new');
  const myReactions = reactions.filter((r) => r.participantId === participant.id);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border flex items-center justify-center bg-zinc-900 transition-all group ${
        participant.isSpeaking
          ? 'border-blue-500 ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/10'
          : 'border-zinc-800'
      } ${className}`}
    >
      {isMe && showVideo ? (
        <VirtualCameraCanvas stream={webcamStream} mirrored compact={compact} />
      ) : showVideo && remoteStream ? (
        <RemoteVideoTile stream={remoteStream} />
      ) : showVideo && isConnecting ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-800/60 text-zinc-300">
          <RefreshCw size={compact ? 14 : 18} className="animate-spin opacity-70" />
          {!compact && <span className="text-[11px] font-semibold">Connecting…</span>}
        </div>
      ) : showVideo ? (
        <AvatarBadge name={participant.name} avatar={participant.avatar} size="lg" />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-tr ${participant.bgGradient} flex flex-col items-center justify-center p-2 gap-1 text-center`}
        >
          <AvatarBadge name={participant.name} avatar={participant.avatar} size={compact ? 'sm' : 'lg'} />
          {!compact && (
            <>
              <span className="font-bold text-xs sm:text-sm text-white truncate max-w-full">
                {participant.name}
              </span>
              <span className="text-[10px] sm:text-xs text-white/60">{participant.role}</span>
            </>
          )}
        </div>
      )}

      {/* Name tag */}
      <div className="absolute bottom-1.5 left-1.5 px-1.5 sm:px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] sm:text-xs font-semibold flex items-center gap-1 border border-white/10 z-10 max-w-[85%]">
        <span className="truncate">{participant.name}</span>
        {showMuted && <MicOff size={11} className="text-red-400 shrink-0" />}
      </div>

      {/* Presenting / raised hand / speaking — mutually exclusive, same
          corner, in that priority order. */}
      {!isMe && participant.isScreenSharing ? (
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md z-10" title={`${participant.name} is presenting`}>
          <Monitor size={11} />
          {!compact && <span>Presenting</span>}
        </div>
      ) : participant.isHandRaised ? (
        <div className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-amber-500 text-white shadow-md z-10" title="Hand raised">
          <Hand size={compact ? 10 : 13} />
        </div>
      ) : participant.isSpeaking ? (
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md z-10">
          <Volume2 size={11} />
          {!compact && <span>Speaking</span>}
        </div>
      ) : null}

      {/* Floating reactions from this participant */}
      {myReactions.length > 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center overflow-hidden z-20">
          {myReactions.map((r) => (
            <span key={r.id} className="absolute bottom-6 text-2xl sm:text-3xl animate-bounce drop-shadow-lg">
              {r.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Pin: revealed on hover so it never covers a small tile permanently */}
      <button
        onClick={() => onTogglePin(isPinned ? null : participant.id)}
        className={`absolute top-1.5 left-1.5 p-1.5 rounded-lg text-white backdrop-blur-md transition-all cursor-pointer z-10 ${
          isPinned ? 'bg-blue-600 opacity-100' : 'bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 focus:opacity-100'
        }`}
        title={isPinned ? 'Unpin' : 'Pin to screen'}
      >
        <Pin size={compact ? 10 : 12} />
      </button>
    </div>
  );
}

// The self picture-in-picture's default/min/max width (px) and the aspect
// ratio (16:9, matching every other tile) its height is derived from.
const DEFAULT_PIP_WIDTH = 160;
const MIN_PIP_WIDTH = 100;
const MAX_PIP_WIDTH = 320;
const PIP_ASPECT = 9 / 16;

/**
 * The self-view floats over whichever layout is spotlighting someone else —
 * Meet's signature corner PIP. Draggable (pointer-down anywhere but a
 * button, e.g. the pin button already inside `ParticipantTile`) and
 * resizable (the corner handle), constrained to `boundsRef`'s box so it can
 * never be dragged off-screen or behind the control bar below the stage.
 *
 * Plain pointer events + `setPointerCapture` — no drag library, matching the
 * rest of this app.
 */
function SelfPictureInPicture({
  participant,
  isVideoOn,
  isMicOn,
  webcamStream,
  pinnedParticipantId,
  onTogglePin,
  reactions,
  boundsRef,
  position,
  size,
  onPositionChange,
  onSizeChange,
}: {
  participant: Participant;
  isVideoOn: boolean;
  isMicOn: boolean;
  webcamStream: MediaStream | null;
  pinnedParticipantId: string | null;
  onTogglePin: (id: string | null) => void;
  reactions: { id: string; emoji: string; participantId: string }[];
  boundsRef: React.RefObject<HTMLDivElement | null>;
  position: { x: number; y: number } | null;
  size: number;
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: number) => void;
}) {
  const pipRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startLeft: number; startTop: number } | null>(
    null,
  );
  const resizeRef = useRef<{ pointerId: number; startX: number; startSize: number } | null>(null);

  const width = size;
  const height = Math.round(size * PIP_ASPECT);

  const style: React.CSSProperties = position
    ? { position: 'absolute', left: position.x, top: position.y, width, height }
    : { position: 'absolute', right: 12, bottom: 12, width, height };

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Never hijack a click on a control living inside the tile (the pin
    // button today; anything else added later too).
    if ((e.target as HTMLElement).closest('button')) return;
    const bounds = boundsRef.current?.getBoundingClientRect();
    const pipRect = pipRef.current?.getBoundingClientRect();
    if (!bounds || !pipRect) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: pipRect.left - bounds.left,
      startTop: pipRect.top - bounds.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const bounds = boundsRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const nextLeft = drag.startLeft + (e.clientX - drag.startX);
    const nextTop = drag.startTop + (e.clientY - drag.startY);
    onPositionChange({
      x: Math.max(0, Math.min(nextLeft, Math.max(0, bounds.width - width))),
      y: Math.max(0, Math.min(nextTop, Math.max(0, bounds.height - height))),
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const bounds = boundsRef.current?.getBoundingClientRect();
    const pipRect = pipRef.current?.getBoundingClientRect();
    if (!bounds || !pipRect) return;
    // Anchor to an explicit left/top before resizing, since the default
    // corner is expressed as right/bottom and would otherwise shift as the
    // width changes underneath it.
    if (!position) onPositionChange({ x: pipRect.left - bounds.left, y: pipRect.top - bounds.top });
    resizeRef.current = { pointerId: e.pointerId, startX: e.clientX, startSize: size };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;
    const nextSize = Math.max(MIN_PIP_WIDTH, Math.min(MAX_PIP_WIDTH, resize.startSize + (e.clientX - resize.startX)));
    onSizeChange(nextSize);
    const bounds = boundsRef.current?.getBoundingClientRect();
    if (bounds && position) {
      const nextHeight = Math.round(nextSize * PIP_ASPECT);
      const clampedX = Math.max(0, Math.min(position.x, Math.max(0, bounds.width - nextSize)));
      const clampedY = Math.max(0, Math.min(position.y, Math.max(0, bounds.height - nextHeight)));
      if (clampedX !== position.x || clampedY !== position.y) onPositionChange({ x: clampedX, y: clampedY });
    }
  };

  const endResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current?.pointerId === e.pointerId) resizeRef.current = null;
  };

  return (
    <div
      ref={pipRef}
      style={style}
      onPointerDown={handleDragPointerDown}
      onPointerMove={handleDragPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-20 cursor-grab active:cursor-grabbing touch-none select-none"
    >
      <ParticipantTile
        participant={participant}
        isMe
        isVideoOn={isVideoOn}
        isMicOn={isMicOn}
        webcamStream={webcamStream}
        pinnedParticipantId={pinnedParticipantId}
        onTogglePin={onTogglePin}
        reactions={reactions}
        compact
        className="w-full h-full !rounded-none !border-0"
      />
      {/* Resize handle: bottom-right corner, the usual convention. */}
      <div
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none flex items-end justify-end p-0.5 z-30"
        title="Resize"
      >
        <div className="w-2.5 h-2.5 border-b-2 border-r-2 border-white/80 rounded-br-[2px]" />
      </div>
    </div>
  );
}

// The local user's roster entry, used for the initial state and whenever the
// roster is reset after leaving a call.
const selfParticipant: Participant = {
  id: 'me',
  name: 'You (Host)',
  role: 'Host',
  avatar: '',
  isMuted: false,
  isVideoOn: false,
  isHandRaised: false,
  isSpeaking: false,
  isScreenSharing: false,
  bgGradient: 'from-blue-600 to-indigo-700',
};

export default function MeetingApp() {
  const theme = useAppTheme('meeting').chromeTheme;
  const isLight = themeFamily(theme) === 'light';
  const { palette } = useMeetTheme();

  // System Store integration
  const calendarEvents = useSystemStore((state) => state.calendarEvents);
  const addCalendarEvent = useSystemStore((state) => state.addCalendarEvent);
  const setFiles = useSystemStore((state) => state.setFiles);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);
  const pendingMeetingId = useSystemStore((state) => state.pendingMeetingId);
  const consumePendingMeeting = useSystemStore((state) => state.consumePendingMeeting);
  const currentUser = useSystemStore((state) => state.currentUser);
  // Real display name for outgoing broadcasts (captions, "You are
  // presenting" text elsewhere already says "You" locally) — remote
  // participants need an actual name, not the local-only placeholder.
  const localDisplayName = currentUser?.fullName || currentUser?.username || 'Participant';

  // This user's id, as issued in the access token — declared early because
  // both `handleRemoteEvent` (below) and the WebRTC connection hook need it,
  // and it never changes for the lifetime of the component.
  const [selfUserId] = useState<string | null>(() => getSelfUserId());

  // Container width state for responsive layout inside windows / mobile
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(entry.contentRect.width);
          setContainerHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isCompact = containerWidth < 680;
  const isVeryCompact = containerWidth < 480;

  // App View State: 'lobby' | 'pre-meeting' | 'in-call'
  const [activeTab, setActiveTab] = useState<'lobby' | 'pre-meeting' | 'in-call'>('lobby');

  // Call Settings & Passcode
  const [meetingCode, setMeetingCode] = useState('');
  // The meeting's real id — every API call and the WebRTC signalling room
  // key off this. Kept distinct from `meetingShareCode` (the short human
  // code) because the API's `:meetingId` routes only accept the real id.
  const [currentMeetingId, setCurrentMeetingId] = useState('');
  const [meetingShareCode, setMeetingShareCode] = useState('');
  // Set once the backend links this meeting's chat to a Messaging
  // conversation (once a second person has ever joined — see
  // `MeetingService.Meeting.conversationId`). Null means "chat not open yet".
  const [meetingConversationId, setMeetingConversationId] = useState<string | null>(null);
  // Who actually hosts this meeting (`Meeting.hostId` from the backend) —
  // the one server-trustworthy fact host-only actions (mute all, delete a
  // poll, ...) are gated on. Never inferred from the local "You (Host)"
  // roster label, which is only ever a display placeholder.
  const [meetingHostId, setMeetingHostId] = useState<string | null>(null);
  // Server-verified: `selfUserId` comes from this client's own access token,
  // and `meetingHostId` from the `Meeting` record the backend returned when
  // this user created/joined it. Neither side of the comparison is
  // attacker-controlled the way a client-supplied "amIHost" flag would be.
  const isHost = meetingHostId != null && selfUserId != null && meetingHostId === selfUserId;
  const [meetingTitle, setMeetingTitle] = useState('Sync & Project Review');
  const [inputPasscode, setInputPasscode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<MeetingSecuritySettings>({
    isLocked: false,
    waitingRoomEnabled: true,
    passcode: '',
    allowScreenShare: true,
    allowChat: true,
    allowUnmute: true,
    allowRecording: true,
  });

  // Waiting Room Queue
  const [waitingQueue, setWaitingQueue] = useState<WaitingParticipant[]>([]);

  // Local Media State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isNoiseSuppressionOn, setIsNoiseSuppressionOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenShareMode, setScreenShareMode] = useState<'entire' | 'window' | 'tab'>('entire');
  const [showScreenShareMenu, setShowScreenShareMenu] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);

  // Self picture-in-picture: draggable/resizable position within the video
  // stage. `null` position means "default bottom-right corner" — it only
  // gets a concrete coordinate once the user actually drags it, and resets
  // to that default corner on a new call (see `handleEndCall`) rather than
  // persisting across calls.
  const [pipPosition, setPipPosition] = useState<{ x: number; y: number } | null>(null);
  const [pipSize, setPipSize] = useState<number>(DEFAULT_PIP_WIDTH);
  const pipBoundsRef = useRef<HTMLDivElement | null>(null);

  // A host's "ask to unmute" targeting me — a dismissible request, never an
  // automatic unmute (see `handleRemoteEvent`'s `unmute-request` case).
  const [showUnmuteRequest, setShowUnmuteRequest] = useState(false);

  // Stage layout, as in Google Meet's "Change layout" panel
  const [layoutMode, setLayoutMode] = useState<'auto' | 'tiled' | 'spotlight' | 'sidebar'>('auto');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Live captions
  const [captionsOn, setCaptionsOn] = useState(false);
  const [captionLines, setCaptionLines] = useState<{ id: string; speaker: string; text: string }[]>([]);
  const [captionsSupported, setCaptionsSupported] = useState(true);
  const [captionError, setCaptionError] = useState<string | null>(null);

  // Adds or updates one speaker's caption line. Interim results for a given
  // speaker replace that speaker's own in-progress line (keyed `live-<key>`)
  // in place; a final result closes it under a fresh id. Keyed per speaker
  // (not "the last line in the array", as the pre-realtime version assumed)
  // so multiple people talking at once don't overwrite each other's lines.
  const upsertCaptionLine = useCallback((speakerKey: string, speaker: string, text: string, final: boolean) => {
    setCaptionLines((prev) => {
      const liveId = `live-${speakerKey}`;
      const idx = prev.findIndex((l) => l.id === liveId);
      const nextLine = { id: final ? `cap-${Date.now()}-${speakerKey}` : liveId, speaker, text };
      const next = idx >= 0 ? [...prev.slice(0, idx), nextLine, ...prev.slice(idx + 1)] : [...prev, nextLine];
      return next.slice(-3);
    });
  }, []);

  // Latest `broadcastEvent` from `useMeetingConnection` (defined further
  // below), read via a ref so the speech-recognition effect above it in the
  // source doesn't need to be reordered after the hook that produces it.
  const broadcastEventRef = useRef<(event: MeetingRealtimeEvent) => void>(() => {});

  // Meeting elapsed time
  const [meetingSeconds, setMeetingSeconds] = useState(0);

  // Modals & Drawers state
  const [activeSideDrawer, setActiveSideDrawer] = useState<'chat' | 'people' | 'polls' | 'info' | 'waiting' | 'activities' | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showBreakoutRooms, setShowBreakoutRooms] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Recording Engine State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isRecordingPaused) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isRecordingPaused]);

  const formatRecordingTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    const p = (n: number) => n.toString().padStart(2, '0');
    return hrs > 0 ? `${p(hrs)}:${p(mins)}:${p(secs)}` : `${p(mins)}:${p(secs)}`;
  };

  // Elapsed meeting time, shown in the top bar like Google Meet's clock.
  useEffect(() => {
    if (activeTab !== 'in-call') {
      setMeetingSeconds(0);
      return;
    }
    const interval = setInterval(() => setMeetingSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  /**
   * Live captions, transcribed from the microphone by the browser's speech
   * recognition engine. Only Chromium-based browsers ship it, so the control
   * reports the gap rather than pretending to caption.
   */
  useEffect(() => {
    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setCaptionsSupported(Boolean(SpeechRecognitionImpl));
  }, []);

  useEffect(() => {
    if (!captionsOn || activeTab !== 'in-call') return;

    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setCaptionError('Live captions need a browser with speech recognition (Chrome or Edge).');
      return;
    }
    if (!isMicOn) {
      setCaptionError('Captions pause while your microphone is muted.');
      return;
    }

    let stopped = false;
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += chunk;
        else interim += chunk;
      }
      const text = (final || interim).trim();
      if (!text) return;
      upsertCaptionLine('me', 'You', text, Boolean(final));
      // Only finalized lines go over the wire — interim guesses are noisy
      // and would otherwise flood the signalling channel on every word.
      if (final) {
        broadcastEventRef.current({
          kind: 'caption',
          id: `cap-${Date.now()}`,
          speaker: localDisplayName,
          text,
          final: true,
        });
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setCaptionError('Captions need microphone permission.');
        setCaptionsOn(false);
      } else if (event.error !== 'no-speech') {
        setCaptionError('Captions stopped unexpectedly. Turn them on again to retry.');
      }
    };

    // The engine stops itself after a pause; restart while the user wants captions.
    recognition.onend = () => {
      if (stopped) return;
      try {
        recognition.start();
      } catch {
        // Already restarting.
      }
    };

    try {
      recognition.start();
      setCaptionError(null);
    } catch {
      setCaptionError('Could not start captions.');
    }

    return () => {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        // Never started.
      }
    };
  }, [captionsOn, activeTab, isMicOn, upsertCaptionLine, localDisplayName]);

  useEffect(() => {
    if (!captionsOn) {
      setCaptionLines([]);
      setCaptionError(null);
    }
  }, [captionsOn]);

  const handleToggleRecording = () => {
    if (!securitySettings.allowRecording) {
      alert('Host has disabled recording for participants.');
      return;
    }
    if (!isRecording) {
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingSeconds(0);
    } else {
      // Pause or stop
      if (confirm('Stop recording and save video file?')) {
        handleSaveRecordingToDrive();
        setIsRecording(false);
        setIsRecordingPaused(false);
      }
    }
  };

  const handleSaveRecordingToDrive = () => {
    const fileName = `Meeting_Recording_${currentMeetingId}_${Date.now().toString().slice(-4)}.mp4`;
    setFiles((prev) => [
      ...prev,
      {
        id: `file-rec-${Date.now()}`,
        name: fileName,
        type: 'file',
        content: `🎥 OSX Meet Recorded Video Stream (${formatRecordingTime(recordingSeconds)})\nMeeting ID: ${currentMeetingId}\nDate: ${new Date().toLocaleString()}\nParticipants: ${participants.map((p) => p.name).join(', ')}`,
        parentId: resolveDefaultFolderId('Videos') || null,
        createdAt: new Date().toLocaleDateString(),
      },
    ]);
    alert(`🎥 Meeting Recording (${formatRecordingTime(recordingSeconds)}) saved to DriveOSX Videos folder!`);
  };

  // Webcam stream state & permission handling
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [useVirtualCam, setUseVirtualCam] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [micLevel, setMicLevel] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  /**
   * Live hardware handles, mirrored outside React state.
   *
   * The camera indicator stays lit until every track is stopped, so teardown
   * cannot depend on a value captured when an effect ran: the stream is
   * acquired asynchronously and lands after that closure was created. These
   * refs always hold the current handles, which is what unmount reads.
   */
  const mediaRef = useRef<{
    webcam: MediaStream | null;
    audio: MediaStream | null;
    screen: MediaStream | null;
    audioCtx: AudioContext | null;
  }>({ webcam: null, audio: null, screen: null, audioCtx: null });

  const stopStream = (stream: MediaStream | null | undefined) => {
    stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // A track already ended by the browser throws; nothing to release.
      }
    });
  };

  // Releases camera and microphone. Safe to call more than once.
  const stopLocalMedia = useCallback(() => {
    stopStream(mediaRef.current.webcam);
    stopStream(mediaRef.current.audio);
    mediaRef.current.webcam = null;
    mediaRef.current.audio = null;

    const ctx = mediaRef.current.audioCtx;
    mediaRef.current.audioCtx = null;
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }

    setWebcamStream(null);
    setAudioStream(null);
    setAudioContext(null);
    setMicLevel(0);
  }, []);

  // Releases every device this app holds, including the screen share.
  const stopAllMedia = useCallback(() => {
    stopLocalMedia();
    stopStream(mediaRef.current.screen);
    mediaRef.current.screen = null;
    setScreenStream(null);
    setIsScreenSharing(false);
  }, [stopLocalMedia]);

  /**
   * The single place that actually mutes/unmutes this user's own mic — flips
   * the real `track.enabled` (so peers actually stop/start hearing it, with
   * no renegotiation needed) and the UI state that the existing
   * broadcast-on-change effect (below) picks up to tell the room. The
   * control-bar mic button, a host's `force-mute`, and a user accepting an
   * `unmute-request` all funnel through here — no one of them may skip the
   * others' effects (CLAUDE.md §17: authorization/state changes centralized,
   * not scattered).
   */
  const setMicEnabled = useCallback((next: boolean) => {
    setIsMicOn(next);
    mediaRef.current.webcam?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
  }, []);

  // Closing or minimising the window unmounts the app. Release the hardware
  // here so the camera light goes out with it.
  useEffect(() => {
    return () => {
      stopStream(mediaRef.current.webcam);
      stopStream(mediaRef.current.audio);
      stopStream(mediaRef.current.screen);
      const ctx = mediaRef.current.audioCtx;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
      mediaRef.current = { webcam: null, audio: null, screen: null, audioCtx: null };
    };
  }, []);

  // A reload or tab close never runs React cleanup; stop the tracks directly.
  useEffect(() => {
    const release = () => {
      stopStream(mediaRef.current.webcam);
      stopStream(mediaRef.current.audio);
      stopStream(mediaRef.current.screen);
    };
    window.addEventListener('pagehide', release);
    return () => window.removeEventListener('pagehide', release);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const checkPermissions = async () => {
      try {
        if (navigator?.permissions?.query) {
          const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });

          if (!isCancelled) {
            setPermissionStatus(cameraStatus.state === 'granted' && micStatus.state === 'granted' ? 'granted' : cameraStatus.state === 'denied' ? 'denied' : 'prompt');

            cameraStatus.onchange = () => {
              if (!isCancelled) {
                setPermissionStatus(cameraStatus.state === 'granted' && micStatus.state === 'granted' ? 'granted' : cameraStatus.state === 'denied' ? 'denied' : 'prompt');
              }
            };
            micStatus.onchange = () => {
              if (!isCancelled) {
                setPermissionStatus(cameraStatus.state === 'granted' && micStatus.state === 'granted' ? 'granted' : cameraStatus.state === 'denied' ? 'denied' : 'prompt');
              }
            };
          }
        }

        if (!isCancelled) {
          await enumerateDevices();
        }
      } catch {
        if (!isCancelled) {
          setPermissionStatus('prompt');
        }
      }
    };

    checkPermissions();
    return () => {
      isCancelled = true;
    };
  }, []);

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);
      if (videoInputs.length > 0 && !selectedVideoDeviceId) {
        setSelectedVideoDeviceId(videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0 && !selectedAudioDeviceId) {
        setSelectedAudioDeviceId(audioInputs[0].deviceId);
      }
    } catch {
      // Permission not granted yet, devices not available
    }
  };

  const setupAudioLevelMeter = (stream: MediaStream) => {
    if (!stream.getAudioTracks().length) return;

    try {
      const previous = mediaRef.current.audioCtx;
      if (previous && previous.state !== 'closed') {
        previous.close().catch(() => {});
      }

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        // Stop the loop once the meter's own context or stream is gone,
        // otherwise it keeps a closed AudioContext alive frame after frame.
        if (mediaRef.current.audioCtx !== ctx || !stream.active) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
        requestAnimationFrame(updateLevel);
      };

      mediaRef.current.audioCtx = ctx;
      setAudioContext(ctx);
      updateLevel();
    } catch {
      setMicLevel(65);
    }
  };

  // Reaction animations
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; participantId: string }[]>([]);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  // Chat & file sharing — unified with Messaging (see `meetingConversationId`
  // above). There is no bespoke meeting-chat backend of its own: once the
  // call has a linked conversation, this is a thin view over
  // `MessagingService`, the same service Messenger's own chat uses.
  const [chatInput, setChatInput] = useState('');
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [isLoadingConversationMessages, setIsLoadingConversationMessages] = useState(false);
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [isUploadingMeetingFile, setIsUploadingMeetingFile] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const meetingFileInputRef = useRef<HTMLInputElement | null>(null);

  // Polls State
  const [polls, setPolls] = useState<Poll[]>([]);

  // Participants State
  const [participants, setParticipants] = useState<Participant[]>([selfParticipant]);
  // Roster fetched from the meeting's REST snapshot — mainly for real
  // participants' display names/roles, which the signalling frames don't
  // carry for anyone already in the room before you joined.
  const [meetingRoster, setMeetingRoster] = useState<MeetingParticipant[]>([]);
  // Which remote userIds this component itself has added to `participants`,
  // so the WebRTC roster reconciliation below only ever adds/removes ids it
  // is responsible for — never the separate waiting-room demo entries.
  const knownRemoteIdsRef = useRef<Set<string>>(new Set());

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedTitle, setSchedTitle] = useState('');
  const [schedTime, setSchedTime] = useState('02:00 PM');
  const [schedCategory, setSchedCategory] = useState<'Work' | 'Personal'>('Work');
  const [schedPasscode, setSchedPasscode] = useState('');
  const [schedWaitingRoom, setSchedWaitingRoom] = useState(true);
  const [todayMeetings, setTodayMeetings] = useState<any[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);

  // Request Physical Camera Access
  const requestCameraAccess = async (deviceId?: string) => {
    setIsRequestingCamera(true);
    setCameraError(null);

    // Release the previous capture before asking for another, or the old
    // track keeps the device busy and the indicator stays on.
    stopStream(mediaRef.current.webcam);
    stopStream(mediaRef.current.audio);
    mediaRef.current.webcam = null;
    mediaRef.current.audio = null;
    setWebcamStream(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        // The most common real cause: browsers only expose getUserMedia in a
        // "secure context" (https, or the exact host localhost/127.0.0.1) —
        // plain http on a LAN IP silently has no `mediaDevices` at all, which
        // otherwise reads as a mysterious "not supported" browser bug.
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
          throw new Error(
            `Camera & microphone need a secure connection. You're on ${window.location.protocol}//${window.location.host}, which browsers treat as insecure. Open this app over https://, or via http://localhost if you're on the same machine as the server.`,
          );
        }
        throw new Error('Camera API (getUserMedia) is not supported in this browser environment.');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
      }

      mediaRef.current.webcam = stream;
      mediaRef.current.audio = stream;
      setWebcamStream(stream);
      setAudioStream(stream);
      setPermissionStatus('granted');
      setUseVirtualCam(false);
      setCameraError(null);

      setupAudioLevelMeter(stream);

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedVideoDeviceId) {
          setSelectedVideoDeviceId(videoInputs[0].deviceId);
        }
      } catch {}
    } catch (err: any) {
      console.warn('Camera request error:', err);
      let errMsg = 'Could not access physical webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        errMsg = 'Camera & Microphone permission was denied or blocked in browser settings.';
        setPermissionStatus('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No physical webcam detected on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is in use by another program or tab.';
      } else {
        errMsg = err.message || 'Unable to access camera stream.';
      }
      setCameraError(errMsg);
      setWebcamStream(null);
    } finally {
      setIsRequestingCamera(false);
    }
  };

  // Single owner of camera acquisition: previously the lobby and the
  // pre-meeting screen each ran their own effect and raced for the device.
  useEffect(() => {
    // Once in a call, the in-call control bar flips `track.enabled` on the
    // existing capture instead (see its onClick handlers below) — tearing
    // the whole device down and reacquiring it mid-call would drop the
    // tracks already attached to the meeting's peer connections.
    if (activeTab === 'in-call') return;

    const wantsPhysicalCamera = isVideoOn && !useVirtualCam;

    if (wantsPhysicalCamera && permissionStatus !== 'denied') {
      requestCameraAccess(selectedVideoDeviceId || undefined);
      return;
    }

    stopStream(mediaRef.current.webcam);
    mediaRef.current.webcam = null;
    setWebcamStream(null);
  }, [isVideoOn, useVirtualCam, selectedVideoDeviceId, permissionStatus, activeTab]);

  useEffect(() => {
    if (!isMicOn) {
      setMicLevel(0);
      return;
    }
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      return;
    }
    const interval = setInterval(() => {
      setMicLevel(Math.floor(30 + Math.random() * 55));
    }, 200);
    return () => clearInterval(interval);
  }, [isMicOn, audioStream]);

  // Handles every transient realtime event from another participant —
  // reactions, caption lines, and poll create/vote/delete — all carried over
  // the same `'state'` socket messages as mic/camera/hand (see `webrtc.ts`),
  // just tagged with a `kind` other than `'presence'` so they're dispatched
  // here instead of merged into `remoteParticipantState`.
  const handleRemoteEvent = useCallback((fromUserId: string, event: MeetingRealtimeEvent) => {
    switch (event.kind) {
      case 'reaction': {
        const id = `${event.id}-${fromUserId}`;
        setActiveReactions((prev) => [...prev, { id, emoji: event.emoji, participantId: fromUserId }]);
        setTimeout(() => {
          setActiveReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2500);
        break;
      }
      case 'caption': {
        upsertCaptionLine(fromUserId, event.speaker, event.text, event.final);
        break;
      }
      case 'poll-create': {
        setPolls((prev) => (prev.some((p) => p.id === event.poll.id) ? prev : [event.poll, ...prev]));
        break;
      }
      case 'poll-vote': {
        setPolls((prev) => prev.map((p) => (p.id === event.pollId ? applyVote(p, event.voterId, event.optionId) : p)));
        break;
      }
      case 'poll-delete': {
        // `fromUserId` is set server-side from the sender's own authenticated
        // socket (see `signaling.ts`), so this is a real check, not merely
        // cosmetic UI gating — a non-host's forged delete is simply ignored.
        if (fromUserId !== meetingHostId) break;
        setPolls((prev) => prev.filter((p) => p.id !== event.pollId));
        break;
      }
      case 'force-mute': {
        // A host can only ask this client to mute itself, never flip
        // someone else's hardware directly — this funnels through the same
        // `setMicEnabled` the mic button uses, so the real track and the
        // broadcast-to-the-room both happen.
        if (fromUserId === meetingHostId && (event.targetUserId === selfUserId || event.targetUserId === 'all')) {
          setMicEnabled(false);
        }
        break;
      }
      case 'unmute-request': {
        // Never auto-unmutes — only ever surfaces a dismissible prompt the
        // recipient has to act on themselves (see the banner in the in-call
        // view below).
        if (fromUserId === meetingHostId && (event.targetUserId === selfUserId || event.targetUserId === 'all')) {
          setShowUnmuteRequest(true);
        }
        break;
      }
      default:
        break;
    }
  }, [upsertCaptionLine, meetingHostId, selfUserId, setMicEnabled]);

  // Real WebRTC: this is what actually carries video/audio to and from every
  // other participant in the room (see `webrtc.ts`). A no-op until both the
  // meeting and a local capture exist.
  const { remoteStreams, remoteParticipantState, connectionState, broadcastState, broadcastEvent, setScreenShareTrack } =
    useMeetingConnection({
      meetingId: activeTab === 'in-call' ? currentMeetingId || null : null,
      selfUserId,
      localStream: webcamStream,
      onRemoteEvent: handleRemoteEvent,
    });

  // Keeps `broadcastEventRef` current for the speech-recognition effect
  // above, which is defined before this hook exists yet.
  useEffect(() => {
    broadcastEventRef.current = broadcastEvent;
  }, [broadcastEvent]);

  // Loads and polls the linked conversation's history while the chat drawer
  // is open. There's no realtime push wired into Meet for this, so a short
  // interval — the same pattern Messenger's own background refresh uses —
  // keeps it reasonably live without adding a second signalling path.
  useEffect(() => {
    if (activeSideDrawer !== 'chat' || !meetingConversationId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const msgs = await MessagingService.listMessages(meetingConversationId);
        if (!cancelled) setConversationMessages(msgs);
      } catch (error) {
        if (!cancelled) setChatError(error instanceof Error ? error.message : 'Could not load chat history.');
      } finally {
        if (!cancelled) setIsLoadingConversationMessages(false);
      }
    };

    setIsLoadingConversationMessages(true);
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeSideDrawer, meetingConversationId]);

  // Refreshes the meeting's REST snapshot: real participants' display names
  // (the signalling layer only ever gives you a joiner's own name, never
  // retroactively for people already in the room) and whether the backend
  // has linked this call to a Messaging conversation yet.
  useEffect(() => {
    if (activeTab !== 'in-call' || !currentMeetingId) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const meeting = await MeetingService.getMeeting(currentMeetingId);
        if (cancelled) return;
        setMeetingRoster(meeting.participants || []);
        setMeetingConversationId(meeting.conversationId ?? null);
      } catch (error) {
        console.warn('Failed to refresh meeting roster:', error);
      }
    };

    refresh();
    const interval = setInterval(refresh, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeTab, currentMeetingId]);

  // Reconciles the rendered roster with who is actually WebRTC-connected.
  // Only ids this effect itself added are ever removed again, so the
  // separate (simulated) waiting-room admit flow is never touched by it.
  useEffect(() => {
    if (activeTab !== 'in-call') return;
    const remoteIds = new Set(Object.keys(connectionState));
    const previouslyKnown = knownRemoteIdsRef.current;

    setParticipants((prev) => {
      let next = prev;
      previouslyKnown.forEach((id) => {
        if (!remoteIds.has(id)) next = next.filter((p) => p.id !== id);
      });
      remoteIds.forEach((id) => {
        if (previouslyKnown.has(id) || next.some((p) => p.id === id)) return;
        const rosterEntry = meetingRoster.find((m) => m.userId === id);
        const liveState = remoteParticipantState[id];
        next = [
          ...next,
          {
            id,
            name: rosterEntry?.name || 'Participant',
            role: rosterEntry?.role === 'host' ? 'Host' : rosterEntry?.role === 'cohost' ? 'Co-host' : 'Participant',
            avatar: '',
            isMuted: liveState?.isMuted ?? rosterEntry?.isMuted ?? false,
            isVideoOn: liveState?.isVideoOn ?? rosterEntry?.isVideoOn ?? true,
            isHandRaised: liveState?.isHandRaised ?? false,
            isSpeaking: false,
            isScreenSharing: liveState?.isScreenSharing ?? false,
            bgGradient: gradientForId(id),
          },
        ];
      });
      return next;
    });

    knownRemoteIdsRef.current = remoteIds;
  }, [connectionState, meetingRoster, remoteParticipantState, activeTab]);

  // Live mic/camera/hand/presenting badges for already-known remote tiles,
  // from the `state` broadcasts other participants send when theirs change.
  // Each broadcast may carry only the field(s) that actually changed (see
  // `webrtc.ts`'s merge-on-receipt), so a missing field here falls back to
  // the tile's current value rather than clobbering it with `undefined`.
  useEffect(() => {
    if (activeTab !== 'in-call') return;
    setParticipants((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (p.id === 'me') return p;
        const state = remoteParticipantState[p.id];
        if (!state) return p;
        const merged = {
          isMuted: state.isMuted ?? p.isMuted,
          isVideoOn: state.isVideoOn ?? p.isVideoOn,
          isHandRaised: state.isHandRaised ?? p.isHandRaised,
          isScreenSharing: state.isScreenSharing ?? p.isScreenSharing,
        };
        if (
          merged.isMuted === p.isMuted &&
          merged.isVideoOn === p.isVideoOn &&
          merged.isHandRaised === p.isHandRaised &&
          merged.isScreenSharing === p.isScreenSharing
        ) {
          return p;
        }
        changed = true;
        return { ...p, ...merged };
      });
      return changed ? next : prev;
    });
  }, [remoteParticipantState, activeTab]);

  // Broadcasts this user's own mic/camera state whenever it changes — a
  // fresh join, a toolbar toggle, or the Ctrl+D/Ctrl+E shortcuts all update
  // `isMicOn`/`isVideoOn`, and this is the single place that tells the room.
  // Also persisted via REST so a participant who joins later still sees the
  // right badge even though they missed the live broadcast.
  useEffect(() => {
    if (activeTab !== 'in-call') return;
    broadcastState({ isMuted: !isMicOn, isVideoOn });
    if (currentMeetingId) {
      MeetingService.updateParticipant(currentMeetingId, { isMuted: !isMicOn, isVideoOn }).catch(() => {});
    }
  }, [isMicOn, isVideoOn, activeTab, currentMeetingId, broadcastState]);

  /**
   * Real active-speaker detection: an `AnalyserNode` per live stream (the
   * local capture plus every connected remote stream), sampled on a
   * `requestAnimationFrame` loop. A short hysteresis window (150ms) avoids
   * the badge flickering on brief dips instead of genuinely stopping.
   */
  const speakingAnalysersRef = useRef<
    Map<string, { ctx: AudioContext; raf: number; aboveSince: number | null; belowSince: number | null; speaking: boolean }>
  >(new Map());

  useEffect(() => {
    if (activeTab !== 'in-call') {
      speakingAnalysersRef.current.forEach((entry) => {
        cancelAnimationFrame(entry.raf);
        entry.ctx.close().catch(() => {});
      });
      speakingAnalysersRef.current.clear();
      return;
    }

    const streams: Record<string, MediaStream> = { ...remoteStreams };
    if (webcamStream) streams.me = webcamStream;

    const analysers = speakingAnalysersRef.current;
    const SPEAKING_THRESHOLD = 14;
    const HOLD_MS = 150;

    // Drop analysers for streams that are gone (participant left, or camera
    // stream swapped out).
    Array.from(analysers.keys()).forEach((id) => {
      if (streams[id]) return;
      const entry = analysers.get(id);
      if (entry) {
        cancelAnimationFrame(entry.raf);
        entry.ctx.close().catch(() => {});
      }
      analysers.delete(id);
      setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, isSpeaking: false } : p)));
    });

    // Start an analyser for every stream that doesn't have one yet.
    Object.entries(streams).forEach(([id, stream]) => {
      if (analysers.has(id) || !stream.getAudioTracks().length) return;

      let ctx: AudioContext;
      try {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return;
      }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      try {
        ctx.createMediaStreamSource(stream).connect(analyser);
      } catch {
        ctx.close().catch(() => {});
        return;
      }
      const data = new Uint8Array(analyser.frequencyBinCount);
      const state = { ctx, raf: 0, aboveSince: null as number | null, belowSince: null as number | null, speaking: false };
      analysers.set(id, state);

      const tick = () => {
        if (!analysers.has(id)) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const now = performance.now();

        if (avg > SPEAKING_THRESHOLD) {
          state.belowSince = null;
          if (state.aboveSince === null) state.aboveSince = now;
          if (!state.speaking && now - state.aboveSince >= HOLD_MS) {
            state.speaking = true;
            setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, isSpeaking: true } : p)));
          }
        } else {
          state.aboveSince = null;
          if (state.belowSince === null) state.belowSince = now;
          if (state.speaking && now - state.belowSince >= HOLD_MS) {
            state.speaking = false;
            setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, isSpeaking: false } : p)));
          }
        }

        state.raf = requestAnimationFrame(tick);
      };
      state.raf = requestAnimationFrame(tick);
    });
  }, [activeTab, webcamStream, remoteStreams]);

  // Belt-and-suspenders teardown if the component unmounts mid-call.
  useEffect(() => {
    return () => {
      speakingAnalysersRef.current.forEach((entry) => {
        cancelAnimationFrame(entry.raf);
        entry.ctx.close().catch(() => {});
      });
      speakingAnalysersRef.current.clear();
    };
  }, []);

  // Start instant meeting
  const handleStartInstantMeeting = async (title = 'Instant Sync') => {
    setMeetingTitle(title);
    setActiveTab('pre-meeting');

    try {
      const meeting = await MeetingService.createMeeting({ title });
      if (meeting) {
        // `id` (the DB uuid) is what every other `/meetings/:meetingId` route
        // — and the WebRTC signalling room — actually accept; `meetingCode`
        // is only ever a display label. Keeping the two straight is what
        // lets a real-time call with someone who joined via `handleJoinByCode`
        // land in the same signalling room as this one.
        setCurrentMeetingId(meeting.id || meeting._id);
        setMeetingShareCode(meeting.meetingCode || '');
        setMeetingTitle(meeting.title || title);
        setMeetingConversationId(meeting.conversationId ?? null);
        setMeetingHostId(meeting.hostId ?? null);
      }
    } catch (error) {
      console.warn('Failed to create meeting:', error);
    }
  };

  /**
   * Joins (or, for the host, simply re-enters) a meeting already known by id
   * or share code. Shared by manual code/link entry, "Today's Meetings", and
   * the hand-off from a call started in Messages — all three end up with an
   * identifier and just need to land in the same place.
   */
  const resumeMeeting = async (idOrCode: string, passcode?: string) => {
    const target = idOrCode.trim();
    if (!target) return;

    setJoinError(null);
    setActiveTab('pre-meeting');

    try {
      const meeting = await MeetingService.joinMeeting(target, passcode);
      if (meeting) {
        setCurrentMeetingId(meeting.id || meeting._id || target);
        setMeetingShareCode(meeting.meetingCode || '');
        setMeetingTitle(meeting.title || `Meeting (${target})`);
        setMeetingConversationId(meeting.conversationId ?? null);
        setMeetingHostId(meeting.hostId ?? null);
        // The API never returns a meeting passcode. Keep the one the user
        // entered so the security panel can show that a passcode is in force.
        if (meeting.hasPasscode) {
          setSecuritySettings((prev) => ({ ...prev, passcode: passcode ?? '' }));
        }
      }
    } catch (error: any) {
      setJoinError(error.message || 'Failed to join meeting');
      setActiveTab('lobby');
    }
  };

  // A call started from Messages hands off a specific meeting to join,
  // rather than leaving the caller to find it again on the lobby.
  useEffect(() => {
    if (!pendingMeetingId) return;
    const pending = consumePendingMeeting();
    if (pending) {
      // A voice call hands off with the camera left off — accepting one
      // shouldn't unexpectedly turn it on. A video call (or a plain "Today's
      // Meetings" resume, which never sets this) keeps the usual camera-on
      // default. The mic is always on either way.
      setIsVideoOn(pending.video);
      setIsMicOn(true);
      void resumeMeeting(pending.id);
    }
    // `resumeMeeting` is intentionally omitted: it's redefined every render
    // (it closes over plenty of state) and this effect must fire exactly
    // once per pending id, not on every one of those redefinitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMeetingId, consumePendingMeeting]);

  // Join meeting via code / link
  const handleJoinByCode = async () => {
    let cleanCode = meetingCode.trim();
    if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/');
      cleanCode = parts[parts.length - 1];
    }
    await resumeMeeting(cleanCode, inputPasscode);
  };

  const handleEndCall = async () => {
    if (currentMeetingId) {
      try {
        await MeetingService.leaveMeeting(currentMeetingId);
      } catch (error) {
        console.warn('Failed to leave meeting:', error);
      }
    }
    stopAllMedia();
    setActiveTab('lobby');
    setActiveSideDrawer(null);
    setIsRecording(false);
    setIsScreenSharing(false);
    setIsHandRaised(false);
    setCaptionsOn(false);
    setPinnedParticipantId(null);
    setParticipants([selfParticipant]);
    setConversationMessages([]);
    setChatError(null);
    setMeetingConversationId(null);
    setMeetingShareCode('');
    setMeetingHostId(null);
    setWaitingQueue([]);
    setShowUnmuteRequest(false);
    setPipPosition(null);
    setPipSize(DEFAULT_PIP_WIDTH);
    knownRemoteIdsRef.current = new Set();
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/meeting/${currentMeetingId}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Screen Sharing. `mode` maps to the surface the picker opens on; browsers
  // treat it as a hint, and the user's choice in the picker always wins.
  const toggleScreenShare = async (mode: 'entire' | 'window' | 'tab' = screenShareMode) => {
    if (!isScreenSharing) {
      if (!securitySettings.allowScreenShare) {
        alert('The host has turned off screen sharing for participants.');
        return;
      }
      try {
        const surface = mode === 'window' ? 'window' : mode === 'tab' ? 'browser' : 'monitor';
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, displaySurface: surface } as any,
          audio: false,
        });
        setScreenShareMode(mode);
        mediaRef.current.screen = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);
        const track = stream.getVideoTracks()[0];
        // Swaps this track onto every peer connection's outgoing video
        // sender (see `webrtc.ts`), so the room actually sees the screen —
        // capturing it alone previously went nowhere.
        setScreenShareTrack(track);
        broadcastState({ isScreenSharing: true });
        // The browser's own "Stop sharing" bar ends the track behind our back.
        track.onended = () => {
          mediaRef.current.screen = null;
          setScreenStream(null);
          setIsScreenSharing(false);
          setScreenShareTrack(null);
          broadcastState({ isScreenSharing: false });
        };
      } catch (error) {
        console.warn('Screen share denied:', error);
      }
    } else {
      stopStream(mediaRef.current.screen);
      mediaRef.current.screen = null;
      setScreenStream(null);
      setIsScreenSharing(false);
      setScreenShareTrack(null);
      broadcastState({ isScreenSharing: false });
    }
  };

  // Chat & file sharing — a thin view over MessagingService once the call
  // has a linked conversation (see `meetingConversationId`'s doc comment).
  const handleSendMeetingChatMessage = async () => {
    const body = chatInput.trim();
    if (!body || !meetingConversationId || isSendingChatMessage) return;
    setIsSendingChatMessage(true);
    setChatError(null);
    try {
      const message = await MessagingService.sendMessage(meetingConversationId, body);
      setConversationMessages((prev) => [...prev, message]);
      setChatInput('');
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Could not send that message.');
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  const handleSendMeetingFile = async (file: File | null | undefined) => {
    if (!file || !meetingConversationId) return;
    setIsUploadingMeetingFile(true);
    setChatError(null);
    try {
      const message = await MessagingService.sendFileMessage(meetingConversationId, file);
      setConversationMessages((prev) => [...prev, message]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Could not share that file.');
    } finally {
      setIsUploadingMeetingFile(false);
    }
  };

  // Poll actions. Each broadcasts over the same realtime channel `webrtc.ts`
  // uses for reactions/captions, so every participant's `polls` state (and
  // vote tallies) stays in sync — session-only, same as the rest of the
  // call's state (no backend persistence for this).
  const handleCreatePoll = (question: string, optionsList: string[]) => {
    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      question,
      options: optionsList.map((text, idx) => ({ id: `opt-${idx}`, text, votes: 0 })),
      isActive: true,
      creator: 'You (Host)',
      totalVotes: 0,
      votesByVoter: {},
    };
    setPolls((prev) => [newPoll, ...prev]);
    broadcastEvent({ kind: 'poll-create', poll: newPoll });
  };

  const handleVotePoll = (pollId: string, optionId: string) => {
    const voterId = selfUserId ?? 'me';
    setPolls((prev) => prev.map((p) => (p.id === pollId ? applyVote(p, voterId, optionId) : p)));
    broadcastEvent({ kind: 'poll-vote', pollId, optionId, voterId });
  };

  const handleDeletePoll = (pollId: string) => {
    // The drawer already hides the delete button from non-hosts (see
    // `isHost` passed to `PollsDrawer` below); this check is a second,
    // consistent layer rather than trusting that UI gate alone.
    if (!isHost) return;
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
    broadcastEvent({ kind: 'poll-delete', pollId });
  };

  // Waiting Room approvals
  const handleApproveWaiting = (w: WaitingParticipant) => {
    setWaitingQueue((prev) => prev.filter((item) => item.id !== w.id));
    setParticipants((prev) => [
      ...prev,
      {
        id: w.id,
        name: w.name,
        role: 'Participant',
        avatar: w.avatar,
        isMuted: false,
        isVideoOn: true,
        isHandRaised: false,
        isSpeaking: false,
        isScreenSharing: false,
        bgGradient: 'from-cyan-600 to-blue-700',
      },
    ]);
  };

  const handleDenyWaiting = (id: string) => {
    setWaitingQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Host Participant Management. A host's client cannot reach into someone
  // else's device and flip a hardware switch — these broadcast a command
  // every recipient's own client obeys by muting *itself* (`force-mute` in
  // `handleRemoteEvent` above), and the room's roster only reflects the mute
  // once that recipient's own real state broadcast lands, same as any other
  // participant's mic toggle. No optimistic local mutation of `participants`
  // here: that's exactly the fakery this replaces.
  const handleMuteParticipant = (id: string) => {
    if (!isHost) return;
    broadcastEvent({ kind: 'force-mute', targetUserId: id });
  };

  const handleMuteAll = () => {
    if (!isHost) return;
    broadcastEvent({ kind: 'force-mute', targetUserId: 'all' });
  };

  // The unmute counterpart is deliberately only ever a *request*: forcibly
  // turning on someone else's microphone without consent is a real privacy
  // problem real conferencing apps avoid (Zoom/Meet's "Unmute all" asks,
  // it doesn't force). The recipient decides via the banner this triggers.
  const handleAskUnmuteParticipant = (id: string) => {
    if (!isHost) return;
    broadcastEvent({ kind: 'unmute-request', targetUserId: id });
  };

  const handleAskUnmuteAll = () => {
    if (!isHost) return;
    broadcastEvent({ kind: 'unmute-request', targetUserId: 'all' });
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  // Reaction
  const handleSendReaction = (emoji: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    setActiveReactions((prev) => [...prev, { id, emoji, participantId: 'me' }]);
    setShowReactionsMenu(false);
    broadcastEvent({ kind: 'reaction', id, emoji });

    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  };

  // Raising a hand is visible to the room, so it belongs on the participant
  // record and not only on the toolbar button — and is broadcast so every
  // other participant's roster/tile reflects it too.
  const handleToggleHand = useCallback(() => {
    setIsHandRaised((prev) => {
      const next = !prev;
      setParticipants((list) =>
        list.map((p) => (p.id === 'me' ? { ...p, isHandRaised: next } : p))
      );
      broadcastState({ isHandRaised: next });
      return next;
    });
  }, [broadcastState]);

  // Keyboard shortcuts, matching Google Meet's defaults.
  useEffect(() => {
    if (activeTab !== 'in-call') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping || !(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      if (key === 'd') {
        e.preventDefault();
        setMicEnabled(!isMicOn);
      } else if (key === 'e') {
        e.preventDefault();
        setIsVideoOn((prev) => !prev);
      } else if (e.ctrlKey && key === 'h') {
        e.preventDefault();
        handleToggleHand();
      } else if (e.altKey && key === 'c') {
        e.preventDefault();
        setActiveSideDrawer((prev) => (prev === 'chat' ? null : 'chat'));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, handleToggleHand, isMicOn, setMicEnabled]);

  // Stage layout. "Auto" spotlights whoever is presenting (locally or a
  // remote participant broadcasting `isScreenSharing`) or pinned, and
  // otherwise tiles the room, which is how Meet behaves.
  const someoneElseIsPresenting = useMemo(
    () => participants.some((p) => p.id !== 'me' && p.isScreenSharing),
    [participants],
  );
  const effectiveLayout = useMemo(() => {
    if (layoutMode !== 'auto') return layoutMode;
    if (isScreenSharing || someoneElseIsPresenting || pinnedParticipantId) return 'spotlight';
    return 'tiled';
  }, [layoutMode, isScreenSharing, someoneElseIsPresenting, pinnedParticipantId]);

  const raisedHandCount = participants.filter((p) => p.isHandRaised).length;

  // Who the stage shows. Pinning selects the main feed; otherwise the first
  // active speaker takes it, falling back to the first participant.
  const stageParticipants = participants;

  const spotlightParticipant = useMemo(() => {
    if (pinnedParticipantId) {
      const pinned = participants.find((p) => p.id === pinnedParticipantId);
      if (pinned) return pinned;
    }
    // Prefer whoever is presenting, then whoever is talking, then anyone but
    // yourself (your own view lives in the picture-in-picture corner instead
    // — see the spotlight/sidebar layouts below), and only fall back to
    // yourself in a solo call.
    return (
      participants.find((p) => p.id !== 'me' && p.isScreenSharing) ||
      participants.find((p) => p.isSpeaking) ||
      participants.find((p) => p.id !== 'me') ||
      participants[0] ||
      null
    );
  }, [participants, pinnedParticipantId]);

  const otherParticipants = useMemo(
    () => participants.filter((p) => p.id !== spotlightParticipant?.id && p.id !== 'me'),
    [participants, spotlightParticipant]
  );

  const selfParticipantData = useMemo(() => participants.find((p) => p.id === 'me') ?? null, [participants]);

  // Column count for the tiled stage: derived from the room size and the
  // width actually available, so tiles stay legible instead of slivers.
  const tileColumns = useMemo(() => {
    const stageWidth = activeSideDrawer && !isCompact ? containerWidth - 320 : containerWidth;
    const maxByWidth = Math.max(1, Math.floor(stageWidth / 240));
    const byCount = Math.ceil(Math.sqrt(Math.max(1, participants.length)));
    return Math.max(1, Math.min(maxByWidth, byCount, 4));
  }, [containerWidth, participants.length, activeSideDrawer, isCompact]);

  // Schedule Meeting
  const handleSaveSchedule = async () => {
    if (!schedTitle.trim()) return;
    const todayISO = new Date().toISOString().split('T')[0];

    // Create the meeting first so the calendar event links to a real,
    // joinable meeting id/code instead of a fabricated one that never
    // matched what `createMeeting` actually returns.
    let meeting: Meeting | null = null;
    try {
      meeting = await MeetingService.createMeeting({
        title: schedTitle.trim(),
        description: `Scheduled meeting`,
        startTime: new Date().toISOString(),
        passcode: schedPasscode,
        waitingRoomEnabled: schedWaitingRoom,
      });
    } catch (error) {
      console.warn('Failed to save scheduled meeting:', error);
    }

    const meetingId = meeting?.id || meeting?._id;
    addCalendarEvent({
      title: `🎥 ${schedTitle.trim()}`,
      date: todayISO,
      time: schedTime,
      category: schedCategory,
      description: meetingId
        ? `Video Meeting Link: ${window.location.origin}/meeting/${meetingId}${
            schedPasscode ? ` | Passcode: ${schedPasscode}` : ''
          }`
        : `Video meeting${schedPasscode ? ` | Passcode: ${schedPasscode}` : ''} (link unavailable — could not reach the server)`,
    });

    if (schedPasscode) {
      setSecuritySettings((prev) => ({ ...prev, passcode: schedPasscode, waitingRoomEnabled: schedWaitingRoom }));
    }
    setShowScheduleModal(false);
    setSchedTitle('');
    alert(`📅 Meeting scheduled and added to DriveOSX Calendar!`);
  };

  useEffect(() => {
    let cancelled = false;
    const loadMeetings = async () => {
      setIsLoadingMeetings(true);
      try {
        const meetings = await MeetingService.getTodayMeetings();
        if (!cancelled) {
          setTodayMeetings(meetings);
        }
      } catch (error) {
        console.warn('Failed to load meetings:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingMeetings(false);
        }
      }
    };
    loadMeetings();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell
      ref={containerRef}
      className={`font-sans ${isLight ? 'bg-[#f4f4f7] text-slate-800' : 'bg-[#18181c] text-white'}`}
    >
      {/* =========================================================
          VIEW 1: LOBBY / DASHBOARD VIEW WITH CAMERA PREVIEW
         ========================================================= */}
      {activeTab === 'lobby' && (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className={`flex ${containerWidth >= 780 ? 'flex-row' : 'flex-col'} p-3 sm:p-5 gap-4 sm:gap-6 max-w-6xl mx-auto w-full`}>
          {/* Left Column: Quick Actions & Camera Test Panel */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 w-full">
            {/* Header branding */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                  <Video size={22} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">OSX Meet</h1>
                  <p className={`text-[11px] sm:text-xs ${isLight ? 'text-slate-500' : 'text-white/50'} truncate`}>
                    HD video calls, screen sharing, whiteboard & breakout rooms
                  </p>
                </div>
              </div>
            </div>

             {/* Camera & Audio Check Box */}
             <div
               className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-3 ${
                 isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-[#24232a] border-white/10'
               }`}
             >
               {/* Preview Window: fixed 16:9 frame, capped so a wide window
                   does not stretch the picture into a letterbox strip. */}
               <div className="w-full max-w-lg mx-auto aspect-video rounded-xl overflow-hidden bg-black relative border border-white/10 flex items-center justify-center shrink-0">
                  {isVideoOn ? (
                    <VirtualCameraCanvas stream={webcamStream} />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center gap-1 text-slate-400">
                      <VideoOff size={24} className="opacity-60" />
                      <span className="text-[11px] font-medium">Camera is Off</span>
                    </div>
                  )}

                  {/* Status Overlay Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10 z-10">
                    {webcamStream ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Webcam Live</span>
                      </>
                    ) : useVirtualCam ? (
                      <>
                        <Sparkles size={10} className="text-indigo-400" />
                        <span>Virtual Studio Cam</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-zinc-500" />
                        <span>Camera Off</span>
                      </>
                    )}
                  </div>
                 </div>

               {(permissionStatus === 'prompt' || permissionStatus === 'denied') && (
                 <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
                   permissionStatus === 'denied'
                     ? 'bg-red-500/10 border-red-500/30'
                     : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'
                 }`}>
                   <div className="flex items-center gap-2">
                     <ShieldCheck size={14} className={permissionStatus === 'denied' ? 'text-red-400' : 'text-amber-500'} />
                     <span className={`text-[11px] font-bold ${permissionStatus === 'denied' ? 'text-red-300' : 'text-amber-600 dark:text-amber-400'}`}>
                       {permissionStatus === 'denied' ? 'Camera & Microphone Blocked' : 'Permission Required'}
                     </span>
                   </div>
                   <p className={`text-[10px] leading-relaxed ${permissionStatus === 'denied' ? 'text-red-200/80' : 'text-amber-700/80 dark:text-amber-300/80'}`}>
                     {permissionStatus === 'denied'
                       ? 'Camera and microphone access was blocked. Please enable it in your browser settings.'
                       : 'Grant camera and microphone access to use video calls.'}
                   </p>
                   <button
                     onClick={() => requestCameraAccess(selectedVideoDeviceId || undefined)}
                     disabled={isRequestingCamera}
                     className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                       permissionStatus === 'denied'
                         ? 'bg-red-600 hover:bg-red-500 text-white'
                         : 'bg-blue-600 hover:bg-blue-500 text-white'
                     } disabled:opacity-50`}
                   >
                     {isRequestingCamera ? (
                       <>
                         <RefreshCw size={11} className="animate-spin" />
                         Requesting...
                       </>
                     ) : (
                       <>
                         <Video size={11} />
                         {permissionStatus === 'denied' ? 'Try Again' : 'Enable Camera & Mic'}
                       </>
                     )}
                   </button>
                 </div>
               )}

               {/* Controls & Device Selection */}
               <div className="flex flex-col justify-between gap-2.5 w-full min-w-0">
                 <div className="flex flex-col gap-0.5">
                   <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                     Camera & Audio Check
                   </span>
                   <p className={`text-[11px] leading-tight ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                     Test your camera feed, noise suppression and microphone input.
                   </p>
                 </div>

                 {/* Mic Volume Level Bar */}
                 {isMicOn && (
                   <div className="flex items-center gap-2">
                     <Mic size={12} className="text-emerald-400 shrink-0" />
                     <div className="flex-1 h-1.5 rounded-full bg-zinc-700/50 overflow-hidden">
                       <div
                         className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
                         style={{ width: `${micLevel}%` }}
                       />
                     </div>
                   </div>
                 )}

                 {/* Mic, Camera & Noise Suppression Toggles */}
                 <div className="flex flex-wrap items-center gap-2 pt-0.5">
                   <button
                     onClick={() => setIsMicOn(!isMicOn)}
                     className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                       isMicOn
                         ? 'bg-blue-600 hover:bg-blue-500 text-white'
                         : isLight
                         ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                         : 'bg-white/10 hover:bg-white/15 text-white'
                     }`}
                   >
                     {isMicOn ? <Mic size={13} /> : <MicOff size={13} />}
                     <span>{isMicOn ? 'Microphone On' : 'Turn Microphone On'}</span>
                   </button>

                   <button
                     onClick={() => {
                       setIsVideoOn(!isVideoOn);
                       if (!isVideoOn) {
                         setUseVirtualCam(false);
                         requestCameraAccess(selectedVideoDeviceId || undefined);
                       }
                     }}
                     className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                       isVideoOn
                         ? 'bg-blue-600 hover:bg-blue-500 text-white'
                         : isLight
                         ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                         : 'bg-white/10 hover:bg-white/15 text-white'
                     }`}
                   >
                     {isVideoOn ? <Video size={13} /> : <VideoOff size={13} />}
                     <span>{isVideoOn ? 'Camera On' : 'Turn Camera On'}</span>
                   </button>

                   <button
                     onClick={() => {
                       setIsVideoOn(true);
                       setUseVirtualCam(!useVirtualCam);
                     }}
                     className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                       useVirtualCam
                         ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                         : isLight
                         ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                         : 'bg-white/10 hover:bg-white/15 text-white'
                     }`}
                   >
                     <Sparkles size={13} />
                     <span>{useVirtualCam ? 'Virtual Cam Active' : 'Use Virtual Cam'}</span>
                   </button>

                   <button
                     onClick={() => setIsNoiseSuppressionOn(!isNoiseSuppressionOn)}
                     className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                       isNoiseSuppressionOn
                         ? 'bg-emerald-600 text-white'
                         : isLight
                         ? 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                         : 'bg-white/10 hover:bg-white/15 text-zinc-400'
                     }`}
                     title="Toggle Noise Suppression"
                   >
                     <Filter size={12} />
                     <span className="hidden sm:inline">Noise Filter: {isNoiseSuppressionOn ? 'ON' : 'OFF'}</span>
                   </button>
                 </div>
               </div>
             </div>

            {/* Quick Actions Card Grid */}
            <div className={`grid gap-3.5 ${containerWidth >= 480 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {/* Action 1: Instant Meeting */}
              <button
                onClick={() => handleStartInstantMeeting('Instant Meeting')}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition-all cursor-pointer group shadow-xs ${
                  isLight
                    ? 'bg-white hover:bg-blue-50/50 border-slate-200/90 hover:border-blue-300 text-slate-800'
                    : 'bg-[#24232a] hover:bg-blue-900/20 border-white/10 hover:border-blue-500/30 text-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <Video size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">New Meeting</h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                    Start an instant video call with active camera
                  </p>
                </div>
              </button>

              {/* Action 2: Schedule Meeting */}
              <button
                onClick={() => setShowScheduleModal(true)}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition-all cursor-pointer group shadow-xs ${
                  isLight
                    ? 'bg-white hover:bg-amber-50/50 border-slate-200/90 hover:border-amber-300 text-slate-800'
                    : 'bg-[#24232a] hover:bg-amber-900/20 border-white/10 hover:border-amber-500/30 text-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Schedule Meeting</h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                    Plan for later & sync with Calendar
                  </p>
                </div>
              </button>
            </div>

            {/* Join via Code Input Box */}
            <div
              className={`p-4 rounded-2xl border flex flex-col gap-2.5 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#24232a] border-white/10'
              }`}
            >
              <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-white/80'}`}>
                Join with a Code or Link
              </span>
              <div className="flex flex-col gap-2">
                <div className={`flex ${containerWidth >= 400 ? 'flex-row' : 'flex-col'} items-stretch gap-2`}>
                  <div className="relative flex-1">
                    <Link size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter meeting code or link (e.g. meet-882)"
                      value={meetingCode}
                      onChange={(e) => setMeetingCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                        isLight ? 'bg-slate-100/80 border-slate-300/80 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                      }`}
                    />
                  </div>
                  <button
                    onClick={handleJoinByCode}
                    disabled={!meetingCode.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white cursor-pointer transition-colors"
                  >
                    Join
                  </button>
                </div>

                {/* Optional Passcode input if meeting is protected */}
                {securitySettings.passcode && (
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-2.5 text-amber-400" />
                    <input
                      type="password"
                      placeholder="Enter meeting passcode"
                      value={inputPasscode}
                      onChange={(e) => setInputPasscode(e.target.value)}
                      className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                        isLight ? 'bg-slate-100 border-amber-300' : 'bg-black/30 border-amber-500/40 text-white'
                      }`}
                    />
                  </div>
                )}

                {joinError && (
                  <span className="text-[11px] font-semibold text-red-400 flex items-center gap-1">
                    <AlertTriangle size={12} /> {joinError}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Today's Scheduled Meetings */}
          <div className={`${containerWidth >= 780 ? 'w-72 md:w-80 shrink-0' : 'w-full'} flex flex-col gap-4`}>
            <div
              className={`flex-1 rounded-2xl border p-4 flex flex-col gap-3 ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-[#24232a] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Today's Meetings
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-500">
                  {todayMeetings.length + 2}
                </span>
              </div>

              {/* List of Meetings */}
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
                {isLoadingMeetings ? (
                  <div className="p-3 text-center text-xs text-zinc-400">Loading meetings...</div>
                ) : todayMeetings.length === 0 ? (
                  <div className="p-3 text-center text-xs text-zinc-400">No meetings scheduled for today.</div>
                ) : (
                  todayMeetings.map((evt) => (
                    <div
                      key={evt._id || evt.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                        isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-bold truncate">{evt.title}</span>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <Clock size={11} />
                          <span>{new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => resumeMeeting(evt.id || evt._id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors shrink-0"
                      >
                        Join
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          </div>
         </div>
       )}

       {/* =========================================================
           VIEW 1.5: PRE-MEETING SCREEN
          ========================================================= */}
       {activeTab === 'pre-meeting' && (
         /* Scroll on the outer box and centre on an inner box that is at least
            full height: centring the scroll container itself puts the top of
            tall content above the scroll origin, where it can never be reached. */
         <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
           <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6">
           <div className="w-full max-w-2xl flex flex-col gap-4 sm:gap-5">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                 <Video size={20} />
               </div>
               <div className="min-w-0">
                 <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">Ready to join?</h2>
                 <p className={`text-[11px] sm:text-xs ${isLight ? 'text-slate-500' : 'text-white/50'} truncate`}>
                   Check your camera and microphone before joining.
                 </p>
               </div>
              </div>

              {(permissionStatus === 'prompt' || permissionStatus === 'denied') && (
                <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                  permissionStatus === 'denied'
                    ? 'bg-red-500/10 border-red-500/30'
                    : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className={permissionStatus === 'denied' ? 'text-red-400' : 'text-amber-500'} />
                    <span className={`text-xs font-bold ${permissionStatus === 'denied' ? 'text-red-300' : 'text-amber-600 dark:text-amber-400'}`}>
                      {permissionStatus === 'denied' ? 'Camera & Microphone Access Blocked' : 'Camera & Microphone Access Required'}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${permissionStatus === 'denied' ? 'text-red-200/80' : 'text-amber-700/80 dark:text-amber-300/80'}`}>
                    {permissionStatus === 'denied'
                      ? 'OSX Meet needs access to your camera and microphone to join video meetings. Please enable camera and microphone access in your browser or system settings, then try again.'
                      : 'OSX Meet needs access to your camera and microphone to join video meetings. Click below to grant permission.'}
                  </p>
                  <button
                    onClick={() => requestCameraAccess(selectedVideoDeviceId || undefined)}
                    disabled={isRequestingCamera}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 ${
                      permissionStatus === 'denied'
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    } disabled:opacity-50`}
                  >
                    {isRequestingCamera ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        <Video size={13} />
                        {permissionStatus === 'denied' ? 'Try Again' : 'Allow Camera & Microphone'}
                      </>
                    )}
                  </button>
                </div>
              )}

               <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col gap-4 ${
                 isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-[#24232a] border-white/10'
               }`}>
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black relative border border-white/10 flex items-center justify-center shrink-0">
                  {isVideoOn ? (
                    <VirtualCameraCanvas stream={webcamStream} />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center gap-1 text-slate-400">
                      <VideoOff size={24} className="opacity-60" />
                      <span className="text-[11px] font-medium">Camera is Off</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                    {isMicOn ? <Mic size={10} className="text-emerald-400" /> : <MicOff size={10} className="text-red-400" />}
                    <span>{meetingTitle}</span>
                  </div>
                </div>

               <div className="flex flex-col gap-3">
                 <div className="flex flex-wrap items-center gap-2">
                   <button
                     onClick={() => setIsMicOn(!isMicOn)}
                     className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                       isMicOn
                         ? isLight
                           ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                           : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                         : 'bg-red-500 hover:bg-red-600 text-white'
                     }`}
                   >
                     {isMicOn ? <Mic size={13} /> : <MicOff size={13} />}
                     <span>{isMicOn ? 'Microphone On' : 'Microphone Off'}</span>
                   </button>

                   <button
                     onClick={() => {
                       setIsVideoOn(!isVideoOn);
                       if (!isVideoOn) setUseVirtualCam(false);
                     }}
                     className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                       isVideoOn
                         ? isLight
                           ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                           : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                         : 'bg-red-500 hover:bg-red-600 text-white'
                     }`}
                   >
                     {isVideoOn ? <Video size={13} /> : <VideoOff size={13} />}
                     <span>{isVideoOn ? 'Camera On' : 'Camera Off'}</span>
                   </button>

                   <button
                     onClick={() => {
                       setIsVideoOn(true);
                       setUseVirtualCam(!useVirtualCam);
                     }}
                     className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                       useVirtualCam
                         ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                         : isLight
                         ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                         : 'bg-white/10 hover:bg-white/15 text-white'
                     }`}
                   >
                     <Sparkles size={13} />
                     <span>{useVirtualCam ? 'Virtual Cam Active' : 'Virtual Cam'}</span>
                   </button>
                 </div>

                 <div className="flex flex-col gap-1.5">
                   <span className={`text-[11px] font-bold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Camera</span>
                   <select
                     value={selectedVideoDeviceId}
                     onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                     className={`text-xs px-3 py-2 rounded-xl border focus:outline-none ${
                       isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                     }`}
                   >
                     {videoDevices.map((d) => (
                       <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
                     ))}
                   </select>
                 </div>

                 <div className="flex flex-col gap-1.5">
                   <span className={`text-[11px] font-bold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Microphone</span>
                   <select
                     value={selectedAudioDeviceId}
                     onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
                     className={`text-xs px-3 py-2 rounded-xl border focus:outline-none ${
                       isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                     }`}
                   >
                     {audioDevices.map((d) => (
                       <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
                     ))}
                   </select>
                 </div>

                 <div className="flex items-center gap-2">
                   <Mic size={12} className={isMicOn ? 'text-emerald-400' : 'text-red-400'} />
                   <div className="flex-1 h-1.5 rounded-full bg-zinc-700/50 overflow-hidden">
                     <div
                       className={`h-full transition-all duration-150 ${isMicOn ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-red-500'}`}
                       style={{ width: `${isMicOn ? micLevel : 0}%` }}
                     />
                   </div>
                 </div>
               </div>

               {cameraError && (
                 <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                   <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                   <span>{cameraError}</span>
                 </div>
               )}
             </div>

             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
               <button
                 onClick={async () => {
                   try {
                     await MeetingService.startMeeting(currentMeetingId);
                   } catch (error) {
                     // Only the host can start a meeting — a joining
                     // participant hits exactly this every time, since the
                     // normal case is that the host already has it running.
                     // Any other failure (offline, meeting ended, wrong id)
                     // should still block entry and surface to the user.
                     if (!(error instanceof ApiError) || error.code !== 'permission_error') {
                       setJoinError(error instanceof Error ? error.message : 'Could not join this meeting.');
                       setActiveTab('lobby');
                       return;
                     }
                   }
                   setActiveTab('in-call');
                 }}
                 className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
               >
                 <Video size={16} />
                 Join Meeting
               </button>
               <button
                 onClick={handleCopyLink}
                 className={`px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 ${
                   isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                 }`}
               >
                 {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                 {isCopied ? 'Copied' : 'Copy Link'}
               </button>
               <button
                 onClick={() => {
                   stopLocalMedia();
                   setActiveTab('lobby');
                 }}
                 className={`px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
                   isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                 }`}
               >
                 Back
               </button>
             </div>
           </div>
           </div>
         </div>
       )}

       {/* =========================================================
           VIEW 2: IN-CALL MEETING ROOM VIEW
          ========================================================= */}
       {activeTab === 'in-call' && (
        <div className={`flex-1 flex flex-col min-h-0 relative overflow-hidden ${palette.stageBg} ${palette.text}`}>
          {/* Host is asking this participant to unmute — a dismissible
              *request*, never an automatic unmute (see `unmute-request` in
              `handleRemoteEvent`). Floats above the stage so it's visible
              regardless of which drawer or layout is active. */}
          {showUnmuteRequest && (
            <div className="absolute top-14 inset-x-0 z-50 flex justify-center px-3 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-blue-600 text-white shadow-2xl border border-blue-400/40 max-w-full">
                <Mic size={15} className="shrink-0" />
                <span className="text-xs font-semibold">Host is asking you to unmute</span>
                <button
                  onClick={() => {
                    setMicEnabled(true);
                    setShowUnmuteRequest(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white text-blue-700 text-[11px] font-bold cursor-pointer hover:bg-blue-50 shrink-0"
                >
                  Unmute
                </button>
                <button
                  onClick={() => setShowUnmuteRequest(false)}
                  className="p-1 rounded-lg hover:bg-white/20 cursor-pointer shrink-0"
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Top Bar: Title & Code & Link Copy & Security/Rec Status */}
          <div
            className={`h-14 px-3 sm:px-5 flex items-center justify-between border-b shrink-0 z-10 gap-2 shadow-sm ${palette.topBarBg} ${palette.topBarBorder}`}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className={`font-bold text-xs sm:text-sm tracking-tight truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs ${palette.text}`}>
                {meetingTitle}
              </span>
              <div
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs border shrink-0 ${palette.controlButtonIdle} ${palette.textMuted} ${palette.border}`}
              >
                <span className={isVeryCompact ? 'hidden' : 'inline'}>Code: {meetingShareCode || currentMeetingId}</span>
                <span className={isVeryCompact ? 'inline' : 'hidden'}>{meetingShareCode || currentMeetingId}</span>
                <button
                  onClick={handleCopyLink}
                  className={`cursor-pointer p-0.5 transition-colors ${palette.text}`}
                  title="Copy Link"
                >
                  {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Recording & Status Indicators */}
            <div className="flex items-center gap-2 shrink-0">
              {!isVeryCompact && (
                <span className={`text-[11px] font-mono tabular-nums ${palette.textMuted}`} title="Meeting duration">
                  {formatRecordingTime(meetingSeconds)}
                </span>
              )}

              {/* Change layout */}
              <div className="relative">
                <button
                  onClick={() => setShowLayoutMenu((prev) => !prev)}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                    showLayoutMenu ? `${palette.controlButtonIdle}` : `${palette.textMuted} ${palette.hover}`
                  }`}
                  title="Change layout"
                >
                  <LayoutGrid size={15} />
                </button>
                {showLayoutMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLayoutMenu(false)} />
                    <div
                      className={`absolute right-0 top-full mt-1.5 w-44 p-1.5 rounded-xl border shadow-2xl z-50 flex flex-col gap-0.5 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                        Change layout
                      </span>
                      {([
                        { id: 'auto', label: 'Auto', hint: 'Follows the room' },
                        { id: 'tiled', label: 'Tiled', hint: 'Everyone equal' },
                        { id: 'spotlight', label: 'Spotlight', hint: 'One large feed' },
                        { id: 'sidebar', label: 'Sidebar', hint: 'Main plus strip' },
                      ] as const).map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setLayoutMode(option.id);
                            setShowLayoutMenu(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                            layoutMode === option.id
                              ? 'bg-blue-600 text-white'
                              : isLight
                                ? 'hover:bg-slate-100 text-slate-700'
                                : 'hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          <span className="block text-xs font-bold">{option.label}</span>
                          <span className="block text-[10px] opacity-70">{option.hint}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {isRecording && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[11px] font-bold border border-red-500/40">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>REC {formatRecordingTime(recordingSeconds)}</span>
                </div>
              )}

              {securitySettings.isLocked && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                  <Lock size={10} />
                  <span className="hidden sm:inline">Locked</span>
                </div>
              )}

              {/* Waiting Room Alert badge for Host */}
              {waitingQueue.length > 0 && (
                <button
                  onClick={() => setActiveSideDrawer('waiting')}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/40 animate-pulse cursor-pointer"
                >
                  <UserCheck size={12} />
                  <span>{waitingQueue.length} Waiting</span>
                </button>
              )}

              <button
                onClick={() => setShowInviteModal(true)}
                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <UserPlus size={13} />
                <span className="hidden sm:inline">Invite</span>
              </button>
            </div>
          </div>

          {/* Center Stage + Side Drawer Container */}
          <div className="flex-1 flex min-h-0 relative overflow-hidden">
            {/* Main Stage: presentation, spotlight, sidebar or tiles */}
            <div className="flex-1 p-2 sm:p-3 flex flex-col min-h-0 relative overflow-hidden gap-2">
              {isScreenSharing ? (
                <div className="flex-1 flex flex-col min-h-0 gap-2">
                  <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-emerald-500/50 relative shadow-2xl bg-black">
                    {screenStream ? (
                      <video
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                        ref={(el) => {
                          if (el && el.srcObject !== screenStream) {
                            el.srcObject = screenStream;
                          }
                        }}
                      />
                    ) : (
                      <ScreenShareCanvas />
                    )}

                    {/* Presentation controls, as in Meet's presenting bar */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                        <Monitor size={12} />
                        <span>You are presenting</span>
                      </div>
                      <button
                        onClick={() => toggleScreenShare()}
                        className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-red-600 text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/15 cursor-pointer transition-colors backdrop-blur-md"
                      >
                        <X size={11} />
                        <span>Stop presenting</span>
                      </button>
                    </div>
                  </div>

                  {/* Presenter's own camera stays visible beside the content */}
                  {containerHeight >= 420 && (
                    <div className="shrink-0 h-24 sm:h-28 flex items-center gap-2 overflow-x-auto pb-0.5">
                      {participants.map((p) => (
                        <ParticipantTile
                          key={p.id}
                          participant={p}
                          isMe={p.id === 'me'}
                          isVideoOn={isVideoOn}
                          isMicOn={isMicOn}
                          webcamStream={webcamStream}
                          remoteStream={remoteStreams[p.id]}
                          peerConnectionState={connectionState[p.id]}
                          pinnedParticipantId={pinnedParticipantId}
                          onTogglePin={setPinnedParticipantId}
                          reactions={activeReactions}
                          compact
                          className="h-full aspect-video shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : effectiveLayout === 'spotlight' ? (
                <div ref={pipBoundsRef} className="flex-1 flex flex-col min-h-0 gap-2 relative">
                  <div className="flex-1 min-h-0">
                    {spotlightParticipant && (
                      <ParticipantTile
                        participant={spotlightParticipant}
                        isMe={spotlightParticipant.id === 'me'}
                        isVideoOn={isVideoOn}
                        isMicOn={isMicOn}
                        webcamStream={webcamStream}
                        remoteStream={remoteStreams[spotlightParticipant.id]}
                        peerConnectionState={connectionState[spotlightParticipant.id]}
                        pinnedParticipantId={pinnedParticipantId}
                        onTogglePin={setPinnedParticipantId}
                        reactions={activeReactions}
                        className="w-full h-full"
                      />
                    )}
                  </div>

                  {/* Self picture-in-picture — Meet's signature: your own
                      tile floats over the corner rather than taking a full
                      grid slot once someone else is the spotlight. Draggable
                      and resizable within this stage's bounds. */}
                  {selfParticipantData && spotlightParticipant?.id !== 'me' && (
                    <SelfPictureInPicture
                      participant={selfParticipantData}
                      isVideoOn={isVideoOn}
                      isMicOn={isMicOn}
                      webcamStream={webcamStream}
                      pinnedParticipantId={pinnedParticipantId}
                      onTogglePin={setPinnedParticipantId}
                      reactions={activeReactions}
                      boundsRef={pipBoundsRef}
                      position={pipPosition}
                      size={pipSize}
                      onPositionChange={setPipPosition}
                      onSizeChange={setPipSize}
                    />
                  )}

                  {otherParticipants.length > 0 && containerHeight >= 420 && (
                    <div className="shrink-0 h-20 sm:h-24 flex items-center gap-2 overflow-x-auto pb-0.5">
                      {otherParticipants.map((p) => (
                        <ParticipantTile
                          key={p.id}
                          participant={p}
                          isMe={p.id === 'me'}
                          isVideoOn={isVideoOn}
                          isMicOn={isMicOn}
                          webcamStream={webcamStream}
                          remoteStream={remoteStreams[p.id]}
                          peerConnectionState={connectionState[p.id]}
                          pinnedParticipantId={pinnedParticipantId}
                          onTogglePin={setPinnedParticipantId}
                          reactions={activeReactions}
                          compact
                          className="h-full aspect-video shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : effectiveLayout === 'sidebar' && !isCompact ? (
                <div className="flex-1 flex min-h-0 gap-2 relative">
                  <div ref={pipBoundsRef} className="flex-1 min-h-0 relative">
                    {spotlightParticipant && (
                      <ParticipantTile
                        participant={spotlightParticipant}
                        isMe={spotlightParticipant.id === 'me'}
                        isVideoOn={isVideoOn}
                        isMicOn={isMicOn}
                        webcamStream={webcamStream}
                        remoteStream={remoteStreams[spotlightParticipant.id]}
                        peerConnectionState={connectionState[spotlightParticipant.id]}
                        pinnedParticipantId={pinnedParticipantId}
                        onTogglePin={setPinnedParticipantId}
                        reactions={activeReactions}
                        className="w-full h-full"
                      />
                    )}
                    {selfParticipantData && spotlightParticipant?.id !== 'me' && (
                      <SelfPictureInPicture
                        participant={selfParticipantData}
                        isVideoOn={isVideoOn}
                        isMicOn={isMicOn}
                        webcamStream={webcamStream}
                        pinnedParticipantId={pinnedParticipantId}
                        onTogglePin={setPinnedParticipantId}
                        reactions={activeReactions}
                        boundsRef={pipBoundsRef}
                        position={pipPosition}
                        size={pipSize}
                        onPositionChange={setPipPosition}
                        onSizeChange={setPipSize}
                      />
                    )}
                  </div>
                  <div className="w-40 shrink-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
                    {otherParticipants.map((p) => (
                      <ParticipantTile
                        key={p.id}
                        participant={p}
                        isMe={p.id === 'me'}
                        isVideoOn={isVideoOn}
                        isMicOn={isMicOn}
                        webcamStream={webcamStream}
                        remoteStream={remoteStreams[p.id]}
                        peerConnectionState={connectionState[p.id]}
                        pinnedParticipantId={pinnedParticipantId}
                        onTogglePin={setPinnedParticipantId}
                        reactions={activeReactions}
                        compact
                        className="w-full aspect-video shrink-0"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* Tiled: the stage scrolls, and every tile keeps a 16:9 frame
                   so faces are never squeezed into a wide or narrow box. */
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                  <div
                    className="grid gap-2 sm:gap-3 auto-rows-min"
                    style={{ gridTemplateColumns: `repeat(${tileColumns}, minmax(0, 1fr))` }}
                  >
                    {stageParticipants.map((p) => (
                      <ParticipantTile
                        key={p.id}
                        participant={p}
                        isMe={p.id === 'me'}
                        isVideoOn={isVideoOn}
                        isMicOn={isMicOn}
                        webcamStream={webcamStream}
                        remoteStream={remoteStreams[p.id]}
                        peerConnectionState={connectionState[p.id]}
                        pinnedParticipantId={pinnedParticipantId}
                        onTogglePin={setPinnedParticipantId}
                        reactions={activeReactions}
                        compact={tileColumns > 2}
                        className="w-full aspect-video"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Live captions overlay. Lines (local or remote) always take
                  priority over the local error/placeholder text: a browser
                  that can't transcribe the local mic can still display
                  captions other participants broadcast, so a stale local
                  `captionError` must never hide those. */}
              {captionsOn && (
                <div className="absolute inset-x-3 bottom-3 z-30 pointer-events-none flex flex-col items-center gap-1">
                  {captionLines.length > 0 ? (
                    captionLines.map((line) => (
                      <div
                        key={line.id}
                        className="px-3 py-1.5 rounded-xl bg-black/85 text-white text-xs sm:text-sm font-medium max-w-2xl text-center leading-snug"
                      >
                        <span className="text-blue-300 font-bold mr-1.5">{line.speaker}:</span>
                        {line.text}
                      </div>
                    ))
                  ) : captionError ? (
                    <div className="px-3 py-1.5 rounded-xl bg-black/85 text-amber-300 text-[11px] font-semibold max-w-xl text-center border border-amber-500/30">
                      {captionError}
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-black/70 text-zinc-300 text-[11px] font-medium">
                      Listening for speech…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reactions now float over the sending participant's own tile
                (see `ParticipantTile`'s `reactions` prop) rather than a
                generic overlay here, so who sent it is visually obvious. */}

            {/* Side Drawers: Chat / People / Polls / Waiting / Info */}
            {activeSideDrawer && (
              <div
                className={`border-l flex flex-col shrink-0 min-h-0 transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
                } ${
                  isCompact
                    ? `absolute inset-y-0 right-0 ${
                        isVeryCompact ? 'w-full' : 'w-80'
                      } ${isLight ? 'bg-white/95' : 'bg-zinc-900/95'} backdrop-blur-md z-40 shadow-2xl animate-in slide-in-from-right duration-200`
                    : 'w-80 relative z-20'
                }`}
              >
                {/* Drawer Header */}
                <div
                  className={`h-14 px-4 flex items-center justify-between border-b shrink-0 ${
                    isLight ? 'border-slate-200' : 'border-zinc-800'
                  }`}
                >
                  <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                    {activeSideDrawer === 'chat'
                      ? 'In-Call Chat'
                      : activeSideDrawer === 'people'
                      ? `Participants (${participants.length})`
                      : activeSideDrawer === 'waiting'
                      ? `Waiting Room (${waitingQueue.length})`
                      : activeSideDrawer === 'activities'
                      ? 'Activities'
                      : 'Meeting Details'}
                  </span>
                  <button
                    onClick={() => setActiveSideDrawer(null)}
                    className={`p-1 rounded-lg cursor-pointer ${
                      isLight ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Drawer Content: Chat with Attachments */}
                {activeSideDrawer === 'chat' && (
                  <div className="flex-1 flex flex-col min-h-0 p-3">
                    {!meetingConversationId ? (
                      // No conversation to talk in yet — this is real: the
                      // backend only links one once a second person has ever
                      // joined the call. Say so plainly rather than showing a
                      // silently-empty or mysteriously-disabled panel.
                      <div className={`flex-1 flex flex-col items-center justify-center text-center gap-2 p-6 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                        <MessageSquare size={28} className="opacity-40" />
                        <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Chat isn't open yet</span>
                        <p className="text-[11px] leading-relaxed max-w-[220px]">
                          Chat and file sharing open up once someone else joins this call.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                          {isLoadingConversationMessages && conversationMessages.length === 0 ? (
                            <div className={`text-center text-xs py-4 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Loading chat…</div>
                          ) : conversationMessages.length === 0 ? (
                            <div className={`text-center text-xs py-4 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>No messages yet — say hello!</div>
                          ) : (
                            conversationMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex flex-col text-xs ${msg.isMine ? 'items-end' : 'items-start'}`}
                              >
                                <span className={`text-[10px] mb-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                                  {msg.isMine ? 'You' : msg.senderName} •{' '}
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div
                                  className={`p-2.5 rounded-2xl max-w-[85%] flex flex-col gap-1.5 ${
                                    msg.isMine
                                      ? 'bg-blue-600 text-white rounded-br-none'
                                      : isLight
                                        ? 'bg-slate-100 text-slate-800 rounded-bl-none'
                                        : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
                                  }`}
                                >
                                  {msg.isDeleted ? (
                                    <span className="italic opacity-70">This message was deleted</span>
                                  ) : (
                                    <>
                                      {msg.body && <span className="whitespace-pre-wrap break-words">{msg.body}</span>}
                                      {msg.attachments.map((att) => (
                                        <div
                                          key={att.id}
                                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[11px] ${
                                            msg.isMine ? 'bg-black/20 border-white/10' : isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/10'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <FileText size={14} className={msg.isMine ? 'text-blue-100 shrink-0' : isLight ? 'text-blue-600 shrink-0' : 'text-blue-300 shrink-0'} />
                                            <span className="truncate font-semibold">{att.name}</span>
                                          </div>
                                          <a
                                            href={att.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`p-1 cursor-pointer shrink-0 ${
                                              msg.isMine ? 'text-white hover:text-blue-100' : isLight ? 'text-slate-700 hover:text-blue-600' : 'text-white hover:text-blue-200'
                                            }`}
                                            title={`Download ${att.name}`}
                                          >
                                            <Download size={13} />
                                          </a>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {chatError && (
                          <div className={`mt-1.5 text-[11px] font-semibold flex items-center gap-1 shrink-0 ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                            <AlertTriangle size={11} className="shrink-0" /> {chatError}
                          </div>
                        )}

                        {/* Chat Input & File Attachment */}
                        <div className={`mt-2 flex items-center gap-1.5 pt-2 border-t shrink-0 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                          <button
                            onClick={() => meetingFileInputRef.current?.click()}
                            disabled={isUploadingMeetingFile}
                            className={`p-2 rounded-xl cursor-pointer disabled:opacity-50 ${
                              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            }`}
                            title="Share a file"
                          >
                            {isUploadingMeetingFile ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Paperclip size={14} />
                            )}
                          </button>
                          <input
                            ref={meetingFileInputRef}
                            type="file"
                            className="hidden"
                            onChange={(event) => {
                              void handleSendMeetingFile(event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />

                          <input
                            type="text"
                            placeholder="Send message to everyone..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMeetingChatMessage()}
                            className={`flex-1 px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-800 border-zinc-700/80 text-white'
                            }`}
                          />
                          <button
                            onClick={() => void handleSendMeetingChatMessage()}
                            disabled={isSendingChatMessage || !chatInput.trim()}
                            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors disabled:opacity-50"
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Drawer Content: People / Participant List with Host Actions */}
                {activeSideDrawer === 'people' && (
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {/* Host-only: everyone else never even sees these
                        controls, and `handleMuteAll`/`handleAskUnmuteAll`
                        no-op for a non-host regardless (defense in depth). */}
                    {isHost && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleMuteAll}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                            isLight
                              ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                              : 'bg-zinc-800 hover:bg-red-900/30 text-red-400 border-zinc-700/60'
                          }`}
                        >
                          <VolumeX size={13} />
                          <span>Mute All</span>
                        </button>
                        <button
                          onClick={handleAskUnmuteAll}
                          title="Sends a request — participants must unmute themselves"
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                            isLight
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                              : 'bg-zinc-800 hover:bg-blue-900/30 text-blue-300 border-zinc-700/60'
                          }`}
                        >
                          <Mic size={13} />
                          <span>Ask All to Unmute</span>
                        </button>
                      </div>
                    )}

                    {[...participants]
                      .sort((a, b) => Number(b.isHandRaised) - Number(a.isHandRaised))
                      .map((p) => (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                          p.isHandRaised
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : isLight
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-zinc-800/60 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-tr ${p.bgGradient} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
                            >
                              {initials(p.name)}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-bold truncate flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                              <span className="truncate">{p.name}</span>
                              {p.isHandRaised && <Hand size={11} className="text-amber-500 shrink-0" />}
                            </span>
                            <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                              {p.role}
                              {p.isHandRaised ? ' · hand raised' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {p.id === 'me' && p.isHandRaised && (
                            <button
                              onClick={handleToggleHand}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 cursor-pointer ${
                                isLight ? 'text-amber-700' : 'text-amber-300'
                              }`}
                            >
                              Lower
                            </button>
                          )}
                          {p.id !== 'me' && (
                            <>
                              {isHost &&
                                (p.isMuted ? (
                                  <button
                                    onClick={() => handleAskUnmuteParticipant(p.id)}
                                    className={`p-1 rounded cursor-pointer ${isLight ? 'text-slate-400 hover:text-blue-600' : 'text-zinc-400 hover:text-blue-300'}`}
                                    title="Ask to unmute — sends a request, doesn't unmute them for you"
                                  >
                                    <MicOff size={13} className="text-red-400" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleMuteParticipant(p.id)}
                                    className={`p-1 rounded cursor-pointer ${isLight ? 'text-slate-400 hover:text-red-500' : 'text-zinc-400 hover:text-red-400'}`}
                                    title="Mute Participant"
                                  >
                                    <Mic size={13} />
                                  </button>
                                ))}
                              <button
                                onClick={() => handleRemoveParticipant(p.id)}
                                className={`p-1 rounded cursor-pointer ${isLight ? 'text-slate-400 hover:text-red-500' : 'text-zinc-400 hover:text-red-400'}`}
                                title="Remove Participant"
                              >
                                <UserX size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drawer Content: Waiting Room Approval Queue */}
                {activeSideDrawer === 'waiting' && (
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {waitingQueue.length === 0 ? (
                      <div className={`flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 my-auto ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                        <UserCheck size={32} className="opacity-40" />
                        <span className="text-xs font-medium">Waiting Room is clear</span>
                      </div>
                    ) : (
                      waitingQueue.map((w) => (
                        <div
                          key={w.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {w.avatar ? (
                              <img src={w.avatar} alt={w.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full bg-gradient-to-tr ${gradientForId(w.id)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
                              >
                                {initials(w.name)}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{w.name}</span>
                              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Waiting since {w.joinedAt}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleApproveWaiting(w)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            >
                              Admit
                            </button>
                            <button
                              onClick={() => handleDenyWaiting(w.id)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                              }`}
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Drawer Content: Activities */}
                {activeSideDrawer === 'activities' && (
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    <p className={`text-[11px] leading-relaxed px-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      Run something together without leaving the call.
                    </p>
                    {[
                      {
                        id: 'whiteboard',
                        icon: <Sparkles size={16} className="text-purple-500" />,
                        title: 'Whiteboard',
                        description: 'Sketch together on a shared canvas',
                        onClick: () => setShowWhiteboard(true),
                      },
                      {
                        id: 'polls',
                        icon: <BarChart2 size={16} className="text-amber-500" />,
                        title: 'Polls',
                        description: `Ask the room a question${polls.length ? ` · ${polls.length} active` : ''}`,
                        onClick: () => setActiveSideDrawer('polls'),
                      },
                      {
                        id: 'breakout',
                        icon: <Split size={16} className="text-indigo-500" />,
                        title: 'Breakout rooms',
                        description: 'Split participants into smaller groups',
                        onClick: () => setShowBreakoutRooms(true),
                      },
                      {
                        id: 'recording',
                        icon: <Disc size={16} className={isRecording ? 'text-red-500' : isLight ? 'text-slate-500' : 'text-zinc-300'} />,
                        title: isRecording ? 'Stop recording' : 'Recording',
                        description: isRecording
                          ? `Recording for ${formatRecordingTime(recordingSeconds)}`
                          : 'Save the meeting to your Drive',
                        onClick: handleToggleRecording,
                      },
                      {
                        id: 'captions',
                        icon: <Captions size={16} className={captionsOn ? 'text-blue-500' : isLight ? 'text-slate-500' : 'text-zinc-300'} />,
                        title: captionsOn ? 'Turn off captions' : 'Live captions',
                        // This browser may not be able to transcribe the
                        // local mic, but it can still display captions
                        // other participants broadcast — so the toggle
                        // always stays enabled.
                        description: captionsSupported
                          ? 'Transcribe speech on screen as people talk'
                          : "Can't transcribe here, but you'll still see others' captions",
                        onClick: () => setCaptionsOn((prev) => !prev),
                      },
                    ].map((activity) => (
                      <button
                        key={activity.id}
                        onClick={activity.onClick}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 text-left cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">{activity.icon}</span>
                        <span className="flex flex-col min-w-0">
                          <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>{activity.title}</span>
                          <span className={`text-[11px] leading-snug ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{activity.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Drawer Content: Info */}
                {activeSideDrawer === 'info' && (
                  <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                    <div className="flex flex-col gap-1">
                      <span className={`font-bold uppercase text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Joining Info</span>
                      <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{meetingTitle}</span>
                      <span className={`break-all ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>{`${window.location.origin}/meeting/${currentMeetingId}`}</span>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Copy size={13} />
                      <span>{isCopied ? 'Link Copied!' : 'Copy Joining Link'}</span>
                    </button>

                    <div className={`flex flex-col gap-2 pt-1 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                      <span className={`font-bold uppercase text-[10px] pt-2 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>This call</span>
                      <div className="flex items-center justify-between">
                        <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>Duration</span>
                        <span className={`font-mono ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{formatRecordingTime(meetingSeconds)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>Participants</span>
                        <span className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{participants.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>Recording</span>
                        <span className={isRecording ? (isLight ? 'text-red-600 font-semibold' : 'text-red-400 font-semibold') : (isLight ? 'text-slate-800' : 'text-zinc-200')}>
                          {isRecording ? `On · ${formatRecordingTime(recordingSeconds)}` : 'Off'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>Captions</span>
                        <span className={isLight ? 'text-slate-800' : 'text-zinc-200'}>
                          {captionsOn ? (captionsSupported ? 'On' : 'On (view only)') : 'Off'}
                        </span>
                      </div>
                    </div>

                    <div className={`flex flex-col gap-1.5 pt-1 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                      <span className={`font-bold uppercase text-[10px] pt-2 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Shortcuts</span>
                      {[
                        { keys: 'Ctrl + D', label: 'Mute / unmute' },
                        { keys: 'Ctrl + E', label: 'Camera on / off' },
                        { keys: 'Ctrl + Alt + H', label: 'Raise / lower hand' },
                        { keys: 'Ctrl + Alt + C', label: 'Toggle chat' },
                      ].map((shortcut) => (
                        <div key={shortcut.keys} className="flex items-center justify-between gap-2">
                          <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>{shortcut.label}</span>
                          <kbd
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-mono shrink-0 ${
                              isLight ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-black/40 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {shortcut.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Polls Drawer */}
            <PollsDrawer
              isOpen={activeSideDrawer === 'polls'}
              onClose={() => setActiveSideDrawer(null)}
              // `userVotedOptionId` is derived per viewer from `votesByVoter`
              // right before rendering — it's never itself broadcast, so
              // each participant highlights their own vote, not the
              // creator's or whoever voted most recently.
              polls={polls.map((p) => ({ ...p, userVotedOptionId: p.votesByVoter[selfUserId ?? 'me'] }))}
              onCreatePoll={handleCreatePoll}
              onVotePoll={handleVotePoll}
              onDeletePoll={handleDeletePoll}
              isHost={isHost}
              isLight={isLight}
            />
          </div>

          {/* Bottom Call Control Toolbar: a centered, floating pill — Meet's
              signature control bar — rather than a full-width docked strip.
              Primary controls are always on screen; everything else collapses
              into an overflow menu as the window narrows, so nothing is ever
              pushed out of reach. */}
          <div className="min-h-16 px-2 py-2 flex items-center justify-center shrink-0 z-20 relative">
            <div
              className={`flex flex-wrap items-center gap-1.5 gap-y-2 rounded-full border shadow-2xl px-2 sm:px-3 py-1.5 sm:py-2 ${palette.controlBarBg} ${palette.controlBarBorder} ${
                isCompact ? 'justify-center' : ''
              }`}
            >
            {/* Left: mic, camera, virtual cam */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => setMicEnabled(!isMicOn)}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  isMicOn
                    ? `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                    : palette.controlButtonActive
                }`}
                title={isMicOn ? 'Mute Microphone (Ctrl+D)' : 'Unmute Microphone (Ctrl+D)'}
              >
                {isMicOn ? <Mic size={isVeryCompact ? 16 : 18} /> : <MicOff size={isVeryCompact ? 16 : 18} />}
              </button>

              <button
                onClick={() => {
                  const next = !isVideoOn;
                  setIsVideoOn(next);
                  if (!isVideoOn) setUseVirtualCam(false);
                  const videoTracks = webcamStream?.getVideoTracks() ?? [];
                  if (videoTracks.length > 0) {
                    videoTracks.forEach((track) => {
                      track.enabled = next;
                    });
                  } else if (next) {
                    // Joined with the camera off entirely — acquire it now.
                    requestCameraAccess(selectedVideoDeviceId || undefined);
                  }
                }}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  isVideoOn
                    ? `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                    : palette.controlButtonActive
                }`}
                title={isVideoOn ? 'Turn Camera Off (Ctrl+E)' : 'Turn Camera On (Ctrl+E)'}
              >
                {isVideoOn ? <Video size={isVeryCompact ? 16 : 18} /> : <VideoOff size={isVeryCompact ? 16 : 18} />}
              </button>

              {!isCompact && (
                <button
                  onClick={() => {
                    setIsVideoOn(true);
                    setUseVirtualCam(!useVirtualCam);
                  }}
                  className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    useVirtualCam ? 'bg-indigo-600 text-white' : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                  }`}
                  title={useVirtualCam ? 'Switch to Physical Camera' : 'Switch to Virtual Studio Cam'}
                >
                  <Sparkles size={isVeryCompact ? 16 : 18} />
                </button>
              )}
            </div>

            <div className={`hidden sm:block w-px h-6 mx-0.5 shrink-0 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />

            {/* Center: presentation, captions, hand, reactions, leave */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShowReactionsMenu(!showReactionsMenu)}
                  className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-colors hover:scale-105 active:scale-95 ${
                    showReactionsMenu ? palette.controlButtonActive : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                  }`}
                  title="Send a reaction"
                >
                  <Smile size={isVeryCompact ? 16 : 18} />
                </button>

                {showReactionsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowReactionsMenu(false)} />
                    <div
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 sm:w-64 p-2 rounded-2xl border shadow-xl z-50 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      <div className={`px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                        Reactions
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {['👏', '👍', '❤️', '🎉', '😂', '😮', '👋', '🔥', '💡', '🙌', '👀', '💯', '✅', '❌', '🤔', '😢'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleSendReaction(emoji)}
                            title={emoji}
                            className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-xl rounded-xl cursor-pointer transition-transform hover:scale-110 ${
                              isLight ? 'hover:bg-slate-100' : 'hover:bg-zinc-700'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    if (isScreenSharing) toggleScreenShare();
                    else setShowScreenShareMenu((prev) => !prev);
                  }}
                  className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isScreenSharing
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                  }`}
                  title={isScreenSharing ? 'Stop presenting' : 'Present now'}
                >
                  <Monitor size={isVeryCompact ? 16 : 18} />
                </button>

                {showScreenShareMenu && !isScreenSharing && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowScreenShareMenu(false)} />
                    <div
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-1.5 rounded-xl border shadow-2xl z-50 flex flex-col gap-0.5 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                        Present now
                      </span>
                      {([
                        { id: 'entire', label: 'Your entire screen' },
                        { id: 'window', label: 'A window' },
                        { id: 'tab', label: 'A tab' },
                      ] as const).map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setShowScreenShareMenu(false);
                            toggleScreenShare(option.id);
                          }}
                          className={`px-2.5 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer transition-colors ${
                            isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-zinc-200 hover:bg-zinc-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setCaptionsOn((prev) => !prev)}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  captionsOn ? 'bg-blue-600 text-white' : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                }`}
                title={
                  captionsSupported
                    ? captionsOn
                      ? 'Turn off captions'
                      : 'Turn on captions'
                    : captionsOn
                      ? "Showing others' captions (this browser can't transcribe your own speech)"
                      : "View others' captions (this browser can't transcribe your own speech)"
                }
              >
                <Captions size={isVeryCompact ? 16 : 18} />
              </button>

              <button
                onClick={handleToggleHand}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  isHandRaised ? 'bg-amber-500 text-white' : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                }`}
                title={isHandRaised ? 'Lower hand (Ctrl+Alt+H)' : 'Raise hand (Ctrl+Alt+H)'}
              >
                <Hand size={isVeryCompact ? 16 : 18} />
              </button>

              {/* Overflow menu: recording, whiteboard, breakout, security */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu((prev) => !prev)}
                  className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-colors hover:scale-105 active:scale-95 ${
                    showMoreMenu ? palette.controlButtonActive : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                  }`}
                  title="More options"
                >
                  <MoreVertical size={isVeryCompact ? 16 : 18} />
                </button>

                {showMoreMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                    <div
                      className={`absolute bottom-full right-0 mb-2 w-56 p-1.5 rounded-xl border shadow-2xl z-50 flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      {[
                        {
                          id: 'record',
                          icon: <Disc size={14} className={isRecording ? 'text-red-500' : ''} />,
                          label: isRecording ? `Stop recording (${formatRecordingTime(recordingSeconds)})` : 'Record meeting',
                          onClick: handleToggleRecording,
                        },
                        {
                          id: 'whiteboard',
                          icon: <Sparkles size={14} className="text-purple-500" />,
                          label: 'Open whiteboard',
                          onClick: () => setShowWhiteboard(true),
                        },
                        {
                          id: 'polls',
                          icon: <BarChart2 size={14} className="text-amber-500" />,
                          label: 'Polls',
                          onClick: () => setActiveSideDrawer(activeSideDrawer === 'polls' ? null : 'polls'),
                        },
                        {
                          id: 'breakout',
                          icon: <Split size={14} className="text-indigo-500" />,
                          label: 'Breakout rooms',
                          onClick: () => setShowBreakoutRooms(true),
                        },
                        {
                          id: 'activities',
                          icon: <LayoutGrid size={14} className="text-blue-500" />,
                          label: 'Activities',
                          onClick: () => setActiveSideDrawer(activeSideDrawer === 'activities' ? null : 'activities'),
                        },
                        {
                          id: 'virtual-cam',
                          icon: <Sparkles size={14} className="text-indigo-500" />,
                          label: useVirtualCam ? 'Use physical camera' : 'Use virtual studio cam',
                          onClick: () => {
                            setIsVideoOn(true);
                            setUseVirtualCam(!useVirtualCam);
                          },
                          hidden: !isCompact,
                        },
                        {
                          id: 'security',
                          icon: <ShieldCheck size={14} className="text-emerald-500" />,
                          label: 'Security & host controls',
                          onClick: () => setShowSecurityModal(true),
                        },
                        {
                          id: 'info',
                          icon: <Info size={14} className={isLight ? 'text-slate-500' : 'text-zinc-300'} />,
                          label: 'Meeting details',
                          onClick: () => setActiveSideDrawer(activeSideDrawer === 'info' ? null : 'info'),
                        },
                      ]
                        .filter((item) => item.hidden !== true)
                        .map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              item.onClick();
                              setShowMoreMenu(false);
                            }}
                            className={`px-2.5 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer flex items-center gap-2.5 transition-colors ${
                              isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-zinc-200 hover:bg-zinc-700'
                            }`}
                          >
                            {item.icon}
                            <span className="truncate">{item.label}</span>
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleEndCall}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer transition-all hover:scale-105 active:scale-95 ml-1"
                title="Leave meeting"
              >
                <PhoneOff size={isVeryCompact ? 16 : 18} />
                <span className="text-xs hidden md:inline">Leave</span>
              </button>
            </div>

            <div className={`hidden sm:block w-px h-6 mx-0.5 shrink-0 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />

            {/* Right: panels. Chat and people stay reachable at every size. */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => setActiveSideDrawer(activeSideDrawer === 'chat' ? null : 'chat')}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-colors hover:scale-105 active:scale-95 ${
                  activeSideDrawer === 'chat' ? 'bg-blue-600 text-white' : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                }`}
                title="Chat with everyone (Ctrl+Alt+C)"
              >
                <MessageSquare size={isVeryCompact ? 16 : 18} />
              </button>

              <button
                onClick={() => setActiveSideDrawer(activeSideDrawer === 'people' ? null : 'people')}
                className={`relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-colors hover:scale-105 active:scale-95 ${
                  activeSideDrawer === 'people' ? 'bg-blue-600 text-white' : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                }`}
                title="Show everyone"
              >
                <Users size={isVeryCompact ? 16 : 18} />
                {raisedHandCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
                    {raisedHandCount}
                  </span>
                )}
              </button>

              {!isCompact && (
                <button
                  onClick={() => setActiveSideDrawer(activeSideDrawer === 'activities' ? null : 'activities')}
                  className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-colors hover:scale-105 active:scale-95 ${
                    activeSideDrawer === 'activities' ? 'bg-blue-600 text-white' : `${palette.controlButtonIdle} ${palette.controlButtonIdleHover}`
                  }`}
                  title="Activities"
                >
                  <PictureInPicture2 size={isVeryCompact ? 16 : 18} />
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALS INTEGRATION
         ========================================================= */}
      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div
            className={`w-88 rounded-2xl p-4 shadow-2xl border flex flex-col gap-3 font-sans relative ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#2b2a2f] border-white/15 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Schedule Meeting</span>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Meeting Topic (e.g. Design Review)"
              value={schedTitle}
              onChange={(e) => setSchedTitle(e.target.value)}
              className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
              }`}
              autoFocus
            />

            <div className="flex items-center gap-2">
              <select
                value={schedTime}
                onChange={(e) => setSchedTime(e.target.value)}
                className={`flex-1 text-xs px-3 py-2 rounded-xl border focus:outline-none ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                }`}
              >
                {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={schedCategory}
                onChange={(e) => setSchedCategory(e.target.value as 'Work' | 'Personal')}
                className={`flex-1 text-xs px-3 py-2 rounded-xl border focus:outline-none ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
                }`}
              >
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
              </select>
            </div>

            {/* Passcode Protection field */}
            <input
              type="text"
              placeholder="Set Passcode (optional)"
              value={schedPasscode}
              onChange={(e) => setSchedPasscode(e.target.value)}
              className={`w-full text-xs px-3 py-1.5 rounded-xl border focus:outline-none ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/30 border-white/15 text-white'
              }`}
            />

            <label className={`flex items-center gap-2 text-xs cursor-pointer pt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              <input
                type="checkbox"
                checked={schedWaitingRoom}
                onChange={(e) => setSchedWaitingRoom(e.target.checked)}
                className="accent-blue-500"
              />
              <span>Enable Waiting Room for this call</span>
            </label>

            <button
              onClick={handleSaveSchedule}
              className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-md transition-colors mt-1"
            >
              Schedule & Sync to Calendar
            </button>
          </div>
        </div>
      )}

      {/* Whiteboard Modal */}
      <WhiteboardModal
        isOpen={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        isLight={isLight}
      />

      {/* Breakout Rooms Modal */}
      <BreakoutRoomsModal
        isOpen={showBreakoutRooms}
        onClose={() => setShowBreakoutRooms(false)}
        participants={participants}
        isLight={isLight}
      />

      {/* Security & Host Controls Modal */}
      <SecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        settings={securitySettings}
        onUpdateSettings={(updated) => setSecuritySettings((prev) => ({ ...prev, ...updated }))}
        isLight={isLight}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        meetingId={currentMeetingId || 'meet-demo'}
        meetingTitle={meetingTitle}
        passcode={securitySettings.passcode}
        isLight={isLight}
      />
    </AppShell>
  );
}
