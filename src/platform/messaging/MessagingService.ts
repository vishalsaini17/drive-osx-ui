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

/** A conversation participant, plus their role — meaningful for group conversations (the group info panel's Admin badge). */
export interface ConversationParticipant extends DirectoryUser {
  role: 'owner' | 'admin' | 'member';
}

export interface Conversation {
  id: string;
  kind: 'direct' | 'group';
  title: string;
  /** A group's description. Null/empty for direct chats. */
  topic: string | null;
  /** A group's avatar — an emoji shorthand or an `http…` URL, same convention as `DirectoryUser.avatarUrl`. Null for direct chats. */
  avatarUrl: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  /** Per-viewer, independent of any contact record — the only kind of "favourite" a group can have. */
  isFavourite: boolean;
  participants: ConversationParticipant[];
}

/** An attachment on a message — a voice note, or a document/photo/video/audio file sent via the "+" menu. */
export interface MessageAttachment {
  id: string;
  kind: 'voice' | 'file' | 'image' | 'video';
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
  /** Set once this message is pinned in its conversation. */
  pinnedAt: string | null;
  /** True for a message created by `forwardMessage` — render the "Forwarded" label. */
  isForwarded: boolean;
  /** True once the sender has deleted this "for everyone" — `body`/`attachments` are already empty; render a placeholder. */
  isDeleted: boolean;
  createdAt: string;
}

/** One link shared in a conversation, extracted from a text message — the contact panel's Links tab. */
export interface LinkItem {
  id: string;
  messageId: string;
  conversationId: string;
  isMine: boolean;
  createdAt: string;
  url: string;
  domain: string;
  snippet: string;
}

/** One target conversation a forward landed in, and the message it created there. */
export interface ForwardResult {
  conversationId: string;
  message: Message;
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

  /** Membership is restricted to the caller's contacts — see the service's doc comment. */
  async createGroup(title: string, memberUserIds: string[]): Promise<Conversation> {
    const response = await http.post<{ conversation: Conversation }>(`${BASE}/groups`, {
      title,
      memberUserIds,
    });
    return response.conversation;
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

  /** Sends a document, photo, video, or audio file from the "+" menu. */
  async sendFileMessage(conversationId: string, file: File): Promise<Message> {
    const form = new FormData();
    form.append('file', file, file.name);
    const response = await http.post<{ data: Message }>(
      `${BASE}/conversations/${conversationId}/attachment`,
      form,
    );
    return response.data;
  },

  async markRead(conversationId: string): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/read`);
  },

  /**
   * `'me'` hides the message from the caller only, on any message including
   * ones they didn't send. `'everyone'` (sender only) tombstones it for
   * every participant — the response carries the updated message so the
   * caller's own view can be swapped to the "This message was deleted"
   * placeholder immediately.
   */
  async deleteMessage(messageId: string, mode: 'me' | 'everyone' = 'everyone'): Promise<Message | null> {
    const response = await http.delete<{ data: Message | null }>(`${BASE}/messages/${messageId}`, {
      query: { mode },
    });
    return response.data;
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

  /** Links extracted from this conversation's text messages — the panel's Links tab. */
  async listLinks(conversationId: string): Promise<LinkItem[]> {
    const response = await http.get<{ links: LinkItem[] }>(
      `${BASE}/conversations/${conversationId}/links`,
    );
    return response.links ?? [];
  },

  /**
   * Sets the caller's reaction on a message to one emoji — reacting with the
   * same emoji again clears it, reacting with a different one replaces it.
   */
  async toggleReaction(messageId: string, emoji: string): Promise<Message> {
    const response = await http.post<{ data: Message }>(`${BASE}/messages/${messageId}/react`, { emoji });
    return response.data;
  },

  async pinMessage(messageId: string): Promise<Message> {
    const response = await http.post<{ data: Message }>(`${BASE}/messages/${messageId}/pin`);
    return response.data;
  },

  async unpinMessage(messageId: string): Promise<Message> {
    const response = await http.post<{ data: Message }>(`${BASE}/messages/${messageId}/unpin`);
    return response.data;
  },

  /** Pinned messages in this conversation, most recently pinned first. */
  async listPinnedMessages(conversationId: string): Promise<Message[]> {
    const response = await http.get<{ messages: Message[] }>(`${BASE}/conversations/${conversationId}/pinned`);
    return response.messages ?? [];
  },

  /** Forwards a message's text and/or attachments into other conversations as new messages. */
  async forwardMessage(messageId: string, conversationIds: string[]): Promise<ForwardResult[]> {
    const response = await http.post<{ results: ForwardResult[] }>(`${BASE}/messages/${messageId}/forward`, {
      conversationIds,
    });
    return response.results ?? [];
  },

  /** Favouriting is per-conversation, so it works for groups too — see `Conversation.isFavourite`. */
  async setConversationFavourite(conversationId: string, isFavourite: boolean): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/${isFavourite ? 'favourite' : 'unfavourite'}`);
  },

  /** Admin-only — see the service's doc comment. */
  async setGroupDescription(conversationId: string, description: string): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/description`, { description });
  },

  /** Admin-only. */
  async renameGroup(conversationId: string, title: string): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/rename`, { title });
  },

  /** Admin-only. An emoji shorthand or an `http…` URL, same convention as a user's own avatar. */
  async setGroupAvatar(conversationId: string, avatarUrl: string): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/avatar`, { avatarUrl });
  },

  /** Admin-only, and restricted to the caller's own contacts — see the service's doc comment. */
  async addGroupMember(conversationId: string, userId: string): Promise<Conversation> {
    const response = await http.post<{ conversation: Conversation }>(
      `${BASE}/conversations/${conversationId}/members`,
      { userId },
    );
    return response.conversation;
  },

  /** Removes the caller from the group outright — unlike `deleteConversation`, there is no reviving it. */
  async leaveGroup(conversationId: string): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/leave`);
  },

  async reportGroup(conversationId: string, reason: string): Promise<void> {
    await http.post(`${BASE}/conversations/${conversationId}/report`, { reason });
  },
};

export default MessagingService;
