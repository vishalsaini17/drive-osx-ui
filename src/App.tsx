import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Wallpaper from './components/Wallpaper';
import Dock from './components/Dock';
import AppWindow from './components/AppWindow';
import GlobalContextMenu from './components/GlobalContextMenu';
import { useContextMenuStore, ContextMenuItem } from './services/contextMenuStore';
import { StorageService } from './services/StorageService';
import { FolderPlus, FileText, Terminal as TerminalIcon, Image, RefreshCw, Settings as SettingsIcon, LogOut, ExternalLink, Info, Pin, Monitor } from 'lucide-react';

// Import ApplicationRenderer
import ApplicationRenderer from './applications';

import LoginScreen from './components/LoginScreen';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';

import SystemToastNotifier from './components/SystemToastNotifier';

// Import Zustand Store
import { useSystemStore, getAppIcon } from './systemStore';
import { AppRegistry } from './core/AppRegistry';

export default function App() {
  const initializeStore = useSystemStore((state) => state.initializeStore);
  const settings = useSystemStore((state) => state.settings);
  const isAuthenticated = useSystemStore((state) => state.isAuthenticated);
  const isInitializing = useSystemStore((state) => state.isInitializing);
  const addNotification = useSystemStore((state) => state.addNotification);
  const setOfflineMode = useSystemStore((state) => state.setOfflineMode);

  const navigate = useNavigate();
  const location = useLocation();

  // Initialize the store from localStorage on mount
  useEffect(() => {
    initializeStore();

    const handleOffline = () => {
      setOfflineMode(true);
      addNotification({
        sender: 'Network Manager',
        text: 'Internet connection lost. Switched to System Offline Mode.',
        type: 'error',
      });
    };

    const handleOnline = () => {
      setOfflineMode(false);
      addNotification({
        sender: 'Network Manager',
        text: 'Internet connection restored. Online services connected.',
        type: 'success',
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [initializeStore, addNotification, setOfflineMode]);

  // Handle global auth-based redirects
  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!isAuthenticated) {
      if (
        location.pathname !== '/login' &&
        location.pathname !== '/register' &&
        location.pathname !== '/forgot-password' &&
        location.pathname !== '/reset-password'
      ) {
        navigate('/login');
      }
    } else {
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/');
      }
    }
  }, [isAuthenticated, isInitializing, location.pathname, navigate]);

  return (
    <main 
      className="relative w-screen h-screen overflow-hidden bg-[#06060c] font-sans antialiased text-white select-none"
      style={settings.fontFamily ? { fontFamily: `${settings.fontFamily}, sans-serif` } : undefined}
    >
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<LoginScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="/desktop" element={<Navigate to="/" replace />} />
        <Route path="/" element={<DesktopLayout />} />
        <Route path="/:appRoute" element={<DesktopLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalContextMenu />
      <SystemToastNotifier />
    </main>
  );
}

function DesktopLayout() {
  const settings = useSystemStore((state) => state.settings);
  const windows = useSystemStore((state) => state.windows);
  const toggleWindow = useSystemStore((state) => state.toggleWindow);
  const activeWindowId = useSystemStore((state) => state.activeWindowId);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const focusWindow = useSystemStore((state) => state.focusWindow);
  const setFiles = useSystemStore((state) => state.setFiles);
  const logout = useSystemStore((state) => state.logout);
  const clampWindowsToViewport = useSystemStore((state) => state.clampWindowsToViewport);
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);
  const navigate = useNavigate();
  const location = useLocation();

  const [desktopShortcutIds, setDesktopShortcutIds] = useState<string[]>(() => {
    return StorageService.get<string[]>('desktop-shortcuts', ['fileManager', 'paint', 'messenger']);
  });

  useEffect(() => {
    const handleShortcutsUpdated = () => {
      const updated = StorageService.get<string[]>('desktop-shortcuts', ['fileManager', 'paint', 'messenger']);
      setDesktopShortcutIds(updated);
    };
    window.addEventListener('desktop-shortcuts-updated', handleShortcutsUpdated);
    return () => window.removeEventListener('desktop-shortcuts-updated', handleShortcutsUpdated);
  }, []);

  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const desktopItems: ContextMenuItem[] = [
      {
        id: 'new-folder',
        label: 'New Folder',
        icon: <FolderPlus size={15} className="text-amber-400" />,
        onClick: () => {
          openAppWindow('fileManager');
          setFiles((prev) => [
            ...prev,
            {
              id: `folder-${Date.now()}`,
              name: `New Folder ${Date.now().toString().slice(-4)}`,
              type: 'folder',
              parentId: null,
              createdAt: new Date().toLocaleDateString(),
            },
          ]);
        },
      },
      {
        id: 'new-file',
        label: 'New Text Document',
        icon: <FileText size={15} className="text-blue-400" />,
        onClick: () => {
          openAppWindow('editor');
        },
      },
      { divider: true },
      {
        id: 'terminal-here',
        label: 'Open Terminal Here',
        icon: <TerminalIcon size={15} className="text-emerald-400" />,
        shortcut: 'Ctrl+Alt+T',
        onClick: () => {
          openAppWindow('terminal');
        },
      },
      {
        id: 'change-wallpaper',
        label: 'Change Wallpaper...',
        icon: <Image size={15} className="text-purple-400" />,
        onClick: () => {
          openAppWindow('settings');
        },
      },
      { divider: true },
      {
        id: 'refresh-desktop',
        label: 'Refresh Desktop',
        icon: <RefreshCw size={15} className="text-slate-300" />,
        shortcut: 'F5',
        onClick: () => {
          window.dispatchEvent(new Event('resize'));
        },
      },
      {
        id: 'system-settings',
        label: 'System Settings',
        icon: <SettingsIcon size={15} className="text-slate-300" />,
        onClick: () => {
          openAppWindow('settings');
        },
      },
      { divider: true },
      {
        id: 'lock-logout',
        label: 'Lock / Sign Out',
        icon: <LogOut size={15} className="text-red-400" />,
        danger: true,
        onClick: () => {
          logout();
        },
      },
    ];

    openContextMenu(e, desktopItems, 'Desktop');
  };

  const handleShortcutContextMenu = (e: React.MouseEvent, appId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDockPinned = StorageService.get<string[] | null>('dock-pinned-apps', null) || windows.filter(w => w.id !== 'launcher').map(w => w.id);
    const isDockPinned = currentDockPinned.includes(appId);

    const shortcutItems: ContextMenuItem[] = [
      {
        id: 'open-app',
        label: `Open ${title}`,
        icon: <ExternalLink size={15} className="text-blue-400" />,
        onClick: () => {
          openAppWindow(appId);
        },
      },
      { divider: true },
      {
        id: 'unpin-desktop',
        label: 'Unpin from Desktop',
        icon: <Monitor size={15} className="text-amber-400" />,
        onClick: () => {
          const current = StorageService.get<string[]>('desktop-shortcuts', ['fileManager', 'paint', 'messenger']);
          const next = current.filter((id) => id !== appId);
          StorageService.set('desktop-shortcuts', next);
          window.dispatchEvent(new Event('desktop-shortcuts-updated'));
        },
      },
      {
        id: 'pin-dock',
        label: isDockPinned ? 'Unpin from Dock' : 'Pin to Dock',
        icon: <Pin size={15} className={isDockPinned ? 'text-amber-400' : 'text-purple-400'} />,
        onClick: () => {
          const next = isDockPinned
            ? currentDockPinned.filter((id) => id !== appId)
            : [...currentDockPinned, appId];
          StorageService.set('dock-pinned-apps', next);
          window.dispatchEvent(new Event('dock-pins-updated'));
        },
      },
      { divider: true },
      {
        id: 'app-info',
        label: 'App Properties',
        icon: <Info size={15} className="text-slate-300" />,
        onClick: () => {
          openAppWindow('settings');
        },
      },
    ];

    openContextMenu(e, shortcutItems, title);
  };

  const prevPathRef = useRef<string | null>(null);
  const prevActiveWindowRef = useRef<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      clampWindowsToViewport();
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [clampWindowsToViewport]);

  useEffect(() => {
    const currentPath = location.pathname;
    const currentActiveWindow = activeWindowId;

    const isInitialMount = prevPathRef.current === null;
    const pathChanged = !isInitialMount && prevPathRef.current !== currentPath;

    prevPathRef.current = currentPath;
    prevActiveWindowRef.current = currentActiveWindow;

    // 1. Handle browser direct URL navigation or back/forward buttons
    if (isInitialMount || pathChanged) {
      const appId = AppRegistry.getAppIdForPath(currentPath);
      if (appId) {
        const targetWin = windows.find(w => w.id === appId);
        if (!targetWin?.isOpen || currentActiveWindow !== appId) {
          openAppWindow(appId);
        }
      } else if (currentPath !== '/') {
        navigate('/', { replace: true });
        focusWindow('');
      } else if (currentActiveWindow !== null) {
        focusWindow('');
      }
    } 
    // 2. Handle internal OS state changes (opening, closing, or switching app windows)
    else {
      let expectedPath = '/';

      if (currentActiveWindow) {
        const activeApp = windows.find(w => w.id === currentActiveWindow);
        if (activeApp && activeApp.isOpen) {
          expectedPath = AppRegistry.getPathForApp(currentActiveWindow) || '/';
        }
      }

      if (currentPath !== expectedPath) {
        navigate(expectedPath, { replace: true });
      }
    }
  }, [location.pathname, activeWindowId, windows, navigate, openAppWindow, focusWindow]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden select-none"
      onClick={() => focusWindow('')}
      onContextMenu={handleDesktopContextMenu}
    >
      {/* 1. LAYERED VECTOR WAVES DESKTOP WALLPAPER */}
      <Wallpaper settings={settings} />

      {/* 2. WINDOW STAGE AREA */}
      <div id="desktop-window-stage" className="absolute inset-0 pointer-events-none z-[50]">
        {windows.map(app => (
          <AppWindow
            key={app.id}
            app={app}
            minW={app.minW}
            minH={app.minH}
            showStatusBar={app.id !== 'launcher'}
          >
            {/* Render app dynamically using ApplicationRenderer */}
            <ApplicationRenderer appId={app.id} />
          </AppWindow>
        ))}
      </div>

      {/* 4. DESKTOP SHORTCUTS */}
      <div 
        className="absolute top-6 left-6 flex flex-col gap-5 z-20 pointer-events-auto select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {desktopShortcutIds.map((appId) => {
          const app = windows.find((w) => w.id === appId);
          const title = app?.title || appId;
          return (
            <button
              key={appId}
              onClick={(e) => {
                e.stopPropagation();
                toggleWindow(appId);
              }}
              onContextMenu={(e) => handleShortcutContextMenu(e, appId, title)}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-center cursor-pointer group"
            >
              <div className="w-10 h-10 filter drop-shadow-md group-hover:scale-105 transition-transform shrink-0">
                {getAppIcon(appId, 'w-full h-full')}
              </div>
              <span className="text-[10px] font-semibold text-white/90 tracking-wide mt-1 drop-shadow-sm select-none truncate max-w-[70px]">
                {title}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. BOTTOM SYSTEM DOCK */}
      <div onClick={(e) => e.stopPropagation()}>
        <Dock />
      </div>
    </div>
  );
}
