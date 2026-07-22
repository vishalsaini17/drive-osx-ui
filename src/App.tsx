import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Wallpaper from './components/Wallpaper';
import Dock from './components/Dock';
import AppWindow from './components/AppWindow';

// Import apps
import AppLauncher from './components/apps/AppLauncher';
import WebBrowser from './components/apps/WebBrowser';
import Terminal from './components/apps/Terminal';
import FileManager from './components/apps/FileManager';
import Settings from './components/apps/Settings';
import Messenger from './components/apps/Messenger';
import ClockApp from './components/apps/ClockApp';
import TextEditor from './components/apps/TextEditor';
import PaintApp from './components/apps/PaintApp';
import TrashApp from './components/apps/TrashApp';

import LoginScreen from './components/LoginScreen';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';

// Import Zustand Store
import { useSystemStore, getAppIcon } from './systemStore';
import { AppRegistry } from './core/AppRegistry';

export default function App() {
  const initializeStore = useSystemStore((state) => state.initializeStore);
  const settings = useSystemStore((state) => state.settings);
  const isAuthenticated = useSystemStore((state) => state.isAuthenticated);

  const navigate = useNavigate();
  const location = useLocation();

  // Initialize the store from localStorage on mount
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Handle global auth-based redirects
  useEffect(() => {
    if (isAuthenticated) {
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/');
      }
    }
  }, [isAuthenticated, location.pathname, navigate]);

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
        <Route path="/" element={isAuthenticated ? <DesktopLayout /> : <Navigate to="/login" replace />} />
        <Route path="/:appRoute" element={isAuthenticated ? <DesktopLayout /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </main>
  );
}

function DesktopLayout() {
  const settings = useSystemStore((state) => state.settings);
  const windows = useSystemStore((state) => state.windows);
  const toggleWindow = useSystemStore((state) => state.toggleWindow);
  const activeWindowId = useSystemStore((state) => state.activeWindowId);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const navigate = useNavigate();
  const location = useLocation();
  const routeOpeningApp = useRef<string | null>(null);

  useEffect(() => {
    const appId = AppRegistry.getAppIdForPath(location.pathname);

    if (!appId) {
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
      return;
    }

    if (activeWindowId !== appId) {
      routeOpeningApp.current = appId;
      openAppWindow(appId);
    } else {
      routeOpeningApp.current = null;
    }
  }, [activeWindowId, location.pathname, navigate, openAppWindow]);

  useEffect(() => {
    if (routeOpeningApp.current) {
      return;
    }

    const activePath = activeWindowId ? AppRegistry.getPathForApp(activeWindowId) : '/';
    if (activePath && location.pathname !== activePath) {
      navigate(activePath, { replace: true });
    }
  }, [activeWindowId, location.pathname, navigate]);

  return (
    <>
      {/* 1. LAYERED VECTOR WAVES DESKTOP WALLPAPER */}
      <Wallpaper settings={settings} />

      {/* 2. WINDOW STAGE AREA */}
      <div id="desktop-window-stage" className="absolute inset-0 pt-4 pb-20 pointer-events-none z-[50]">
        {windows.filter(app => app.id !== 'launcher').map(app => (
          <AppWindow key={app.id} app={app}>
            {/* Render proper component according to the window id */}
            {app.id === 'browser' && <WebBrowser />}
            {app.id === 'terminal' && <Terminal />}
            {app.id === 'fileManager' && <FileManager />}
            {app.id === 'settings' && <Settings />}
            {app.id === 'messenger' && <Messenger />}
            {app.id === 'clock' && <ClockApp />}
            {app.id === 'editor' && <TextEditor />}
            {app.id === 'paint' && <PaintApp />}
            {app.id === 'trash' && <TrashApp />}
          </AppWindow>
        ))}
      </div>

      {/* 4. DESKTOP SHORTCUTS */}
      <div className="absolute top-6 left-6 flex flex-col gap-5 z-20 pointer-events-auto select-none">
        <button
          onClick={() => toggleWindow('fileManager')}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-center cursor-pointer group"
        >
          <div className="w-10 h-10 filter drop-shadow-md group-hover:scale-105 transition-transform shrink-0">
            {getAppIcon('fileManager', 'w-full h-full')}
          </div>
          <span className="text-[10px] font-semibold text-white/90 tracking-wide mt-1 drop-shadow-sm select-none">
            {windows.find(w => w.id === 'fileManager')?.title || 'Files'}
          </span>
        </button>

        <button
          onClick={() => toggleWindow('paint')}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-center cursor-pointer group"
        >
          <div className="w-10 h-10 filter drop-shadow-md group-hover:scale-105 transition-transform shrink-0">
            {getAppIcon('paint', 'w-full h-full')}
          </div>
          <span className="text-[10px] font-semibold text-white/90 tracking-wide mt-1 drop-shadow-sm select-none">
            {windows.find(w => w.id === 'paint')?.title || 'Paint Studio'}
          </span>
        </button>

        <button
          onClick={() => toggleWindow('messenger')}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-center cursor-pointer group"
        >
          <div className="w-10 h-10 filter drop-shadow-md group-hover:scale-105 transition-transform shrink-0">
            {getAppIcon('messenger', 'w-full h-full')}
          </div>
          <span className="text-[10px] font-semibold text-white/90 tracking-wide mt-1 drop-shadow-sm select-none">
            {windows.find(w => w.id === 'messenger')?.title || 'OS Caption'}
          </span>
        </button>
      </div>

      {/* 5. BOTTOM SYSTEM DOCK */}
      <Dock />
    </>
  );
}
