import React from 'react';
import { create } from 'zustand';
import { WindowState, FileItem, ChatMessage, SystemSettings, User, WorldCity, DEFAULT_WORLD_CITIES, CalendarEvent, SystemNotification, FilePickerResult } from '../../platform/types';
import { AppRegistry, AppManifest } from '../../platform/registry/AppRegistry';
import { StorageService } from '../../platform/storage/StorageService';
import { ApiService } from '../../platform/api/ApiService';
import { FileService } from '../../platform/files/FileService';
import { ApiError } from '../../platform/api/http';

/**
 * Turns a file operation failure into a sentence a user can act on.
 *
 * These operations used to fail into `console.warn`, so the UI reported
 * success for writes the server had rejected — the exact behaviour CLAUDE.md
 * §20, §35.15 and §48 forbid. Being offline and being denied need different
 * responses from the user, so they are worded differently.
 */
function describeFileFailure(what: string, error: unknown): string {
  if (error instanceof ApiError && error.isOffline) {
    return `${what}: you are offline. The change was not saved — reconnect and try again.`;
  }
  if (error instanceof ApiError && error.code === 'permission_error') {
    return `${what}: you do not have permission.`;
  }
  if (error instanceof ApiError) {
    return `${what}: ${error.message}`;
  }
  return `${what}. Please try again.`;
}

/**
 * Folds a freshly-fetched folder listing into the existing flat `files`
 * array without discarding what's cached for every OTHER folder.
 *
 * `syncFilesFromBackend` used to do `set({ files: mappedFiles })` — a full
 * replace — even though `FileService.listChildren` only ever returns ONE
 * folder's direct children. Since it was always called with `parentId: null`,
 * that full replace silently wiped out any nested folder contents another
 * part of the app (or this same function, called for a different folder)
 * had loaded, which is why File Explorer could show a file Code Editor had
 * just created and then, moments later, not show it: whichever fetch ran
 * last threw away everyone else's data. Scoping the replace to just the
 * fetched folder's own direct children — drop stale entries claiming that
 * parent, upsert by id everything the fetch returned — makes every fetch
 * additive instead of destructive, and still correctly drops files that were
 * deleted or moved out of the folder since the last fetch.
 */
function mergeFolderChildren(existing: FileItem[], parentId: string | null, fresh: FileItem[]): FileItem[] {
  const freshIds = new Set(fresh.map((f) => f.id));
  const kept = existing.filter((f) => (f.parentId ?? null) !== parentId && !freshIds.has(f.id));
  return [...kept, ...fresh];
}

