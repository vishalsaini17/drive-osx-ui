import React, { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Link2, ChevronRight, ArrowLeft, Heading, Bookmark as BookmarkIcon } from 'lucide-react';
import WordBookModal from './WordBookModal';
import { collectHeadings, collectBookmarks, ensureHeadingId } from '../editor/internalLinkTargets';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
}

/**
 * Turns a bare word/domain typed into the Link field into a real, absolute
 * URL suggestion — the same guess the old `prompt()`-based flow silently
 * needed (a browser treats "google" as a relative path, not a website).
 * Returns null once the field already looks like a real link/scheme, so the
 * suggestion row only ever appears when it would actually change anything.
 */
function suggestUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /^(https?:|mailto:|tel:|#)/i.test(trimmed)) return null;
  if (/^[\w-]+(\.[\w-]+)*$/i.test(trimmed)) {
    const host = trimmed.includes('.') ? trimmed : `${trimmed}.com`;
    return `http://${host}`;
  }
  return null;
}

/** Insert/edit link — a real dialog (text + URL fields, a live "did you mean a URL?" suggestion, and a Headings/Bookmarks picker for internal links) replacing the old `prompt()`-based flow. */
export default function LinkModal({ isOpen, onClose, editor }: LinkModalProps) {
  const [view, setView] = useState<'main' | 'internal'>('main');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!isOpen || !editor) return;
    setView('main');
    const { from, to, empty } = editor.state.selection;
    setText(empty ? '' : editor.state.doc.textBetween(from, to, ' '));
    setUrl((editor.getAttributes('link').href as string | undefined) || '');
  }, [isOpen, editor]);

  if (!editor) return null;

  const suggestion = suggestUrl(url);

  const applyLink = (targetUrl: string) => {
    const href = targetUrl.trim();
    if (!href) return;
    if (editor.state.selection.empty) {
      // Nothing selected — the display text becomes new, linked content.
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: text.trim() || href, marks: [{ type: 'link', attrs: { href } }] })
        .run();
    } else {
      // A selection already exists — apply the link to it directly. The
      // display-text field only drives what gets *inserted*; editing it over
      // an existing selection would silently discard whatever formatting
      // already lived inside that selection, which Docs' own dialog avoids
      // too (it only lets you retype the text for a collapsed cursor).
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    onClose();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  };

  const headings = collectHeadings(editor);
  const bookmarks = collectBookmarks(editor);

  return (
    <WordBookModal isOpen={isOpen} onClose={onClose} title={view === 'internal' ? 'Link to a place in this document' : 'Insert link'} maxWidthClass="max-w-sm">
      {view === 'main' ? (
        <div className="space-y-2">
          <label className="block">
            <span className="text-[11px] font-medium text-zinc-500 mb-1 block">Text to display</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full border border-zinc-300 rounded px-2 py-1.5 text-sm"
              placeholder="Text to display"
            />
          </label>

          <div className="flex items-end gap-2">
            <label className="flex-1 block">
              <span className="text-[11px] font-medium text-zinc-500 mb-1 block">Link</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyLink(suggestion ?? url);
                }}
                autoFocus
                className="w-full border border-zinc-300 rounded px-2 py-1.5 text-sm"
                placeholder="Paste a link, or type a website"
              />
            </label>
            <button
              type="button"
              onClick={() => applyLink(suggestion ?? url)}
              disabled={!url.trim()}
              className="h-[30px] px-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              Apply
            </button>
          </div>

          {suggestion && (
            <button
              type="button"
              onClick={() => applyLink(suggestion)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded border border-zinc-200 hover:bg-zinc-50 text-left cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="text-xs text-zinc-700 truncate">{suggestion}</span>
            </button>
          )}

          {editor.isActive('link') && (
            <button type="button" onClick={removeLink} className="text-[11px] text-red-500 hover:text-red-600 cursor-pointer">
              Remove link
            </button>
          )}

          <div className="border-t border-zinc-200 pt-2 mt-1">
            <button
              type="button"
              onClick={() => setView('internal')}
              className="w-full flex items-center justify-between px-1 py-1 text-xs text-zinc-700 hover:text-zinc-900 cursor-pointer"
            >
              <span>Headings and bookmarks</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button type="button" onClick={() => setView('main')} className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 mb-2 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 mb-1">
              <Heading className="w-3 h-3" /> Headings
            </div>
            {headings.length === 0 ? (
              <div className="text-[11px] text-zinc-400 px-1 py-1">No headings in this document yet.</div>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {headings.map((h) => (
                  <button
                    key={h.pos}
                    type="button"
                    onClick={() => applyLink(`#heading:${h.id ?? ensureHeadingId(editor, h.pos)}`)}
                    style={{ paddingLeft: (h.level - 1) * 10 + 8 }}
                    className="w-full text-left pr-2 py-1 rounded hover:bg-zinc-100 text-xs text-zinc-700 truncate cursor-pointer"
                  >
                    {h.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 mb-1">
              <BookmarkIcon className="w-3 h-3" /> Bookmarks
            </div>
            {bookmarks.length === 0 ? (
              <div className="text-[11px] text-zinc-400 px-1 py-1">No bookmarks in this document yet.</div>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {bookmarks.map((b) => (
                  <button
                    key={b.pos}
                    type="button"
                    onClick={() => applyLink(`#bookmark:${b.id}`)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-zinc-100 text-xs text-zinc-700 truncate cursor-pointer"
                  >
                    {b.contextText}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </WordBookModal>
  );
}
