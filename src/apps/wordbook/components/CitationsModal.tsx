import React, { useMemo, useState } from 'react';
import { Editor } from '@tiptap/react';
import WordBookModal from './WordBookModal';

interface CitationEntry {
  index: number;
  text: string;
}

/** Walks the live document for existing citation chips rather than keeping a separate "sources" list — a citation is fully self-contained on its own node (see SmartChipNode's `citationText` attr), so numbering and the bibliography are both derived straight from what's actually in the document, correct even after a reload. */
function collectCitations(editor: Editor): CitationEntry[] {
  const found: CitationEntry[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'smartChip' && node.attrs.chipType === 'citation' && node.attrs.citationText) {
      found.push({ index: node.attrs.citationIndex ?? 0, text: node.attrs.citationText });
    }
  });
  return found;
}

interface CitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export default function CitationsModal({ isOpen, onClose, editor }: CitationsModalProps) {
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');

  const existing = useMemo(() => {
    if (!isOpen || !editor) return [];
    const seen = new Set<string>();
    return collectCitations(editor).filter((c) => (seen.has(c.text) ? false : (seen.add(c.text), true)));
  }, [isOpen, editor]);

  const formatCitation = () => {
    const parts: string[] = [];
    if (author.trim()) parts.push(`${author.trim()}.`);
    if (title.trim()) parts.push(year.trim() ? `${title.trim()} (${year.trim()}).` : `${title.trim()}.`);
    else if (year.trim()) parts.push(`(${year.trim()}).`);
    if (url.trim()) parts.push(url.trim());
    return parts.join(' ');
  };

  const insertCitation = (text: string) => {
    if (!editor || !text) return;
    const nextIndex = collectCitations(editor).reduce((max, c) => Math.max(max, c.index), 0) + 1;
    editor
      .chain()
      .focus()
      .insertSmartChip({ chipType: 'citation', label: `[${nextIndex}]`, citationIndex: nextIndex, citationText: text })
      .run();
  };

  const handleInsertNew = () => {
    const text = formatCitation();
    if (!text) return;
    insertCitation(text);
    setAuthor('');
    setTitle('');
    setYear('');
    setUrl('');
    onClose();
  };

  const handleInsertBibliography = () => {
    if (!editor) return;
    const all = collectCitations(editor).sort((a, b) => a.index - b.index);
    if (all.length === 0) {
      alert('This document has no citations yet — add one first.');
      return;
    }
    const uniqueByIndex = Array.from(new Map(all.map((c) => [c.index, c])).values());
    editor
      .chain()
      .focus()
      .insertContent([
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'References' }] },
        ...uniqueByIndex.map((c) => ({ type: 'paragraph', content: [{ type: 'text', text: `[${c.index}] ${c.text}` }] })),
      ])
      .run();
    onClose();
  };

  return (
    <WordBookModal
      isOpen={isOpen}
      onClose={onClose}
      title="Citations"
      maxWidthClass="max-w-md"
      footer={
        <>
          <button onClick={handleInsertBibliography} className="px-3 py-1.5 text-xs rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 cursor-pointer">
            Insert bibliography
          </button>
          <button
            onClick={handleInsertNew}
            disabled={!formatCitation()}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Insert citation
          </button>
        </>
      }
    >
      {existing.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-medium text-zinc-500 mb-1">Reuse a source already in this document</div>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {existing.map((c) => (
              <button
                key={c.text}
                onClick={() => {
                  insertCitation(c.text);
                  onClose();
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-zinc-100 text-[11px] text-zinc-700 truncate cursor-pointer"
                title={c.text}
              >
                {c.text}
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-200 my-3" />
        </div>
      )}
      <div className="space-y-2">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author" className="w-full border border-zinc-300 rounded px-2 py-1.5 text-sm" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full border border-zinc-300 rounded px-2 py-1.5 text-sm" />
        <div className="flex gap-2">
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className="w-24 border border-zinc-300 rounded px-2 py-1.5 text-sm" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" className="flex-1 border border-zinc-300 rounded px-2 py-1.5 text-sm" />
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 mt-2">
        A plain, real citation marker — not a full APA/MLA/Chicago formatting engine. "Insert citation" adds a numbered reference at the
        cursor; "Insert bibliography" lists every citation currently in the document.
      </p>
    </WordBookModal>
  );
}
