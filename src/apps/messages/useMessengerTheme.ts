import { useMemo } from 'react';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import type { AppThemeChoice } from '../../platform/theme/appTheme';

/**
 * Messenger's palette.
 *
 * The *decision* — light or dark — is the shared one every window makes, from
 * `platform/theme`. All this adds is the concrete set of classes Messenger
 * paints with, which is the only part that is Messenger's business.
 */
export type MessengerThemeChoice = AppThemeChoice;

export interface MessengerPalette {
  isDark: boolean;
  appBg: string;
  sidebarBg: string;
  chatBg: string;
  panelBg: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  hover: string;
  activeItem: string;
  inputBg: string;
  bubbleMine: string;
  bubbleTheirs: string;
}

const LIGHT: MessengerPalette = {
  isDark: false,
  appBg: 'bg-white',
  sidebarBg: 'bg-slate-50',
  chatBg: 'bg-white',
  panelBg: 'bg-white',
  border: 'border-slate-200',
  text: 'text-slate-900',
  textMuted: 'text-slate-600',
  textSubtle: 'text-slate-400',
  hover: 'hover:bg-slate-100',
  activeItem: 'bg-blue-50 border-blue-300',
  inputBg: 'bg-white border-slate-300',
  bubbleMine: 'bg-blue-600 text-white',
  bubbleTheirs: 'bg-slate-100 text-slate-800 border border-slate-200',
};

const DARK: MessengerPalette = {
  isDark: true,
  appBg: 'bg-[#0f172a]',
  sidebarBg: 'bg-[#1e293b]',
  chatBg: 'bg-[#0b1329]',
  panelBg: 'bg-[#1e293b]',
  border: 'border-slate-700/60',
  text: 'text-slate-100',
  textMuted: 'text-slate-400',
  textSubtle: 'text-slate-500',
  hover: 'hover:bg-slate-800/60',
  activeItem: 'bg-blue-600/20 border-blue-500/40',
  inputBg: 'bg-slate-900 border-slate-700',
  bubbleMine: 'bg-blue-600 text-white',
  bubbleTheirs: 'bg-slate-800 text-slate-100 border border-slate-700/60',
};

export function useMessengerTheme(): {
  palette: MessengerPalette;
  choice: MessengerThemeChoice;
  setChoice: (choice: MessengerThemeChoice) => void;
} {
  const { choice, setChoice, isDark } = useAppTheme('messenger');
  const palette = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  return { palette, choice, setChoice };
}
