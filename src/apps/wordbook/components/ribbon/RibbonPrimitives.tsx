import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** A ribbon group: a row of controls with a Word-style caption underneath. */
export function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-stretch">
      <div className="flex items-center gap-0.5 px-1.5 flex-1">{children}</div>
      <div className="text-center text-[9.5px] text-zinc-500 tracking-wide mt-1 select-none">{label}</div>
    </div>
  );
}

export function RibbonDivider() {
  return <div className="w-px self-stretch bg-zinc-300 mx-1.5 my-1" />;
}

export function RibbonButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-7 min-w-7 px-1.5 rounded flex items-center justify-center gap-1 text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' : 'text-zinc-700 hover:bg-zinc-200/70'
      }`}
    >
      {children}
    </button>
  );
}

interface RibbonSelectOption {
  value: string;
  label: string;
  style?: React.CSSProperties;
}

/** A native-backed dropdown styled to sit flush in the ribbon. */
export function RibbonSelect({
  value,
  options,
  onChange,
  title,
  widthClass = 'w-28',
}: {
  value: string;
  options: RibbonSelectOption[];
  onChange: (value: string) => void;
  title: string;
  widthClass?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <div className={`relative h-7 ${widthClass}`}>
      <select
        title={title}
        aria-label={title}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full appearance-none bg-white border border-zinc-300 rounded pl-2 pr-6 text-xs text-zinc-800 cursor-pointer hover:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
        style={current?.style}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={o.style}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

const SWATCHES = [
  '#18181b', '#71717a', '#dc2626', '#ea580c', '#d97706', '#65a30d',
  '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#db2777',
];

/** A color button that pops a swatch grid + a native color input for anything custom. */
export function RibbonColorPicker({
  title,
  icon,
  currentColor,
  onPick,
  onClear,
}: {
  title: string;
  icon: React.ReactNode;
  currentColor: string | null;
  onPick: (color: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="h-7 min-w-7 px-1.5 rounded flex flex-col items-center justify-center gap-0 text-zinc-700 hover:bg-zinc-200/70 cursor-pointer"
      >
        {icon}
        <span
          className="w-4 h-[3px] rounded-sm mt-0.5"
          style={{ background: currentColor ?? '#18181b' }}
        />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 w-40">
          <div className="grid grid-cols-6 gap-1 mb-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="w-5 h-5 rounded border border-black/10 cursor-pointer"
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              defaultValue={currentColor ?? '#18181b'}
              onChange={(e) => onPick(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-zinc-300"
              title="Custom color"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="text-[11px] text-zinc-600 hover:text-zinc-900 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RibbonTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`px-3 h-6 text-[11.5px] font-medium rounded-t-md cursor-pointer transition-colors ${
        active ? 'bg-[#f3f2f6] text-purple-700' : 'text-zinc-600 hover:text-zinc-900'
      }`}
    >
      {children}
    </button>
  );
}
