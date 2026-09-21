import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectMenuOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  /** Classes for the trigger button (colors, padding, radius). */
  buttonClassName?: string;
  /** Classes for the option list — supply the surface colors (background, text, border) to match the host app's theme. */
  menuClassName?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * A dropdown whose list is drawn inside the app, unlike a native `<select>`
 * whose popup is positioned by the browser and can land outside the window on
 * touch devices. Opens downward, or upward when there is more room above.
 */
export default function SelectMenu({
  value,
  options,
  onChange,
  buttonClassName = '',
  menuClassName = 'bg-white text-slate-800 border-slate-200',
  className = '',
  disabled = false,
  placeholder = 'Select…',
  ariaLabel,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ up: boolean; maxH: number }>({ up: false, maxH: 224 });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Capture phase: the window shell stops propagation of pointer events that start inside it.
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  const toggle = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const up = below < 180 && above > below;
      setPlacement({ up, maxH: Math.max(96, Math.min(224, Math.floor(up ? above : below))) });
    }
    setOpen((v) => !v);
  };

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`w-full flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-50 ${buttonClassName}`}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          style={{ maxHeight: placement.maxH }}
          className={`absolute left-0 right-0 z-50 overflow-y-auto rounded-xl border shadow-2xl py-1 ${
            placement.up ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${menuClassName}`}
        >
          {options.length === 0 && <div className="px-3 py-2 text-xs opacity-60">No options</div>}
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                setOpen(false);
                onChange(o.value);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-left cursor-pointer hover:bg-current/10 ${
                o.value === value ? 'font-bold text-blue-500' : ''
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={13} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