const defaultNotifications: SystemNotification[] = [
  { id: 'n1', text: 'System optimization complete. Operating in local mode.', sender: 'System Terminal', time: 'Just now', type: 'info' },
  { id: 'n2', text: 'Drive OSX Offline Engine ready. Offline mode enabled.', sender: 'Network Manager', time: '2m ago', type: 'info' },
  { id: 'n3', text: 'Virtual workspace filesystem synchronized locally.', sender: 'Storage Manager', time: '5m ago', type: 'info' }
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
  editorCurrentFolderId: string | null;
  /**
   * Files requested into a brand-new (not reused) editor window, keyed by
   * that window's own unique id — unlike `editorFileId` above, which targets
   * whichever editor window is already open. A window consumes its own entry
   * once, on mount, via `consumePendingEditorWindowFile`.
   */
  pendingEditorWindowFiles: Record<string, { fileId: string; name: string; content: string; folderId: string | null }>;
  /**
   * A File Manager window opened as a picker (`requestFilePick`) reads its own
   * entry once, on mount, via `consumeFilePickerRequest` — keyed by that
   * picker window's own unique id, same pattern as `pendingEditorWindowFiles`.
   */
  pendingFilePickerRequests: Record<string, { mode: 'file' | 'folder'; requesterWindowId: string }>;
  /**
   * What a picker resolved to, keyed by the *requesting* window's id (not the
   * picker's — the picker window is gone by the time this is read). The
   * requester watches its own entry and consumes it via
   * `consumeFilePickerResult`.
   */
  filePickerResults: Record<string, FilePickerResult>;
  /** The folder id File Explorer's window currently reflects in its URL (`/folder/:folderId`), null for `/folder` (root). */
  fileManagerCurrentFolderId: string | null;
  messages: ChatMessage[];
  
  // Auth state & actions
  currentUser: User | null;
  usersList: User[];
  isAuthenticated: boolean;
  isInitializing: boolean;
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

  // System Notifications & Offline Engine
  notifications: SystemNotification[];
  addNotification: (notification: { sender: string; text: string; type?: 'info' | 'error' | 'warning' | 'success'; conversationId?: string }) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  notifyApiError: (appName: string, errorMessage: string) => void;
  isOfflineMode: boolean;
  setOfflineMode: (offline: boolean) => void;

  /**
   * A conversation Messenger should open as soon as it can.
   *
   * Set when a chat notification is clicked. It lives in the shell rather than
   * in Messenger because the click usually happens while Messenger is closed
   * and therefore unmounted — there is no component to tell yet. Messenger
   * claims it on mount.
   */
  pendingConversationId: string | null;
  /** Opens Messenger and asks it to show this conversation. */
  openConversation: (conversationId: string) => void;
  /** Reads and clears the target, so it is acted on exactly once. */
  consumePendingConversation: () => string | null;

  /**
   * A meeting OSX Meet should join as soon as it can.
   *
   * Set when a call is started from Messages (the video/voice call buttons).
   * Without this, opening Meet from there landed on its generic lobby, and
   * the meeting the caller just started had to be found and re-entered by
   * hand — the same "no component to tell yet" problem `pendingConversationId`
   * solves for Messenger.
   */
  pendingMeetingId: string | null;
  /**
   * Whether the pending meeting should join with the camera on.
   *
   * A voice call defaults this to `false` (mic only) so accepting one doesn't
   * unexpectedly turn the camera on; a video call — and anything else that
   * doesn't say — keeps the camera on.
   */
  pendingMeetingVideo: boolean;
  /** Opens Meet and asks it to join this meeting. */
  openMeeting: (meetingId: string, options?: { video?: boolean }) => void;
  /** Reads and clears the target, so it is acted on exactly once. */
  consumePendingMeeting: () => { id: string; video: boolean } | null;

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
  openTextFileInEditor: (fileId: string, name: string, content: string, folderId?: string | null) => void;
  /** Always opens a fresh editor window for this file, never the one already showing something else. Returns that window's id. */
  openTextFileInNewEditorWindow: (fileId: string, name: string, content: string, folderId?: string | null) => string;
  /** Reads and clears one window's pending file request (see `pendingEditorWindowFiles`). */
  consumePendingEditorWindowFile: (windowId: string) => { fileId: string; name: string; content: string; folderId: string | null } | null;
  /** Opens a fresh File Manager window in picker mode for `requesterWindowId`. Returns the picker window's id. */
  requestFilePick: (requesterWindowId: string, mode: 'file' | 'folder') => string;
  /** Reads and clears one picker window's request (see `pendingFilePickerRequests`). */
  consumeFilePickerRequest: (pickerWindowId: string) => { mode: 'file' | 'folder'; requesterWindowId: string } | null;
  /** Delivers a picker's result to the window that requested it, then closes the picker window. */
  resolveFilePicker: (pickerWindowId: string, requesterWindowId: string, result: FilePickerResult) => void;
  /** Reads and clears a picker result waiting for this window (see `filePickerResults`). */
  consumeFilePickerResult: (requesterWindowId: string) => FilePickerResult | null;
  setEditorCurrentFolderId: (folderId: string | null) => void;
  setFileManagerCurrentFolderId: (folderId: string | null) => void;
  resolveDefaultFolderId: (folderName: string) => string | null;
  handleDeleteFile: (deletedItem: FileItem) => Promise<void>;
  handleRestoreFile: (file: FileItem) => Promise<void>;
  handleEmptyTrash: () => Promise<void>;
  /** Fetches one folder's direct children (root, when omitted) and merges them into `files` — every other folder's already-cached contents are left alone. */
  syncFilesFromBackend: (folderId?: string | null) => Promise<void>;
  /** Refreshes the trash from the server, which owns it. */
  syncTrashFromBackend: () => Promise<void>;
  setMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setFiles: (updater: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  playClickSound: () => void;
  /** Opens (or focuses) an app's window. `forceNewWindow` always spawns an additional, independent window instead. Returns the id of the window that ended up open/focused. */
  openAppWindow: (id: string, options?: { forceNewWindow?: boolean }) => string;
  /** Last size and position per app, used when 'remember layout' is on. */
  rememberedGeometry?: Record<string, { x: number; y: number; w: number; h: number }>;
  rememberWindowGeometry: (id: string) => void;
  clampWindowsToViewport: () => void;
}

/**
 * Below this viewport width there is no windowed mode: every app opens, and
 * stays, maximized. Every app's `defaultWindow.minW` is at least 420px
 * (several are 550-740), so a resizable "windowed" state below this
 * breakpoint has no valid width to sit at — the window would always be wider
 * than the screen. CLAUDE.md §44 asks for a mobile-native model rather than
 * the desktop chrome shrunk down; this is the narrow slice of that this
 * change makes true: a phone gets one full-screen app at a time instead of a
 * window clipped by its own minimum width.
 */
const MOBILE_WINDOW_BREAKPOINT = 640;

function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_WINDOW_BREAKPOINT;
}

