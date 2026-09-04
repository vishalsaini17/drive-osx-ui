import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { registerCustomThemes } from '../editor/themes';

interface MonacoPaneProps {
  tabId: string;
  language: string;
  defaultValue: string;
  theme: string;
  wordWrap: boolean;
  tabSize: number;
  insertSpaces: boolean;
  minimapEnabled: boolean;
  lineNumbersEnabled: boolean;
  renderWhitespace: boolean;
  fontSize: number;
  fontFamily: string;
  onChange: (value: string) => void;
  onEditorMount: (editor: MonacoEditorNS.IStandaloneCodeEditor) => void;
}

/**
 * One Monaco instance, reused across tabs. `path` is what makes multi-file
 * editing work — `@monaco-editor/react` keeps one model per unique path and
 * swaps the visible model on `path` change, which is what preserves each
 * tab's own undo history and cursor/scroll position across switches without
 * this component managing models by hand.
 */
export default function MonacoPane({
  tabId,
  language,
  defaultValue,
  theme,
  wordWrap,
  tabSize,
  insertSpaces,
  minimapEnabled,
  lineNumbersEnabled,
  renderWhitespace,
  fontSize,
  fontFamily,
  onChange,
  onEditorMount,
}: MonacoPaneProps) {
  const mountedRef = useRef(false);

  const handleMount: OnMount = (editorInstance) => {
    mountedRef.current = true;
    onEditorMount(editorInstance);
  };

  return (
    <Editor
      path={tabId}
      defaultValue={defaultValue}
      language={language}
      theme={theme}
      beforeMount={registerCustomThemes}
      onMount={handleMount}
      onChange={(value) => onChange(value ?? '')}
      options={{
        wordWrap: wordWrap ? 'on' : 'off',
        tabSize,
        insertSpaces,
        minimap: { enabled: minimapEnabled },
        lineNumbers: lineNumbersEnabled ? 'on' : 'off',
        renderWhitespace: renderWhitespace ? 'all' : 'selection',
        fontSize,
        fontFamily,
        automaticLayout: true,
        scrollBeyondLastLine: false,
      }}
      className="h-full w-full"
    />
  );
}
