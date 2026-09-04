import React, { useState } from 'react';
import {
  X, Phone, Video, Star, Ban, ShieldOff, Trash2, Loader2, Eraser,
} from 'lucide-react';
import type { DirectoryUser, MediaItem, LinkItem } from '../../platform/messaging/MessagingService';
import type { Contact } from '../../platform/contacts/ContactsService';
import type { MessengerPalette } from './useMessengerTheme';
import SharedMediaSection from './SharedMediaSection';

/**
 * The right-hand contact panel — WhatsApp Web's "click the name" view.
 *
 * Deliberately presentational: every action (favourite, block, delete,
 * call, media delete) is a callback owned by Messenger, which already holds
 * every other piece of conversation state. That keeps a single source of
 * truth for things like "is this person blocked" that the composer also
 * needs to know about, instead of this panel silently duplicating it.
 */

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '??';
}

export interface ContactDetailsPanelProps {
  peer: DirectoryUser;
  palette: MessengerPalette;

  contact: Contact | null;
  isLoadingContact: boolean;

  onClose: () => void;

  onToggleFavourite: () => void;
  isTogglingFavourite: boolean;

  onToggleBlock: () => void;
  isTogglingBlock: boolean;

  onClearChat: () => void;
  isClearingChat: boolean;

  onDeleteChat: () => void;
  isDeletingChat: boolean;

  onStartCall: (kind: 'voice' | 'video') => void;
  callInProgress: 'voice' | 'video' | null;

  media: MediaItem[];
  isLoadingMedia: boolean;
  mediaError: string | null;
  onDeleteMedia: (item: MediaItem) => void;
  deletingMediaId: string | null;

  links: LinkItem[];
  isLoadingLinks: boolean;
  linksError: string | null;

  error: string | null;
  onDismissError: () => void;
}

