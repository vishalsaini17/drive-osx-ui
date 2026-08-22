import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WindowState } from '../../platform/types';
import { useSystemStore, getAppIcon } from '../state/systemStore';
import { useContextMenuStore, ContextMenuItem } from '../context-menu/contextMenuStore';
import WindowStatusBar from './WindowStatusBar';
import { WindowStatusProvider } from './WindowStatusContext';
import WindowMenu from './WindowMenu';
import { buildStandardMenus } from './standardMenus';
import { MenuItem, separator } from '../../platform/menus/types';
import { useWindowMenus } from '../../platform/menus/AppMenuContext';
import PreferencesDialog from '../preferences/PreferencesDialog';
import Modal from '../../design-system/components/Modal';
import { coversDockZone, useDockZoneStore } from '../taskbar/dockZone';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import { themeChrome } from '../../platform/theme/themes';
import { Settings, X } from 'lucide-react';

/** Screen space the dock occupies, which a window may not be dropped behind. */
function dockDeduction(dockSize: string | undefined): number {
  if (dockSize === 'sm') return 52;
  if (dockSize === 'lg') return 92;
  return 78;
}

/**
 * What the pointer is currently doing to this window.
 *
 * `settling` is the single render that applies the committed geometry once a
 * gesture ends. It keeps the position transition switched off for that render;
 * otherwise re-enabling the transition at the same moment `top`/`left` jump to
 * their new values would animate the window from where the drag started to
 * where it was dropped, 150ms after the user let go.
 */
