import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { useWindowMenus } from '../../../platform/menus/AppMenuContext';
import { Menu, MenuItem, isAction, isSubmenu } from '../../../platform/menus/types';
import { clampPopoverPosition } from './ribbon/RibbonPrimitives';

interface SearchHit {
  id: string;
  label: string;
  path: string[];
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}

/** Walks every menu (including nested submenus) into one flat, searchable list of leaf actions. */
function flatten(menus: Menu[]): SearchHit[] {
  const hits: SearchHit[] = [];
  const walk = (items: MenuItem[], path: string[]) => {
    for (const item of items) {
      if (isSubmenu(item)) {
        walk(item.items, [...path, item.label]);
      } else if (isAction(item)) {
        hits.push({ id: item.id, label: item.label, path, shortcut: item.shortcut, disabled: item.disabled, onSelect: item.onSelect });
      }
    }
  };
  for (const menu of menus) walk(menu.items, [menu.label]);
  return hits;
}

interface MenuSearchProps {
  windowId: string;
}

/**
 * View > "Search the menus" — flattens every File/Edit/View/… menu (and
 * their submenus) into one searchable list, reading the exact same live,
 * always-bound tree `MenuBar` renders via `useWindowMenus` (see
 * `AppMenuContext.tsx`'s `bindHandlers`), so picking a result runs the
 * identical handler clicking through the real menu would — not a second,
 * possibly-stale copy of what each command does.
 */
export default function MenuSearch({ windowId }: MenuSearchProps) {
  const menus = useWindowMenus(windowId);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRectRef = useRef<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allHits = useMemo(() => flatten(menus), [menus]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allHits.filter((h) => h.label.toLowerCase().includes(q) || h.path.some((p) => p.toLowerCase().includes(q))).slice(0, 20);
  }, [allHits, query]);

  const showResults = open && query.trim().length > 0;
  const RESULTS_WIDTH = 256; // matches the panel's w-64 below

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      if (popoverRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  // The results panel is portaled to <body> and `position: fixed` rather
  // than a plain `absolute` child (see `RibbonDropdown` in
  // RibbonPrimitives.tsx for the identical issue) — this box now lives
  // inside the ribbon's `overflow-x-auto` row, and setting overflow-x to
  // anything but `visible` forces overflow-y to `auto` too, clipping an
  // ordinary absolutely-positioned popover instead of letting it float
  // above the row.
  useLayoutEffect(() => {
    if (!showResults) {
      setPosition(null);
      return;
    }
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    triggerRectRef.current = rect;
    setPosition({ top: rect.bottom + 4, left: rect.right - RESULTS_WIDTH });
  }, [showResults]);

  // Corrects the preferred position once the popover has its real rendered
  // height (it varies with the result count), same two-phase approach
  // `RibbonDropdown` uses.
  useLayoutEffect(() => {
    if (!showResults || !position || !popoverRef.current || !triggerRectRef.current) return;
    const size = popoverRef.current.getBoundingClientRect();
    const clamped = clampPopoverPosition(triggerRectRef.current, { width: size.width, height: size.height }, position);
    if (clamped.top !== position.top || clamped.left !== position.left) setPosition(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, position, results.length]);

  // Matches Docs' own "search the menus" shortcut (Alt+/) so the box is
  // reachable without a mouse, not just discoverable by clicking it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === '/') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const runHit = (hit: SearchHit) => {
    if (hit.disabled) return;
    hit.onSelect();
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[activeIndex];
      if (hit) runHit(hit);
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div
        ref={boxRef}
        className="flex items-center gap-1.5 h-6 px-2 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-white focus-within:bg-white focus-within:border-purple-300 w-36 transition-colors"
      >
        <Search className="w-3 h-3 text-zinc-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Menus"
          title="Search the menus (Alt+/)"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent outline-none text-[11px] text-zinc-700 placeholder:text-zinc-400"
        />
      </div>
      {showResults &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            role="menu"
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left, width: RESULTS_WIDTH, zIndex: 100000 }}
            className="max-h-80 overflow-y-auto bg-white border border-zinc-200 rounded-md shadow-lg py-1"
          >
            {results.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-zinc-400">No matching menu items</div>
            ) : (
              results.map((hit, i) => (
                <button
                  key={`${hit.path.join('/')}/${hit.id}`}
                  type="button"
                  disabled={hit.disabled}
                  onClick={() => runHit(hit)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left ${
                    hit.disabled ? 'opacity-40 cursor-not-allowed' : `cursor-pointer ${i === activeIndex ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-zinc-800 truncate">{hit.label}</span>
                    <span className="block text-[10px] text-zinc-400 truncate">{hit.path.join(' › ')}</span>
                  </span>
                  {hit.shortcut && <span className="shrink-0 text-[10px] text-zinc-400">{hit.shortcut}</span>}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
