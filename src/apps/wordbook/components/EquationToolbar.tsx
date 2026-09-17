import React from 'react';
import { Editor } from '@tiptap/react';
import { parseEquationMarkup, equationSegmentsToJSON } from '../editor/equationParser';

interface EquationToolbarProps {
  editor: Editor | null;
}

// Same palette EquationModal.tsx offers inside its dialog — reused here so
// the two "insert an equation symbol" entry points (View > Show equation
// toolbar, Insert > Symbols > Equation) stay in sync automatically.
const PALETTE = ['√', 'π', '∞', '∑', '∫', '±', '×', '÷', '≤', '≥', '≠', '≈', '°', 'Δ', 'θ', 'λ', 'μ', 'α', 'β', '→'];

/**
 * A persistent one-click symbol strip (View > Show equation toolbar),
 * distinct from Insert > Equation's modal, which is for composing a whole
 * expression (with `^`/`_` for super/subscript) rather than dropping in a
 * single symbol while typing.
 */
export default function EquationToolbar({ editor }: EquationToolbarProps) {
  const insert = (token: string) => {
    if (!editor) return;
    const content = equationSegmentsToJSON(parseEquationMarkup(token));
    editor.chain().focus().insertContent(content).run();
  };

  return (
    <div className="shrink-0 flex items-center gap-1 px-3 py-1 bg-white border-b border-zinc-200 overflow-x-auto">
      <span className="text-[10px] font-medium text-zinc-400 mr-1 shrink-0">Equation</span>
      {PALETTE.map((sym) => (
        <button
          key={sym}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(sym)}
          className="w-6 h-6 shrink-0 text-xs rounded hover:bg-zinc-100 cursor-pointer"
        >
          {sym}
        </button>
      ))}
    </div>
  );
}
