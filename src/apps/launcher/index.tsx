import React, { useState } from 'react';
import { Search, Monitor, Cpu, HardDrive, Sparkles, ExternalLink, Pin, Settings as SettingsIcon, Info, RefreshCw } from 'lucide-react';
import { useSystemStore, getAppIcon } from '../../shell/state/systemStore';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import { useContextMenuStore, ContextMenuItem } from '../../shell/context-menu/contextMenuStore';
import { StorageService } from '../../platform/storage/StorageService';

export default function AppLauncher() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Retrieve store values
  const windows = useSystemStore((state) => state.windows);
  const toggleWindow = useSystemStore((state) => state.toggleWindow);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);

  const handleLauncherBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'refresh-launcher',
        label: 'Refresh Launcher',
        icon: <RefreshCw size={15} className="text-slate-300" />,
        onClick: () => {
          setSearchQuery('');
        },
      },
      { divider: true },
      {
        id: 'system-settings',
        label: 'System Settings',
        icon: <SettingsIcon size={15} className="text-slate-300" />,
        onClick: () => {
          openAppWindow('settings');
        },
      },
    ];

    openContextMenu(e, items, 'Applications');
  };

  const handleAppContextMenu = (e: React.MouseEvent, app: any) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDesktopShortcuts = StorageService.get<string[]>('desktop-shortcuts', ['fileManager', 'paint', 'messenger']);
    const isDesktopPinned = currentDesktopShortcuts.includes(app.id);

    const currentDockPinned = StorageService.get<string[] | null>('dock-pinned-apps', null) || windows.filter(w => w.id !== 'launcher').map(w => w.id);
    const isDockPinned = currentDockPinned.includes(app.id);

    const items: ContextMenuItem[] = [
      {
        id: 'open-app',
        label: `Open ${app.title}`,
        icon: <ExternalLink size={15} className="text-blue-400" />,
        onClick: () => {
          toggleWindow(app.id);
          toggleWindow('launcher');
        },
      },
      { divider: true },
      {
        id: 'pin-desktop',
        label: isDesktopPinned ? 'Unpin from Desktop' : 'Pin to Desktop',
        icon: <Monitor size={15} className={isDesktopPinned ? 'text-amber-400' : 'text-emerald-400'} />,
        onClick: () => {
          const next = isDesktopPinned
            ? currentDesktopShortcuts.filter((id) => id !== app.id)
            : [...currentDesktopShortcuts, app.id];
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
            ? currentDockPinned.filter((id) => id !== app.id)
            : [...currentDockPinned, app.id];
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

    openContextMenu(e, items, app.title);
  };
  
  const activeTheme = useAppTheme('launcher').chromeTheme;

  // Filter apps
  const filteredApps = windows.filter(
    (app) =>
      app.id !== 'launcher' && // don't list launchpad itself
      app.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Styling based on active theme
  const themeClasses = {
    'classic-light': {
      container: 'bg-transparent text-[#211625]',
      card: 'bg-white/45 border-white/60 hover:bg-white/70 hover:border-[#7c3aed]/30 shadow-sm text-[#211625]',
      widget: 'bg-white/35 border-white/50 text-[#211625]',
      input: 'bg-white/60 border-[#211625]/15 focus:ring-purple-500/50 text-[#211625] placeholder-[#211625]/45',
      accentText: 'text-[#7c3aed]',
      subText: 'text-[#211625]/60',
      barBackground: 'bg-[#211625]/10',
    },
    'modern-dark': {
      container: 'bg-transparent text-[#f3eef8]',
      card: 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-purple-500/30 shadow-md text-[#f3eef8]',
      widget: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-white/5 text-[#f3eef8]',
      input: 'bg-black/30 border-white/10 focus:ring-pink-500/60 text-[#f3eef8] placeholder-white/30',
      accentText: 'text-purple-400',
      subText: 'text-white/50',
      barBackground: 'bg-white/10',
    },
    'retro-terminal': {
      container: 'bg-transparent text-[#22c55e] font-mono',
      card: 'bg-black/40 border-green-500/20 hover:bg-green-500/10 hover:border-green-400 text-[#22c55e]',
      widget: 'bg-black/30 border-green-500/20 text-[#22c55e]',
      input: 'bg-black/60 border-green-500/30 focus:ring-green-400 text-[#22c55e] placeholder-green-500/40 font-mono',
      accentText: 'text-green-400 animate-pulse',
      subText: 'text-green-500/60',
      barBackground: 'bg-green-500/10',
    },
  };

  const currentTheme = themeClasses[activeTheme] || themeClasses['classic-light'];

  return (
    <div 
      className={`h-full p-6 flex flex-col gap-6 overflow-y-auto ${currentTheme.container}`}
      onContextMenu={handleLauncherBackgroundContextMenu}
    >
      {/* 1. Header & Welcome Area */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border ${currentTheme.widget}`}>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Welcome to Drive OSX <Sparkles className="w-5 h-5 text-amber-400 animate-bounce" />
          </h2>
          <p className={`text-xs mt-1 ${currentTheme.subText}`}>
            Running flawlessly on React 19, Tailwind CSS, & Motion
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
          <input
            type="text"
            placeholder="Search system apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 ${currentTheme.input}`}
          />
        </div>
      </div>

      {/* 2. Interactive System Stats / Widgets (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Load Widget */}
        <div className={`border p-4 rounded-xl flex items-center gap-4 ${currentTheme.widget}`}>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className={`text-[10px] uppercase tracking-wider font-semibold ${currentTheme.subText}`}>CPU Load</div>
            <div className="text-sm font-bold mt-0.5">Dual-Core Virtual Host</div>
            <div className={`w-full h-1.5 rounded-full mt-2 ${currentTheme.barBackground}`}>
              <div className="bg-indigo-400 h-full rounded-full animate-pulse" style={{ width: '42%' }} />
            </div>
          </div>
        </div>

        {/* Memory Widget */}
        <div className={`border p-4 rounded-xl flex items-center gap-4 ${currentTheme.widget}`}>
          <div className="p-3 bg-purple-500/10 rounded-xl text-pink-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className={`text-[10px] uppercase tracking-wider font-semibold ${currentTheme.subText}`}>Memory (RAM)</div>
            <div className="text-sm font-bold mt-0.5">3.4 GB of 8 GB Used</div>
            <div className={`w-full h-1.5 rounded-full mt-2 ${currentTheme.barBackground}`}>
              <div className="bg-pink-400 h-full rounded-full" style={{ width: '42.5%' }} />
            </div>
          </div>
        </div>

        {/* Storage Widget */}
        <div className={`border p-4 rounded-xl flex items-center gap-4 ${currentTheme.widget}`}>
          <div className="p-3 bg-pink-500/10 rounded-xl text-rose-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className={`text-[10px] uppercase tracking-wider font-semibold ${currentTheme.subText}`}>Virtual Storage</div>
            <div className="text-sm font-bold mt-0.5">14.2 GB Free of 64 GB</div>
            <div className={`w-full h-1.5 rounded-full mt-2 ${currentTheme.barBackground}`}>
              <div className="bg-rose-400 h-full rounded-full" style={{ width: '78%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grid of Applications */}
      <div>
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3.5 px-1 ${currentTheme.subText}`}>
          Applications Directory
        </h3>

        {filteredApps.length === 0 ? (
          <div className={`text-center py-10 text-xs ${currentTheme.subText}`}>
            No matching system applications found.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => {
                  toggleWindow(app.id);
                  // Auto-minimize the launcher to reveal the launched app
                  toggleWindow('launcher');
                }}
                onContextMenu={(e) => handleAppContextMenu(e, app)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all group text-center cursor-pointer ${currentTheme.card}`}
              >
                {/* Same exact icon source of truth */}
                <div className="w-12 h-12 flex items-center justify-center text-xl rounded-2xl mb-3 shadow-md group-hover:scale-105 transition-transform shrink-0">
                  {getAppIcon(app.id, 'w-full h-full')}
                </div>
                <div className="text-xs font-semibold truncate w-full">{app.title}</div>
                <div className="text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to open
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
