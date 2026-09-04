import React, { useState } from 'react';
import {
  X, Phone, Video, Star, Eraser, LogOut, Flag, Pencil, UserPlus, Loader2,
  Users, Check,
} from 'lucide-react';
import type { Conversation, MediaItem, LinkItem } from '../../platform/messaging/MessagingService';
import type { Contact } from '../../platform/contacts/ContactsService';
import type { MessengerPalette } from './useMessengerTheme';
import SharedMediaSection from './SharedMediaSection';

/**
 * The right-hand group info panel — WhatsApp Web's "click the group name"
 * view, for group conversations the way `ContactDetailsPanel` is for direct
 * ones. Deliberately presentational for the same reason that one is: every
 * action is a callback owned by Messenger, which already holds every other
 * piece of conversation state.
 */

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '??';
}

// Same low-fidelity convention as a personal avatar (Settings' Profile tab):
// an emoji shorthand, or a pasted image URL — not an upload.
const GROUP_AVATAR_PRESETS = ['👥', '🎉', '💼', '🚀', '📁', '🏠', '🎓', '⚽', '🎮', '🍕', '✈️', '💡'];

export interface GroupDetailsPanelProps {
  conversation: Conversation;
  currentUsername: string | undefined;
  palette: MessengerPalette;

  onClose: () => void;

  onToggleFavourite: () => void;
  isTogglingFavourite: boolean;

  onStartCall: (kind: 'voice' | 'video') => void;
  callInProgress: 'voice' | 'video' | null;

  onUpdateDescription: (description: string) => void;
  isUpdatingDescription: boolean;

  onRenameGroup: (title: string) => void;
  isRenamingGroup: boolean;

  onChangeAvatar: (avatarUrl: string) => void;
  isChangingAvatar: boolean;

  allContacts: Contact[];
  onAddMember: (userId: string) => void;
  isAddingMember: boolean;

  onClearChat: () => void;
  isClearingChat: boolean;

  onExitGroup: () => void;
  isExitingGroup: boolean;

