import { http } from '../api/http';

/**
 * Messaging capability.
 *
 * Messaging is gated: two people cannot exchange messages until a chat request
 * has been accepted, at which point the server creates the conversation and
 * both contact records. There is no local seed data — an empty account shows
 * an empty inbox.
 */

export type PresenceStatus = 'online' | 'away' | 'busy' | 'dnd' | 'offline';

export interface DirectoryUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  status: PresenceStatus;
  statusText: string;
  statusEmoji: string;
  lastSeenAt: string | null;
}

export interface ChatRequest {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string;
  createdAt: string;
  respondedAt: string | null;
  counterpart: DirectoryUser;
}

export interface Conversation {
  id: string;
  kind: 'direct' | 'group';
  title: string;
  topic: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  participants: DirectoryUser[];
}

/** An attachment on a message — currently only voice notes produce these. */
export interface MessageAttachment {
  id: string;
  kind: 'voice' | 'file' | 'image';
  name: string;
  mimeType: string;
  size: number;
  url: string;
  durationSeconds?: number;
}

/** Only present when `isMine` — nobody sees ticks on a message they received. */
export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName: string;
  body: string;
  threadParentId: string | null;
  replyToId: string | null;
  attachments: MessageAttachment[];
  reactions: Record<string, string[]>;
  mentions: string[];
  isEdited: boolean;
  isMine: boolean;
  status?: MessageDeliveryStatus;
  createdAt: string;
}

/** One attachment shared in a conversation — the contact panel's media tab. */
export interface MediaItem {
  id: string;
  messageId: string;
  conversationId: string;
  isMine: boolean;
  createdAt: string;
  name: string;
  url: string | null;
  mimeType: string | null;
  size: number | null;
}

const BASE = '/messaging';

export const MessagingService = {
  /** Finds people to start a chat with. Two characters minimum. */
  async searchUsers(term: string, limit = 20): Promise<DirectoryUser[]> {
    if (term.trim().length < 2) return [];
    const response = await http.get<{ users: DirectoryUser[] }>(
      `${BASE}/users/search?q=${encodeURIComponent(term.trim())}&limit=${limit}`,
    );
    return response.users ?? [];
  },

  async listRequests(): Promise<ChatRequest[]> {
    const response = await http.get<{ requests: ChatRequest[] }>(`${BASE}/requests`);
    return response.requests ?? [];
  },

  async sendRequest(recipientId: string, message: string): Promise<ChatRequest> {
    const response = await http.post<{ request: ChatRequest }>(`${BASE}/requests`, {
      recipientId,
      message,
    });
    return response.request;
  },

  async respondToRequest(
    requestId: string,
    action: 'accept' | 'reject',
  ): Promise<{ status: string; conversationId: string | null }> {
    return http.post<{ status: string; conversationId: string | null }>(
      `${BASE}/requests/${requestId}/respond`,
      { action },
    );
  },

  async cancelRequest(requestId: string): Promise<void> {
    await http.delete(`${BASE}/requests/${requestId}`);
  },

  async listConversations(): Promise<Conversation[]> {
    const response = await http.get<{ conversations: Conversation[] }>(`${BASE}/conversations`);
    return response.conversations ?? [];
  },

  /**
   * Finds an existing direct conversation with a user, reviving it if the
   * caller had deleted their copy. "Start a conversation" calls this first
   * so picking someone you already have history with reopens it instead of
   * hitting `sendRequest`'s "you can already message this person" conflict.
   */
  async findExistingConversation(userId: string): Promise<string | null> {
    const response = await http.get<{ conversationId: string | null }>(
      `${BASE}/conversations/with/${userId}`,
    );
    return response.conversationId;
  },

  async listMessages(conversationId: string, options: { limit?: number; before?: string } = {}): Promise<Message[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.before) params.set('before', options.before);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await http.get<{ messages: Message[] }>(
      `${BASE}/conversations/${conversationId}/messages${suffix}`,
    );
    return response.messages ?? [];
  },

  async sendMessage(
    conversationId: string,
    body: string,
    options: { replyToId?: string; threadParentId?: string; mentions?: string[] } = {},
  ): Promise<Message> {
    const response = await http.post<{ data: Message }>(
      `${BASE}/conversations/${conversationId}/messages`,
      { body, ...options },
    );
    return response.data;
  },

  /** Uploads a recorded voice note as a message with one audio attachment. */
  async sendVoiceMessage(
    conversationId: string,
    audio: Blob,
    options: { durationSeconds?: number; fileName?: string } = {},
  ): Promise<Message> {
    const form = new FormData();
    form.append('audio', audio, options.fileName ?? 'voice-message.webm');
    if (options.durationSeconds) form.append('durationSeconds', String(Math.round(options.durationSeconds)));
    const response = await http.post<{ data: Message }>(
      `${BASE}/conversations/${conversationId}/voice-message`,
      form,
    );
    return response.data;
  },

  async markRead(conversationId: string): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/read`);
  },

  async deleteMessage(messageId: string): Promise<void> {
    await http.delete(`${BASE}/messages/${messageId}`);
  },

  /** Deletes the conversation for the caller only; the other side keeps theirs. */
  async deleteConversation(conversationId: string): Promise<void> {
    await http.delete(`${BASE}/conversations/${conversationId}`);
  },

  /**
   * Clears the caller's message history without removing the conversation
   * from their list — unlike `deleteConversation`, which does both.
   */
  async clearConversation(conversationId: string): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/clear`);
  },

  async listMedia(conversationId: string): Promise<MediaItem[]> {
    const response = await http.get<{ media: MediaItem[] }>(
      `${BASE}/conversations/${conversationId}/media`,
    );
    return response.media ?? [];
  },
};

export default MessagingService;
