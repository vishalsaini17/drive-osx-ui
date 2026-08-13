import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Sliders,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Disc,
  Pause,
  Play,
  Download,
  HardDrive,
  BarChart2,
  Split,
  UserPlus,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Pin,
  UserX,
  UserCheck,
  VolumeX,
  Settings,
  Filter,
} from 'lucide-react';
import { useSystemStore } from '../../shell/state/systemStore';
import { MeetingService } from '../../platform/meetings/MeetingService';
import { Participant, ChatMessage, Poll, MeetingSecuritySettings, WaitingParticipant } from './types';
import WhiteboardModal from './components/WhiteboardModal';
import PollsDrawer from './components/PollsDrawer';
import BreakoutRoomsModal from './components/BreakoutRoomsModal';
import SecurityModal from './components/SecurityModal';
import InviteModal from './components/InviteModal';

// Canvas component for Virtual Studio Camera or live webcam feed
function VirtualCameraCanvas({ name = 'You (Virtual Cam)', stream, mirrored = true }: { name?: string; stream?: MediaStream | null; mirrored?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    if (stream) {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});

      const render = () => {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        if (video.readyState >= 2) {
          ctx.save();
          if (mirrored) {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, w, h);
          ctx.restore();
        }
        animationFrameId = requestAnimationFrame(render);
      };

      video.onloadedmetadata = () => {
        render();
      };

      return () => {
        cancelAnimationFrame(animationFrameId);
        video.pause();
        video.srcObject = null;
      };
    }

    const render = () => {
      t += 0.04;
      const w = canvas.width;
      const h = canvas.height;

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

      // Animated ambient studio light orb behind head
      const cx = w / 2;
      const cy = h / 2 - 10;
      const lightGrad = ctx.createRadialGradient(
        cx + Math.sin(t) * 20,
        cy + Math.cos(t * 0.7) * 15,
        10,
        cx,
        cy,
        w * 0.45
      );
      lightGrad.addColorStop(0, 'rgba(129, 140, 248, 0.35)');
      lightGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.12)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Draw stylized head & shoulders silhouette / avatar
      const headY = cy - 25 + Math.sin(t * 1.2) * 3;

      // Shoulders
      ctx.fillStyle = 'rgba(224, 231, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, headY + 80, 75, 40, 0, 0, Math.PI, true);
      ctx.fill();

      // Head
      ctx.fillStyle = 'rgba(238, 242, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(cx, headY, 32, 0, Math.PI * 2);
      ctx.fill();

      // Face tracking / AR contour ring
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + Math.sin(t * 2) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, headY, 38 + Math.sin(t * 1.5) * 2, 0, Math.PI * 2);
      ctx.stroke();

      // AR Face landmark points
      ctx.fillStyle = '#60a5fa';
      for (let i = 0; i < 4; i++) {
        const angle = t * 1.5 + (i * Math.PI) / 2;
        const px = cx + Math.cos(angle) * (38 + Math.sin(t * 1.5) * 2);
        const py = headY + Math.sin(angle) * (38 + Math.sin(t * 1.5) * 2);
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Live HD Studio Cam Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px sans-serif';
      ctx.fillText('✨ OSX VIRTUAL CAM HD', 12, 20);

      // REC Dot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(w - 20, 16, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px monospace';
      const timeStr = new Date().toLocaleTimeString([], { hour12: false });
      ctx.fillText(timeStr, w - 75, 20);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stream, mirrored]);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-slate-900 overflow-hidden">
      <canvas ref={canvasRef} width={480} height={320} className="w-full h-full object-cover" />
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

