import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  RotateCcw,
  Plus,
  X,
  Server,
  Globe,
  Activity,
  FileText,
  Upload,
  Download,
  Share2,
  LogOut,
  Settings,
  Zap,
  Folder,
  File,
  Wifi,
  HelpCircle,
  Check,
  Code
} from 'lucide-react';
import { useSystemStore } from '../../shell/state/systemStore';
import { THEMES, themesByFamily } from '../../platform/theme/themes';
import { WALLPAPERS, wallpapersByGroup } from '../../platform/theme/wallpapers';
import { AppRegistry } from '../../platform/registry/AppRegistry';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';

export interface LogLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'info';
}

export interface TerminalTab {
  id: string;
  title: string;
  currentPath: string;
  currentFolderId: string | null;
  history: LogLine[];
  commandHistory: string[];
  historyPointer: number;
  inputVal: string;
  envVars: Record<string, string>;
  sshSession: {
    connected: boolean;
    user: string;
    host: string;
    awaitingPassword?: boolean;
    prompt: string;
  } | null;
}

const TERMINAL_THEMES = [
  { id: 'react-dark', name: 'React Slate', bg: 'bg-[#1e2029]', text: 'text-[#e2e8f0]', border: 'border-white/10', prompt: 'text-sky-400', headerBg: 'bg-[#14151c]' },
  { id: 'matrix', name: 'Matrix Green', bg: 'bg-[#0a0f0d]', text: 'text-emerald-400', border: 'border-emerald-500/20', prompt: 'text-emerald-300', headerBg: 'bg-[#0f1713]' },
  { id: 'amber', name: 'Amber Retro', bg: 'bg-[#140e05]', text: 'text-amber-400', border: 'border-amber-500/20', prompt: 'text-amber-300', headerBg: 'bg-[#1f170a]' },
  { id: 'cyan', name: 'Cyberpunk Cyan', bg: 'bg-[#080f1a]', text: 'text-cyan-300', border: 'border-cyan-500/20', prompt: 'text-cyan-200', headerBg: 'bg-[#0f1828]' },
  { id: 'obsidian', name: 'Mac Obsidian', bg: 'bg-[#181825]', text: 'text-slate-100', border: 'border-white/10', prompt: 'text-blue-400', headerBg: 'bg-[#11111b]' },
];

