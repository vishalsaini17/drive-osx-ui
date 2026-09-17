import React, { useEffect, useState } from 'react';
import { MessagingService, Conversation } from '../../../platform/messaging/MessagingService';
import WordBookModal from './WordBookModal';

export type ShareFormat = 'book' | 'docx' | 'pdf' | 'txt' | 'html' | 'md';

const FORMAT_OPTIONS: { id: ShareFormat; label: string }[] = [
  { id: 'book', label: 'Word Book (.book)' },
  { id: 'docx', label: 'Microsoft Word (.docx)' },
  { id: 'pdf', label: 'PDF (.pdf)' },
  { id: 'txt', label: 'Plain Text (.txt)' },
  { id: 'html', label: 'Web Page (.html)' },
  { id: 'md', label: 'Markdown (.md)' },
];

interface ShareToChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  docTitle: string;
  onGetBlob: (format: ShareFormat) => Promise<{ blob: Blob; filename: string }>;
}

/**
 * Sends the document into an existing chat conversation as a real file
 * attachment (`MessagingService.sendFileMessage` — the same endpoint the
 * Messages app's own "+" attach menu uses), not a fake share record. Defaults
 * to this app's own `.book` format (a straight save, no conversion); picking
 * anything else still asks for confirmation before it actually sends,
 * since a format change is a real, visible difference in what the recipient
 * gets.
 */
export default function ShareToChatModal({ isOpen, onClose, docTitle, onGetBlob }: ShareToChatModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [format, setFormat] = useState<ShareFormat>('book');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedConversationId(null);
      setFormat('book');
      setConfirming(false);
      setError(null);
      return;
    }
    setLoadingConversations(true);
    MessagingService.listConversations()
      .then(setConversations)
      .catch(() => setError('Could not load your conversations.'))
      .finally(() => setLoadingConversations(false));
  }, [isOpen]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) ?? null;
  const selectedFormatLabel = FORMAT_OPTIONS.find((f) => f.id === format)?.label ?? format;

  const handleSend = async () => {
    if (!selectedConversationId) return;
    setSending(true);
    setError(null);
    try {
      const { blob, filename } = await onGetBlob(format);
      const file = new File([blob], filename, { type: blob.type });
      await MessagingService.sendFileMessage(selectedConversationId, file);
      onClose();
    } catch (err) {
      console.error('Failed to share to chat:', err);
      setError(err instanceof Error ? err.message : 'Could not send the document. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <WordBookModal
      isOpen={isOpen}
      onClose={onClose}
      title={confirming ? 'Confirm and send' : 'Share to Chat'}
      maxWidthClass="max-w-sm"
      footer={
        confirming ? (
          <>
            <button
              onClick={() => setConfirming(false)}
              disabled={sending}
              className="px-3 py-1.5 text-xs rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 cursor-pointer disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() => void handleSend()}
              disabled={sending}
              className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 cursor-pointer">
              Cancel
            </button>
            <button
              onClick={() => setConfirming(true)}
              disabled={!selectedConversationId}
              className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </>
        )
      }
    >
      {error && <div className="mb-2 text-[11px] text-red-600">{error}</div>}

      {confirming ? (
        <div className="space-y-2">
          <p className="text-xs text-zinc-700">
            Send <span className="font-medium">{docTitle}</span> as <span className="font-medium">{selectedFormatLabel}</span> to{' '}
            <span className="font-medium">{selectedConversation?.title || (selectedConversation?.kind === 'group' ? 'this group' : 'this conversation')}</span>?
          </p>
          <p className="text-[11px] text-zinc-400">This sends the current saved version of your document as a file attachment.</p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <div className="text-[11px] font-medium text-zinc-500 mb-1">Send to</div>
            <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded divide-y divide-zinc-100">
              {loadingConversations && <div className="px-2 py-2 text-[11px] text-zinc-400">Loading conversations…</div>}
              {!loadingConversations && conversations.length === 0 && (
                <div className="px-2 py-2 text-[11px] text-zinc-400">No conversations yet — start one in Messages first.</div>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedConversationId(c.id)}
                  className={`w-full text-left px-2 py-1.5 text-xs cursor-pointer ${
                    selectedConversationId === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {c.title || (c.kind === 'group' ? 'Group chat' : 'Direct message')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-zinc-500 mb-1">Send as</div>
            <select value={format} onChange={(e) => setFormat(e.target.value as ShareFormat)} className="w-full border border-zinc-300 rounded px-2 py-1.5 text-xs">
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-400 mt-1">
              Defaults to Word Book (.book) — this app's own format, opened straight back up by double-clicking it in DriveOS.
            </p>
          </div>
        </>
      )}
    </WordBookModal>
  );
}
