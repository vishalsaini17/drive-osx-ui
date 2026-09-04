import React from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';

interface StatusBarProps {
  language: string;
  cursorLine: number;
  cursorColumn: number;
  tabSizeLabel: string;
  errorCount: number;
  warningCount: number;
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'LESS',
  markdown: 'Markdown',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  sql: 'SQL',
  shell: 'Shell Script',
  yaml: 'YAML',
  xml: 'XML',
  ini: 'INI',
  plaintext: 'Plain Text',
};

/**
 * The bottom status bar — every field here reflects genuine editor state
 * (Monaco's own marker service for problems, real cursor position, the
 * actual indent/encoding this app writes files with), not placeholder text.
 */
export default function StatusBar({ language, cursorLine, cursorColumn, tabSizeLabel, errorCount, warningCount }: StatusBarProps) {
  return (
    <div data-name="editor-status-bar" className="h-[22px] shrink-0 bg-[#007acc] text-white flex items-center justify-between px-2 text-[12px] select-none">
      <div className="flex items-center h-full">
        <span className="flex items-center gap-1 h-full px-1.5 hover:bg-white/15 cursor-default">
          <XCircle className="w-3.5 h-3.5" /> {errorCount}
        </span>
        <span className="flex items-center gap-1 h-full px-1.5 hover:bg-white/15 cursor-default">
          <AlertTriangle className="w-3.5 h-3.5" /> {warningCount}
        </span>
      </div>
      <div className="flex items-center h-full">
        <span className="h-full px-1.5 flex items-center hover:bg-white/15 cursor-default">
          Ln {cursorLine}, Col {cursorColumn}
        </span>
        <span className="h-full px-1.5 flex items-center hover:bg-white/15 cursor-default">{tabSizeLabel}</span>
        <span className="h-full px-1.5 flex items-center hover:bg-white/15 cursor-default">UTF-8</span>
        <span className="h-full px-1.5 flex items-center hover:bg-white/15 cursor-default">LF</span>
        <span className="h-full px-1.5 flex items-center hover:bg-white/15 cursor-default">{LANGUAGE_LABELS[language] ?? language}</span>
      </div>
    </div>
  );
}
