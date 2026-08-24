import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Send, Search, X, Plus, MessageSquare, UserPlus, Check, CheckCheck, Ban, Clock,
  AtSign, Loader2, WifiOff, RefreshCw, Inbox, UserCheck, Trash2, BookUser,
  Phone, Video, ChevronUp, ChevronDown, Mic, Smile,
} from 'lucide-react';
import { useSystemStore } from '../../shell/state/systemStore';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';
import WindowStatus from '../../shell/window-manager/WindowStatusContext';
import { ApiError } from '../../platform/api/http';
import {
  MessagingService, type ChatRequest, type Conversation, type DirectoryUser, type MediaItem,
  type Message, type MessageDeliveryStatus, type PresenceStatus,
} from '../../platform/messaging/MessagingService';
import { ContactsService, type Contact } from '../../platform/contacts/ContactsService';
import { MeetingService } from '../../platform/meetings/MeetingService';
import { EventBus } from '../../platform/events/EventBus';
import {
  CHAT_MESSAGE_EVENT, setActiveConversation, type ChatMessageEvent,
} from '../../shell/notifications/useRealtimeNotifications';
import { useMessengerTheme } from './useMessengerTheme';
import { APP_THEME_CHOICES } from '../../platform/theme/appTheme';
import ContactDetailsPanel from './ContactDetailsPanel';
import EmojiStickerPicker from './EmojiStickerPicker';

const PRESENCE_DOT: Record<PresenceStatus, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  busy: 'bg-rose-500',
  dnd: 'bg-purple-500',
  offline: 'bg-slate-400',
};

const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  dnd: 'Do not disturb',
  offline: 'Offline',
};

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '??';
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Turns an API failure into something a person can act on (CLAUDE.md §36). */
function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'offline') return 'You are offline. Messenger needs a connection.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

/**
 * `getUserMedia` rejects with a `DOMException` whose `name` says what
 * actually went wrong — permission denied, no device, or the device already
 * in use elsewhere are three different problems with three different fixes,
 * and collapsing them into one "denied" message left people trying to grant
 * a permission that was never the issue.
 */
function describeMicrophoneError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Microphone access was denied. Allow it in the browser’s site settings, then try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone was found on this device.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The microphone is already in use by another application.';
    default:
      return 'Could not access the microphone. Please try again.';
  }
}

