import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar,
  Moon,
  Sun,
  LogOut,
  X,
  Check,
  Search,
  Bell,
  BellOff,
  Monitor,
  Settings as SettingsIcon,
  MoreHorizontal,
  Pin
} from 'lucide-react';
import { useSystemStore, getAppIcon } from '../systemStore';
import { StorageService } from '../services/StorageService';

export default function Dock() {
  const [time, setTime] = useState<Date>(new Date());
  const [notificationsMuted, setNotificationsMuted] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [showRightPopup, setShowRightPopup] = useState<boolean>(false);
  const [showAppDirectoryPopup, setShowAppDirectoryPopup] = useState<boolean>(false);
  const [appSearchQuery, setAppSearchQuery] = useState<string>('');
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(false);
  const [showMorePopup, setShowMorePopup] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  const [dockAppOrder, setDockAppOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pinnedAppIds, setPinnedAppIds] = useState<string[]>([]);

  const [notifications, setNotifications] = useState([
    { id: 'n1', text: 'System optimization complete. CPU load is 2%.', sender: 'System Terminal', time: 'Just now' },
    { id: 'n2', text: 'Hello Vishal! How can I assist you today?', sender: 'OS Caption', time: '2m ago' },
    { id: 'n3', text: 'You have 3 active virtual workspaces ready.', sender: 'Workspace Monitor', time: '5m ago' }
  ]);

  // Subscribing to central system store
  const windows = useSystemStore((state) => state.windows);
  const toggleWindow = useSystemStore((state) => state.toggleWindow);
  const activeWindowId = useSystemStore((state) => state.activeWindowId);
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const currentDesktop = useSystemStore((state) => state.currentDesktop);
  const currentUser = useSystemStore((state) => state.currentUser);
  const logout = useSystemStore((state) => state.logout);

  const dockSize = settings.dockSize || 'md';

  useEffect(() => {
    setNotifications(prev => prev.map(n => {
      if (n.id === 'n2') {
        return { ...n, text: `Hello ${currentUser?.fullName || 'Guest'}! How can I assist you today?` };
      }
      return n;
    }));
  }, [currentUser]);

  useEffect(() => {
    const otherAppIds = windows.filter(w => w.id !== 'launcher').map(w => w.id);
    const savedPinned = StorageService.get<string[] | null>('dock-pinned-apps', null);
    if (savedPinned) {
      setPinnedAppIds(savedPinned);
    } else if (otherAppIds.length > 0) {
      setPinnedAppIds(otherAppIds);
      StorageService.set('dock-pinned-apps', otherAppIds);
    }
  }, [windows]);

  const togglePin = (id: string) => {
    setPinnedAppIds(prev => {
      const next = prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id];
      StorageService.set('dock-pinned-apps', next);
      return next;
    });
  };

  const isPinned = (id: string) => {
    return pinnedAppIds.includes(id);
  };

  useEffect(() => {
    const savedSequence = StorageService.get<string[]>('dock-app-sequence', []);
    const otherAppIds = windows.filter(w => w.id !== 'launcher').map(w => w.id);
    
    const merged = [...savedSequence];
    otherAppIds.forEach(id => {
      if (!merged.includes(id)) {
        merged.push(id);
      }
    });
    const finalSequence = merged.filter(id => otherAppIds.includes(id));
    
    setDockAppOrder(finalSequence);
  }, [windows]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (id === 'launcher') return;
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    if (targetId === 'launcher' || !draggingId || draggingId === targetId) return;
    e.preventDefault();
    
    const dragIndex = dockAppOrder.indexOf(draggingId);
    const targetIndex = dockAppOrder.indexOf(targetId);
    if (dragIndex !== -1 && targetIndex !== -1) {
      const nextOrder = [...dockAppOrder];
      nextOrder.splice(dragIndex, 1);
      nextOrder.splice(targetIndex, 0, draggingId);
      setDockAppOrder(nextOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    StorageService.set('dock-app-sequence', dockAppOrder);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Harmonized size classes for BOTH dock pills
  const sizeClasses = {
    sm: { 
      dock: 'h-11 px-2 py-1 gap-1.5', 
      icon: 'w-8 h-8 rounded-lg', 
      dot: 'w-[3px] h-[3px]',
      timeText: 'text-[12px]',
      dateText: 'text-[9px]',
      sepHeight: 'h-4.5',
      iconSize: 16,
      monitorSize: 15,
      statusText: 'text-[10px]',
      dotBottom: 'bottom-[2px]',
      timeDateBtn: 'px-1.5 py-0.5 flex flex-col items-center justify-center gap-[1px]',
      systemBtn: 'px-1.5 py-0.5 gap-1.5 flex flex-row items-center justify-center',
      systemIconGap: 'gap-1.5',
      outerGap: 'gap-1.5',
      bottom: 'bottom-2'
    },
    md: { 
      dock: 'h-[68px] px-4 py-2.5 gap-2.5', 
      icon: 'w-11 h-11 rounded-xl', 
      dot: 'w-[5px] h-[5px]',
      timeText: 'text-[17px]',
      dateText: 'text-[12px]',
      sepHeight: 'h-6',
      iconSize: 22,
      monitorSize: 21,
      statusText: 'text-[14px]',
      dotBottom: 'bottom-1.5',
      timeDateBtn: 'px-2.5 py-1.5 flex flex-col items-center justify-center gap-[2px]',
      systemBtn: 'px-2.5 py-1.5 gap-2 flex flex-row items-center justify-center',
      systemIconGap: 'gap-2',
      outerGap: 'gap-2.5',
      bottom: 'bottom-2.5'
    },
    lg: { 
      dock: 'h-20 px-5 py-3.5 gap-3.5', 
      icon: 'w-14 h-14 rounded-2xl', 
      dot: 'w-1.5 h-1.5',
      timeText: 'text-[21px]',
      dateText: 'text-[14px]',
      sepHeight: 'h-7',
      iconSize: 26,
      monitorSize: 25,
      statusText: 'text-[18px]',
      dotBottom: 'bottom-1.5',
      timeDateBtn: 'px-3.5 py-2 flex flex-col items-center justify-center gap-[3px]',
      systemBtn: 'px-3.5 py-2 gap-3 flex flex-row items-center justify-center',
      systemIconGap: 'gap-3',
      outerGap: 'gap-3',
      bottom: 'bottom-3'
    }
  };

  const activeSizes = sizeClasses[dockSize] || sizeClasses.md;

  // Responsive dock sizing calculations to prevent overflowing on resize
  const systemPillWidths = { sm: 130, md: 220, lg: 295 };
  const iconWidthsWithGap = { sm: 38, md: 54, lg: 70 };
  const paddingWidths = { sm: 16, md: 32, lg: 40 };

  const systemPillWidth = systemPillWidths[dockSize] || systemPillWidths.md;
  const iconWidthWithGap = iconWidthsWithGap[dockSize] || iconWidthsWithGap.md;
  const paddingWidth = paddingWidths[dockSize] || paddingWidths.md;
  const outerGapWidth = dockSize === 'sm' ? 6 : (dockSize === 'md' ? 10 : 12);

  const otherAppsSorted = [...windows.filter(w => w.id !== 'launcher')].sort((a, b) => {
    const indexA = dockAppOrder.indexOf(a.id);
    const indexB = dockAppOrder.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Filter dock apps: must be pinned OR currently open
  const dockApps = otherAppsSorted.filter(app => isPinned(app.id) || app.isOpen);
  const totalApps = dockApps.length + 1; // +1 for launcher

  const availableWidthForDockApps = windowWidth - 50 - systemPillWidth - outerGapWidth - paddingWidth;
  let maxVisibleTotal = totalApps;

  if (windowWidth < 1200) {
    const estimatedMax = Math.floor(availableWidthForDockApps / iconWidthWithGap);
    maxVisibleTotal = Math.max(3, estimatedMax);
  }

  const needsOverflow = totalApps > maxVisibleTotal;
  let visibleApps: typeof windows = [];
  let overflowApps: typeof windows = [];

  const launcherApp = windows.find(w => w.id === 'launcher');

  if (!needsOverflow) {
    visibleApps = [
      ...(launcherApp ? [launcherApp] : []),
      ...dockApps
    ];
  } else {
    const visibleOtherCount = Math.max(1, maxVisibleTotal - 2); // -1 for launcher, -1 for '...' button
    
    visibleApps = [
      ...(launcherApp ? [launcherApp] : []),
      ...dockApps.slice(0, visibleOtherCount)
    ];
    overflowApps = dockApps.slice(visibleOtherCount);
  }

  const draggableApps = visibleApps.filter(app => app.id !== 'launcher');

  return (
    <div className={`absolute ${activeSizes.bottom} left-0 right-0 flex items-center justify-center z-[999] pointer-events-none select-none ${activeSizes.outerGap}`}>
      {/* 1. Main Icon Bar Pill Wrapper */}
      <div className="relative">
        <AnimatePresence>
          {showAppDirectoryPopup && (
            <>
              {/* Invisible Click-away backdrop */}
              <div 
                className="fixed inset-0 z-[990] cursor-default pointer-events-auto" 
                onClick={() => setShowAppDirectoryPopup(false)} 
              />
              
              {/* App Directory Popup - WIDER AND EXPANDED GRID AS REQUESTED */}
              <motion.div
                id="dock-app-directory-panel"
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 220 }}
                className="absolute bottom-[84px] left-0 w-[520px] bg-[#beb2e9] rounded-[28px] p-5.5 shadow-[0_15px_35px_rgba(33,22,37,0.22)] flex flex-col gap-4.5 border border-white/30 z-[999] pointer-events-auto"
              >
                {/* Search Bar */}
                <div className="relative w-full">
                  <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-black/55" />
                  <input
                    type="text"
                    placeholder="Search apps..."
                    value={appSearchQuery}
                    onChange={(e) => setAppSearchQuery(e.target.value)}
                    className="w-full bg-white/45 border border-white/25 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-black placeholder-black/50 focus:outline-none focus:ring-2 focus:ring-purple-600/40 transition-shadow duration-200"
                  />
                </div>

                {/* Grid of Apps - 5 COLUMNS WITH INCREASED HEIGHT */}
                <div className="grid grid-cols-5 gap-3.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {otherAppsSorted.filter(app => app.title.toLowerCase().includes(appSearchQuery.toLowerCase())).map((app) => (
                    <button
                      key={app.id}
                      onClick={() => {
                        toggleWindow(app.id);
                        setShowAppDirectoryPopup(false);
                      }}
                      className="relative flex flex-col items-center justify-center p-2 pt-4 pb-2 rounded-[20px] bg-white/20 hover:bg-white/40 border border-white/15 hover:border-white/30 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer text-center group focus:outline-none"
                      title={`Open ${app.title}`}
                    >
                      {/* Pin/Unpin Toggle Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(app.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/5 hover:bg-black/15 text-black/60 hover:text-black hover:scale-110 active:scale-95 transition-all z-20"
                        title={isPinned(app.id) ? "Unpin from Dock" : "Pin to Dock"}
                      >
                        <Pin size={11} className={isPinned(app.id) ? "fill-black text-black" : "text-black/35"} />
                      </button>

                      {/* Unified App Icon Source of Truth */}
                      <div className="w-10 h-10 flex items-center justify-center rounded-2xl mb-1.5 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        {getAppIcon(app.id, 'w-full h-full')}
                      </div>
                      <span className="text-[9px] font-bold text-black/85 tracking-tight leading-tight break-words w-full px-0.5">
                        {app.title.replace("System ", "").replace("Web ", "")}
                      </span>
                    </button>
                  ))}
                  {otherAppsSorted.filter(app => app.title.toLowerCase().includes(appSearchQuery.toLowerCase())).length === 0 && (
                    <div className="col-span-5 py-10 text-center text-black/55 text-xs font-bold select-none">
                      No matching apps found.
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
          {showMorePopup && (
            <>
              {/* Invisible Click-away backdrop */}
              <div 
                className="fixed inset-0 z-[990] cursor-default pointer-events-auto" 
                onClick={() => setShowMorePopup(false)} 
              />
              
              {/* More Apps Dropup Panel */}
              <motion.div
                id="dock-more-apps-panel"
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 220 }}
                className="absolute bottom-[84px] right-0 bg-[#beb2e9] rounded-[24px] p-4 shadow-[0_15px_35px_rgba(33,22,37,0.22)] flex flex-col gap-3 border border-white/30 z-[999] pointer-events-auto w-[250px]"
              >
                <div className="text-[10px] font-extrabold text-black/55 tracking-wider uppercase mb-1 px-1">More Apps</div>
                <div className="grid grid-cols-3 gap-2.5">
                  {overflowApps.map((app) => {
                    const isActive = app.isOpen;
                    return (
                      <button
                        key={app.id}
                        onClick={() => {
                          toggleWindow(app.id);
                          setShowMorePopup(false);
                          setShowAppDirectoryPopup(false);
                          setShowPopup(false);
                          setShowRightPopup(false);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/25 hover:bg-white/45 border border-white/10 hover:border-white/20 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200 cursor-pointer text-center relative group focus:outline-none"
                        title={`Open ${app.title}`}
                      >
                        <div className="w-8.5 h-8.5 flex items-center justify-center rounded-xl mb-1 shrink-0">
                          {getAppIcon(app.id, 'w-full h-full')}
                        </div>
                        <span className="text-[8px] font-bold text-black/85 tracking-tight leading-tight truncate w-full">
                          {app.title.replace("System ", "").replace("Web ", "")}
                        </span>
                        
                        {/* Running Status Dot */}
                        {isActive && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Dynamic Apps Pill with equal, responsive spacing */}
        <div 
          id="dock-apps-pill"
          className={`pointer-events-auto flex items-center justify-center bg-[#7b6db5] border border-white/20 rounded-2xl shadow-xl shadow-purple-950/10 transition-all duration-300 ${activeSizes.dock}`}
        >
          {/* Launcher / App Directory (Fixed & Separated on the left side) */}
          {launcherApp && (
            <div className="flex items-center justify-center relative h-full">
              <motion.button
                id={`dock-icon-launcher`}
                onClick={() => {
                  setShowAppDirectoryPopup(!showAppDirectoryPopup);
                  setShowPopup(false);
                  setShowRightPopup(false);
                  setShowMorePopup(false);
                }}
                whileHover={{ scale: 1.16, y: -6 }}
                whileTap={{ scale: 0.92 }}
                className={`cursor-pointer relative flex items-center justify-center ${activeSizes.icon} ${
                  showAppDirectoryPopup ? 'bg-white/10' : ''
                }`}
                title={launcherApp.title}
              >
                {getAppIcon('launcher', 'w-full h-full')}
              </motion.button>
            </div>
          )}

          {/* Separator between Fixed System Launcher and Draggable User Apps */}
          {launcherApp && draggableApps.length > 0 && (
            <div className={`w-[1px] bg-white/20 mx-1.5 self-center transition-all duration-300 ${activeSizes.sepHeight}`} />
          )}

          {/* Draggable user apps */}
          {draggableApps.map((app) => {
            const isActive = app.isOpen;
            const isDragging = draggingId === app.id;

            return (
              <motion.div 
                key={app.id} 
                layout
                className={`flex items-center justify-center relative h-full transition-opacity duration-150 ${
                  isDragging ? 'opacity-30' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, app.id)}
                onDragOver={(e) => handleDragOver(e, app.id)}
                onDragEnd={handleDragEnd}
              >
                <motion.button
                  id={`dock-icon-${app.id}`}
                  onClick={() => {
                    toggleWindow(app.id);
                    setShowMorePopup(false);
                    setShowAppDirectoryPopup(false);
                    setShowPopup(false);
                    setShowRightPopup(false);
                  }}
                  whileHover={{ scale: 1.16, y: -6 }}
                  whileTap={{ scale: 0.92 }}
                  className={`cursor-pointer cursor-grab active:cursor-grabbing relative flex items-center justify-center ${activeSizes.icon}`}
                  title={app.title}
                >
                  {getAppIcon(app.id, 'w-full h-full')}
                </motion.button>

                {/* Running/Focus Status Indicator Dot */}
                {isActive && (
                  <span 
                    className={`absolute rounded-full transition-all duration-300 ${activeSizes.dot} ${activeSizes.dotBottom} bg-white shadow-[0_0_5px_rgba(255,255,255,0.95)]`} 
                  />
                )}
              </motion.div>
            );
          })}

          {/* Overflow '...' Menu Button */}
          {needsOverflow && (
            <div className="flex items-center justify-center relative h-full">
              <motion.button
                id="dock-more-button"
                onClick={() => {
                  setShowMorePopup(!showMorePopup);
                  setShowAppDirectoryPopup(false);
                  setShowPopup(false);
                  setShowRightPopup(false);
                }}
                whileHover={{ scale: 1.16, y: -6 }}
                whileTap={{ scale: 0.92 }}
                className={`cursor-pointer relative flex items-center justify-center ${activeSizes.icon} ${
                  showMorePopup ? 'bg-white/10' : ''
                }`}
                title="More Apps"
              >
                <MoreHorizontal size={activeSizes.iconSize + 2} className="text-white" strokeWidth={2.4} />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Clock & Date Pill Wrapper */}
      <div className="relative">
        <AnimatePresence>
          {showPopup && (
            <>
              {/* Invisible Click-away backdrop */}
              <div 
                className="fixed inset-0 z-[990] cursor-default pointer-events-auto" 
                onClick={() => setShowPopup(false)} 
              />
              
              {/* Calendar & Clock Popup */}
              <motion.div
                id="dock-calendar-clock-panel"
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 220 }}
                className="absolute bottom-[84px] left-0 -translate-x-[20%] w-[220px] bg-[#beb2e9] rounded-[28px] p-5 shadow-[0_15px_35px_rgba(33,22,37,0.22)] flex flex-col items-center justify-center border border-white/30 z-[999] pointer-events-auto"
              >
                {/* Large Display Time */}
                <span className="text-[44px] font-bold tracking-tight text-black tabular-nums leading-none">
                  {formatTime(time)}
                </span>
                
                {/* Date */}
                <span className="text-sm font-semibold text-black/80 tracking-wide mt-2 leading-none">
                  {formatDate(time)}
                </span>
                
                {/* Action Buttons Container */}
                <div className="w-full flex flex-col gap-2.5 mt-5">
                  <button
                    onClick={() => {
                      toggleWindow('clock');
                      setShowPopup(false);
                    }}
                    className="w-full bg-white hover:bg-zinc-50 active:scale-[0.97] transition-all py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-black font-bold text-xs select-none focus:outline-none cursor-pointer"
                  >
                    <Calendar size={15} className="text-black" strokeWidth={2.4} />
                    <span>Calendar</span>
                  </button>

                  <button
                    onClick={() => {
                      toggleWindow('settings');
                      setShowPopup(false);
                    }}
                    className="w-full bg-white hover:bg-zinc-50 active:scale-[0.97] transition-all py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-black font-bold text-xs select-none focus:outline-none cursor-pointer"
                  >
                    <SettingsIcon size={15} className="text-black" strokeWidth={2.4} />
                    <span>Settings</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}

          {showRightPopup && (
            <>
              {/* Invisible Click-away backdrop */}
              <div 
                className="fixed inset-0 z-[990] cursor-default pointer-events-auto" 
                onClick={() => setShowRightPopup(false)} 
              />
              
              {/* Control Panel & Notifications Popup */}
              <motion.div
                id="dock-system-notifications-panel"
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 220 }}
                className="absolute bottom-[84px] right-0 w-[270px] bg-[#beb2e9] rounded-[28px] p-4.5 shadow-[0_15px_35px_rgba(33,22,37,0.22)] flex flex-col gap-3.5 border border-white/30 z-[999] pointer-events-auto"
              >
                {/* 1. Notification Center (Top) */}
                <div className="flex flex-col gap-1.5 bg-white/20 p-2.5 rounded-[18px] border border-white/15">
                  <div className="flex items-center justify-between px-1 mb-1 select-none">
                    <span className="text-[9px] font-bold text-black/60 tracking-wider">SYSTEM NOTIFICATIONS</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-[9px] font-extrabold text-purple-950/60 hover:text-black transition-colors focus:outline-none cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-0.5 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className="bg-white/40 p-2 rounded-[12px] border border-white/15 flex items-start gap-1.5 group relative">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[8px] font-bold text-purple-950/80 leading-none truncate">{n.sender}</span>
                              <span className="text-[7px] text-purple-950/50 leading-none select-none">{n.time}</span>
                            </div>
                            <p className="text-[9px] text-black/80 font-medium leading-tight mt-1 truncate">{n.text}</p>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifications(prev => prev.filter(item => item.id !== n.id));
                            }}
                            className="p-0.5 hover:bg-black/10 rounded-full text-black/40 hover:text-black/80 transition-all opacity-0 group-hover:opacity-100 self-center focus:outline-none cursor-pointer"
                            title="Dismiss Notification"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-5 text-center select-none">
                        <Check size={16} className="text-purple-950/40 mb-1" />
                        <span className="text-[9px] font-extrabold text-purple-950/50">All caught up!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Fast Control Toggles */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Theme Toggle (Dark Mode) */}
                  <button
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        theme: prev.theme === 'modern-dark' ? 'classic-light' : 'modern-dark'
                      }));
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-[16px] border transition-all active:scale-95 text-center focus:outline-none select-none cursor-pointer ${
                      settings.theme === 'modern-dark'
                        ? 'bg-zinc-950/70 border-white/10 text-white'
                        : 'bg-white border-white/40 text-black shadow-sm'
                    }`}
                  >
                    {settings.theme === 'modern-dark' ? (
                      <Moon size={15} className="mb-1 text-purple-400" />
                    ) : (
                      <Sun size={15} className="mb-1 text-amber-500" />
                    )}
                    <span className="text-[10px] font-bold leading-none">Dark Mode</span>
                    <span className="text-[8px] opacity-65 mt-1 font-medium leading-none">
                      {settings.theme === 'modern-dark' ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>

                  {/* Do Not Disturb (DND) */}
                  <button
                    onClick={() => setNotificationsMuted(!notificationsMuted)}
                    className={`flex flex-col items-center justify-center p-2 rounded-[16px] border transition-all active:scale-95 text-center focus:outline-none select-none cursor-pointer ${
                      notificationsMuted
                        ? 'bg-zinc-950/70 border-white/10 text-white'
                        : 'bg-white border-white/40 text-black shadow-sm'
                    }`}
                  >
                    {notificationsMuted ? (
                      <BellOff size={15} className="mb-1 text-zinc-400" />
                    ) : (
                      <Bell size={15} className="mb-1 text-purple-500 animate-bounce" />
                    )}
                    <span className="text-[10px] font-bold leading-none">Silent Mode</span>
                    <span className="text-[8px] opacity-65 mt-1 font-medium leading-none">
                      {notificationsMuted ? 'Muted' : 'Normal'}
                    </span>
                  </button>
                </div>

                {/* 4. Logout Session Action */}
                <button
                  onClick={() => {
                    logout();
                    setShowRightPopup(false);
                  }}
                  className="w-full bg-zinc-950/10 hover:bg-zinc-950/20 active:scale-[0.97] transition-all py-2 px-4 rounded-[14px] flex items-center justify-center gap-2 text-zinc-900 font-bold text-xs select-none focus:outline-none cursor-pointer"
                >
                  <LogOut size={13} strokeWidth={2.4} />
                  <span>Logout {currentUser?.fullName || 'User'}</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 2. System and Status Pill - SYNCED DYNAMICALLY TO THE CHOSEN PRESET SIZE */}
        <div 
          id="dock-system-pill"
          className={`pointer-events-auto flex items-center justify-center bg-[#7b6db5] border border-white/20 rounded-2xl shadow-xl shadow-purple-950/10 font-sans transition-all duration-300 ${activeSizes.dock}`}
        >
          {/* Time & Date Group (Clickable to toggle Left Popup) */}
          <button 
            onClick={() => {
              setShowPopup(!showPopup);
              setShowRightPopup(false);
              setShowAppDirectoryPopup(false);
            }}
            className={`cursor-pointer hover:bg-white/10 active:bg-white/20 rounded-xl transition-all focus:outline-none ${
              showPopup ? 'bg-white/10' : ''
            } ${activeSizes.timeDateBtn}`}
            title="Calendar & Settings"
          >
            <span className={`font-bold tracking-tight text-[#18181b] tabular-nums leading-none ${activeSizes.timeText}`}>{formatTime(time)}</span>
            <span className={`font-semibold text-[#18181b]/70 tracking-tight leading-none ${activeSizes.dateText}`}>{formatDate(time)}</span>
          </button>

          {/* Separator */}
          <div className={`w-[1px] bg-[#18181b]/15 self-center transition-all duration-300 ${activeSizes.sepHeight}`} />

          {/* System Icons Group */}
          <button 
            onClick={() => {
              setShowRightPopup(!showRightPopup);
              setShowPopup(false);
              setShowAppDirectoryPopup(false);
            }}
            className={`cursor-pointer hover:bg-white/10 active:bg-white/20 rounded-xl transition-all focus:outline-none ${
              showRightPopup ? 'bg-white/10' : ''
            } ${activeSizes.systemBtn} ${activeSizes.systemIconGap}`}
            title="System & Notifications Panel"
          >
            {/* Notification Icon */}
            {notificationsMuted ? (
              <BellOff size={activeSizes.iconSize} strokeWidth={2.4} className="text-[#18181b]/50 transition-all shrink-0" />
            ) : (
              <div className="relative shrink-0 flex items-center justify-center">
                <Bell size={activeSizes.iconSize} strokeWidth={2.4} className="text-[#18181b] transition-all" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
            )}

            {/* Workspace status */}
            <div className="flex items-center gap-1.5 text-[#18181b] shrink-0">
              <Monitor size={activeSizes.monitorSize} strokeWidth={2.4} className="transition-all" />
              <span className={`font-extrabold tracking-tight transition-all ${activeSizes.statusText}`}>{currentDesktop}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
