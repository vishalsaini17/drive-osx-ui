export type UserPresence = 'online' | 'offline' | 'away' | 'busy' | 'dnd';

export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  content?: string;
  url?: string;
}

export interface ExtendedMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isUser: boolean;
  text: string;
  timestamp: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file' | 'audio' | 'drive';
  fileName?: string;
  fileSize?: string;
  driveFileId?: string;
  codeSnippet?: string;
  reactions?: Record<string, number>;
  userReactions?: string[];
  status?: 'sent' | 'delivered' | 'read';
  actionPrompt?: string;
  isPinned?: boolean;
  editedAt?: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  isMeetingLink?: boolean;
  meetingUrl?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'ai' | 'group' | 'dm' | 'broadcast';
  avatar?: string;
  role?: string;
  status?: UserPresence;
  unread: number;
  lastMessage: string;
  lastTime: string;
  isPinned?: boolean;
  isMuted?: boolean;
  membersCount?: number;
  description?: string;
  members?: { name: string; avatar?: string; presence: UserPresence }[];
}

export interface CallState {
  type: 'audio' | 'video';
  contactName: string;
  contactAvatar?: string;
  duration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}
