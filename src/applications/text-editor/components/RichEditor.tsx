import React, { useRef, useEffect } from 'react';

interface RichEditorProps {
  contentHtml: string;
  onChangeHtml: (html: string) => void;
  fontFamily: string;
  fontSize: number;
  readOnly: boolean;
  spellCheck: boolean;
  wordWrap: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function RichEditor({
  contentHtml,
  onChangeHtml,
  fontFamily,
  fontSize,
  readOnly,
  spellCheck,
  wordWrap,
  onContextMenu,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync state into contentEditable DOM element without losing caret
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== contentHtml) {
      editorRef.current.innerHTML = contentHtml;
    }
  }, [contentHtml]);

  const handleInput = () => {
    if (editorRef.current) {
      onChangeHtml(editorRef.current.innerHTML);
    }
  };

  return (
    <div
      className={`flex-1 w-full h-full p-6 overflow-auto outline-none ${
        wordWrap ? 'whitespace-normal' : 'whitespace-nowrap overflow-x-auto'
      }`}
      onContextMenu={onContextMenu}
    >
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        spellCheck={spellCheck}
        onInput={handleInput}
        style={{
          fontFamily: fontFamily,
          fontSize: `${fontSize}px`,
          minHeight: '100%',
        }}
        className="w-full h-full outline-none leading-relaxed text-current focus:ring-0 [&_p]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-purple-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_table]:border-collapse [&_table]:w-full [&_table]:my-3 [&_td]:border [&_td]:border-zinc-300 [&_td]:dark:border-zinc-700 [&_td]:p-2 [&_th]:border [&_th]:border-zinc-300 [&_th]:dark:border-zinc-700 [&_th]:p-2 [&_th]:bg-zinc-100 [&_th]:dark:bg-zinc-800"
      />
    </div>
  );
}