  onReportGroup: (reason: string) => void;
  isReportingGroup: boolean;

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

export default function GroupDetailsPanel({
  conversation,
  currentUsername,
  palette,
  onClose,
  onToggleFavourite,
  isTogglingFavourite,
  onStartCall,
  callInProgress,
  onUpdateDescription,
  isUpdatingDescription,
  onRenameGroup,
  isRenamingGroup,
  onChangeAvatar,
  isChangingAvatar,
  allContacts,
  onAddMember,
  isAddingMember,
  onClearChat,
  isClearingChat,
  onExitGroup,
  isExitingGroup,
  onReportGroup,
  isReportingGroup,
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
}: GroupDetailsPanelProps) {
  const myRole = conversation.participants.find((p) => p.username === currentUsername)?.role;
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(conversation.topic ?? '');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(conversation.title);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmReport, setConfirmReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const memberIds = new Set(conversation.participants.map((p) => p.id));
  const addableContacts = allContacts.filter((contact) => contact.userId && !memberIds.has(contact.userId));

  return (
    <div className={`w-80 h-full shrink-0 border-l ${palette.border} ${palette.panelBg} flex flex-col min-h-0`}>
      <div className={`p-3 border-b ${palette.border} flex items-center justify-between shrink-0`}>
        <h3 className={`text-xs font-bold ${palette.text}`}>Group info</h3>
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
          <div className="relative">
            <button
              onClick={() => isAdmin && setShowAvatarPicker((value) => !value)}
              disabled={!isAdmin}
              title={isAdmin ? 'Change group photo' : undefined}
              className={`w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-sm overflow-hidden text-3xl ${
                isAdmin ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {conversation.avatarUrl?.startsWith('http') ? (
                <img src={conversation.avatarUrl} alt={conversation.title} className="w-full h-full object-cover" />
              ) : conversation.avatarUrl ? (
                conversation.avatarUrl
              ) : (
                <Users size={30} />
              )}
            </button>
            {isAdmin && (
              <span className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-blue-600 text-white shadow">
                <Pencil size={10} />
              </span>
            )}

            {showAvatarPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAvatarPicker(false)} />
                <div
                  className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-64 p-3 rounded-2xl border shadow-2xl ${palette.panelBg} ${palette.border}`}
                >
                  <div className="flex flex-wrap gap-1.5 justify-center mb-2">
                    {GROUP_AVATAR_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onChangeAvatar(emoji);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-8 h-8 rounded-lg text-base flex items-center justify-center cursor-pointer border ${palette.border} ${palette.hover}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={avatarUrlDraft}
                      onChange={(event) => setAvatarUrlDraft(event.target.value)}
                      placeholder="Or paste an image URL"
                      className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border text-[11px] focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
                    />
                    <button
                      onClick={() => {
                        if (!avatarUrlDraft.trim()) return;
                        onChangeAvatar(avatarUrlDraft.trim());
                        setAvatarUrlDraft('');
                        setShowAvatarPicker(false);
                      }}
                      disabled={!avatarUrlDraft.trim() || isChangingAvatar}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[11px] font-bold cursor-pointer"
                    >
                      {isChangingAvatar ? <Loader2 size={12} className="animate-spin" /> : 'Set'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {editingName ? (
            <div className="w-full flex items-center gap-1.5">
              <input
                autoFocus
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value.slice(0, 120))}
                className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border text-xs text-center focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
              />
              <button
                onClick={() => setEditingName(false)}
                className={`p-1.5 rounded-lg cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
              >
                <X size={12} />
              </button>
              <button
                onClick={() => {
                  if (!nameDraft.trim()) return;
                  onRenameGroup(nameDraft.trim());
                  setEditingName(false);
                }}
                disabled={!nameDraft.trim() || isRenamingGroup}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white cursor-pointer"
              >
                {isRenamingGroup ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className={`text-sm font-bold ${palette.text}`}>{conversation.title}</div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setNameDraft(conversation.title);
                    setEditingName(true);
                  }}
                  className={`p-1 rounded-lg cursor-pointer ${palette.hover}`}
                  title="Rename group"
                >
                  <Pencil size={11} className={palette.textSubtle} />
                </button>
              )}
            </div>
          )}
          <div className={`text-[11px] ${palette.textMuted}`}>{conversation.participants.length} members</div>

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onStartCall('voice')}
              disabled={callInProgress !== null}
              title="Voice call"
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
              disabled={callInProgress !== null}
              title="Video call"
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

        <div className={`p-3 border-b ${palette.border}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wide ${palette.textSubtle}`}>Description</span>
            {isAdmin && !editingDescription && (
              <button
                onClick={() => {
                  setDescriptionDraft(conversation.topic ?? '');
                  setEditingDescription(true);
                }}
                className={`p-1 rounded-lg ${palette.hover} cursor-pointer`}
                title="Edit description"
              >
                <Pencil size={12} className={palette.textSubtle} />
              </button>
            )}
          </div>
          {editingDescription ? (
            <div className="space-y-1.5">
              <textarea
                autoFocus
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value.slice(0, 500))}
                rows={3}
                placeholder="What's this group about?"
                className={`w-full px-2.5 py-2 rounded-xl border text-xs resize-none focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingDescription(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUpdateDescription(descriptionDraft.trim());
                    setEditingDescription(false);
                  }}
                  disabled={isUpdatingDescription}
                  className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isUpdatingDescription && <Loader2 size={12} className="animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-[11px] leading-relaxed ${conversation.topic ? palette.textMuted : palette.textSubtle}`}>
              {conversation.topic || 'No description yet. Add one so members know what this group is for.'}
            </p>
          )}
        </div>

        <div className={`p-2 border-b ${palette.border}`}>
          <button
            onClick={onToggleFavourite}
            disabled={isTogglingFavourite}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-wait ${palette.hover}`}
          >
            <Star size={15} className={conversation.isFavourite ? 'fill-amber-400 text-amber-400' : palette.textMuted} />
            <span className={`text-xs font-bold ${palette.text}`}>
              {conversation.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            </span>
            {isTogglingFavourite && <Loader2 size={12} className={`animate-spin ml-auto ${palette.textMuted}`} />}
          </button>

          {confirmClear ? (
            <div className={`m-1 p-2.5 rounded-xl border ${palette.border}`}>
              <p className={`text-[11px] leading-relaxed mb-2 ${palette.textMuted}`}>
                Clear this chat? Your message history disappears, but the group stays in your list — this only
                clears messages, it does not remove you from the group.
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

          {confirmExit ? (
            <div className={`m-1 p-2.5 rounded-xl border ${palette.border}`}>
              <p className={`text-[11px] leading-relaxed mb-2 ${palette.textMuted}`}>
                Exit "{conversation.title}"? You will stop receiving messages, and someone still in the group has
                to add you back.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmExit(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onExitGroup}
                  disabled={isExitingGroup}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isExitingGroup && <Loader2 size={12} className="animate-spin" />}
                  Exit group
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmExit(true)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer ${palette.hover}`}
            >
              <LogOut size={15} className="text-rose-500" />
              <span className="text-xs font-bold text-rose-500">Exit group</span>
            </button>
          )}

          {confirmReport ? (
            <div className={`m-1 p-2.5 rounded-xl border ${palette.border}`}>
              <p className={`text-[11px] leading-relaxed mb-2 ${palette.textMuted}`}>
                Report "{conversation.title}"? Tell us why — this goes to your organisation's audit log for review.
              </p>
              <textarea
                autoFocus
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value.slice(0, 1000))}
                rows={3}
                placeholder="What's wrong with this group?"
                className={`w-full mb-2 px-2.5 py-2 rounded-xl border text-xs resize-none focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setConfirmReport(false);
                    setReportReason('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${palette.border} ${palette.hover} ${palette.text}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onReportGroup(reportReason.trim());
                    setConfirmReport(false);
                    setReportReason('');
                  }}
                  disabled={!reportReason.trim() || isReportingGroup}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isReportingGroup && <Loader2 size={12} className="animate-spin" />}
                  Submit report
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReport(true)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer ${palette.hover}`}
            >
              <Flag size={15} className={palette.textMuted} />
              <span className={`text-xs font-bold ${palette.text}`}>Report group</span>
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

        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide ${palette.textSubtle}`}>
              {conversation.participants.length} members
            </span>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember((value) => !value)}
                className={`p-1 rounded-lg ${palette.hover} cursor-pointer`}
                title="Add member"
              >
                <UserPlus size={13} className={palette.textSubtle} />
              </button>
            )}
          </div>

          {isAdmin && showAddMember && (
            <div className={`mb-2 rounded-xl border ${palette.border} max-h-48 overflow-y-auto custom-scrollbar`}>
              {addableContacts.length === 0 ? (
                <p className={`text-[11px] text-center py-4 px-2 ${palette.textMuted}`}>
                  Everyone in your contacts is already in this group.
                </p>
              ) : (
                addableContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => onAddMember(contact.userId!)}
                    disabled={isAddingMember}
                    className={`w-full p-2 flex items-center gap-2.5 text-left cursor-pointer disabled:opacity-50 ${palette.hover}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {initials(contact.displayName)}
                    </div>
                    <span className={`text-xs font-bold truncate ${palette.text}`}>{contact.displayName}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="space-y-0.5">
            {conversation.participants.map((member) => {
              const isAdmin = member.role === 'owner' || member.role === 'admin';
              const isYou = member.username === currentUsername;
              return (
                <div key={member.id} className="p-2 rounded-xl flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {initials(member.fullName)}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                        palette.isDark ? 'border-[#1e293b]' : 'border-white'
                      } ${member.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate ${palette.text}`}>
                      {member.fullName}
                      {isYou && <span className={palette.textMuted}> (You)</span>}
                    </div>
                    <div className={`text-[10px] truncate ${palette.textMuted}`}>@{member.username}</div>
                  </div>
                  {isAdmin && (
                    <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-600/15 text-blue-500 text-[9px] font-bold">
                      <Check size={9} /> Admin
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
