import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, User, Search, Phone, Video, MoreVertical, Paperclip,
  Smile, Mic, Image as ImageIcon, FileText, CheckCheck, Pin, Bell, BellOff,
  Users, Hash, Plus, X, Info, PhoneOff, MicOff, VideoOff, Copy, Check,
  ThumbsUp, Heart, Flame, Laugh, Rocket, MessageSquare, Play, Pause,
  Radio, HardDrive, Edit2, Trash2, Reply, Quote, Film, ExternalLink,
  Volume2, VolumeX, Monitor, Filter, FolderKanban, ShieldAlert
} from 'lucide-react';
import { useSystemStore } from '../../shell/state/systemStore';
import {
  ExtendedMessage, ChatChannel, CallState, UserPresence
} from './types';
import { DrivePickerModal } from './components/DrivePickerModal';
import { CallModal } from './components/CallModal';
import { NewChatModal } from './components/NewChatModal';
import { SharedFilesModal } from './components/SharedFilesModal';

export default function Messenger() {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // System Store
  const setMessages = useSystemStore((state) => state.setMessages);
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const handleCloseWindow = useSystemStore((state) => state.handleCloseWindow);
  const currentUser = useSystemStore((state) => state.currentUser);

  // User Presence State
  const [myPresence, setMyPresence] = useState<UserPresence>('online');

  // Channels List State
  const [channels, setChannels] = useState<ChatChannel[]>([
    {
      id: 'ai-assistant',
      name: 'OS Caption AI',
      type: 'ai',
      role: 'System AI Assistant',
      status: 'online',
      unread: 0,
      lastMessage: 'I can launch apps, set wallpapers & run commands!',
      lastTime: 'Just now',
      isPinned: true,
      description: 'Integrated OS automation helper powered by Gemini.'
    },
    {
      id: 'general',
      name: '# team-general',
      type: 'group',
      unread: 2,
      lastMessage: 'Elena: The new OS update build is passing clean tests!',
      lastTime: '10:42 AM',
      isPinned: true,
      isMuted: false,
      membersCount: 8,
      description: 'General discussion for team announcements & updates.'
    },
    {
      id: 'announcements',
      name: '📢 Company Broadcasts',
      type: 'broadcast',
      unread: 1,
      lastMessage: 'Admin: System-wide maintenance scheduled for midnight.',
      lastTime: '08:00 AM',
      isPinned: true,
      description: 'Official company-wide broadcast announcements.'
    },
    {
      id: 'sarah',
      name: 'Sarah Jenkins',
      type: 'dm',
      role: 'Lead UI/UX Designer',
      status: 'online',
      unread: 1,
      lastMessage: 'Can you check the new desktop wallpaper vector assets?',
      lastTime: '09:15 AM',
      description: 'Design system, Figma links & visual feedback.'
    },
    {
      id: 'alex',
      name: 'Alex Rivera',
      type: 'dm',
      role: 'Full-stack Architect',
      status: 'away',
      unread: 0,
      lastMessage: 'Merged the window resize event fixes into main branch.',
      lastTime: 'Yesterday',
      description: 'Backend services, performance & virtual machine APIs.'
    },
    {
      id: 'project-launch',
      name: '# project-launch',
      type: 'group',
      unread: 0,
      lastMessage: 'David: Marketing graphics approved for distribution.',
      lastTime: 'Jul 21',
      membersCount: 12,
      description: 'Launch timeline & release checklist.'
    }
  ]);

  // Messages State per Channel
  const [channelMessages, setChannelMessages] = useState<Record<string, ExtendedMessage[]>>({
    'ai-assistant': [
      {
        id: 'msg-ai-1',
        senderId: 'ai',
        senderName: 'OS Caption AI',
        isUser: false,
        text: `👋 Hello ${currentUser?.fullName || 'Administrator'}! I am OS Caption, your system assistant. I can automate desktop actions, open applications, configure wallpapers, adjust audio volume, or answer questions!`,
        timestamp: '10:00 AM',
        status: 'read'
      },
      {
        id: 'msg-ai-2',
        senderId: 'ai',
        senderName: 'OS Caption AI',
        isUser: false,
        text: 'Try selecting one of the quick actions below or type your custom request:',
        timestamp: '10:00 AM',
        status: 'read',
        actionPrompt: 'quick-actions'
      }
    ],
    'general': [
      {
        id: 'msg-gen-1',
        senderId: 'alex-id',
        senderName: 'Alex Rivera',
        isUser: false,
        text: 'Good morning team! We are prepping the latest WebVM desktop release candidate.',
        timestamp: '09:30 AM',
        status: 'read'
      },
      {
        id: 'msg-gen-2',
        senderId: 'sarah-id',
        senderName: 'Sarah Jenkins',
        isUser: false,
        text: 'The glassmorphism theme and custom Paint frame resizing look super smooth! 🎨✨ @You check this out!',
        timestamp: '10:15 AM',
        reactions: { '❤️': 3, '🚀': 2 },
        status: 'read'
      },
      {
        id: 'msg-gen-3',
        senderId: 'elena-id',
        senderName: 'Elena Rostova',
        isUser: false,
        text: 'The new OS update build is passing clean tests!',
        timestamp: '10:42 AM',
        reactions: { '🔥': 4, '👍': 5 },
        status: 'read'
      }
    ],
    'announcements': [
      {
        id: 'msg-ann-1',
        senderId: 'admin',
        senderName: 'System Admin',
        isUser: false,
        text: '📢 System-wide maintenance scheduled for midnight UTC. Workspace sync will remain operational.',
        timestamp: '08:00 AM',
        status: 'read',
        isPinned: true
      }
    ],
    'sarah': [
      {
        id: 'msg-sarah-1',
        senderId: 'sarah-id',
        senderName: 'Sarah Jenkins',
        isUser: false,
        text: 'Hey! Did you get a chance to check out the new dark mode color palette?',
        timestamp: '09:10 AM',
        status: 'read'
      },
      {
        id: 'msg-sarah-2',
        senderId: 'sarah-id',
        senderName: 'Sarah Jenkins',
        isUser: false,
        text: 'Can you check the new desktop wallpaper vector assets?',
        timestamp: '09:15 AM',
        status: 'read'
      }
    ],
    'alex': [
      {
        id: 'msg-alex-1',
        senderId: 'alex-id',
        senderName: 'Alex Rivera',
        isUser: false,
        text: 'Merged the window resize event fixes into main branch.',
        timestamp: 'Yesterday',
        status: 'read',
        codeSnippet: `// System window resize clamping logic
const effectiveMinW = Math.max(300, minW);
const newW = Math.max(effectiveMinW, Math.min(requestedW, viewportW));`
      }
    ],
    'project-launch': [
      {
        id: 'msg-proj-1',
        senderId: 'david-id',
        senderName: 'David Vance',
        isUser: false,
        text: 'Marketing graphics approved for distribution. We are go for launch! 🚀',
        timestamp: 'Jul 21',
        status: 'read'
      }
    ]
  });

  // Active UI Channel & State
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'dms' | 'channels' | 'broadcast'>('all');
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Reply state
  const [replyToMsg, setReplyToMsg] = useState<{ id: string; senderName: string; text: string } | null>(null);

  // Editing state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Modals state
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSharedFilesModal, setShowSharedFilesModal] = useState(false);

  // Attachment State
  const [attachment, setAttachment] = useState<{
    file?: File;
    url?: string;
    type: 'image' | 'video' | 'file' | 'drive';
    fileName: string;
    fileSize?: string;
  } | null>(null);

  // Emoji / GIF / Sticker Picker Popover
  const [popoverTab, setPopoverTab] = useState<'emoji' | 'gif' | 'sticker' | null>(null);

  // Voice Note Recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  // Call State
  const [activeCall, setActiveCall] = useState<CallState | null>(null);

  // Expanded Preview
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  // Toast Notification
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Copied code feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const activeMessages = channelMessages[activeChannelId] || [];
  const pinnedMessages = activeMessages.filter((m) => m.isPinned);

  // Scroll to bottom on message updates
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeMessages, isTyping, activeChannelId]);

  // Voice recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall) {
      interval = setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const showToast = (text: string) => {
    setToastNotification(text);
    setTimeout(() => setToastNotification(null), 3000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectChannel = (id: string) => {
    setActiveChannelId(id);
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  };

  const handleToggleMuteChannel = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setChannels((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextMuted = !c.isMuted;
          showToast(nextMuted ? `Muted notifications for ${c.name}` : `Unmuted ${c.name}`);
          return { ...c, isMuted: nextMuted };
        }
        return c;
      })
    );
  };

  // Add Meeting Link to Chat & Open Meet App
  const handleAddMeetingLink = () => {
    const meetId = `meet-${Math.random().toString(36).substring(2, 7)}`;
    const linkUrl = `https://meet.osx/room/${meetId}`;

    const newMsg: ExtendedMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user-me',
      senderName: currentUser?.fullName || 'You',
      isUser: true,
      text: `📹 Joined OSX Meet Video Room:\n${linkUrl}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMeetingLink: true,
      meetingUrl: linkUrl,
      status: 'sent',
    };

    setChannelMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
    }));

    openAppWindow('osxMeet');
    showToast('Meeting link added to chat & OSX Meet launched!');
  };

  // Start Audio or Video Call, creating a meeting link in chat
  const handleStartCall = (type: 'audio' | 'video') => {
    const meetId = `meet-${Math.random().toString(36).substring(2, 7)}`;
    const linkUrl = `https://meet.osx/room/${meetId}`;

    const newMsg: ExtendedMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user-me',
      senderName: currentUser?.fullName || 'You',
      isUser: true,
      text: type === 'video'
        ? `📹 Started Video Call in ${activeChannel.name}:\n${linkUrl}`
        : `📞 Started Audio Call in ${activeChannel.name}:\n${linkUrl}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMeetingLink: true,
      meetingUrl: linkUrl,
      status: 'sent',
    };

    setChannelMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
    }));

    setActiveCall({
      type,
      contactName: activeChannel.name,
      duration: 0,
      isMuted: false,
      isVideoOff: type === 'audio',
      isScreenSharing: false,
    });

    showToast(`Started ${type === 'video' ? 'Video' : 'Audio'} Call & added meeting link to chat!`);
  };

  // Send Message Logic
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if editing
    if (editingMsgId) {
      if (!editText.trim()) return;
      setChannelMessages((prev) => ({
        ...prev,
        [activeChannelId]: (prev[activeChannelId] || []).map((m) =>
          m.id === editingMsgId
            ? { ...m, text: editText, editedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            : m
        ),
      }));
      setEditingMsgId(null);
      setEditText('');
      showToast('Message edited');
      return;
    }

    const textToSend = inputText.trim();
    if (!textToSend && !attachment && !isRecordingVoice) return;

    let mediaUrl: string | undefined = undefined;
    let mediaType: 'image' | 'video' | 'file' | 'audio' | 'drive' | undefined = undefined;
    let fileName: string | undefined = undefined;

    if (attachment) {
      mediaUrl = attachment.url;
      mediaType = attachment.type;
      fileName = attachment.fileName;
    } else if (isRecordingVoice) {
      mediaUrl = 'voice-note-audio';
      mediaType = 'audio';
      setIsRecordingVoice(false);
    }

    const newMsg: ExtendedMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user-me',
      senderName: currentUser?.fullName || 'You',
      isUser: true,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mediaUrl,
      mediaType,
      fileName,
      replyTo: replyToMsg || undefined,
      status: 'sent',
    };

    setChannelMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
    }));

    setChannels((prev) =>
      prev.map((c) =>
        c.id === activeChannelId
          ? {
              ...c,
              lastMessage: textToSend || (mediaType === 'image' ? '📷 Image' : mediaType === 'video' ? '🎬 Video' : '📎 Attachment'),
              lastTime: 'Just now',
            }
          : c
      )
    );

    setInputText('');
    setAttachment(null);
    setReplyToMsg(null);
    setPopoverTab(null);

    // AI or Contact Response Simulation
    if (activeChannelId === 'ai-assistant') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const aiReplyText = parseQueryAndExecuteActions(textToSend);
        const aiMsg: ExtendedMessage = {
          id: `msg-${Date.now() + 1}`,
          senderId: 'ai',
          senderName: 'OS Caption AI',
          isUser: false,
          text: aiReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
        };

        setChannelMessages((prev) => ({
          ...prev,
          'ai-assistant': [...(prev['ai-assistant'] || []), aiMsg],
        }));

        setMessages((prev) => [
          ...prev,
          {
            id: aiMsg.id,
            sender: 'assistant',
            text: aiReplyText,
            timestamp: aiMsg.timestamp,
          },
        ]);
      }, 700);
    } else if (activeChannel.type === 'dm') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replies = [
          `Thanks for sending that! Let me review it now.`,
          `Got your message! Looks good to me.`,
          `I'll check out the attachment right away.`
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        const contactMsg: ExtendedMessage = {
          id: `msg-${Date.now() + 1}`,
          senderId: activeChannelId,
          senderName: activeChannel.name,
          isUser: false,
          text: randomReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
        };

        setChannelMessages((prev) => ({
          ...prev,
          [activeChannelId]: [...(prev[activeChannelId] || []), contactMsg],
        }));
      }, 1200);
    }
  };

  // OS Automated Action Router
  const parseQueryAndExecuteActions = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('wallpaper') || q.includes('background')) {
      if (q.includes('sunset')) {
        setSettings((prev) => ({ ...prev, wallpaper: 'sunset' }));
        return '🌅 Desktop wallpaper changed to "Sunset Glow"!';
      }
      if (q.includes('space') || q.includes('star') || q.includes('nebula')) {
        setSettings((prev) => ({ ...prev, wallpaper: 'deep-space' }));
        return '🌌 Desktop wallpaper changed to "Deep Space Nebula"!';
      }
      if (q.includes('matrix') || q.includes('green') || q.includes('rain')) {
        setSettings((prev) => ({ ...prev, wallpaper: 'matrix-green' }));
        return '📟 Enabled "Matrix Digital Rain" desktop wallpaper!';
      }
      if (q.includes('default') || q.includes('waves') || q.includes('original')) {
        setSettings((prev) => ({ ...prev, wallpaper: 'wave-default' }));
        return '🎨 Restored standard desktop vector wallpaper!';
      }
    }

    if (q.includes('open') || q.includes('launch') || q.includes('start')) {
      if (q.includes('terminal') || q.includes('cmd') || q.includes('bash')) {
        openAppWindow('terminal');
        return '📟 Launched Terminal application!';
      }
      if (q.includes('paint') || q.includes('draw')) {
        openAppWindow('paint');
        return '🎨 Opened Paint Studio application!';
      }
      if (q.includes('settings')) {
        openAppWindow('settings');
        return '⚙️ Opened System Settings application!';
      }
      if (q.includes('file') || q.includes('explorer')) {
        openAppWindow('fileManager');
        return '📁 Opened File Explorer application!';
      }
      if (q.includes('browser') || q.includes('web')) {
        openAppWindow('browser');
        return '🌐 Launched Web Browser application!';
      }
      if (q.includes('meet') || q.includes('call')) {
        openAppWindow('osxMeet');
        return '📹 Opened OSX Meet Video Call app!';
      }
    }

    if (q.includes('mute')) {
      setSettings((prev) => ({ ...prev, soundsEnabled: false }));
      return '🔇 System audio muted.';
    }
    if (q.includes('unmute')) {
      setSettings((prev) => ({ ...prev, soundsEnabled: true }));
      return '🔊 System audio enabled.';
    }

    return `💡 I am your OS assistant. Ask me to open apps, change wallpapers, or run system tasks!`;
  };

  // Toggle Pin Message
  const handleTogglePinMessage = (msgId: string) => {
    setChannelMessages((prev) => {
      const list = prev[activeChannelId] || [];
      const updated = list.map((m) => {
        if (m.id === msgId) {
          const nextPinned = !m.isPinned;
          showToast(nextPinned ? 'Message pinned to channel header' : 'Message unpinned');
          return { ...m, isPinned: nextPinned };
        }
        return m;
      });
      return { ...prev, [activeChannelId]: updated };
    });
  };

  // Delete Message
  const handleDeleteMessage = (msgId: string) => {
    setChannelMessages((prev) => ({
      ...prev,
      [activeChannelId]: (prev[activeChannelId] || []).filter((m) => m.id !== msgId),
    }));
    showToast('Message deleted');
  };

  // Start Edit Message
  const handleStartEdit = (msg: ExtendedMessage) => {
    setEditingMsgId(msg.id);
    setEditText(msg.text);
  };

  // Toggle Reaction
  const handleToggleReaction = (msgId: string, emoji: string) => {
    setChannelMessages((prev) => {
      const list = prev[activeChannelId] || [];
      const updated = list.map((msg) => {
        if (msg.id !== msgId) return msg;

        const rx = { ...(msg.reactions || {}) };
        const userRx = [...(msg.userReactions || [])];

        if (userRx.includes(emoji)) {
          rx[emoji] = Math.max(0, (rx[emoji] || 1) - 1);
          if (rx[emoji] === 0) delete rx[emoji];
          return {
            ...msg,
            reactions: rx,
            userReactions: userRx.filter((e) => e !== emoji),
          };
        } else {
          rx[emoji] = (rx[emoji] || 0) + 1;
          return {
            ...msg,
            reactions: rx,
            userReactions: [...userRx, emoji],
          };
        }
      });
      return { ...prev, [activeChannelId]: updated };
    });
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Local File Change (Image, Video, or File)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);

    setAttachment({
      file,
      url,
      type: isImage ? 'image' : isVideo ? 'video' : 'file',
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    });
    e.target.value = '';
  };

  // Filter channels
  const filteredChannels = channels.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'dms') return c.type === 'dm';
    if (activeFilter === 'channels') return c.type === 'group' || c.type === 'ai';
    if (activeFilter === 'broadcast') return c.type === 'broadcast';
    return true;
  });

  return (
    <div className="h-full flex bg-[#0f172a] text-slate-100 font-sans select-none overflow-hidden relative">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toast Notification Alert Banner */}
      {toastNotification && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-2xl border border-blue-400/30 animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* ================= 1. LEFT CONVERSATIONS SIDEBAR ================= */}
      <div className="w-72 bg-[#1e293b]/90 border-r border-slate-700/60 flex flex-col shrink-0">
        {/* User Profile Header & Presence selector */}
        <div className="p-3.5 border-b border-slate-700/60 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                {currentUser?.fullName?.slice(0, 2).toUpperCase() || 'ME'}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1e293b] ${
                  myPresence === 'online'
                    ? 'bg-emerald-500'
                    : myPresence === 'away'
                    ? 'bg-amber-500'
                    : myPresence === 'busy'
                    ? 'bg-rose-500'
                    : myPresence === 'dnd'
                    ? 'bg-purple-500'
                    : 'bg-slate-500'
                }`}
              />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight">
                {currentUser?.fullName || 'Administrator'}
              </h2>
              {/* Presence Selector Dropdown */}
              <select
                value={myPresence}
                onChange={(e) => {
                  const p = e.target.value as UserPresence;
                  setMyPresence(p);
                  showToast(`Presence updated to ${p.toUpperCase()}`);
                }}
                className="bg-transparent text-[10px] text-slate-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="online" className="bg-slate-800 text-emerald-400">🟢 Online</option>
                <option value="away" className="bg-slate-800 text-amber-400">🟡 Away</option>
                <option value="busy" className="bg-slate-800 text-rose-400">🔴 Busy</option>
                <option value="dnd" className="bg-slate-800 text-purple-400">🟣 Do Not Disturb</option>
                <option value="offline" className="bg-slate-800 text-slate-400">⚪ Offline</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-sm"
            title="New Chat or Channel"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-2.5">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats & channels..."
              className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 mt-2 overflow-x-auto">
            {[
              { key: 'all', label: 'All' },
              { key: 'dms', label: 'Direct' },
              { key: 'channels', label: 'Channels' },
              { key: 'broadcast', label: 'Broadcasts' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                  activeFilter === f.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
          {filteredChannels.map((ch) => {
            const isActive = ch.id === activeChannelId;
            return (
              <div
                key={ch.id}
                onClick={() => handleSelectChannel(ch.id)}
                className={`w-full p-2.5 rounded-xl text-left flex items-center gap-2.5 cursor-pointer transition-all group ${
                  isActive
                    ? 'bg-blue-600/20 border border-blue-500/40 text-white shadow-xs'
                    : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                }`}
              >
                {/* Channel Icon or Avatar */}
                <div className="relative shrink-0">
                  {ch.type === 'ai' ? (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                  ) : ch.type === 'broadcast' ? (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-pink-600 flex items-center justify-center text-white shadow-md">
                      <Radio className="w-4 h-4" />
                    </div>
                  ) : ch.type === 'group' ? (
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold">
                      <Hash className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {ch.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {ch.status && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1e293b] ${
                        ch.status === 'online'
                          ? 'bg-emerald-500'
                          : ch.status === 'away'
                          ? 'bg-amber-500'
                          : ch.status === 'busy'
                          ? 'bg-rose-500'
                          : 'bg-slate-500'
                      }`}
                    />
                  )}
                </div>

                {/* Channel Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold truncate flex items-center gap-1 text-white">
                      {ch.name}
                      {ch.isPinned && <Pin className="w-2.5 h-2.5 text-amber-400 rotate-45" />}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400 shrink-0">
                      {ch.lastTime}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate leading-snug">
                    {ch.lastMessage}
                  </p>
                </div>

                {/* Mute toggle button */}
                <button
                  onClick={(e) => handleToggleMuteChannel(ch.id, e)}
                  className="p-1 rounded text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                  title={ch.isMuted ? 'Unmute' : 'Mute'}
                >
                  {ch.isMuted ? <BellOff className="w-3.5 h-3.5 text-rose-400" /> : <Bell className="w-3.5 h-3.5" />}
                </button>

                {/* Unread badge */}
                {ch.unread > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-extrabold rounded-full shrink-0 shadow-xs">
                    {ch.unread}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 2. MAIN CHAT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0b1329]">
        {/* Chat Header */}
        <div className="h-14 px-4 bg-[#1e293b]/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              {activeChannel.type === 'ai' ? (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
              ) : activeChannel.type === 'broadcast' ? (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-pink-600 flex items-center justify-center text-white shadow-md">
                  <Radio className="w-4 h-4" />
                </div>
              ) : activeChannel.type === 'group' ? (
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold">
                  <Hash className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                  {activeChannel.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
                {activeChannel.name}
                {activeChannel.type === 'broadcast' && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold rounded-md">
                    Broadcast Channel
                  </span>
                )}
                {activeChannel.isMuted && (
                  <span title="Notifications Muted">
                    <BellOff className="w-3.5 h-3.5 text-rose-400" />
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                {activeChannel.type === 'group' || activeChannel.type === 'broadcast' ? (
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <Users className="w-3 h-3 text-blue-400" /> {activeChannel.membersCount || 10} subscribers
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active now
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-1">
            {/* OSX Meet Link Button */}
            <button
              onClick={handleAddMeetingLink}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs mr-1"
              title="Add OSX Meet Link"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Meet Link</span>
            </button>

            {/* Audio Call */}
            {activeChannel.type !== 'ai' && (
              <>
                <button
                  onClick={() => handleStartCall('audio')}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Start Audio Call & Share Link"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStartCall('video')}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Start Video Call & Share Link"
                >
                  <Video className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Search Shared Files */}
            <button
              onClick={() => setShowSharedFilesModal(true)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="View Shared Files & Media"
            >
              <FolderKanban className="w-4 h-4" />
            </button>

            {/* Info Drawer Toggle */}
            <button
              onClick={() => setShowInfoDrawer((prev) => !prev)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showInfoDrawer ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Details & Settings"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="bg-amber-950/30 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Pin className="w-3.5 h-3.5 text-amber-400 rotate-45 shrink-0" />
              <span className="font-bold text-[10px] uppercase text-amber-400 shrink-0">Pinned:</span>
              <p className="truncate text-xs text-amber-100">{pinnedMessages[0].text}</p>
            </div>
            <button
              onClick={() => handleTogglePinMessage(pinnedMessages[0].id)}
              className="p-1 text-amber-300 hover:text-white text-[10px] underline cursor-pointer shrink-0"
            >
              Unpin
            </button>
          </div>
        )}

        {/* Message Feed Canvas */}
        <div
          ref={chatScrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar select-text bg-gradient-to-b from-[#0b1329] to-[#0f172a]"
        >
          {activeMessages.map((msg) => {
            const isMe = msg.isUser;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start max-w-[85%] group ${
                  isMe ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Sender Avatar */}
                <div className="shrink-0 mt-0.5">
                  {isMe ? (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      <User className="w-4 h-4" />
                    </div>
                  ) : activeChannel.type === 'ai' ? (
                    <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-amber-300 shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold">
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="space-y-1 min-w-0">
                  <div className={`flex items-center gap-2 ${isMe ? 'justify-end' : ''}`}>
                    <span className="text-[11px] font-bold text-slate-300">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                    {msg.editedAt && (
                      <span className="text-[9px] text-slate-400 italic">(edited)</span>
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed relative ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/60 shadow-sm'
                    }`}
                  >
                    {/* Reply Snippet Context */}
                    {msg.replyTo && (
                      <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-2 border-amber-400 text-[11px]">
                        <span className="font-bold text-amber-300 block mb-0.5">
                          Replying to {msg.replyTo.senderName}:
                        </span>
                        <p className="truncate opacity-80">{msg.replyTo.text}</p>
                      </div>
                    )}

                    {/* Media Image Attachment */}
                    {msg.mediaUrl && msg.mediaType === 'image' && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-sm">
                        <img
                          src={msg.mediaUrl}
                          alt="Attachment"
                          className="w-full h-auto max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setExpandedMedia({ url: msg.mediaUrl!, type: 'image' })}
                        />
                      </div>
                    )}

                    {/* Media Video Attachment */}
                    {msg.mediaUrl && msg.mediaType === 'video' && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-sm bg-black">
                        <video controls className="w-full max-h-52 rounded-xl">
                          <source src={msg.mediaUrl} type="video/mp4" />
                          Your browser does not support HTML5 video.
                        </video>
                      </div>
                    )}

                    {/* Media File or Drive Attachment */}
                    {msg.mediaUrl && (msg.mediaType === 'file' || msg.mediaType === 'drive') && (
                      <div className="mb-2 p-2.5 bg-black/20 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {msg.mediaType === 'drive' ? (
                            <HardDrive className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate">{msg.fileName || 'Drive Attachment'}</span>
                            <span className="text-[9px] opacity-70">
                              {msg.mediaType === 'drive' ? 'DriveOSX Linked File' : 'Attachment File'}
                            </span>
                          </div>
                        </div>
                        <a
                          href={msg.mediaUrl}
                          download={msg.fileName || 'file'}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold shrink-0 cursor-pointer"
                        >
                          Open
                        </a>
                      </div>
                    )}

                    {/* Voice Note Simulation */}
                    {msg.mediaUrl && msg.mediaType === 'audio' && (
                      <div className="mb-2 p-2 bg-black/20 rounded-xl border border-white/10 flex items-center gap-2 min-w-[200px]">
                        <button className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center text-white cursor-pointer shadow-xs">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="h-2 bg-white/20 rounded-full overflow-hidden flex items-center">
                            <div className="w-1/2 h-full bg-blue-400 rounded-full" />
                          </div>
                          <span className="text-[9px] font-mono opacity-80 block">Voice Note • 0:18</span>
                        </div>
                      </div>
                    )}

                    {/* Meeting Link Embed */}
                    {msg.isMeetingLink && (
                      <div className="mb-2 p-3 bg-indigo-950/60 border border-indigo-400/40 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                          <Video className="w-4 h-4" />
                          <span>OSX Meet Conference Room</span>
                        </div>
                        <p className="text-[11px] text-slate-300">Click below to open video conference window in DriveOSX.</p>
                        <button
                          onClick={() => openAppWindow('osxMeet')}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Join OSX Meet Room</span>
                        </button>
                      </div>
                    )}

                    {/* Message Text with Mention Highlight */}
                    <p className="whitespace-pre-line">
                      {msg.text.includes('@You') ? (
                        <span>
                          {msg.text.split('@You')[0]}
                          <span className="bg-amber-400/30 text-amber-200 px-1 py-0.5 rounded font-bold">@You</span>
                          {msg.text.split('@You')[1]}
                        </span>
                      ) : (
                        msg.text
                      )}
                    </p>

                    {/* Code Snippet Box */}
                    {msg.codeSnippet && (
                      <div className="mt-2.5 rounded-xl bg-slate-900 border border-slate-700/80 p-2.5 font-mono text-[11px] text-emerald-400 overflow-x-auto relative group/code">
                        <button
                          onClick={() => handleCopyCode(msg.id, msg.codeSnippet!)}
                          className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 opacity-0 group-hover/code:opacity-100 transition-opacity cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <pre className="custom-scrollbar">{msg.codeSnippet}</pre>
                      </div>
                    )}

                    {/* Quick AI Chips */}
                    {msg.actionPrompt === 'quick-actions' && (
                      <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                        {[
                          { label: '🌅 Sunset Wallpaper', action: 'change wallpaper to sunset' },
                          { label: '📟 Open Terminal', action: 'open terminal' },
                          { label: '🎨 Open Paint', action: 'open paint' },
                          { label: '📹 Open OSX Meet', action: 'open meet' }
                        ].map((act) => (
                          <button
                            key={act.action}
                            onClick={() => setInputText(act.action)}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors border border-white/10"
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reactions Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, count]) => {
                          const hasReacted = msg.userReactions?.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                                hasReacted
                                  ? 'bg-blue-500/40 border border-blue-400 text-blue-100 font-bold'
                                  : 'bg-black/30 border border-white/10 text-slate-300'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-extrabold">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Message Action Toolbar (Reply, Quote, Edit, Delete, Pin, Reactions) */}
                  <div
                    className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isMe ? 'justify-end' : ''
                    }`}
                  >
                    {/* Reaction Emojis */}
                    {['👍', '❤️', '🔥', '😂', '🚀'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="p-1 hover:scale-125 transition-transform text-xs cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="w-px h-3 bg-slate-700 mx-1" />

                    {/* Reply */}
                    <button
                      onClick={() =>
                        setReplyToMsg({ id: msg.id, senderName: msg.senderName, text: msg.text })
                      }
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>

                    {/* Quote */}
                    <button
                      onClick={() => setInputText(`> ${msg.text}\n`)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Quote"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>

                    {/* Pin */}
                    <button
                      onClick={() => handleTogglePinMessage(msg.id)}
                      className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 cursor-pointer"
                      title="Pin Message"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* User Edit / Delete */}
                    {isMe && (
                      <>
                        <button
                          onClick={() => handleStartEdit(msg)}
                          className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 cursor-pointer"
                          title="Edit Message"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                          title="Delete Message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-2 items-center text-slate-400 text-xs font-medium italic">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>{activeChannel.name} is typing...</span>
            </div>
          )}
        </div>

        {/* ================= 3. INPUT BAR ================= */}
        <div className="p-3 bg-[#1e293b]/90 border-t border-slate-700/60 relative">
          {/* Reply Context Bar */}
          {replyToMsg && (
            <div className="mb-2 p-2 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <Reply className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-300 font-semibold truncate">
                  Replying to <strong>{replyToMsg.senderName}</strong>: "{replyToMsg.text}"
                </span>
              </div>
              <button
                onClick={() => setReplyToMsg(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Edit Context Bar */}
          {editingMsgId && (
            <div className="mb-2 p-2 bg-blue-950/60 rounded-xl border border-blue-500/40 flex items-center justify-between text-xs text-blue-200">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>Editing message... Press Enter or click Send to save</span>
              </div>
              <button
                onClick={() => {
                  setEditingMsgId(null);
                  setEditText('');
                }}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Emoji / GIF / Sticker Popover */}
          {popoverTab && (
            <div className="absolute bottom-16 left-4 bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow-2xl z-30 w-72 flex flex-col gap-2.5">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-700 pb-2 gap-1 text-xs font-bold">
                <button
                  onClick={() => setPopoverTab('emoji')}
                  className={`flex-1 py-1 rounded-lg ${popoverTab === 'emoji' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Emoji
                </button>
                <button
                  onClick={() => setPopoverTab('gif')}
                  className={`flex-1 py-1 rounded-lg ${popoverTab === 'gif' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  GIFs
                </button>
                <button
                  onClick={() => setPopoverTab('sticker')}
                  className={`flex-1 py-1 rounded-lg ${popoverTab === 'sticker' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Stickers
                </button>
              </div>

              {popoverTab === 'emoji' && (
                <div className="grid grid-cols-6 gap-2 text-xl max-h-44 overflow-y-auto">
                  {['😀', '😂', '😍', '🔥', '🚀', '❤️', '👍', '🎉', '💻', '🎨', '✨', '⚡', '🥳', '😎', '🙏', '💯', '🌟', '🙌'].map(
                    (e) => (
                      <button
                        key={e}
                        onClick={() => {
                          setInputText((prev) => prev + e);
                          setPopoverTab(null);
                        }}
                        className="p-1.5 hover:bg-slate-700 rounded-xl transition-transform hover:scale-125 cursor-pointer text-center"
                      >
                        {e}
                      </button>
                    )
                  )}
                </div>
              )}

              {popoverTab === 'gif' && (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {[
                    { name: 'Celebration', url: 'https://media.giphy.com/media/26tp154f3bLpWc956/giphy.gif' },
                    { name: 'Coding High', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' },
                    { name: 'Mind Blown', url: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif' },
                    { name: 'Approved', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
                  ].map((gif) => (
                    <div
                      key={gif.name}
                      onClick={() => {
                        setAttachment({
                          url: gif.url,
                          type: 'image',
                          fileName: `${gif.name}.gif`,
                        });
                        setPopoverTab(null);
                      }}
                      className="p-1 bg-slate-900 border border-slate-700 rounded-xl hover:border-blue-500 cursor-pointer overflow-hidden text-center"
                    >
                      <span className="text-[10px] font-bold text-slate-300 block mb-1">{gif.name}</span>
                      <div className="w-full h-16 bg-slate-800 rounded flex items-center justify-center text-xs">
                        🎬 GIF
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {popoverTab === 'sticker' && (
                <div className="grid grid-cols-3 gap-2 text-2xl max-h-44 overflow-y-auto text-center">
                  {['🦄', '🐱‍💻', '🤖', '👾', '🚀', '🦊', '🐼', '🐉', '🐙'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setInputText((prev) => prev + ` ${st} `);
                        setPopoverTab(null);
                      }}
                      className="p-2 bg-slate-900 hover:bg-slate-700 rounded-xl cursor-pointer"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Local File / Attachment Preview Box */}
          {attachment && (
            <div className="mb-2 p-2 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                {attachment.type === 'image' ? (
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                ) : attachment.type === 'video' ? (
                  <Film className="w-5 h-5 text-purple-400" />
                ) : attachment.type === 'drive' ? (
                  <HardDrive className="w-5 h-5 text-emerald-400" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-400" />
                )}
                <span className="text-xs text-slate-200 font-semibold truncate">
                  {attachment.fileName}
                </span>
              </div>
              <button
                onClick={() => setAttachment(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Controls Form */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {/* Local File Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Attach File, Image or Video"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* DriveOSX File Link Picker */}
            <button
              type="button"
              onClick={() => setShowDrivePicker(true)}
              className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Attach DriveOSX Disk Link"
            >
              <HardDrive className="w-4 h-4" />
            </button>

            {/* Emoji / GIF / Sticker Popover Toggle */}
            <button
              type="button"
              onClick={() => setPopoverTab((prev) => (prev ? null : 'emoji'))}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                popoverTab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Emoji, GIFs & Stickers"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Input Text Field */}
            <input
              type="text"
              value={editingMsgId ? editText : inputText}
              onChange={(e) => (editingMsgId ? setEditText(e.target.value) : setInputText(e.target.value))}
              placeholder={editingMsgId ? 'Edit message...' : `Message ${activeChannel.name}...`}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />

            {/* Voice Recorder button */}
            <button
              type="button"
              onClick={() => setIsRecordingVoice((r) => !r)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isRecordingVoice
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isRecordingVoice ? `Recording: ${formatTime(recordDuration)}` : 'Record Voice Note'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={
                editingMsgId
                  ? !editText.trim()
                  : !inputText.trim() && !attachment && !isRecordingVoice
              }
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ================= 4. RIGHT INFO DRAWER ================= */}
      {showInfoDrawer && (
        <div className="w-64 bg-[#1e293b]/95 border-l border-slate-700/60 p-4 flex flex-col shrink-0 animate-in slide-in-from-right-10 duration-200 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <h3 className="text-xs font-bold text-white">Details & Settings</h3>
            <button
              onClick={() => setShowInfoDrawer(false)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-4 text-center border-b border-slate-700/60">
            <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {activeChannel.name.slice(0, 2).toUpperCase()}
            </div>
            <h4 className="text-sm font-extrabold text-white">{activeChannel.name}</h4>
            <p className="text-[11px] text-slate-400 mt-1">{activeChannel.description}</p>
          </div>

          {/* Quick Info Stats */}
          <div className="py-3 space-y-2 text-xs text-slate-300 border-b border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Channel Type</span>
              <span className="font-bold uppercase text-[10px] text-blue-400">{activeChannel.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Messages</span>
              <span className="font-bold text-white">{activeMessages.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pinned Messages</span>
              <span className="font-bold text-amber-400">{pinnedMessages.length}</span>
            </div>
          </div>

          {/* Channel Notification Preferences */}
          <div className="py-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Notifications
            </span>
            <button
              onClick={() => handleToggleMuteChannel(activeChannel.id)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                {activeChannel.isMuted ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4 text-blue-400" />}
                <span>{activeChannel.isMuted ? 'Muted' : 'Enabled'}</span>
              </span>
              <span className="text-[10px] text-slate-400">Toggle</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Drive Picker Modal */}
      <DrivePickerModal
        isOpen={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        onSelectFile={(file) => {
          setAttachment({
            url: `drive-file://${file.id}`,
            type: 'drive',
            fileName: file.name,
            fileSize: file.size,
          });
          showToast(`Attached link for ${file.name}`);
        }}
      />

      {/* Active Call Modal */}
      {activeCall && (
        <CallModal
          callState={activeCall}
          onEndCall={() => setActiveCall(null)}
          onToggleMute={() =>
            setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null))
          }
          onToggleVideo={() =>
            setActiveCall((prev) => (prev ? { ...prev, isVideoOff: !prev.isVideoOff } : null))
          }
          onToggleScreenShare={() =>
            setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: !prev.isScreenSharing } : null))
          }
        />
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreateChannel={(newChan) => {
          setChannels((prev) => [newChan, ...prev]);
          setActiveChannelId(newChan.id);
          showToast(`Created channel ${newChan.name}`);
        }}
      />

      {/* Shared Files Modal */}
      <SharedFilesModal
        isOpen={showSharedFilesModal}
        onClose={() => setShowSharedFilesModal(false)}
        messages={activeMessages}
      />

      {/* Expanded Media Preview Modal */}
      {expandedMedia && (
        <div
          onClick={() => setExpandedMedia(null)}
          className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          <img
            src={expandedMedia.url}
            alt="Expanded Preview"
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
