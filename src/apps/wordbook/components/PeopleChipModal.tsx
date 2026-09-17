import React, { useEffect, useState } from 'react';
import { MessagingService, DirectoryUser } from '../../../platform/messaging/MessagingService';
import WordBookModal from './WordBookModal';

interface PeopleChipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (user: DirectoryUser) => void;
}

/** Searches the real user directory (`MessagingService.searchUsers`) — the same one the Messages app uses to find people — not a fake contact list. */
export default function PeopleChipModal({ isOpen, onClose, onInsert }: PeopleChipModalProps) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTerm('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      MessagingService.searchUsers(trimmed)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term, isOpen]);

  return (
    <WordBookModal isOpen={isOpen} onClose={onClose} title="Insert person" maxWidthClass="max-w-sm">
      <input
        autoFocus
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search people by name or username…"
        className="w-full border border-zinc-300 rounded px-2 py-1.5 text-sm mb-2"
      />
      <div className="max-h-64 overflow-y-auto space-y-1">
        {loading && <div className="text-xs text-zinc-400 px-1 py-2">Searching…</div>}
        {!loading && term.trim() && results.length === 0 && <div className="text-xs text-zinc-400 px-1 py-2">No one found.</div>}
        {results.map((user) => (
          <button
            key={user.id}
            onClick={() => {
              onInsert(user);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-100 text-left cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
              {user.fullName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-zinc-800 truncate">{user.fullName}</span>
              <span className="block text-[11px] text-zinc-400 truncate">{user.email}</span>
            </span>
          </button>
        ))}
      </div>
    </WordBookModal>
  );
}
