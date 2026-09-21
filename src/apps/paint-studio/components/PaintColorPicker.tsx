import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const POPOVER_VIEWPORT_MARGIN = 8;

/**
 * Pulls a fixed-position popover back inside the viewport — flips above the
 * trigger instead of below when it would overflow the bottom, and shifts
 * left when it would overflow the right. Same shape as wordbook's own
 * `clampPopoverPosition` (RibbonPrimitives.tsx); kept as a local copy
 * rather than a cross-app import so this app stays self-contained.
 */
function clampPosition(
  triggerRect: DOMRect,
  size: { width: number; height: number },
  preferred: { top: number; left: number }
): { top: number; left: number } {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let left = preferred.left;
  if (left + size.width > viewportW - POPOVER_VIEWPORT_MARGIN) {
    left = triggerRect.right - size.width;
  }
  left = Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(left, viewportW - size.width - POPOVER_VIEWPORT_MARGIN));

  let top = preferred.top;
  if (top + size.height > viewportH - POPOVER_VIEWPORT_MARGIN) {
    top = triggerRect.top - size.height - 4;
  }
  top = Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(top, viewportH - size.height - POPOVER_VIEWPORT_MARGIN));

  return { top, left };
}

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

interface PaintColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  title: string;
  palette: string[];
  /** Matches whichever native `<input type="color">` this replaces, so swapping one in for the other never shifts the surrounding layout. */
  triggerClassName?: string;
}

/**
 * Replaces a plain `<input type="color">` with a swatch-grid + hex-entry
 * popover we position and clamp ourselves.
 *
 * The native color input's own popup is drawn by the browser, anchored to
 * the input in a way this app has no say over — on a phone-width window it
 * was opening partly or fully off the visible screen with no way to reach
 * the swatches. A native input still lives *inside* this popover (the
 * "more colours" swatch) for full-spectrum picking, but its trigger is now
 * a small control safely inside an already-on-screen panel rather than the
 * thing being opened directly, so even if a given browser anchors that
 * inner native popup oddly, the common case — a preset or a typed hex
 * value — never depends on it at all.
 */
export default function PaintColorPicker({ value, onChange, title, palette, triggerClassName }: PaintColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    if (!open) setHexDraft(value);
  }, [value, open]);

  const openPicker = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    triggerRectRef.current = rect;
    setPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open || !position || !popoverRef.current || !triggerRectRef.current) return;
    const size = popoverRef.current.getBoundingClientRect();
    const clamped = clampPosition(triggerRectRef.current, { width: size.width, height: size.height }, position);
    if (clamped.top !== position.top || clamped.left !== position.left) setPosition(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', () => setOpen(false), true);
    window.addEventListener('resize', () => setOpen(false));
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  const commitHex = (raw: string) => {
    const trimmed = raw.trim();
    if (HEX_PATTERN.test(trimmed)) {
      onChange(trimmed.startsWith('#') ? trimmed : `#${trimmed}`);
    } else {
      setHexDraft(value);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title={title}
        onClick={() => (open ? setOpen(false) : openPicker())}
        style={{ backgroundColor: value }}
        className={triggerClassName ?? 'w-6 h-6 rounded cursor-pointer border border-slate-300 p-0'}
      />
      {open &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 100000 }}
            className="bg-white border border-slate-200 rounded-lg shadow-xl p-2.5 w-56"
          >
            <div className="grid grid-cols-10 gap-1 mb-2">
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    onChange(color);
                    setOpen(false);
                  }}
                  className="w-4 h-4 rounded-xs border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0 shrink-0"
                title="More colours"
              />
              <input
                type="text"
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value)}
                onBlur={(e) => commitHex(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitHex(e.currentTarget.value);
                    e.currentTarget.blur();
                  }
                }}
                className="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-[11px] font-mono uppercase focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
