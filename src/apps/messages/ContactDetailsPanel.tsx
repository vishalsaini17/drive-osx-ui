import React, { useState } from 'react';
import {
  X, Phone, Video, Star, Ban, ShieldOff, Trash2, Loader2, ImageOff, FileText,
} from 'lucide-react';
import type { DirectoryUser, MediaItem } from '../../platform/messaging/MessagingService';
import type { Contact } from '../../platform/contacts/ContactsService';
import type { MessengerPalette } from './useMessengerTheme';

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

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  onDeleteChat: () => void;
  isDeletingChat: boolean;

  onStartCall: (kind: 'voice' | 'video') => void;
  callInProgress: 'voice' | 'video' | null;

  media: MediaItem[];
  isLoadingMedia: boolean;
  mediaError: string | null;
  onDeleteMedia: (item: MediaItem) => void;
  deletingMediaId: string | null;

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
  onDeleteChat,
  isDeletingChat,
  onStartCall,
  callInProgress,
  media,
  isLoadingMedia,
  mediaError,
  onDeleteMedia,
  deletingMediaId,
  error,
  onDismissError,
}: ContactDetailsPanelProps) {
  const [confirmBlock, setConfirmBlock] = useState(false);
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

        <div className="p-3">
          <div className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${palette.textSubtle}`}>
            Shared media
          </div>
          {isLoadingMedia ? (
            <div className={`flex items-center justify-center gap-2 py-6 text-xs ${palette.textMuted}`}>
              <Loader2 size={13} className="animate-spin" /> Loading media…
            </div>
          ) : mediaError ? (
            <p className={`text-[11px] ${palette.textMuted}`}>{mediaError}</p>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <ImageOff size={20} className={palette.textSubtle} />
              <p className={`text-[11px] ${palette.textMuted}`}>No media shared yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {media.map((item) => {
                const isImage = item.mimeType?.startsWith('image/') ?? false;
                return (
                  <div key={item.id} className="relative group aspect-square">
                    {isImage && item.url ? (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div
                        className={`w-full h-full rounded-lg flex flex-col items-center justify-center gap-1 border p-1 ${palette.border}`}
                        title={item.size ? `${item.name} · ${formatSize(item.size)}` : item.name}
                      >
                        <FileText size={16} className={palette.textSubtle} />
                        <span className={`text-[8px] truncate w-full text-center ${palette.textMuted}`}>
                          {item.name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => onDeleteMedia(item)}
                      disabled={deletingMediaId === item.id}
                      title="Delete"
                      className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer disabled:opacity-100"
                    >
                      {deletingMediaId === item.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Trash2 size={10} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
