import React, { useRef, useEffect } from 'react';

interface PlainEditorProps {
  content: string;
  onChangeContent: (text: string) => void;
  fontFamily: string;
  fontSize: number;
  readOnly: boolean;
  spellCheck: boolean;
  wordWrap: boolean;
  showLineNumbers: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export default function PlainEditor({
  content,
  onChangeContent,
  fontFamily,
  fontSize,
  readOnly,
  spellCheck,
  wordWrap,
  showLineNumbers,
  onContextMenu,
  textareaRef,
}: PlainEditorProps) {
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const activeTextareaRef = textareaRef || internalRef;

  const lines = content.split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Synchronize vertical scroll between line numbers gutter and textarea
  const handleScroll = () => {
    if (activeTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = activeTextareaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex-1 w-full h-full flex overflow-hidden bg-transparent">
      {/* Line Numbers Gutter */}
      {showLineNumbers && (
        <div
          ref={lineNumbersRef}
          className="w-12 shrink-0 h-full py-4 bg-zinc-100/50 dark:bg-zinc-950/50 border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 font-mono text-right pr-2 select-none overflow-hidden"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      )}

      {/* Main Textarea */}
      <textarea
        ref={activeTextareaRef}
        value={content}
        onChange={(e) => onChangeContent(e.target.value)}
        onScroll={handleScroll}
        onContextMenu={onContextMenu}
        readOnly={readOnly}
        spellCheck={spellCheck}
        style={{
          fontFamily: fontFamily,
          fontSize: `${fontSize}px`,
          lineHeight: 1.6,
        }}
        className={`flex-1 w-full h-full p-4 bg-transparent text-current border-none outline-none focus:ring-0 resize-none leading-relaxed overflow-auto ${
          wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
        }`}
        placeholder="Type or paste document content here..."
      />
    </div>
  );
}
