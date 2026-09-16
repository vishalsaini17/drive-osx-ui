import React, { useEffect, useRef, useState } from 'react';
import { Save, FileText, Star } from 'lucide-react';
import MenuBar from './MenuBar';

interface TitleBarProps {
  windowId: string;
  docTitle: string;
  isDirty: boolean;
  pageCount: number;
  isStarred: boolean;
  onSave: () => void;
  onRename: (newTitle: string) => void;
  onToggleStar: () => void;
}

/**
 * A light, Docs-style title row — deliberately its own component rather
 * than the shared `AppToolbar` (used platform-wide with a translucent
 * dark-glass look that every other app still shares unchanged). Wordbook
 * already presents as a light, paper-document app below this row; this
 * keeps the two consistent with each other rather than forcing wordbook's
 * chrome to match the OS-wide window style.
 */
export default function TitleBar({ windowId, docTitle, isDirty, pageCount, isStarred, onSave, onRename, onToggleStar }: TitleBarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(docTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // The title can change from outside mid-edit (e.g. Save As, or another
  // window renaming the same file) — never while the user is actively
  // typing here, which `editing` guards against clobbering their draft.
  useEffect(() => {
    if (!editing) setDraft(docTitle);
  }, [docTitle, editing]);

  const startEditing = () => {
    setDraft(docTitle);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const cleaned = draft.trim();
    if (cleaned && cleaned !== docTitle) onRename(cleaned);
    else setDraft(docTitle);
  };

  const cancel = () => {
    setDraft(docTitle);
    setEditing(false);
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  return (
    <div className="border-b border-zinc-200 bg-white shrink-0 select-none">
      <div className="h-11 px-3 flex items-center gap-2">
        <span className="shrink-0 text-blue-600">
          <FileText className="w-5 h-5" />
        </span>

        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') cancel();
            }}
            className="text-sm text-zinc-800 bg-transparent border border-purple-400 rounded px-1.5 py-0.5 outline-none min-w-0 max-w-xs"
          />
        ) : (
          <button
            type="button"
            title="Rename document"
            onClick={startEditing}
            className="text-sm text-zinc-800 truncate max-w-xs px-1.5 py-0.5 rounded border border-transparent hover:border-zinc-300 hover:bg-zinc-50 cursor-text text-left"
          >
            {docTitle}
          </button>
        )}

        <button
          type="button"
          title={isStarred ? 'Remove from starred' : 'Add to starred'}
          onClick={onToggleStar}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 cursor-pointer"
        >
          <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-zinc-400'}`} />
        </button>

        <div className="flex-1" />

        {isDirty && <span className="text-[11px] text-zinc-400 shrink-0">Unsaved changes</span>}
        <span className="text-[11px] text-zinc-400 tabular-nums shrink-0">
          {pageCount} page{pageCount === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          title="Save (Ctrl+S)"
          onClick={onSave}
          className="w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer text-zinc-600 hover:bg-zinc-100 shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
      </div>

      <MenuBar windowId={windowId} />
    </div>
  );
}
