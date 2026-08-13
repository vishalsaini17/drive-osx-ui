import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContextMenuStore } from './contextMenuStore';
import { themeFamily } from '../../platform/theme/themes';
import { useShellTheme } from '../../platform/theme/useShellTheme';
import { useSystemStore } from '../state/systemStore';
import { ChevronRight } from 'lucide-react';

export default function GlobalContextMenu() {
  const {
    isOpen,
    x,
    y,
    title,
    items,
    activeSubmenuIndex,
    closeContextMenu,
    setActiveSubmenuIndex,
  } = useContextMenuStore();

  const theme = useSystemStore((state) => state.settings.theme);
  const activeTheme = theme || 'classic-light';
  // Must stay above the `if (!isOpen) return null` below: this component only
  // renders while the menu is open, so a hook after that point runs on some
  // renders and not others.
  const shell = useShellTheme();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click, window resize, or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    const handleScrollOrResize = () => {
      closeContextMenu();
    };

    // Use capture phase (true) so e.stopPropagation() in child elements won't prevent closing
    window.addEventListener('pointerdown', handleOutsideClick, true);
    window.addEventListener('mousedown', handleOutsideClick, true);
    window.addEventListener('click', handleOutsideClick, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', handleScrollOrResize, true);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('pointerdown', handleOutsideClick, true);
      window.removeEventListener('mousedown', handleOutsideClick, true);
      window.removeEventListener('click', handleOutsideClick, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', handleScrollOrResize, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, closeContextMenu]);

  if (!isOpen || items.length === 0) return null;

  // Calculate clamped positioning so the menu doesn't overflow screen boundaries
  const menuWidth = 220;
  const menuHeight = items.length * 34 + (title ? 28 : 0) + 16;

  const posX = Math.min(x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(y, window.innerHeight - menuHeight - 10);

  // Theme-dependent style variants
  const family = themeFamily(activeTheme);
  const isLight = family === 'light';
  const isTerminal = family === 'terminal';

  // The same material as the dock and its panels — a right-click menu is a
  // floating shell surface like any other, and used to be its own opaque slab.
  const containerBgClass = `${shell.panel} ${shell.text}`;

  const titleClass = `${shell.textSubtle} border-b ${shell.divider}`;

  const dividerClass = `border-t ${shell.divider}`;
  const itemHoverClass = `${shell.hover} ${shell.pressed} ${shell.text}`;
  const dangerHoverClass = isLight
    ? 'hover:bg-red-50 text-red-600 hover:text-red-700'
    : 'hover:bg-red-500/20 text-red-400 hover:text-red-300';
  const shortcutClass = shell.textSubtle;
  const chevronClass = shell.textSubtle;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.94, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.1 } }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        style={{
          top: Math.max(10, posY),
          left: Math.max(10, posX),
        }}
        className={`fixed z-[99999] min-w-[210px] max-w-[260px] backdrop-blur-xl rounded-2xl p-1.5 text-xs select-none overflow-visible ${containerBgClass}`}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {title && (
          <div className={`px-3 py-1.5 text-[11px] font-semibold mb-1 tracking-wide uppercase truncate ${titleClass}`}>
            {title}
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className={`my-1 mx-1 ${dividerClass}`}
                />
              );
            }

            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isSubmenuActive = activeSubmenuIndex === index;

            return (
              <div
                key={item.id || item.label || index}
                className="relative"
                onMouseEnter={() => {
                  if (hasSubmenu) {
                    setActiveSubmenuIndex(index);
                  } else {
                    setActiveSubmenuIndex(null);
                  }
                }}
              >
                <button
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.disabled) return;
                    if (item.onClick) {
                      item.onClick();
                      closeContextMenu();
                    }
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors gap-2 cursor-pointer ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : item.danger
                      ? dangerHoverClass
                      : itemHoverClass
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {item.icon && (
                      <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-80">
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate font-medium">{item.label}</span>
                  </div>

                  {item.shortcut && (
                    <span className={`text-[10px] font-mono pl-2 shrink-0 ${shortcutClass}`}>
                      {item.shortcut}
                    </span>
                  )}

                  {hasSubmenu && (
                    <ChevronRight size={14} className={`shrink-0 ml-1 ${chevronClass}`} />
                  )}
                </button>

                {/* Submenu Drawer */}
                {hasSubmenu && isSubmenuActive && (
                  <div
                    className={`absolute top-0 left-full ml-1 min-w-[180px] backdrop-blur-xl rounded-2xl p-1.5 z-[100000] text-xs ${containerBgClass}`}
                  >
                    {item.submenu!.map((subItem, subIdx) => (
                      <button
                        key={subItem.id || subItem.label || subIdx}
                        disabled={subItem.disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subItem.disabled) return;
                          if (subItem.onClick) {
                            subItem.onClick();
                            closeContextMenu();
                          }
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
                          subItem.disabled
                            ? 'opacity-40 cursor-not-allowed'
                            : subItem.danger
                            ? dangerHoverClass
                            : itemHoverClass
                        }`}
                      >
                        {subItem.icon && (
                          <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-80">
                            {subItem.icon}
                          </span>
                        )}
                        <span className="truncate font-medium">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

