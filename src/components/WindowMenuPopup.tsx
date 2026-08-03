import React, { useEffect, useRef } from 'react';
import { useSystemStore } from '../systemStore';
import { WindowState } from '../types';

interface WindowMenuPopupProps {
  isOpen: boolean;
  onClose: () => void;
  app: WindowState;
  onOpenAbout: () => void;
  onOpenShortcuts: () => void;
  theme?: string;
}

export const WindowMenuPopup: React.FC<WindowMenuPopupProps> = ({
  isOpen,
  onClose,
  app,
  onOpenAbout,
  onOpenShortcuts,
  theme = 'classic-light',
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);

  // Close on outside click or ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Theme styles for popup matching image design
  const isDark = theme === 'modern-dark' || theme === 'retro-terminal';
  const isRetro = theme === 'retro-terminal';

  const containerClasses = isRetro
    ? 'bg-[#0a150d] border-emerald-500/30 text-emerald-400 shadow-emerald-900/30'
    : isDark
    ? 'bg-[#1e1a2e] border-white/15 text-slate-100 shadow-black/60'
    : 'bg-white/95 backdrop-blur-xl border-slate-200/80 text-slate-800 shadow-2xl';

  const itemHover = isRetro
    ? 'hover:bg-emerald-500/15 hover:text-emerald-300'
    : isDark
    ? 'hover:bg-white/10 hover:text-white'
    : 'hover:bg-slate-100/90 hover:text-slate-900';

  const shortcutColor = isRetro
    ? 'text-emerald-500/70'
    : isDark
    ? 'text-slate-400'
    : 'text-slate-400';

  const dividerClass = isRetro
    ? 'border-emerald-500/20'
    : isDark
    ? 'border-white/10'
    : 'border-slate-100';

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={popupRef}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute left-0 top-full mt-1 z-[9999] w-64 rounded-2xl border p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 font-sans text-xs select-none ${containerClasses}`}
    >
      {/* Arrow Pointer */}
      <div
        className={`absolute -top-1.5 left-3 w-3 h-3 rotate-45 border-t border-l ${
          isRetro
            ? 'bg-[#0a150d] border-emerald-500/30'
            : isDark
            ? 'bg-[#1e1a2e] border-white/15'
            : 'bg-white border-slate-200/80'
        }`}
      />

      <div className="relative z-10 space-y-0.5">
        {/* New Window */}
        <button
          onClick={() =>
            handleAction(() => {
              openAppWindow(app.id);
            })
          }
          className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${itemHover}`}
        >
          <span className="font-medium">New Window</span>
          <span className={`text-[11px] font-mono ${shortcutColor}`}>Ctrl+N</span>
        </button>

        <div className={`my-1 border-t ${dividerClass}`} />

        {/* Undo (Disabled) */}
        <button
          disabled
          className="w-full px-3 py-1.5 rounded-xl flex items-center justify-between opacity-40 cursor-not-allowed text-left"
        >
          <span>Undo</span>
          <span className={`text-[11px] font-mono ${shortcutColor}`}>Ctrl+Z</span>
        </button>

        {/* Redo (Disabled) */}
        <button
          disabled
          className="w-full px-3 py-1.5 rounded-xl flex items-center justify-between opacity-40 cursor-not-allowed text-left"
        >
          <span>Redo</span>
          <span className={`text-[11px] font-mono ${shortcutColor}`}>Shift+Ctrl+Z</span>
        </button>

        <div className={`my-1 border-t ${dividerClass}`} />

        {/* Preferences */}
        <button
          onClick={() =>
            handleAction(() => {
              openAppWindow('settings');
            })
          }
          className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${itemHover}`}
        >
          <span className="font-medium">Preferences</span>
          <span className={`text-[11px] font-mono ${shortcutColor}`}>Ctrl+,</span>
        </button>

        {/* Keyboard Shortcuts */}
        <button
          onClick={() => handleAction(onOpenShortcuts)}
          className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${itemHover}`}
        >
          <span className="font-medium">Keyboard Shortcuts</span>
          <span className={`text-[11px] font-mono ${shortcutColor}`}>Ctrl+?</span>
        </button>

        {/* Help */}
        <button
          onClick={() =>
            handleAction(() => {
              openAppWindow('browser');
            })
          }
          className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${itemHover}`}
        >
          <span className="font-medium">Help</span>
          <span className={`text-[11px] font-mono ${shortcutColor}`}>F1</span>
        </button>

        {/* About [App Title] */}
        <button
          onClick={() => handleAction(onOpenAbout)}
          className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer font-medium ${itemHover}`}
        >
          <span>About {app.title}</span>
        </button>
      </div>
    </div>
  );
};

export default WindowMenuPopup;
