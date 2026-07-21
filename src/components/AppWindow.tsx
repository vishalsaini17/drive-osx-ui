import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { WindowState } from '../types';
import { useSystemStore, getAppIcon } from '../systemStore';

interface AppWindowProps {
  app: WindowState;
  children: React.ReactNode;
  key?: string;
}

export default function AppWindow({ app, children }: AppWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Subscribing to Zustand store
  const activeWindowId = useSystemStore((state) => state.activeWindowId);
  const settings = useSystemStore((state) => state.settings);
  
  const onClose = useSystemStore((state) => state.handleCloseWindow);
  const onMinimize = useSystemStore((state) => state.handleMinimizeWindow);
  const onMaximize = useSystemStore((state) => state.handleMaximizeWindow);
  const onFocus = useSystemStore((state) => state.focusWindow);
  const onMove = useSystemStore((state) => state.handleMoveWindow);
  const onResize = useSystemStore((state) => state.handleResizeWindow);

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

    // Boundaries: clamp top edge
    const topBarHeight = 12;
    if (newY < topBarHeight) {
      newY = topBarHeight;
    }

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

    const newW = Math.max(app.minW, resizeStart.current.winW + deltaX);
    const newH = Math.max(app.minH, resizeStart.current.winH + deltaY);

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

  const windowStyle: React.CSSProperties = app.isMaximized
    ? {
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: '100%',
        height: `calc(100% - ${dockDeduction}px)`,
        zIndex: app.zIndex,
      }
    : {
        position: 'absolute',
        top: `${app.y}px`,
        left: `${app.x}px`,
        width: `${app.w}px`,
        height: `${app.h}px`,
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

  return (
    <div
      ref={windowRef}
      style={windowStyle}
      onClick={() => onFocus(app.id)}
      className={`flex flex-col border transition-all duration-150 shadow-2xl overflow-hidden pointer-events-auto select-none ${
        app.isMaximized ? 'rounded-none border-t-0 border-x-0' : 'rounded-2xl'
      } ${themeStyle.window} ${isFocused ? themeStyle.windowFocused : 'opacity-95'}`}
    >
      {/* WINDOW TITLE BAR */}
      <div
        id={`win-titlebar-${app.id}`}
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        className={`h-10 px-4 flex items-center justify-between cursor-move shrink-0 select-none ${themeStyle.header}`}
      >
        {/* Left: App Icon & Indicator */}
        <div className="w-24 flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            {getAppIcon(app.id, 'w-full h-full rounded-sm')}
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-35" />
        </div>

        {/* Center: Window Title */}
        <div className="text-xs font-semibold tracking-wide truncate max-w-[200px]">
          {app.title}
        </div>

        {/* Right: Window Controls */}
        <div className="w-24 flex items-center justify-end gap-1">
          {/* Minimize */}
          <button
            onClick={() => onMinimize(app.id)}
            className={`win-control-btn w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${themeStyle.controlBtn}`}
            title="Minimize"
          >
            <span className="w-2.5 h-[1.5px] bg-current" />
          </button>
          
          {/* Maximize */}
          <button
            onClick={() => onMaximize(app.id)}
            className={`win-control-btn w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${themeStyle.controlBtn}`}
            title="Maximize"
          >
            <div className="w-2.5 h-2.5 border-[1.5px] border-current rounded-[2px]" />
          </button>

          {/* Close */}
          <button
            onClick={() => onClose(app.id)}
            className={`win-control-btn w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${themeStyle.controlClose}`}
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
    </div>
  );
}