/** Wraps every case-insensitive occurrence of `query` in `text` with a highlight. */
function highlightMatches(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const lower = text.toLowerCase();
  const target = trimmed.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let index = lower.indexOf(target, cursor);
  if (index === -1) return text;

  let key = 0;
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark key={key++} className="bg-amber-300 text-slate-900 rounded-sm px-0.5">
        {text.slice(index, index + trimmed.length)}
      </mark>,
    );
    cursor = index + trimmed.length;
    index = lower.indexOf(target, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Single tick (sent), double tick (delivered), blue double tick (read) — shown only on your own messages. */
function MessageTicks({ status, textSubtle }: { status?: MessageDeliveryStatus; textSubtle: string }) {
  if (!status) return null;
  if (status === 'sent') return <Check size={12} className={textSubtle} />;
  return (
    <CheckCheck size={12} className={status === 'read' ? 'text-sky-400' : textSubtle} />
  );
}

/** One emoji token: a pictographic base, an optional skin tone or presentation mark, and ZWJ-joined sequences (👨‍👩‍👧). */
const EMOJI_TOKEN_SOURCE =
  '(?:\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?)*|\\p{Emoji_Presentation})';
const EMOJI_ONLY_REGEX = new RegExp(`^${EMOJI_TOKEN_SOURCE}{1,6}$`, 'u');

/**
 * A message that is *only* a small handful of emoji (a sticker tap, or
 * someone typing "🎉🎉🎉") reads better big and bare, WhatsApp-style, than
 * squeezed into the same bubble as a sentence. Text mixed with emoji, or
 * more than a few, still gets the normal bubble.
 */
function isEmojiOnlyMessage(text: string): boolean {
  const compact = text.trim().replace(/\s+/g, '');
  return compact.length > 0 && EMOJI_ONLY_REGEX.test(compact);
}

export default function Messenger({ windowId = 'messenger' }: { windowId?: string }) {
  const currentUser = useSystemStore((state) => state.currentUser);
  const pendingConversationId = useSystemStore((state) => state.pendingConversationId);
  const consumePendingConversation = useSystemStore((state) => state.consumePendingConversation);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const { palette, choice: themeChoice } = useMessengerTheme();

  // ---------------------------------------------------------------------
  // Server state. Nothing is seeded: an empty account shows an empty inbox.
  // ---------------------------------------------------------------------
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  // ---------------------------------------------------------------------
  // UI state
  // ---------------------------------------------------------------------
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const draftInputRef = useRef<HTMLInputElement>(null);

  const [directoryTerm, setDirectoryTerm] = useState('');
  const [directoryResults, setDirectoryResults] = useState<DirectoryUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requestTarget, setRequestTarget] = useState<DirectoryUser | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [resolvingUserId, setResolvingUserId] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Contact details panel (WhatsApp Web's "click the name" view)
  // -----------------------------------------------------------------------
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [peerContacts, setPeerContacts] = useState<Record<string, Contact>>({});
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [isTogglingFavourite, setIsTogglingFavourite] = useState(false);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [callInProgress, setCallInProgress] = useState<'voice' | 'video' | null>(null);
  const [mediaByConversation, setMediaByConversation] = useState<Record<string, MediaItem[]>>({});
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // In-conversation message search
  // -----------------------------------------------------------------------
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchIndex, setMessageSearchIndex] = useState(0);
  const messageNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // -----------------------------------------------------------------------
  // Voice messages
  // -----------------------------------------------------------------------
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isCompact = containerWidth < 720;
  const [showSidebar, setShowSidebar] = useState(true);
  useEffect(() => setShowSidebar(!isCompact), [isCompact]);

  // A microphone stream left open after the window closes keeps the
  // browser's recording indicator lit for no reason.
  useEffect(() => {
    return () => {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ---------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------
  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const [conversationList, requestList] = await Promise.all([
        MessagingService.listConversations(),
        MessagingService.listRequests(),
      ]);
      setConversations(conversationList);
      setRequests(requestList);
    } catch (error) {
      setLoadError(describeError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Polling stands in until messaging moves onto the realtime gateway
  // (CLAUDE.md §22).
  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  /**
   * Loads a conversation's messages.
   *
   * `silent` refetches in the background — no spinner, and the scroll position
   * is left alone — which is what a poll or a realtime nudge needs. A visible
   * loading state on every background refresh would make the thread flicker
   * every few seconds.
   */
  const loadMessages = useCallback(async (conversationId: string, options: { silent?: boolean } = {}) => {
    if (!options.silent) setIsLoadingMessages(true);
    try {
      const list = await MessagingService.listMessages(conversationId);
      setMessages((prev) => ({ ...prev, [conversationId]: list }));
      await MessagingService.markRead(conversationId);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
    } catch (error) {
      // A failed background refresh is not worth interrupting for; the next
      // one retries. A failed deliberate open is.
      if (!options.silent) setActionError(describeError(error));
    } finally {
      if (!options.silent) setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  /**
   * Tells the shell which thread is on screen, so a message the user is
   * watching arrive is not also announced as a notification. Cleared on
   * unmount — a closed Messenger is not reading anything.
   */
  useEffect(() => {
    setActiveConversation(activeConversationId);
    return () => setActiveConversation(null);
  }, [activeConversationId]);

  /**
   * Keeps the open thread current.
   *
   * This is the defect that made messaging look broken: `loadMessages` ran only
   * when the *selected* conversation changed, and the poll refreshed only the
   * conversation list. A recipient sitting in the thread therefore never saw an
   * incoming message — they had to click away and back, or reopen the app.
   *
   * The realtime socket handles the common case; this poll is the safety net
   * for when it is down, so a message can still not be missed.
   */
  useEffect(() => {
    if (!activeConversationId) return;

    const timer = setInterval(() => {
      // A background tab is not worth polling for; the socket, or the refresh
      // on becoming visible again, covers it.
      if (document.visibilityState !== 'visible') return;
      void loadMessages(activeConversationId, { silent: true });
    }, 10_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadMessages(activeConversationId, { silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [activeConversationId, loadMessages]);

  /**
   * Realtime arrivals, pushed by the shell's socket.
   *
   * Refetching the thread rather than trusting the event payload keeps one
   * source of truth for message content and avoids inventing a half-populated
   * message object from a notification. The conversation list is refreshed too,
   * so previews and unread badges move with it.
   */
  useEffect(() => {
    const unsubscribe = EventBus.on<ChatMessageEvent>(CHAT_MESSAGE_EVENT, (event) => {
      if (!event?.conversationId) return;

      if (event.conversationId === activeConversationId) {
        // Open on screen: pull the new message in and mark it read, because
        // the user is looking at it.
        void loadMessages(event.conversationId, { silent: true });
      } else {
        // Somewhere else in the list: bump the preview and the unread badge
        // without fetching a thread the user is not reading.
        setConversations((prev) =>
          prev.map((c) =>
            c.id === event.conversationId
              ? {
                  ...c,
                  lastMessagePreview: event.preview,
                  lastMessageAt: new Date().toISOString(),
                  unreadCount: c.unreadCount + 1,
                }
              : c,
          ),
        );
      }
    });

    return unsubscribe;
  }, [activeConversationId, loadMessages]);

  /**
   * A conversation asked for from outside — a clicked system notification,
   * while Messenger was closed. Claimed on mount, and cleared so it is acted
   * on exactly once.
   */
  useEffect(() => {
    const pending = consumePendingConversation();
    if (pending) setActiveConversationId(pending);
  }, [consumePendingConversation, pendingConversationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeConversationId]);

  // Directory search, debounced so typing does not hammer the API.
  useEffect(() => {
    if (directoryTerm.trim().length < 2) {
      setDirectoryResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await MessagingService.searchUsers(directoryTerm);
        if (!cancelled) setDirectoryResults(results);
      } catch (error) {
        if (!cancelled) setActionError(describeError(error));
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [directoryTerm]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------

  /**
   * Picking someone from the directory search. If a conversation already
   * exists — including one the caller previously deleted, just hidden — this
   * reopens it directly instead of walking into `sendRequest`'s "you can
   * already message this person" conflict, which a deleted chat gives no way
   * back out of otherwise.
   */
  const selectDirectoryUser = async (user: DirectoryUser) => {
    setResolvingUserId(user.id);
    setActionError(null);
    try {
      const existingId = await MessagingService.findExistingConversation(user.id);
      if (existingId) {
        setShowNewChat(false);
        setDirectoryTerm('');
        setDirectoryResults([]);
        await refresh();
        setActiveConversationId(existingId);
        setNotice(`Reopened your conversation with ${user.fullName}`);
        return;
      }
      setRequestTarget(user);
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setResolvingUserId(null);
    }
  };

  const sendRequest = async () => {
    if (!requestTarget || !requestNote.trim()) return;
    setIsSubmittingRequest(true);
    setActionError(null);
    try {
      await MessagingService.sendRequest(requestTarget.id, requestNote.trim());
      setNotice(`Chat request sent to ${requestTarget.fullName}`);
      setRequestTarget(null);
      setRequestNote('');
      setDirectoryTerm('');
      setShowNewChat(false);
      await refresh();
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const respondToRequest = async (request: ChatRequest, action: 'accept' | 'reject') => {
    setActionError(null);
    try {
      const result = await MessagingService.respondToRequest(request.id, action);
      await refresh();
      if (action === 'accept') {
        // The server adds both contacts as part of accepting.
        setNotice(`${request.counterpart.fullName} added to your contacts`);
        if (result.conversationId) setActiveConversationId(result.conversationId);
        setShowRequests(false);
      } else {
        setNotice('Request declined');
      }
    } catch (error) {
      setActionError(describeError(error));
    }
  };

  /**
   * Saves the person you are talking to into the address book.
   *
   * Accepting a request already creates the contact, so in the normal flow
   * this is a no-op the server absorbs — but the button must still do the
   * thing it says. It previously only claimed the contact was saved without
   * writing anything.
   */
  const savePeerToContacts = async (person: { id: string; fullName: string }) => {
    setActionError(null);
    setSavingContact(true);
    try {
      await ContactsService.saveUser(person.id, person.fullName);
      setNotice(`${person.fullName} is saved in your contacts`);
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setSavingContact(false);
    }
  };

  const cancelRequest = async (request: ChatRequest) => {
    try {
      await MessagingService.cancelRequest(request.id);
      setNotice('Request withdrawn');
      await refresh();
    } catch (error) {
      setActionError(describeError(error));
    }
  };

  /** Shared by the composer's Send and by sticker taps, which send immediately rather than filling the box. */
  const deliverMessage = async (body: string) => {
    if (!body || !activeConversationId || isSending) return;
    setIsSending(true);
    setActionError(null);
    try {
      const message = await MessagingService.sendMessage(activeConversationId, body);
      setMessages((prev) => ({
        ...prev,
        [activeConversationId]: [...(prev[activeConversationId] ?? []), message],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessagePreview: body.slice(0, 160), lastMessageAt: message.createdAt }
            : c,
        ),
      );
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body) return;
    await deliverMessage(body);
    setDraft('');
  };

  const sendSticker = async (sticker: string) => {
    setShowEmojiPicker(false);
    await deliverMessage(sticker);
  };

  const insertEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    draftInputRef.current?.focus();
  };

  const incomingRequests = requests.filter((request) => request.direction === 'incoming');
  const outgoingRequests = requests.filter((request) => request.direction === 'outgoing');

  const visibleConversations = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) => conversation.title.toLowerCase().includes(term));
  }, [conversations, filter]);

  const peer = useMemo(() => {
    // Without a known viewer, "not the viewer" matches everyone, and `.find`
    // would silently return whichever participant happens to be first —
    // which is the viewer's own record exactly when they are that
    // participant. Requiring `currentUser` first turns that into "no peer
    // yet" instead of "peer is myself".
    if (!currentUser?.username) return null;
    return (
      activeConversation?.participants.find(
        (participant) => participant.username !== currentUser.username,
      ) ?? null
    );
  }, [activeConversation, currentUser?.username]);

  const activeMessages = activeConversationId ? messages[activeConversationId] ?? [] : [];
  const activePeerContact = peer ? peerContacts[peer.id] ?? null : null;
  const isPeerBlocked = activePeerContact?.isBlocked ?? false;

  // Searches the currently loaded thread — the same messages already on
  // screen, not a separate server-side index.
  const messageSearchMatches = useMemo(() => {
    const term = messageSearchQuery.trim().toLowerCase();
    if (!term) return [];
    return activeMessages.filter((message) => message.body.toLowerCase().includes(term));
  }, [activeMessages, messageSearchQuery]);

  useEffect(() => {
    setMessageSearchIndex(0);
  }, [messageSearchQuery]);

  useEffect(() => {
    if (messageSearchMatches.length === 0) return;
    const target = messageSearchMatches[messageSearchIndex] ?? messageSearchMatches[0];
    const node = target ? messageNodeRefs.current[target.id] : null;
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [messageSearchIndex, messageSearchMatches]);

  const goToPreviousMatch = () => {
    setMessageSearchIndex((index) =>
      messageSearchMatches.length === 0 ? 0 : (index - 1 + messageSearchMatches.length) % messageSearchMatches.length,
    );
  };

  const goToNextMatch = () => {
    setMessageSearchIndex((index) =>
      messageSearchMatches.length === 0 ? 0 : (index + 1) % messageSearchMatches.length,
    );
  };

  const activeSearchMatchId = messageSearchMatches[messageSearchIndex]?.id ?? null;

  // Closing the panel on conversation switch avoids showing stale contact
  // details for a moment while the new peer's contact loads. Search state
  // resets for the same reason — a highlighted match belongs to one thread.
  // A recording in progress is discarded rather than carried over: sending
  // it after switching would attach the clip to the wrong conversation.
  useEffect(() => {
    setShowContactPanel(false);
    setShowMessageSearch(false);
    setMessageSearchQuery('');
    setMessageSearchIndex(0);
    setShowEmojiPicker(false);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recordedChunksRef.current = [];
    mediaRecorderRef.current = null;
    setRecordingState('idle');
    setRecordingSeconds(0);
  }, [activeConversationId]);

  /**
   * Loads (or, on first contact, creates) the address-book entry for whoever
   * the open conversation is with — needed for the block/favourite state the
   * composer and the panel both read. Accepting a chat request already
   * creates this row on both sides (see messaging.service), so in the normal
   * case this is a lookup, not a write.
   */
  useEffect(() => {
    // The `peer` memo already excludes the viewer; this is a second,
    // independent check so a future regression there fails safe instead of
    // spamming the server with "add yourself as a contact" requests.
    if (!peer || peer.username === currentUser?.username) return;
    let cancelled = false;
    setIsLoadingContact(true);
    ContactsService.saveUser(peer.id, peer.fullName)
      .then((saved) => {
        if (!cancelled) setPeerContacts((prev) => ({ ...prev, [peer.id]: saved }));
      })
      .catch((error) => {
        if (!cancelled) setPanelError(describeError(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingContact(false);
      });
    return () => {
      cancelled = true;
    };
  }, [peer, currentUser?.username]);

  // Media is fetched lazily — only while the panel is actually open — rather
  // than on every conversation switch, since it is not needed until then.
  useEffect(() => {
    if (!showContactPanel || !activeConversationId) return;
    let cancelled = false;
    setIsLoadingMedia(true);
    setMediaError(null);
    MessagingService.listMedia(activeConversationId)
      .then((items) => {
        if (!cancelled) setMediaByConversation((prev) => ({ ...prev, [activeConversationId]: items }));
      })
      .catch((error) => {
        if (!cancelled) setMediaError(describeError(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMedia(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showContactPanel, activeConversationId]);

  const toggleFavourite = async () => {
    if (!peer || !activePeerContact) return;
    setIsTogglingFavourite(true);
    setPanelError(null);
    try {
      const updated = await ContactsService.update(activePeerContact.id, {
        isFavourite: !activePeerContact.isFavourite,
      });
      setPeerContacts((prev) => ({ ...prev, [peer.id]: updated }));
    } catch (error) {
      setPanelError(describeError(error));
    } finally {
      setIsTogglingFavourite(false);
    }
  };

  const toggleBlock = async () => {
    if (!peer || !activePeerContact) return;
    setIsTogglingBlock(true);
    setPanelError(null);
    try {
      const updated = activePeerContact.isBlocked
        ? await ContactsService.unblock(activePeerContact.id)
        : await ContactsService.block(activePeerContact.id);
      setPeerContacts((prev) => ({ ...prev, [peer.id]: updated }));
    } catch (error) {
      setPanelError(describeError(error));
    } finally {
      setIsTogglingBlock(false);
    }
  };

  /** "Clear chat": history only. The conversation stays put in the sidebar. */
  const clearChat = async () => {
    if (!activeConversationId) return;
    setIsClearingChat(true);
    setPanelError(null);
    try {
      await MessagingService.clearConversation(activeConversationId);
      setMessages((prev) => ({ ...prev, [activeConversationId]: [] }));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? { ...c, lastMessagePreview: '' } : c)),
      );
      setNotice('Chat cleared');
    } catch (error) {
      setPanelError(describeError(error));
    } finally {
      setIsClearingChat(false);
    }
  };

  const deleteChat = async () => {
    if (!activeConversationId) return;
    setIsDeletingChat(true);
    setPanelError(null);
    try {
      await MessagingService.deleteConversation(activeConversationId);
      setConversations((prev) => prev.filter((c) => c.id !== activeConversationId));
      setShowContactPanel(false);
      setActiveConversationId(null);
      setNotice('Chat deleted');
    } catch (error) {
      setPanelError(describeError(error));
    } finally {
      setIsDeletingChat(false);
    }
  };

  /**
   * Starts a call by reusing the existing Meetings capability rather than
   * building a second signalling path: an instant meeting is created and
   * started, its code is dropped into the chat as a normal message so the
   * other person has something to join from (and sees it even if Messenger
   * is closed on their side), and Meet opens for the caller.
   */
  const startCall = async (kind: 'voice' | 'video') => {
    if (!activeConversationId || !peer || isPeerBlocked) return;
    setCallInProgress(kind);
    setPanelError(null);
    try {
      const meeting = await MeetingService.createMeeting({
        title: `${kind === 'video' ? 'Video' : 'Voice'} call with ${peer.fullName}`,
        allowChat: true,
      });
      await MeetingService.startMeeting(meeting.id);
      const body = `📞 Started a ${kind === 'video' ? 'video' : 'voice'} call — join in Meet with code ${meeting.meetingCode}`;
      const message = await MessagingService.sendMessage(activeConversationId, body);
      setMessages((prev) => ({
        ...prev,
        [activeConversationId]: [...(prev[activeConversationId] ?? []), message],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessagePreview: body.slice(0, 160), lastMessageAt: message.createdAt }
            : c,
        ),
      );
      let copied = false;
      try {
        await navigator.clipboard.writeText(meeting.meetingCode);
        copied = true;
      } catch {
        // Clipboard access can be denied; the code is still visible in the chat message above.
      }
      setNotice(
        copied
          ? `Call started — meeting code ${meeting.meetingCode} copied to clipboard`
          : `Call started — meeting code ${meeting.meetingCode}`,
      );
      openAppWindow('meeting');
    } catch (error) {
      setPanelError(describeError(error));
    } finally {
      setCallInProgress(null);
    }
  };

  const deleteMediaItem = async (item: MediaItem) => {
    setDeletingMediaId(item.id);
    setPanelError(null);
    try {
      await MessagingService.deleteMessage(item.messageId);
      if (activeConversationId) {
        setMediaByConversation((prev) => ({
          ...prev,
          [activeConversationId]: (prev[activeConversationId] ?? []).filter(
            (existing) => existing.messageId !== item.messageId,
          ),
        }));
      }
    } catch (error) {
      setPanelError(describeError(error));
    } finally {
      setDeletingMediaId(null);
    }
  };

  // -----------------------------------------------------------------------
  // Voice messages
  // -----------------------------------------------------------------------

  function stopMicStream() {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  const startRecording = async () => {
    if (!activeConversationId || isPeerBlocked || recordingState !== 'idle') return;
    setActionError(null);

    // getUserMedia only exists in a secure context — https:, or http: on
    // localhost/127.0.0.1. Anywhere else the API itself is undefined, which
    // used to fall into the same catch block as an actual permission denial
    // and claim the mic was "denied" when the real problem is that the page
    // needs to be loaded over HTTPS (or from localhost) for recording to be
    // possible at all.
    if (!navigator.mediaDevices?.getUserMedia) {
      setActionError(
        window.isSecureContext
          ? 'This browser does not support voice recording.'
          : 'Voice messages need a secure connection (HTTPS, or localhost). Open Messenger over HTTPS to record.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (candidate) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(candidate),
      );
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();

      recordingStartRef.current = Date.now();
      setRecordingSeconds(0);
      setRecordingState('recording');
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.round((Date.now() - recordingStartRef.current) / 1000));
      }, 250);
    } catch (error) {
      setActionError(describeMicrophoneError(error));
      stopMicStream();
    }
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    stopMicStream();
    recordedChunksRef.current = [];
    mediaRecorderRef.current = null;
    setRecordingState('idle');
    setRecordingSeconds(0);
  };

  const sendRecording = () => {
    const recorder = mediaRecorderRef.current;
    const conversationId = activeConversationId;
    if (!recorder || recorder.state === 'inactive' || !conversationId) return;

    recorder.onstop = async () => {
      const duration = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000));
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      recordedChunksRef.current = [];
      mediaRecorderRef.current = null;
      stopMicStream();
      setRecordingState('uploading');

      try {
        const message = await MessagingService.sendVoiceMessage(conversationId, blob, { durationSeconds: duration });
        setMessages((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []), message],
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, lastMessagePreview: '🎤 Voice message', lastMessageAt: message.createdAt }
              : c,
          ),
        );
      } catch (error) {
        setActionError(describeError(error));
      } finally {
        setRecordingState('idle');
        setRecordingSeconds(0);
      }
    };
    recorder.stop();
  };

  // ---------------------------------------------------------------------
  // Menus
  // ---------------------------------------------------------------------
  useAppMenu(windowId, [
    {
      id: 'chat',
      label: 'Chat',
      items: [
        { id: 'new', label: 'New Chat Request…', onSelect: () => setShowNewChat(true) },
        {
          id: 'requests',
          label: `Chat Requests${incomingRequests.length ? ` (${incomingRequests.length})` : ''}`,
          onSelect: () => setShowRequests(true),
        },
        separator(),
        { id: 'refresh', label: 'Refresh', onSelect: refresh },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'sidebar',
          label: 'Conversation List',
          checked: showSidebar,
          onSelect: () => setShowSidebar((value) => !value),
        },
        {
          id: 'contact-panel',
          label: 'Contact Details',
          checked: showContactPanel,
          disabled: !peer,
          onSelect: () => setShowContactPanel((value) => !value),
        },
        // Theme is not repeated here: the window menu offers it for every
        // application, and two entries for one setting invite disagreement.
      ],
    },
  ]);

  // ---------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------
  const Avatar = ({
    name,
    status,
    size = 34,
  }: {
    name: string;
    status?: PresenceStatus;
    size?: number;
  }) => (
    <div className="relative shrink-0">
      <div
        className="rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials(name)}
      </div>
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
            palette.isDark ? 'border-[#1e293b]' : 'border-white'
          } ${PRESENCE_DOT[status]}`}
        />
      )}
    </div>
  );

  const emptyState = (
    icon: React.ReactNode,
    title: string,
    body: string,
    action?: React.ReactNode,
  ) => (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
      <div className={`p-3 rounded-2xl ${palette.isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>{icon}</div>
      <h3 className={`text-sm font-bold ${palette.text}`}>{title}</h3>
      <p className={`text-xs leading-relaxed max-w-xs ${palette.textMuted}`}>{body}</p>
      {action}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`h-full flex ${palette.appBg} ${palette.text} font-sans select-none overflow-hidden relative`}
    >
      {(notice || actionError) && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 max-w-[90%] ${
            actionError ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          <span className="truncate">{actionError || notice}</span>
          <button
            onClick={() => {
              setActionError(null);
              setNotice(null);
            }}
            className="shrink-0 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {showSidebar && isCompact && (
        <div className="absolute inset-0 bg-black/40 z-30" onClick={() => setShowSidebar(false)} />
      )}

      {/* ================= SIDEBAR ================= */}
      {showSidebar && (
        <div
          className={`${palette.sidebarBg} border-r ${palette.border} flex flex-col shrink-0 min-h-0 ${
            isCompact ? 'absolute inset-y-0 left-0 z-40 w-72 shadow-2xl' : 'w-72'
          }`}
        >
          <div className={`p-3 border-b ${palette.border} flex items-center justify-between gap-2 shrink-0`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={currentUser?.fullName || 'You'} status="online" />
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${palette.text}`}>
                  {currentUser?.fullName || 'You'}
                </div>
                <div className={`text-[10px] ${palette.textMuted}`}>Online</div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowRequests(true)}
                className={`relative p-2 rounded-xl ${palette.hover} cursor-pointer`}
                title="Chat requests"
              >
                <Inbox size={15} className={palette.textMuted} />
                {incomingRequests.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
                    {incomingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                title="New chat request"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          <div className="p-2.5 shrink-0">
            <div className="relative flex items-center">
              <Search size={13} className={`absolute left-3 ${palette.textSubtle}`} />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter conversations"
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 custom-scrollbar">
            {isLoading ? (
              <div className={`flex items-center justify-center gap-2 py-8 text-xs ${palette.textMuted}`}>
                <Loader2 size={14} className="animate-spin" /> Loading conversations…
              </div>
            ) : loadError ? (
              <div className="p-3 text-center">
                <WifiOff size={20} className="mx-auto mb-2 text-rose-500" />
                <p className={`text-[11px] ${palette.textMuted} leading-relaxed`}>{loadError}</p>
                <button
                  onClick={refresh}
                  className="mt-2 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={11} /> Retry
                </button>
              </div>
            ) : visibleConversations.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <MessageSquare size={22} className={`mx-auto mb-2 ${palette.textSubtle}`} />
                <p className={`text-[11px] ${palette.textMuted} leading-relaxed`}>
                  {filter ? `No conversations match “${filter}”.` : 'No conversations yet.'}
                </p>
                {!filter && (
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-2 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Find someone
                  </button>
                )}
              </div>
            ) : (
              visibleConversations.map((conversation) => {
                const other = conversation.participants.find((p) => p.username !== currentUser?.username);
                const isActive = conversation.id === activeConversationId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      if (isCompact) setShowSidebar(false);
                    }}
                    className={`w-full p-2.5 mb-0.5 rounded-xl flex items-center gap-2.5 text-left cursor-pointer transition-colors border ${
                      isActive ? palette.activeItem : `border-transparent ${palette.hover}`
                    }`}
                  >
                    <Avatar
                      name={other?.fullName ?? conversation.title}
                      status={other?.status}
                      size={32}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-xs font-bold truncate ${palette.text}`}>
                          {conversation.title}
                        </span>
                        <span className={`text-[9px] shrink-0 ${palette.textSubtle}`}>
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className={`text-[11px] truncate ${palette.textMuted}`}>
                        {conversation.lastMessagePreview || 'No messages yet'}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}

            {outgoingRequests.length > 0 && (
              <div className="mt-3">
                <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${palette.textSubtle}`}>
                  Awaiting reply
                </div>
                {outgoingRequests.map((request) => (
                  <div key={request.id} className="p-2.5 rounded-xl flex items-center gap-2.5 opacity-70">
                    <Avatar name={request.counterpart.fullName} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${palette.text}`}>
                        {request.counterpart.fullName}
                      </div>
                      <div className={`text-[10px] flex items-center gap-1 ${palette.textMuted}`}>
                        <Clock size={9} /> Request pending
                      </div>
                    </div>
                    <button
                      onClick={() => cancelRequest(request)}
                      className={`p-1 rounded ${palette.hover} cursor-pointer`}
                      title="Withdraw request"
                    >
                      <Trash2 size={12} className={palette.textSubtle} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= CONVERSATION ================= */}
      <div className={`flex-1 min-w-0 min-h-0 flex flex-col ${palette.chatBg}`}>
        <div
          id="messenger-conversation-header"
          className={`min-h-14 px-3 py-2 ${palette.panelBg} border-b ${palette.border} flex items-center justify-between gap-2 shrink-0`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isCompact && (
              <button
                onClick={() => setShowSidebar(true)}
                className={`p-2 rounded-xl ${palette.hover} cursor-pointer`}
              >
                <MessageSquare size={15} className={palette.textMuted} />
              </button>
            )}
            {activeConversation ? (
              <button
                onClick={() => peer && setShowContactPanel((value) => !value)}
                disabled={!peer}
                title={peer ? `View ${peer.fullName}'s details` : undefined}
                className={`flex items-center gap-2 min-w-0 rounded-xl -m-1 p-1 text-left cursor-pointer disabled:cursor-default ${
                  peer ? palette.hover : ''
                }`}
              >
                <Avatar
                  name={peer?.fullName ?? activeConversation.title}
                  status={peer?.status}
                  size={32}
                />
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${palette.text}`}>
                    {activeConversation.title}
                  </div>
                  <div className={`text-[10px] flex items-center gap-1 ${palette.textMuted}`}>
                    {peer ? (
                      <>
                        <span className={`w-1.5 h-1.5 rounded-full ${PRESENCE_DOT[peer.status]}`} />
                        {isPeerBlocked
                          ? 'Blocked'
                          : peer.statusText
                          ? `${peer.statusEmoji} ${peer.statusText}`.trim()
                          : PRESENCE_LABEL[peer.status]}
                      </>
                    ) : (
                      `${activeConversation.participants.length} members`
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <span className={`text-xs font-bold ${palette.textMuted}`}>Messenger</span>
            )}
          </div>

          {/* Theme lives in the window menu (View → Theme), not here. */}
          <div className="flex items-center gap-1 shrink-0">
            {peer && (
              <>
                <button
                  onClick={() => void startCall('voice')}
                  disabled={isPeerBlocked || callInProgress !== null}
                  className={`p-2 rounded-xl ${palette.hover} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={isPeerBlocked ? `Unblock ${peer.fullName} to call` : 'Voice call'}
                  aria-label="Voice call"
                >
                  <Phone size={15} className={palette.textMuted} />
                </button>
                <button
                  onClick={() => void startCall('video')}
                  disabled={isPeerBlocked || callInProgress !== null}
                  className={`p-2 rounded-xl ${palette.hover} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={isPeerBlocked ? `Unblock ${peer.fullName} to call` : 'Video call'}
                  aria-label="Video call"
                >
                  <Video size={15} className={palette.textMuted} />
                </button>
                <button
                  onClick={() => setShowMessageSearch((value) => !value)}
                  className={`p-2 rounded-xl cursor-pointer ${
                    showMessageSearch ? 'bg-blue-600/15 text-blue-600' : palette.hover
                  }`}
                  title="Search in this conversation"
                  aria-label="Search in this conversation"
                >
                  <Search size={15} className={showMessageSearch ? '' : palette.textMuted} />
                </button>
                <button
                  onClick={() => void savePeerToContacts(peer)}
                  disabled={savingContact}
                  className={`p-2 rounded-xl ${palette.hover} cursor-pointer disabled:opacity-50 disabled:cursor-wait`}
                  title={`Save ${peer.fullName} to Contacts`}
                  aria-label={`Save ${peer.fullName} to Contacts`}
                >
                  <BookUser size={15} className={palette.textMuted} />
                </button>
              </>
            )}
          </div>
        </div>

        {showMessageSearch && activeConversation && (
          <div className={`px-3 py-2 ${palette.panelBg} border-b ${palette.border} flex items-center gap-2 shrink-0`}>
            <Search size={13} className={palette.textSubtle} />
            <input
              autoFocus
              value={messageSearchQuery}
              onChange={(event) => setMessageSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (event.shiftKey) goToPreviousMatch();
                  else goToNextMatch();
                } else if (event.key === 'Escape') {
                  setShowMessageSearch(false);
                  setMessageSearchQuery('');
                }
              }}
              placeholder="Search in this conversation"
              className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
            />
            {messageSearchQuery.trim() && (
              <span className={`text-[10px] shrink-0 tabular-nums ${palette.textSubtle}`}>
                {messageSearchMatches.length === 0 ? 'No results' : `${messageSearchIndex + 1}/${messageSearchMatches.length}`}
              </span>
            )}
            <button
              onClick={goToPreviousMatch}
              disabled={messageSearchMatches.length === 0}
              className={`p-1.5 rounded-lg ${palette.hover} cursor-pointer disabled:opacity-30 disabled:cursor-default`}
              title="Previous match"
              aria-label="Previous match"
            >
              <ChevronUp size={14} className={palette.textMuted} />
            </button>
            <button
              onClick={goToNextMatch}
              disabled={messageSearchMatches.length === 0}
              className={`p-1.5 rounded-lg ${palette.hover} cursor-pointer disabled:opacity-30 disabled:cursor-default`}
              title="Next match"
              aria-label="Next match"
            >
              <ChevronDown size={14} className={palette.textMuted} />
            </button>
            <button
              onClick={() => {
                setShowMessageSearch(false);
                setMessageSearchQuery('');
              }}
              className={`p-1.5 rounded-lg ${palette.hover} cursor-pointer`}
              title="Close search"
              aria-label="Close search"
            >
              <X size={14} className={palette.textMuted} />
            </button>
          </div>
        )}

        {!activeConversation ? (
          conversations.length === 0 && !isLoading && !loadError ? (
            emptyState(
              <MessageSquare size={26} className={palette.textSubtle} />,
              'No conversations yet',
              'Search for someone by username and send a chat request with a short message. Once they accept, you can message each other and they are added to your contacts.',
              <button
                onClick={() => setShowNewChat(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus size={13} /> Find someone
              </button>,
            )
          ) : (
            emptyState(
              <Inbox size={26} className={palette.textSubtle} />,
              'Select a conversation',
              'Choose a conversation from the list to read and reply.',
            )
          )
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 custom-scrollbar select-text"
            >
              {isLoadingMessages && activeMessages.length === 0 ? (
                <div className={`flex items-center justify-center gap-2 py-8 text-xs ${palette.textMuted}`}>
                  <Loader2 size={14} className="animate-spin" /> Loading messages…
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="text-center py-10">
                  <p className={`text-xs ${palette.textMuted}`}>
                    You are connected with {peer?.fullName ?? activeConversation.title}. Say hello.
                  </p>
                </div>
              ) : (
                activeMessages.map((message) => {
                  const voiceAttachment = message.attachments.find((a) => a.kind === 'voice');
                  const isEmojiOnly = !voiceAttachment && isEmojiOnlyMessage(message.body);
                  const isActiveMatch = showMessageSearch && message.id === activeSearchMatchId;
                  return (
                    <div
                      key={message.id}
                      ref={(el) => {
                        messageNodeRefs.current[message.id] = el;
                      }}
                      className={`flex gap-2.5 items-start max-w-[85%] rounded-2xl transition-shadow ${
                        message.isMine ? 'ml-auto flex-row-reverse' : ''
                      } ${isActiveMatch ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold ${
                          message.isMine
                            ? 'bg-blue-600 text-white'
                            : palette.isDark
                            ? 'bg-slate-700 text-slate-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {initials(message.isMine ? currentUser?.fullName || 'You' : message.senderName)}
                      </div>
                      <div className="min-w-0">
                        <div className={`flex items-center gap-2 mb-0.5 ${message.isMine ? 'justify-end' : ''}`}>
                          <span className={`text-[11px] font-bold ${palette.textMuted}`}>
                            {message.isMine ? 'You' : message.senderName}
                          </span>
                          <span className={`text-[9px] ${palette.textSubtle}`}>
                            {formatTime(message.createdAt)}
                          </span>
                          {message.isMine && <MessageTicks status={message.status} textSubtle={palette.textSubtle} />}
                        </div>
                        {voiceAttachment ? (
                          <div
                            className={`p-2 rounded-2xl ${
                              message.isMine
                                ? `${palette.bubbleMine} rounded-tr-none`
                                : `${palette.bubbleTheirs} rounded-tl-none`
                            }`}
                          >
                            <audio
                              controls
                              preload="metadata"
                              src={voiceAttachment.url}
                              className="h-8 max-w-[220px]"
                            />
                          </div>
                        ) : isEmojiOnly ? (
                          <div className="text-4xl leading-tight">
                            {showMessageSearch && messageSearchQuery.trim()
                              ? highlightMatches(message.body, messageSearchQuery)
                              : message.body}
                          </div>
                        ) : (
                          <div
                            className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line break-words ${
                              message.isMine
                                ? `${palette.bubbleMine} rounded-tr-none`
                                : `${palette.bubbleTheirs} rounded-tl-none`
                            }`}
                          >
                            {showMessageSearch && messageSearchQuery.trim()
                              ? highlightMatches(message.body, messageSearchQuery)
                              : message.body}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isPeerBlocked ? (
              <div className={`p-3 ${palette.panelBg} border-t ${palette.border} shrink-0 flex items-center justify-between gap-2`}>
                <span className={`text-[11px] ${palette.textMuted}`}>
                  You blocked {peer?.fullName}. Unblock them to send messages.
                </span>
                <button
                  onClick={() => void toggleBlock()}
                  disabled={isTogglingBlock}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
                >
                  {isTogglingBlock && <Loader2 size={11} className="animate-spin" />}
                  Unblock
                </button>
              </div>
            ) : recordingState !== 'idle' ? (
              <div className={`p-2.5 ${palette.panelBg} border-t ${palette.border} shrink-0 flex items-center gap-3`}>
                <button
                  onClick={cancelRecording}
                  disabled={recordingState === 'uploading'}
                  className={`p-2.5 shrink-0 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${palette.hover}`}
                  title="Cancel recording"
                  aria-label="Cancel recording"
                >
                  <Trash2 size={16} className="text-rose-500" />
                </button>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {recordingState === 'recording' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                      <span className={`text-xs font-bold tabular-nums ${palette.text}`}>
                        {formatDuration(recordingSeconds)}
                      </span>
                      <span className={`text-[11px] ${palette.textMuted}`}>Recording…</span>
                    </>
                  ) : (
                    <span className={`text-xs flex items-center gap-2 ${palette.textMuted}`}>
                      <Loader2 size={13} className="animate-spin" /> Sending voice message…
                    </span>
                  )}
                </div>
                <button
                  onClick={sendRecording}
                  disabled={recordingState !== 'recording'}
                  className="p-2.5 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl cursor-pointer transition-colors"
                  title="Send voice message"
                  aria-label="Send voice message"
                >
                  <Send size={15} />
                </button>
              </div>
            ) : (
              <div className={`p-2.5 ${palette.panelBg} border-t ${palette.border} shrink-0 flex items-center gap-2 relative`}>
                <button
                  onClick={() => setShowEmojiPicker((value) => !value)}
                  className={`p-2.5 shrink-0 rounded-xl cursor-pointer ${
                    showEmojiPicker ? 'bg-blue-600/15 text-blue-600' : palette.hover
                  }`}
                  title="Emoji and stickers"
                  aria-label="Emoji and stickers"
                >
                  <Smile size={17} className={showEmojiPicker ? '' : palette.textMuted} />
                </button>

                {showEmojiPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                    <div className="absolute bottom-full left-2 mb-2 z-50">
                      <EmojiStickerPicker
                        palette={palette}
                        onSelectEmoji={insertEmoji}
                        onSelectSticker={(sticker) => void sendSticker(sticker)}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    </div>
                  </>
                )}

                <input
                  ref={draftInputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Message ${activeConversation.title}`}
                  className={`flex-1 min-w-0 px-3.5 py-2 rounded-2xl border text-xs focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
                />
                {draft.trim() ? (
                  <button
                    onClick={sendMessage}
                    disabled={isSending}
                    className="p-2.5 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl cursor-pointer transition-colors"
                  >
                    {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                ) : (
                  <button
                    onClick={() => void startRecording()}
                    className="p-2.5 shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer transition-colors"
                    title="Record a voice message"
                    aria-label="Record a voice message"
                  >
                    <Mic size={15} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= CONTACT DETAILS ================= */}
      {showContactPanel && peer && activeConversationId && (
        <>
          {isCompact && (
            <div className="absolute inset-0 bg-black/40 z-30" onClick={() => setShowContactPanel(false)} />
          )}
          <div className={isCompact ? 'absolute inset-y-0 right-0 z-40 shadow-2xl' : 'contents'}>
            <ContactDetailsPanel
              peer={peer}
              palette={palette}
              contact={activePeerContact}
              isLoadingContact={isLoadingContact}
              onClose={() => setShowContactPanel(false)}
              onToggleFavourite={toggleFavourite}
              isTogglingFavourite={isTogglingFavourite}
              onToggleBlock={toggleBlock}
              isTogglingBlock={isTogglingBlock}
              onClearChat={clearChat}
              isClearingChat={isClearingChat}
              onDeleteChat={deleteChat}
              isDeletingChat={isDeletingChat}
              onStartCall={startCall}
              callInProgress={callInProgress}
              media={mediaByConversation[activeConversationId] ?? []}
              isLoadingMedia={isLoadingMedia}
              mediaError={mediaError}
              onDeleteMedia={deleteMediaItem}
              deletingMediaId={deletingMediaId}
              error={panelError}
              onDismissError={() => setPanelError(null)}
            />
          </div>
        </>
      )}

      {/* ================= NEW CHAT REQUEST ================= */}
      {showNewChat && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${palette.panelBg} ${palette.border}`}
          >
            <div className={`px-4 py-3 border-b ${palette.border} flex items-center justify-between`}>
              <div>
                <h3 className={`text-sm font-bold ${palette.text}`}>Start a conversation</h3>
                <p className={`text-[11px] ${palette.textMuted}`}>
                  Find someone by username, then send a short request.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setRequestTarget(null);
                  setDirectoryTerm('');
                }}
                className={`p-1.5 rounded-lg ${palette.hover} cursor-pointer`}
              >
                <X size={15} className={palette.textMuted} />
              </button>
            </div>

            {requestTarget ? (
              <div className="p-4 space-y-3">
                <div
                  className={`p-2.5 rounded-xl flex items-center gap-2.5 ${
                    palette.isDark ? 'bg-slate-800' : 'bg-slate-100'
                  }`}
                >
                  <Avatar name={requestTarget.fullName} status={requestTarget.status} size={32} />
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${palette.text}`}>
                      {requestTarget.fullName}
                    </div>
                    <div className={`text-[10px] truncate ${palette.textMuted}`}>
                      @{requestTarget.username}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`text-[11px] font-bold ${palette.textMuted}`}>
                    Short message ({requestNote.length}/280)
                  </label>
                  <textarea
                    autoFocus
                    value={requestNote}
                    onChange={(event) => setRequestNote(event.target.value.slice(0, 280))}
                    rows={3}
                    placeholder="Introduce yourself in a sentence or two…"
                    className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs resize-none focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
                  />
                  <p className={`text-[10px] mt-1 ${palette.textSubtle}`}>
                    Only this short note can be sent until they accept.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRequestTarget(null)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
                  >
                    Back
                  </button>
                  <button
                    onClick={sendRequest}
                    disabled={!requestNote.trim() || isSubmittingRequest}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingRequest ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    Send request
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <div className="relative flex items-center">
                  <AtSign size={13} className={`absolute left-3 ${palette.textSubtle}`} />
                  <input
                    autoFocus
                    value={directoryTerm}
                    onChange={(event) => setDirectoryTerm(event.target.value)}
                    placeholder="Search by username, name or email"
                    className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
                  />
                </div>

                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                  {directoryTerm.trim().length < 2 ? (
                    <p className={`text-[11px] text-center py-6 ${palette.textMuted}`}>
                      Type at least two characters to search your organisation.
                    </p>
                  ) : isSearching ? (
                    <div className={`flex items-center justify-center gap-2 py-6 text-xs ${palette.textMuted}`}>
                      <Loader2 size={13} className="animate-spin" /> Searching…
                    </div>
                  ) : directoryResults.length === 0 ? (
                    <p className={`text-[11px] text-center py-6 ${palette.textMuted}`}>
                      Nobody matches “{directoryTerm}”.
                    </p>
                  ) : (
                    directoryResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => void selectDirectoryUser(user)}
                        disabled={resolvingUserId === user.id}
                        className={`w-full p-2.5 rounded-xl flex items-center gap-2.5 text-left cursor-pointer disabled:opacity-60 disabled:cursor-wait ${palette.hover}`}
                      >
                        <Avatar name={user.fullName} status={user.status} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold truncate ${palette.text}`}>
                            {user.fullName}
                          </div>
                          <div className={`text-[10px] truncate ${palette.textMuted}`}>
                            @{user.username}
                          </div>
                        </div>
                        {resolvingUserId === user.id ? (
                          <Loader2 size={14} className={`animate-spin ${palette.textSubtle}`} />
                        ) : (
                          <UserPlus size={14} className={palette.textSubtle} />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= REQUESTS ================= */}
      {showRequests && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${palette.panelBg} ${palette.border}`}
          >
            <div className={`px-4 py-3 border-b ${palette.border} flex items-center justify-between`}>
              <h3 className={`text-sm font-bold ${palette.text}`}>Chat requests</h3>
              <button
                onClick={() => setShowRequests(false)}
                className={`p-1.5 rounded-lg ${palette.hover} cursor-pointer`}
              >
                <X size={15} className={palette.textMuted} />
              </button>
            </div>

            <div className="p-3 max-h-96 overflow-y-auto custom-scrollbar space-y-2">
              {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck size={22} className={`mx-auto mb-2 ${palette.textSubtle}`} />
                  <p className={`text-[11px] ${palette.textMuted}`}>No pending requests.</p>
                </div>
              ) : (
                <>
                  {incomingRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-3 rounded-xl border ${palette.border} ${
                        palette.isDark ? 'bg-slate-800/60' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <Avatar
                          name={request.counterpart.fullName}
                          status={request.counterpart.status}
                          size={32}
                        />
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${palette.text}`}>
                            {request.counterpart.fullName}
                          </div>
                          <div className={`text-[10px] truncate ${palette.textMuted}`}>
                            @{request.counterpart.username}
                          </div>
                        </div>
                      </div>
                      <p className={`text-[11px] leading-relaxed mb-2 ${palette.textMuted}`}>
                        “{request.message}”
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => respondToRequest(request, 'accept')}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check size={12} /> Accept
                        </button>
                        <button
                          onClick={() => respondToRequest(request, 'reject')}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5 border ${palette.border} ${palette.hover} ${palette.text}`}
                        >
                          <Ban size={12} /> Decline
                        </button>
                      </div>
                    </div>
                  ))}

                  {outgoingRequests.length > 0 && (
                    <div className={`pt-2 text-[10px] font-bold uppercase tracking-wide ${palette.textSubtle}`}>
                      Sent by you
                    </div>
                  )}
                  {outgoingRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${palette.border}`}
                    >
                      <Avatar name={request.counterpart.fullName} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold truncate ${palette.text}`}>
                          {request.counterpart.fullName}
                        </div>
                        <div className={`text-[10px] ${palette.textMuted}`}>Waiting for a reply</div>
                      </div>
                      <button
                        onClick={() => cancelRequest(request)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
                      >
                        Withdraw
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <WindowStatus
        left={
          <span>
            {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
            {incomingRequests.length > 0 &&
              ` · ${incomingRequests.length} request${incomingRequests.length === 1 ? '' : 's'}`}
          </span>
        }
        center={
          <span className="opacity-75">
            {activeConversation ? activeConversation.title : 'No conversation selected'}
          </span>
        }
        right={
          <span className="opacity-75">
            {/* Both halves matter: the preference, and what it came out as. */}
            Theme: {APP_THEME_CHOICES.find((o) => o.value === themeChoice)?.label ?? 'Theme'} (
            {palette.isDark ? 'dark' : 'light'})
          </span>
        }
      />
    </div>
  );
}