export default function MeetingApp() {
  const theme = useSystemStore((state) => state.settings.theme);
  const isLight = theme === 'classic-light';

  // System Store integration
  const calendarEvents = useSystemStore((state) => state.calendarEvents);
  const addCalendarEvent = useSystemStore((state) => state.addCalendarEvent);
  const setFiles = useSystemStore((state) => state.setFiles);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);

  // Container width state for responsive layout inside windows / mobile
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(entry.contentRect.width);
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
  const [currentMeetingId, setCurrentMeetingId] = useState('');
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

  // Modals & Drawers state
  const [activeSideDrawer, setActiveSideDrawer] = useState<'chat' | 'people' | 'polls' | 'info' | 'waiting' | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showBreakoutRooms, setShowBreakoutRooms] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

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
      if (audioContext) {
        audioContext.close();
      }

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!audioStream || !audioStream.active) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
        requestAnimationFrame(updateLevel);
      };

      updateLevel();
      setAudioContext(ctx);
    } catch {
      setMicLevel(65);
    }
  };

  // Reaction animations
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  // Chat State & File Upload
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Polls State
  const [polls, setPolls] = useState<Poll[]>([]);

  // Participants State
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'me',
      name: 'You (Host)',
      role: 'Host',
      avatar: '',
      isMuted: false,
      isVideoOn: false,
      isHandRaised: false,
      isSpeaking: false,
      bgGradient: 'from-blue-600 to-indigo-700',
    },
  ]);

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

    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      setWebcamStream(null);
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
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

  useEffect(() => {
    if (isVideoOn && !useVirtualCam) {
      requestCameraAccess(selectedVideoDeviceId || undefined);
    } else {
      if (webcamStream) {
        webcamStream.getTracks().forEach((t) => t.stop());
        setWebcamStream(null);
      }
    }
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach((t) => t.stop());
      }
      if (audioStream && audioStream !== webcamStream) {
        audioStream.getTracks().forEach((t) => t.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [isVideoOn, useVirtualCam, selectedVideoDeviceId]);

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

  useEffect(() => {
    if (activeTab !== 'in-call') return;
    const interval = setInterval(() => {
      setParticipants((prev) => {
        const randomIdx = Math.floor(Math.random() * (prev.length - 1)) + 1;
        return prev.map((p, idx) => ({
          ...p,
          isSpeaking: idx === randomIdx ? !p.isMuted && Math.random() > 0.4 : false,
        }));
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'pre-meeting') return;
    if (!isVideoOn || useVirtualCam) return;
    if (permissionStatus === 'denied') return;

    requestCameraAccess(selectedVideoDeviceId || undefined);
  }, [activeTab, isVideoOn, useVirtualCam, permissionStatus, selectedVideoDeviceId]);

  // Start instant meeting
  const handleStartInstantMeeting = async (title = 'Instant Sync') => {
    const code = `meet-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 5)}`;
    setCurrentMeetingId(code);
    setMeetingTitle(title);
    setActiveTab('pre-meeting');

    try {
      const meeting = await MeetingService.createMeeting({ title });
      if (meeting) {
        setCurrentMeetingId(meeting.meetingCode || meeting._id || code);
        setMeetingTitle(meeting.title || title);
      }
    } catch (error) {
      console.warn('Failed to create meeting:', error);
    }
  };

  // Join meeting via code / link
  const handleJoinByCode = async () => {
    let cleanCode = meetingCode.trim();
    if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/');
      cleanCode = parts[parts.length - 1];
    }
    if (!cleanCode) return;

    setJoinError(null);
    setActiveTab('pre-meeting');

    try {
      const meeting = await MeetingService.joinMeeting(cleanCode, inputPasscode);
      if (meeting) {
        setCurrentMeetingId(meeting._id || cleanCode);
        setMeetingTitle(meeting.title || `Meeting (${cleanCode})`);
        // The API never returns a meeting passcode. Keep the one the user
        // entered so the security panel can show that a passcode is in force.
        if (meeting.hasPasscode) {
          setSecuritySettings((prev) => ({ ...prev, passcode: inputPasscode ?? '' }));
        }
      }
    } catch (error: any) {
      setJoinError(error.message || 'Failed to join meeting');
      setActiveTab('lobby');
    }
  };

  const handleEndCall = async () => {
    if (currentMeetingId) {
      try {
        await MeetingService.leaveMeeting(currentMeetingId);
      } catch (error) {
        console.warn('Failed to leave meeting:', error);
      }
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      setWebcamStream(null);
    }
    if (audioContext) {
      audioContext.close();
    }
    setActiveTab('lobby');
    setActiveSideDrawer(null);
    setIsRecording(false);
    setIsScreenSharing(false);
    setParticipants([]);
    setChatMessages([]);
    setWaitingQueue([]);
  };

  const handleCopyLink = () => {
    const link = `https://meet.driveosx.app/${currentMeetingId}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } } as any,
          audio: false,
        });
        setScreenStream(stream);
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
        };
      } catch (error) {
        console.warn('Screen share denied:', error);
      }
    } else {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
    }
  };

  // Chat message & attachment
  const handleSendMessage = async (fileAttachment?: ChatMessage['attachment']) => {
    if (!chatInput.trim() && !fileAttachment) return;
    const myMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'You',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: chatInput.trim(),
      isMe: true,
      attachment: fileAttachment,
    };
    setChatMessages((prev) => [...prev, myMsg]);
    setChatInput('');

    if (currentMeetingId) {
      try {
        await MeetingService.sendChatMessage(currentMeetingId, chatInput.trim());
      } catch (error) {
        console.warn('Failed to send chat message:', error);
      }
    }
  };

  const handleAttachSampleFile = () => {
    handleSendMessage({
      name: 'Project_Design_Specs.pdf',
      size: '2.4 MB',
      type: 'pdf',
    });
  };

  // Poll actions
  const handleCreatePoll = (question: string, optionsList: string[]) => {
    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      question,
      options: optionsList.map((text, idx) => ({ id: `opt-${idx}`, text, votes: 0 })),
      isActive: true,
      creator: 'You (Host)',
      totalVotes: 0,
    };
    setPolls((prev) => [newPoll, ...prev]);
  };

  const handleVotePoll = (pollId: string, optionId: string) => {
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        if (p.userVotedOptionId === optionId) return p;
        const newOpts = p.options.map((opt) => {
          if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
          if (opt.id === p.userVotedOptionId) return { ...opt, votes: Math.max(0, opt.votes - 1) };
          return opt;
        });
        const total = newOpts.reduce((acc, curr) => acc + curr.votes, 0);
        return {
          ...p,
          options: newOpts,
          totalVotes: total,
          userVotedOptionId: optionId,
        };
      })
    );
  };

  const handleDeletePoll = (pollId: string) => {
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
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
        bgGradient: 'from-cyan-600 to-blue-700',
      },
    ]);
  };

  const handleDenyWaiting = (id: string) => {
    setWaitingQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Host Participant Management
  const handleMuteParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isMuted: true } : p))
    );
  };

  const handleMuteAll = () => {
    setParticipants((prev) =>
      prev.map((p) => (p.id !== 'me' ? { ...p, isMuted: true } : p))
    );
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  // Reaction
  const handleSendReaction = (emoji: string) => {
    const newReaction = {
      id: Date.now().toString() + Math.random(),
      emoji,
      x: 20 + Math.random() * 60,
    };
    setActiveReactions((prev) => [...prev, newReaction]);
    setShowReactionsMenu(false);

    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  };

  // Schedule Meeting
  const handleSaveSchedule = async () => {
    if (!schedTitle.trim()) return;
    const todayISO = new Date().toISOString().split('T')[0];
    const meetingCodeGenerated = `meet-${Math.floor(1000 + Math.random() * 9000)}`;

    addCalendarEvent({
      title: `🎥 ${schedTitle.trim()}`,
      date: todayISO,
      time: schedTime,
      category: schedCategory,
      description: `Video Meeting Link: https://meet.driveosx.app/${meetingCodeGenerated}${
        schedPasscode ? ` | Passcode: ${schedPasscode}` : ''
      }`,
    });

    try {
      await MeetingService.createMeeting({
        title: schedTitle.trim(),
        description: `Scheduled meeting`,
        startTime: new Date().toISOString(),
        passcode: schedPasscode,
        waitingRoomEnabled: schedWaitingRoom,
      });
    } catch (error) {
      console.warn('Failed to save scheduled meeting:', error);
    }

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
        <div className={`flex-1 flex ${containerWidth >= 780 ? 'flex-row' : 'flex-col'} p-3 sm:p-5 gap-4 sm:gap-6 overflow-y-auto max-w-6xl mx-auto w-full`}>
          {/* Left Column: Quick Actions & Camera Test Panel */}
          <div className="flex-1 flex flex-col gap-4 justify-center min-w-0 w-full">
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
               {/* Preview Window */}
               <div className={`rounded-xl overflow-hidden bg-black relative border border-white/10 flex items-center justify-center shrink-0 ${containerWidth >= 560 ? 'h-44' : 'h-40'}`}>
                  {isVideoOn ? (
                    <VirtualCameraCanvas stream={webcamStream} name={webcamStream ? "You" : "You (Virtual Cam)"} />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center gap-1 text-slate-400">
                      <VideoOff size={24} className="opacity-60" />
                      <span className="text-[11px] font-medium">Camera is Off</span>
                    </div>
                  )}
                 </div>

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

                 {/* Camera & Noise Suppression Toggles */}
                 <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
                         : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
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
                         : 'bg-zinc-800 text-zinc-400'
                     }`}
                     title="Toggle Noise Suppression"
                   >
                     <Filter size={12} />
                     <span className="hidden sm:inline">Noise Filter: {isNoiseSuppressionOn ? 'ON' : 'OFF'}</span>
                   </button>
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
                        onClick={() => handleStartInstantMeeting(evt.title)}
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
       )}

       {/* =========================================================
           VIEW 1.5: PRE-MEETING SCREEN
          ========================================================= */}
       {activeTab === 'pre-meeting' && (
         <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 gap-4 sm:gap-6 overflow-y-auto">
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
                <div className={`rounded-xl overflow-hidden bg-black relative border border-white/10 flex items-center justify-center shrink-0 ${containerWidth >= 560 ? 'h-44' : 'h-40'}`}>
                  {isVideoOn ? (
                    <VirtualCameraCanvas stream={webcamStream} name={webcamStream ? "You" : "You (Virtual Cam)"} />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center gap-1 text-slate-400">
                      <VideoOff size={24} className="opacity-60" />
                      <span className="text-[11px] font-medium">Camera is Off</span>
                    </div>
                  )}
                </div>

               <div className="flex flex-col gap-3">
                 <div className="flex flex-wrap items-center gap-2">
                   <button
                     onClick={() => setIsMicOn(!isMicOn)}
                     className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                       isMicOn
                         ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
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
                         ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
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
                   <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Camera</span>
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
                   <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Microphone</span>
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
                   await MeetingService.startMeeting(currentMeetingId);
                   setActiveTab('in-call');
                 }}
                 className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
               >
                 <Video size={16} />
                 Join Meeting
               </button>
               <button
                 onClick={handleCopyLink}
                 className="px-4 py-3 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer transition-colors flex items-center justify-center gap-2"
               >
                 {isCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                 {isCopied ? 'Copied' : 'Copy Link'}
               </button>
               <button
                 onClick={() => {
                   if (webcamStream) {
                     webcamStream.getTracks().forEach((t) => t.stop());
                     setWebcamStream(null);
                   }
                   if (audioContext) {
                     audioContext.close();
                   }
                   setActiveTab('lobby');
                 }}
                 className="px-4 py-3 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer transition-colors"
               >
                 Back
               </button>
             </div>
           </div>
         </div>
       )}

       {/* =========================================================
           VIEW 2: IN-CALL MEETING ROOM VIEW
          ========================================================= */}
       {activeTab === 'in-call' && (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-zinc-950 text-white">
          {/* Top Bar: Title & Code & Link Copy & Security/Rec Status */}
          <div className="h-12 px-3 sm:px-4 flex items-center justify-between bg-zinc-900/90 border-b border-zinc-800 shrink-0 z-10 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-zinc-100 truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">
                {meetingTitle}
              </span>
              <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-zinc-800 text-[11px] sm:text-xs text-zinc-400 border border-zinc-700/50 shrink-0">
                <span className={isVeryCompact ? 'hidden' : 'inline'}>Code: {currentMeetingId}</span>
                <span className={isVeryCompact ? 'inline' : 'hidden'}>{currentMeetingId}</span>
                <button
                  onClick={handleCopyLink}
                  className="hover:text-white cursor-pointer p-0.5 transition-colors"
                  title="Copy Link"
                >
                  {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Recording & Status Indicators */}
            <div className="flex items-center gap-2 shrink-0">
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
            {/* Main Stage Grid OR Screen Share View */}
            <div className="flex-1 p-2 sm:p-3 flex flex-col min-h-0 relative overflow-hidden">
              {isScreenSharing ? (
                <div className="flex-1 rounded-2xl overflow-hidden border border-emerald-500/50 relative shadow-2xl">
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
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                    <Monitor size={12} />
                    <span>You are sharing your screen</span>
                  </div>
                </div>
              ) : (
                <div className={`flex-1 grid gap-2 sm:gap-3 min-h-0 overflow-y-auto ${
                  pinnedParticipantId ? 'grid-cols-1' : containerWidth >= 520 ? 'grid-cols-2' : 'grid-cols-1'
                }`}>
                  {participants
                    .filter((p) => !pinnedParticipantId || p.id === pinnedParticipantId)
                    .map((p) => {
                      const isMe = p.id === 'me';
                      const showVideo = isMe ? isVideoOn : p.isVideoOn;
                      const showMuted = isMe ? !isMicOn : p.isMuted;

                      return (
                        <div
                          key={p.id}
                          className={`relative rounded-2xl overflow-hidden border flex flex-col items-center justify-center bg-zinc-900 transition-all min-h-[140px] sm:min-h-[180px] ${
                            p.isSpeaking
                              ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
                              : 'border-zinc-800'
                          }`}
                        >
                           {isMe && showVideo ? (
                             <VirtualCameraCanvas stream={webcamStream} name="You (Virtual Studio)" mirrored />
                           ) : showVideo ? (
                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                              <img
                                src={p.avatar}
                                alt={p.name}
                                className="w-full h-full object-cover filter brightness-90"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                            </div>
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-tr ${p.bgGradient} flex flex-col items-center justify-center p-3 sm:p-4 relative`}>
                              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 overflow-hidden shadow-xl mb-1.5 sm:mb-2">
                                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                              <span className="font-bold text-xs sm:text-sm text-white">{p.name}</span>
                              <span className="text-[10px] sm:text-xs text-white/60">{p.role}</span>
                            </div>
                          )}

                          {/* Participant Name Tag */}
                          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 border border-white/10 z-10 max-w-[85%] truncate">
                            <span className="truncate">{p.name}</span>
                            {showMuted && <MicOff size={12} className="text-red-400 shrink-0" />}
                          </div>

                          {/* Pin / Host Quick Action overlay */}
                          <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                            <button
                              onClick={() => setPinnedParticipantId(pinnedParticipantId === p.id ? null : p.id)}
                              className={`p-1.5 rounded-lg text-white backdrop-blur-md transition-colors cursor-pointer ${
                                pinnedParticipantId === p.id ? 'bg-blue-600' : 'bg-black/40 hover:bg-black/60'
                              }`}
                              title={pinnedParticipantId === p.id ? 'Unpin' : 'Pin to screen'}
                            >
                              <Pin size={12} />
                            </button>
                          </div>

                          {/* Speaking Waveform Indicator */}
                          {p.isSpeaking && (
                            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md z-10">
                              <Volume2 size={12} className="animate-bounce" />
                              <span className="hidden sm:inline">Speaking</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Floating Reactions Overlay */}
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              {activeReactions.map((r) => (
                <div
                  key={r.id}
                  style={{ left: `${r.x}%` }}
                  className="absolute bottom-16 text-3xl animate-bounce transition-all duration-1000"
                >
                  {r.emoji}
                </div>
              ))}
            </div>

            {/* Side Drawers: Chat / People / Polls / Waiting / Info */}
            {activeSideDrawer && (
              <div
                className={`bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 transition-all ${
                  isCompact
                    ? 'absolute inset-y-0 right-0 w-full sm:w-80 bg-zinc-900/95 backdrop-blur-md z-40 shadow-2xl animate-in slide-in-from-right duration-200'
                    : 'w-72 sm:w-80 relative z-20'
                }`}
              >
                {/* Drawer Header */}
                <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
                  <span className="font-bold text-sm text-zinc-100">
                    {activeSideDrawer === 'chat'
                      ? 'In-Call Chat'
                      : activeSideDrawer === 'people'
                      ? `Participants (${participants.length})`
                      : activeSideDrawer === 'waiting'
                      ? `Waiting Room (${waitingQueue.length})`
                      : 'Meeting Info'}
                  </span>
                  <button
                    onClick={() => setActiveSideDrawer(null)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Drawer Content: Chat with Attachments */}
                {activeSideDrawer === 'chat' && (
                  <div className="flex-1 flex flex-col min-h-0 p-3">
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col text-xs ${msg.isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[10px] text-zinc-500 mb-0.5">
                            {msg.sender} • {msg.time}
                          </span>
                          <div
                            className={`p-2.5 rounded-2xl max-w-[85%] flex flex-col gap-1.5 ${
                              msg.isMe
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
                            }`}
                          >
                            <span>{msg.text}</span>
                            {msg.attachment && (
                              <div className="p-2 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-2 text-[11px]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText size={14} className="text-blue-300 shrink-0" />
                                  <span className="truncate font-semibold">{msg.attachment.name}</span>
                                </div>
                                <button
                                  onClick={() => alert(`Downloaded ${msg.attachment?.name}`)}
                                  className="p-1 text-white hover:text-blue-200 cursor-pointer shrink-0"
                                >
                                  <Download size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chat Input & File Attachment */}
                    <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-zinc-800 shrink-0">
                      <button
                        onClick={handleAttachSampleFile}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                        title="Share File"
                      >
                        <Paperclip size={14} />
                      </button>

                      <input
                        type="text"
                        placeholder="Send message to everyone..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700/80 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Drawer Content: People / Participant List with Host Actions */}
                {activeSideDrawer === 'people' && (
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    <button
                      onClick={handleMuteAll}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-red-900/30 text-red-400 border border-zinc-700/60 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <VolumeX size={13} />
                      <span>Mute All Participants</span>
                    </button>

                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate text-zinc-200">{p.name}</span>
                            <span className="text-[10px] text-zinc-400">{p.role}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {p.id !== 'me' && (
                            <>
                              <button
                                onClick={() => handleMuteParticipant(p.id)}
                                className="p-1 rounded text-zinc-400 hover:text-red-400 cursor-pointer"
                                title="Mute Participant"
                              >
                                {p.isMuted ? <MicOff size={13} className="text-red-400" /> : <Mic size={13} />}
                              </button>
                              <button
                                onClick={() => handleRemoveParticipant(p.id)}
                                className="p-1 rounded text-zinc-400 hover:text-red-400 cursor-pointer"
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
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 gap-2 my-auto">
                        <UserCheck size={32} className="opacity-40" />
                        <span className="text-xs font-medium">Waiting Room is clear</span>
                      </div>
                    ) : (
                      waitingQueue.map((w) => (
                        <div key={w.id} className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={w.avatar} alt={w.name} className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate">{w.name}</span>
                              <span className="text-[10px] text-zinc-400">Waiting since {w.joinedAt}</span>
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
                              className="px-2 py-1 rounded-lg text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-zinc-300 cursor-pointer"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Drawer Content: Info */}
                {activeSideDrawer === 'info' && (
                  <div className="flex-1 p-4 flex flex-col gap-3 text-xs text-zinc-300">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-zinc-400 uppercase text-[10px]">Joining Info</span>
                      <span className="font-semibold text-white">{meetingTitle}</span>
                      <span className="text-zinc-500 break-all">https://meet.driveosx.app/{currentMeetingId}</span>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Copy size={13} />
                      <span>{isCopied ? 'Link Copied!' : 'Copy Joining Link'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Polls Drawer */}
            <PollsDrawer
              isOpen={activeSideDrawer === 'polls'}
              onClose={() => setActiveSideDrawer(null)}
              polls={polls}
              onCreatePoll={handleCreatePoll}
              onVotePoll={handleVotePoll}
              onDeletePoll={handleDeletePoll}
              isLight={isLight}
            />
          </div>

          {/* Bottom Call Control Toolbar */}
          <div className="h-14 sm:h-16 bg-zinc-900 border-t border-zinc-800 px-2 sm:px-4 flex items-center justify-between shrink-0 z-20 gap-1 overflow-x-auto">
            {/* Left Controls: Audio / Video / Virtual Cam / Noise Filter */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isMicOn
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                }`}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic size={isVeryCompact ? 16 : 18} /> : <MicOff size={isVeryCompact ? 16 : 18} />}
              </button>

              <button
                onClick={() => {
                  setIsVideoOn(!isVideoOn);
                  if (!isVideoOn) setUseVirtualCam(false);
                }}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isVideoOn
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                }`}
                title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isVideoOn ? <Video size={isVeryCompact ? 16 : 18} /> : <VideoOff size={isVeryCompact ? 16 : 18} />}
              </button>

              <button
                onClick={() => {
                  setIsVideoOn(true);
                  setUseVirtualCam(!useVirtualCam);
                }}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  useVirtualCam ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
                title={useVirtualCam ? 'Switch to Physical Camera' : 'Switch to Virtual Studio Cam'}
              >
                <Sparkles size={isVeryCompact ? 16 : 18} />
              </button>
            </div>

            {/* Center Controls: Reactions, Screen Share, Whiteboard, Recording, Hand, End Call */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Reactions Menu Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowReactionsMenu(!showReactionsMenu)}
                  className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer transition-colors"
                  title="Send Reaction"
                >
                  <Smile size={isVeryCompact ? 16 : 18} />
                </button>

                {showReactionsMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 sm:p-2 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-xl flex items-center gap-1 sm:gap-1.5 z-50">
                    {['👏', '👍', '❤️', '🎉', '😂', '👋', '🔥', '💡'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleSendReaction(emoji)}
                        className="p-1.5 text-lg hover:bg-zinc-700 rounded-xl cursor-pointer transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Screen Share Dropdown */}
              <div className="relative">
                <button
                  onClick={toggleScreenShare}
                  className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                    isScreenSharing
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                  title="Share Screen"
                >
                  <Monitor size={isVeryCompact ? 16 : 18} />
                </button>
              </div>

              {/* Whiteboard */}
              <button
                onClick={() => setShowWhiteboard(true)}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-purple-300 cursor-pointer transition-colors"
                title="Open Collaborative Whiteboard"
              >
                <Sparkles size={isVeryCompact ? 16 : 18} />
              </button>

              {/* Record Meeting Button */}
              <button
                onClick={handleToggleRecording}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
                title={isRecording ? 'Stop Recording' : 'Record Meeting'}
              >
                <Disc size={isVeryCompact ? 16 : 18} />
              </button>

              {/* Raise Hand */}
              <button
                onClick={() => setIsHandRaised(!isHandRaised)}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                  isHandRaised
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
                title="Raise Hand"
              >
                <Hand size={isVeryCompact ? 16 : 18} />
              </button>

              {/* Breakout Rooms */}
              <button
                onClick={() => setShowBreakoutRooms(true)}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-indigo-300 cursor-pointer transition-colors"
                title="Breakout Rooms"
              >
                <Split size={isVeryCompact ? 16 : 18} />
              </button>

              {/* Leave Call Red Button */}
              <button
                onClick={handleEndCall}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer transition-colors ml-1"
                title="Leave Meeting"
              >
                <PhoneOff size={isVeryCompact ? 16 : 18} />
                <span className="text-xs hidden md:inline">End</span>
              </button>
            </div>

            {/* Right Controls: Drawers (Polls, Chat, People, Security) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => setActiveSideDrawer(activeSideDrawer === 'polls' ? null : 'polls')}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-colors ${
                  activeSideDrawer === 'polls' ? 'bg-amber-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300'
                }`}
                title="Live Polls"
              >
                <BarChart2 size={isVeryCompact ? 16 : 18} />
              </button>

              <button
                onClick={() => setActiveSideDrawer(activeSideDrawer === 'chat' ? null : 'chat')}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-colors ${
                  activeSideDrawer === 'chat' ? 'bg-blue-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
                title="Chat"
              >
                <MessageSquare size={isVeryCompact ? 16 : 18} />
              </button>

              <button
                onClick={() => setActiveSideDrawer(activeSideDrawer === 'people' ? null : 'people')}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl cursor-pointer transition-colors ${
                  activeSideDrawer === 'people' ? 'bg-blue-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
                title="Participants"
              >
                <Users size={isVeryCompact ? 16 : 18} />
              </button>

              <button
                onClick={() => setShowSecurityModal(true)}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 cursor-pointer transition-colors"
                title="Security & Host Controls"
              >
                <ShieldCheck size={isVeryCompact ? 16 : 18} />
              </button>
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

            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer pt-0.5">
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
