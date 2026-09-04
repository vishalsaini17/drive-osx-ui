import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Share2,
  Users,
  User,
  Link,
  Copy,
  Check,
  Clock,
  Shield,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { FileItem, ResourceRole } from '../../../platform/types';
import { FileService, ShareView, EligibleUser, FileActivityEntry } from '../../../platform/files/FileService';

interface ShareModalProps {
  fileItem: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  /** Lets the file list update its shared badge immediately, without a full refetch. */
  onSharedChanged: (fileId: string, isShared: boolean) => void;
}

const ROLE_LABELS: Record<ResourceRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  commenter: 'Commenter',
  viewer: 'Viewer',
};

const EXPIRATION_OPTIONS = ['Never', '24 Hours', '7 Days', '30 Days'] as const;
type ExpirationOption = (typeof EXPIRATION_OPTIONS)[number];

function expirationToIso(option: ExpirationOption): string | undefined {
  const hours = { Never: 0, '24 Hours': 24, '7 Days': 24 * 7, '30 Days': 24 * 30 }[option];
  if (!hours) return undefined;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function initialsOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function ShareModal({ fileItem, isOpen, onClose, onSharedChanged }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'link' | 'activity'>('users');

  // People with access
  const [shares, setShares] = useState<ShareView[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string | null>(null);

  // Add-user autocomplete
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<EligibleUser | null>(null);
  const [suggestions, setSuggestions] = useState<EligibleUser[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [newUserRole, setNewUserRole] = useState<ResourceRole>('viewer');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingShareId, setRemovingShareId] = useState<string | null>(null);

  // Public link
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [linkRole, setLinkRole] = useState<ResourceRole>('viewer');
  const [linkExpiration, setLinkExpiration] = useState<ExpirationOption>('Never');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Activity
  const [activity, setActivity] = useState<FileActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const activityLoadedRef = useRef(false);

  const fileId = fileItem?.id ?? null;
  const peopleShares = shares.filter((share) => share.principalType === 'user' || share.principalType === 'team');
  const linkShare = shares.find((share) => share.principalType === 'link') ?? null;

  async function loadShares(id: string) {
    setSharesLoading(true);
    setSharesError(null);
    try {
      const data = await FileService.listShares(id);
      setShares(data);
      onSharedChanged(id, data.length > 0);
      const currentLink = data.find((share) => share.principalType === 'link') ?? null;
      setLinkEnabled(!!currentLink);
      setLinkRole(currentLink?.role ?? 'viewer');
    } catch (error) {
      setSharesError(describeError(error));
    } finally {
      setSharesLoading(false);
    }
  }

  // Reset and load fresh data every time a different item is opened.
  useEffect(() => {
    if (!isOpen || !fileId) return;
    setActiveTab('users');
    setQuery('');
    setSelectedUser(null);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setAddError(null);
    setSharesError(null);
    setFreshToken(null);
    setCopiedLink(false);
    setLinkError(null);
    setLinkExpiration('Never');
    activityLoadedRef.current = false;
    setActivity([]);
    setActivityError(null);
    void loadShares(fileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fileId]);

  // Debounced eligible-user search.
  useEffect(() => {
    if (!fileId || selectedUser) return;
    const term = query.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setSuggestionsError(null);
      setSuggestionsOpen(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    const timer = setTimeout(async () => {
      try {
        const results = await FileService.searchEligibleUsers(fileId, term);
        if (cancelled) return;
        setSuggestions(results);
        setSuggestionsOpen(true);
      } catch (error) {
        if (!cancelled) setSuggestionsError(describeError(error));
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, fileId, selectedUser]);

  // Activity is fetched lazily, the first time that tab is opened.
  useEffect(() => {
    if (activeTab !== 'activity' || !fileId || activityLoadedRef.current) return;
    activityLoadedRef.current = true;
    setActivityLoading(true);
    setActivityError(null);
    FileService.listFileActivity(fileId)
      .then(setActivity)
      .catch((error) => setActivityError(describeError(error)))
      .finally(() => setActivityLoading(false));
  }, [activeTab, fileId]);

  if (!isOpen || !fileItem) return null;

  const handlePickSuggestion = (user: EligibleUser) => {
    setSelectedUser(user);
    setQuery(`${user.name} (${user.email})`);
    setSuggestions([]);
    setSuggestionsOpen(false);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (selectedUser) setSelectedUser(null);
  };

  const handleAddUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fileId || addBusy) return;
    if (!selectedUser && !query.trim()) return;

    setAddError(null);
    setAddBusy(true);
    setSuggestionsOpen(false);
    try {
      await FileService.shareWithUser(
        fileId,
        selectedUser ? { userId: selectedUser.id } : { usernameOrEmail: query.trim() },
        newUserRole,
      );
      setQuery('');
      setSelectedUser(null);
      setSuggestions([]);
      await loadShares(fileId);
    } catch (error) {
      setAddError(describeError(error));
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveUser = async (shareId: string) => {
    if (!fileId) return;
    setRemovingShareId(shareId);
    setSharesError(null);
    try {
      await FileService.revokeShare(shareId);
      await loadShares(fileId);
    } catch (error) {
      setSharesError(describeError(error));
    } finally {
      setRemovingShareId(null);
    }
  };

  const handleSavePublicLink = async () => {
    if (!fileId || linkBusy) return;
    setLinkBusy(true);
    setLinkError(null);
    try {
      if (linkEnabled) {
        // At most one active link per file from this dialog's point of view:
        // replace rather than stack a second one on top.
        if (linkShare) await FileService.revokeShare(linkShare.id);
        const token = await FileService.createShareLink(fileId, linkRole, expirationToIso(linkExpiration));
        setFreshToken(token);
      } else if (linkShare) {
        await FileService.revokeShare(linkShare.id);
        setFreshToken(null);
      }
      await loadShares(fileId);
    } catch (error) {
      setLinkError(describeError(error));
    } finally {
      setLinkBusy(false);
    }
  };

  const shareUrl = freshToken ? `${window.location.origin}/s/${freshToken}` : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold truncate max-w-[280px]">
                Share "{fileItem.name}"
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Manage access permissions and public links
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/50 px-3 pt-2 gap-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Share with People
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'link'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            Public Link
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'activity'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Activity History
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[380px]">
          {/* TAB 1: SHARE WITH PEOPLE */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleAddUser} className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Enter email or username..."
                      value={query}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                      className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />

                    {suggestionsOpen && (
                      <div className="absolute z-10 top-10 left-0 right-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-48 overflow-y-auto">
                        {suggestionsLoading && (
                          <div className="flex items-center gap-2 p-2.5 text-[11px] text-zinc-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                          </div>
                        )}
                        {!suggestionsLoading && suggestionsError && (
                          <div className="flex items-center gap-2 p-2.5 text-[11px] text-rose-500">
                            <AlertCircle className="w-3.5 h-3.5" /> {suggestionsError}
                          </div>
                        )}
                        {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && (
                          <div className="p-2.5 text-[11px] text-zinc-500">
                            No matching contacts. Only people in your contacts can be added.
                          </div>
                        )}
                        {!suggestionsLoading &&
                          !suggestionsError &&
                          suggestions.map((user) => (
                            <button
                              type="button"
                              key={user.id}
                              onClick={() => handlePickSuggestion(user)}
                              className="w-full flex items-center gap-2.5 p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/60 cursor-pointer"
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {initialsOf(user.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate">{user.name}</div>
                                <div className="text-[10px] text-zinc-400 truncate">{user.email}</div>
                                <div className="text-[10px] text-zinc-400/80 truncate">@{user.username}</div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as ResourceRole)}
                    className="h-9 px-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none cursor-pointer"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="commenter">Commenter</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!query.trim() || addBusy}
                    className="h-9 px-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    {addBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Add
                  </button>
                </div>
                {addError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
                    <AlertCircle className="w-3 h-3" /> {addError}
                  </div>
                )}
              </form>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  People with Access
                </span>

                {sharesLoading && (
                  <div className="flex items-center gap-2 p-2.5 text-[11px] text-zinc-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                  </div>
                )}

                {!sharesLoading && sharesError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
                    <AlertCircle className="w-3 h-3" /> {sharesError}
                  </div>
                )}

                {!sharesLoading && (
                  <>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                          {initialsOf(fileItem.name)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold">You</div>
                          <div className="text-[10px] text-zinc-400">Owner</div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold px-2 py-0.5 rounded-full">
                        Owner
                      </span>
                    </div>

                    {peopleShares.length === 0 && (
                      <div className="p-2.5 text-[11px] text-zinc-500">Not shared with anyone yet.</div>
                    )}

                    {peopleShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                            {initialsOf(share.principalName ?? '?')}
                          </div>
                          <div>
                            <div className="text-xs font-semibold truncate max-w-[200px]">
                              {share.principalName ?? 'Unknown'}
                              {share.principalType === 'team' ? ' (Team)' : ''}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Added {new Date(share.createdAt).toLocaleDateString()}
                              {share.principalUsername ? ` · @${share.principalUsername}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium px-2 py-0.5 rounded-full capitalize">
                            {ROLE_LABELS[share.role]}
                          </span>
                          <button
                            onClick={() => handleRemoveUser(share.id)}
                            disabled={removingShareId === share.id}
                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors disabled:opacity-40"
                            title="Remove access"
                          >
                            {removingShareId === share.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PUBLIC LINK */}
          {activeTab === 'link' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Link className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Public Link Sharing</div>
                    <div className="text-[10px] text-zinc-400">
                      Anyone with this link can access the file
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkEnabled}
                    onChange={(e) => setLinkEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {linkEnabled && (
                <div className="flex flex-col gap-3.5 pt-1">
                  {freshToken ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                        Generated Share URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="flex-1 h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 font-mono text-purple-600 dark:text-purple-400"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="h-9 px-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ) : linkShare ? (
                    <div className="p-2.5 text-[11px] text-zinc-500 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                      A public link is active, created {new Date(linkShare.createdAt).toLocaleDateString()}. For
                      security, the link itself is only shown once, right after it's created — change the settings
                      below and save to generate a new one you can copy.
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-purple-500" />
                        Access Permission
                      </label>
                      <select
                        value={linkRole}
                        onChange={(e) => setLinkRole(e.target.value as ResourceRole)}
                        className="w-full h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none cursor-pointer"
                      >
                        <option value="viewer">Can View Only</option>
                        <option value="commenter">Can Comment</option>
                        <option value="editor">Can Edit & Download</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-500" />
                        Expiration Date
                      </label>
                      <select
                        value={linkExpiration}
                        onChange={(e) => setLinkExpiration(e.target.value as ExpirationOption)}
                        className="w-full h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none cursor-pointer"
                      >
                        {EXPIRATION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {linkError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
                      <AlertCircle className="w-3 h-3" /> {linkError}
                    </div>
                  )}

                  <button
                    onClick={handleSavePublicLink}
                    disabled={linkBusy}
                    className="w-full py-2 mt-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    {linkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {linkShare ? 'Generate New Link' : 'Create Link'}
                  </button>
                </div>
              )}

              {!linkEnabled && linkShare && (
                <div className="flex flex-col gap-2">
                  {linkError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
                      <AlertCircle className="w-3 h-3" /> {linkError}
                    </div>
                  )}
                  <button
                    onClick={handleSavePublicLink}
                    disabled={linkBusy}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {linkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Turn Off Public Link
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVITY HISTORY */}
          {activeTab === 'activity' && (
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Audit Trail & History
              </span>

              {activityLoading && (
                <div className="flex items-center gap-2 p-2.5 text-[11px] text-zinc-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                </div>
              )}

              {!activityLoading && activityError && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
                  <AlertCircle className="w-3 h-3" /> {activityError}
                </div>
              )}

              {!activityLoading && !activityError && activity.length === 0 && (
                <div className="p-2.5 text-[11px] text-zinc-500">No sharing activity yet.</div>
              )}

              {!activityLoading && !activityError && activity.length > 0 && (
                <div className="flex flex-col gap-2.5 relative pl-4 border-l-2 border-purple-500/30 ml-2">
                  {activity.map((log) => (
                    <div key={log.id} className="relative group">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-white dark:ring-zinc-900" />
                      <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1">
                        <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {log.action.replace(/[._]/g, ' ')}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span>By {log.actorName ?? 'Someone'}</span>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