/**
 * Where a newly created window for `manifest` should land — shared by the
 * "app has no window yet" branch of `openAppWindow` and by its
 * `forceNewWindow` branch, which used to duplicate this placement logic.
 * `geometryKey` is `manifest.id` for an app's one primary window, or the
 * fresh instance id for an extra spawned window (which never has a
 * remembered geometry of its own, so it falls through to computed placement).
 */
function computeNewWindowGeometry(
  state: Pick<SystemState, 'settings' | 'windows' | 'rememberedGeometry'>,
  manifest: AppManifest,
  geometryKey: string
): { x: number; y: number; w: number; h: number } {
  const prefs = state.settings;

  let w = manifest.defaultWindow.w;
  let h = manifest.defaultWindow.h;
  if (prefs.defaultWindowMode === 'custom') {
    if (prefs.defaultWindowWidth) w = Math.max(manifest.defaultWindow.minW, prefs.defaultWindowWidth);
    if (prefs.defaultWindowHeight) h = Math.max(manifest.defaultWindow.minH, prefs.defaultWindowHeight);
  }
  // A per-app default (set from that app's own Preferences) is more specific
  // than the platform-wide custom size above, so it wins over it — same way
  // an app-scoped preference always wins over a global one elsewhere in the
  // platform.
  const appWindowPrefs = prefs.appPreferences?.[manifest.id];
  if (typeof appWindowPrefs?.windowWidth === 'number') w = Math.max(manifest.defaultWindow.minW, appWindowPrefs.windowWidth);
  if (typeof appWindowPrefs?.windowHeight === 'number') h = Math.max(manifest.defaultWindow.minH, appWindowPrefs.windowHeight);

  let x = manifest.defaultWindow.x;
  let y = manifest.defaultWindow.y;
  const placement = prefs.defaultWindowPlacement ?? 'app-default';
  if (placement === 'center') {
    x = Math.max(0, Math.round((window.innerWidth - w) / 2));
    y = Math.max(0, Math.round((window.innerHeight - h - 80) / 2));
  } else if (placement === 'cascade') {
    // Each additional window steps down and to the right.
    const step = state.windows.filter((win) => win.isOpen).length % 8;
    x = 60 + step * 28;
    y = 50 + step * 28;
  } else if (placement === 'custom') {
    x = prefs.defaultWindowX ?? x;
    y = prefs.defaultWindowY ?? y;
  }

  // A remembered geometry wins over the computed placement.
  const remembered = prefs.rememberWindowGeometry ? state.rememberedGeometry?.[geometryKey] : undefined;
  if (remembered) {
    x = remembered.x;
    y = remembered.y;
    w = remembered.w;
    h = remembered.h;
  }

  return { x, y, w, h };
}

