import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Menu as MenuIcon } from 'lucide-react';
import { MenuItem, isAction, isHeading, isSeparator, isSubmenu } from '../../platform/menus/types';
import { themeFamily } from '../../platform/theme/themes';

interface WindowMenuProps {
  /** Flat list of dropdown entries; top-level app menus arrive as submenus. */
  items: MenuItem[];
  theme: string;
  buttonClassName?: string;
}

const PANEL_WIDTH = 240;
const VIEWPORT_MARGIN = 8;

function themeClasses(theme: string) {
  // Asked by family, so every theme in the catalogue is covered rather than
  // only the three whose ids used to be written out here.
  const family = themeFamily(theme);
  const isRetro = family === 'terminal';
  const isDark = family !== 'light';
  return {
    panel: isRetro
      ? 'bg-[#0a150d] border-emerald-500/30 text-emerald-300'
      : isDark
      ? 'bg-[#1e1a2e] border-white/15 text-slate-100'
      : 'bg-white/95 backdrop-blur-xl border-slate-200/80 text-slate-800',
    hover: isRetro
      ? 'hover:bg-emerald-500/15 hover:text-emerald-200'
      : isDark
      ? 'hover:bg-white/10 hover:text-white'
      : 'hover:bg-slate-100/90 hover:text-slate-900',
    open: isRetro ? 'bg-emerald-500/15' : isDark ? 'bg-white/10' : 'bg-slate-100/90',
    shortcut: isRetro ? 'text-emerald-500/60' : 'text-slate-400',
    divider: isRetro ? 'border-emerald-500/20' : isDark ? 'border-white/10' : 'border-slate-100',
    heading: isRetro ? 'text-emerald-500/60' : isDark ? 'text-slate-500' : 'text-slate-400',
  };
}

interface Placement {
  left: number;
  top: number;
  maxHeight: number;
}

/**
 * Positions a panel next to an anchor in viewport coordinates, flipping to the
 * other side and clamping vertically when it would leave the screen.
 */
function placePanel(anchor: DOMRect, mode: 'below' | 'beside'): Placement {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let left = mode === 'below' ? anchor.left : anchor.right + 2;
  if (left + PANEL_WIDTH > viewportW - VIEWPORT_MARGIN) {
    left =
      mode === 'below'
        ? Math.max(VIEWPORT_MARGIN, anchor.right - PANEL_WIDTH)
        : Math.max(VIEWPORT_MARGIN, anchor.left - PANEL_WIDTH - 2);
  }
  left = Math.max(VIEWPORT_MARGIN, left);

  let top = mode === 'below' ? anchor.bottom + 6 : anchor.top - 6;
  top = Math.max(VIEWPORT_MARGIN, top);

  // Whatever room is left below the anchor; the panel scrolls inside it.
  const maxHeight = Math.max(140, viewportH - top - VIEWPORT_MARGIN);

  return { left, top, maxHeight };
}

