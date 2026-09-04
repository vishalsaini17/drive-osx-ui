import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Menu } from './types';

/**
 * Applications publish their menus here and the window chrome renders them.
 *
 * The registry is keyed by window id so an app only ever supplies menus for
 * its own window, and a closing window's menus disappear with it.
 */

interface AppMenuRegistry {
  menusByWindow: Record<string, Menu[]>;
  setMenus: (windowId: string, menus: Menu[] | null) => void;
}

const AppMenuContext = createContext<AppMenuRegistry | null>(null);

export function AppMenuProvider({ children }: { children: React.ReactNode }) {
  const [menusByWindow, setMenusByWindow] = useState<Record<string, Menu[]>>({});

  const setMenus = React.useCallback((windowId: string, menus: Menu[] | null) => {
    setMenusByWindow((prev) => {
      if (menus === null) {
        if (!(windowId in prev)) return prev;
        const next = { ...prev };
        delete next[windowId];
        return next;
      }
      return { ...prev, [windowId]: menus };
    });
  }, []);

  const value = useMemo(() => ({ menusByWindow, setMenus }), [menusByWindow, setMenus]);

  return <AppMenuContext.Provider value={value}>{children}</AppMenuContext.Provider>;
}

export function useAppMenuRegistry(): AppMenuRegistry | null {
  return useContext(AppMenuContext);
}

/** Menus contributed by the app in `windowId`, or an empty list. */
export function useWindowMenus(windowId: string): Menu[] {
  const registry = useAppMenuRegistry();
  return registry?.menusByWindow[windowId] ?? [];
}

/**
 * Publishes an application's menus.
 *
 * Menu definitions close over live state, so a new tree is built on nearly
 * every render. Two things keep that from looping:
 *
 *  - only a change to the structural signature republishes, so ordinary
 *    re-renders do not touch the registry, and
 *  - the published tree's handlers are indirections that call through a ref
 *    to the newest definition, so a stale published tree still runs current
 *    code when an item is clicked.
 *
 * An earlier version refreshed the handlers by calling `setMenus` from an
 * effect with no dependency array. Because the registry stores a fresh object
 * each time, that re-rendered every consumer, which re-ran the effect: an
 * infinite loop.
 */
export function useAppMenu(windowId: string, menus: Menu[]): void {
  const registry = useAppMenuRegistry();
  const setMenus = registry?.setMenus;
  const signature = useMemo(() => menuSignature(menus), [menus]);

  const latestMenus = useRef(menus);
  latestMenus.current = menus;

  // Rebuilt only when the signature changes; handlers resolve at click time.
  const boundMenus = useMemo(
    () => bindHandlers(menus, latestMenus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  );

  useEffect(() => {
    setMenus?.(windowId, boundMenus);
  }, [setMenus, windowId, boundMenus]);

  useEffect(() => {
    return () => setMenus?.(windowId, null);
  }, [setMenus, windowId]);
}

/**
 * Replaces every `onSelect` with a lookup against the newest menu tree, so a
 * published tree never invokes a stale closure.
 */
export function bindHandlers(menus: Menu[], latest: { current: Menu[] }): Menu[] {
  const bindItems = (items: any[], path: number[]): any[] =>
    items.map((item, index) => {
      const here = [...path, index];
      if (item.kind === 'separator' || item.kind === 'heading') return item;
      if (item.kind === 'submenu') return { ...item, items: bindItems(item.items, here) };
      return {
        ...item,
        onSelect: () => {
          const live = resolveByPath(latest.current, here);
          if (live && typeof live.onSelect === 'function') live.onSelect();
          else item.onSelect();
        },
      };
    });

  return menus.map((menu, index) => ({ ...menu, items: bindItems(menu.items, [index]) }));
}

/** Walks [menuIndex, itemIndex, ...] down the current tree. */
function resolveByPath(menus: Menu[], path: number[]): any {
  const [menuIndex, ...rest] = path;
  const menu = menus[menuIndex];
  if (!menu) return null;
  let items: any[] = menu.items;
  let node: any = null;
  for (const index of rest) {
    node = items?.[index];
    if (!node) return null;
    items = node.items;
  }
  return node;
}

/** Structural fingerprint: everything that affects how a menu looks. */
export function menuSignature(menus: Menu[]): string {
  const encode = (items: any[]): string =>
    items
      .map((item) => {
        if (item.kind === 'separator') return '|';
        if (item.kind === 'heading') return `h:${item.label}`;
        if (item.kind === 'submenu') {
          return `s:${item.id}:${item.label}:${item.disabled ? 1 : 0}(${encode(item.items)})`;
        }
        return [
          'a', item.id, item.label, item.shortcut ?? '',
          item.disabled ? 1 : 0,
          item.checked === undefined ? '' : item.checked ? 1 : 0,
          item.selected === undefined ? '' : item.selected ? 1 : 0,
          item.danger ? 1 : 0,
        ].join(':');
      })
      .join(',');

  return menus.map((menu) => `${menu.id}:${menu.label}[${encode(menu.items)}]`).join(';');
}
