import type { ThemeId } from './theme/themes';
import type { WallpaperId } from './theme/wallpapers';

export interface SystemNotification {
  id: string;
  sender: string;
  text: string;
  time: string;
  type?: 'info' | 'error' | 'warning' | 'success';
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  email: string;
  phone: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  team?: string;
  address?: string;
  website?: string;
  birthday?: string; // YYYY-MM-DD
  notes?: string;
  isFavorite?: boolean;
  labels?: string[];
  organization?: string;
  avatarBg?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  time?: string; // e.g. "10:00 AM" or "All day"
  endTime?: string; // e.g. "11:00 AM"
  category?: 'Personal' | 'Work' | 'Family' | 'Important';
  description?: string;
  location?: string;
  attendees?: Array<{ email: string; name?: string; status?: 'accepted' | 'pending' | 'declined' }>;
  meetingLink?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminder?: string; // e.g. 'none', '5m', '15m', '30m', '1h', '1d'
  timezone?: string;
  color?: string;
}

export interface User {
  username: string;
  fullName: string;
  avatarUrl: string;
  passwordHash: string;
  email?: string;
  recoveryEmail?: string;
  mobile?: string;
}

export interface WorldCity {
  id: string;
  name: string;
  timezone: string;
  desc: string;
  isCurrentLocation?: boolean;
  pillColor?: 'blue' | 'amber' | 'slate';
}

export const DEFAULT_WORLD_CITIES: WorldCity[] = [
  {
    id: 'brisbane',
    name: 'Brisbane',
    timezone: 'Australia/Brisbane',
    desc: '4.5 hours ahead',
    isCurrentLocation: false,
    pillColor: 'amber',
  },
  {
    id: 'newyork',
    name: 'New York',
    timezone: 'America/New_York',
    desc: '9.5 hours behind',
    isCurrentLocation: false,
    pillColor: 'amber',
  },
];

export interface WindowState {
  id: string;
  title: string;
  iconName: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  zIndex: number;
}

export interface SharedPermission {
  user: string;
  role: 'viewer' | 'editor';
  addedAt: string;
}

export interface PublicLinkConfig {
  enabled: boolean;
  code: string;
  role: 'viewer' | 'editor';
  expiresAt?: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parentId: string | null;
  createdAt: string;
  starred?: boolean;
  category?: 'documents' | 'images' | 'audio' | 'video' | 'code' | 'archives' | 'other';
  sharedWith?: SharedPermission[];
  publicLink?: PublicLinkConfig;
  activityHistory?: ActivityLogItem[];
  originalParentId?: string | null;
  /**
   * Size in bytes, as reported by the server. Optional because a file created
   * locally while offline has not been measured yet — anything showing a total
   * must treat a missing size as unknown rather than as zero.
   */
  size?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface SystemSettings {
  /** Ids come from the catalogues in `platform/theme/`, never a loose literal. */
  wallpaper: WallpaperId;
  customWallpaperUrl: string;
  dockSize: 'sm' | 'md' | 'lg';
  theme: ThemeId;
  soundsEnabled: boolean;
  volume: number;
  wifiStatus: 'connected' | 'disconnected';
  fontFamily?: string;
  accentColor?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  desktopIcons?: Record<string, boolean>;
  dockPosition?: 'bottom' | 'left' | 'right';
  dockAutohide?: boolean;
  dockMagnification?: boolean;
  taskbarPosition?: 'top' | 'bottom';
  clockFormat?: '12h' | '24h';
  showBattery?: boolean;
  showWifiInTaskbar?: boolean;
  notificationsEnabled?: boolean;
  dndEnabled?: boolean;
  notificationSound?: string;
  notificationPriority?: 'all' | 'priority' | 'urgent';
  defaultApps?: Record<string, string>;
  zoomLevel?: number;
  fontScaling?: number;
  twoFactorEnabled?: boolean;
  storageLimitGB?: number;
  appPreferences?: Record<string, Record<string, any>>;

  // --- Window and appearance preferences, shared by every application ---
  /** Follows the OS when 'system'; otherwise pins light or dark. */
  themeMode?: 'system' | 'light' | 'dark';
  /** How a window opens: filling the screen, or at a chosen size. */
  defaultWindowMode?: 'maximized' | 'custom';
  defaultWindowWidth?: number;
  defaultWindowHeight?: number;
  defaultWindowPlacement?: 'app-default' | 'center' | 'cascade' | 'custom';
  defaultWindowX?: number;
  defaultWindowY?: number;
  /** Reopen a window where it was last left. */
  rememberWindowGeometry?: boolean;
  /** Confirm before closing a window with unsaved work. */
  confirmOnClose?: boolean;
  /** Window open/close and menu animations. */
  reduceMotion?: boolean;
  /** Focus a window when the pointer moves over it. */
  focusFollowsMouse?: boolean;
  /** Show the menu bar in window title bars. */
  showWindowMenuBar?: boolean;
}