interface PanelProps {
  items: MenuItem[];
  theme: string;
  onClose: () => void;
  placement: Placement;
  /** Keeps a parent panel open while the pointer is inside a child. */
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

/**
 * One dropdown surface, rendered into a portal.
 *
 * Portals matter here: the window frame sets `overflow: hidden`, and the panel
 * itself scrolls. Either one would clip a submenu that opens to the side, so
 * every panel is mounted on `document.body` and positioned in viewport
 * coordinates instead of being nested inside its parent.
 */
function MenuPanel({ items, theme, onClose, placement, onPointerEnter, onPointerLeave }: PanelProps) {
  const styles = themeClasses(theme);
  const [openSubmenu, setOpenSubmenu] = useState<{ id: string; placement: Placement } | null>(null);
  const closeTimer = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ top: placement.top, maxHeight: placement.maxHeight });

  // Once the real height is known, pull the panel up if it overhangs, and
  // recompute the height budget from where it actually ended up.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const height = el.scrollHeight;
    const limit = window.innerHeight - VIEWPORT_MARGIN;
    const overflow = placement.top + height - limit;
    const top = overflow > 0 ? Math.max(VIEWPORT_MARGIN, placement.top - overflow) : placement.top;
    setBox({ top, maxHeight: Math.max(140, limit - top) });
  }, [placement.top, placement.maxHeight, items]);

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const scheduleClose = () => {
    cancelClose();
    // Grace period so the pointer can travel into the submenu.
    closeTimer.current = window.setTimeout(() => setOpenSubmenu(null), 220);
  };

  useEffect(() => () => cancelClose(), []);

  return createPortal(
    <div
      ref={panelRef}
      onPointerEnter={() => {
        cancelClose();
        onPointerEnter?.();
      }}
      onPointerLeave={onPointerLeave}
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: 'fixed',
        left: placement.left,
        top: box.top,
        width: PANEL_WIDTH,
        maxHeight: box.maxHeight,
        zIndex: 100000,
      }}
      className={`overflow-y-auto overflow-x-hidden custom-scrollbar rounded-2xl border p-1.5 shadow-2xl select-none font-sans text-xs animate-in fade-in zoom-in-95 duration-100 ${styles.panel}`}
      role="menu"
    >
      {items.map((item, index) => {
        if (isSeparator(item)) {
          return <div key={item.id ?? `sep-${index}`} className={`my-1 border-t ${styles.divider}`} />;
        }

        if (isHeading(item)) {
          return (
            <div
              key={item.id ?? `head-${index}`}
              className={`px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider ${styles.heading}`}
            >
              {item.label}
            </div>
          );
        }

        if (isSubmenu(item)) {
          const isOpen = openSubmenu?.id === item.id;
          return (
            <div
              key={item.id}
              onPointerEnter={(event) => {
                cancelClose();
                if (item.disabled) return;
                const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                setOpenSubmenu({ id: item.id, placement: placePanel(rect, 'beside') });
              }}
              onPointerLeave={scheduleClose}
            >
              <button
                type="button"
                disabled={item.disabled}
                onClick={(event) => {
                  if (item.disabled) return;
                  const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                  setOpenSubmenu(isOpen ? null : { id: item.id, placement: placePanel(rect, 'beside') });
                }}
                className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.disabled ? '' : styles.hover
                } ${isOpen && !item.disabled ? styles.open : ''}`}
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {item.icon && <item.icon size={13} className="shrink-0 opacity-70" />}
                  <span className="truncate font-medium">{item.label}</span>
                </span>
                <ChevronRight size={13} className="shrink-0 opacity-60" />
              </button>

              {isOpen && !item.disabled && (
                <MenuPanel
                  items={item.items}
                  theme={theme}
                  onClose={onClose}
                  placement={openSubmenu!.placement}
                  onPointerEnter={cancelClose}
                  onPointerLeave={scheduleClose}
                />
              )}
            </div>
          );
        }

        if (isAction(item)) {
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                onClose();
              }}
              onPointerEnter={scheduleClose}
              className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                item.disabled ? '' : styles.hover
              } ${item.danger ? 'text-rose-500' : ''}`}
              role="menuitem"
            >
              <span className="flex items-center gap-2 min-w-0">
                {item.icon && (
                  <span className="w-3.5 shrink-0 flex items-center justify-center">
                    <item.icon size={13} className="opacity-70" />
                  </span>
                )}
                <span className="truncate font-medium">{item.label}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {item.shortcut && (
                  <span className={`text-[11px] font-mono ${styles.shortcut}`}>{item.shortcut}</span>
                )}
                {(item.checked || item.selected) && (
                  <span className="w-3.5 flex items-center justify-center">
                    {item.checked && <Check size={12} />}
                    {item.selected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                  </span>
                )}
              </span>
            </button>
          );
        }

        return null;
      })}
    </div>,
    document.body
  );
}

/**
 * The window's menu button and its dropdown.
 *
 * A single icon in the top-left corner opens one dropdown; each application
 * menu (File, Edit, View and any app-specific ones) appears inside it as a
 * submenu, alongside Preferences and Help.
 */
export default function WindowMenu({ items, theme, buttonClassName = '' }: WindowMenuProps) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const styles = themeClasses(theme);
  const isOpen = placement !== null;

  const close = useCallback(() => setPlacement(null), []);

  const open = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPlacement(placePanel(rect, 'below'));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      // Panels live in a portal, so containment is checked against the
      // button plus anything marked as menu surface.
      const target = event.target as HTMLElement;
      if (buttonRef.current?.contains(target)) return;
      if (target.closest('[role="menu"]')) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    // A window move or resize would leave the panel behind; close instead.
    // Scrolling inside a long menu is not such a move, so ignore it.
    const onViewportChange = (event?: Event) => {
      const target = event?.target as HTMLElement | null;
      if (target?.closest?.('[role="menu"]')) return;
      close();
    };

    // Capture phase: AppWindow's own pointerdown handler (used for window
    // focus) calls stopPropagation() on every click inside the window, which
    // would otherwise stop this listener from ever seeing clicks that land
    // inside the same app window but outside the menu.
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [isOpen, close]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) close();
          else open();
        }}
        className={`win-control-btn w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${buttonClassName} ${
          isOpen ? styles.open : ''
        }`}
        title="Application menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MenuIcon className="w-3.5 h-3.5" />
      </button>

      {placement && <MenuPanel items={items} theme={theme} onClose={close} placement={placement} />}
    </>
  );
}
