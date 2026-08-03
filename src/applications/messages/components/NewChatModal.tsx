import React, { useState } from 'react';
import { X, Search, Users, Hash, Radio, UserPlus, Check } from 'lucide-react';
import { ChatChannel, UserPresence } from '../types';
import { useSystemStore } from '../../../systemStore';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (channel: ChatChannel) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChannel,
}) => {
  const [tab, setTab] = useState<'dm' | 'channel' | 'broadcast'>('dm');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const currentUser = useSystemStore((state) => state.currentUser);
  const usersList = useSystemStore((state) => state.usersList);

  if (!isOpen) return null;

  // Sample mock directory users
  const contacts = [
    { id: 'sarah', name: 'Sarah Jenkins', role: 'Lead UI/UX Designer', presence: 'online' as UserPresence },
    { id: 'alex', name: 'Alex Rivera', role: 'Full-stack Architect', presence: 'away' as UserPresence },
    { id: 'david', name: 'David Vance', role: 'Product Marketing Lead', presence: 'busy' as UserPresence },
    { id: 'elena', name: 'Elena Rostova', role: 'QA Automation Engineer', presence: 'online' as UserPresence },
    { id: 'marcus', name: 'Marcus Chen', role: 'DevOps & Cloud Specialist', presence: 'dnd' as UserPresence },
  ].concat(
    usersList
      .filter((u) => u.username !== currentUser?.username)
      .map((u) => ({
        id: u.username,
        name: u.fullName || u.username,
        role: u.email || 'Team Member',
        presence: 'online' as UserPresence,
      }))
  );

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartDM = (contact: typeof contacts[0]) => {
    const newDM: ChatChannel = {
      id: contact.id,
      name: contact.name,
      type: 'dm',
      role: contact.role,
      status: contact.presence,
      unread: 0,
      lastMessage: 'Conversation started',
      lastTime: 'Just now',
      description: `${contact.role} • Direct Message`,
    };
    onCreateChannel(newDM);
    onClose();
  };

  const handleCreateGroupOrChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    const isBroadcast = tab === 'broadcast';
    const formattedName = channelName.startsWith('#') || channelName.startsWith('📢')
      ? channelName
      : isBroadcast
      ? `📢 ${channelName}`
      : `# ${channelName}`;

    const newChan: ChatChannel = {
      id: `ch-${Date.now()}`,
      name: formattedName,
      type: isBroadcast ? 'broadcast' : 'group',
      unread: 0,
      lastMessage: isBroadcast ? 'Broadcast channel initialized' : 'Channel created',
      lastTime: 'Just now',
      membersCount: 1,
      description: description || (isBroadcast ? 'Official broadcast announcements.' : 'Team discussion channel.'),
    };

    onCreateChannel(newChan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-700 bg-[#1e293b] text-slate-100 flex flex-col overflow-hidden max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-700/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <span>New Conversation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-700/80 bg-slate-900/40 p-1 gap-1">
          <button
            onClick={() => setTab('dm')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'dm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Direct Message</span>
          </button>
          <button
            onClick={() => setTab('channel')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'channel' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Channel</span>
          </button>
          <button
            onClick={() => setTab('broadcast')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'broadcast' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Broadcast</span>
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'dm' ? (
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-3 min-h-[260px]">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team directory by name or role..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Directory List */}
            <div className="space-y-1">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No matching contacts found.</div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleStartDM(contact)}
                    className="p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1e293b] ${
                            contact.presence === 'online'
                              ? 'bg-emerald-500'
                              : contact.presence === 'away'
                              ? 'bg-amber-500'
                              : contact.presence === 'busy'
                              ? 'bg-rose-500'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{contact.name}</span>
                        <span className="text-[10px] text-slate-400">{contact.role}</span>
                      </div>
                    </div>
                    <button className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer transition-colors">
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateGroupOrChannel} className="p-4 flex-1 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {tab === 'broadcast' ? 'Broadcast Channel Name' : 'Channel Name'}
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={tab === 'broadcast' ? 'e.g. 📢 Announcements' : 'e.g. # product-roadmap'}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this channel..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 h-20 resize-none"
              />
            </div>

            {tab === 'broadcast' && (
              <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex items-start gap-2">
                <Radio className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  In a <strong>Broadcast channel</strong>, administrators send official announcements out to all team members.
                </p>
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-slate-700/80 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-colors ${
                  tab === 'broadcast' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {tab === 'broadcast' ? 'Create Broadcast' : 'Create Channel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
