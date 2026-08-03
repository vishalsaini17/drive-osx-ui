import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, Trash2, X, Plus } from 'lucide-react';
import { DocumentComment } from '../types';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comments: DocumentComment[];
  onAddComment: (text: string) => void;
  onToggleResolve: (id: string) => void;
  onDeleteComment: (id: string) => void;
}

export default function CommentsDrawer({
  isOpen,
  onClose,
  comments,
  onAddComment,
  onToggleResolve,
  onDeleteComment,
}: CommentsDrawerProps) {
  if (!isOpen) return null;

  const [newCommentText, setNewCommentText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText.trim());
    setNewCommentText('');
  };

  const activeComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  return (
    <div className="w-72 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full shrink-0 text-xs select-none">
      {/* Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <span className="font-bold">Comments ({comments.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-[1.5]" />
            <p>No comments yet.</p>
            <p className="text-[10px] text-zinc-500 mt-1">
              Add feedback or document review notes below.
            </p>
          </div>
        ) : (
          <>
            {activeComments.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-600 dark:text-purple-400">{c.author}</span>
                  <span className="text-[10px] text-zinc-400">{c.timestamp}</span>
                </div>
                <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">{c.text}</p>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-700/50 mt-1">
                  <button
                    onClick={() => onToggleResolve(c.id)}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark Resolved
                  </button>
                  <button
                    onClick={() => onDeleteComment(c.id)}
                    className="text-[10px] text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}

            {resolvedComments.length > 0 && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  Resolved ({resolvedComments.length})
                </span>
                {resolvedComments.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 opacity-60 flex justify-between items-center mb-1.5"
                  >
                    <div className="truncate">
                      <div className="font-semibold line-through truncate">{c.text}</div>
                      <div className="text-[9px] text-zinc-400">{c.author}</div>
                    </div>
                    <button
                      onClick={() => onToggleResolve(c.id)}
                      className="p-1 hover:text-purple-500 cursor-pointer shrink-0"
                      title="Reopen"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col gap-2">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Add a comment or feedback..."
          className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-purple-500 resize-none h-16"
        />
        <button
          type="submit"
          disabled={!newCommentText.trim()}
          className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" /> Post Comment
        </button>
      </form>
    </div>
  );
}
