import { http } from '../api/http';

/**
 * Contacts and presence capability.
 *
 * A contact is personal to its owner, not a shared organization directory.
 * Most entries appear automatically when a chat request is accepted; the rest
 * are external people the user typed in. There is no seed data — a new account
 * has an empty address book, and the UI says so rather than inventing one.
 */

export type PresenceStatus = 'online' | 'away' | 'busy' | 'dnd' | 'offline';

export interface Contact {
  id: string;
  /** Null for external contacts, who have no platform account. */
  userId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  notes: string | null;
  address: string | null;
  website: string | null;
  /** `YYYY-MM-DD`; a birthday has no time of day and must not shift zone. */
  birthday: string | null;
  department: string | null;
  team: string | null;
  labels: string[];
  isFavourite: boolean;
  isBlocked: boolean;
  source: 'manual' | 'chat_request' | 'import';
  /** Null when the contact is not a platform user, so has no presence. */
  presence: PresenceStatus | null;
  statusText: string;
  statusEmoji: string;
  lastSeenAt: string | null;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ContactInput {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  notes?: string | null;
  address?: string | null;
  website?: string | null;
  /** `YYYY-MM-DD`, or `''` to clear it. */
  birthday?: string | null;
  department?: string | null;
  team?: string | null;
  labels?: string[];
  isFavourite?: boolean;
  /** Set to save an existing platform user, e.g. from Messenger. */
  contactUserId?: string | null;
}

export interface Presence {
  userId: string;
  status: PresenceStatus;
  statusText: string;
  statusEmoji: string;
  lastSeenAt: string | null;
}

const BASE = '/contacts';

/**
 * How often the client should say it is still here. Comfortably inside the
 * server's 120s presence TTL, so a single missed beat does not flip the user
 * to offline for everyone watching.
 */
export const PRESENCE_HEARTBEAT_MS = 45_000;

export const ContactsService = {
  async list(options: { search?: string; favouritesOnly?: boolean } = {}): Promise<Contact[]> {
    const params = new URLSearchParams();
    if (options.search?.trim()) params.set('search', options.search.trim());
    if (options.favouritesOnly) params.set('favourites', 'true');
    const suffix = params.toString() ? `?${params.toString()}` : '';

    const response = await http.get<{ contacts: Contact[] }>(`${BASE}${suffix}`);
    return response.contacts ?? [];
  },

  async get(contactId: string): Promise<Contact> {
    const response = await http.get<{ contact: Contact }>(`${BASE}/${contactId}`);
    return response.contact;
  },

  async create(input: ContactInput): Promise<Contact> {
    const response = await http.post<{ contact: Contact }>(BASE, input);
    return response.contact;
  },

  /** Saves a platform user to the address book. Idempotent. */
  async saveUser(userId: string, displayName?: string): Promise<Contact> {
    return this.create({ contactUserId: userId, ...(displayName ? { displayName } : {}) });
  },

  async update(contactId: string, patch: ContactInput): Promise<Contact> {
    const response = await http.patch<{ contact: Contact }>(`${BASE}/${contactId}`, patch);
    return response.contact;
  },

  async remove(contactId: string): Promise<void> {
    await http.delete(`${BASE}/${contactId}`);
  },

  async block(contactId: string): Promise<Contact> {
    const response = await http.post<{ contact: Contact }>(`${BASE}/${contactId}/block`);
    return response.contact;
  },

  async unblock(contactId: string): Promise<Contact> {
    const response = await http.post<{ contact: Contact }>(`${BASE}/${contactId}/unblock`);
    return response.contact;
  },

  // --- presence ------------------------------------------------------------

  async heartbeat(
    input: { status?: PresenceStatus; statusText?: string; statusEmoji?: string } = {},
  ): Promise<Presence> {
    const response = await http.post<{ presence: Presence }>(`${BASE}/presence/heartbeat`, input);
    return response.presence;
  },

  async goOffline(): Promise<void> {
    await http.post(`${BASE}/presence/offline`);
  },

  async lookup(userIds: string[]): Promise<Presence[]> {
    if (userIds.length === 0) return [];
    const response = await http.post<{ presence: Presence[] }>(`${BASE}/presence/lookup`, { userIds });
    return response.presence ?? [];
  },
};

export default ContactsService;
