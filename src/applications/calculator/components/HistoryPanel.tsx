import React, { useState } from 'react';
import { Clock, Trash2, Copy, Check, ArrowRightLeft, X } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClearHistory: () => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
}

export default function HistoryPanel({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onSelectHistoryItem,
}: HistoryPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="w-80 bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full shrink-0 text-xs select-none shadow-lg z-20">
      {/* Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="font-bold text-sm">Calculation History</span>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Clear calculation history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {history.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 flex flex-col items-center justify-center gap-2">
            <Clock className="w-8 h-8 opacity-30 stroke-[1.5]" />
            <p className="font-medium">No history recorded yet</p>
            <p className="text-[11px] text-zinc-500">
              Calculations will automatically appear here.
            </p>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectHistoryItem(item)}
              className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-purple-500/80 transition-all cursor-pointer group flex flex-col gap-1 shadow-xs"
            >
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="uppercase font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {item.mode}
                </span>
                <span>{item.timestamp}</span>
              </div>
              <div className="font-mono text-zinc-500 dark:text-zinc-400 text-right truncate">
                {item.expression} =
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-base font-bold text-purple-600 dark:text-purple-400 truncate">
                  {item.result}
                </span>
                <button
                  onClick={(e) => handleCopy(item.result, item.id, e)}
                  className="p-1.5 rounded-lg hover:bg-purple-500/10 text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer shrink-0"
                  title="Copy result to clipboard"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer info */}
      <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 text-center bg-white dark:bg-zinc-950">
        Click any entry to load it back into the calculator
      </div>
    </div>
  );
}
