import React, { useState } from 'react';

const MAX_COLS = 8;
const MAX_ROWS = 6;

interface TableGridPickerProps {
  onPick: (rows: number, cols: number) => void;
}

/** The Docs-style "hover a grid to size a table" picker — a real `kind: 'custom'` menu item (see `platform/menus/types.ts`), not a fixed "insert 3×3" shortcut. */
export default function TableGridPicker({ onPick }: TableGridPickerProps) {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const rows = hover?.row ?? 0;
  const cols = hover?.col ?? 0;

  return (
    <div className="px-2 py-2 w-fit select-none" onPointerLeave={() => setHover(null)}>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 16px)` }}>
        {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
          const r = Math.floor(i / MAX_COLS) + 1;
          const c = (i % MAX_COLS) + 1;
          const active = r <= rows && c <= cols;
          return (
            <div
              key={i}
              onPointerEnter={() => setHover({ row: r, col: c })}
              onClick={() => onPick(r, c)}
              className={`w-4 h-4 rounded-[2px] border cursor-pointer transition-colors ${
                active ? 'bg-blue-500 border-blue-600' : 'bg-zinc-100 border-zinc-300 hover:border-zinc-400'
              }`}
            />
          );
        })}
      </div>
      <div className="mt-1.5 text-center text-[11px] text-zinc-500 tabular-nums">
        {rows > 0 && cols > 0 ? `${rows} x ${cols} Table` : 'Table size'}
      </div>
    </div>
  );
}
