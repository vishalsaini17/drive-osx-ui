import React, { useRef, useState } from 'react';
import { WindowState } from '../../platform/types';
import { useSystemStore, getAppIcon } from '../state/systemStore';
import { useContextMenuStore, ContextMenuItem } from '../context-menu/contextMenuStore';
import WindowStatusBar from './WindowStatusBar';
import WindowMenuPopup from './WindowMenuPopup';
import Modal from '../../design-system/components/Modal';
import { Minimize2, Maximize2, RotateCcw, X, Layers, Menu } from 'lucide-react';

interface AppWindowProps {
  app: WindowState;
  children: React.ReactNode;
  footer?: React.ReactNode;
  statusLeft?: React.ReactNode;
  statusCenter?: React.ReactNode;
  statusRight?: React.ReactNode;
  showStatusBar?: boolean;
  minW?: number;
  minH?: number;
  key?: string;
}

export default function AppWindow({
  app,
  children,
  footer,
  statusLeft,
  statusCenter,
  statusRight,
  showStatusBar = true,
  minW,
  minH,
}: AppWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const effectiveMinW = minW ?? app.minW ?? 300;
  const effectiveMinH = minH ?? app.minH ?? 200;

  // Subscribing to Zustand store
  const activeWindowId = useSystemStore((state) => state.activeWindowId);
  const settings = useSystemStore((state) => state.settings);
  
  const onClose = useSystemStore((state) => state.handleCloseWindow);
  const onMinimize = useSystemStore((state) => state.handleMinimizeWindow);
  const onMaximize = useSystemStore((state) => state.handleMaximizeWindow);
  const onFocus = useSystemStore((state) => state.focusWindow);
  const onMove = useSystemStore((state) => state.handleMoveWindow);
  const onResize = useSystemStore((state) => state.handleResizeWindow);

  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);

  const handleTitleBarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'minimize',
        label: 'Minimize Window',
        onClick: () => onMinimize(app.id),
      },
      {
        id: 'maximize',
        label: app.isMaximized ? 'Restore Window' : 'Maximize Window',
        onClick: () => onMaximize(app.id),
      },
      {
        id: 'focus',
        label: 'Bring to Front',
        onClick: () => onFocus(app.id),
      },
      { divider: true },
      {
        id: 'close',
        label: 'Close Window',
        danger: true,
        onClick: () => onClose(app.id),
      },
    ];

    openContextMenu(e, items, app.title);
  };

  const isFocused = activeWindowId === app.id;
  const activeTheme = settings.theme || 'classic-light';

  // Dragging states
  const dragStart = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, winW: 0, winH: 0 });

  // Handle Dragging
  const handleTitlePointerDown = (e: React.PointerEvent) => {
    onFocus(app.id);

    const target = e.target as HTMLElement;
    if (target.closest('.win-control-btn')) return;
    if (e.button !== 0) return; // Only left click

    target.setPointerCapture(e.pointerId);
    setIsDragging(true);

    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: app.x,
      winY: app.y,
    };
    e.stopPropagation();
  };

  const handleTitlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.current.mouseX;
    const deltaY = e.clientY - dragStart.current.mouseY;

    let newX = dragStart.current.winX + deltaX;
    let newY = dragStart.current.winY + deltaY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dockSize = settings.dockSize || 'md';
    const dockDeduction = dockSize === 'sm' ? 52 : (dockSize === 'lg' ? 92 : 78);

    // Boundaries: clamp top, left, right, and bottom edges
    const topBarHeight = 0;
    const maxAllowedY = Math.max(0, viewportHeight - dockDeduction - 36);
    newY = Math.max(topBarHeight, Math.min(newY, maxAllowedY));

    const minX = 0;
    const maxX = Math.max(0, viewportWidth - app.w);
    newX = Math.max(minX, Math.min(newX, maxX));

    onMove(app.id, newX, newY);
  };

  const handleTitlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      const target = e.target as HTMLElement;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe catch
      }
    }
  };

  // Handle Resizing
  const handleResizePointerDown = (e: React.PointerEvent) => {
    onFocus(app.id);
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setIsResizing(true);

    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winW: app.w,
      winH: app.h,
    };
    e.stopPropagation();
    e.preventDefault();
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStart.current.mouseX;
    const deltaY = e.clientY - resizeStart.current.mouseY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dockSize = settings.dockSize || 'md';
    const dockDeduction = dockSize === 'sm' ? 52 : (dockSize === 'lg' ? 92 : 78);

    const maxW = Math.max(effectiveMinW, viewportWidth - app.x);
    const maxH = Math.max(effectiveMinH, viewportHeight - dockDeduction - app.y);

    const newW = Math.max(effectiveMinW, Math.min(resizeStart.current.winW + deltaX, maxW));
    const newH = Math.max(effectiveMinH, Math.min(resizeStart.current.winH + deltaY, maxH));

    onResize(app.id, newW, newH);
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      const target = e.target as HTMLElement;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe catch
      }
    }
  };

  if (!app.isOpen || app.isMinimized) {
    return null;
  }

  // Positioning
  const dockSize = settings.dockSize || 'md';
  const dockDeduction = dockSize === 'sm' ? 52 : (dockSize === 'lg' ? 92 : 78);

  const currentW = Math.max(effectiveMinW, app.w);
  const currentH = Math.max(effectiveMinH, app.h);

  const windowStyle: React.CSSProperties = app.isMaximized
    ? {
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '100%',
        zIndex: app.zIndex,
      }
    : {
        position: 'absolute',
        top: `${app.y}px`,
        left: `${app.x}px`,
        width: `${currentW}px`,
        height: `${currentH}px`,
        minWidth: `${effectiveMinW}px`,
        minHeight: `${effectiveMinH}px`,
        zIndex: app.zIndex,
      };

  // Themes configurations
  const themeClasses = {
    'classic-light': {
      window: 'bg-[#f4ebfced] backdrop-blur-3xl border-white/55 text-[#211625] shadow-[#211625]/5',
      windowFocused: 'border-white/95 ring-2 ring-[#7c3aed]/15 shadow-[#211625]/15',
      header: 'bg-white/40 border-b border-[#211625]/10 text-[#211625]',
      controlBtn: 'text-[#211625] hover:bg-black/5 active:bg-black/10',
      controlMinimizeMax: 'text-[#211625]',
      controlClose: 'text-[#211625] hover:bg-rose-500/10 hover:text-rose-600 active:bg-rose-500/20',
      content: 'text-[#211625] font-sans',
    },
    'modern-dark': {
      window: 'bg-[#140f22ee] backdrop-blur-3xl border-white/10 text-[#f3eef8] shadow-black/40',
      windowFocused: 'border-white/30 ring-2 ring-[#a855f7]/25 shadow-black/60',
      header: 'bg-black/35 border-b border-white/10 text-[#f3eef8]',
      controlBtn: 'text-[#f3eef8] hover:bg-white/5 active:bg-white/10',
      controlMinimizeMax: 'text-[#f3eef8]',
      controlClose: 'text-[#f3eef8] hover:bg-rose-500/15 hover:text-rose-400 active:bg-rose-500/30',
      content: 'text-[#f3eef8] font-sans',
    },
    'retro-terminal': {
      window: 'bg-[#030704f5] backdrop-blur-2xl border-green-500/30 text-[#22c55e] shadow-green-900/10',
      windowFocused: 'border-green-400 ring-2 ring-green-500/20 shadow-green-900/25',
      header: 'bg-black/50 border-b border-green-500/25 text-[#22c55e] font-mono',
      controlBtn: 'text-[#22c55e] hover:bg-green-500/10 active:bg-green-500/20',
      controlMinimizeMax: 'text-[#22c55e]',
      controlClose: 'text-[#22c55e] hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30',
      content: 'text-[#22c55e] font-mono',
    },
  };

  const themeStyle = themeClasses[activeTheme] || themeClasses['classic-light'];

  const isInteracting = isDragging || isResizing;

  return (
    <div
      ref={windowRef}
      style={{
        ...windowStyle,
        willChange: isInteracting ? 'top, left, width, height' : 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onFocus(app.id);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onFocus(app.id);
      }}
      className={`flex flex-col border ${
        isInteracting
          ? 'transition-none'
          : 'transition-[top,left,width,height,opacity,border-color,box-shadow] duration-150 ease-out'
      } shadow-2xl overflow-hidden pointer-events-auto select-none ${
        app.isMaximized ? 'rounded-none border-t-0 border-x-0' : 'rounded-2xl'
      } ${themeStyle.window} ${isFocused ? themeStyle.windowFocused : 'opacity-95'}`}
    >
      {/* WINDOW TITLE BAR */}
      <div
        id={`win-titlebar-${app.id}`}
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onContextMenu={handleTitleBarContextMenu}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.win-control-btn')) return;
          onMaximize(app.id);
        }}
        className={`h-8 px-3 flex items-center justify-between cursor-move shrink-0 select-none relative ${themeStyle.header}`}
      >
        {/* Left: Top Left Menu Trigger */}
        <div className="w-20 flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className={`win-control-btn w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${themeStyle.controlBtn}`}
              title="Window Menu"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
            <WindowMenuPopup
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              app={app}
              onOpenAbout={() => setIsAboutOpen(true)}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
              theme={activeTheme}
            />
          </div>
        </div>

        {/* Center: App Icon + App Name */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wide truncate max-w-[260px]">
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            {getAppIcon(app.id, 'w-4 h-4')}
          </div>
          <span className="truncate">{app.title}</span>
        </div>

        {/* Right: Window Controls */}
        <div className="w-20 flex items-center justify-end gap-1">
          {/* Minimize */}
          <button
            onClick={() => onMinimize(app.id)}
            className={`win-control-btn w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${themeStyle.controlBtn}`}
            title="Minimize"
          >
            <span className="w-2.5 h-[1.5px] bg-current" />
          </button>
          
          {/* Maximize */}
          <button
            onClick={() => onMaximize(app.id)}
            className={`win-control-btn w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${themeStyle.controlBtn}`}
            title="Maximize"
          >
            <div className="w-2.5 h-2.5 border-[1.5px] border-current rounded-[2px]" />
          </button>

          {/* Close */}
          <button
            onClick={() => onClose(app.id)}
            className={`win-control-btn w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${themeStyle.controlClose}`}
            title="Close"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* WINDOW CONTENT BODY */}
      <div className={`flex-1 overflow-auto ${themeStyle.content}`}>
        {children}
      </div>

      {/* WINDOW COMMON FOOTER / STATUS BAR */}
      {footer ? (
        footer
      ) : showStatusBar ? (
        <WindowStatusBar
          id={`win-statusbar-${app.id}`}
          appId={app.id}
          leftInfo={statusLeft}
          centerInfo={statusCenter}
          rightInfo={statusRight}
        />
      ) : null}

      {/* WINDOW RESIZE HANDLE (only when not maximized) */}
      {!app.isMaximized && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-[1000]"
          title="Resize Window"
        >
          <svg className="w-2 h-2 opacity-35 text-current" viewBox="0 0 10 10">
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="4" x2="4" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* ABOUT APP MODAL */}
      <Modal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        title={`About ${app.title}`}
        maxWidth="sm"
        footer={
          <button
            onClick={() => setIsAboutOpen(false)}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        }
      >
        <div className="flex flex-col items-center text-center py-4 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-lg p-3">
            {getAppIcon(app.id, 'w-10 h-10')}
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">{app.title}</h3>
            <p className="text-xs text-purple-300 font-mono mt-0.5">v2.4.0 (Drive OSX)</p>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
            Standard desktop environment module running on React 19, TypeScript, and Tailwind CSS.
          </p>
          <div className="w-full pt-3 border-t border-white/10 text-[11px] text-slate-400 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Engine:</span>
              <span className="text-slate-200">WebOS React 19</span>
            </div>
            <div className="flex justify-between">
              <span>Memory Usage:</span>
              <span className="text-slate-200">32.4 MB</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-emerald-400 font-medium">Active Process</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* KEYBOARD SHORTCUTS MODAL */}
      <Modal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        title="System & Window Keyboard Shortcuts"
        maxWidth="md"
        footer={
          <button
            onClick={() => setIsShortcutsOpen(false)}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        }
      >
        <div className="space-y-3 py-1">
          <p className="text-xs text-slate-400 mb-2">
            Quick keyboard combinations available across the environment:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { key: 'Ctrl + N', label: 'New Window' },
              { key: 'Ctrl + ,', label: 'System Preferences' },
              { key: 'Ctrl + ?', label: 'Keyboard Shortcuts' },
              { key: 'F1', label: 'Help & Documentation' },
              { key: 'ESC', label: 'Close Active Menu / Modal' },
              { key: 'Alt + Tab', label: 'Switch Active App Window' },
              { key: 'Double Click Header', label: 'Maximize / Restore Window' },
            ].map((shortcut, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="text-slate-300 font-medium">{shortcut.label}</span>
                <kbd className="px-2 py-0.5 bg-black/40 border border-white/15 rounded text-[10px] font-mono text-purple-300">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
