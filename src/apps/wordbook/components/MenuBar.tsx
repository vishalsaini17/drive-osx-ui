import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowMenus } from '../../../platform/menus/AppMenuContext';
import { MenuPanel, placePanel, Placement } from '../../../shell/window-manager/WindowMenu';

interface MenuBarProps {
  windowId: string;
}

/**
 * A literal "File Edit View Insert Tools" text row, reading the exact same
 * menu data the OS shell's own hamburger button (`WindowMenu`) already
 * renders for this window — `useAppMenu` in `index.tsx` is the one and only
 * place those menus are defined; this is just a second way to reach them,
 * not a second copy of them. Reuses `WindowMenu`'s own `MenuPanel` for the
 * dropdown surface itself (submenus, shortcuts, checked/selected state all
 * come for free) rather than a second dropdown implementation.
 *
 * Always forces the light theme's panel styling, matching `TitleBar`'s own
 * choice to stay a light, paper-document look regardless of the desktop's
 * active theme.
 */
const LIGHT_THEME_ID = 'nova-light';

export default function MenuBar({ windowId }: MenuBarProps) {
  const menus = useWindowMenus(windowId);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpenMenuId(null);
    setPlacement(null);
  }, []);

  const openMenu = (id: string) => {
    const btn = buttonRefs.current[id];
    if (!btn) return;
    setPlacement(placePanel(btn.getBoundingClientRect(), 'below'));
    setOpenMenuId(id);
  };

  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (rootRef.current?.contains(target)) return;
      if (target.closest('[role="menu"]')) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId, close]);

  if (menus.length === 0) return null;

  return (
    <div ref={rootRef} className="flex items-center gap-0.5 px-2 h-6">
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            ref={(el) => {
              buttonRefs.current[menu.id] = el;
            }}
            type="button"
            onClick={() => (openMenuId === menu.id ? close() : openMenu(menu.id))}
            onPointerEnter={() => {
              // Once a menu is open, sliding the pointer across the other
              // labels switches between them, matching a native menu bar —
              // without an existing open menu, hovering does nothing.
              if (openMenuId && openMenuId !== menu.id) openMenu(menu.id);
            }}
            className={`px-2 h-6 rounded text-[13px] leading-none cursor-pointer ${
              openMenuId === menu.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {menu.label}
          </button>
          {openMenuId === menu.id && placement && (
            <MenuPanel items={menu.items} theme={LIGHT_THEME_ID} onClose={close} placement={placement} />
          )}
        </div>
      ))}
    </div>
  );
}
