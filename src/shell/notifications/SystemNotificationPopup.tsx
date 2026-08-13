import React from 'react';
import { X, Check, Sun, Moon, Bell, BellOff, LogOut, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useSystemStore } from '../state/systemStore';
import { DockPopupPanel, DockPopupCard } from '../taskbar/DockPopupPanel';
import { User, SystemNotification } from '../../platform/types';

interface SystemNotificationPopupProps {
  onClose: () => void;
  notificationsMuted: boolean;
  setNotificationsMuted: (muted: boolean) => void;
  currentUser: User | null;
  logout: () => void;
}

export default function SystemNotificationPopup({
  onClose,
  notificationsMuted,
  setNotificationsMuted,
  currentUser,
  logout,
}: SystemNotificationPopupProps) {
  const theme = useSystemStore((state) => state.settings.theme);
  const setSettings = useSystemStore((state) => state.setSettings);
  const notifications = useSystemStore((state) => state.notifications);
  const removeNotification = useSystemStore((state) => state.removeNotification);
  const clearNotifications = useSystemStore((state) => state.clearNotifications);

  const isLight = theme === 'classic-light';
  const isDarkMode = theme === 'modern-dark';

  return (
    <DockPopupPanel
      id="dock-system-notifications-panel"
      position="right"
      widthClass="w-[310px]"
      onClose={onClose}
    >
      {/* =========================================================
          SECTION 1: SYSTEM NOTIFICATIONS
         ========================================================= */}
      <DockPopupCard className="gap-2">
        <div className="flex items-center justify-between px-0.5 select-none">
          <span
            className={`text-[10px] font-extrabold tracking-wider uppercase ${
              isLight ? 'text-slate-500' : 'text-white/60'
            }`}
          >
            System Notifications ({notifications.length})
          </span>
          {notifications.length > 0 && (
            <button
              onClick={() => clearNotifications()}
              className={`text-[10px] font-bold transition-colors focus:outline-none cursor-pointer ${
                isLight ? 'text-blue-600 hover:text-blue-800' : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-0.5 custom-scrollbar">
          {notifications.length > 0 ? (
            notifications.map((n) => {
              const isError = n.type === 'error';
              const isWarning = n.type === 'warning';
              const isSuccess = n.type === 'success';

              return (
                <div
                  key={n.id}
                  className={`p-2 rounded-xl border flex items-start gap-2 group relative transition-colors ${
                    isError
                      ? isLight
                        ? 'bg-red-50/90 border-red-200 hover:bg-red-100/90'
                        : 'bg-red-950/40 border-red-500/30 hover:bg-red-900/40'
                      : isWarning
                      ? isLight
                        ? 'bg-amber-50/90 border-amber-200 hover:bg-amber-100/90'
                        : 'bg-amber-950/40 border-amber-500/30 hover:bg-amber-900/40'
                      : isLight
                      ? 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isError ? (
                      <AlertCircle size={14} className="text-red-500" />
                    ) : isWarning ? (
                      <AlertTriangle size={14} className="text-amber-500" />
                    ) : isSuccess ? (
                      <CheckCircle size={14} className="text-emerald-500" />
                    ) : (
                      <Info size={14} className="text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-bold truncate ${
                          isError
                            ? 'text-red-600 dark:text-red-400'
                            : isLight
                            ? 'text-slate-800'
                            : 'text-white/90'
                        }`}
                      >
                        {n.sender}
                      </span>
                      <span
                        className={`text-[9px] shrink-0 select-none ${
                          isLight ? 'text-slate-400' : 'text-white/40'
                        }`}
                      >
                        {n.time}
                      </span>
                    </div>
                    <p
                      className={`text-xs font-medium leading-snug mt-0.5 break-words ${
                        isError
                          ? 'text-red-700 dark:text-red-300'
                          : isLight
                          ? 'text-slate-600'
                          : 'text-white/70'
                      }`}
                    >
                      {n.text}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(n.id);
                    }}
                    className={`p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 shrink-0 self-center focus:outline-none cursor-pointer ${
                      isLight
                        ? 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                        : 'hover:bg-white/10 text-white/40 hover:text-white'
                    }`}
                    title="Dismiss Notification"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center select-none">
              <Check
                size={18}
                className={`mb-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}
              />
              <span
                className={`text-xs font-bold ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}
              >
                All caught up!
              </span>
            </div>
          )}
        </div>
      </DockPopupCard>

      {/* =========================================================
          SECTION 2: FAST CONTROL TOGGLES
         ========================================================= */}
      <DockPopupCard className="gap-2">
        <span
          className={`text-[10px] font-extrabold tracking-wider uppercase px-0.5 select-none ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}
        >
          Quick Controls
        </span>

        <div className="grid grid-cols-2 gap-2">
          {/* Theme Toggle (Dark Mode) */}
          <button
            onClick={() => {
              setSettings((prev) => ({
                ...prev,
                theme: prev.theme === 'modern-dark' ? 'classic-light' : 'modern-dark',
              }));
            }}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 text-center focus:outline-none select-none cursor-pointer ${
              isDarkMode
                ? 'bg-blue-600/20 border-blue-500/30 text-white'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
            }`}
          >
            {isDarkMode ? (
              <Moon size={16} className="mb-1 text-blue-400" />
            ) : (
              <Sun size={16} className="mb-1 text-amber-500" />
            )}
            <span className="text-xs font-bold leading-tight">Dark Mode</span>
            <span
              className={`text-[9px] mt-0.5 font-semibold ${
                isLight ? 'text-slate-400' : 'text-white/50'
              }`}
            >
              {isDarkMode ? 'Enabled' : 'Disabled'}
            </span>
          </button>

          {/* Do Not Disturb (DND) */}
          <button
            onClick={() => setNotificationsMuted(!notificationsMuted)}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 text-center focus:outline-none select-none cursor-pointer ${
              notificationsMuted
                ? isLight
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
            }`}
          >
            {notificationsMuted ? (
              <BellOff size={16} className={`mb-1 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
            ) : (
              <Bell size={16} className="mb-1 text-blue-500 animate-pulse" />
            )}
            <span className="text-xs font-bold leading-tight">Silent Mode</span>
            <span
              className={`text-[9px] mt-0.5 font-semibold ${
                isLight ? 'text-slate-400' : 'text-white/50'
              }`}
            >
              {notificationsMuted ? 'Muted' : 'Normal'}
            </span>
          </button>
        </div>
      </DockPopupCard>

      {/* =========================================================
          SECTION 3: LOGOUT ACTION
         ========================================================= */}
      <button
        onClick={() => {
          logout();
          onClose();
        }}
        className={`w-full py-2.5 px-4 rounded-[16px] flex items-center justify-center gap-2 font-bold text-xs select-none focus:outline-none cursor-pointer transition-all active:scale-[0.97] border ${
          isLight
            ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
            : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-300'
        }`}
      >
        <LogOut size={14} strokeWidth={2.2} />
        <span>Logout {currentUser?.fullName || 'User'}</span>
      </button>
    </DockPopupPanel>
  );
}
