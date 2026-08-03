import React from 'react';
import { AngleUnit } from '../types';

interface ScientificCalculatorProps {
  display: string;
  expression: string;
  angleUnit: AngleUnit;
  setAngleUnit: (unit: AngleUnit) => void;
  onScientificFunc: (funcName: string) => void;
  onDigit: (digit: string) => void;
  onOperator: (op: string) => void;
  onEquals: () => void;
  onClear: () => void;
  onAllClear: () => void;
  onBackspace: () => void;
}

export default function ScientificCalculator({
  display,
  expression,
  angleUnit,
  setAngleUnit,
  onScientificFunc,
  onDigit,
  onOperator,
  onEquals,
  onClear,
  onAllClear,
  onBackspace,
}: ScientificCalculatorProps) {
  return (
    <div className="flex-1 flex flex-col p-4 gap-3 max-w-2xl mx-auto w-full select-none overflow-y-auto">
      {/* Scientific Controls Header (Deg/Rad toggle & mode indicator) */}
      <div className="flex items-center justify-between text-xs px-1 bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-400">Angle Mode:</span>
          <button
            onClick={() => setAngleUnit(angleUnit === 'deg' ? 'rad' : 'deg')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              angleUnit === 'deg'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
            }`}
          >
            {angleUnit.toUpperCase()}
          </button>
        </div>
        <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
          Scientific Mode Active
        </div>
      </div>

      {/* Grid Layout: 5 columns for rich scientific key options */}
      <div className="grid grid-cols-5 gap-2 text-xs">
        {/* Trigonometry Row */}
        <button
          onClick={() => onScientificFunc('sin')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          sin
        </button>
        <button
          onClick={() => onScientificFunc('cos')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          cos
        </button>
        <button
          onClick={() => onScientificFunc('tan')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          tan
        </button>
        <button
          onClick={() => onScientificFunc('asin')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          sin⁻¹
        </button>
        <button
          onClick={() => onScientificFunc('acos')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          cos⁻¹
        </button>

        {/* Hyperbolic / Inverse Trig Row */}
        <button
          onClick={() => onScientificFunc('atan')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          tan⁻¹
        </button>
        <button
          onClick={() => onScientificFunc('sinh')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          sinh
        </button>
        <button
          onClick={() => onScientificFunc('cosh')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          cosh
        </button>
        <button
          onClick={() => onScientificFunc('tanh')}
          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold transition-all cursor-pointer"
        >
          tanh
        </button>
        <button
          onClick={() => onScientificFunc('fact')}
          className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold transition-all cursor-pointer"
        >
          n!
        </button>

        {/* Logarithms & Powers Row */}
        <button
          onClick={() => onScientificFunc('ln')}
          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer"
        >
          ln
        </button>
        <button
          onClick={() => onScientificFunc('log10')}
          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer"
        >
          log₁₀
        </button>
        <button
          onClick={() => onScientificFunc('log2')}
          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer"
        >
          log₂
        </button>
        <button
          onClick={() => onScientificFunc('square')}
          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer"
        >
          x²
        </button>
        <button
          onClick={() => onScientificFunc('cube')}
          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer"
        >
          x³
        </button>

        {/* Power x^y, Roots & Constants */}
        <button
          onClick={() => onOperator('^')}
          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer"
        >
          xʸ
        </button>
        <button
          onClick={() => onScientificFunc('exp')}
          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer"
        >
          eˣ
        </button>
        <button
          onClick={() => onScientificFunc('pow10')}
          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer"
        >
          10ˣ
        </button>
        <button
          onClick={() => onScientificFunc('sqrt')}
          className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold transition-all cursor-pointer"
        >
          √x
        </button>
        <button
          onClick={() => onScientificFunc('cbrt')}
          className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold transition-all cursor-pointer"
        >
          ∛x
        </button>

        {/* Constants & Parentheses Row */}
        <button
          onClick={() => onScientificFunc('pi')}
          className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold transition-all cursor-pointer"
        >
          π
        </button>
        <button
          onClick={() => onScientificFunc('e')}
          className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold transition-all cursor-pointer"
        >
          e
        </button>
        <button
          onClick={() => onScientificFunc('reciprocal')}
          className="p-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-bold cursor-pointer"
        >
          1/x
        </button>
        <button
          onClick={() => onDigit('(')}
          className="p-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-bold cursor-pointer"
        >
          (
        </button>
        <button
          onClick={() => onDigit(')')}
          className="p-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-bold cursor-pointer"
        >
          )
        </button>

        {/* Numeric Keypad Grid Block */}
        <button
          onClick={onAllClear}
          className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold cursor-pointer"
        >
          AC
        </button>
        <button
          onClick={onClear}
          className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-bold cursor-pointer"
        >
          C
        </button>
        <button
          onClick={onBackspace}
          className="p-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-bold cursor-pointer"
        >
          ⌫
        </button>
        <button
          onClick={() => onScientificFunc('abs')}
          className="p-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-bold cursor-pointer"
        >
          |x|
        </button>
        <button
          onClick={() => onOperator('÷')}
          className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
        >
          ÷
        </button>

        {/* Numbers 7, 8, 9, etc */}
        <button
          onClick={() => onDigit('7')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          7
        </button>
        <button
          onClick={() => onDigit('8')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          8
        </button>
        <button
          onClick={() => onDigit('9')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          9
        </button>
        <button
          onClick={() => onScientificFunc('percentage')}
          className="p-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-bold cursor-pointer"
        >
          %
        </button>
        <button
          onClick={() => onOperator('×')}
          className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
        >
          ×
        </button>

        <button
          onClick={() => onDigit('4')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          4
        </button>
        <button
          onClick={() => onDigit('5')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          5
        </button>
        <button
          onClick={() => onDigit('6')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          6
        </button>
        <button
          onClick={() => onDigit('.')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          .
        </button>
        <button
          onClick={() => onOperator('-')}
          className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
        >
          -
        </button>

        <button
          onClick={() => onDigit('1')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          1
        </button>
        <button
          onClick={() => onDigit('2')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          2
        </button>
        <button
          onClick={() => onDigit('3')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          3
        </button>
        <button
          onClick={() => onDigit('0')}
          className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm cursor-pointer"
        >
          0
        </button>
        <button
          onClick={() => onOperator('+')}
          className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
        >
          +
        </button>
      </div>

      <button
        onClick={onEquals}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer text-base"
      >
        = Calculate Result
      </button>
    </div>
  );
}
