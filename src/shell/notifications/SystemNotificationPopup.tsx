import React from 'react';
import { X, Check, Sun, Moon, Bell, BellOff, BellRing, LogOut, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { themeFamily, themeForMode } from '../../platform/theme/themes';
import { useShellTheme } from '../../platform/theme/useShellTheme';
import { useSystemStore } from '../state/systemStore';
import { DockPopupPanel, DockPopupCard, DockPopupSectionLabel } from '../taskbar/DockPopupPanel';
import { SystemNotifier, type NotificationPermissionState } from '../../platform/notifications/SystemNotifier';
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

  const shell = useShellTheme();
  const family = themeFamily(theme);
  const isLight = family === 'light';
  const isDarkMode = family === 'dark';

  // Read once on open rather than held in a store: the browser owns this value
  // and the user can change it in site settings without telling the page.
  const [desktopAlerts, setDesktopAlerts] = React.useState<NotificationPermissionState>(() =>
    SystemNotifier.permission(),
  );

  /**
   * How tall the notification list is allowed to grow.
   *
   * `maxHeight` never *adds* space, so a short list stays exactly as tall as
   * its contents — the list is sized by what is in it. The cap only stops a
   * long list from pushing the Quick Controls and Logout off the screen.
   *
   * It is derived from the count rather than being a single fixed number so
   * that one unusually long message cannot claim the whole allowance while
   * three short ones sit under a needless scrollbar. The previous fixed 180px
   * showed barely two notifications however many had arrived.
   */
  const listMaxHeight = React.useMemo(() => {
    if (notifications.length === 0) return undefined;

    const ROW_HEIGHT = 58; // A single-line notification, including its padding.
    const ROW_GAP = 6; // gap-1.5
    const estimate = notifications.length * ROW_HEIGHT + (notifications.length - 1) * ROW_GAP;

    // Grow with the content, but never past the share of the viewport that
    // leaves the rest of the panel usable. `min()` resolves in the browser, so
    // this stays correct when the window is resized.
    return `min(${estimate}px, 46vh)`;
  }, [notifications.length]);

  return (
    <DockPopupPanel
      id="dock-system-notifications-panel"
      position="right"
      // Matches the Time panel, so the two read as one system rather than two
      // differently sized popups hanging off the same dock.
      widthClass="w-[335px]"
      onClose={onClose}
    >
      {/* =========================================================
          SECTION 1: SYSTEM NOTIFICATIONS
         ========================================================= */}
      <DockPopupCard className="gap-2">
        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5">
            <DockPopupSectionLabel>Notifications</DockPopupSectionLabel>
            {/* The count as a pill, matching the Time panel's event counter. */}
            <span
              style={
                notifications.length > 0
                  ? { backgroundColor: `${shell.accentColor}22`, color: shell.accentColor }
                  : undefined
              }
              className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full font-bold ${
                notifications.length > 0
                  ? ''
                  : `${shell.card} ${shell.textSubtle}`
              }`}
            >
              {notifications.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={() => clearNotifications()}
                style={{ color: shell.accentColor }}
                className="text-[11px] font-semibold transition-opacity hover:opacity-75 focus:outline-none cursor-pointer"
              >
                Clear All
              </button>
            )}
            {/* The Time panel offers the same affordance in the same position;
                only one of the two used to have it. */}
            <button
              onClick={onClose}
              className={`p-1 rounded-full transition-colors cursor-pointer opacity-60 hover:opacity-100 ${shell.hover} ${shell.textMuted}`}
              title="Close panel"
              aria-label="Close notifications"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div
          className="flex flex-col gap-1.5 overflow-y-auto pr-0.5 custom-scrollbar"
          style={{ maxHeight: listMaxHeight }}
        >
          {notifications.length > 0 ? (
            notifications.map((n) => {
              const isError = n.type === 'error';
              const isWarning = n.type === 'warning';
              const isSuccess = n.type === 'success';

              return (
                <div
                  key={n.id}
                  className={`p-2 rounded-xl flex items-start gap-2 group relative transition-colors ${
                    isError
                      ? isLight
                        ? 'bg-red-50/90 border border-red-200 hover:bg-red-100/90'
                        : 'bg-red-950/40 border border-red-500/30 hover:bg-red-900/40'
                      : isWarning
                      ? isLight
                        ? 'bg-amber-50/90 border border-amber-200 hover:bg-amber-100/90'
                        : 'bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/40'
                      : `${shell.card} ${shell.cardHover}`
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
                          shell.textSubtle
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
            // Compact by design: with nothing to show, this should not reserve
            // the space a full list would have taken.
            <div className="flex flex-col items-center justify-center py-4 text-center select-none">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                  isLight ? 'bg-emerald-500/10' : 'bg-emerald-500/15'
                }`}
              >
                <Check size={15} className="text-emerald-500" strokeWidth={2.5} />
              </div>
              <span className={`text-xs font-bold ${shell.textMuted}`}>
                All caught up
              </span>
              <span className={`text-[10px] mt-0.5 ${shell.textSubtle}`}>
                No new notifications
              </span>
            </div>
          )}
        </div>
      </DockPopupCard>

      {/* =========================================================
          SECTION 2: FAST CONTROL TOGGLES
         ========================================================= */}
      <DockPopupCard className="gap-2">
        <DockPopupSectionLabel>Quick Controls</DockPopupSectionLabel>

        {/* Browsers only grant notification permission from a user gesture, and
            some permanently block an origin that asks unprompted on load — so
            it is asked for here, on a deliberate click, rather than at startup. */}
        {desktopAlerts === 'default' && (
          <button
            onClick={async () => setDesktopAlerts(await SystemNotifier.requestPermission())}
            className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all active:scale-[0.98] text-left cursor-pointer ${
              isLight
                ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900'
                : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/25 text-blue-200'
            }`}
          >
            <BellRing size={15} className="shrink-0 text-blue-500" />
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-bold leading-tight">Enable desktop alerts</span>
              <span className={`block text-[10px] mt-0.5 ${isLight ? 'text-blue-700/70' : 'text-blue-200/60'}`}>
                Get new messages in your system notifications
              </span>
            </span>
          </button>
        )}

        {desktopAlerts === 'denied' && (
          <p className={`text-[10px] leading-relaxed px-0.5 ${shell.textSubtle}`}>
            Desktop alerts are blocked for this site. Allow notifications in your browser's site
            settings to get messages while Messenger is closed.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Theme Toggle (Dark Mode) */}
          <button
            onClick={() => {
              setSettings((prev) => ({
                ...prev,
                theme: themeForMode(prev.theme, isDarkMode ? 'light' : 'dark'),
              }));
            }}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 text-center focus:outline-none select-none cursor-pointer ${
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
                shell.textSubtle
              }`}
            >
              {isDarkMode ? 'Enabled' : 'Disabled'}
            </span>
          </button>

          {/* Do Not Disturb (DND) */}
          <button
            onClick={() => setNotificationsMuted(!notificationsMuted)}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 text-center focus:outline-none select-none cursor-pointer ${
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
                shell.textSubtle
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
        className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs select-none focus:outline-none cursor-pointer transition-all active:scale-[0.97] border ${
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
