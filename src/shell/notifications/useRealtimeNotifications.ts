import { useEffect } from 'react';
import { useSystemStore } from '../state/systemStore';
import { EventBus } from '../../platform/events/EventBus';
import {
  RealtimeClient,
  REALTIME_NOTIFICATION,
  type RealtimeNotification,
} from '../../platform/realtime/RealtimeClient';
import { SystemNotifier } from '../../platform/notifications/SystemNotifier';

/**
 * Bridges server-pushed notifications into the desktop.
 *
 * Runs once, in the shell, for as long as the user is signed in — deliberately
 * not inside any application. A message must reach the user when Messenger is
 * closed, and a closed window is an unmounted component with nothing listening.
 *
 * Each notification goes to two places:
 *
 *  - the in-app notification centre, always, so there is a durable record; and
 *  - the operating system, when the user cannot already see it — Messenger
 *    closed, minimised, or the browser tab in the background.
 *
 * When Messenger *is* open and visible, the app updates itself live and no
 * system notification is raised, so the same message never announces itself
 * twice.
 */

/** Event Messenger listens for to update itself without a refetch. */
export const CHAT_MESSAGE_EVENT = 'chat:message';

export interface ChatMessageEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  preview: string;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * The conversation Messenger currently has on screen.
 *
 * Kept as a module value rather than store state on purpose: it is read once
 * per incoming notification and never rendered, so putting it in the store
 * would re-render the whole shell every time the user clicked a conversation,
 * for no visible benefit.
 */
let activeConversation: string | null = null;

/** Called by Messenger when the open conversation changes, and on unmount. */
export function setActiveConversation(conversationId: string | null): void {
  activeConversation = conversationId;
}

function activeMessengerConversation(): string | null {
  return activeConversation;
}

export function useRealtimeNotifications(isAuthenticated: boolean): void {
  const addNotification = useSystemStore((state) => state.addNotification);
  const openConversation = useSystemStore((state) => state.openConversation);

  useEffect(() => {
    if (!isAuthenticated) {
      RealtimeClient.disconnect();
      return;
    }

    RealtimeClient.connect();

    const unsubscribe = EventBus.on<RealtimeNotification>(REALTIME_NOTIFICATION, (notification) => {
      const data = (notification.data ?? {}) as Record<string, unknown>;
      const conversationId = asString(data.conversationId);
      const isChatMessage = notification.type === 'chat.message' && conversationId;

      // Whether the user can plausibly already see this. `visibilityState`
      // covers a backgrounded tab; the window list covers Messenger being
      // closed or minimised, which unmounts it entirely.
      const { windows, activeWindowId } = useSystemStore.getState();
      const messengerWindow = windows.find((w) => w.id === 'messenger');
      const messengerVisible =
        Boolean(messengerWindow?.isOpen) &&
        !messengerWindow?.isMinimized &&
        document.visibilityState === 'visible';

      if (isChatMessage) {
        // Hand it to Messenger first. If it is mounted, it appends the message
        // and updates its unread count without a round trip.
        EventBus.emit<ChatMessageEvent>(CHAT_MESSAGE_EVENT, {
          conversationId,
          messageId: asString(data.messageId) ?? '',
          senderId: asString(data.senderId) ?? '',
          senderName: asString(data.senderName) ?? notification.title,
          preview: notification.body,
        });
      }

      // Whether the user is, right now, looking at the thread this belongs to.
      // Everything below turns on this one question.
      const readingThisConversation =
        Boolean(isChatMessage) &&
        messengerVisible &&
        activeWindowId === 'messenger' &&
        conversationId === activeMessengerConversation();

      // A message the user is watching arrive does not also need an entry in
      // the notification centre — holding a live conversation would otherwise
      // fill it with one row per message. Everything else is recorded.
      if (!readingThisConversation) {
        addNotification({
          sender: notification.title || 'Drive OSX',
          text: notification.body,
          type: 'info',
        });
      }

      // Only escalate to the operating system when the user cannot already see
      // it. This is the rule that prevents a doubled announcement.
      const shouldRaiseSystemNotification = isChatMessage
        ? !messengerVisible || activeWindowId !== 'messenger'
        : document.visibilityState !== 'visible';

      if (!shouldRaiseSystemNotification) return;

      SystemNotifier.show(
        {
          title: notification.title || 'Drive OSX',
          body: notification.body,
          // One live notification per conversation: a burst of messages
          // updates in place instead of filling the notification centre.
          tag: conversationId ? `conversation:${conversationId}` : `notification:${notification.id}`,
          data: { ...data, notificationType: notification.type },
        },
        (clickData) => {
          const target = asString(clickData.conversationId);
          if (target) {
            openConversation(target);
          }
        },
      );
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, addNotification, openConversation]);

  // Signing out should not leave a socket open carrying another account's data.
  useEffect(() => {
    const onPageHide = () => RealtimeClient.disconnect();
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);
}

export default useRealtimeNotifications;