export default function ContactDetailsPanel({
  peer,
  palette,
  contact,
  isLoadingContact,
  onClose,
  onToggleFavourite,
  isTogglingFavourite,
  onToggleBlock,
  isTogglingBlock,
  onClearChat,
  isClearingChat,
  onDeleteChat,
  isDeletingChat,
  onStartCall,
  callInProgress,
  media,
  isLoadingMedia,
  mediaError,
  onDeleteMedia,
  deletingMediaId,
  links,
  isLoadingLinks,
  linksError,
  error,
  onDismissError,
}: ContactDetailsPanelProps) {
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isFavourite = contact?.isFavourite ?? false;
  const isBlocked = contact?.isBlocked ?? false;

  return (
    <div className={`w-80 h-full shrink-0 border-l ${palette.border} ${palette.panelBg} flex flex-col min-h-0`}>
      <div className={`p-3 border-b ${palette.border} flex items-center justify-between shrink-0`}>
        <h3 className={`text-xs font-bold ${palette.text}`}>Contact details</h3>
        <button onClick={onClose} className={`p-1.5 rounded-lg ${palette.hover} cursor-pointer`}>
          <X size={15} className={palette.textMuted} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {error && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-rose-600 text-white text-[11px] font-bold flex items-center justify-between gap-2">
            <span className="truncate">{error}</span>
            <button onClick={onDismissError} className="shrink-0 cursor-pointer">
              <X size={12} />
            </button>
          </div>
        )}

        <div className={`p-4 flex flex-col items-center text-center gap-2 border-b ${palette.border}`}>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-sm">
            {initials(peer.fullName)}
          </div>
          <div>
            <div className={`text-sm font-bold ${palette.text}`}>{peer.fullName}</div>
            <div className={`text-[11px] ${palette.textMuted}`}>@{peer.username}</div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onStartCall('voice')}
              disabled={isBlocked || callInProgress !== null}
              title={isBlocked ? `Unblock ${peer.fullName} to call` : 'Voice call'}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${palette.border} ${palette.hover}`}
            >
              {callInProgress === 'voice' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Phone size={16} className={palette.textMuted} />
              )}
              <span className={`text-[10px] font-bold ${palette.textMuted}`}>Voice</span>
            </button>
            <button
              onClick={() => onStartCall('video')}
              disabled={isBlocked || callInProgress !== null}
              title={isBlocked ? `Unblock ${peer.fullName} to call` : 'Video call'}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${palette.border} ${palette.hover}`}
            >
              {callInProgress === 'video' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Video size={16} className={palette.textMuted} />
              )}
              <span className={`text-[10px] font-bold ${palette.textMuted}`}>Video</span>
            </button>
          </div>
        </div>

        <div className={`p-2 border-b ${palette.border}`}>
          <button
            onClick={onToggleFavourite}
            disabled={!contact || isLoadingContact || isTogglingFavourite}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-wait ${palette.hover}`}
          >
            <Star size={15} className={isFavourite ? 'fill-amber-400 text-amber-400' : palette.textMuted} />
            <span className={`text-xs font-bold ${palette.text}`}>
              {isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            </span>
            {isTogglingFavourite && <Loader2 size={12} className={`animate-spin ml-auto ${palette.textMuted}`} />}
          </button>

          {confirmBlock ? (
            <div className={`m-1 p-2.5 rounded-xl border ${palette.border}`}>
              <p className={`text-[11px] leading-relaxed mb-2 ${palette.textMuted}`}>
                {isBlocked
                  ? `Unblock ${peer.fullName}? You will be able to message each other again.`
                  : `Block ${peer.fullName}? Neither of you will be able to send messages until you unblock.`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmBlock(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onToggleBlock();
                    setConfirmBlock(false);
                  }}
                  disabled={isTogglingBlock}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isTogglingBlock && <Loader2 size={12} className="animate-spin" />}
                  {isBlocked ? 'Unblock' : 'Block'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmBlock(true)}
              disabled={!contact || isLoadingContact}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer disabled:opacity-50 ${palette.hover}`}
            >
              {isBlocked ? (
                <ShieldOff size={15} className="text-emerald-500" />
              ) : (
                <Ban size={15} className={palette.textMuted} />
              )}
              <span className={`text-xs font-bold ${isBlocked ? 'text-emerald-500' : palette.text}`}>
                {isBlocked ? `Unblock ${peer.fullName}` : `Block ${peer.fullName}`}
              </span>
            </button>
          )}

          {confirmClear ? (
            <div className={`m-1 p-2.5 rounded-xl border ${palette.border}`}>
              <p className={`text-[11px] leading-relaxed mb-2 ${palette.textMuted}`}>
                Clear this chat? Your message history disappears, but {peer.fullName} stays in your conversation
                list — this only clears messages, it does not remove the chat.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmClear(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearChat();
                    setConfirmClear(false);
                  }}
                  disabled={isClearingChat}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isClearingChat && <Loader2 size={12} className="animate-spin" />}
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer ${palette.hover}`}
            >
              <Eraser size={15} className={palette.textMuted} />
              <span className={`text-xs font-bold ${palette.text}`}>Clear chat</span>
            </button>
          )}

          {confirmDelete ? (
            <div className={`m-1 p-2.5 rounded-xl border ${palette.border}`}>
              <p className={`text-[11px] leading-relaxed mb-2 ${palette.textMuted}`}>
                Delete this chat? It disappears from your list — {peer.fullName} keeps their copy, and it comes
                back if either of you sends a new message.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onDeleteChat}
                  disabled={isDeletingChat}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isDeletingChat && <Loader2 size={12} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer ${palette.hover}`}
            >
              <Trash2 size={15} className="text-rose-500" />
              <span className="text-xs font-bold text-rose-500">Delete chat</span>
            </button>
          )}
        </div>

        <SharedMediaSection
          palette={palette}
          media={media}
          isLoadingMedia={isLoadingMedia}
          mediaError={mediaError}
          onDeleteMedia={onDeleteMedia}
          deletingMediaId={deletingMediaId}
          links={links}
          isLoadingLinks={isLoadingLinks}
          linksError={linksError}
        />
      </div>
    </div>
  );
}
