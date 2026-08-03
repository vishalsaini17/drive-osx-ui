import React from 'react';
import {
  Settings as SettingsIcon,
  Send,
  Folder,
  Terminal as TerminalIcon,
  Globe,
  Mail,
  LayoutGrid,
  MessageSquare,
  Clock,
  FileText,
  Palette,
  Calendar as CalendarIcon,
  Video,
  Trash2,
  Calculator as CalculatorIcon,
  FileSpreadsheet,
  Tv,
} from 'lucide-react';

// Import apps from application directory
import {
  AppLauncher,
  WebBrowser,
  Terminal,
  FileManager,
  Settings,
  Messenger,
  ClockApp,
  TextEditor,
  PaintApp,
  TrashApp,
  CalendarApp,
  MeetingApp,
  MailApp,
  CalculatorApp,
  SpreadsheetApp,
  PresentationApp,
  PDFViewerApp,
} from '../applications';

export interface SettingsField {
  id: string;
  label: string;
  type: 'toggle' | 'select' | 'text';
  options?: string[];
  defaultValue: any;
}

export interface AppManifest {
  id: string;
  title: string;
  iconName: string;
  category: 'system' | 'productivity' | 'utilities' | 'entertainment';
  defaultWindow: {
    w: number;
    h: number;
    minW: number;
    minH: number;
    x: number;
    y: number;
  };
  permissions: string[];
  settingsSchema?: SettingsField[];
}

interface AppRegistryEntry {
  manifest: AppManifest;
  component: React.ComponentType<any>;
  renderIcon: (className?: string) => React.ReactNode;
}

