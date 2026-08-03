import React from 'react';
import { Delete, Percent, Divide, X, Minus, Plus, Equal } from 'lucide-react';

interface BasicCalculatorProps {
  display: string;
  expression: string;
  memory: number | null;
  onDigit: (digit: string) => void;
  onOperator: (op: string) => void;
  onEquals: () => void;
  onClear: () => void;
  onAllClear: () => void;
  onBackspace: () => void;
  onPercentage: () => void;
  onToggleSign: () => void;
  onMemoryClear: () => void;
  onMemoryRead: () => void;
  onMemoryAdd: () => void;
  onMemorySub: () => void;
  onMemorySave: () => void;
}

export default function BasicCalculator({
  display,
  expression,
  memory,
  onDigit,
  onOperator,
  onEquals,
  onClear,
  onAllClear,
  onBackspace,
  onPercentage,
  onToggleSign,
  onMemoryClear,
  onMemoryRead,
  onMemoryAdd,
  onMemorySub,
  onMemorySave,
}: BasicCalculatorProps) {
  return (
    <div className="flex-1 flex flex-col p-4 gap-3 max-w-lg mx-auto w-full select-none">
      {/* Memory Status Bar */}
      <div className="flex items-center justify-between text-[11px] font-mono px-1">
        <span className="text-zinc-400">
          Memory: <strong className="text-purple-500">{memory !== null ? memory : 'OFF'}</strong>
        </span>
        <div className="flex gap-1.5 font-bold">
          <button
            onClick={onMemoryClear}
            className="px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 hover:bg-purple-500/10 hover:text-purple-500 cursor-pointer"
          >
            MC
          </button>
          <button
            onClick={onMemoryRead}
            className="px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 hover:bg-purple-500/10 hover:text-purple-500 cursor-pointer"
          >
            MR
          </button>
          <button
            onClick={onMemoryAdd}
            className="px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 hover:bg-purple-500/10 hover:text-purple-500 cursor-pointer"
          >
            M+
          </button>
          <button
            onClick={onMemorySub}
            className="px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 hover:bg-purple-500/10 hover:text-purple-500 cursor-pointer"
          >
            M-
          </button>
          <button
            onClick={onMemorySave}
            className="px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 hover:bg-purple-500/10 hover:text-purple-500 cursor-pointer"
          >
            MS
          </button>
        </div>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-4 gap-2.5 flex-1">
        {/* Row 1: AC, C, Backspace, Divide */}
        <button
          onClick={onAllClear}
          className="p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-sm transition-all cursor-pointer"
        >
          AC
        </button>
        <button
          onClick={onClear}
          className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm transition-all cursor-pointer"
        >
          C
        </button>
        <button
          onClick={onBackspace}
          className="p-3.5 rounded-2xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-bold text-sm flex items-center justify-center transition-all cursor-pointer"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={() => onOperator('÷')}
          className="p-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base transition-all cursor-pointer flex items-center justify-center"
        >
          ÷
        </button>

        {/* Row 2: 7, 8, 9, Multiply */}
        <button
          onClick={() => onDigit('7')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          7
        </button>
        <button
          onClick={() => onDigit('8')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          8
        </button>
        <button
          onClick={() => onDigit('9')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          9
        </button>
        <button
          onClick={() => onOperator('×')}
          className="p-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base transition-all cursor-pointer flex items-center justify-center"
        >
          ×
        </button>

        {/* Row 3: 4, 5, 6, Minus */}
        <button
          onClick={() => onDigit('4')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          4
        </button>
        <button
          onClick={() => onDigit('5')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          5
        </button>
        <button
          onClick={() => onDigit('6')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          6
        </button>
        <button
          onClick={() => onOperator('-')}
          className="p-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base transition-all cursor-pointer flex items-center justify-center"
        >
          -
        </button>

        {/* Row 4: 1, 2, 3, Plus */}
        <button
          onClick={() => onDigit('1')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          1
        </button>
        <button
          onClick={() => onDigit('2')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          2
        </button>
        <button
          onClick={() => onDigit('3')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          3
        </button>
        <button
          onClick={() => onOperator('+')}
          className="p-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base transition-all cursor-pointer flex items-center justify-center"
        >
          +
        </button>

        {/* Row 5: ±, 0, ., %, = */}
        <button
          onClick={onToggleSign}
          className="p-3.5 rounded-2xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-bold text-sm transition-all cursor-pointer"
        >
          ±
        </button>
        <button
          onClick={() => onDigit('0')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          0
        </button>
        <button
          onClick={() => onDigit('.')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500 font-bold text-lg transition-all cursor-pointer shadow-xs"
        >
          .
        </button>
        <button
          onClick={onPercentage}
          className="p-3.5 rounded-2xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-bold text-sm transition-all cursor-pointer flex items-center justify-center"
        >
          %
        </button>
      </div>

      {/* Equals Bar */}
      <button
        onClick={onEquals}
        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-lg"
      >
        <Equal className="w-5 h-5" /> Calculate Equal
      </button>
    </div>
  );
}
