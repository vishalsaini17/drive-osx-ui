import type { Contact as ApiContact, ContactInput, PresenceStatus } from '../../platform/contacts/ContactsService';
import type { Contact } from '../../platform/types';

/**
 * Translation between the stored contact and the shape this app's components
 * were built against.
 *
 * The API stores a single `displayName`, because that is what a contact
 * actually has — many names do not split into exactly two parts. The UI has
 * always worked in first/last, and rewriting every component to drop that
 * would be a much larger change than reconciling the two here.
 */

/** Adds the fields the API knows about that the local `Contact` type lacks. */
export interface ContactView extends Contact {
  /** Set when this contact is a platform user; null for external people. */
  userId: string | null;
  username: string | null;
  /** Null for external contacts, who have no account and so no presence. */
  presence: PresenceStatus | null;
  statusText: string;
  lastSeenAt: string | null;
  /** How the contact came to exist, so the UI can explain it. */
  source: 'manual' | 'chat_request' | 'import';
}

/**
 * Splits a display name for presentation only.
 *
 * The first token is the given name and the remainder is everything else, so
 * "Ana Maria de Souza" keeps "de Souza" together instead of losing it. A
 * single-token name leaves the last name empty rather than duplicating it.
 */
export function splitName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Rejoins a split name, tolerating either half being blank. */
export function joinName(firstName?: string, lastName?: string): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
}

/**
 * A stable colour for a contact with no photo.
 *
 * Derived from the id so the same person keeps the same colour across reloads
 * and devices — picking at random would make the list flicker on every render.
 */
const AVATAR_BACKGROUNDS = [
  'bg-gradient-to-br from-indigo-500 to-purple-600',
  'bg-gradient-to-br from-sky-500 to-blue-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-violet-500 to-fuchsia-600',
];

export function avatarBackgroundFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return AVATAR_BACKGROUNDS[hash % AVATAR_BACKGROUNDS.length];
}

export function toView(contact: ApiContact): ContactView {
  const { firstName, lastName } = splitName(contact.displayName);

  return {
    id: contact.id,
    firstName,
    lastName,
    // Only a real avatar URL — never a stock photo standing in for a person.
    ...(contact.avatarUrl ? { photo: contact.avatarUrl } : {}),
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company ?? '',
    jobTitle: contact.jobTitle ?? '',
    department: contact.department ?? '',
    team: contact.team ?? '',
    address: contact.address ?? '',
    website: contact.website ?? '',
    birthday: contact.birthday ?? '',
    notes: contact.notes ?? '',
    isFavorite: contact.isFavourite,
    labels: contact.labels ?? [],
    avatarBg: avatarBackgroundFor(contact.id),

    userId: contact.userId,
    username: contact.username,
    presence: contact.presence,
    statusText: contact.statusText,
    lastSeenAt: contact.lastSeenAt,
    source: contact.source,
  };
}

/** Maps an edited form back to the fields the API accepts. */
export function toInput(form: Partial<Contact>): ContactInput {
  return {
    displayName: joinName(form.firstName, form.lastName),
    email: form.email?.trim() || null,
    phone: form.phone?.trim() || null,
    company: form.company?.trim() || null,
    jobTitle: form.jobTitle?.trim() || null,
    department: form.department?.trim() || null,
    team: form.team?.trim() || null,
    address: form.address?.trim() || null,
    website: form.website?.trim() || null,
    // '' clears the date; the API turns it into NULL rather than failing.
    birthday: form.birthday?.trim() || '',
    notes: form.notes?.trim() || null,
    labels: form.labels ?? [],
    ...(form.isFavorite === undefined ? {} : { isFavourite: form.isFavorite }),
  };
}

/** Human wording for a contact's connection state. */
export function presenceLabel(contact: ContactView): string {
  if (!contact.userId) return 'Not on Drive OSX';
  if (contact.statusText) return contact.statusText;

  switch (contact.presence) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    case 'busy':
      return 'Busy';
    case 'dnd':
      return 'Do not disturb';
    default:
      return lastSeenLabel(contact.lastSeenAt);
  }
}

/** "Offline", or when the person was last seen if that is known. */
export function lastSeenLabel(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Offline';

  const seen = new Date(lastSeenAt);
  if (Number.isNaN(seen.getTime())) return 'Offline';

  const minutes = Math.floor((Date.now() - seen.getTime()) / 60_000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Last seen yesterday';
  if (days < 7) return `Last seen ${days} days ago`;

  return `Last seen ${seen.toLocaleDateString()}`;
}

/** Tailwind colour for the presence dot. */
export function presenceDotClass(presence: PresenceStatus | null): string {
  switch (presence) {
    case 'online':
      return 'bg-emerald-500';
    case 'away':
      return 'bg-amber-500';
    case 'busy':
    case 'dnd':
      return 'bg-rose-500';
    default:
      return 'bg-slate-400';
  }
}
