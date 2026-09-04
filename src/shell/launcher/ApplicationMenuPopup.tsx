import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Pin, LayoutGrid, Sparkles, RefreshCw, Settings as SettingsIcon, ExternalLink, Monitor, Info } from 'lucide-react';
import { useSystemStore, getAppIcon } from '../state/systemStore';
import { WindowState } from '../../platform/types';
import { useContextMenuStore, ContextMenuItem } from '../context-menu/contextMenuStore';
import { StorageService } from '../../platform/storage/StorageService';
import { useShellTheme } from '../../platform/theme/useShellTheme';

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

  // The menu now takes the same surface treatment as every other shell
  // surface. It used to be a near-opaque black sheet with white text in both
  // themes, which is what made it feel heavy and detached from the desktop.
  const shell = useShellTheme();
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);

  const handleApplicationsBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'refresh-applications',
        label: 'Refresh Applications',
        icon: <RefreshCw size={15} className={shell.textMuted} />,
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
        icon: <SettingsIcon size={15} className={shell.textMuted} />,
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
        icon: <Info size={15} className={shell.textMuted} />,
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
      className={`fixed inset-0 z-[99999] pointer-events-auto flex flex-col justify-between p-6 sm:p-10 font-sans select-none overflow-hidden ${shell.scrim} ${shell.text}`}
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
          <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl ${shell.panel}`}>
            <LayoutGrid size={16} style={{ color: shell.accentColor }} />
            <span className={`text-xs font-semibold tracking-wide ${shell.text}`}>Applications</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${shell.card} ${shell.textMuted}`}>
              {availableApps.length}
            </span>
          </div>

          {/* Close Applications Button */}
          <button
            onClick={onClose}
            className={`p-2.5 rounded-full transition-all cursor-pointer active:scale-90 ${shell.panel} ${shell.hover} ${shell.textMuted}`}
            title="Close Applications (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* MacBook Centered Glass Search Bar */}
        <div className="relative w-full max-w-md my-2">
          <Search size={17} className={`absolute left-4 top-3.5 pointer-events-none ${shell.textSubtle}`} />
          <input
            type="text"
            placeholder="Search Applications..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            autoFocus
            style={{ ['--tw-ring-color' as string]: `${shell.accentColor}55` }}
            className={`w-full h-12 pl-11 pr-10 rounded-full text-sm font-medium backdrop-blur-xl focus:outline-none focus:ring-2 transition-all ${shell.panel} ${shell.controlFocus} ${shell.text} ${shell.placeholder}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3.5 top-3.5 p-1 rounded-full transition-colors ${shell.card} ${shell.cardHover} ${shell.textMuted}`}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        <div className={`flex items-center gap-1 p-1.5 rounded-2xl ${shell.panel}`}>
          <button
            onClick={() => {
              setCategory('all');
              setCurrentPage(0);
            }}
            style={category === 'all' ? { backgroundColor: shell.accentColor, color: '#fff' } : undefined}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              category === 'all' ? 'shadow-sm' : `${shell.textMuted} ${shell.hover}`
            }`}
          >
            All ({availableApps.length})
          </button>
          <button
            onClick={() => {
              setCategory('pinned');
              setCurrentPage(0);
            }}
            style={category === 'pinned' ? { backgroundColor: shell.accentColor, color: '#fff' } : undefined}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              category === 'pinned' ? 'shadow-sm' : `${shell.textMuted} ${shell.hover}`
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
            style={category === 'running' ? { backgroundColor: shell.accentColor, color: '#fff' } : undefined}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              category === 'running' ? 'shadow-sm' : `${shell.textMuted} ${shell.hover}`
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Running ({runningCount})</span>
          </button>
        </div>
      </div>

      {/* Center Section: App Icons Grid.
          Plain `items-center` vertically centers this flex item regardless of
          whether it fits — with 18+ apps (three-column grid, six-plus rows)
          on a phone-height viewport, that puts equal overflow above and
          below, so the grid opens scrolled to the middle with the top row
          clipped and no visible hint to scroll up. `safe center` is the CSS
          alignment spec's fix for exactly this: center when there's room,
          fall back to start-alignment (so it opens at the top, scrollable
          down) when the content is taller than the container. */}
      <div className="flex-1 flex [align-items:safe_center] justify-center my-6 max-w-6xl mx-auto w-full px-4 overflow-y-auto custom-scrollbar">
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
                  <div
                    className={`w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-[22px] p-2.5 flex items-center justify-center backdrop-blur-xl transition-all relative ${shell.tile} ${shell.tileHover}`}
                  >
                    {getAppIcon(app.id, 'w-full h-full')}

                    {/* Running marker, in the accent rather than a fixed green */}
                    {isRunning && (
                      <span
                        className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: shell.accentColor, boxShadow: `0 0 8px ${shell.accentColor}` }}
                      />
                    )}
                  </div>

                  {/* App Title Label */}
                  <span className={`text-xs font-medium text-center mt-3 truncate max-w-[100px] tracking-tight ${shell.textMuted}`}>
                    {app.title.replace('System ', '').replace('Web ', '')}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <Sparkles size={28} className={`mb-3 ${shell.textSubtle}`} />
            <h4 className={`text-sm font-semibold ${shell.text}`}>No applications found</h4>
            <p className={`text-xs mt-1 max-w-xs ${shell.textSubtle}`}>
              No apps matched your current filter or search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Bottom MacBook Launchpad Pagination Dots */}
      <div className="flex items-center justify-center gap-2 pb-2 pt-2 z-10">
        {!searchQuery && totalPages > 1 && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${shell.panel}`}>
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                style={currentPage === index ? { backgroundColor: shell.accentColor } : undefined}
                className={`transition-all rounded-full cursor-pointer ${
                  currentPage === index ? 'w-6 h-1.5' : `w-1.5 h-1.5 ${shell.isDark ? 'bg-white/30 hover:bg-white/60' : 'bg-black/20 hover:bg-black/40'}`
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
