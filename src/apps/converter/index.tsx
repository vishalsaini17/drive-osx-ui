import React from 'react';
import { Scale } from 'lucide-react';
import UnitConverter from './UnitConverter';

/** Standalone Converter application. Window chrome is supplied by AppWindow. */
export default function ConverterApp() {
  return (
    <div className="w-full h-full flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight truncate">Converter</h1>
            <p className="text-[10px] text-zinc-400 font-medium truncate">Drive OSX Suite</p>
          </div>
        </div>
      </div>
      <UnitConverter />
    </div>
  );
}
