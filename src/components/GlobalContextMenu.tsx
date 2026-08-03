import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContextMenuStore } from '../services/contextMenuStore';
import { useSystemStore } from '../systemStore';
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
  const isLight = activeTheme === 'classic-light';
  const isTerminal = activeTheme === 'retro-terminal';

  const containerBgClass = isLight
    ? 'bg-white/95 text-slate-800 border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5'
    : isTerminal
    ? 'bg-[#0c100c]/95 text-emerald-400 border border-emerald-500/30 shadow-[0_12px_40px_rgba(0,255,0,0.1)] ring-1 ring-emerald-500/20 font-mono'
    : 'bg-slate-900/95 text-slate-100 border border-white/15 shadow-2xl ring-1 ring-black/40';

  const titleClass = isLight
    ? 'text-slate-500 border-b border-slate-200/80'
    : isTerminal
    ? 'text-emerald-500/70 border-b border-emerald-500/20'
    : 'text-slate-400 border-b border-white/10';

  const dividerClass = isLight
    ? 'bg-slate-200/80'
    : isTerminal
    ? 'bg-emerald-500/20'
    : 'bg-white/10';

  const itemHoverClass = isLight
    ? 'hover:bg-slate-100/90 active:bg-slate-200/80 text-slate-700 hover:text-slate-900'
    : isTerminal
    ? 'hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 hover:text-emerald-200'
    : 'hover:bg-white/10 active:bg-white/15 text-slate-200 hover:text-white';

  const dangerHoverClass = isLight
    ? 'hover:bg-red-50 text-red-600 hover:text-red-700'
    : 'hover:bg-red-500/20 text-red-400 hover:text-red-300';

  const shortcutClass = isLight
    ? 'text-slate-400'
    : isTerminal
    ? 'text-emerald-500/60'
    : 'text-slate-400';

  const chevronClass = isLight
    ? 'text-slate-400'
    : isTerminal
    ? 'text-emerald-500/70'
    : 'text-slate-400';

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
                  className={`h-px my-1 mx-1 ${dividerClass}`}
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

