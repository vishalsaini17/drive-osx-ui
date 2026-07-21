export interface User {
  username: string;
  fullName: string;
  avatarUrl: string;
  passwordHash: string;
  email?: string;
  recoveryEmail?: string;
  mobile?: string;
}

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

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parentId: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface SystemSettings {
  wallpaper: 'wave-default' | 'sunset' | 'deep-space' | 'matrix-green' | 'custom';
  customWallpaperUrl: string;
  dockSize: 'sm' | 'md' | 'lg';
  theme: 'modern-dark' | 'classic-light' | 'retro-terminal';
  soundsEnabled: boolean;
  volume: number;
  wifiStatus: 'connected' | 'disconnected';
  fontFamily?: string;
}
