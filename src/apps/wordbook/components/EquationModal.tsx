import React, { useRef, useState } from 'react';
import WordBookModal from './WordBookModal';
import { parseEquationMarkup, equationSegmentsToJSON } from '../editor/equationParser';

const PALETTE = ['√', 'π', '∞', '∑', '∫', '±', '×', '÷', '≤', '≥', '≠', '≈', '°', 'Δ', 'θ', 'λ', 'μ', 'α', 'β', '→'];

interface EquationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: ReturnType<typeof equationSegmentsToJSON>) => void;
}

/** A real, editable equation input (see editor/equationParser.ts for what "editable" means here) with a symbol palette and a live preview, rather than a math-typesetting engine this app has no way to export correctly. */
export default function EquationModal({ isOpen, onClose, onInsert }: EquationModalProps) {
  const [text, setText] = useState('x^{2} + y^{2} = z^{2}');
  const inputRef = useRef<HTMLInputElement>(null);

  const insertToken = (token: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const segments = parseEquationMarkup(text);

  const handleInsert = () => {
    const content = equationSegmentsToJSON(segments);
    if (content.length === 0) return;
    onInsert(content);
    onClose();
  };

  return (
    <WordBookModal
      isOpen={isOpen}
      onClose={onClose}
      title="Equation"
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={segments.length === 0}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Insert
          </button>
        </>
      }
    >
      <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">
        Type your expression — use <span className="font-mono bg-zinc-100 px-1 rounded">^</span> for superscript and{' '}
        <span className="font-mono bg-zinc-100 px-1 rounded">_</span> for subscript, e.g. <span className="font-mono bg-zinc-100 px-1 rounded">x^2</span> or{' '}
        <span className="font-mono bg-zinc-100 px-1 rounded">{'H_{2}O'}</span>.
      </p>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border border-zinc-300 rounded px-2 py-1.5 text-sm font-mono mb-2"
        placeholder="x^{2} + y^{2} = z^{2}"
      />
      <div className="flex flex-wrap gap-1 mb-3">
        {PALETTE.map((sym) => (
          <button
            key={sym}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertToken(sym)}
            className="w-7 h-7 text-sm rounded border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
          >
            {sym}
          </button>
        ))}
      </div>
      <div className="border border-zinc-200 rounded bg-zinc-50 px-3 py-4 text-base min-h-[2.5rem]">
        {segments.length === 0 ? (
          <span className="text-zinc-400 text-xs">Preview</span>
        ) : (
          segments.map((s, i) =>
            s.script === 'sup' ? <sup key={i}>{s.text}</sup> : s.script === 'sub' ? <sub key={i}>{s.text}</sub> : <span key={i}>{s.text}</span>
          )
        )}
      </div>
    </WordBookModal>
  );
}