export const useSystemStore = create<SystemState>((set, get) => ({
  settings: {
    wallpaper: 'nova-day',
    customWallpaperUrl: '',
    dockSize: 'md',
    theme: 'nova-light',
    soundsEnabled: true,
    volume: 75,
    wifiStatus: 'connected',
    fontFamily: 'Poppins',
    accentColor: '#c81d8f', // Nova magenta — matches the default theme
    iconSize: 'md',
    desktopIcons: { trash: true, files: true, settings: true, terminal: true, paint: true, browser: true, calculator: true, spreadsheet: true, presentation: true, 'pdf-viewer': true, contacts: true },
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
    appId: manifest.id,
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
  editorCurrentFolderId: null,
  pendingEditorWindowFiles: {},
  pendingFilePickerRequests: {},
  filePickerResults: {},
  fileManagerCurrentFolderId: null,
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
  isInitializing: true,

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

      get().syncFilesFromBackend();

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

  notifications: defaultNotifications,
  isOfflineMode: typeof navigator !== 'undefined' ? !navigator.onLine : false,

  setOfflineMode: (offline: boolean) => {
    set({ isOfflineMode: offline });
  },

  pendingConversationId: null,

  openConversation: (conversationId: string) => {
    // Order matters: the target is set before the window opens, so Messenger
    // already has it on its first render rather than flashing the last
    // conversation and then switching.
    set({ pendingConversationId: conversationId });
    get().openAppWindow('messenger');
  },

  consumePendingConversation: () => {
    const pending = get().pendingConversationId;
    if (pending) set({ pendingConversationId: null });
    return pending;
  },

  pendingMeetingId: null,
  pendingMeetingVideo: true,

  openMeeting: (meetingId: string, options) => {
    // Order matters: the target is set before the window opens, so Meet
    // already has it on its first render rather than showing the lobby.
    set({ pendingMeetingId: meetingId, pendingMeetingVideo: options?.video ?? true });
    get().openAppWindow('meeting');
  },

  consumePendingMeeting: () => {
    const pending = get().pendingMeetingId;
    if (!pending) return null;
    const video = get().pendingMeetingVideo;
    set({ pendingMeetingId: null, pendingMeetingVideo: true });
    return { id: pending, video };
  },

  addNotification: (notification) => {
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: notification.sender,
      text: notification.text,
      time: 'Just now',
      type: notification.type || 'info',
      conversationId: notification.conversationId,
    };

    set((state) => {
      const updated = [newNotif, ...state.notifications];
      StorageService.set('webos-notifications', updated);
      return { notifications: updated };
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('system-toast-notification', { detail: newNotif })
      );
    }
  },

  removeNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      StorageService.set('webos-notifications', updated);
      return { notifications: updated };
    });
  },

  clearNotifications: () => {
    StorageService.set('webos-notifications', []);
    set({ notifications: [] });
  },

  notifyApiError: (appName, errorMessage) => {
    const { addNotification } = get();
    addNotification({
      sender: appName,
      text: errorMessage,
      type: 'error',
    });
  },

  initializeStore: () => {
    const savedFiles = StorageService.get<FileItem[] | null>('webos-files', null);
    const savedTrash = StorageService.get<FileItem[] | null>('webos-trash', null);
    const savedSettings = StorageService.get<Partial<SystemSettings> | null>('webos-settings', null);
    const savedCurrentUser = StorageService.get<User | null>('webos-current-user', null);
    const savedUsersList = StorageService.get<User[] | null>('webos-users-list', null);
    const savedWorldCities = StorageService.get<WorldCity[] | null>('webos-world-cities', null);
    const savedEvents = StorageService.get<CalendarEvent[] | null>('webos-calendar-events', null);
    const savedNotifications = StorageService.get<SystemNotification[] | null>('webos-notifications', null);

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
      const nextFiles = cleanedSavedFiles ? cleanedSavedFiles : [];
      const nextTrash = savedTrash ? savedTrash : [];
      const hasAuthToken = !!ApiService.getToken();
      const isAuthenticated = hasAuthToken && !!savedCurrentUser;
      const currentUser = isAuthenticated ? savedCurrentUser : null;

      if (!savedFiles) {
        StorageService.set('webos-files', []);
      }

      const rawWorldCities = savedWorldCities && savedWorldCities.length > 0 ? savedWorldCities : DEFAULT_WORLD_CITIES;
      const nextWorldCities = rawWorldCities.filter(
        (c) => !c.isCurrentLocation && c.desc !== 'Current location' && c.id !== 'delhi'
      );

      const finalMessages: ChatMessage[] = [
        {
          id: 'msg-init',
          sender: 'assistant',
          text: `👋 Welcome back, ${currentUser?.fullName || 'User'}! I am OS Caption, your AI-guided operating system assistant.\n\nI can execute actual desktop commands on your system! Try asking me:\n\n👉 "change wallpaper to sunset"\n👉 "open the terminal"\n👉 "mute volume"\n👉 "open paint"\n\nHow can I automate your system today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ];

      // `windows` is built once, at module load, from each manifest's raw
      // default geometry — before this function has had a chance to load the
      // user's actual settings (per-app/global default size, remembered
      // layout). Every entry is still closed at this point (nothing has
      // rendered yet), so it's safe to recompute all of them now against the
      // settings that just loaded — otherwise a custom default size or a
      // remembered layout would only ever take effect on a brand-new window
      // instance (e.g. "New Window"), never on the one every app starts with.
      const nextWindows = state.windows.map((win) => {
        if (win.isOpen) return win;
        const manifest = AppRegistry.getAppManifest(win.appId);
        if (!manifest) return win;
        const geometry = computeNewWindowGeometry(
          { settings: nextSettings, windows: state.windows, rememberedGeometry: state.rememberedGeometry },
          manifest,
          win.id
        );
        return { ...win, ...geometry, minW: manifest.defaultWindow.minW, minH: manifest.defaultWindow.minH };
      });

      return {
        settings: nextSettings,
        windows: nextWindows,
        files: nextFiles,
        deletedFiles: nextTrash,
        currentUser: currentUser,
        usersList: savedUsersList || [],
        isAuthenticated: isAuthenticated,
        isInitializing: false,
        messages: finalMessages,
        worldCities: nextWorldCities,
        calendarEvents: finalEvents,
        notifications: savedNotifications || defaultNotifications,
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
    // Focusing the window that already has focus is a no-op. Every pointer
    // press inside a window asks for focus, so without this each one replaced
    // the `windows` array — re-rendering every subscriber and playing the
    // click sound again — to arrive at exactly the state it started in.
    const current = get().windows.find((w) => w.id === id);
    if (get().activeWindowId === id && current && !current.isMinimized) return;

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
            // Same rule as openAppWindow: below the mobile breakpoint there
            // is no windowed size to open at, so this (pre-seeded, not
            // freshly computed) window opens maximized too.
            return { ...w, isOpen: true, isMinimized: false, zIndex: state.maxZIndex + 1, isMaximized: w.isMaximized || isNarrowViewport() };
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
    get().clampWindowsToViewport();
  },

  handleCloseWindow: (id) => {
    get().playClickSound();
    if (get().settings.rememberWindowGeometry) get().rememberWindowGeometry(id);
    set((state) => {
      const closing = state.windows.find(w => w.id === id);
      // A window spawned via `openAppWindow(appId, { forceNewWindow: true })`
      // (its `id` differs from its `appId`) is an extra instance, not the
      // app's one preallocated slot — drop it outright on close instead of
      // just hiding it, so repeatedly opening/closing new windows doesn't
      // pile up dead entries in `windows` forever.
      const isSecondaryInstance = !!closing && closing.id !== closing.appId;
      let updated = isSecondaryInstance
        ? state.windows.filter(w => w.id !== id)
        : state.windows.map(w => w.id === id ? { ...w, isOpen: false } : w);

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

      let rest: Partial<SystemState> = {};
      if (isSecondaryInstance) {
        // Drop this instance's leftovers so they don't accumulate across a
        // long session: a remembered geometry entry (keyed by this window's
        // one-off id, never reused), any file it was asked to open but never
        // got around to consuming, and — if this was a File Manager window
        // opened as a picker that's being closed via its own titlebar X
        // rather than Select/Cancel — its unconsumed picker request.
        const { [id]: _removedGeometry, ...restGeometry } = state.rememberedGeometry ?? {};
        const { [id]: _removedPending, ...restPending } = state.pendingEditorWindowFiles;
        const { [id]: _removedPickerRequest, ...restPickerRequests } = state.pendingFilePickerRequests;
        rest = {
          rememberedGeometry: restGeometry,
          pendingEditorWindowFiles: restPending,
          pendingFilePickerRequests: restPickerRequests,
        };
      }

      return {
        windows: updated,
        activeWindowId: isCurrentActiveClosed ? nextActiveId : state.activeWindowId,
        // Closing File Explorer drops which folder it was showing, so the
        // next open (via the desktop icon, dock, etc. — not a /folder/:id
        // link) starts fresh at root instead of silently resuming wherever
        // this session last left off.
        ...(id === 'fileManager' ? { fileManagerCurrentFolderId: null } : null),
        ...rest,
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
    // No windowed mode below the mobile breakpoint (see clampWindowsToViewport)
    // — restoring here would just be re-forced maximized on the next resize,
    // so the toggle is a no-op rather than a flash of an unusable window.
    if (isNarrowViewport()) return;
    set((state) => {
      const updated = state.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w);
      return { windows: updated };
    });
    get().clampWindowsToViewport();
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

  rememberedGeometry: {},

  rememberWindowGeometry: (id) => {
    set((state) => {
      const win = state.windows.find((w) => w.id === id);
      if (!win) return {};
      return {
        rememberedGeometry: {
          ...state.rememberedGeometry,
          [id]: { x: win.x, y: win.y, w: win.w, h: win.h },
        },
      };
    });
  },

  openAppWindow: (id, options) => {
    if (options?.forceNewWindow) {
      const manifest = AppRegistry.getAppManifest(id);
      if (!manifest) return id;
      // Distinct from every app id and from any earlier instance id, so it
      // never collides with the app's own primary window (id === appId) or
      // a sibling instance spawned in this same session.
      const instanceId = `${id}::${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      set((state) => {
        const prefs = state.settings;
        const maximized = prefs.defaultWindowMode === 'maximized' || isNarrowViewport();
        const { x, y, w, h } = computeNewWindowGeometry(state, manifest, instanceId);
        const newWindow: WindowState = {
          id: instanceId,
          appId: id,
          title: manifest.title,
          iconName: manifest.iconName,
          isOpen: true,
          isMinimized: false,
          isMaximized: maximized,
          x, y, w, h,
          minW: manifest.defaultWindow.minW,
          minH: manifest.defaultWindow.minH,
          zIndex: state.maxZIndex + 1,
        };
        return { windows: [...state.windows, newWindow], maxZIndex: state.maxZIndex + 1 };
      });
      get().focusWindow(instanceId);
      get().clampWindowsToViewport();
      return instanceId;
    }

    set((state) => {
      const manifest = AppRegistry.getAppManifest(id);
      const existing = state.windows.find(w => w.id === id);

      if (!existing && manifest) {
        const prefs = state.settings;
        const maximized = prefs.defaultWindowMode === 'maximized' || isNarrowViewport();
        const { x, y, w, h } = computeNewWindowGeometry(state, manifest, manifest.id);

        const newWindow: WindowState = {
          id: manifest.id,
          appId: manifest.id,
          title: manifest.title,
          iconName: manifest.iconName,
          isOpen: true,
          isMinimized: false,
          isMaximized: maximized,
          x,
          y,
          w,
          h,
          minW: manifest.defaultWindow.minW,
          minH: manifest.defaultWindow.minH,
          zIndex: state.maxZIndex + 1,
        };
        return { windows: [...state.windows, newWindow] };
      }

      const updated = state.windows.map(w => {
        if (w.id === id) {
          const reqMinW = manifest?.defaultWindow.minW ?? w.minW;
          const reqMinH = manifest?.defaultWindow.minH ?? w.minH;

          const finalMinW = Math.max(w.minW, reqMinW);
          const finalMinH = Math.max(w.minH, reqMinH);
          // Only ever floors the window at its (possibly just-grown) minimum
          // size — never at the manifest's raw preferred default. That default
          // is for a window's very first geometry (see `computeNewWindowGeometry`)
          // and a per-app/global custom size can legitimately ask for smaller
          // than it; flooring every reopen at the un-customized default here
          // would silently overrule that preference on every single open.
          const finalW = Math.max(w.w, finalMinW);
          const finalH = Math.max(w.h, finalMinH);

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
    return id;
  },

  clampWindowsToViewport: () => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const narrow = isNarrowViewport();

    set((state) => {
      const dockD = state.settings.dockSize === 'sm' ? 52 : (state.settings.dockSize === 'lg' ? 92 : 78);
      let changed = false;

      const updated = state.windows.map((w) => {
        if (!w.isOpen) return w;

        // Below the mobile breakpoint there's no width a "windowed" state
        // could sit at (every minW exceeds it), so every open window is
        // forced maximized instead of floored at a too-wide minimum.
        if (narrow) {
          if (!w.isMaximized) { changed = true; return { ...w, isMaximized: true }; }
          return w;
        }
        if (w.isMaximized) return w;

        const manifest = AppRegistry.getAppManifest(w.appId);
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

  openTextFileInEditor: (fileId, name, content, folderId) => {
    set({
      editorFileId: fileId,
      editorFileName: name,
      editorFileContent: content,
      editorCurrentFolderId: folderId || null,
    });
    get().openAppWindow('editor');
  },

  openTextFileInNewEditorWindow: (fileId, name, content, folderId) => {
    const windowId = get().openAppWindow('editor', { forceNewWindow: true });
    set((state) => ({
      pendingEditorWindowFiles: {
        ...state.pendingEditorWindowFiles,
        [windowId]: { fileId, name, content, folderId: folderId || null },
      },
    }));
    return windowId;
  },

  consumePendingEditorWindowFile: (windowId) => {
    const pending = get().pendingEditorWindowFiles[windowId] ?? null;
    if (pending) {
      set((state) => {
        const { [windowId]: _consumed, ...rest } = state.pendingEditorWindowFiles;
        return { pendingEditorWindowFiles: rest };
      });
    }
    return pending;
  },

  requestFilePick: (requesterWindowId, mode) => {
    const pickerWindowId = get().openAppWindow('fileManager', { forceNewWindow: true });
    set((state) => ({
      pendingFilePickerRequests: { ...state.pendingFilePickerRequests, [pickerWindowId]: { mode, requesterWindowId } },
    }));
    return pickerWindowId;
  },

  consumeFilePickerRequest: (pickerWindowId) => {
    const pending = get().pendingFilePickerRequests[pickerWindowId] ?? null;
    if (pending) {
      set((state) => {
        const { [pickerWindowId]: _consumed, ...rest } = state.pendingFilePickerRequests;
        return { pendingFilePickerRequests: rest };
      });
    }
    return pending;
  },

  resolveFilePicker: (pickerWindowId, requesterWindowId, result) => {
    set((state) => ({
      filePickerResults: { ...state.filePickerResults, [requesterWindowId]: result },
    }));
    get().handleCloseWindow(pickerWindowId);
  },

  consumeFilePickerResult: (requesterWindowId) => {
    const result = get().filePickerResults[requesterWindowId] ?? null;
    if (result) {
      set((state) => {
        const { [requesterWindowId]: _consumed, ...rest } = state.filePickerResults;
        return { filePickerResults: rest };
      });
    }
    return result;
  },

  setEditorCurrentFolderId: (folderId) => {
    set({ editorCurrentFolderId: folderId });
  },

  setFileManagerCurrentFolderId: (folderId) => {
    set((state) => (state.fileManagerCurrentFolderId === folderId ? state : { fileManagerCurrentFolderId: folderId }));
  },

  resolveDefaultFolderId: (folderName: string): string | null => {
    const state = get();
    // Root-scoped on purpose: `files` can now hold nested folders too (see
    // `syncFilesFromBackend`), and a "default folder" like Documents always
    // means the top-level one — a same-named nested folder must not win.
    const folder = state.files.find((f) => f.type === 'folder' && f.parentId === null && f.name.toLowerCase() === folderName.toLowerCase());
    return folder?.id || null;
  },

  handleDeleteFile: async (deletedItem) => {
    const previous = { files: get().files, deletedFiles: get().deletedFiles };

    // Move it locally first so the UI responds immediately, then confirm with
    // the server. The server is the source of truth: if it refuses, the local
    // state is put back rather than left claiming a delete that did not happen.
    set((state) => {
      const remaining = state.files.filter(f => f.id !== deletedItem.id);
      const updatedTrash = [...state.deletedFiles, deletedItem];
      StorageService.set('webos-files', JSON.stringify(remaining));
      StorageService.set('webos-trash', JSON.stringify(updatedTrash));
      return { files: remaining, deletedFiles: updatedTrash };
    });

    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await FileService.deleteFile(deletedItem.id);
    } catch (error) {
      set(previous);
      StorageService.set('webos-files', JSON.stringify(previous.files));
      StorageService.set('webos-trash', JSON.stringify(previous.deletedFiles));
      get().addNotification({
        sender: 'Files',
        text: describeFileFailure(`"${deletedItem.name}" could not be moved to Trash`, error),
        type: 'error',
      });
    }
  },

  handleRestoreFile: async (file) => {
    get().playClickSound();
    const previous = { files: get().files, deletedFiles: get().deletedFiles };

    set((state) => {
      const remainingTrash = state.deletedFiles.filter(f => f.id !== file.id);
      const restoredFiles = [...state.files, file];
      StorageService.set('webos-files', JSON.stringify(restoredFiles));
      StorageService.set('webos-trash', JSON.stringify(remainingTrash));
      return { files: restoredFiles, deletedFiles: remainingTrash };
    });

    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await FileService.restoreFile(file.id);
    } catch (error) {
      // Showing a file as restored when the server still has it in the trash
      // is the failure this rollback prevents: the next sign-in would silently
      // "lose" it again.
      set(previous);
      StorageService.set('webos-files', JSON.stringify(previous.files));
      StorageService.set('webos-trash', JSON.stringify(previous.deletedFiles));
      get().addNotification({
        sender: 'Files',
        text: describeFileFailure(`"${file.name}" could not be restored`, error),
        type: 'error',
      });
    }
  },

  handleEmptyTrash: async () => {
    get().playClickSound();
    if (!confirm('Permanently erase all files inside the Trash? This cannot be undone.')) return;

    const { deletedFiles, currentUser } = get();
    const trashIds = deletedFiles.map(f => f.id);

    if (!currentUser || trashIds.length === 0) {
      StorageService.remove('webos-trash');
      set({ deletedFiles: [] });
      return;
    }

    const results = await Promise.allSettled(
      trashIds.map(id => FileService.permanentDeleteFile(id)),
    );

    // Only the files the server actually erased leave the local trash.
    // Clearing the list wholesale would hide files that are still there.
    const failedIds = new Set(
      results.flatMap((result, index) => (result.status === 'rejected' ? [trashIds[index]] : [])),
    );
    const remaining = deletedFiles.filter(file => failedIds.has(file.id));

    StorageService.set('webos-trash', JSON.stringify(remaining));
    set({ deletedFiles: remaining });

    if (failedIds.size > 0) {
      get().addNotification({
        sender: 'Files',
        text: `${trashIds.length - failedIds.size} of ${trashIds.length} items were erased. ${failedIds.size} could not be deleted and are still in Trash.`,
        type: 'error',
      });
    }
  },

  /**
   * Loads the trash from the server, which owns it.
   *
   * The local list is a cache for offline use, not a second source of truth —
   * previously the two were never reconciled, so the Trash window showed
   * whatever this browser happened to remember.
   */
  syncTrashFromBackend: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      const trashed = await FileService.listDeleted();
      const mapped: FileItem[] = trashed.map((file: any) => ({
        id: file.id ?? file._id,
        name: file.name,
        type: file.type,
        content: file.content || '',
        parentId: file.parentId ?? null,
        createdAt: file.createdAt,
        // Real byte counts, so the reclaimable-space figure means something.
        size: Number(file.size ?? 0),
        category: file.mimeType?.split('/')[0] as any,
      })) as FileItem[];

      StorageService.set('webos-trash', JSON.stringify(mapped));
      set({ deletedFiles: mapped });
    } catch (error) {
      // Keep the cached list and let the Trash window say it may be stale,
      // rather than showing an empty trash that is not empty.
      get().addNotification({
        sender: 'Files',
        text: describeFileFailure('Trash could not be refreshed', error),
        type: 'warning',
      });
    }
  },

  syncFilesFromBackend: async (folderId = null) => {
    const { currentUser } = get();
    if (!currentUser) return;
    try {
      const files = await FileService.listChildren(folderId);
      const mappedFiles: FileItem[] = files.map((f: any) => ({
        id: f._id,
        name: f.name,
        type: f.type,
        content: f.content || '',
        parentId: f.parentId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        size: f.size,
        starred: f.starred || false,
        category: f.mimeType?.split('/')[0] as any,
        originalParentId: null,
        isShared: f.isShared || false,
        effectiveRole: f.effectiveRole,
        isSystem: f.metadata?.system === true,
      }));
      set((state) => {
        const merged = mergeFolderChildren(state.files, folderId, mappedFiles);
        StorageService.set('webos-files', merged);
        return { files: merged };
      });
    } catch (error) {
      // Keep the cached list rather than blanking the file manager, but say
      // that what is on screen may be out of date.
      get().addNotification({
        sender: 'Files',
        text: describeFileFailure('Your files could not be refreshed', error),
        type: 'warning',
      });
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
      StorageService.set('webos-files', JSON.stringify(nextFiles));
      return { files: nextFiles };
    });
  }
}));
