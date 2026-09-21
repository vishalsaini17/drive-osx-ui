import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus, Pipette } from 'lucide-react';

const POPOVER_VIEWPORT_MARGIN = 8;

/**
 * Pulls a fixed-position popover back inside the viewport — flips to open
 * above the trigger instead of below when it would overflow the bottom, and
 * aligns to the trigger's right edge instead of its left when it would
 * overflow the right (the ribbon's controls run close to the window's own
 * right edge, so a wide popover opening flush-left of its trigger easily
 * runs past it). Shared by every ribbon popover rather than reimplemented
 * per one, the same way `RibbonDropdown` itself is shared.
 */
export function clampPopoverPosition(
  triggerRect: DOMRect,
  popoverSize: { width: number; height: number },
  preferred: { top: number; left: number }
): { top: number; left: number } {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let left = preferred.left;
  if (left + popoverSize.width > viewportW - POPOVER_VIEWPORT_MARGIN) {
    left = triggerRect.right - popoverSize.width;
  }
  left = Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(left, viewportW - popoverSize.width - POPOVER_VIEWPORT_MARGIN));

  let top = preferred.top;
  if (top + popoverSize.height > viewportH - POPOVER_VIEWPORT_MARGIN) {
    top = triggerRect.top - popoverSize.height - 4;
  }
  top = Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(top, viewportH - popoverSize.height - POPOVER_VIEWPORT_MARGIN));

  return { top, left };
}

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

/** A Docs-style [-] [number] [+] stepper — used for font size. Commits on blur/Enter, not on every keystroke, so a partial edit (e.g. clearing the box to retype) never fires an intermediate change. */
export function RibbonStepper({
  value,
  onChange,
  min = 1,
  max = 400,
  title,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  title: string;
}) {
  const [text, setText] = useState(String(value));
  const lastCommitted = useRef(value);
  useEffect(() => {
    if (value !== lastCommitted.current) setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      lastCommitted.current = clamped;
      setText(String(clamped));
      onChange(clamped);
    } else {
      setText(String(value));
    }
  };

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    lastCommitted.current = next;
    setText(String(next));
    onChange(next);
  };

  return (
    <div className="flex items-center h-7 border border-zinc-300 rounded bg-white">
      <button
        type="button"
        title="Decrease"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => step(-1)}
        className="w-5 h-full flex items-center justify-center text-zinc-600 hover:bg-zinc-100 cursor-pointer rounded-l"
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        title={title}
        aria-label={title}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit(e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
        className="w-8 h-full text-center text-xs outline-none"
      />
      <button
        type="button"
        title="Increase"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => step(1)}
        className="w-5 h-full flex items-center justify-center text-zinc-600 hover:bg-zinc-100 cursor-pointer rounded-r"
      >
        +
      </button>
    </div>
  );
}

const DEFAULT_FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];

/**
 * `RibbonStepper` plus a Docs-style preset list: clicking (focusing) the
 * number opens a dropdown of common sizes, while the field stays a real
 * input the whole time — typing a custom value and pressing Enter still
 * works exactly like the plain stepper. Portaled + clamped the same way
 * every other ribbon popover is (see `clampPopoverPosition`).
 */
