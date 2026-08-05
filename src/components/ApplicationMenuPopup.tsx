import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Pin, LayoutGrid, Sparkles, RefreshCw, Settings as SettingsIcon, ExternalLink, Monitor, Info } from 'lucide-react';
import { useSystemStore, getAppIcon } from '../systemStore';
import { WindowState } from '../types';
import { useContextMenuStore, ContextMenuItem } from '../services/contextMenuStore';
import { StorageService } from '../services/StorageService';

interface ApplicationMenuPopupProps {
  onClose: () => void;
  apps: WindowState[];
  toggleWindow: (id: string) => void;
  pinnedAppIds: string[];
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
}

type CategoryFilter = 'all' | 'pinned' | 'running';

export default function ApplicationMenuPopup({
  onClose,
  apps,
  toggleWindow,
  pinnedAppIds,
  togglePin,
  isPinned,
}: ApplicationMenuPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [currentPage, setCurrentPage] = useState(0);

  const theme = useSystemStore((state) => state.settings.theme);
  const isLight = theme === 'classic-light';
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);

  const handleApplicationsBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'refresh-applications',
        label: 'Refresh Applications',
        icon: <RefreshCw size={15} className="text-slate-300" />,
        onClick: () => {
          setSearchQuery('');
          setCategory('all');
          setCurrentPage(0);
        },
      },
      { divider: true },
      {
        id: 'system-settings',
        label: 'System Settings',
        icon: <SettingsIcon size={15} className="text-slate-300" />,
        onClick: () => {
          toggleWindow('settings');
          onClose();
        },
      },
    ];

    openContextMenu(e, items, 'Applications');
  };

  const handleAppContextMenu = (e: React.MouseEvent, app: WindowState) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDesktopShortcuts = StorageService.get<string[]>('desktop-shortcuts', ['fileManager', 'paint', 'messenger']);
    const isDesktopPinned = currentDesktopShortcuts.includes(app.id);
    const isDockPinned = isPinned(app.id);

    const items: ContextMenuItem[] = [
      {
        id: 'open-app',
        label: `Open ${app.title}`,
        icon: <ExternalLink size={15} className="text-blue-400" />,
        onClick: () => {
          toggleWindow(app.id);
          onClose();
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
          togglePin(app.id);
        },
      },
      { divider: true },
      {
        id: 'app-info',
        label: 'App Properties',
        icon: <Info size={15} className="text-slate-300" />,
        onClick: () => {
          toggleWindow('settings');
          onClose();
        },
      },
    ];

    openContextMenu(e, items, app.title);
  };

  // Listen for Escape key to close Launchpad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Exclude launcher itself from list
  const availableApps = apps.filter((app) => app.id !== 'launcher');

  // Filter apps based on search & category
  const filteredApps = availableApps.filter((app) => {
    const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (category === 'pinned') return isPinned(app.id);
    if (category === 'running') return app.isOpen;
    return true;
  });

  const runningCount = availableApps.filter((a) => a.isOpen).length;
  const pinnedCount = availableApps.filter((a) => isPinned(a.id)).length;

  // Pagination logic for MacBook Launchpad feel - max grid 4X8 (32 apps per page)
  const APPS_PER_PAGE = 32;
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / APPS_PER_PAGE));
  const displayedApps = searchQuery
    ? filteredApps
    : filteredApps.slice(currentPage * APPS_PER_PAGE, (currentPage + 1) * APPS_PER_PAGE);

  return (
    <motion.div
      id="dock-macbook-launchpad-overlay"
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className={`fixed inset-0 z-[99999] pointer-events-auto flex flex-col justify-between p-6 sm:p-10 font-sans select-none overflow-hidden ${
        isLight
          ? 'bg-slate-900/60 backdrop-blur-3xl text-white'
          : 'bg-black/70 backdrop-blur-3xl text-white'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onContextMenu={handleApplicationsBackgroundContextMenu}
    >
      {/* Top Bar / MacBook Search & Filters Header */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-4 pt-4 sm:pt-6 z-10">
        <div className="w-full flex items-center justify-between">
          {/* Top-Left Title Badge */}
          <div className="flex items-center gap-2.5 bg-white/10 dark:bg-white/5 border border-white/15 px-3.5 py-1.5 rounded-2xl backdrop-blur-md shadow-lg">
            <LayoutGrid size={18} className="text-blue-400" />
            <span className="text-xs font-bold tracking-wide text-white/90">Applications</span>
            <span className="text-[10px] font-semibold text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
              {availableApps.length} Apps
            </span>
          </div>

          {/* Close Applications Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white transition-all cursor-pointer shadow-lg active:scale-90"
            title="Close Applications (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* MacBook Centered Glass Search Bar */}
        <div className="relative w-full max-w-md my-2">
          <Search
            size={18}
            className="absolute left-4 top-3 text-white/60 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search Applications..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            autoFocus
            className="w-full h-11 pl-11 pr-10 rounded-full bg-white/15 hover:bg-white/20 focus:bg-white/25 border border-white/20 focus:border-blue-400/80 text-sm font-medium text-white placeholder-white/60 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all backdrop-blur-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 p-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white/80 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/15 p-1 rounded-2xl backdrop-blur-md shadow-lg">
          <button
            onClick={() => {
              setCategory('all');
              setCurrentPage(0);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              category === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            All Apps ({availableApps.length})
          </button>
          <button
            onClick={() => {
              setCategory('pinned');
              setCurrentPage(0);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              category === 'pinned'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Pin size={12} />
            <span>Pinned ({pinnedCount})</span>
          </button>
          <button
            onClick={() => {
              setCategory('running');
              setCurrentPage(0);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              category === 'running'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Running ({runningCount})</span>
          </button>
        </div>
      </div>

      {/* Center Section: App Icons Grid */}
      <div className="flex-1 flex items-center justify-center my-6 max-w-6xl mx-auto w-full px-4 overflow-y-auto custom-scrollbar">
        {displayedApps.length > 0 ? (
          <motion.div
            key={`${category}-${currentPage}-${searchQuery}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6 md:gap-8 w-full place-items-center py-4"
          >
            {displayedApps.map((app) => {
              const pinned = isPinned(app.id);
              const isRunning = app.isOpen;

              return (
                <motion.div
                  key={app.id}
                  whileHover={{ scale: 1.1, y: -6 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  className="relative flex flex-col items-center justify-center group cursor-pointer select-none w-24 sm:w-28"
                  onClick={() => {
                    toggleWindow(app.id);
                    onClose();
                  }}
                  onContextMenu={(e) => handleAppContextMenu(e, app)}
                >
                  {/* MacBook Style Squircle App Icon Container */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-white/10 dark:bg-black/20 border border-white/20 p-2.5 flex items-center justify-center shadow-2xl backdrop-blur-md group-hover:border-white/40 group-hover:bg-white/20 transition-all relative">
                    {getAppIcon(app.id, 'w-full h-full')}

                    {/* Running status dot indicator underneath icon */}
                    {isRunning && (
                      <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] border border-black/40" />
                    )}
                  </div>

                  {/* App Title Label */}
                  <span className="text-xs sm:text-sm font-semibold text-white/95 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-2.5 truncate max-w-[100px] tracking-tight">
                    {app.title.replace('System ', '').replace('Web ', '')}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <Sparkles size={32} className="mb-3 text-white/30 animate-pulse" />
            <h4 className="text-base font-bold text-white/80">No Applications Found</h4>
            <p className="text-xs text-white/50 mt-1 max-w-xs">
              No apps matched your current filter or search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Bottom MacBook Launchpad Pagination Dots */}
      <div className="flex items-center justify-center gap-2 pb-2 pt-2 z-10">
        {!searchQuery && totalPages > 1 && (
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/15 backdrop-blur-md shadow-xl">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`transition-all rounded-full cursor-pointer ${
                  currentPage === index
                    ? 'w-6 h-2 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
                title={`Page ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
