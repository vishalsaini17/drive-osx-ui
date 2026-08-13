import React, { useState } from 'react';
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
  Eye,
  Edit3,
  Trash2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { FileItem, SharedPermission, ActivityLogItem } from '../../../platform/types';

interface ShareModalProps {
  fileItem: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: FileItem) => void;
}

export default function ShareModal({ fileItem, isOpen, onClose, onUpdateItem }: ShareModalProps) {
  if (!isOpen || !fileItem) return null;

  const [activeTab, setActiveTab] = useState<'users' | 'link' | 'activity'>('users');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'viewer' | 'editor'>('viewer');
  
  // Public Link state
  const publicLinkConfig = fileItem.publicLink || {
    enabled: false,
    code: Math.random().toString(36).substring(2, 10),
    role: 'viewer',
    expiresAt: 'Never',
  };

  const [linkEnabled, setLinkEnabled] = useState(publicLinkConfig.enabled);
  const [linkRole, setLinkRole] = useState<'viewer' | 'editor'>(publicLinkConfig.role);
  const [linkExpiration, setLinkExpiration] = useState(publicLinkConfig.expiresAt || 'Never');
  const [copiedLink, setCopiedLink] = useState(false);

  const sharedUsers = fileItem.sharedWith || [
    { user: 'Alex Morgan (alex@webos.app)', role: 'editor', addedAt: '2 days ago' },
  ];

  const activityLogs = fileItem.activityHistory || [
    { id: 'act-1', action: 'Created item', user: 'Admin', timestamp: fileItem.createdAt },
    { id: 'act-2', action: 'Shared with Alex Morgan', user: 'Admin', timestamp: '2 days ago' },
  ];

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    const newPermission: SharedPermission = {
      user: newUserEmail.trim(),
      role: newUserRole,
      addedAt: new Date().toLocaleDateString(),
    };

    const updatedSharedWith = [...sharedUsers, newPermission];
    const newLog: ActivityLogItem = {
      id: `act-${Date.now()}`,
      action: `Shared with ${newUserEmail.trim()} as ${newUserRole}`,
      user: 'Admin',
      timestamp: 'Just now',
    };

    const updatedItem: FileItem = {
      ...fileItem,
      sharedWith: updatedSharedWith,
      activityHistory: [newLog, ...activityLogs],
    };

    onUpdateItem(updatedItem);
    setNewUserEmail('');
  };

  const handleRemoveUser = (userToRemove: string) => {
    const updatedSharedWith = sharedUsers.filter((u) => u.user !== userToRemove);
    const newLog: ActivityLogItem = {
      id: `act-${Date.now()}`,
      action: `Removed access for ${userToRemove}`,
      user: 'Admin',
      timestamp: 'Just now',
    };

    const updatedItem: FileItem = {
      ...fileItem,
      sharedWith: updatedSharedWith,
      activityHistory: [newLog, ...activityLogs],
    };

    onUpdateItem(updatedItem);
  };

  const handleSavePublicLink = () => {
    const updatedLink = {
      enabled: linkEnabled,
      code: publicLinkConfig.code,
      role: linkRole,
      expiresAt: linkExpiration,
    };

    const newLog: ActivityLogItem = {
      id: `act-${Date.now()}`,
      action: linkEnabled
        ? `Enabled public share link (${linkRole} permissions, expires: ${linkExpiration})`
        : 'Disabled public share link',
      user: 'Admin',
      timestamp: 'Just now',
    };

    const updatedItem: FileItem = {
      ...fileItem,
      publicLink: updatedLink,
      activityHistory: [newLog, ...activityLogs],
    };

    onUpdateItem(updatedItem);
  };

  const shareUrl = `https://webos.drive/s/${publicLinkConfig.code}`;

  const handleCopyLink = () => {
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
              <form onSubmit={handleAddUser} className="flex gap-2">
                <div className="flex-1 relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Enter email or username..."
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'viewer' | 'editor')}
                  className="h-9 px-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none cursor-pointer"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  type="submit"
                  disabled={!newUserEmail.trim()}
                  className="h-9 px-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Add
                </button>
              </form>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  People with Access
                </span>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Admin (You)</div>
                      <div className="text-[10px] text-zinc-400">Owner</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold px-2 py-0.5 rounded-full">
                    Owner
                  </span>
                </div>

                {sharedUsers.map((perm, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        {perm.user.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold truncate max-w-[200px]">
                          {perm.user}
                        </div>
                        <div className="text-[10px] text-zinc-400">Added {perm.addedAt}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium px-2 py-0.5 rounded-full capitalize">
                        {perm.role}
                      </span>
                      <button
                        onClick={() => handleRemoveUser(perm.user)}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                        title="Remove access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
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
                    onChange={(e) => {
                      setLinkEnabled(e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {linkEnabled && (
                <div className="flex flex-col gap-3.5 pt-1">
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-purple-500" />
                        Access Permission
                      </label>
                      <select
                        value={linkRole}
                        onChange={(e) => setLinkRole(e.target.value as 'viewer' | 'editor')}
                        className="w-full h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none cursor-pointer"
                      >
                        <option value="viewer">Can View Only</option>
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
                        onChange={(e) => setLinkExpiration(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none cursor-pointer"
                      >
                        <option value="Never">Never</option>
                        <option value="24 Hours">24 Hours</option>
                        <option value="7 Days">7 Days</option>
                        <option value="30 Days">30 Days</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePublicLink}
                    className="w-full py-2 mt-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    Save Link Settings
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

              <div className="flex flex-col gap-2.5 relative pl-4 border-l-2 border-purple-500/30 ml-2">
                {activityLogs.map((log) => (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-white dark:ring-zinc-900" />
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {log.action}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>By {log.user}</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
