import React from 'react';
import { ProgrammerBase, WordSize } from '../types';

interface ProgrammerCalculatorProps {
  value: number;
  setValue: (val: number) => void;
  base: ProgrammerBase;
  setBase: (base: ProgrammerBase) => void;
  wordSize: WordSize;
  setWordSize: (ws: WordSize) => void;
  onBitwiseOp: (op: string) => void;
  onDigit: (digit: string) => void;
  onEquals: () => void;
  onClear: () => void;
}

export default function ProgrammerCalculator({
  value,
  setValue,
  base,
  setBase,
  wordSize,
  setWordSize,
  onBitwiseOp,
  onDigit,
  onEquals,
  onClear,
}: ProgrammerCalculatorProps) {
  // Convert current numerical value into bit representations
  const getBitLength = () => {
    switch (wordSize) {
      case '8bit': return 8;
      case '16bit': return 16;
      case '32bit': return 32;
      case '64bit': return 64;
      default: return 32;
    }
  };

  const bitLength = getBitLength();
  
  // Format representations
  const hexVal = (value >>> 0).toString(16).toUpperCase();
  const decVal = value.toString(10);
  const octVal = (value >>> 0).toString(8);
  const binVal = (value >>> 0).toString(2).padStart(bitLength, '0');

  // Toggle individual bit
  const handleToggleBit = (bitIndexFromRight: number) => {
    const mask = 1 << bitIndexFromRight;
    setValue(value ^ mask);
  };

  // Check which keys are disabled depending on base
  const isKeyDisabled = (key: string) => {
    if (base === 'BIN') {
      return !['0', '1'].includes(key);
    }
    if (base === 'OCT') {
      return !['0', '1', '2', '3', '4', '5', '6', '7'].includes(key);
    }
    if (base === 'DEC') {
      return ['A', 'B', 'C', 'D', 'E', 'F'].includes(key);
    }
    return false; // HEX supports all
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-3 max-w-3xl mx-auto w-full select-none overflow-y-auto">
      {/* 1. Base Representations Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <button
          onClick={() => setBase('HEX')}
          className={`p-2.5 rounded-xl border flex items-center justify-between font-mono cursor-pointer transition-all ${
            base === 'HEX'
              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <span className="text-[10px] opacity-75 font-bold">HEX</span>
          <span className="font-bold text-sm tracking-widest">{hexVal}</span>
        </button>

        <button
          onClick={() => setBase('DEC')}
          className={`p-2.5 rounded-xl border flex items-center justify-between font-mono cursor-pointer transition-all ${
            base === 'DEC'
              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <span className="text-[10px] opacity-75 font-bold">DEC</span>
          <span className="font-bold text-sm tracking-widest">{decVal}</span>
        </button>

        <button
          onClick={() => setBase('OCT')}
          className={`p-2.5 rounded-xl border flex items-center justify-between font-mono cursor-pointer transition-all ${
            base === 'OCT'
              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <span className="text-[10px] opacity-75 font-bold">OCT</span>
          <span className="font-bold text-sm tracking-widest">{octVal}</span>
        </button>

        <button
          onClick={() => setBase('BIN')}
          className={`p-2.5 rounded-xl border flex items-center justify-between font-mono cursor-pointer transition-all ${
            base === 'BIN'
              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <span className="text-[10px] opacity-75 font-bold">BIN</span>
          <span className="font-bold text-xs tracking-wider truncate max-w-[180px]">
            {binVal}
          </span>
        </button>
      </div>

      {/* Word Size Selector */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs">
        <span className="font-bold text-zinc-400">Word Size:</span>
        <div className="flex gap-1">
          {(['64bit', '32bit', '16bit', '8bit'] as WordSize[]).map((ws) => (
            <button
              key={ws}
              onClick={() => setWordSize(ws)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                wordSize === ws
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {ws}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Bit Toggle Matrix */}
      <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-wider flex justify-between">
          <span>Binary Bit Field ({bitLength} bits)</span>
          <span>Click any bit to flip (0 ↔ 1)</span>
        </div>
        <div className="flex flex-wrap gap-1 justify-end font-mono">
          {Array.from({ length: bitLength })
            .map((_, i) => bitLength - 1 - i)
            .map((bitIndex) => {
              const isSet = (value & (1 << bitIndex)) !== 0;
              return (
                <button
                  key={bitIndex}
                  onClick={() => handleToggleBit(bitIndex)}
                  className={`w-6 h-7 rounded text-[10px] font-bold flex flex-col items-center justify-center transition-colors cursor-pointer border ${
                    isSet
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-white dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-purple-400'
                  }`}
                  title={`Bit ${bitIndex}`}
                >
                  <span>{isSet ? '1' : '0'}</span>
                  <span className="text-[7px] opacity-60">{bitIndex}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Bitwise & Numeric Keypad */}
      <div className="grid grid-cols-6 gap-2 text-xs">
        {/* Bitwise Ops Row */}
        <button onClick={() => onBitwiseOp('AND')} className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold cursor-pointer">AND</button>
        <button onClick={() => onBitwiseOp('OR')} className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold cursor-pointer">OR</button>
        <button onClick={() => onBitwiseOp('XOR')} className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold cursor-pointer">XOR</button>
        <button onClick={() => onBitwiseOp('NOT')} className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold cursor-pointer">NOT</button>
        <button onClick={() => onBitwiseOp('LSH')} className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold cursor-pointer">LSH &lt;&lt;</button>
        <button onClick={() => onBitwiseOp('RSH')} className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold cursor-pointer">RSH &gt;&gt;</button>

        {/* Hex Keys Row */}
        {['A', 'B', 'C', 'D', 'E', 'F'].map((hexKey) => (
          <button
            key={hexKey}
            disabled={isKeyDisabled(hexKey)}
            onClick={() => onDigit(hexKey)}
            className="p-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 disabled:opacity-30 font-bold text-sm cursor-pointer hover:bg-purple-500/20 hover:text-purple-600 transition-colors"
          >
            {hexKey}
          </button>
        ))}

        {/* Digits 7,8,9,4,5,6,1,2,3,0 */}
        {['7', '8', '9', '4', '5', '6'].map((numKey) => (
          <button
            key={numKey}
            disabled={isKeyDisabled(numKey)}
            onClick={() => onDigit(numKey)}
            className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 font-bold text-sm cursor-pointer shadow-xs"
          >
            {numKey}
          </button>
        ))}

        {['1', '2', '3', '0'].map((numKey) => (
          <button
            key={numKey}
            disabled={isKeyDisabled(numKey)}
            onClick={() => onDigit(numKey)}
            className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 font-bold text-sm cursor-pointer shadow-xs"
          >
            {numKey}
          </button>
        ))}

        <button
          onClick={onClear}
          className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold cursor-pointer"
        >
          CLR
        </button>

        <button
          onClick={onEquals}
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
        >
          =
        </button>
      </div>
    </div>
  );
}