export default function Terminal() {
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const updateAppPreference = useSystemStore((state) => state.updateAppPreference);
  const files = useSystemStore((state) => state.files);
  const setFiles = useSystemStore((state) => state.setFiles);
  const windows = useSystemStore((state) => state.windows);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const handleCloseWindow = useSystemStore((state) => state.handleCloseWindow);
  const openTextFileInEditor = useSystemStore((state) => state.openTextFileInEditor);
  const currentUser = useSystemStore((state) => state.currentUser);
  const logout = useSystemStore((state) => state.logout);

  // Preference state
  const terminalPrefs = settings.appPreferences?.terminal || {};
  const [themeId, setThemeId] = useState<string>(terminalPrefs.theme || 'react-dark');
  const [fontSize, setFontSize] = useState<string>(terminalPrefs.fontSize || '13px');

  // Hidden File Input Ref for upload command
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default initial environment variables
  const defaultEnvVars: Record<string, string> = {
    USER: currentUser?.username || 'admin',
    HOME: `/home/${currentUser?.username || 'admin'}`,
    SHELL: '/bin/zsh',
    PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    TERM: 'xterm-256color',
    OS_NAME: 'DriveOSX',
    OS_VERSION: '1.0.0',
    NODE_ENV: 'development',
    PORT: '3000',
  };

  // Tabs state
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'tab-1',
      title: '~ zsh',
      currentPath: '~',
      currentFolderId: null,
      history: [
        { text: '💻 DriveOSX Terminal v1.0.0 [x86_64-apple-darwin22]', type: 'system' },
        { text: 'Type "help" to view all available File, DriveOSX, and Developer commands.', type: 'info' },
        { text: 'Shortcuts: [Ctrl+T] New Tab | [Ctrl+W] Close Tab | [Ctrl+C] Cancel | [Ctrl+L] Clear | [Tab] Complete', type: 'output' },
        { text: ' ', type: 'output' },
      ],
      commandHistory: [],
      historyPointer: -1,
      inputVal: '',
      envVars: { ...defaultEnvVars },
      sshSession: null,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  const [isMatrixMode, setIsMatrixMode] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTheme = TERMINAL_THEMES.find((t) => t.id === themeId) || TERMINAL_THEMES[0];
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTab?.history, isMatrixMode]);

  // Focus input when tab changes or container clicked
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTabId]);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  // Helper to update active tab state
  const updateActiveTab = (updater: Partial<TerminalTab> | ((prev: TerminalTab) => TerminalTab)) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const updated = typeof updater === 'function' ? updater(tab) : { ...tab, ...updater };
        return updated;
      })
    );
  };

  // Append lines to active tab log
  const appendLogsToActiveTab = (lines: LogLine[]) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          history: [...tab.history, ...lines],
        };
      })
    );
  };

  // Create a new Tab
  const createNewTab = (initialTitle?: string, initialSsh?: any) => {
    const newId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newTabTitle = initialTitle || `~ zsh (${tabs.length + 1})`;
    const newTab: TerminalTab = {
      id: newId,
      title: newTabTitle,
      currentPath: '~',
      currentFolderId: null,
      history: [
        { text: `DriveOSX Terminal Session [${newTabTitle}]`, type: 'system' },
        { text: 'Type "help" for a list of supported commands.', type: 'info' },
        { text: ' ', type: 'output' },
      ],
      commandHistory: [],
      historyPointer: -1,
      inputVal: '',
      envVars: { ...defaultEnvVars },
      sshSession: initialSsh || null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Close Tab
  const closeTab = (tabIdToClose: string) => {
    if (tabs.length <= 1) {
      // Reset single tab
      setTabs([
        {
          id: 'tab-1',
          title: '~ zsh',
          currentPath: '~',
          currentFolderId: null,
          history: [
            { text: 'Terminal session cleared.', type: 'system' },
            { text: 'Type "help" for instructions.', type: 'info' },
          ],
          commandHistory: [],
          historyPointer: -1,
          inputVal: '',
          envVars: { ...defaultEnvVars },
          sshSession: null,
        },
      ]);
      setActiveTabId('tab-1');
      return;
    }

    const nextTabs = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(nextTabs);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  // Matrix key handler
  useEffect(() => {
    if (!isMatrixMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'q') {
        setIsMatrixMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMatrixMode]);

  // Resolve directory items for active directory
  const getItemsInDir = (folderId: string | null) => {
    return files.filter((f) => f.parentId === folderId);
  };

  // App ID resolver for DriveOSX apps
  const resolveAppId = (term: string): { id: string; title: string } | null => {
    const query = term.toLowerCase().trim();
    if (!query) return null;

    const manifests = AppRegistry.getAppManifests();
    const direct = manifests.find((m) => m.id.toLowerCase() === query || m.title.toLowerCase() === query);
    if (direct) return { id: direct.id, title: direct.title };

    const aliasMap: Record<string, string> = {
      term: 'terminal', bash: 'terminal', sh: 'terminal', zsh: 'terminal',
      chrome: 'browser', safari: 'browser', web: 'browser', duckduckgo: 'browser',
      finder: 'fileManager', files: 'fileManager', explorer: 'fileManager', filemanager: 'fileManager',
      prefs: 'settings', config: 'settings', preferences: 'settings',
      chat: 'messenger', messages: 'messenger', gpt: 'messenger',
      timer: 'clock', alarm: 'clock', stopwatch: 'clock',
      notes: 'editor', notepad: 'editor', textedit: 'editor', txt: 'editor',
      draw: 'paint', canvas: 'paint', art: 'paint',
      cal: 'calendar', events: 'calendar', schedule: 'calendar',
      meet: 'meeting', zoom: 'meeting', video: 'meeting', conference: 'meeting',
      bin: 'trash', recycle: 'trash', trashbin: 'trash',
      email: 'mail', outlook: 'mail',
      apps: 'launcher', appstore: 'launcher', directory: 'launcher',
    };

    if (aliasMap[query]) {
      const match = manifests.find((m) => m.id === aliasMap[query]);
      if (match) return { id: match.id, title: match.title };
    }

    const sub = manifests.find((m) => m.id.toLowerCase().includes(query) || m.title.toLowerCase().includes(query));
    if (sub) return { id: sub.id, title: sub.title };

    return null;
  };

  // Interpolate $VAR environment variables
  const interpolateEnv = (input: string, env: Record<string, string>): string => {
    return input.replace(/\$([A-Za-z0-9_]+)/g, (match, key) => {
      return env[key] !== undefined ? env[key] : match;
    });
  };

  // Prompt string computation
  const getPromptString = (tab: TerminalTab) => {
    if (tab.sshSession) {
      if (tab.sshSession.awaitingPassword) {
        return tab.sshSession.prompt;
      }
      return `${tab.sshSession.user}@${tab.sshSession.host}:~$ `;
    }
    const username = currentUser?.username || 'admin';
    const path = tab.currentPath;
    return `${username}@driveosx:${path}$ `;
  };

  // Auto-completion handling
  const handleTabCompletion = () => {
    if (!activeTab) return;
    const val = activeTab.inputVal;
    if (!val.trim()) return;

    const availableCmds = [
      'help', 'ls', 'cd', 'pwd', 'mkdir', 'touch', 'cp', 'mv', 'rm',
      'open', 'apps', 'settings', 'share', 'upload', 'download', 'logout',
      'ssh', 'api', 'curl', 'logs', 'env', 'export', 'unset', 'clear',
      'history', 'cat', 'echo', 'whoami', 'date', 'time', 'calc', 'neofetch',
      'matrix', 'theme', 'cowsay'
    ];

    const parts = val.split(' ');
    if (parts.length === 1) {
      const matches = availableCmds.filter((c) => c.startsWith(parts[0].toLowerCase()));
      if (matches.length === 1) {
        updateActiveTab({ inputVal: matches[0] + ' ' });
      } else if (matches.length > 1) {
        appendLogsToActiveTab([
          { text: `${getPromptString(activeTab)}${val}`, type: 'input' },
          { text: matches.join('   '), type: 'info' },
        ]);
      }
    } else if (parts.length >= 2 && ['cd', 'cat', 'open', 'rm', 'cp', 'mv', 'download'].includes(parts[0].toLowerCase())) {
      const targetStr = parts.slice(1).join(' ').toLowerCase();
      const currentItems = getItemsInDir(activeTab.currentFolderId);
      const itemMatches = currentItems
        .filter((i) => i.name.toLowerCase().startsWith(targetStr))
        .map((i) => i.name);

      if (itemMatches.length === 1) {
        updateActiveTab({ inputVal: `${parts[0]} ${itemMatches[0]}` });
      } else if (itemMatches.length > 1) {
        appendLogsToActiveTab([
          { text: `${getPromptString(activeTab)}${val}`, type: 'input' },
          { text: itemMatches.join('   '), type: 'info' },
        ]);
      }
    }
  };

  // Keyboard navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+C / Cmd+C interrupt
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      const prompt = getPromptString(activeTab);
      appendLogsToActiveTab([
        { text: `${prompt}${activeTab.inputVal}^C`, type: 'input' },
      ]);
      updateActiveTab({ inputVal: '' });
      return;
    }

    // Ctrl+L / Cmd+L clear screen
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      updateActiveTab({ history: [] });
      return;
    }

    // Ctrl+T / Cmd+T new tab
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
      e.preventDefault();
      createNewTab();
      return;
    }

    // Ctrl+W / Cmd+W close tab
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      closeTab(activeTabId);
      return;
    }

    // Tab autocomplete
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
      return;
    }

    // Arrow Up - Command history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const h = activeTab.commandHistory;
      let ptr = activeTab.historyPointer;
      if (h.length > 0) {
        if (ptr === -1) {
          ptr = h.length - 1;
        } else if (ptr > 0) {
          ptr -= 1;
        }
        updateActiveTab({ historyPointer: ptr, inputVal: h[ptr] });
      }
      return;
    }

    // Arrow Down - Command history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const h = activeTab.commandHistory;
      let ptr = activeTab.historyPointer;
      if (ptr !== -1) {
        if (ptr < h.length - 1) {
          ptr += 1;
          updateActiveTab({ historyPointer: ptr, inputVal: h[ptr] });
        } else {
          updateActiveTab({ historyPointer: -1, inputVal: '' });
        }
      }
      return;
    }
  };

  // Upload handler for `upload` command
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        const today = new Date().toLocaleDateString('de-DE');
        const newFileItem = {
          id: `file-upload-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: file.name,
          type: 'file' as const,
          content: content,
          parentId: activeTab.currentFolderId,
          createdAt: today,
        };
        setFiles((prev) => [...prev, newFileItem]);
        appendLogsToActiveTab([
          {
            text: `✔ Successfully uploaded '${file.name}' (${(file.size / 1024).toFixed(1)} KB) into ${activeTab.currentPath}`,
            type: 'success',
          },
        ]);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  // Main Command Processing
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawCmd = activeTab.inputVal;
    const cmd = rawCmd.trim();
    if (!cmd && !activeTab.sshSession?.awaitingPassword) return;

    // Password input state for SSH connection
    if (activeTab.sshSession?.awaitingPassword) {
      const updatedSsh = {
        ...activeTab.sshSession,
        awaitingPassword: false,
        connected: true,
      };
      updateActiveTab({
        sshSession: updatedSsh,
        title: `${updatedSsh.user}@${updatedSsh.host}`,
        inputVal: '',
        history: [
          ...activeTab.history,
          { text: `${activeTab.sshSession.prompt}********`, type: 'input' },
          { text: `Welcome to ${updatedSsh.user}@${updatedSsh.host} (Ubuntu 22.04 LTS x86_64)`, type: 'success' },
          { text: `System load: 0.12, Memory usage: 28%, Swap usage: 0%`, type: 'info' },
          { text: `Last login: ${new Date().toUTCString()} from 192.168.1.1`, type: 'output' },
          { text: 'Type "exit" to disconnect from SSH session.', type: 'info' },
        ],
      });
      return;
    }

    // Interpolate environment variables e.g. echo $USER
    const interpolatedCmd = interpolateEnv(cmd, activeTab.envVars);
    const promptHeader = `${getPromptString(activeTab)}${cmd}`;
    const newHistory = [...activeTab.history, { text: promptHeader, type: 'input' as const }];
    const newCmdHistory = [...activeTab.commandHistory, cmd];

    const parts = interpolatedCmd.split(' ').filter(Boolean);
    const primary = parts[0] ? parts[0].toLowerCase() : '';
    const args = parts.slice(1);

    let output: LogLine[] = [];

    // SSH Mode execution handler
    if (activeTab.sshSession?.connected) {
      switch (primary) {
        case 'exit':
        case 'logout':
        case 'disconnect':
          updateActiveTab({
            sshSession: null,
            title: '~ zsh',
            inputVal: '',
            historyPointer: -1,
            commandHistory: newCmdHistory,
            history: [
              ...newHistory,
              { text: `Connection to ${activeTab.sshSession.host} closed.`, type: 'info' },
            ],
          });
          return;

        case 'uname':
          output = [{ text: `Linux ${activeTab.sshSession.host} 5.15.0-88-generic #98-Ubuntu SMP Mon Oct 2 15:18:56 UTC 2023 x86_64`, type: 'output' }];
          break;

        case 'uptime':
          output = [{ text: `14:22:01 up 42 days, 3:12, 2 users, load average: 0.14, 0.08, 0.05`, type: 'output' }];
          break;

        case 'docker':
          if (args[0] === 'ps') {
            output = [
              { text: 'CONTAINER ID   IMAGE            COMMAND                  CREATED        STATUS        PORTS                  NAMES', type: 'info' },
              { text: 'a1b2c3d4e5f6   nginx:latest     "/docker-entrypoint.…"   2 days ago     Up 2 days     0.0.0.0:80->80/tcp     web-proxy', type: 'success' },
              { text: 'f6e5d4c3b2a1   postgres:15-alp  "docker-entrypoint.s…"   5 days ago     Up 5 days     0.0.0.0:5432->5432/tcp db-master', type: 'success' },
              { text: '9876543210ab   redis:7-alpine   "docker-entrypoint.s…"   10 days ago    Up 10 days    0.0.0.0:6379->6379/tcp cache-redis', type: 'output' },
            ];
          } else {
            output = [{ text: `Usage: docker ps`, type: 'info' }];
          }
          break;

        case 'top':
        case 'htop':
          output = [
            { text: `Tasks: 124 total, 1 running, 123 sleeping, 0 stopped`, type: 'info' },
            { text: `%Cpu(s): 1.8 us, 0.5 sy, 0.0 ni, 97.4 id, 0.2 wa`, type: 'success' },
            { text: `MiB Mem : 8192.0 total, 3240.2 free, 2180.5 used`, type: 'output' },
            { text: `PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND`, type: 'system' },
            { text: ` 102 ${activeTab.sshSession.user}  20   0  892100 120400  42100 S   1.2   1.5   12:40.12 node-server`, type: 'success' },
            { text: ` 105 root      20   0  412300  84200  32100 S   0.5   1.0    4:12.00 nginx`, type: 'output' },
          ];
          break;

        case 'ifconfig':
        case 'ip':
          output = [
            { text: `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`, type: 'info' },
            { text: `      inet 192.168.1.105  netmask 255.255.255.0  broadcast 192.168.1.255`, type: 'output' },
            { text: `      inet6 fe80::a00:27ff:fe4e:66a1  prefixlen 64  scopeid 0x20<link>`, type: 'output' },
          ];
          break;

        case 'clear':
          updateActiveTab({ history: [], inputVal: '', historyPointer: -1, commandHistory: newCmdHistory });
          return;

        default:
          output = [{ text: `bash: ${primary}: command not recognized on remote host. Type "exit" to disconnect.`, type: 'error' }];
          break;
      }

      updateActiveTab({
        history: [...newHistory, ...output],
        inputVal: '',
        historyPointer: -1,
        commandHistory: newCmdHistory,
      });
      return;
    }

    // Local Shell Commands Execution
    switch (primary) {
      // 1. HELP & MANUAL
      case 'help':
      case 'man':
        output = [
          { text: '==================== DRIVEOSX TERMINAL MANUAL ====================', type: 'system' },
          { text: '📂 FILE COMMANDS:', type: 'success' },
          { text: '  ls [-a/-l]          - List files & folders in current directory', type: 'output' },
          { text: '  cd [dir]            - Navigate directory (e.g. "cd Documents", "cd ..", "cd ~")', type: 'output' },
          { text: '  pwd                 - Print absolute working directory path', type: 'output' },
          { text: '  mkdir [folder]      - Create a new directory', type: 'output' },
          { text: '  touch [filename]    - Create a new text file', type: 'output' },
          { text: '  cp [src] [dst]      - Copy file or folder to destination', type: 'output' },
          { text: '  mv [src] [dst]      - Move or rename file or folder', type: 'output' },
          { text: '  rm [-r] [path]      - Remove file or directory', type: 'output' },
          { text: '  cat [filename]      - Print file content in terminal screen', type: 'output' },
          { text: ' ', type: 'output' },
          { text: '🖥️ DRIVEOSX COMMANDS:', type: 'success' },
          { text: '  open [app/file/url] - Open app (browser, paint, settings), file, or web URL', type: 'output' },
          { text: '  apps                - List installed DriveOSX apps & running status', type: 'output' },
          { text: '  settings [key/val]  - View or change system settings (theme, wallpaper, wifi)', type: 'output' },
          { text: '  share [file/link]   - Generate share link for a file or document', type: 'output' },
          { text: '  upload              - Upload local file into DriveOSX filesystem', type: 'output' },
          { text: '  download [file]     - Download virtual file to your computer', type: 'output' },
          { text: '  logout              - Log out current DriveOSX session', type: 'output' },
          { text: ' ', type: 'output' },
          { text: '🛠️ DEVELOPER FEATURES:', type: 'success' },
          { text: '  ssh [user@host]     - Connect to remote server via SSH (uname, docker, top)', type: 'output' },
          { text: '  api / curl [url]    - Execute HTTP API requests (GET/POST) with live JSON format', type: 'output' },
          { text: '  logs [-f]           - Inspect or watch DriveOSX system event logs', type: 'output' },
          { text: '  env                 - List active environment variables', type: 'output' },
          { text: '  export KEY=VAL      - Set or update environment variable', type: 'output' },
          { text: '  unset KEY           - Delete environment variable', type: 'output' },
          { text: ' ', type: 'output' },
          { text: '💡 SHORTCUTS & TABS:', type: 'success' },
          { text: '  Ctrl+T              - Open new terminal tab', type: 'output' },
          { text: '  Ctrl+W              - Close current tab', type: 'output' },
          { text: '  Ctrl+C              - Interrupt current input line', type: 'output' },
          { text: '  Ctrl+L / clear      - Clear terminal screen output', type: 'output' },
          { text: '  Tab                 - Auto-complete command or filename', type: 'output' },
          { text: '  Up / Down           - Cycle command history', type: 'output' },
        ];
        break;

      // 2. FILE COMMANDS: ls, cd, pwd, mkdir, touch, cp, mv, rm
      case 'pwd':
        output = [
          {
            text: `/home/${currentUser?.username || 'admin'}${activeTab.currentPath === '~' ? '' : activeTab.currentPath.replace('~', '')}`,
            type: 'output',
          },
        ];
        break;

      case 'ls': {
        const isLong = args.includes('-l');
        const currentItems = getItemsInDir(activeTab.currentFolderId);

        if (currentItems.length === 0) {
          output = [{ text: '(directory is empty)', type: 'info' }];
        } else {
          output = [
            { text: `Contents of ${activeTab.currentPath}:`, type: 'info' },
            ...currentItems.map((item) => {
              if (item.type === 'folder') {
                return {
                  text: isLong
                    ? `drwxr-xr-x   1 ${currentUser?.username || 'admin'}   staff   4096 ${item.createdAt}   📁 ${item.name}/`
                    : `📁 ${item.name}/`,
                  type: 'success' as const,
                };
              }
              const len = item.content ? item.content.length : 0;
              return {
                text: isLong
                  ? `-rw-r--r--   1 ${currentUser?.username || 'admin'}   staff   ${len.toString().padStart(5, ' ')} B ${item.createdAt}   📄 ${item.name}`
                  : `📄 ${item.name}`,
                type: 'output' as const,
              };
            }),
          ];
        }
        break;
      }

      case 'cd': {
        const targetDir = args[0] ? args[0].trim() : '~';
        if (targetDir === '~' || targetDir === '/' || targetDir === '') {
          updateActiveTab({ currentPath: '~', currentFolderId: null });
          output = [{ text: 'Switched directory to ~', type: 'info' }];
        } else if (targetDir === '..') {
          if (activeTab.currentFolderId === null) {
            output = [{ text: 'Already at root (~)', type: 'info' }];
          } else {
            const currentObj = files.find((f) => f.id === activeTab.currentFolderId);
            if (currentObj && currentObj.parentId) {
              const parentObj = files.find((f) => f.id === currentObj.parentId);
              updateActiveTab({
                currentFolderId: currentObj.parentId,
                currentPath: `~/${parentObj?.name || ''}`,
              });
            } else {
              updateActiveTab({ currentFolderId: null, currentPath: '~' });
            }
            output = [{ text: 'Switched directory up', type: 'info' }];
          }
        } else {
          const cleanName = targetDir.replace(/\/$/, '');
          const matchFolder = files.find(
            (f) =>
              f.parentId === activeTab.currentFolderId &&
              f.type === 'folder' &&
              f.name.toLowerCase() === cleanName.toLowerCase()
          );

          if (matchFolder) {
            const newP = activeTab.currentPath === '~' ? `~/${matchFolder.name}` : `${activeTab.currentPath}/${matchFolder.name}`;
            updateActiveTab({ currentFolderId: matchFolder.id, currentPath: newP });
            output = [{ text: `Entered folder ${matchFolder.name}/`, type: 'info' }];
          } else {
            const topMatch = files.find(
              (f) => f.parentId === null && f.type === 'folder' && f.name.toLowerCase() === cleanName.toLowerCase()
            );
            if (topMatch) {
              updateActiveTab({ currentFolderId: topMatch.id, currentPath: `~/${topMatch.name}` });
              output = [{ text: `Entered folder ~/${topMatch.name}/`, type: 'info' }];
            } else {
              output = [{ text: `cd: no such directory: ${targetDir}`, type: 'error' }];
            }
          }
        }
        break;
      }

      case 'mkdir': {
        const name = args.join(' ').trim();
        if (!name) {
          output = [{ text: 'Error: Specify folder name. Usage: "mkdir <foldername>"', type: 'error' }];
        } else {
          const exists = files.some(
            (f) => f.parentId === activeTab.currentFolderId && f.name.toLowerCase() === name.toLowerCase()
          );
          if (exists) {
            output = [{ text: `mkdir: cannot create directory '${name}': File or folder exists`, type: 'error' }];
          } else {
            const today = new Date().toLocaleDateString('de-DE');
            const newFolderItem = {
              id: `folder-${Date.now()}`,
              name,
              type: 'folder' as const,
              parentId: activeTab.currentFolderId,
              createdAt: today,
            };
            setFiles((prev) => [...prev, newFolderItem]);
            output = [{ text: `✔ Created directory: ${name}/`, type: 'success' }];
          }
        }
        break;
      }

      case 'touch': {
        const name = args.join(' ').trim();
        if (!name) {
          output = [{ text: 'Error: Specify file name. Usage: "touch <filename>"', type: 'error' }];
        } else {
          const exists = files.some(
            (f) => f.parentId === activeTab.currentFolderId && f.name.toLowerCase() === name.toLowerCase()
          );
          if (exists) {
            output = [{ text: `Updated timestamp for ${name}`, type: 'info' }];
          } else {
            const today = new Date().toLocaleDateString('de-DE');
            const newFileItem = {
              id: `file-${Date.now()}`,
              name,
              type: 'file' as const,
              content: '',
              parentId: activeTab.currentFolderId,
              createdAt: today,
            };
            setFiles((prev) => [...prev, newFileItem]);
            output = [{ text: `✔ Created empty file: ${name}`, type: 'success' }];
          }
        }
        break;
      }

      case 'cp': {
        if (args.length < 2) {
          output = [{ text: 'Error: Usage: cp <source> <destination>', type: 'error' }];
        } else {
          const srcName = args[0];
          const dstName = args[1];
          const srcItem =
            files.find(
              (f) => f.parentId === activeTab.currentFolderId && f.name.toLowerCase() === srcName.toLowerCase()
            ) || files.find((f) => f.name.toLowerCase() === srcName.toLowerCase());

          if (!srcItem) {
            output = [{ text: `cp: cannot stat '${srcName}': No such file or directory`, type: 'error' }];
          } else {
            const today = new Date().toLocaleDateString('de-DE');
            const newItem = {
              id: `${srcItem.type}-${Date.now()}`,
              name: dstName,
              type: srcItem.type,
              content: srcItem.content,
              parentId: activeTab.currentFolderId,
              createdAt: today,
            };
            setFiles((prev) => [...prev, newItem]);
            output = [{ text: `✔ Copied '${srcItem.name}' to '${dstName}'`, type: 'success' }];
          }
        }
        break;
      }

      case 'mv': {
        if (args.length < 2) {
          output = [{ text: 'Error: Usage: mv <source> <destination>', type: 'error' }];
        } else {
          const srcName = args[0];
          const dstName = args[1];
          const srcItem =
            files.find(
              (f) => f.parentId === activeTab.currentFolderId && f.name.toLowerCase() === srcName.toLowerCase()
            ) || files.find((f) => f.name.toLowerCase() === srcName.toLowerCase());

          if (!srcItem) {
            output = [{ text: `mv: cannot stat '${srcName}': No such file or directory`, type: 'error' }];
          } else {
            const targetFolder = files.find(
              (f) =>
                f.parentId === activeTab.currentFolderId &&
                f.type === 'folder' &&
                f.name.toLowerCase() === dstName.toLowerCase()
            );
            if (targetFolder) {
              setFiles((prev) => prev.map((f) => (f.id === srcItem.id ? { ...f, parentId: targetFolder.id } : f)));
              output = [{ text: `✔ Moved '${srcItem.name}' into folder '${targetFolder.name}/'`, type: 'success' }];
            } else {
              setFiles((prev) => prev.map((f) => (f.id === srcItem.id ? { ...f, name: dstName } : f)));
              output = [{ text: `✔ Renamed '${srcItem.name}' to '${dstName}'`, type: 'success' }];
            }
          }
        }
        break;
      }

      case 'rm': {
        const isRecursive = args[0] === '-r' || args[0] === '-rf';
        const targetName = isRecursive ? args.slice(1).join(' ').trim() : args.join(' ').trim();

        if (!targetName) {
          output = [{ text: 'Error: Usage: rm [-r] <filename/foldername>', type: 'error' }];
        } else {
          const item =
            files.find(
              (f) => f.parentId === activeTab.currentFolderId && f.name.toLowerCase() === targetName.toLowerCase()
            ) || files.find((f) => f.name.toLowerCase() === targetName.toLowerCase());

          if (item) {
            if (item.type === 'folder' && !isRecursive) {
              output = [{ text: `rm: cannot remove '${item.name}': Is a directory. Use "rm -r ${item.name}"`, type: 'error' }];
            } else {
              const idsToDelete = new Set<string>([item.id]);
              if (item.type === 'folder') {
                const collectChildren = (parentId: string) => {
                  files.filter((f) => f.parentId === parentId).forEach((child) => {
                    idsToDelete.add(child.id);
                    if (child.type === 'folder') collectChildren(child.id);
                  });
                };
                collectChildren(item.id);
              }
              setFiles((prev) => prev.filter((f) => !idsToDelete.has(f.id)));
              output = [{ text: `✔ Removed ${item.type} '${item.name}'`, type: 'success' }];
            }
          } else {
            output = [{ text: `rm: cannot remove '${targetName}': No such file or directory`, type: 'error' }];
          }
        }
        break;
      }

      case 'cat': {
        const filename = args.join(' ');
        if (!filename) {
          output = [{ text: 'Error: Usage: cat <filename>', type: 'error' }];
        } else {
          const matchFile =
            files.find(
              (f) => f.parentId === activeTab.currentFolderId && f.type === 'file' && f.name.toLowerCase() === filename.toLowerCase()
            ) || files.find((f) => f.type === 'file' && f.name.toLowerCase() === filename.toLowerCase());

          if (matchFile) {
            output = [
              { text: `=== Content of ${matchFile.name} ===`, type: 'success' },
              { text: matchFile.content || '(empty file)', type: 'output' },
            ];
          } else {
            output = [{ text: `cat: ${filename}: No such file in current directory. Use "ls" to list files.`, type: 'error' }];
          }
        }
        break;
      }

      case 'echo': {
        const fullArg = args.join(' ');
        if (fullArg.includes(' > ')) {
          const [textPart, filePart] = fullArg.split(' > ');
          const cleanText = textPart.replace(/^["']|["']$/g, '');
          const cleanFile = filePart.trim();
          if (cleanFile) {
            const existing = files.find(
              (f) => f.parentId === activeTab.currentFolderId && f.name.toLowerCase() === cleanFile.toLowerCase()
            );
            if (existing) {
              setFiles((prev) => prev.map((f) => (f.id === existing.id ? { ...f, content: cleanText } : f)));
            } else {
              const today = new Date().toLocaleDateString('de-DE');
              setFiles((prev) => [
                ...prev,
                {
                  id: `file-${Date.now()}`,
                  name: cleanFile,
                  type: 'file',
                  content: cleanText,
                  parentId: activeTab.currentFolderId,
                  createdAt: today,
                },
              ]);
            }
            output = [{ text: `✔ Wrote text to ${cleanFile}`, type: 'success' }];
          }
        } else {
          const textOut = fullArg.replace(/^["']|["']$/g, '');
          output = [{ text: textOut || '', type: 'output' }];
        }
        break;
      }

      // 3. DRIVEOSX COMMANDS: open, apps, settings, share, upload, download, logout
      case 'open': {
        const target = args.join(' ').trim();
        if (!target) {
          output = [{ text: 'Error: Specify app, file, or URL. Try "open browser", "open paint", "open readme.txt"', type: 'error' }];
        } else {
          const matchFile =
            files.find(
              (f) => f.parentId === activeTab.currentFolderId && f.type === 'file' && f.name.toLowerCase() === target.toLowerCase()
            ) || files.find((f) => f.type === 'file' && f.name.toLowerCase() === target.toLowerCase());

          if (matchFile) {
            openTextFileInEditor(matchFile.id, matchFile.name, matchFile.content || '');
            output = [{ text: `✔ Opened '${matchFile.name}' in Text Editor.`, type: 'success' }];
          } else {
            const resolved = resolveAppId(target);
            if (resolved) {
              openAppWindow(resolved.id);
              output = [{ text: `✔ Launched application: ${resolved.title} (${resolved.id})`, type: 'success' }];
            } else if (target.startsWith('http://') || target.startsWith('https://')) {
              openAppWindow('browser');
              output = [{ text: `✔ Opening ${target} in Web Browser`, type: 'success' }];
            } else {
              output = [{ text: `Error: App or file '${target}' not found. Type "apps" for installed apps.`, type: 'error' }];
            }
          }
        }
        break;
      }

      case 'apps': {
        const manifests = AppRegistry.getAppManifests();
        output = [
          { text: '================ INSTALLED DRIVEOSX APPLICATIONS ================', type: 'system' },
          { text: 'APP_ID          TITLE                STATUS       COMMAND ALIAS', type: 'info' },
          ...manifests.map((m) => {
            const isOpen = windows.some((w) => w.id === m.id && w.isOpen);
            const status = isOpen ? '[RUNNING]' : '[CLOSED] ';
            const padId = m.id.padEnd(15, ' ');
            const padTitle = m.title.padEnd(20, ' ');
            return {
              text: `${padId} ${padTitle} ${status}   open ${m.id}`,
              type: isOpen ? ('success' as const) : ('output' as const),
            };
          }),
        ];
        break;
      }

      case 'settings': {
        const sub = args[0]?.toLowerCase();
        const val = args[1]?.toLowerCase();

        if (sub === 'theme') {
          // Read from the catalogue, so a new theme is usable here the moment
          // it is added rather than needing this list updated too.
          const matched = THEMES.find((t) => t.id === val);
          if (matched) {
            setSettings((prev) => ({ ...prev, theme: matched.id }));
            output = [{ text: `✔ Updated system theme to '${matched.id}'`, type: 'success' }];
          } else {
            output = [
              { text: `Current System Theme: ${settings.theme}`, type: 'info' },
              { text: 'Usage: settings theme <name>', type: 'output' },
              ...themesByFamily().map(({ label, themes }) => ({
                text: `  ${label.padEnd(9)} ${themes.map((t) => t.id).join(', ')}`,
                type: 'output' as const,
              })),
            ];
          }
        } else if (sub === 'wallpaper') {
          const matched = WALLPAPERS.find((w) => w.id === val);
          if (matched || val === 'custom') {
            const id = matched ? matched.id : ('custom' as const);
            setSettings((prev) => ({ ...prev, wallpaper: id }));
            output = [{ text: `✔ Updated wallpaper preset to '${id}'`, type: 'success' }];
          } else {
            output = [
              { text: `Current Wallpaper: ${settings.wallpaper}`, type: 'info' },
              { text: 'Usage: settings wallpaper <name>', type: 'output' },
              ...wallpapersByGroup().map(({ label, wallpapers }) => ({
                text: `  ${label.padEnd(10)} ${wallpapers.map((w) => w.id).join(', ')}`,
                type: 'output' as const,
              })),
            ];
          }
        } else if (sub === 'wifi') {
          if (val === 'on' || val === 'connected') {
            setSettings((prev) => ({ ...prev, wifiStatus: 'connected' }));
            output = [{ text: '✔ Wi-Fi adapter enabled and connected.', type: 'success' }];
          } else if (val === 'off' || val === 'disconnected') {
            setSettings((prev) => ({ ...prev, wifiStatus: 'disconnected' }));
            output = [{ text: 'Wi-Fi adapter disconnected.', type: 'info' }];
          } else {
            output = [{ text: `Wi-Fi Status: ${settings.wifiStatus}. Usage: settings wifi on/off`, type: 'info' }];
          }
        } else {
          output = [
            { text: '================ DRIVEOSX SYSTEM SETTINGS ================', type: 'system' },
            { text: `Theme: ${settings.theme}`, type: 'output' },
            { text: `Wallpaper: ${settings.wallpaper}`, type: 'output' },
            { text: `Dock Size: ${settings.dockSize}`, type: 'output' },
            { text: `Wi-Fi Status: ${settings.wifiStatus}`, type: 'output' },
            { text: `Sounds: ${settings.soundsEnabled ? 'Enabled' : 'Muted'}`, type: 'output' },
            { text: ' ', type: 'output' },
            { text: 'Commands: "settings theme <name>", "settings wallpaper <name>", "settings wifi on/off"', type: 'info' },
          ];
        }
        break;
      }

      case 'share': {
        const target = args.join(' ').trim();
        const file = target ? files.find((f) => f.name.toLowerCase() === target.toLowerCase()) : null;
        const shareId = file ? file.id : `driveosx-share-${Math.random().toString(36).substring(2, 8)}`;
        const shareUrl = `https://driveosx.app/share/${shareId}`;

        try {
          await navigator.clipboard.writeText(shareUrl);
          output = [
            { text: `✔ Generated DriveOSX share URL for ${file ? `'${file.name}'` : 'current workspace'}:`, type: 'success' },
            { text: shareUrl, type: 'info' },
            { text: '(Copied link to system clipboard!)', type: 'system' },
          ];
        } catch (err) {
          output = [
            { text: `✔ Generated share URL for ${file ? `'${file.name}'` : 'current workspace'}:`, type: 'success' },
            { text: shareUrl, type: 'info' },
          ];
        }
        break;
      }

      case 'upload': {
        output = [{ text: 'Opening local file picker dialog to upload file...', type: 'info' }];
        fileInputRef.current?.click();
        break;
      }

      case 'download': {
        const filename = args.join(' ').trim();
        if (!filename) {
          output = [{ text: 'Error: Usage: download <filename>', type: 'error' }];
        } else {
          const matchFile =
            files.find(
              (f) => f.parentId === activeTab.currentFolderId && f.type === 'file' && f.name.toLowerCase() === filename.toLowerCase()
            ) || files.find((f) => f.type === 'file' && f.name.toLowerCase() === filename.toLowerCase());

          if (matchFile && matchFile.type === 'file') {
            const blob = new Blob([matchFile.content || ''], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = matchFile.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            output = [{ text: `✔ Started download for '${matchFile.name}'`, type: 'success' }];
          } else {
            output = [{ text: `download: file '${filename}' not found in current directory. Use "ls" to list files.`, type: 'error' }];
          }
        }
        break;
      }

      case 'logout': {
        output = [{ text: 'Logging out current DriveOSX session...', type: 'system' }];
        setTimeout(() => {
          logout();
        }, 500);
        break;
      }

      // 4. DEVELOPER FEATURES: SSH, API Requests, Logs, Environment Variables
      case 'ssh': {
        const target = args[0] || 'ubuntu@cloud-server-01';
        const parts = target.split('@');
        const user = parts.length > 1 ? parts[0] : 'ubuntu';
        const host = parts.length > 1 ? parts[1] : parts[0];

        const sshState = {
          connected: false,
          user,
          host,
          awaitingPassword: true,
          prompt: `${user}@${host}'s password: `,
        };

        updateActiveTab({ sshSession: sshState });
        output = [
          { text: `Connecting to ${user}@${host} via SSH port 22...`, type: 'info' },
          { text: `ECDSA key fingerprint is SHA256:8f43b1a9c3d4e5f6...`, type: 'info' },
        ];
        break;
      }

      case 'curl':
      case 'api': {
        let method = 'GET';
        let url = '';
        let requestData: any = null;

        if (primary === 'curl') {
          url = args[0] || '';
        } else {
          if (['GET', 'POST', 'PUT', 'DELETE'].includes(args[0]?.toUpperCase())) {
            method = args[0].toUpperCase();
            url = args[1] || '';
            if (args[2]) {
              try {
                requestData = JSON.parse(args.slice(2).join(' '));
              } catch (e) {
                requestData = args.slice(2).join(' ');
              }
            }
          } else {
            url = args[0] || '';
          }
        }

        if (!url) {
          output = [
            { text: 'Usage: api [GET|POST|PUT|DELETE] <url> [json_body]', type: 'error' },
            { text: 'Example: api GET https://jsonplaceholder.typicode.com/todos/1', type: 'info' },
            { text: 'Example: curl https://api.github.com/zen', type: 'info' },
          ];
        } else {
          if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
          }

          const startTime = performance.now();
          try {
            const res = await fetch(url, {
              method,
              headers: requestData ? { 'Content-Type': 'application/json' } : undefined,
              body: requestData ? JSON.stringify(requestData) : undefined,
            });
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            let bodyText = '';
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const json = await res.json();
              bodyText = JSON.stringify(json, null, 2);
            } else {
              bodyText = await res.text();
            }

            output = [
              { text: `HTTP/1.1 ${res.status} ${res.statusText || 'OK'} (${duration}ms)`, type: res.ok ? 'success' : 'error' },
              { text: `Content-Type: ${contentType}`, type: 'info' },
              { text: '---------------- Response Body ----------------', type: 'system' },
              { text: bodyText.slice(0, 1500) + (bodyText.length > 1500 ? '\n... (truncated output)' : ''), type: res.ok ? 'output' : 'error' },
            ];
          } catch (err: any) {
            output = [
              { text: `API Request Error: ${err.message || 'Failed to fetch / CORS restricted'}`, type: 'error' },
              { text: `Target URL: ${url}`, type: 'info' },
            ];
          }
        }
        break;
      }

      case 'logs': {
        const flag = args[0]?.toLowerCase();
        if (flag === '--clear' || flag === '-c') {
          output = [{ text: 'System logs buffer cleared.', type: 'info' }];
        } else if (flag === '-f' || flag === 'watch' || flag === 'follow') {
          output = [
            { text: '=== REAL-TIME SYSTEM LOG WATCH (-f) ===', type: 'system' },
            { text: `[${new Date().toLocaleTimeString()}] [kernel] init_process: pid=1024, user=${currentUser?.username || 'admin'}`, type: 'output' },
            { text: `[${new Date().toLocaleTimeString()}] [systemStore] sync_files: ${files.length} active virtual items`, type: 'info' },
            { text: `[${new Date().toLocaleTimeString()}] [network] websocket_bridge: connected to 127.0.0.1:3000`, type: 'success' },
            { text: `[${new Date().toLocaleTimeString()}] [auth] session_token: valid, active session`, type: 'output' },
          ];
        } else {
          output = [
            { text: '================ DRIVEOSX SYSTEM EVENT LOGS ================', type: 'system' },
            { text: `[${new Date(Date.now() - 3600000).toLocaleTimeString()}] [BOOT] DriveOSX Kernel booted (v1.0.0)`, type: 'output' },
            { text: `[${new Date(Date.now() - 2400000).toLocaleTimeString()}] [AUTH] Session started for '${currentUser?.username || 'admin'}'`, type: 'success' },
            { text: `[${new Date(Date.now() - 1800000).toLocaleTimeString()}] [STORAGE] Loaded Virtual File System (${files.length} items)`, type: 'info' },
            { text: `[${new Date(Date.now() - 900000).toLocaleTimeString()}] [DISPLAY] Window manager initialized with theme '${settings.theme}'`, type: 'output' },
            { text: `[${new Date(Date.now() - 300000).toLocaleTimeString()}] [NETWORK] Wi-Fi status: '${settings.wifiStatus}'`, type: 'info' },
            { text: `[${new Date().toLocaleTimeString()}] [TERMINAL] Terminal active tab: ${activeTab.title}`, type: 'success' },
            { text: 'Use "logs -f" to watch live stream or "logs --clear" to clear.', type: 'info' },
          ];
        }
        break;
      }

      case 'env': {
        output = [
          { text: '=== ENVIRONMENT VARIABLES ===', type: 'system' },
          ...Object.entries(activeTab.envVars).map(([k, v]) => ({
            text: `${k}=${v}`,
            type: 'output' as const,
          })),
        ];
        break;
      }

      case 'export': {
        const statement = args.join(' ').trim();
        if (!statement || !statement.includes('=')) {
          output = [
            { text: 'Error: Usage: export KEY=VALUE', type: 'error' },
            { text: 'Example: export PORT=8080', type: 'info' },
          ];
        } else {
          const eqIdx = statement.indexOf('=');
          const key = statement.slice(0, eqIdx).trim();
          const rawVal = statement.slice(eqIdx + 1).trim();
          const cleanVal = rawVal.replace(/^["']|["']$/g, '');

          if (!key) {
            output = [{ text: 'Error: Invalid key name.', type: 'error' }];
          } else {
            const updatedEnv = { ...activeTab.envVars, [key]: cleanVal };
            updateActiveTab({ envVars: updatedEnv });
            output = [{ text: `✔ Exported ${key}=${cleanVal}`, type: 'success' }];
          }
        }
        break;
      }

      case 'unset': {
        const key = args[0]?.trim();
        if (!key) {
          output = [{ text: 'Error: Usage: unset KEY', type: 'error' }];
        } else {
          const updatedEnv = { ...activeTab.envVars };
          delete updatedEnv[key];
          updateActiveTab({ envVars: updatedEnv });
          output = [{ text: `✔ Unset environment variable '${key}'`, type: 'success' }];
        }
        break;
      }

      case 'whoami':
        output = [
          { text: `User: ${currentUser?.fullName || 'DriveOSX Admin'}`, type: 'success' },
          { text: `Username: ${currentUser?.username || 'admin'}`, type: 'output' },
        ];
        break;

      case 'date':
      case 'time':
        output = [{ text: `Current Timestamp: ${new Date().toLocaleString()}`, type: 'success' }];
        break;

      case 'calc': {
        const expr = args.join('');
        if (!expr) {
          output = [{ text: 'Usage: calc <expression> e.g. "calc (100 * 5) + 20"', type: 'error' }];
        } else {
          try {
            const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
            // eslint-disable-next-line no-eval
            const result = Function(`"use strict"; return (${sanitized})`)();
            output = [{ text: `${expr} = ${result}`, type: 'success' }];
          } catch (err) {
            output = [{ text: `Math error in expression "${expr}"`, type: 'error' }];
          }
        }
        break;
      }

      case 'neofetch':
        output = [
          { text: '        /\\_/\\          ' + (currentUser?.fullName || 'DriveOSX Admin') + '@driveosx', type: 'success' },
          { text: '       ( o.o )         ----------------------------------', type: 'output' },
          { text: '        > ^ <          OS: DriveOSX Terminal v1.0.0', type: 'output' },
          { text: '       /  |  \\         Kernel: WebOS React 19 (TSX)', type: 'output' },
          { text: '      (   |   )        Uptime: 4 hours, 12 mins', type: 'output' },
          { text: '       \\_ | _/         Shell: ' + (activeTab.envVars.SHELL || '/bin/zsh'), type: 'output' },
          { text: '         " "           Theme: ' + activeTheme.name, type: 'output' },
          { text: '                       CPU: Virtual WebVM Quad-Core @ 2.8GHz', type: 'output' },
          { text: '                       RAM: 4096MB / 8192MB', type: 'output' },
        ];
        break;

      case 'cowsay': {
        const msg = args.length > 0 ? args.join(' ') : 'DriveOSX Terminal is fully feature loaded!';
        const borderLength = msg.length + 2;
        const dashes = '-'.repeat(borderLength);
        output = [
          { text: `  ${dashes}`, type: 'output' },
          { text: `  < ${msg} >`, type: 'output' },
          { text: `  ${dashes}`, type: 'output' },
          { text: '         \\   ^__^', type: 'output' },
          { text: '          \\  (oo)\\_______', type: 'output' },
          { text: '             (__)\\       )\\/\\', type: 'output' },
          { text: '                 ||----w |', type: 'output' },
          { text: '                 ||     ||', type: 'output' },
        ];
        break;
      }

      case 'matrix':
        setIsMatrixMode(true);
        updateActiveTab({ inputVal: '' });
        return;

      case 'history':
        output = [
          { text: '=== COMMAND INPUT HISTORY ===', type: 'system' },
          ...newCmdHistory.map((c, i) => ({
            text: `  ${(i + 1).toString().padStart(3, ' ')}  ${c}`,
            type: 'output' as const,
          })),
        ];
        break;

      case 'clear':
        updateActiveTab({
          history: [],
          inputVal: '',
          historyPointer: -1,
          commandHistory: newCmdHistory,
        });
        return;

      default:
        if (primary) {
          output = [{ text: `Command not recognized: "${primary}". Type "help" to list available commands.`, type: 'error' }];
        }
        break;
    }

    updateActiveTab({
      history: [...newHistory, ...output],
      inputVal: '',
      historyPointer: -1,
      commandHistory: newCmdHistory,
    });
  };

  const handleSetTheme = (tId: string) => {
    setThemeId(tId);
    updateAppPreference('terminal', 'theme', tId);
  };


  useAppMenu('terminal', [
    {
      id: 'shell',
      label: 'Shell',
      items: [
        { id: 'new-tab', label: 'New Tab', shortcut: 'Ctrl+T', onSelect: () => createNewTab() },
        { id: 'close-tab', label: 'Close Tab', shortcut: 'Ctrl+W', disabled: tabs.length <= 1, onSelect: () => closeTab(activeTabId) },
        separator(),
        { id: 'clear', label: 'Clear Screen', shortcut: 'Ctrl+L', onSelect: () =>
            setTabs((prev) => prev.map((tab) => (tab.id === activeTabId ? { ...tab, lines: [] } : tab))) },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          kind: 'submenu', id: 'theme', label: 'Colour Scheme',
          items: TERMINAL_THEMES.map((theme) => ({
            id: `theme-${theme.id}`, label: theme.name, selected: themeId === theme.id,
            onSelect: () => setThemeId(theme.id),
          })),
        },
        {
          kind: 'submenu', id: 'font', label: 'Font Size',
          items: ['11px', '12px', '13px', '14px', '16px', '18px'].map((size) => ({
            id: `font-${size}`, label: size, selected: fontSize === size,
            onSelect: () => setFontSize(size),
          })),
        },
        separator(),
        { id: 'matrix', label: 'Matrix Mode', checked: isMatrixMode, onSelect: () => setIsMatrixMode((prev) => !prev) },
      ],
    },
    {
      id: 'commands',
      label: 'Commands',
      items: [
        { id: 'cmd-help', label: 'Command Reference…', onSelect: () => setShowHelpModal(true) },
      ],
    },
  ]);
  return (
    <div
      onClick={handleContainerClick}
      className={`h-full flex flex-col ${activeTheme.bg} ${activeTheme.text} font-mono select-text transition-colors duration-150 relative overflow-hidden`}
      style={{ fontSize }}
    >
      {/* Hidden file input for upload command */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />

      {/* 1. TOP TOOLBAR & MULTIPLE TABS BAR */}
      <div
        className={`h-9 px-2 flex items-center justify-between shrink-0 ${activeTheme.headerBg} border-b ${activeTheme.border} select-none overflow-x-auto`}
      >
        {/* Left: Tab List */}
        <div className="flex items-center gap-2 min-w-0 flex-1">

          {/* TABS HEADER BAR */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTabId(tab.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-t-md text-xs font-sans transition-all cursor-pointer border-t border-x shrink-0 ${
                    isActive
                      ? `${activeTheme.bg} text-slate-100 ${activeTheme.border} font-medium shadow-sm`
                      : 'bg-black/20 text-slate-400 border-transparent hover:bg-black/30 hover:text-slate-200'
                  }`}
                >
                  {tab.sshSession ? (
                    <Server size={12} className="text-emerald-400 shrink-0" />
                  ) : (
                    <TerminalIcon size={12} className="text-sky-400 shrink-0" />
                  )}
                  <span className="truncate max-w-[110px] text-[11px] font-mono">{tab.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="p-0.5 rounded hover:bg-white/20 text-slate-400 hover:text-white transition-colors ml-1"
                    title="Close Tab (Ctrl+W)"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}

            {/* New Tab Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                createNewTab();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 ml-0.5"
              title="New Tab (Ctrl+T)"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Right Tool Actions & Theme Selector */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Help Modal Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHelpModal(!showHelpModal);
            }}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Terminal Features & Shortcuts"
          >
            <HelpCircle size={14} />
          </button>

          {/* Theme Selector */}
          <select
            value={themeId}
            onChange={(e) => handleSetTheme(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-black/40 text-[11px] px-1.5 py-0.5 rounded border border-white/10 text-slate-300 focus:outline-none cursor-pointer"
          >
            {TERMINAL_THEMES.map((t) => (
              <option key={t.id} value={t.id} className="bg-zinc-900 text-white">
                {t.name}
              </option>
            ))}
          </select>

          {/* Clear Terminal */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateActiveTab({ history: [] });
            }}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Clear Screen (Ctrl+L)"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* 2. HELP MODAL OVERLAY */}
      {showHelpModal && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-between overflow-y-auto font-sans text-slate-200 select-none">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Code className="text-sky-400" size={18} />
                <h3 className="font-bold text-sm text-white">DriveOSX Terminal Features & Commands</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Folder size={14} /> File Commands
                </h4>
                <ul className="space-y-1 font-mono text-[11px] text-slate-300">
                  <li><strong className="text-white">ls [-a/-l]</strong> - List files</li>
                  <li><strong className="text-white">cd [dir]</strong> - Change directory</li>
                  <li><strong className="text-white">pwd</strong> - Print working dir</li>
                  <li><strong className="text-white">mkdir [name]</strong> - Make folder</li>
                  <li><strong className="text-white">touch [name]</strong> - Create file</li>
                  <li><strong className="text-white">cp [src] [dst]</strong> - Copy file/dir</li>
                  <li><strong className="text-white">mv [src] [dst]</strong> - Move/rename</li>
                  <li><strong className="text-white">rm [-r] [path]</strong> - Delete item</li>
                </ul>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-semibold text-sky-400 mb-2 flex items-center gap-1.5">
                  <Zap size={14} /> DriveOSX Commands
                </h4>
                <ul className="space-y-1 font-mono text-[11px] text-slate-300">
                  <li><strong className="text-white">open [app/file]</strong> - Launch app/file</li>
                  <li><strong className="text-white">apps</strong> - List installed apps</li>
                  <li><strong className="text-white">settings</strong> - System preferences</li>
                  <li><strong className="text-white">share [file]</strong> - Generate share link</li>
                  <li><strong className="text-white">upload</strong> - Upload local file</li>
                  <li><strong className="text-white">download [file]</strong> - Download file</li>
                  <li><strong className="text-white">logout</strong> - Log out session</li>
                </ul>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                  <Server size={14} /> Developer Features
                </h4>
                <ul className="space-y-1 font-mono text-[11px] text-slate-300">
                  <li><strong className="text-white">ssh [user@host]</strong> - Remote SSH</li>
                  <li><strong className="text-white">api / curl [url]</strong> - HTTP API calls</li>
                  <li><strong className="text-white">logs [-f]</strong> - View event logs</li>
                  <li><strong className="text-white">env</strong> - View env variables</li>
                  <li><strong className="text-white">export K=V</strong> - Set env variable</li>
                  <li><strong className="text-white">unset K</strong> - Remove variable</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 bg-sky-950/40 p-3 rounded-lg border border-sky-500/20 text-xs">
              <span className="font-semibold text-sky-300">Keyboard Shortcuts:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono text-[11px] text-slate-300">
                <div><span className="text-white font-bold">Ctrl + T:</span> New Tab</div>
                <div><span className="text-white font-bold">Ctrl + W:</span> Close Tab</div>
                <div><span className="text-white font-bold">Ctrl + C:</span> Cancel line</div>
                <div><span className="text-white font-bold">Ctrl + L:</span> Clear screen</div>
                <div><span className="text-white font-bold">Tab:</span> Auto-complete</div>
                <div><span className="text-white font-bold">Up/Down:</span> Command History</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 text-right">
            <button
              onClick={() => setShowHelpModal(false)}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-md transition-colors"
            >
              Got it, Close Help
            </button>
          </div>
        </div>
      )}

      {/* 3. MATRIX MODE OVERLAY */}
      {isMatrixMode ? (
        <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-black overflow-hidden select-none">
          <div className="absolute inset-0 opacity-40 pointer-events-none flex justify-between px-4 font-mono text-emerald-500 text-sm overflow-hidden">
            {Array.from({ length: 18 }).map((_, col) => (
              <div
                key={col}
                className="flex flex-col animate-pulse"
                style={{
                  animationDuration: `${1 + (col % 4) * 0.5}s`,
                  animationDelay: `${(col % 5) * 0.2}s`,
                }}
              >
                {Array.from({ length: 24 }).map((_, row) => (
                  <span key={row} className="opacity-80">
                    {String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96))}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="z-10 bg-zinc-950/90 border border-emerald-500/40 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 animate-pulse">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-400">MATRIX DIGITAL RAIN</h3>
              <p className="text-xs text-emerald-300/80 mt-1">Virtual digital matrix stream active.</p>
            </div>
            <button
              onClick={() => setIsMatrixMode(false)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-1.5 mt-2"
            >
              <X size={14} />
              Exit Matrix Mode (ESC)
            </button>
          </div>
        </div>
      ) : (
        /* 4. MAIN TERMINAL LOGS OUTPUT SCREEN */
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 leading-relaxed pr-1 font-mono">
            {activeTab?.history.map((line, idx) => {
              let color = activeTheme.text;
              if (line.type === 'input') color = `${activeTheme.prompt} font-semibold`;
              if (line.type === 'error') color = 'text-rose-400 font-medium';
              if (line.type === 'success') color = 'text-emerald-400 font-medium';
              if (line.type === 'system') color = 'text-sky-300 font-semibold';
              if (line.type === 'info') color = 'text-amber-300/90';

              return (
                <div key={idx} className={`${color} whitespace-pre-wrap break-words leading-relaxed text-xs`}>
                  {line.text}
                </div>
              );
            })}
          </div>

          {/* 5. INTERACTIVE PROMPT INPUT FORM */}
          <form
            onSubmit={handleCommandSubmit}
            className="flex items-center gap-2 pt-2 mt-2 select-none shrink-0 font-mono border-t border-white/5"
          >
            <span className={`${activeTheme.prompt} font-semibold shrink-0 text-xs`}>
              {getPromptString(activeTab)}
            </span>
            <div className="flex-1 flex items-center relative min-w-0">
              <input
                ref={inputRef}
                type={activeTab?.sshSession?.awaitingPassword ? 'password' : 'text'}
                value={activeTab?.inputVal || ''}
                onChange={(e) => updateActiveTab({ inputVal: e.target.value })}
                onKeyDown={handleKeyDown}
                style={{ fontSize }}
                className="w-full bg-transparent text-slate-100 border-none outline-none focus:ring-0 font-mono p-0"
                placeholder=""
                autoFocus
              />
              <span className="w-2 h-3.5 bg-slate-300/80 animate-pulse ml-0.5 inline-block shrink-0" />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
