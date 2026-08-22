import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar,
  Moon,
  Sun,
  LogOut,
  X,
  Check,
  Search,
  Bell,
  BellOff,
  Monitor,
  Settings as SettingsIcon,
  MoreHorizontal,
  Pin
} from 'lucide-react';
import { useSystemStore, getAppIcon } from '../state/systemStore';
import { useContextMenuStore, ContextMenuItem } from '../context-menu/contextMenuStore';
import { StorageService } from '../../platform/storage/StorageService';
import CalendarClockPopup from '../system-tray/CalendarClockPopup';
import SystemNotificationPopup from '../notifications/SystemNotificationPopup';
import ApplicationMenuPopup from '../launcher/ApplicationMenuPopup';
import MoreAppsPopup from '../launcher/MoreAppsPopup';
import { useShellTheme } from '../../platform/theme/useShellTheme';
import { coversDockZone, dockZoneHeight, useDockZoneStore } from './dockZone';

/** Whether two id lists hold the same ids in the same order. */
function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export default function Dock() {
  const [time, setTime] = useState<Date>(new Date());
  const [notificationsMuted, setNotificationsMuted] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [showRightPopup, setShowRightPopup] = useState<boolean>(false);
  const [showAppDirectoryPopup, setShowAppDirectoryPopup] = useState<boolean>(false);
  const [appSearchQuery, setAppSearchQuery] = useState<string>('');
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(false);
  const [showMorePopup, setShowMorePopup] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [windowHeight, setWindowHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [isCursorAtBottom, setIsCursorAtBottom] = useState<boolean>(false);
  /** Mirrors `isCursorAtBottom` so the pointer listener can read it without
   *  being re-created, and without dispatching an update per mouse move. */
  const cursorAtBottom = useRef(false);
  
  const [dockAppOrder, setDockAppOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pinnedAppIds, setPinnedAppIds] = useState<string[]>([]);

  // Subscribing to central system store
  const notifications = useSystemStore((state) => state.notifications);
  const removeNotification = useSystemStore((state) => state.removeNotification);
  const clearNotifications = useSystemStore((state) => state.clearNotifications);
  const windows = useSystemStore((state) => state.windows);
  const toggleWindow = useSystemStore((state) => state.toggleWindow);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const handleCloseWindow = useSystemStore((state) => state.handleCloseWindow);
  const handleMinimizeWindow = useSystemStore((state) => state.handleMinimizeWindow);
  const activeWindowId = useSystemStore((state) => state.activeWindowId);
  const shell = useShellTheme();
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const currentDesktop = useSystemStore((state) => state.currentDesktop);
  const currentUser = useSystemStore((state) => state.currentUser);
  const logout = useSystemStore((state) => state.logout);
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);
  const gestureWindowId = useDockZoneStore((state) => state.gestureWindowId);
  const gestureCoversDock = useDockZoneStore((state) => state.gestureCoversDock);

  /**
   * Which actual window a click on `appId`'s dock icon should act on: the
   * currently focused window if it belongs to this app, otherwise this app's
   * most recently focused open window, otherwise (nothing open) the app id
   * itself — `openAppWindow`/`toggleWindow` create/open its primary window
   * for that case, same as before multiple windows per app existed.
   */
  const resolveDockTargetId = (appId: string): string => {
    const group = windows.filter((w) => w.appId === appId && w.isOpen);
    if (group.length === 0) return appId;
    const activeInGroup = group.find((w) => w.id === activeWindowId);
    if (activeInGroup) return activeInGroup.id;
    return [...group].sort((a, b) => b.zIndex - a.zIndex)[0].id;
  };

  const handleDockIconContextMenu = (e: React.MouseEvent, app: any) => {
    e.preventDefault();
    e.stopPropagation();

    const isPinnedApp = isPinned(app.id);
    const isOpen = app.isOpen;
    const targetId = resolveDockTargetId(app.id);

    const items: ContextMenuItem[] = [
      {
        id: 'open',
        label: isOpen ? `Show ${app.title}` : `Open ${app.title}`,
        onClick: () => {
          toggleWindow(targetId);
        },
      },
      {
        id: 'pin',
        label: isPinnedApp ? 'Unpin from Dock' : 'Pin to Dock',
        onClick: () => {
          togglePin(app.id);
        },
      },
      ...(isOpen ? [
        { divider: true },
        {
          id: 'minimize',
          label: 'Minimize Window',
          onClick: () => {
            handleMinimizeWindow(targetId);
          },
        },
        {
          id: 'close',
          label: 'Quit / Close',
          danger: true,
          onClick: () => {
            handleCloseWindow(targetId);
          },
        },
      ] : []),
      { divider: true },
      {
        id: 'settings',
        label: 'System Settings',
        onClick: () => {
          openAppWindow('settings');
        },
      },
    ];

    openContextMenu(e, items, app.title);
  };

  const handleDockBarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'size-sm',
        label: `Small Dock ${dockSize === 'sm' ? '✓' : ''}`,
        onClick: () => setSettings((prev) => ({ ...prev, dockSize: 'sm' })),
      },
      {
        id: 'size-md',
        label: `Medium Dock ${dockSize === 'md' ? '✓' : ''}`,
        onClick: () => setSettings((prev) => ({ ...prev, dockSize: 'md' })),
      },
      {
        id: 'size-lg',
        label: `Large Dock ${dockSize === 'lg' ? '✓' : ''}`,
        onClick: () => setSettings((prev) => ({ ...prev, dockSize: 'lg' })),
      },
      { divider: true },
      {
        id: 'settings',
        label: 'System Settings...',
        onClick: () => openAppWindow('settings'),
      },
    ];

    openContextMenu(e, items, 'Dock Options');
  };

  const dockSize = settings.dockSize || 'md';

  /**
   * One entry per *app*, not per open window — an app can now have several
   * windows open at once (`openAppWindow(appId, { forceNewWindow: true })`),
   * but it still gets exactly one dock icon, matching every real desktop.
   * The representative is the app's primary window (`id === appId`, always
   * present) so its stored geometry/iconName/title are the canonical ones;
   * `isOpen` is true if *any* window of that app is open.
   */
  const appWindows = React.useMemo(() => {
    const primaryByApp = new Map<string, typeof windows[number]>();
    const openByApp = new Map<string, boolean>();
    for (const w of windows) {
      openByApp.set(w.appId, (openByApp.get(w.appId) ?? false) || w.isOpen);
      const existing = primaryByApp.get(w.appId);
      if (!existing || w.id === w.appId) primaryByApp.set(w.appId, w);
    }
    return Array.from(primaryByApp.values()).map((w) => ({ ...w, isOpen: openByApp.get(w.appId) ?? w.isOpen }));
  }, [windows]);

  /**
   * The dock's stored lists depend on *which* applications exist, never on
   * their geometry. The store replaces the whole `windows` array whenever any
   * window changes, so keying these effects on the array itself re-ran them —
   * `localStorage` reads included — for changes they do not care about.
   */
  const appIdSignature = appWindows.map((w) => w.id).join('|');

  useEffect(() => {
    const otherAppIds = appWindows
      .filter((w) => w.id !== 'launcher')
      .map((w) => w.id);
    const savedPinned = StorageService.get<string[] | null>('dock-pinned-apps', null);
    if (savedPinned) {
      let mergedPinned = savedPinned;
      if (!mergedPinned.includes('calendar')) mergedPinned = [...mergedPinned, 'calendar'];
      if (!mergedPinned.includes('meeting')) mergedPinned = [...mergedPinned, 'meeting'];
      if (!mergedPinned.includes('mail')) mergedPinned = [...mergedPinned, 'mail'];
      setPinnedAppIds((prev) => (sameOrder(prev, mergedPinned) ? prev : mergedPinned));
      if (mergedPinned.length !== savedPinned.length) {
        StorageService.set('dock-pinned-apps', mergedPinned);
      }
    } else if (otherAppIds.length > 0) {
      setPinnedAppIds((prev) => (sameOrder(prev, otherAppIds) ? prev : otherAppIds));
      StorageService.set('dock-pinned-apps', otherAppIds);
    }
    // `windows` is read for its ids only, which `appIdSignature` stands in for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appIdSignature]);

  useEffect(() => {
    const handlePinsUpdated = () => {
      const updatedPinned = StorageService.get<string[] | null>('dock-pinned-apps', null);
      if (updatedPinned) {
        setPinnedAppIds((prev) => (sameOrder(prev, updatedPinned) ? prev : updatedPinned));
      }
    };
    window.addEventListener('dock-pins-updated', handlePinsUpdated);
    return () => window.removeEventListener('dock-pins-updated', handlePinsUpdated);
  }, []);

  const togglePin = (id: string) => {
    setPinnedAppIds(prev => {
      const next = prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id];
      StorageService.set('dock-pinned-apps', next);
      window.dispatchEvent(new Event('dock-pins-updated'));
      return next;
    });
  };

  const isPinned = (id: string) => {
    return pinnedAppIds.includes(id);
  };

  useEffect(() => {
    const savedSequence = StorageService.get<string[]>('dock-app-sequence', []);
    const otherAppIds = appWindows.filter(w => w.id !== 'launcher').map(w => w.id);

    const merged = [...savedSequence];
    otherAppIds.forEach(id => {
      if (!merged.includes(id)) {
        merged.push(id);
      }
    });
    const finalSequence = merged.filter(id => otherAppIds.includes(id));

    // A freshly built array is a new value to React even when it holds the
    // same ids, so setting it unconditionally scheduled a render every time
    // this effect ran.
    setDockAppOrder((prev) => (sameOrder(prev, finalSequence) ? prev : finalSequence));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appIdSignature]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (id === 'launcher') return;
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    if (targetId === 'launcher' || !draggingId || draggingId === targetId) return;
    e.preventDefault();
    
    const dragIndex = dockAppOrder.indexOf(draggingId);
    const targetIndex = dockAppOrder.indexOf(targetId);
    if (dragIndex !== -1 && targetIndex !== -1) {
      const nextOrder = [...dockAppOrder];
      nextOrder.splice(dragIndex, 1);
      nextOrder.splice(targetIndex, 0, draggingId);
      setDockAppOrder(nextOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    StorageService.set('dock-app-sequence', dockAppOrder);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dockHeightFromBottom = dockZoneHeight(dockSize);

      // Reveal dock when cursor is within 10px from bottom edge.
      let next = cursorAtBottom.current;
      if (e.clientY >= window.innerHeight - 10) next = true;
      else if (e.clientY < window.innerHeight - (dockHeightFromBottom + 15)) next = false;

      // The pointer moves far more often than it crosses either threshold.
      // Dispatching on every move relied on React discarding the unchanged
      // value, which it cannot do while other updates are already queued
      // against this component — so a busy frame turned each mouse move into
      // a render.
      if (next === cursorAtBottom.current) return;
      cursorAtBottom.current = next;
      setIsCursorAtBottom(next);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dockSize]);

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Harmonized size classes for BOTH dock pills
  const sizeClasses = {
    sm: { 
      dock: 'h-11 px-2 py-1 gap-1.5', 
      icon: 'w-8 h-8 rounded-lg', 
      dot: 'w-[3px] h-[3px]',
      timeText: 'text-[12px]',
      dateText: 'text-[9px]',
      sepHeight: 'h-4.5',
      iconSize: 16,
      monitorSize: 15,
      statusText: 'text-[10px]',
      dotBottom: 'bottom-[2px]',
      timeDateBtn: 'px-1.5 py-0.5 flex flex-col items-center justify-center gap-[1px]',
      systemBtn: 'px-1.5 py-0.5 gap-1.5 flex flex-row items-center justify-center',
      systemIconGap: 'gap-1.5',
      outerGap: 'gap-1.5',
      bottom: 'bottom-2'
    },
    md: { 
      dock: 'h-[68px] px-4 py-2.5 gap-2.5', 
      icon: 'w-11 h-11 rounded-xl', 
      dot: 'w-[5px] h-[5px]',
      timeText: 'text-[17px]',
      dateText: 'text-[12px]',
      sepHeight: 'h-6',
      iconSize: 22,
      monitorSize: 21,
      statusText: 'text-[14px]',
      dotBottom: 'bottom-1.5',
      timeDateBtn: 'px-2.5 py-1.5 flex flex-col items-center justify-center gap-[2px]',
      systemBtn: 'px-2.5 py-1.5 gap-2 flex flex-row items-center justify-center',
      systemIconGap: 'gap-2',
      outerGap: 'gap-2.5',
      bottom: 'bottom-2.5'
    },
    lg: { 
      dock: 'h-20 px-5 py-3.5 gap-3.5', 
      icon: 'w-14 h-14 rounded-2xl', 
      dot: 'w-1.5 h-1.5',
      timeText: 'text-[21px]',
      dateText: 'text-[14px]',
      sepHeight: 'h-7',
      iconSize: 26,
      monitorSize: 25,
      statusText: 'text-[18px]',
      dotBottom: 'bottom-1.5',
      timeDateBtn: 'px-3.5 py-2 flex flex-col items-center justify-center gap-[3px]',
      systemBtn: 'px-3.5 py-2 gap-3 flex flex-row items-center justify-center',
      systemIconGap: 'gap-3',
      outerGap: 'gap-3',
      bottom: 'bottom-3'
    }
  };

  const activeSizes = sizeClasses[dockSize] || sizeClasses.md;

  // Responsive dock sizing calculations to prevent overflowing on resize
  const systemPillWidths = { sm: 130, md: 220, lg: 295 };
  const iconWidthsWithGap = { sm: 38, md: 54, lg: 70 };
  const paddingWidths = { sm: 16, md: 32, lg: 40 };

  const systemPillWidth = systemPillWidths[dockSize] || systemPillWidths.md;
  const iconWidthWithGap = iconWidthsWithGap[dockSize] || iconWidthsWithGap.md;
  const paddingWidth = paddingWidths[dockSize] || paddingWidths.md;
  const outerGapWidth = dockSize === 'sm' ? 6 : (dockSize === 'md' ? 10 : 12);

  const otherAppsSorted = [...appWindows.filter(w => w.id !== 'launcher')].sort((a, b) => {
    const indexA = dockAppOrder.indexOf(a.id);
    const indexB = dockAppOrder.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Filter dock apps: must be pinned OR currently open
  const dockApps = otherAppsSorted.filter(app => isPinned(app.id) || app.isOpen);
  const totalApps = dockApps.length + 1; // +1 for launcher

  const availableWidthForDockApps = windowWidth - 50 - systemPillWidth - outerGapWidth - paddingWidth;
  let maxVisibleTotal = totalApps;

  if (windowWidth < 1200) {
    const estimatedMax = Math.floor(availableWidthForDockApps / iconWidthWithGap);
    maxVisibleTotal = Math.max(3, estimatedMax);
  }

  const needsOverflow = totalApps > maxVisibleTotal;
  let visibleApps: typeof appWindows = [];
  let overflowApps: typeof appWindows = [];

  const launcherApp = appWindows.find(w => w.id === 'launcher');

  if (!needsOverflow) {
    visibleApps = [
      ...(launcherApp ? [launcherApp] : []),
      ...dockApps
    ];
  } else {
    const visibleOtherCount = Math.max(1, maxVisibleTotal - 2); // -1 for launcher, -1 for '...' button
    
    visibleApps = [
      ...(launcherApp ? [launcherApp] : []),
      ...dockApps.slice(0, visibleOtherCount)
    ];
    overflowApps = dockApps.slice(visibleOtherCount);
  }

  const draggableApps = visibleApps.filter(app => app.id !== 'launcher');

  // A window in the dock's strip of the screen hides the dock — a maximized
  // application is just the case where that is always true. `gestureCoversDock`
  // covers the window currently being dragged or resized, whose position has
  // not reached the store yet.
  const isDockOverlapped = windows.some((w) => {
    if (w.id === 'launcher' || !w.isOpen || w.isMinimized) return false;
    if (w.isMaximized) return true;
    // A window being dragged has not written its position to the store yet, so
    // for that one window the live gesture is the only truthful source — used
    // instead of the stored position, not in addition to it, so dragging a
    // window back up out of the dock's strip reveals the dock immediately.
    if (w.id === gestureWindowId) return gestureCoversDock;
    return coversDockZone(w.y + w.h, dockSize, windowHeight);
  });

  const shouldHideDock =
    isDockOverlapped &&
    !isCursorAtBottom &&
    !showAppDirectoryPopup &&
    !showMorePopup &&
    !showPopup &&
    !showRightPopup;

  return (
    <>
      {/* Invisible bottom hover trigger zone (10px from bottom) for auto-revealing floating dock */}
      <div
        id="dock-hover-trigger-zone"
        className="fixed bottom-0 left-0 right-0 h-[10px] z-[998] pointer-events-auto"
        onMouseEnter={() => setIsCursorAtBottom(true)}
      />

      <motion.div
        id="desktop-dock-container"
        initial={false}
        animate={{
          y: shouldHideDock ? 110 : 0,
          opacity: shouldHideDock ? 0 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 26,
        }}
        onMouseEnter={() => setIsCursorAtBottom(true)}
        className={`absolute ${activeSizes.bottom} left-0 right-0 flex items-center justify-center z-[999] pointer-events-none select-none ${activeSizes.outerGap}`}
      >
      {/* 1. Main Icon Bar Pill Wrapper */}
      <div className="relative">
        <AnimatePresence>
          {showAppDirectoryPopup && (
            <ApplicationMenuPopup
              onClose={() => setShowAppDirectoryPopup(false)}
              apps={appWindows}
              toggleWindow={toggleWindow}
              pinnedAppIds={pinnedAppIds}
              togglePin={togglePin}
              isPinned={isPinned}
            />
          )}

          {showMorePopup && (
            <MoreAppsPopup
              onClose={() => setShowMorePopup(false)}
              overflowApps={overflowApps}
              toggleWindow={toggleWindow}
            />
          )}
        </AnimatePresence>
        
        {/* Dynamic Apps Pill with equal, responsive spacing */}
        <div 
          id="dock-apps-pill"
          className={`pointer-events-auto flex items-center justify-center rounded-[20px] transition-all duration-300 ${shell.panel} ${activeSizes.dock}`}
          onContextMenu={handleDockBarContextMenu}
        >
          {/* Launcher / App Directory (Fixed & Separated on the left side) */}
          {launcherApp && (
            <div className="flex items-center justify-center relative h-full">
              <motion.button
                id={`dock-icon-launcher`}
                onClick={() => {
                  setShowAppDirectoryPopup(!showAppDirectoryPopup);
                  setShowPopup(false);
                  setShowRightPopup(false);
                  setShowMorePopup(false);
                }}
                onContextMenu={(e) => handleDockIconContextMenu(e, launcherApp)}
                whileHover={{ scale: 1.16, y: -6 }}
                whileTap={{ scale: 0.92 }}
                className={`cursor-pointer relative flex items-center justify-center ${activeSizes.icon} ${
                  showAppDirectoryPopup ? 'bg-white/10' : ''
                }`}
                title={launcherApp.title}
              >
                {getAppIcon('launcher', 'w-full h-full')}
              </motion.button>
            </div>
          )}

          {/* Separator between Fixed System Launcher and Draggable User Apps */}
          {launcherApp && draggableApps.length > 0 && (
            <div className={`w-px mx-1.5 self-center border-l transition-all duration-300 ${shell.divider} ${activeSizes.sepHeight}`} />
          )}

          {/* Draggable user apps */}
          {draggableApps.map((app) => {
            const isActive = app.isOpen;
            const isDragging = draggingId === app.id;

            return (
              <motion.div 
                key={app.id} 
                layout
                className={`flex items-center justify-center relative h-full transition-opacity duration-150 ${
                  isDragging ? 'opacity-30' : ''
                }`}
                draggable
                onDragStart={(e: any) => handleDragStart(e, app.id)}
                onDragOver={(e: any) => handleDragOver(e, app.id)}
                onDragEnd={handleDragEnd}
              >
                <motion.button
                  id={`dock-icon-${app.id}`}
                  onClick={() => {
                    toggleWindow(resolveDockTargetId(app.id));
                    setShowMorePopup(false);
                    setShowAppDirectoryPopup(false);
                    setShowPopup(false);
                    setShowRightPopup(false);
                  }}
                  onContextMenu={(e) => handleDockIconContextMenu(e, app)}
                  whileHover={{ scale: 1.16, y: -6 }}
                  whileTap={{ scale: 0.92 }}
                  className={`cursor-pointer cursor-grab active:cursor-grabbing relative flex items-center justify-center ${activeSizes.icon}`}
                  title={app.title}
                >
                  {getAppIcon(app.id, 'w-full h-full')}
                </motion.button>

                {/* Running/Focus Status Indicator Dot */}
                {isActive && (
                  <span
                    /* Accent, and wider when focused: which window is running
                       and which one has focus become two different readings.
                       Checked against every window of this app, not just its
                       primary one — the focused window may be a second/third
                       instance spawned via "New Window". */
                    className={`absolute rounded-full transition-all duration-300 ${activeSizes.dotBottom} ${
                      windows.some((w) => w.appId === app.id && w.id === activeWindowId) ? 'w-4 h-1' : `${activeSizes.dot}`
                    }`}
                    style={{
                      backgroundColor: shell.accentColor,
                      boxShadow: `0 0 6px ${shell.accentColor}b3`,
                    }}
                  />
                )}
              </motion.div>
            );
          })}

          {/* Overflow '...' Menu Button */}
          {needsOverflow && (
            <div className="flex items-center justify-center relative h-full">
              <motion.button
                id="dock-more-button"
                onClick={() => {
                  setShowMorePopup(!showMorePopup);
                  setShowAppDirectoryPopup(false);
                  setShowPopup(false);
                  setShowRightPopup(false);
                }}
                whileHover={{ scale: 1.16, y: -6 }}
                whileTap={{ scale: 0.92 }}
                className={`cursor-pointer relative flex items-center justify-center ${activeSizes.icon} ${
                  showMorePopup ? 'bg-white/10' : ''
                }`}
                title="More Apps"
              >
                <MoreHorizontal size={activeSizes.iconSize + 2} className={shell.text} strokeWidth={2.4} />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Clock & Date Pill Wrapper */}
      <div className="relative">
        <AnimatePresence>
          {showPopup && (
            <CalendarClockPopup
              onClose={() => setShowPopup(false)}
              time={time}
            />
          )}

          {showRightPopup && (
            <SystemNotificationPopup
              onClose={() => setShowRightPopup(false)}
              notificationsMuted={notificationsMuted}
              setNotificationsMuted={setNotificationsMuted}
              currentUser={currentUser}
              logout={logout}
            />
          )}
        </AnimatePresence>

        {/* 2. System and Status Pill - SYNCED DYNAMICALLY TO THE CHOSEN PRESET SIZE */}
        <div 
          id="dock-system-pill"
          className={`pointer-events-auto flex items-center justify-center rounded-[20px] font-sans transition-all duration-300 ${shell.panel} ${activeSizes.dock}`}
        >
          {/* Time & Date Group (Clickable to toggle Left Popup) */}
          <button 
            onClick={() => {
              setShowPopup(!showPopup);
              setShowRightPopup(false);
              setShowAppDirectoryPopup(false);
            }}
            className={`cursor-pointer rounded-xl transition-all focus:outline-none ${shell.hover} ${shell.pressed} ${
              showPopup ? shell.card : ''
            } ${activeSizes.timeDateBtn}`}
            title="Calendar & Settings"
          >
            <span className={`font-bold tracking-tight tabular-nums leading-none ${shell.text} ${activeSizes.timeText}`}>{formatTime(time)}</span>
            <span className={`font-medium tracking-tight leading-none ${shell.textMuted} ${activeSizes.dateText}`}>{formatDate(time)}</span>
          </button>

          {/* Separator */}
          <div className={`w-px self-center border-l transition-all duration-300 ${shell.divider} ${activeSizes.sepHeight}`} />

          {/* System Icons Group */}
          <button 
            onClick={() => {
              setShowRightPopup(!showRightPopup);
              setShowPopup(false);
              setShowAppDirectoryPopup(false);
            }}
            className={`cursor-pointer rounded-xl transition-all focus:outline-none ${shell.hover} ${shell.pressed} ${
              showRightPopup ? shell.card : ''
            } ${activeSizes.systemBtn} ${activeSizes.systemIconGap}`}
            title="System & Notifications Panel"
          >
            {/* Notification Icon */}
            {notificationsMuted ? (
              <BellOff size={activeSizes.iconSize} strokeWidth={2.4} className={`transition-all shrink-0 ${shell.textSubtle}`} />
            ) : (
              <div className="relative shrink-0 flex items-center justify-center">
                <Bell size={activeSizes.iconSize} strokeWidth={2.4} className={`transition-all ${shell.text}`} />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
            )}

            {/* Workspace status */}
            <div className={`flex items-center gap-1.5 shrink-0 ${shell.text}`}>
              <Monitor size={activeSizes.monitorSize} strokeWidth={2.4} className="transition-all" />
              <span className={`font-extrabold tracking-tight transition-all ${activeSizes.statusText}`}>{currentDesktop}</span>
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  </>
);
}
