import React from 'react';
import { create } from 'zustand';
import { WindowState, FileItem, ChatMessage, SystemSettings, User } from './types';
import { AppRegistry } from './core/AppRegistry';
import { StorageService } from './services/StorageService';
import { ApiService } from './services/ApiService';

const defaultFiles: FileItem[] = [
  { id: 'folder-documents', name: 'Documents', type: 'folder', parentId: null, createdAt: '10.07.2023' },
  { id: 'folder-pictures', name: 'Pictures', type: 'folder', parentId: null, createdAt: '10.07.2023' },
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
  login: (username: string, passwordHash: string) => Promise<boolean>;
  signup: (payload: { username: string; firstName: string; lastName: string; passwordHash: string; avatarUrl: string; recoveryEmail?: string; mobile?: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  
  // Actions
  initializeStore: () => void;
  setSettings: (updater: SystemSettings | ((prev: SystemSettings) => SystemSettings)) => void;
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
        username: profile?.username || username,
        fullName: profile?.fullName || apiResult.user?.fullName || username,
        passwordHash, // Keep password hash for local comparison if needed
        avatarUrl: profile?.avatarUrl || '👾',
        email: profile?.email || apiResult.user?.email,
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
      return true;
    }

    return false;
  },

  signup: async ({ username, firstName, lastName, passwordHash, avatarUrl, recoveryEmail, mobile }) => {
    const { usersList, playClickSound } = get();
    playClickSound();
    if (!username.trim() || !firstName.trim() || !lastName.trim() || !passwordHash.trim()) {
      return { success: false, message: 'Username, first name, last name, and password are required.' };
    }
    if (!recoveryEmail?.trim() && !mobile?.trim()) {
      return { success: false, message: 'Provide a recovery email or recovery phone.' };
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // 1. Attempt API Registration
    const apiResult = await ApiService.register({
      username,
      passwordHash,
      firstName,
      lastName,
      recoveryEmail,
      mobile,
    });

    if (apiResult.success) {
      // Register locally in usersList too as a cache
      const newUser: User = { 
        username, 
        fullName, 
        passwordHash, 
        avatarUrl,
        email: recoveryEmail,
        recoveryEmail,
        mobile,
      };
      const updatedUsers = [...usersList.filter(u => u.username.toLowerCase() !== username.toLowerCase()), newUser];
      StorageService.set('webos-users-list', updatedUsers);
      set({ usersList: updatedUsers });
      return { success: true, message: apiResult.message || 'Account created successfully!' };
    }

    // Registration only succeeds when the API confirms the username is unique.
    return { success: false, message: apiResult.message };
  },

  logout: () => {
    const { playClickSound } = get();
    playClickSound();
    StorageService.remove('webos-current-user');
    ApiService.clearToken();
    set({ currentUser: null, isAuthenticated: false });
  },

  initializeStore: () => {
    const savedFiles = StorageService.get<FileItem[] | null>('webos-files', null);
    const savedTrash = StorageService.get<FileItem[] | null>('webos-trash', null);
    const savedSettings = StorageService.get<Partial<SystemSettings> | null>('webos-settings', null);
    const savedCurrentUser = StorageService.get<User | null>('webos-current-user', null);
    const savedUsersList = StorageService.get<User[] | null>('webos-users-list', null);

    const defaultUser: User = {
      username: 'admin',
      fullName: 'Administrator',
      passwordHash: 'admin123',
      avatarUrl: '👾'
    };

    const finalUsersList = savedUsersList && savedUsersList.length > 0 ? savedUsersList : [defaultUser];
    if (!savedUsersList || savedUsersList.length === 0) {
      StorageService.set('webos-users-list', finalUsersList);
    }

    set((state) => {
      const nextSettings = savedSettings ? { ...state.settings, ...savedSettings } : state.settings;
      const nextFiles = savedFiles ? savedFiles : defaultFiles;
      const nextTrash = savedTrash ? savedTrash : [];
      const isAuth = !!savedCurrentUser;

      if (!savedFiles) {
        StorageService.set('webos-files', defaultFiles);
      }

      let finalMessages = state.messages;
      if (savedCurrentUser) {
        finalMessages = [
          {
            id: 'msg-init',
            sender: 'assistant',
            text: `👋 Welcome back, ${savedCurrentUser.fullName}! I am OS Caption, your AI-guided operating system assistant.\n\nI can execute actual desktop commands on your system! Try asking me:\n\n👉 "change wallpaper to sunset"\n👉 "open the terminal"\n👉 "mute volume"\n👉 "open paint"\n\nHow can I automate your system today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ];
      }

      return {
        settings: nextSettings,
        files: nextFiles,
        deletedFiles: nextTrash,
        currentUser: savedCurrentUser,
        usersList: finalUsersList,
        isAuthenticated: isAuth,
        messages: finalMessages,
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
            activeId = null;
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
      const updated = state.windows.map(w => w.id === id ? { ...w, isOpen: false } : w);
      const nextActiveWindow = updated
        .filter(w => w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      return {
        windows: updated,
        activeWindowId: state.activeWindowId === id ? nextActiveWindow?.id || null : state.activeWindowId
      };
    });
  },

  handleMinimizeWindow: (id) => {
    get().playClickSound();
    set((state) => {
      const updated = state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w);
      const nextActiveWindow = updated
        .filter(w => w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      return {
        windows: updated,
        activeWindowId: state.activeWindowId === id ? nextActiveWindow?.id || null : state.activeWindowId
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
      const updated = state.windows.map(w => w.id === id ? { ...w, isOpen: true, isMinimized: false } : w);
      return { windows: updated };
    });
    get().focusWindow(id);
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
