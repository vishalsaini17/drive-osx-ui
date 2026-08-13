export type UserPresence = 'online' | 'offline' | 'away' | 'busy' | 'dnd';

export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  content?: string;
  url?: string;
}

/** A person in the workspace directory. */
export interface Member {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  presence: UserPresence;
  /** Free-text status, as in Slack's "In a meeting until 3". */
  statusText?: string;
  statusEmoji?: string;
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
  /**
   * Threads. A message with `threadParentId` set is a reply that lives in the
   * parent's thread rather than in the main channel feed.
   */
  threadParentId?: string;
  /** Names of members mentioned, so a mention can be styled and counted. */
  mentions?: string[];
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'ai' | 'group' | 'dm' | 'broadcast';
  avatar?: string;
  role?: string;
  status?: UserPresence;
  unread: number;
  /** Unread messages that mention you, badged separately as in Slack. */
  mentionCount?: number;
  lastMessage: string;
  lastTime: string;
  isPinned?: boolean;
  isMuted?: boolean;
  membersCount?: number;
  description?: string;
  topic?: string;
  members?: Member[];
}

/** One participant in a call or group meeting. */
export interface CallParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking?: boolean;
  isHandRaised?: boolean;
  isPresenting?: boolean;
  isHost?: boolean;
}

export interface CallState {
  type: 'audio' | 'video';
  contactName: string;
  contactAvatar?: string;
  duration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  /** Everyone on the call, including you. Group meetings carry several. */
  participants: CallParticipant[];
  isHandRaised?: boolean;
  channelId?: string;
}
