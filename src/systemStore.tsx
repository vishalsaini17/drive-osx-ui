import React from 'react';
import { create } from 'zustand';
import { WindowState, FileItem, ChatMessage, SystemSettings, User, WorldCity, DEFAULT_WORLD_CITIES, CalendarEvent } from './types';
import { AppRegistry } from './core/AppRegistry';
import { StorageService } from './services/StorageService';
import { ApiService } from './services/ApiService';

const defaultFiles: FileItem[] = [
  { id: 'folder-documents', name: 'Documents', type: 'folder', parentId: null, createdAt: '10.07.2023' },
  { id: 'folder-downloads', name: 'Downloads', type: 'folder', parentId: null, createdAt: '10.07.2023' },
  { id: 'folder-projects', name: 'Projects', type: 'folder', parentId: null, createdAt: '10.07.2023' },
  { id: 'folder-pictures', name: 'Pictures', type: 'folder', parentId: null, createdAt: '10.07.2023' },
  { id: 'folder-videos', name: 'Videos', type: 'folder', parentId: null, createdAt: '10.07.2023' },
  { id: 'folder-music', name: 'Music', type: 'folder', parentId: null, createdAt: '10.07.2023' },
  { id: 'folder-system', name: 'System', type: 'folder', parentId: null, createdAt: '10.07.2023' },
  { id: 'file-readme', name: 'readme.txt', type: 'file', content: 'Welcome to Drive OSX v1.0!\n\nThis operating system is built entirely with React, Tailwind CSS, and Motion.\n\nDouble-click text files to open them in the Text Editor. Click and drag windows to reposition, or use corners to resize!\n\nTry writing files and saving them back to the disk.', parentId: 'folder-documents', createdAt: '10.07.2023' },
  { id: 'file-todo', name: 'todo.txt', type: 'file', content: '==== TODO LIST ====\n- Learn React 19 typing specifications\n- Change system wallpaper to Sunset Glow\n- Empty the trash bin\n- Export a beautiful drawing from Paint App', parentId: 'folder-documents', createdAt: '10.07.2023' },
  { id: 'file-wallpaper', name: 'retro_wallpaper.png', type: 'file', content: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', parentId: 'folder-pictures', createdAt: '10.07.2023' },
  { id: 'file-system-log', name: 'system.log', type: 'file', content: 'SYSTEM_BOOT: SUCCESS\nMEM_CHECK: OK\nNETWORK_INIT: CONNECTED\nTHEME_LOAD: WAVY_DEFAULT', parentId: 'folder-system', createdAt: '10.07.2023' },
];

export const getAppIcon = (id: string, className = "w-full h-full") => {
  return AppRegistry.getAppIcon(id, className);
};

interface SystemState {
  settings: SystemSettings;
  currentDesktop: number;
  maxZIndex: number;
  activeWindowId: string | null;
  windows: WindowState[];
  files: FileItem[];
  deletedFiles: FileItem[];
  editorFileId: string | null;
  editorFileName: string | null;
  editorFileContent: string;
  messages: ChatMessage[];
  
  // Auth state & actions
  currentUser: User | null;
  usersList: User[];
  isAuthenticated: boolean;
  updateCurrentUser: (updatedUser: Partial<User>) => void;
  login: (username: string, passwordHash: string) => Promise<{ success: boolean; message?: string }>;
  signup: (payload: { username: string; firstName: string; lastName: string; passwordHash: string; recoveryEmail?: string; mobile?: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  
  // World Clocks state & actions
  worldCities: WorldCity[];
  addWorldCity: (city: WorldCity) => void;
  removeWorldCity: (id: string) => void;
  clockAppShowAddCity: boolean;
  openClockAppToAddCity: () => void;
  resetClockAppShowAddCity: () => void;

  // Calendar Events state & actions
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (id: string, updated: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  setCalendarEvents: (events: CalendarEvent[]) => void;

  // Actions
  initializeStore: () => void;
  setSettings: (updater: SystemSettings | ((prev: SystemSettings) => SystemSettings)) => void;
  updateAppPreference: (appId: string, prefKey: string, value: any) => void;
  resetAppPreferences: (appId: string) => void;
  setCurrentDesktop: (desktop: number) => void;
  focusWindow: (id: string) => void;
  toggleWindow: (id: string) => void;
  handleCloseWindow: (id: string) => void;
  handleMinimizeWindow: (id: string) => void;
  handleMaximizeWindow: (id: string) => void;
  handleMoveWindow: (id: string, x: number, y: number) => void;
  handleResizeWindow: (id: string, w: number, h: number) => void;
  openTextFileInEditor: (fileId: string, name: string, content: string) => void;
  handleSaveTextFile: (fileId: string, updatedContent: string) => void;
  handleDeleteFile: (deletedItem: FileItem) => void;
  handleRestoreFile: (file: FileItem) => void;
  handleEmptyTrash: () => void;
  setMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setFiles: (updater: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  playClickSound: () => void;
  openAppWindow: (id: string) => void;
  clampWindowsToViewport: () => void;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  settings: {
    wallpaper: 'wave-default',
    customWallpaperUrl: '',
    dockSize: 'md',
    theme: 'classic-light', // Light theme by default as requested!
    soundsEnabled: true,
    volume: 75,
    wifiStatus: 'connected',
    fontFamily: 'Poppins',
    accentColor: '#8b5cf6', // Purple
    iconSize: 'md',
    desktopIcons: { trash: true, files: true, settings: true, terminal: true, paint: true, browser: true, calculator: true, spreadsheet: true, presentation: true, 'pdf-viewer': true },
    dockPosition: 'bottom',
    dockAutohide: false,
    dockMagnification: true,
    taskbarPosition: 'top',
    clockFormat: '12h',
    showBattery: true,
    showWifiInTaskbar: true,
    notificationsEnabled: true,
    dndEnabled: false,
    notificationSound: 'Chime',
    notificationPriority: 'all',
    defaultApps: { browser: 'browser', editor: 'editor', terminal: 'terminal', calendar: 'calendar', paint: 'paint' },
    zoomLevel: 100,
    fontScaling: 100,
    twoFactorEnabled: false,
    storageLimitGB: 16,
  },
  currentDesktop: 1,
  maxZIndex: 100,
  activeWindowId: null,
  windows: AppRegistry.getAppManifests().map((manifest, index) => ({
    id: manifest.id,
    title: manifest.title,
    iconName: manifest.iconName,
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: manifest.defaultWindow.x,
    y: manifest.defaultWindow.y,
    w: manifest.defaultWindow.w,
    h: manifest.defaultWindow.h,
    minW: manifest.defaultWindow.minW,
    minH: manifest.defaultWindow.minH,
    zIndex: 10 + index,
  })),
  files: [],
  deletedFiles: [],
  editorFileId: null,
  editorFileName: null,
  editorFileContent: '',
  messages: [
    {
      id: 'msg-init',
      sender: 'assistant',
      text: '👋 Welcome back, Guest! I am OS Caption, your AI-guided operating system assistant.\n\nI can execute actual desktop commands on your system! Try asking me:\n\n👉 "change wallpaper to sunset"\n👉 "open the terminal"\n👉 "mute volume"\n👉 "open paint"\n\nHow can I automate your system today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ],

  currentUser: null,
  usersList: [],
  isAuthenticated: false,

  login: async (username, passwordHash) => {
    const { playClickSound } = get();
    playClickSound();

    // Attempt API login
    const apiResult = await ApiService.login({ username, passwordHash });
    if (apiResult.success) {
      // Fetch profile details or construct from API response
      const profile = await ApiService.getProfile();
      const user: User = {
        username: profile?.username || apiResult.user?.username || username,
        fullName: profile?.fullName || apiResult.user?.fullName || username,
        passwordHash,
        avatarUrl: profile?.avatarUrl || '👾',
        email: profile?.email || apiResult.user?.email || profile?.recoveryEmail || apiResult.user?.recoveryEmail,
        recoveryEmail: profile?.recoveryEmail || apiResult.user?.recoveryEmail,
        mobile: profile?.mobile || apiResult.user?.mobile,
      };

      StorageService.set('webos-current-user', user);
      set({ currentUser: user, isAuthenticated: true });

      // Update assistant's greeting to personalize it
      set({
        messages: [
          {
            id: `msg-welcome-${Date.now()}`,
            sender: 'assistant',
            text: `👋 Welcome back, ${user.fullName}! I am OS Caption, your AI-guided operating system assistant.\n\nI can execute actual desktop commands on your system! Try asking me:\n\n👉 "change wallpaper to sunset"\n👉 "open the terminal"\n👉 "mute volume"\n👉 "open paint"\n\nHow can I automate your system today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]
      });
      return { success: true, message: apiResult.message || 'Login successful' };
    }

    return { success: false, message: apiResult.message || 'Invalid username or password.' };
  },

  signup: async ({ username, firstName, lastName, passwordHash, recoveryEmail, mobile }) => {
    const { playClickSound } = get();
    playClickSound();
    if (!username.trim() || !firstName.trim() || !lastName.trim() || !passwordHash.trim()) {
      return { success: false, message: 'Username, first name, last name, and password are required.' };
    }
    if (!recoveryEmail?.trim() && !mobile?.trim()) {
      return { success: false, message: 'Provide a recovery email or recovery phone.' };
    }

    // Attempt API Registration
    const apiResult = await ApiService.register({
      username,
      passwordHash,
      firstName,
      lastName,
      recoveryEmail,
      mobile,
    });

    if (apiResult.success) {
      return { success: true, message: apiResult.message || 'Account created successfully!' };
    }

    return { success: false, message: apiResult.message };
  },

  updateCurrentUser: (updatedUser: Partial<User>) => {
    set((state) => {
      if (!state.currentUser) return state;
      const nextUser = { ...state.currentUser, ...updatedUser };
      StorageService.set('webos-current-user', nextUser);
      const updatedList = state.usersList.map((u) => u.username === nextUser.username ? nextUser : u);
      StorageService.set('webos-users-list', updatedList);
      return { currentUser: nextUser, usersList: updatedList };
    });
  },

  logout: () => {
    const { playClickSound } = get();
    playClickSound();
    StorageService.remove('webos-current-user');
    ApiService.clearToken();
    set({ currentUser: null, isAuthenticated: false });
  },

  worldCities: DEFAULT_WORLD_CITIES,
  clockAppShowAddCity: false,

  addWorldCity: (city) => {
    set((state) => {
      if (state.worldCities.some((c) => c.name.toLowerCase() === city.name.toLowerCase())) {
        return state;
      }
      const updated = [...state.worldCities, city];
      StorageService.set('webos-world-cities', updated);
      return { worldCities: updated };
    });
  },

  removeWorldCity: (id) => {
    set((state) => {
      const updated = state.worldCities.filter((c) => c.id !== id);
      StorageService.set('webos-world-cities', updated);
      return { worldCities: updated };
    });
  },

  openClockAppToAddCity: () => {
    const { openAppWindow } = get();
    openAppWindow('clock');
    set({ clockAppShowAddCity: true });
  },

  resetClockAppShowAddCity: () => {
    set({ clockAppShowAddCity: false });
  },

  calendarEvents: [],

  addCalendarEvent: (evt) => {
    const newEvt: CalendarEvent = {
      ...evt,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    set((state) => {
      const updated = [...state.calendarEvents, newEvt];
      StorageService.set('webos-calendar-events', updated);
      return { calendarEvents: updated };
    });
  },

  updateCalendarEvent: (id, updatedFields) => {
    set((state) => {
      const updated = state.calendarEvents.map((e) =>
        e.id === id ? { ...e, ...updatedFields } : e
      );
      StorageService.set('webos-calendar-events', updated);
      return { calendarEvents: updated };
    });
  },

  deleteCalendarEvent: (id) => {
    set((state) => {
      const updated = state.calendarEvents.filter((e) => e.id !== id);
      StorageService.set('webos-calendar-events', updated);
      return { calendarEvents: updated };
    });
  },

  setCalendarEvents: (events) => {
    StorageService.set('webos-calendar-events', events);
    set({ calendarEvents: events });
  },

  initializeStore: () => {
    const savedFiles = StorageService.get<FileItem[] | null>('webos-files', null);
    const savedTrash = StorageService.get<FileItem[] | null>('webos-trash', null);
    const savedSettings = StorageService.get<Partial<SystemSettings> | null>('webos-settings', null);
    const savedCurrentUser = StorageService.get<User | null>('webos-current-user', null);
    const savedUsersList = StorageService.get<User[] | null>('webos-users-list', null);
    const savedWorldCities = StorageService.get<WorldCity[] | null>('webos-world-cities', null);
    const savedEvents = StorageService.get<CalendarEvent[] | null>('webos-calendar-events', null);

    const todayISO = new Date().toISOString().split('T')[0];
    const defaultEvents: CalendarEvent[] = [
      {
        id: 'evt-1',
        title: 'Team Sync & Project Review',
        date: todayISO,
        time: '10:00 AM',
        endTime: '11:00 AM',
        category: 'Work',
        description: 'Review system design & upcoming sprints with team leads.',
        location: 'OSX Meet Virtual Room',
        attendees: [
          { email: 'alex@driveosx.com', name: 'Alex Johnson', status: 'accepted' },
          { email: 'sarah@driveosx.com', name: 'Sarah Miller', status: 'pending' },
          { email: 'dev@driveosx.com', name: 'Dev Team', status: 'accepted' },
        ],
        meetingLink: 'https://meet.driveosx.com/room-teamsync',
        recurrence: 'weekly',
        reminder: '15m',
        timezone: 'America/New_York',
      },
      {
        id: 'evt-2',
        title: 'Lunch with Alex',
        date: todayISO,
        time: '01:00 PM',
        endTime: '02:00 PM',
        category: 'Personal',
        description: 'Bistro Cafe on 5th Avenue',
        location: 'Bistro Cafe',
        attendees: [{ email: 'alex@driveosx.com', name: 'Alex Johnson', status: 'accepted' }],
        recurrence: 'none',
        reminder: '30m',
        timezone: 'America/New_York',
      },
      {
        id: 'evt-3',
        title: 'Weekly Sprint Planning',
        date: todayISO,
        time: '03:00 PM',
        endTime: '04:00 PM',
        category: 'Work',
        description: 'Backlog refinement and task allocation.',
        location: 'HQ Conference Room A',
        attendees: [{ email: 'pm@driveosx.com', name: 'Product Manager', status: 'accepted' }],
        meetingLink: 'https://meet.driveosx.com/room-sprintplan',
        recurrence: 'weekly',
        reminder: '1h',
        timezone: 'UTC',
      },
    ];
    const finalEvents = savedEvents !== null ? savedEvents : defaultEvents;
    if (savedEvents === null) {
      StorageService.set('webos-calendar-events', defaultEvents);
    }

    set((state) => {
      const nextSettings = savedSettings ? { ...state.settings, ...savedSettings } : state.settings;
      const cleanedSavedFiles = savedFiles ? savedFiles.filter((f) => f.id !== 'volume-511gb' && f.id !== 'data-disk' && !f.name.includes('511 GB') && !f.name.includes('Data Disk')) : null;
      const nextFiles = cleanedSavedFiles ? cleanedSavedFiles : defaultFiles;
      const nextTrash = savedTrash ? savedTrash : [];
      const hasAuthToken = !!ApiService.getToken();
      const isAuthenticated = hasAuthToken && !!savedCurrentUser;
      const currentUser = isAuthenticated ? savedCurrentUser : null;

      const rawWorldCities = savedWorldCities && savedWorldCities.length > 0 ? savedWorldCities : DEFAULT_WORLD_CITIES;
      const nextWorldCities = rawWorldCities.filter(
        (c) => !c.isCurrentLocation && c.desc !== 'Current location' && c.id !== 'delhi'
      );

      if (!savedFiles) {
        StorageService.set('webos-files', defaultFiles);
      }

      const finalMessages: ChatMessage[] = [
        {
          id: 'msg-init',
          sender: 'assistant',
          text: `👋 Welcome back, ${currentUser?.fullName || 'User'}! I am OS Caption, your AI-guided operating system assistant.\n\nI can execute actual desktop commands on your system! Try asking me:\n\n👉 "change wallpaper to sunset"\n👉 "open the terminal"\n👉 "mute volume"\n👉 "open paint"\n\nHow can I automate your system today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ];

      return {
        settings: nextSettings,
        files: nextFiles,
        deletedFiles: nextTrash,
        currentUser: currentUser,
        usersList: savedUsersList || [],
        isAuthenticated: isAuthenticated,
        messages: finalMessages,
        worldCities: nextWorldCities,
        calendarEvents: finalEvents,
      };
    });
  },

  setSettings: (updater) => {
    set((state) => {
      const nextSettings = typeof updater === 'function' ? updater(state.settings) : updater;
      StorageService.set('webos-settings', nextSettings);
      return { settings: nextSettings };
    });
  },

  updateAppPreference: (appId, prefKey, value) => {
    set((state) => {
      const currentAppPrefs = state.settings.appPreferences?.[appId] || {};
      const nextSettings: SystemSettings = {
        ...state.settings,
        appPreferences: {
          ...state.settings.appPreferences,
          [appId]: {
            ...currentAppPrefs,
            [prefKey]: value,
          },
        },
      };
      StorageService.set('webos-settings', nextSettings);
      return { settings: nextSettings };
    });
  },

  resetAppPreferences: (appId) => {
    set((state) => {
      const newAppPrefs = { ...state.settings.appPreferences };
      delete newAppPrefs[appId];
      const nextSettings: SystemSettings = {
        ...state.settings,
        appPreferences: newAppPrefs,
      };
      StorageService.set('webos-settings', nextSettings);
      return { settings: nextSettings };
    });
  },

  setCurrentDesktop: (desktop) => {
    set({ currentDesktop: desktop });
  },

  playClickSound: () => {
    const { settings } = get();
    if (settings.soundsEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime((settings.volume / 100) * 0.05, audioCtx.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.04);
      } catch (e) {
        // Safe catch
      }
    }
  },

  focusWindow: (id) => {
    if (!id) {
      set({ activeWindowId: null });
      return;
    }
    get().playClickSound();
    set((state) => {
      const nextZ = state.maxZIndex + 1;
      const updatedWindows = state.windows.map(w => {
        if (w.id === id) {
          return { ...w, zIndex: nextZ, isMinimized: false };
        }
        return w;
      });
      return {
        maxZIndex: nextZ,
        activeWindowId: id,
        windows: updatedWindows
      };
    });
  },

  toggleWindow: (id) => {
    get().playClickSound();
    set((state) => {
      let activeId = state.activeWindowId;
      const updatedWindows = state.windows.map(w => {
        if (w.id === id) {
          const wasOpen = w.isOpen;
          const wasMinimized = w.isMinimized;

          if (!wasOpen) {
            activeId = id;
            return { ...w, isOpen: true, isMinimized: false, zIndex: state.maxZIndex + 1 };
          } else if (wasMinimized) {
            activeId = id;
            return { ...w, isMinimized: false, zIndex: state.maxZIndex + 1 };
          } else if (state.activeWindowId === id) {
            const remaining = state.windows
              .filter(w => w.id !== id && w.isOpen && !w.isMinimized)
              .sort((a, b) => b.zIndex - a.zIndex)[0];
            activeId = remaining?.id || null;
            return { ...w, isMinimized: true };
          } else {
            activeId = id;
            return { ...w, zIndex: state.maxZIndex + 1 };
          }
        }
        return w;
      });

      const maxZ = updatedWindows.some(w => w.id === id && w.isOpen && !w.isMinimized)
        ? state.maxZIndex + 1
        : state.maxZIndex;

      return {
        windows: updatedWindows,
        activeWindowId: activeId,
        maxZIndex: maxZ
      };
    });
  },

  handleCloseWindow: (id) => {
    get().playClickSound();
    set((state) => {
      let updated = state.windows.map(w => w.id === id ? { ...w, isOpen: false } : w);

      const openWindows = updated.filter(w => w.isOpen);
      let nextActiveId: string | null = null;

      if (openWindows.length > 0) {
        let topApp = openWindows
          .filter(w => !w.isMinimized)
          .sort((a, b) => b.zIndex - a.zIndex)[0];

        // If all remaining open windows were minimized, pick the top one and unminimize it so user focuses another app
        if (!topApp) {
          topApp = openWindows.sort((a, b) => b.zIndex - a.zIndex)[0];
          if (topApp) {
            updated = updated.map(w => w.id === topApp.id ? { ...w, isMinimized: false } : w);
          }
        }

        if (topApp) {
          nextActiveId = topApp.id;
        }
      }

      const activeApp = updated.find(w => w.id === state.activeWindowId);
      const isCurrentActiveClosed = !activeApp || !activeApp.isOpen || state.activeWindowId === id;

      return {
        windows: updated,
        activeWindowId: isCurrentActiveClosed ? nextActiveId : state.activeWindowId
      };
    });
  },

  handleMinimizeWindow: (id) => {
    get().playClickSound();
    set((state) => {
      const updated = state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w);
      let nextActiveId = state.activeWindowId;

      if (state.activeWindowId === id) {
        const topUnminimized = updated
          .filter(w => w.isOpen && !w.isMinimized)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        nextActiveId = topUnminimized?.id || null;
      }

      return {
        windows: updated,
        activeWindowId: nextActiveId
      };
    });
  },

  handleMaximizeWindow: (id) => {
    get().playClickSound();
    set((state) => {
      const updated = state.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w);
      return { windows: updated };
    });
  },

  handleMoveWindow: (id, x, y) => {
    set((state) => {
      const updated = state.windows.map(w => w.id === id ? { ...w, x, y } : w);
      return { windows: updated };
    });
  },

  handleResizeWindow: (id, w, h) => {
    set((state) => {
      const updated = state.windows.map(win => win.id === id ? { ...win, w, h } : win);
      return { windows: updated };
    });
  },

  openAppWindow: (id) => {
    set((state) => {
      const manifest = AppRegistry.getAppManifest(id);
      const updated = state.windows.map(w => {
        if (w.id === id) {
          const reqMinW = manifest?.defaultWindow.minW ?? w.minW;
          const reqMinH = manifest?.defaultWindow.minH ?? w.minH;
          const reqW = manifest?.defaultWindow.w ?? w.w;
          const reqH = manifest?.defaultWindow.h ?? w.h;

          const finalMinW = Math.max(w.minW, reqMinW);
          const finalMinH = Math.max(w.minH, reqMinH);
          const finalW = Math.max(w.w, reqW, finalMinW);
          const finalH = Math.max(w.h, reqH, finalMinH);

          return { 
            ...w, 
            isOpen: true, 
            isMinimized: false,
            minW: finalMinW,
            minH: finalMinH,
            w: finalW,
            h: finalH,
          };
        }
        return w;
      });
      return { windows: updated };
    });
    get().focusWindow(id);
    get().clampWindowsToViewport();
  },

  clampWindowsToViewport: () => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    set((state) => {
      const dockD = state.settings.dockSize === 'sm' ? 52 : (state.settings.dockSize === 'lg' ? 92 : 78);
      let changed = false;

      const updated = state.windows.map((w) => {
        if (!w.isOpen || w.isMaximized) return w;

        const manifest = AppRegistry.getAppManifest(w.id);
        const reqMinW = manifest?.defaultWindow.minW ?? w.minW;
        const reqMinH = manifest?.defaultWindow.minH ?? w.minH;

        const effectiveMinW = Math.max(w.minW, reqMinW);
        const effectiveMinH = Math.max(w.minH, reqMinH);

        const maxW = Math.max(effectiveMinW, vw);
        const maxH = Math.max(effectiveMinH, vh - dockD);

        let newW = Math.max(effectiveMinW, Math.min(w.w, maxW));
        let newH = Math.max(effectiveMinH, Math.min(w.h, maxH));

        let newX = Math.max(0, Math.min(w.x, vw - newW));
        let newY = Math.max(0, Math.min(w.y, vh - dockD - newH));

        if (newX !== w.x || newY !== w.y || newW !== w.w || newH !== w.h || effectiveMinW !== w.minW || effectiveMinH !== w.minH) {
          changed = true;
          return { ...w, x: newX, y: newY, w: newW, h: newH, minW: effectiveMinW, minH: effectiveMinH };
        }
        return w;
      });

      return changed ? { windows: updated } : state;
    });
  },

  openTextFileInEditor: (fileId, name, content) => {
    set({
      editorFileId: fileId,
      editorFileName: name,
      editorFileContent: content,
    });
    get().openAppWindow('editor');
  },

  handleSaveTextFile: (fileId, updatedContent) => {
    set((state) => {
      const updatedFiles = state.files.map(f => f.id === fileId ? { ...f, content: updatedContent } : f);
      localStorage.setItem('webos-files', JSON.stringify(updatedFiles));
      return {
        files: updatedFiles,
        editorFileContent: updatedContent
      };
    });
  },

  handleDeleteFile: (deletedItem) => {
    set((state) => {
      const remaining = state.files.filter(f => f.id !== deletedItem.id);
      const updatedTrash = [...state.deletedFiles, deletedItem];
      localStorage.setItem('webos-files', JSON.stringify(remaining));
      localStorage.setItem('webos-trash', JSON.stringify(updatedTrash));
      return {
        files: remaining,
        deletedFiles: updatedTrash
      };
    });
  },

  handleRestoreFile: (file) => {
    get().playClickSound();
    set((state) => {
      const remainingTrash = state.deletedFiles.filter(f => f.id !== file.id);
      const restoredFiles = [...state.files, file];
      localStorage.setItem('webos-files', JSON.stringify(restoredFiles));
      localStorage.setItem('webos-trash', JSON.stringify(remainingTrash));
      return {
        files: restoredFiles,
        deletedFiles: remainingTrash
      };
    });
  },

  handleEmptyTrash: () => {
    get().playClickSound();
    if (confirm('Permanently erase all files inside the Trash? This cannot be undone.')) {
      localStorage.removeItem('webos-trash');
      set({ deletedFiles: [] });
      alert('🗑️ Trash Bin emptied completely!');
    }
  },

  setMessages: (updater) => {
    set((state) => {
      const nextMessages = typeof updater === 'function' ? updater(state.messages) : updater;
      return { messages: nextMessages };
    });
  },

  setFiles: (updater) => {
    set((state) => {
      const nextFiles = typeof updater === 'function' ? updater(state.files) : updater;
      localStorage.setItem('webos-files', JSON.stringify(nextFiles));
      return { files: nextFiles };
    });
  }
}));
