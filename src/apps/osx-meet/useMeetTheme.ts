import { useMemo } from 'react';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import type { AppThemeChoice } from '../../platform/theme/appTheme';

/**
 * OSX Meet's palette, mirroring `apps/messages/useMessengerTheme.ts`.
 *
 * The light/dark *decision* is the shared one every window makes
 * (`platform/theme`); this only supplies the concrete class strings the
 * redesigned Meet chrome paints with, replacing the ad hoc
 * `isLight ? '...' : '...'` branches that used to be scattered through
 * `index.tsx`.
 */
export type MeetThemeChoice = AppThemeChoice;

export interface MeetPalette {
  isDark: boolean;
  /** The call stage background, behind the tile grid. */
  stageBg: string;
  /** The in-call top bar. */
  topBarBg: string;
  topBarBorder: string;
  /** Lobby/pre-meeting surface cards. */
  panelBg: string;
  panelBorder: string;
  /** A participant tile's resting frame. */
  tileBg: string;
  tileBorder: string;
  /** The floating control bar pill. */
  controlBarBg: string;
  controlBarBorder: string;
  controlButtonIdle: string;
  controlButtonIdleHover: string;
  controlButtonActive: string;
  controlButtonActiveHover: string;
  /** The hang-up button. */
  dangerBg: string;
  dangerHoverBg: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  hover: string;
  inputBg: string;
  border: string;
}

const LIGHT: MeetPalette = {
  isDark: false,
  stageBg: 'bg-[#f4f4f7]',
  topBarBg: 'bg-white/95',
  topBarBorder: 'border-slate-200',
  panelBg: 'bg-white',
  panelBorder: 'border-slate-200/90',
  tileBg: 'bg-zinc-900',
  tileBorder: 'border-slate-200/70',
  controlBarBg: 'bg-white/95',
  controlBarBorder: 'border-slate-200',
  controlButtonIdle: 'bg-slate-100 text-slate-700',
  controlButtonIdleHover: 'hover:bg-slate-200',
  controlButtonActive: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
  controlButtonActiveHover: 'hover:bg-red-600',
  dangerBg: 'bg-red-600 text-white',
  dangerHoverBg: 'hover:bg-red-500',
  text: 'text-slate-900',
  textMuted: 'text-slate-500',
  textSubtle: 'text-slate-400',
  hover: 'hover:bg-slate-100',
  inputBg: 'bg-slate-100/80 border-slate-300/80 text-slate-900',
  border: 'border-slate-200',
};

const DARK: MeetPalette = {
  isDark: true,
  stageBg: 'bg-zinc-950',
  topBarBg: 'bg-zinc-900/90',
  topBarBorder: 'border-zinc-800',
  panelBg: 'bg-[#24232a]',
  panelBorder: 'border-white/10',
  tileBg: 'bg-zinc-900',
  tileBorder: 'border-zinc-800',
  controlBarBg: 'bg-zinc-900/95',
  controlBarBorder: 'border-white/10',
  controlButtonIdle: 'bg-zinc-800 text-white',
  controlButtonIdleHover: 'hover:bg-zinc-700',
  controlButtonActive: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
  controlButtonActiveHover: 'hover:bg-red-600',
  dangerBg: 'bg-red-600 text-white',
  dangerHoverBg: 'hover:bg-red-500',
  text: 'text-white',
  textMuted: 'text-white/60',
  textSubtle: 'text-white/40',
  hover: 'hover:bg-white/10',
  inputBg: 'bg-black/30 border-white/15 text-white',
  border: 'border-white/10',
};

export function useMeetTheme(): {
  palette: MeetPalette;
  choice: MeetThemeChoice;
  setChoice: (choice: MeetThemeChoice) => void;
} {
  const { choice, setChoice, isDark } = useAppTheme('meeting');
  const palette = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  return { palette, choice, setChoice };
}
