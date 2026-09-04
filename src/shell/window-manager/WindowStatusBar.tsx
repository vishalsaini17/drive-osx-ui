import React, { useCallback } from 'react';
import { useSystemStore } from '../state/systemStore';
import { useWindowStatusContext } from './WindowStatusContext';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import { themeChrome } from '../../platform/theme/themes';

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
  // Follows the same per-window preference as the chrome above it, so a footer
  // never ends up light inside a window the user pinned to dark.
  const activeTheme = useAppTheme(appId ?? '').windowTheme;

  // Applications publish their status content through <WindowStatus />, which
  // portals into the section containers registered below.
  const statusCtx = useWindowStatusContext();
  const setContainer = statusCtx?.setContainer;
  const filled = statusCtx?.filled;

  const setLeftContainer = useCallback(
    (el: HTMLDivElement | null) => setContainer?.('left', el),
    [setContainer]
  );
  const setCenterContainer = useCallback(
    (el: HTMLDivElement | null) => setContainer?.('center', el),
    [setContainer]
  );
  const setRightContainer = useCallback(
    (el: HTMLDivElement | null) => setContainer?.('right', el),
    [setContainer]
  );

  const appWindow = appId ? windows.find((w) => w.id === appId) : undefined;
  const elementId = id || (appId ? `win-statusbar-${appId}` : 'window-status-bar');

  const themeStyle = themeChrome(activeTheme).statusBar;

  // The window title is only a fallback: it steps aside as soon as the
  // application publishes its own left-hand status content.
  const showTitleFallback = !leftInfo && !filled?.left && !!appWindow;

  return (
    <div
      id={elementId}
      className={`h-7 px-3.5 flex items-center justify-between text-[11px] font-medium select-none shrink-0 gap-3 border-t transition-colors ${themeStyle} ${className}`}
    >
      {/* Left section */}
      <div id={`${elementId}-left`} className="flex items-center gap-1.5 shrink-0 truncate">
        {leftInfo}
        <div ref={setLeftContainer} className="contents" />
        {showTitleFallback && <span>{appWindow.title}</span>}
      </div>

      {/* Center section */}
      <div id={`${elementId}-center`} className="truncate text-center flex-1 min-w-0">
        {centerInfo}
        <div ref={setCenterContainer} className="contents" />
      </div>

      {/* Right section (Custom Right Info + Window Frame Dimensions) */}
      <div id={`${elementId}-right`} className="flex items-center gap-2.5 shrink-0 text-[10px]">
        {rightInfo}
        <div ref={setRightContainer} className="contents" />
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
