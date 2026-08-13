import React from 'react';
import { useSystemStore } from '../state/systemStore';

export interface WindowStatusBarProps {
  id?: string;
  appId?: string;
  leftInfo?: React.ReactNode;
  centerInfo?: React.ReactNode;
  rightInfo?: React.ReactNode;
  showFrameInfo?: boolean;
  className?: string;
}

export default function WindowStatusBar({
  id,
  appId,
  leftInfo,
  centerInfo,
  rightInfo,
  showFrameInfo = true,
  className = '',
}: WindowStatusBarProps) {
  const windows = useSystemStore((state) => state.windows);
  const settings = useSystemStore((state) => state.settings);
  const activeTheme = settings.theme || 'classic-light';

  const appWindow = appId ? windows.find((w) => w.id === appId) : undefined;
  const elementId = id || (appId ? `win-statusbar-${appId}` : 'window-status-bar');

  const themeClasses = {
    'classic-light': 'bg-white/35 border-t border-[#211625]/10 text-[#211625]/80',
    'modern-dark': 'bg-black/35 border-t border-white/10 text-white/70',
    'retro-terminal': 'bg-black/45 border-t border-green-500/25 text-[#22c55e]/80 font-mono',
  };

  const themeStyle = themeClasses[activeTheme] || themeClasses['classic-light'];

  return (
    <div
      id={elementId}
      className={`h-7 px-3.5 flex items-center justify-between text-[11px] font-medium select-none shrink-0 gap-3 border-t transition-colors ${themeStyle} ${className}`}
    >
      {/* Left section */}
      <div id={`${elementId}-left`} className="flex items-center gap-1.5 shrink-0 truncate">
        {leftInfo || (appWindow ? <span>{appWindow.title}</span> : null)}
      </div>

      {/* Center section */}
      <div id={`${elementId}-center`} className="truncate text-center flex-1 min-w-0">
        {centerInfo}
      </div>

      {/* Right section (Custom Right Info + Window Frame Dimensions) */}
      <div id={`${elementId}-right`} className="flex items-center gap-2.5 shrink-0 text-[10px]">
        {rightInfo}
        {showFrameInfo && appWindow && (
          <div
            id={`${elementId}-frame-size`}
            className="flex items-center gap-1.5 opacity-80 border-l border-current/15 pl-2.5 font-mono"
          >
            <span>
              Frame: {appWindow.isMaximized ? 'Maximized' : `${Math.round(appWindow.w)} × ${Math.round(appWindow.h)} px`}
            </span>
            <span className="opacity-40">|</span>
            <span>
              Pos: ({Math.round(appWindow.x)}, {Math.round(appWindow.y)})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
