import React, { useEffect, useRef, useState } from 'react';
import { Save, FileText, Star, Pencil, Eye, ChevronDown, Share2, MessageSquare, Link2 } from 'lucide-react';
import MenuBar from './MenuBar';
import { RibbonDropdown } from './ribbon/RibbonPrimitives';

interface TitleBarProps {
  windowId: string;
  docTitle: string;
  isDirty: boolean;
  pageCount: number;
  isStarred: boolean;
  onSave: () => void;
  onRename: (newTitle: string) => void;
  onToggleStar: () => void;
  isViewOnly: boolean;
  onSetViewOnly: (viewOnly: boolean) => void;
  canShare: boolean;
  onShare: () => void;
  onShareToChat: () => void;
}

/**
 * A light, Docs-style title row — deliberately its own component rather
 * than the shared `AppToolbar` (used platform-wide with a translucent
 * dark-glass look that every other app still shares unchanged). Wordbook
 * already presents as a light, paper-document app below this row; this
 * keeps the two consistent with each other rather than forcing wordbook's
 * chrome to match the OS-wide window style.
 */
export default function TitleBar({
  windowId,
  docTitle,
  isDirty,
  pageCount,
  isStarred,
  onSave,
  onRename,
  onToggleStar,
  isViewOnly,
  onSetViewOnly,
  canShare,
  onShare,
  onShareToChat,
}: TitleBarProps) {
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

        {/*
          Lives here rather than on the ribbon: switching to Viewing hides
          the ribbon entirely (WordBookShell), so the control that switches
          back has to sit somewhere that survives that — the title bar,
          which never disappears.
        */}
        <RibbonDropdown
          title="Editing mode"
          widthClass="w-48"
          trigger={
            <span className="flex items-center gap-1 px-1.5 h-7 rounded border border-zinc-200 hover:bg-zinc-50">
              {isViewOnly ? <Eye className="w-3.5 h-3.5 text-zinc-600" /> : <Pencil className="w-3.5 h-3.5 text-zinc-600" />}
              <span className="text-xs text-zinc-700">{isViewOnly ? 'Viewing' : 'Editing'}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </span>
          }
        >
          <button
            type="button"
            onClick={() => onSetViewOnly(false)}
            className={`w-full flex items-start gap-2 px-2 py-1.5 rounded text-left cursor-pointer ${!isViewOnly ? 'bg-purple-50' : 'hover:bg-zinc-100'}`}
          >
            <Pencil className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              <span className="block text-xs font-medium text-zinc-800">Editing</span>
              <span className="block text-[10.5px] text-zinc-500">Edit document directly</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onSetViewOnly(true)}
            className={`w-full flex items-start gap-2 px-2 py-1.5 rounded text-left cursor-pointer ${isViewOnly ? 'bg-purple-50' : 'hover:bg-zinc-100'}`}
          >
            <Eye className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              <span className="block text-xs font-medium text-zinc-800">Viewing</span>
              <span className="block text-[10.5px] text-zinc-500">Read the document without editing</span>
            </span>
          </button>
        </RibbonDropdown>

        <RibbonDropdown
          title="Share"
          widthClass="w-56"
          trigger={
            <span
              className={`flex items-center gap-1 px-2 h-7 rounded font-medium ${
                canShare ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-zinc-100 text-zinc-400'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="text-xs">Share</span>
            </span>
          }
        >
          {!canShare ? (
            <div className="px-2 py-2 text-[11px] text-zinc-500">Save the document at least once before sharing it.</div>
          ) : (
            <>
              <button
                type="button"
                onClick={onShare}
                className="w-full flex items-start gap-2 px-2 py-1.5 rounded text-left hover:bg-zinc-100 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <span className="block text-xs font-medium text-zinc-800">Share with people &amp; get link</span>
                  <span className="block text-[10.5px] text-zinc-500">Invite collaborators or create a shareable link</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onShareToChat}
                className="w-full flex items-start gap-2 px-2 py-1.5 rounded text-left hover:bg-zinc-100 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <span className="block text-xs font-medium text-zinc-800">Share to Chat…</span>
                  <span className="block text-[10.5px] text-zinc-500">Send this document into a conversation</span>
                </span>
              </button>
            </>
          )}
        </RibbonDropdown>

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
