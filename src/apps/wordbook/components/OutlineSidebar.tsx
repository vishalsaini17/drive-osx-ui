import React from 'react';
import { Editor, useEditorState } from '@tiptap/react';
import { ChevronLeft } from 'lucide-react';

interface OutlineSidebarProps {
  editor: Editor;
  onClose: () => void;
}

interface HeadingEntry {
  pos: number;
  level: number;
  text: string;
}

/**
 * A live document outline — the useful half of Docs' "Document tabs" panel.
 * The *other* half of that panel (multiple independent tabs, each its own
 * sub-document within one file) isn't built here: wordbook's document model
 * is one ProseMirror doc per file, and faking a tab strip with no real
 * per-tab content behind it would be exactly the kind of non-functional UI
 * this project avoids. This panel is real — every heading listed is read
 * live off the document, and clicking one actually jumps the editor there.
 */
export default function OutlineSidebar({ editor, onClose }: OutlineSidebarProps) {
  // Re-render whenever the doc changes so the heading list stays live.
  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });

  const headings: HeadingEntry[] = [];
  editor.state.doc.forEach((node, pos) => {
    if (node.type.name === 'heading') {
      const text = node.textContent.trim();
      headings.push({ pos, level: (node.attrs as { level?: number }).level ?? 1, text: text || 'Untitled heading' });
    }
  });

  const jumpTo = (pos: number) => {
    // +1 lands inside the heading's own text rather than right before the
    // node, which is what keeps the caret visibly blinking in the heading
    // once scrolled to it instead of appearing to land nowhere.
    editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
  };

  return (
    <div className="w-60 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
      <div className="h-10 px-2 flex items-center gap-1.5 border-b border-zinc-200 shrink-0">
        <button
          type="button"
          title="Hide outline"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 cursor-pointer text-zinc-600"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-zinc-700">Outline</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-2">
        {headings.length === 0 ? (
          <p className="text-[11px] text-zinc-400 italic px-3">Headings you add to the document will appear here.</p>
        ) : (
          <ul>
            {headings.map((h) => (
              <li key={h.pos}>
                <button
                  type="button"
                  onClick={() => jumpTo(h.pos)}
                  title={h.text}
                  style={{ paddingLeft: 12 + (h.level - 1) * 14 }}
                  className="w-full text-left pr-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 truncate cursor-pointer"
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
