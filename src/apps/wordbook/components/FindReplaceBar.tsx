import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { findMatches, setFindMatches, clearFindMatches, FindMatch } from '../editor/findReplacePlugin';

interface FindReplaceBarProps {
  editor: Editor;
  onClose: () => void;
  initialShowReplace: boolean;
}

/**
 * A floating find/replace bar, driven by `findReplacePlugin.ts`'s
 * decoration plugin for the actual highlight — this component only owns the
 * query/replace text and the match list, mirroring the split the pagination
 * plugin already uses (a plain ProseMirror plugin for state + decorations,
 * a thin React layer on top for the UI that drives it).
 */
export default function FindReplaceBar({ editor, onClose, initialShowReplace }: FindReplaceBarProps) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(initialShowReplace);
  const [matches, setMatches] = useState<FindMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    (q: string, preferIndex?: number) => {
      const found = findMatches(editor.state.doc, q, false);
      const nextIndex = found.length === 0 ? -1 : Math.min(Math.max(preferIndex ?? 0, 0), found.length - 1);
      setMatches(found);
      setActiveIndex(nextIndex);
      setFindMatches(editor.view, found, nextIndex);
      if (nextIndex >= 0) {
        const m = found[nextIndex];
        editor.chain().setTextSelection({ from: m.from, to: m.to }).scrollIntoView().run();
      }
    },
    [editor]
  );

  useEffect(() => {
    runSearch(query);
    // Only the query itself should trigger a fresh search from scratch (index 0) — see runSearch's other call sites for doc-change/navigation cases.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Re-run the current search if the document changes elsewhere (typing
  // outside the bar, undo, a page break landing mid-match) so a stale
  // highlight never lingers on text that no longer matches.
  useEffect(() => {
    const onUpdate = () => {
      if (query) runSearch(query, activeIndex);
    };
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, query, activeIndex, runSearch]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const goTo = (index: number) => {
    if (matches.length === 0) return;
    const next = ((index % matches.length) + matches.length) % matches.length;
    setActiveIndex(next);
    setFindMatches(editor.view, matches, next);
    const m = matches[next];
    editor.chain().setTextSelection({ from: m.from, to: m.to }).scrollIntoView().run();
  };

  const replaceCurrent = () => {
    if (activeIndex < 0 || matches.length === 0) return;
    const m = matches[activeIndex];
    editor.chain().focus().insertContentAt({ from: m.from, to: m.to }, replaceText).run();
    runSearch(query, activeIndex);
  };

  const replaceAll = () => {
    if (matches.length === 0) return;
    let chain = editor.chain().focus();
    // Replace from the last match backward so an earlier match's position
    // never shifts out from under it while a later one is still pending.
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      chain = chain.insertContentAt({ from: m.from, to: m.to }, replaceText);
    }
    chain.run();
    runSearch(query, 0);
  };

  const close = () => {
    clearFindMatches(editor.view);
    onClose();
  };

  return (
    <div
      // Fixed to the viewport (not the scrollable page canvas) so it stays
      // put in the corner regardless of how far the document is scrolled.
      className="fixed top-24 right-6 z-30 bg-white border border-zinc-300 rounded-lg shadow-lg p-2 flex flex-col gap-1.5 w-80"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          placeholder="Find"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') goTo(e.shiftKey ? activeIndex - 1 : activeIndex + 1);
          }}
          className="flex-1 h-7 px-2 text-xs border border-zinc-300 rounded outline-none focus:ring-1 focus:ring-purple-400"
        />
        <span className="text-[11px] text-zinc-500 tabular-nums w-12 text-center shrink-0">
          {matches.length === 0 ? '0/0' : `${activeIndex + 1}/${matches.length}`}
        </span>
        <button
          type="button"
          title="Previous match (Shift+Enter)"
          onClick={() => goTo(activeIndex - 1)}
          disabled={matches.length === 0}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Next match (Enter)"
          onClick={() => goTo(activeIndex + 1)}
          disabled={matches.length === 0}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button type="button" title="Close (Esc)" onClick={close} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {showReplace ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Replace with"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="flex-1 h-7 px-2 text-xs border border-zinc-300 rounded outline-none focus:ring-1 focus:ring-purple-400"
          />
          <button
            type="button"
            onClick={replaceCurrent}
            disabled={activeIndex < 0}
            className="h-7 px-2 text-[11px] rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={replaceAll}
            disabled={matches.length === 0}
            className="h-7 px-2 text-[11px] rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
          >
            Replace all
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowReplace(true)} className="text-[11px] text-purple-700 hover:underline self-start cursor-pointer">
          Replace
        </button>
      )}
    </div>
  );
}