const registry: Record<string, AppRegistryEntry> = {
  launcher: {
    manifest: {
      id: 'launcher',
      title: 'Applications',
      iconName: 'LayoutGrid',
      category: 'system',
      defaultWindow: { w: 750, h: 480, minW: 500, minH: 350, x: 200, y: 100 },
      permissions: ['system'],
      settingsSchema: [
        { id: 'viewMode', label: 'Default View Layout', type: 'select', options: ['Grid', 'Compact Grid', 'List View'], defaultValue: 'Grid' },
        { id: 'showCategories', label: 'Group Apps by Category', type: 'toggle', defaultValue: true },
        { id: 'sortBy', label: 'App Sort Order', type: 'select', options: ['Alphabetical', 'Category', 'Recent'], defaultValue: 'Alphabetical' },
        { id: 'focusSearch', label: 'Auto-focus Search on Open', type: 'toggle', defaultValue: true }
      ]
    },
    component: AppLauncher,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-[#1e1e1e] rounded-[22%] flex items-center justify-center relative border border-white/10 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <svg viewBox="0 0 24 24" className="w-[50%] h-[50%] fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l2.5 5.5 6 1-4.5 4.5 1.5 6-5.5-3-5.5 3 1.5-6-4.5-4.5 6-1z" />
        </svg>
      </div>
    )
  },
  browser: {
    manifest: {
      id: 'browser',
      title: 'Web Browser',
      iconName: 'Compass',
      category: 'productivity',
      defaultWindow: { w: 820, h: 540, minW: 600, minH: 400, x: 120, y: 80 },
      permissions: ['network'],
      settingsSchema: [
        { id: 'homepage', label: 'Default Homepage URL', type: 'text', defaultValue: 'https://duckduckgo.com' },
        { id: 'searchEngine', label: 'Primary Search Engine', type: 'select', options: ['DuckDuckGo', 'Google', 'Bing', 'Brave'], defaultValue: 'DuckDuckGo' },
        { id: 'enableCookies', label: 'Enable Session Cookies', type: 'toggle', defaultValue: true },
        { id: 'blockAds', label: 'Ad & Tracker Blocker', type: 'toggle', defaultValue: true },
        { id: 'newTabBehavior', label: 'New Tab Opens', type: 'select', options: ['Homepage', 'Blank Page'], defaultValue: 'Homepage' }
      ]
    },
    component: WebBrowser,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-[22%] flex items-center justify-center relative border border-white/10 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <Globe className="w-[50%] h-[50%] text-white fill-white/10" strokeWidth={2.2} />
      </div>
    )
  },
  terminal: {
    manifest: {
      id: 'terminal',
      title: 'System Terminal',
      iconName: 'Terminal',
      category: 'system',
      defaultWindow: { w: 620, h: 410, minW: 450, minH: 300, x: 80, y: 150 },
      permissions: ['terminal', 'filesystem'],
      settingsSchema: [
        { id: 'shellType', label: 'Default Command Shell', type: 'select', options: ['bash', 'sh', 'zsh'], defaultValue: 'bash' },
        { id: 'fontSize', label: 'Terminal Font Size', type: 'select', options: ['12px', '14px', '16px', '18px'], defaultValue: '12px' },
        { id: 'cursorStyle', label: 'Cursor Blinking Style', type: 'select', options: ['Block', 'Line', 'Underline'], defaultValue: 'Block' },
        { id: 'bellSound', label: 'Audible Bell on Terminal Alert', type: 'toggle', defaultValue: true }
      ]
    },
    component: Terminal,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-[#1a1a1e] rounded-[22%] flex items-center justify-center relative border border-white/10 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <TerminalIcon className="w-[50%] h-[50%] text-emerald-400" strokeWidth={2.2} />
      </div>
    )
  },
  fileManager: {
    manifest: {
      id: 'fileManager',
      title: 'File Explorer',
      iconName: 'Folder',
      category: 'productivity',
      defaultWindow: { w: 720, h: 460, minW: 550, minH: 350, x: 150, y: 120 },
      permissions: ['filesystem'],
      settingsSchema: [
        { id: 'defaultView', label: 'Default File Layout', type: 'select', options: ['Grid', 'List'], defaultValue: 'Grid' },
        { id: 'showHidden', label: 'Show Hidden System Files', type: 'toggle', defaultValue: false },
        { id: 'confirmOnDelete', label: 'Confirm Before Trash Move', type: 'toggle', defaultValue: true },
        { id: 'sortBy', label: 'Default File Sorting', type: 'select', options: ['Name', 'Date Modified', 'Type', 'Size'], defaultValue: 'Name' }
      ]
    },
    component: FileManager,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} flex items-center justify-center relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <svg viewBox="0 0 48 48" className="w-full h-full select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 10C4 7.79086 5.79086 6 8 6H18.5858C19.6467 6 20.6641 6.42143 21.4142 7.17157L24.8284 10.5858C25.5786 11.3359 26.5959 11.7574 27.6569 11.7574H40C42.2091 11.7574 44 13.5665 44 15.7574V38C44 40.2091 42.2091 42 40 42H8C5.79086 42 4 40.2091 4 38V10Z" fill="url(#folder_back_grad_reg)" />
          <rect x="10" y="12" width="28" height="18" rx="2" fill="white" opacity="0.9" />
          <rect x="14" y="16" width="20" height="2" rx="1" fill="#0078d4" opacity="0.5" />
          <rect x="14" y="21" width="14" height="2" rx="1" fill="#0078d4" opacity="0.5" />
          <path d="M4 16C4 13.7909 5.79086 12 8 12H19.5C20.25 12 21 12.4 21.5 13L24.5 16.5C25 17.1 25.75 17.5 26.5 17.5H40C42.2091 17.5 44 19.3091 44 21.5V38C44 40.2091 42.2091 42 40 42H8C5.79086 42 4 40.2091 4 38V16Z" fill="url(#folder_front_grad_reg)" />
          <path d="M8 13H19.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
          <defs>
            <linearGradient id="folder_back_grad_reg" x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="100%" stopColor="#FFA000" />
            </linearGradient>
            <linearGradient id="folder_front_grad_reg" x1="4" y1="12" x2="44" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFCA28" />
              <stop offset="100%" stopColor="#FF8F00" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    )
  },
  settings: {
    manifest: {
      id: 'settings',
      title: 'System Settings',
      iconName: 'Settings',
      category: 'system',
      defaultWindow: { w: 750, h: 480, minW: 600, minH: 350, x: 250, y: 180 },
      permissions: ['system'],
      settingsSchema: [
        { id: 'autoSavePreferences', label: 'Auto-save Preference Changes', type: 'toggle', defaultValue: true },
        { id: 'confirmReset', label: 'Require Confirmation for System Reboot', type: 'toggle', defaultValue: true },
        { id: 'showAdvancedTabs', label: 'Show Advanced Security Tabs', type: 'toggle', defaultValue: true }
      ]
    },
    component: Settings,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-[#515154] rounded-[22%] flex items-center justify-center relative border border-white/10 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <svg viewBox="0 0 24 24" className="w-[50%] h-[50%] fill-none stroke-white stroke-[2.2] group-hover:rotate-45 transition-transform duration-500" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" className="fill-white/10" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </div>
    )
  },
  messenger: {
    manifest: {
      id: 'messenger',
      title: 'Messages & Chat',
      iconName: 'MessageSquare',
      category: 'entertainment',
      defaultWindow: { w: 840, h: 560, minW: 600, minH: 420, x: 200, y: 90 },
      permissions: ['network', 'notifications'],
      settingsSchema: [
        { id: 'compactLayout', label: 'Compact Messages Layout', type: 'toggle', defaultValue: false },
        { id: 'botPersonality', label: 'AI Tone Personality', type: 'select', options: ['Helpful', 'Sassy', 'Geeky', 'Professional'], defaultValue: 'Helpful' },
        { id: 'soundNotifications', label: 'Play Sound on Message Arrival', type: 'toggle', defaultValue: true },
        { id: 'enterToSend', label: 'Press Enter to Send Message', type: 'toggle', defaultValue: true }
      ]
    },
    component: Messenger,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-[#0084ff] rounded-[22%] flex items-center justify-center relative border border-white/10 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <svg viewBox="0 0 24 24" className="w-[52%] h-[52%] fill-none stroke-white stroke-[2.2] -rotate-12 translate-y-[1px] -translate-x-[1px]" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" className="fill-white/10" />
        </svg>
      </div>
    )
  },
  clock: {
    manifest: {
      id: 'clock',
      title: 'System Clock',
      iconName: 'Clock',
      category: 'utilities',
      defaultWindow: { w: 520, h: 600, minW: 500, minH: 570, x: 280, y: 80 },
      permissions: [],
      settingsSchema: [
        { id: 'clockFormat', label: 'Time Format Display', type: 'select', options: ['12-hour (AM/PM)', '24-hour'], defaultValue: '12-hour (AM/PM)' },
        { id: 'showSeconds', label: 'Show Live Seconds Counter', type: 'toggle', defaultValue: true },
        { id: 'defaultTab', label: 'Default Clock Mode', type: 'select', options: ['World Clock', 'Timer', 'Stopwatch', 'Alarm'], defaultValue: 'World Clock' },
        { id: 'alarmSound', label: 'Default Alarm Ringtone', type: 'select', options: ['Chime', 'Beep', 'Digital Wave'], defaultValue: 'Chime' }
      ]
    },
    component: ClockApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-white rounded-[22%] flex items-center justify-center relative border border-zinc-200/60 shadow-md overflow-hidden group p-1`}>
        <div className="w-full h-full rounded-full border border-zinc-200 relative flex items-center justify-center bg-white shadow-inner">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 z-20" />
          <div className="absolute w-[2px] h-[35%] bg-zinc-800 rounded-full origin-bottom top-[18%] left-[calc(50%-1px)] z-10" style={{ transform: 'rotate(25deg)' }} />
          <div className="absolute w-[2px] h-[25%] bg-zinc-800 rounded-full origin-bottom top-[28%] left-[calc(50%-1px)] z-10" style={{ transform: 'rotate(115deg)' }} />
        </div>
      </div>
    )
  },
  editor: {
    manifest: {
      id: 'editor',
      title: 'Text Editor',
      iconName: 'FileText',
      category: 'productivity',
      defaultWindow: { w: 680, h: 460, minW: 450, minH: 300, x: 180, y: 160 },
      permissions: ['filesystem'],
      settingsSchema: [
        { id: 'wordWrap', label: 'Enable Word Wrapping', type: 'toggle', defaultValue: true },
        { id: 'editorTheme', label: 'Syntax & Code Theme', type: 'select', options: ['Classic Light', 'Monokai', 'VS-Dark', 'Solarized'], defaultValue: 'Classic Light' },
        { id: 'tabSize', label: 'Tab Indentation Width', type: 'select', options: ['2 spaces', '4 spaces', 'Tabs'], defaultValue: '2 spaces' },
        { id: 'autoSave', label: 'Auto-save Files on Edit', type: 'toggle', defaultValue: true }
      ]
    },
    component: TextEditor,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-[#ff4f3e] rounded-[22%] flex items-center justify-center relative border border-white/10 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <svg viewBox="0 0 24 24" className="w-[50%] h-[50%] fill-none stroke-white stroke-[2.2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 4 5 5-11 11H4v-5l11-11Z" className="fill-white/10" />
          <path d="m19 2-1 2-2-1 1-2 2 1Z" className="fill-white stroke-none" />
          <circle cx="4.5" cy="19.5" r="1.5" className="fill-white stroke-none" />
          <path d="M11 2h1M3 10h1M20 15h1M15 22h1" strokeWidth="2.5" />
        </svg>
      </div>
    )
  },
  paint: {
    manifest: {
      id: 'paint',
      title: 'Paint Studio',
      iconName: 'Palette',
      category: 'entertainment',
      defaultWindow: { w: 800, h: 520, minW: 650, minH: 450, x: 220, y: 90 },
      permissions: ['filesystem', 'camera'],
      settingsSchema: [
        { id: 'brushSmoothing', label: 'Brush Smoothing Stabilization', type: 'toggle', defaultValue: true },
        { id: 'autoSaveInterval', label: 'Auto-save Drawing Interval', type: 'select', options: ['Disabled', '1 min', '5 min', '10 min'], defaultValue: '5 min' },
        { id: 'defaultCanvasSize', label: 'Default Canvas Dimensions', type: 'select', options: ['800x600', '1024x768', '1280x720'], defaultValue: '800x600' },
        { id: 'gridOverlay', label: 'Show Canvas Grid Overlay', type: 'toggle', defaultValue: false }
      ]
    },
    component: PaintApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-white rounded-[22%] flex items-center justify-center relative border border-zinc-200/50 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <svg viewBox="0 0 24 24" className="w-[54%] h-[54%] fill-none stroke-zinc-800 stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.45262 19 6.01217 18.6655 6.24118 18.116C6.51132 17.4678 7.1511 17 8 17C8.94132 17 9.61794 17.5818 9.84365 18.3905C10.1348 19.4338 11.0827 20.1504 12.1648 20.0152C12.0558 20.669 12 21.3278 12 22Z" fill="#fafafa" stroke="#27272a" strokeWidth="1.8" />
          <circle cx="7.5" cy="10.5" r="1.5" fill="#ef4444" />
          <circle cx="11.5" cy="7" r="1.5" fill="#f59e0b" />
          <circle cx="16" cy="9.5" r="1.5" fill="#10b981" />
          <circle cx="15.5" cy="14" r="1.5" fill="#3b82f6" />
          <path d="M6 18.5 L18 6" stroke="#27272a" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 6 L19.5 4.5 C20 4 20.5 4 21 4.5 C21.5 5 21.5 5.5 21 6 L19.5 7.5 Z" fill="#ef4444" stroke="#27272a" strokeWidth="1" />
        </svg>
      </div>
    )
  },
  calendar: {
    manifest: {
      id: 'calendar',
      title: 'Calendar',
      iconName: 'Calendar',
      category: 'productivity',
      defaultWindow: { w: 860, h: 580, minW: 620, minH: 420, x: 180, y: 70 },
      permissions: [],
      settingsSchema: [
        { id: 'firstDayOfWeek', label: 'First Day of Week', type: 'select', options: ['Sunday', 'Monday'], defaultValue: 'Sunday' },
        { id: 'showWeekNumbers', label: 'Show Week Numbers in Sidebar', type: 'toggle', defaultValue: true },
        { id: 'defaultView', label: 'Default View Mode', type: 'select', options: ['Month', 'Week'], defaultValue: 'Month' }
      ]
    },
    component: CalendarApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-white rounded-[22%] flex flex-col items-center justify-between relative border border-zinc-200/80 shadow-md overflow-hidden group select-none`}>
        <div className="w-full h-[32%] bg-red-500 flex items-center justify-center font-bold text-[9px] text-white tracking-widest uppercase">
          {new Date().toLocaleDateString('en-US', { month: 'short' })}
        </div>
        <div className="w-full flex-1 flex items-center justify-center font-black text-xl text-zinc-800 leading-none pb-1">
          {new Date().getDate()}
        </div>
      </div>
    )
  },
  meeting: {
    manifest: {
      id: 'meeting',
      title: 'OSX Meet',
      iconName: 'Video',
      category: 'productivity',
      defaultWindow: { w: 860, h: 580, minW: 640, minH: 440, x: 190, y: 80 },
      permissions: [],
      settingsSchema: [
        { id: 'hdVideo', label: 'HD Video Resolution', type: 'toggle', defaultValue: true },
        { id: 'noiseCancellation', label: 'AI Noise Cancellation', type: 'toggle', defaultValue: true },
        { id: 'virtualBackground', label: 'Virtual Background Blur', type: 'toggle', defaultValue: false }
      ]
    },
    component: MeetingApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[22%] flex items-center justify-center relative border border-white/20 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <svg viewBox="0 0 24 24" className="w-[55%] h-[55%] fill-none stroke-white stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" />
          <rect x="2" y="6" width="14" height="12" rx="3" />
        </svg>
      </div>
    )
  },
  trash: {
    manifest: {
      id: 'trash',
      title: 'Trash Bin',
      iconName: 'Trash2',
      category: 'system',
      defaultWindow: { w: 600, h: 420, minW: 450, minH: 300, x: 400, y: 220 },
      permissions: ['filesystem'],
      settingsSchema: [
        { id: 'autoEmptyDays', label: 'Automatically Empty Trash', type: 'select', options: ['Never', '7 Days', '30 Days'], defaultValue: 'Never' },
        { id: 'confirmBeforeEmpty', label: 'Confirm Before Permanently Deleting', type: 'toggle', defaultValue: true },
        { id: 'showDeleteWarnings', label: 'Display File Deletion Warnings', type: 'toggle', defaultValue: true }
      ]
    },
    component: TrashApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-[#4b4b4b] rounded-[22%] flex items-center justify-center relative border border-white/10 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <svg viewBox="0 0 24 24" className="w-[50%] h-[50%] fill-none stroke-white stroke-[2.2]" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" className="fill-white/10" />
          <line x1="10" y1="11" x2="10" y2="17" strokeWidth="2" />
          <line x1="14" y1="11" x2="14" y2="17" strokeWidth="2" />
        </svg>
      </div>
    )
  },
  mail: {
    manifest: {
      id: 'mail',
      title: 'Mail Studio',
      iconName: 'Mail',
      category: 'productivity',
      defaultWindow: { w: 920, h: 620, minW: 680, minH: 460, x: 160, y: 60 },
      permissions: ['network', 'notifications'],
      settingsSchema: [
        { id: 'signature', label: 'Default Email Signature', type: 'text', defaultValue: 'Sent from Drive OSX Mail Studio' },
        { id: 'checkInterval', label: 'Auto-sync Check Interval', type: 'select', options: ['Manual', 'Every 5 min', 'Every 15 min', 'Every 30 min'], defaultValue: 'Every 5 min' },
        { id: 'previewLines', label: 'Email Preview Snippet Lines', type: 'select', options: ['1 Line', '2 Lines', '3 Lines'], defaultValue: '2 Lines' }
      ]
    },
    component: MailApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-gradient-to-tr from-rose-500 to-red-600 rounded-[22%] flex items-center justify-center relative border border-white/20 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <Mail className="w-[52%] h-[52%] text-white fill-white/10" strokeWidth={2.2} />
      </div>
    )
  },
  calculator: {
    manifest: {
      id: 'calculator',
      title: 'Calculator',
      iconName: 'CalculatorIcon',
      category: 'utilities',
      defaultWindow: { w: 680, h: 540, minW: 500, minH: 420, x: 220, y: 100 },
      permissions: [],
      settingsSchema: [
        { id: 'defaultMode', label: 'Default Start Mode', type: 'select', options: ['Basic', 'Scientific', 'Programmer', 'Converter'], defaultValue: 'Basic' },
        { id: 'angleUnit', label: 'Scientific Angle Unit', type: 'select', options: ['Degrees (DEG)', 'Radians (RAD)'], defaultValue: 'Degrees (DEG)' },
        { id: 'saveHistory', label: 'Persist Calculation History', type: 'toggle', defaultValue: true }
      ]
    },
    component: CalculatorApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-[22%] flex items-center justify-center relative border border-white/20 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <CalculatorIcon className="w-[52%] h-[52%] text-white" strokeWidth={2.2} />
      </div>
    )
  },
  spreadsheet: {
    manifest: {
      id: 'spreadsheet',
      title: 'Spreadsheet',
      iconName: 'FileSpreadsheet',
      category: 'productivity',
      defaultWindow: { w: 960, h: 640, minW: 700, minH: 480, x: 140, y: 50 },
      permissions: ['filesystem'],
      settingsSchema: [
        { id: 'autoSaveInterval', label: 'Auto-save Interval', type: 'select', options: ['Instant', '1 min', '5 min'], defaultValue: 'Instant' },
        { id: 'showGridlines', label: 'Display Sheet Gridlines', type: 'toggle', defaultValue: true },
        { id: 'defaultGridSize', label: 'Grid Dimensions', type: 'select', options: ['26x50', '50x100', '100x200'], defaultValue: '50x100' }
      ]
    },
    component: SpreadsheetApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-gradient-to-tr from-emerald-600 to-teal-700 rounded-[22%] flex items-center justify-center relative border border-white/20 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <FileSpreadsheet className="w-[52%] h-[52%] text-white" strokeWidth={2.2} />
      </div>
    )
  },
  presentation: {
    manifest: {
      id: 'presentation',
      title: 'Presentation',
      iconName: 'Tv',
      category: 'productivity',
      defaultWindow: { w: 980, h: 650, minW: 720, minH: 500, x: 160, y: 40 },
      permissions: ['filesystem'],
      settingsSchema: [
        { id: 'defaultTransition', label: 'Default Transition', type: 'select', options: ['Slide', 'Fade', 'Zoom', 'None'], defaultValue: 'Slide' },
        { id: 'laserPointerColor', label: 'Laser Pointer Color', type: 'select', options: ['Red', 'Green', 'Blue'], defaultValue: 'Red' },
        { id: 'autoAdvanceTimer', label: 'Timer Auto-Advance', type: 'toggle', defaultValue: false }
      ]
    },
    component: PresentationApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[22%] flex items-center justify-center relative border border-white/20 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <Tv className="w-[52%] h-[52%] text-white" strokeWidth={2.2} />
      </div>
    )
  },
  'pdf-viewer': {
    manifest: {
      id: 'pdf-viewer',
      title: 'PDF Viewer',
      iconName: 'FileText',
      category: 'productivity',
      defaultWindow: { w: 980, h: 660, minW: 720, minH: 500, x: 180, y: 30 },
      permissions: ['filesystem'],
      settingsSchema: [
        { id: 'defaultZoom', label: 'Default Zoom Level', type: 'select', options: ['100%', '125%', 'Fit Width', 'Fit Page'], defaultValue: '100%' },
        { id: 'smoothScrolling', label: 'Smooth Page Scrolling', type: 'toggle', defaultValue: true },
        { id: 'enableAnnotations', label: 'Enable Markups & Notes', type: 'toggle', defaultValue: true }
      ]
    },
    component: PDFViewerApp,
    renderIcon: (className = "w-full h-full") => (
      <div className={`${className} bg-gradient-to-tr from-rose-600 to-red-700 rounded-[22%] flex items-center justify-center relative border border-white/20 shadow-md overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <FileText className="w-[52%] h-[52%] text-white" strokeWidth={2.2} />
      </div>
    )
  }
};

const appRoutes: Record<string, string> = {
  launcher: 'apps',
  browser: 'browser',
  terminal: 'terminal',
  fileManager: 'folder',
  settings: 'settings',
  messenger: 'messenger',
  clock: 'clock',
  editor: 'editor',
  paint: 'paint',
  calendar: 'calendar',
  meeting: 'meeting',
  trash: 'trash',
  mail: 'mail',
  calculator: 'calculator',
  spreadsheet: 'spreadsheet',
  presentation: 'presentation',
  'pdf-viewer': 'pdf-viewer',
};

export const AppRegistry = {
  getAppIds(): string[] {
    return Object.keys(registry);
  },

  getAppManifests(): AppManifest[] {
    return Object.values(registry).map(entry => entry.manifest);
  },

  getAppManifest(id: string): AppManifest | undefined {
    return registry[id]?.manifest;
  },

  getAppComponent(id: string): React.ComponentType<any> | undefined {
    return registry[id]?.component;
  },

  getPathForApp(id: string): string | undefined {
    const route = appRoutes[id];
    return route ? `/${route}` : undefined;
  },

  getAppIdForPath(pathname: string): string | undefined {
    const route = pathname.replace(/^\//, '').replace(/\/$/, '');
    return Object.entries(appRoutes).find(([, value]) => value === route)?.[0];
  },

  getAppIcon(id: string, className?: string): React.ReactNode {
    if (registry[id]) {
      return registry[id].renderIcon(className);
    }
    return (
      <div className={`${className || 'w-full h-full'} bg-zinc-800 text-white rounded-[22%] flex items-center justify-center border border-white/5 shadow-md`}>
        ❓
      </div>
    );
  },

  registerApp(id: string, manifest: AppManifest, component: React.ComponentType<any>, renderIcon: (className?: string) => React.ReactNode): void {
    registry[id] = { manifest, component, renderIcon };
  }
};
