import React from 'react';
import { Search, ChevronUp, ChevronDown, X, Replace, ReplaceAll } from 'lucide-react';

interface FindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  findText: string;
  setFindText: (val: string) => void;
  replaceText: string;
  setReplaceText: (val: string) => void;
  matchCase: boolean;
  setMatchCase: (val: boolean) => void;
  matchCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
}

export default function FindReplaceBar({
  isOpen,
  onClose,
  findText,
  setFindText,
  replaceText,
  setReplaceText,
  matchCase,
  setMatchCase,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  onReplace,
  onReplaceAll,
}: FindReplaceBarProps) {
  if (!isOpen) return null;

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-2.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm shrink-0">
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {/* Find Input Box */}
        <div className="relative flex items-center min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Find text..."
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="w-full pl-8 pr-12 py-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500"
          />
          {findText && (
            <span className="absolute right-2 text-[10px] text-zinc-400 font-mono">
              {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : '0/0'}
            </span>
          )}
        </div>

        {/* Find Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevMatch}
            disabled={matchCount === 0}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            title="Previous match"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onNextMatch}
            disabled={matchCount === 0}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            title="Next match"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMatchCase(!matchCase)}
            className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
              matchCase
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}
            title="Match case sensitivity"
          >
            Aa
          </button>
        </div>

        {/* Replace Input Box */}
        <div className="flex items-center min-w-[180px]">
          <input
            type="text"
            placeholder="Replace with..."
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="w-full px-3 py-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onReplace}
            disabled={matchCount === 0}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            Replace
          </button>
          <button
            onClick={onReplaceAll}
            disabled={matchCount === 0}
            className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
          >
            Replace All
          </button>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