type Gesture = 'idle' | 'drag' | 'resize' | 'settling';

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
  const [gesture, setGesture] = useState<Gesture>('idle');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Menus contributed by the application running in this window.
  const appMenus = useWindowMenus(app.id);

  // The app's theme preference — shared by every window of this app (an
  // extra instance's `id` is a one-off, but `appId` is the same manifest id
  // its primary window uses), also read by Preferences → Appearance (opened
  // below) and used to pick this window's chrome further down.
  const appTheme = useAppTheme(app.appId);

  const effectiveMinW = minW ?? app.minW ?? 300;
  const effectiveMinH = minH ?? app.minH ?? 200;

  // Declared above the gesture handlers, which snapshot them when a drag or
  // resize begins.
  const currentW = Math.max(effectiveMinW, app.w);
  const currentH = Math.max(effectiveMinH, app.h);

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
  const windows = useSystemStore((state) => state.windows);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);

  /**
   * Contents of the single title-bar dropdown.
   *
   * Whatever the application contributes (File, Edit, View and any
   * app-specific menus) becomes a submenu, followed by the entries every
   * window shares.
   */
  const menuItems: MenuItem[] = useMemo(() => {
    const [windowMenu, helpMenu] = buildStandardMenus({
      app,
      onNewWindow: () => openAppWindow(app.appId, { forceNewWindow: true }),
      onMinimize: () => onMinimize(app.id),
      onMaximize: () => onMaximize(app.id),
      onClose: () => onClose(app.id),
      onBringToFront: () => onFocus(app.id),
      onShortcuts: () => setIsShortcutsOpen(true),
      onAbout: () => setIsAboutOpen(true),
      onHelp: () => setIsShortcutsOpen(true),
      otherWindows: windows.filter((w) => w.isOpen && w.id !== app.id),
      onFocusWindow: (id) => onFocus(id),
    });

    const appEntries: MenuItem[] = appMenus.map((menu) => ({
      kind: 'submenu' as const,
      id: menu.id,
      label: menu.label,
      items: menu.items,
    }));

    return [
      ...appEntries,
      ...(appEntries.length > 0 ? [separator('after-app')] : []),
      { kind: 'submenu' as const, id: windowMenu.id, label: windowMenu.label, items: windowMenu.items },
      {
        id: 'preferences',
        label: 'Preferences…',
        shortcut: 'Ctrl+,',
        icon: Settings,
        onSelect: () => setIsPreferencesOpen(true),
      },
      separator('before-help'),
      { kind: 'submenu' as const, id: helpMenu.id, label: helpMenu.label, items: helpMenu.items },
    ];
  }, [appMenus, app, windows, openAppWindow, onMinimize, onMaximize, onClose, onFocus]);

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
  // The window's chrome follows this window's own preference. With the default
  // ('Theme') that is the global theme verbatim, so nothing changes for anyone
  // who has not chosen otherwise — including Retro Terminal.
  const activeTheme = appTheme.windowTheme;
  const showMenuButton = settings.showWindowMenuBar !== false;

  /**
   * Drag and resize move the element directly and write to the store exactly
   * once, when the pointer is released.
   *
   * The store owns `windows`, and it replaces the whole array on every change.
   * Committing each pointer move therefore re-rendered every subscriber — the
   * dock, the launcher, the terminal and every other open window — sixty times
   * a second, which is what made dragging stutter. Worse, the dock reacts to
   * `windows` in effects that call `setState` and touch `localStorage`, so each
   * frame cost several extra render passes and React never reached a settled
   * commit; its nested-update counter climbed until it threw "Maximum update
   * depth exceeded", blaming whichever handler dispatched last.
   *
   * `gestureKind` is a ref rather than derived from `gesture` state so a
   * pointer event that arrives before React has re-rendered still sees the
   * gesture that is actually in progress.
   */
  const reportDockGesture = useDockZoneStore((state) => state.reportGesture);
  const endDockGesture = useDockZoneStore((state) => state.endGesture);

  const gestureKind = useRef<Gesture>('idle');
  const pointerStart = useRef({ x: 0, y: 0 });
  /** Geometry when the gesture began — what the live values are measured from. */
  const gestureBase = useRef({ x: 0, y: 0, w: 0, h: 0 });
  /** Geometry as of the most recent pointer event. */
  const gestureLive = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const frame = useRef<number | null>(null);

  const paint = useCallback(() => {
    frame.current = null;
    const el = windowRef.current;
    if (!el) return;

    const base = gestureBase.current;
    const live = gestureLive.current;

    // Position is a transform so the browser can move the window on the
    // compositor instead of laying the page out again for every frame.
    el.style.transform = `translate3d(${live.x - base.x}px, ${live.y - base.y}px, 0)`;
    if (live.w !== base.w || live.h !== base.h) {
      el.style.width = `${live.w}px`;
      el.style.height = `${live.h}px`;
    }

    // The dock gets out of the way of a window that reaches its strip of the
    // screen, exactly as it does for a maximized application. The store here
    // ignores an unchanged value, so this costs a render on the frame the
    // window crosses the line and nothing on the frames either side of it.
    reportDockGesture(app.id, coversDockZone(live.y + live.h, settings.dockSize, window.innerHeight));
  }, [app.id, settings.dockSize, reportDockGesture]);

  /** Coalesces the pointer events of one frame into a single style write. */
  const schedulePaint = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(paint);
  }, [paint]);

  const beginGesture = useCallback(
    (kind: 'drag' | 'resize', e: React.PointerEvent) => {
      gestureKind.current = kind;
      pointerStart.current = { x: e.clientX, y: e.clientY };
      gestureBase.current = { x: app.x, y: app.y, w: currentW, h: currentH };
      gestureLive.current = { ...gestureBase.current };
      // Capture on the handler's own element: `e.target` may be a descendant
      // (the title text, the resize glyph) that re-renders mid-gesture, and
      // losing capture there drops the pointer moves and the drag jumps.
      e.currentTarget.setPointerCapture(e.pointerId);
      setGesture(kind);
      e.stopPropagation();
    },
    [app.x, app.y, currentW, currentH]
  );

  const endGesture = useCallback(
    (e: React.PointerEvent) => {
      if (gestureKind.current === 'idle') return;
      gestureKind.current = 'idle';

      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // The pointer may already have been released by the browser.
      }

      const base = gestureBase.current;
      const live = gestureLive.current;
      const el = windowRef.current;
      if (el) {
        // Only the transform is cleared, and it is cleared in the same task as
        // the commits below so the browser never paints the window back at its
        // pre-drag position. Width and height are deliberately left alone:
        // React writes a style property only when its own value for it
        // changed, so clearing an inline width it still believes it has set
        // would collapse the window instead of restoring it.
        el.style.transform = '';
      }

      if (live.x !== base.x || live.y !== base.y) onMove(app.id, live.x, live.y);
      if (live.w !== base.w || live.h !== base.h) onResize(app.id, live.w, live.h);

      // Committed geometry decides from here. Both updates land in the same
      // batch as the commits above, so the dock never sees a frame in which
      // neither the gesture nor the store reports the window over the dock.
      endDockGesture(app.id);

      setGesture('settling');
      // Reuses the paint slot, which is free: the gesture is over, so no
      // further pointer move can schedule one. This keeps the frame cancelable
      // from the unmount cleanup below.
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setGesture('idle');
      });
    },
    [app.id, onMove, onResize, endDockGesture]
  );

  // A window closed mid-gesture must not leave a frame queued against a
  // detached element, nor leave the dock hidden for a window that no longer
  // exists.
  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      endDockGesture(app.id);
    };
  }, [app.id, endDockGesture]);

  const handleTitlePointerDown = (e: React.PointerEvent) => {
    // A control button (minimize/maximize/close) handles itself on `click`
    // and never needs the window focused first. Focusing here anyway used to
    // race the button's own click: focus flipped `activeWindowId` and the URL
    // to this window's route, and if the click was a close, the route sync
    // effect could see the stale route on its next pass and call
    // `openAppWindow`, silently reopening the window the user just closed.
    const target = e.target as HTMLElement;
    if (target.closest('.win-control-btn')) return;

    onFocus(app.id);

    if (e.button !== 0) return; // Only left click
    // A maximized window fills the screen and has no position to change.
    // Double-clicking the title bar restores it first.
    if (app.isMaximized) return;

    beginGesture('drag', e);
  };

  const handleTitlePointerMove = (e: React.PointerEvent) => {
    if (gestureKind.current !== 'drag') return;

    const base = gestureBase.current;
    let newX = base.x + (e.clientX - pointerStart.current.x);
    let newY = base.y + (e.clientY - pointerStart.current.y);

    // Boundaries: clamp top, left, right, and bottom edges. The title bar must
    // stay reachable, so the window may not be dropped behind the dock.
    const maxAllowedY = Math.max(0, window.innerHeight - dockDeduction(settings.dockSize) - 36);
    newY = Math.max(0, Math.min(newY, maxAllowedY));
    newX = Math.max(0, Math.min(newX, Math.max(0, window.innerWidth - base.w)));

    gestureLive.current = { ...gestureLive.current, x: newX, y: newY };
    schedulePaint();
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    onFocus(app.id);
    if (e.button !== 0) return;

    beginGesture('resize', e);
    e.preventDefault();
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (gestureKind.current !== 'resize') return;

    const base = gestureBase.current;
    const maxW = Math.max(effectiveMinW, window.innerWidth - base.x);
    const maxH = Math.max(effectiveMinH, window.innerHeight - dockDeduction(settings.dockSize) - base.y);

    const newW = Math.max(effectiveMinW, Math.min(base.w + (e.clientX - pointerStart.current.x), maxW));
    const newH = Math.max(effectiveMinH, Math.min(base.h + (e.clientY - pointerStart.current.y), maxH));

    gestureLive.current = { ...gestureLive.current, w: newW, h: newH };
    schedulePaint();
  };

  if (!app.isOpen || app.isMinimized) {
    return null;
  }

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

  // Chrome classes come from the theme catalogue, so a new theme is one entry
  // there rather than another map to keep in step here.
  const themeStyle = themeChrome(activeTheme);

  const isInteracting = gesture !== 'idle';

  // Every theme's window surface carries `backdrop-blur` — every open window
  // is a live blur of whatever is behind it. That is cheap for a window
  // sitting still (the browser blurs it once and caches the result), but a
  // drag or resize changes what is behind the window on every single frame,
  // forcing the compositor to redo the Gaussian blur 60 times a second for
  // the whole window surface. Dropping just that utility for the duration of
  // the gesture removes the single most expensive part of moving a window;
  // the base colour underneath is already ~90%+ opaque in every theme, so the
  // window does not visibly change look for the fraction of a second the
  // gesture lasts.
  const windowSurfaceClass = isInteracting
    ? themeStyle.window
        .split(' ')
        .filter((cls) => !cls.startsWith('backdrop-blur') && !cls.startsWith('backdrop-saturate'))
        .join(' ')
    : themeStyle.window;

  return (
    <div
      ref={windowRef}
      style={{
        ...windowStyle,
        // Promoted only while a gesture is running: a permanent layer per
        // window would cost memory for every open application.
        willChange: gesture === 'drag' ? 'transform' : gesture === 'resize' ? 'width, height' : 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
        // A control button's own click (minimize/maximize/close) already ran
        // by the time this bubbles here. Focusing on top of it was the other
        // half of the reopen bug: closing an unfocused window fired `onClose`
        // first, then this handler re-focused that same (now-closed) window,
        // which the route sync effect could read as "open me back up".
        if ((e.target as HTMLElement).closest('.win-control-btn')) return;
        onFocus(app.id);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if ((e.target as HTMLElement).closest('.win-control-btn')) return;
        onFocus(app.id);
      }}
      className={`flex flex-col border ${
        isInteracting
          ? 'transition-none'
          : 'transition-[top,left,width,height,opacity,border-color,box-shadow] duration-150 ease-out'
      } shadow-2xl overflow-hidden pointer-events-auto select-none ${
        app.isMaximized ? 'rounded-none border-t-0 border-x-0' : 'rounded-2xl'
      } ${windowSurfaceClass} ${isFocused ? themeStyle.windowFocused : 'opacity-95'}`}
    >
      {/* WINDOW TITLE BAR */}
      <div
        id={`win-titlebar-${app.id}`}
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={endGesture}
        // Without this a gesture interrupted by the browser (an alt-tab, a
        // touch cancelled by scrolling) would leave the window stuck under a
        // stale transform, and the drop would never be committed.
        onPointerCancel={endGesture}
        onContextMenu={handleTitleBarContextMenu}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.win-control-btn')) return;
          onMaximize(app.id);
        }}
        className={`h-8 px-3 flex items-center justify-between cursor-move shrink-0 select-none relative ${themeStyle.header}`}
      >
        {/* Left: application menu button */}
        <div className="w-20 flex items-center gap-2">
          {showMenuButton && (
            <WindowMenu items={menuItems} theme={activeTheme} buttonClassName={themeStyle.controlBtn} />
          )}
        </div>

        {/* Center: application icon and name */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wide truncate max-w-[260px]">
          {/* The icon's bounding box is already vertically centered against the
              text's box (both share this row's `items-center`), but most icon
              artwork reads visually "heavier" toward the bottom than a font's
              glyphs do — ascender space in the text's line-height sits above
              its cap-height, while the icon fills its box edge-to-edge. Left
              alone the icon looks a hair low next to the text; -translate-y-px
              nudges it back to its optical center. */}
          <div className="w-4 h-4 flex items-center justify-center shrink-0 -translate-y-px">
            {getAppIcon(app.appId, 'w-4 h-4')}
          </div>
          <span className="truncate">{app.title}</span>
        </div>

        {/* Right: Window Controls */}
        <div className="w-20 flex items-center justify-end gap-1 shrink-0">
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

      {/* WINDOW CONTENT BODY + COMMON FOOTER / STATUS BAR.
          Applications never render their own window footer: they publish
          status content into the shared bar below via <WindowStatus />. */}
      <WindowStatusProvider>
        <div className={`flex-1 overflow-auto ${themeStyle.content}`}>
          {children}
        </div>

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
      </WindowStatusProvider>

      {/* WINDOW RESIZE HANDLE (only when not maximized) */}
      {!app.isMaximized && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-[1000]"
          title="Resize Window"
        >
          <svg className="w-2 h-2 opacity-35 text-current" viewBox="0 0 10 10">
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="4" x2="4" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      <PreferencesDialog
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        appId={app.appId}
        appTitle={app.title}
      />

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
            {getAppIcon(app.appId, 'w-10 h-10')}
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