export function RibbonFontSizeStepper({
  value,
  onChange,
  min = 1,
  max = 400,
  title,
  presets = DEFAULT_FONT_SIZE_PRESETS,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  title: string;
  presets?: number[];
}) {
  const [text, setText] = useState(String(value));
  const lastCommitted = useRef(value);
  useEffect(() => {
    if (value !== lastCommitted.current) setText(String(value));
  }, [value]);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRectRef = useRef<DOMRect | null>(null);

  const openDropdown = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    triggerRectRef.current = rect;
    setPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open || !position || !popoverRef.current || !triggerRectRef.current) return;
    const size = popoverRef.current.getBoundingClientRect();
    const clamped = clampPopoverPosition(triggerRectRef.current, { width: size.width, height: size.height }, position);
    if (clamped.top !== position.top || clamped.left !== position.left) setPosition(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (inputRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const commit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      lastCommitted.current = clamped;
      setText(String(clamped));
      onChange(clamped);
    } else {
      setText(String(value));
    }
    setOpen(false);
  };

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    lastCommitted.current = next;
    setText(String(next));
    onChange(next);
  };

  const pickPreset = (preset: number) => {
    lastCommitted.current = preset;
    setText(String(preset));
    onChange(preset);
    setOpen(false);
  };

  return (
    <div className="flex items-center h-7 border border-zinc-300 rounded bg-white">
      <button
        type="button"
        title="Decrease"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => step(-1)}
        className="w-5 h-full flex items-center justify-center text-zinc-600 hover:bg-zinc-100 cursor-pointer rounded-l"
      >
        −
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        title={title}
        aria-label={title}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={openDropdown}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit(e.currentTarget.value);
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="w-8 h-full text-center text-xs outline-none"
      />
      <button
        type="button"
        title="Increase"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => step(1)}
        className="w-5 h-full flex items-center justify-center text-zinc-600 hover:bg-zinc-100 cursor-pointer rounded-r"
      >
        +
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            data-ribbon-popover="true"
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 100000 }}
            className="bg-white border border-zinc-200 rounded-lg shadow-lg py-1 w-16 max-h-72 overflow-y-auto"
          >
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickPreset(preset)}
                className={`w-full text-center px-2 py-1 text-xs cursor-pointer ${
                  preset === value ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

/** The standard Google Docs/Sheets 10×8 font/highlight color grid — grayscale, the 10 base hues, then 6 lighter-to-darker shade rows of each. */
const COLOR_PALETTE: string[][] = [
  ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff'],
  ['#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'],
  ['#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'],
  ['#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
  ['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0'],
  ['#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
  ['#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47'],
  ['#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'],
];

/** Perceived-luminance check — decides whether a swatch's selected-checkmark should render white or dark to stay visible against it. */
function isLightColor(hex: string): boolean {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return true;
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/**
 * A color button that pops a swatch grid + a native color input for anything
 * custom. Portaled to `document.body` with fixed positioning — see
 * `RibbonDropdown`'s doc comment just below for why a plain `position:
 * absolute` popover inside the ribbon's scrollable row gets clipped instead
 * of shown.
 */
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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  // Session-only, per-picker (text color and highlight each keep their own)
  // — there's no per-document or per-user "recent colors" store to persist
  // this into, the same reasoning the other curated-not-exhaustive pickers
  // in this app (Symbols, Emoji) already follow.
  const [customColors, setCustomColors] = useState<string[]>([]);

  const addCustomColor = (color: string) => {
    setCustomColors((prev) => (prev.includes(color) ? prev : [color, ...prev].slice(0, 10)));
  };

  const pickWithEyedropper = async () => {
    const EyeDropperCtor = (window as any).EyeDropper;
    if (!EyeDropperCtor) {
      alert('Eyedropper is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    try {
      const result = await new EyeDropperCtor().open();
      if (result?.sRGBHex) {
        addCustomColor(result.sRGBHex);
        onPick(result.sRGBHex);
        setOpen(false);
      }
    } catch {
      // User cancelled the eyedropper — nothing to do.
    }
  };

  const triggerRectRef = useRef<DOMRect | null>(null);

  const openPicker = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    triggerRectRef.current = rect;
    setPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  // Corrects the preferred position once the 80-swatch-plus-custom-row
  // popover has its real size — see `RibbonDropdown`'s identical effect for
  // why this can't be computed up front.
  useLayoutEffect(() => {
    if (!open || !position || !popoverRef.current || !triggerRectRef.current) return;
    const size = popoverRef.current.getBoundingClientRect();
    const clamped = clampPopoverPosition(triggerRectRef.current, { width: size.width, height: size.height }, position);
    if (clamped.top !== position.top || clamped.left !== position.left) setPosition(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="h-7 min-w-7 px-1.5 rounded flex flex-col items-center justify-center gap-0 text-zinc-700 hover:bg-zinc-200/70 cursor-pointer"
      >
        {icon}
        <span
          className="w-4 h-[3px] rounded-sm mt-0.5"
          style={{ background: currentColor ?? '#18181b' }}
        />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            data-ribbon-popover="true"
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 100000 }}
            className="bg-white border border-zinc-200 rounded-lg shadow-lg p-2.5 w-64"
          >
            <div className="space-y-1 mb-2">
              {COLOR_PALETTE.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((c) => {
                    const selected = currentColor?.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onPick(c);
                          setOpen(false);
                        }}
                        className="w-5 h-5 rounded-full border border-black/10 cursor-pointer flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                        style={{ background: c }}
                      >
                        {selected && <Check className="w-3 h-3" style={{ color: isLightColor(c) ? '#18181b' : '#ffffff' }} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-200 pt-2">
              <div className="text-[10px] font-semibold tracking-wide text-zinc-500 mb-1">CUSTOM</div>
              <div className="flex flex-wrap items-center gap-1">
                {customColors.map((c) => {
                  const selected = currentColor?.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onPick(c);
                        setOpen(false);
                      }}
                      className="w-5 h-5 rounded-full border border-black/10 cursor-pointer flex items-center justify-center shrink-0"
                      style={{ background: c }}
                    >
                      {selected && <Check className="w-3 h-3" style={{ color: isLightColor(c) ? '#18181b' : '#ffffff' }} />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  title="Add a custom color"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => customInputRef.current?.click()}
                  className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <input
                  ref={customInputRef}
                  type="color"
                  defaultValue={currentColor ?? '#18181b'}
                  onChange={(e) => {
                    addCustomColor(e.target.value);
                    onPick(e.target.value);
                    setOpen(false);
                  }}
                  className="sr-only"
                  title="Custom color"
                />
                <button
                  type="button"
                  title="Pick a color from your screen"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={pickWithEyedropper}
                  className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 cursor-pointer shrink-0"
                >
                  <Pipette className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-200 mt-2 pt-1.5">
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
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * A button that pops open arbitrary content (a style grid, a preset list).
 *
 * Portaled to `document.body` with fixed positioning computed from the
 * trigger's own `getBoundingClientRect()` — the same reasoning
 * `WindowMenu.tsx`'s `MenuPanel` documents for doing the same thing: the
 * ribbon row is horizontally scrollable (`overflow-x-auto`), and per the CSS
 * spec, giving `overflow-x` any value but `visible` forces `overflow-y` to
 * compute as `auto` too — so a plain `position: absolute` popover nested
 * inside that row gets silently clipped below the row's own height instead
 * of floating over the page underneath it.
 */
export function RibbonDropdown({
  title,
  trigger,
  children,
  widthClass = 'w-44',
}: {
  title: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRectRef = useRef<DOMRect | null>(null);

  const openDropdown = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    triggerRectRef.current = rect;
    setPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  // Corrects the *actual* rendered position after the popover has its real
  // size — its content (a 6×10 color grid vs. a short menu) isn't known
  // until it mounts, so an overflow check has to happen post-render, not
  // when `openDropdown` merely guesses a preferred spot.
  useLayoutEffect(() => {
    if (!open || !position || !popoverRef.current || !triggerRectRef.current) return;
    const size = popoverRef.current.getBoundingClientRect();
    const clamped = clampPopoverPosition(triggerRectRef.current, { width: size.width, height: size.height }, position);
    if (clamped.top !== position.top || clamped.left !== position.left) setPosition(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Capture phase — see WindowMenu.tsx's identical listener for why:
    // AppWindow's own pointerdown handler (window-focus) calls
    // stopPropagation() on every click inside the window, which would
    // otherwise stop this listener from ever seeing the click.
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="h-7 px-1 rounded flex items-center gap-0.5 text-zinc-700 hover:bg-zinc-200/70 cursor-pointer"
      >
        {trigger}
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            data-ribbon-popover="true"
            onClick={() => setOpen(false)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 100000 }}
            className={`bg-white border border-zinc-200 rounded-lg shadow-lg p-2 ${widthClass}`}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * The ribbon's "More options" overflow menu (mobile/tablet, see
 * `RibbonToolbar.tsx`'s `isCompact`) — same trigger/popover/clamped-position
 * shape as `RibbonDropdown`, but deliberately not built on top of it:
 *
 * 1. `RibbonDropdown`'s popover closes itself on *any* click inside it — the
 *    right behavior for a flat list of one-shot actions, wrong here, where
 *    the content is a whole second copy of the ribbon (buttons, selects,
 *    color pickers, nested `RibbonDropdown`s) that should stay open across
 *    an arbitrary number of interactions.
 * 2. Every popover in this file (`RibbonDropdown`, `RibbonColorPicker`,
 *    `RibbonFontSizeStepper`) portals to `document.body`, so a *nested* one
 *    opened from inside this menu — e.g. its embedded Zoom or bullet-style
 *    `RibbonDropdown` — renders as a sibling in the DOM, not a descendant.
 *    A plain `popoverRef.contains(target)` outside-click check would
 *    therefore treat a click inside that nested popover as "outside" and
 *    close this whole menu out from under it. Every such popover in this
 *    file marks its portaled root `data-ribbon-popover="true"`
 *    specifically so this check can also recognize those as "still inside."
 */
export function RibbonMoreMenu({
  title,
  trigger,
  children,
  widthClass = 'w-72',
}: {
  title: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRectRef = useRef<DOMRect | null>(null);

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    triggerRectRef.current = rect;
    setPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open || !position || !popoverRef.current || !triggerRectRef.current) return;
    const size = popoverRef.current.getBoundingClientRect();
    const clamped = clampPopoverPosition(triggerRectRef.current, { width: size.width, height: size.height }, position);
    if (clamped.top !== position.top || clamped.left !== position.left) setPosition(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      // Inside a nested popover (Zoom, a color picker, a bullet-style
      // grid, …) portaled elsewhere in the DOM — see the doc comment above.
      if (target instanceof Element && target.closest('[data-ribbon-popover]')) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`h-7 w-7 rounded flex items-center justify-center cursor-pointer ${
          open ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200/70'
        }`}
      >
        {trigger}
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            data-ribbon-popover="true"
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 100000 }}
            className={`bg-white border border-zinc-200 rounded-lg shadow-xl p-2 max-h-[70vh] overflow-y-auto flex flex-col gap-2.5 ${widthClass}`}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

/** A labeled group of controls inside `RibbonMoreMenu` — keeps the overflow
 *  menu navigable (still organized by what the desktop ribbon's own
 *  dividers group together) instead of one flat, unlabeled row of icons. */
export function RibbonMoreMenuSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-0.5">{label}</span>
      <div className="flex flex-wrap items-center gap-0.5 p-1 rounded-md bg-zinc-50 border border-zinc-100">{children}</div>
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
