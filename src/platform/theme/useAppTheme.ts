import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useSystemStore } from '../../shell/state/systemStore';
import type { ThemeId } from './themes';
import {
  APP_THEME_CHOICES,
  type AppThemeChoice,
  type ResolvedTheme,
  describeAppTheme,
  globalThemeIsDark,
  readAppThemeChoice,
  resolveAppTheme,
  resolveChromeTheme,
  resolveWindowTheme,
  withAppThemeChoice,
} from './appTheme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToOsTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function osPrefersDarkSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * The operating system's light/dark preference, kept live.
 *
 * Subscribed rather than read once, so an application set to `system` follows
 * the OS switching at sunset without being reopened.
 */
export function useOsPrefersDark(): boolean {
  return useSyncExternalStore(subscribeToOsTheme, osPrefersDarkSnapshot, () => false);
}

export interface AppTheme {
  /** The stored preference. */
  choice: AppThemeChoice;
  setChoice: (choice: AppThemeChoice) => void;
  /** What the choice comes out as once the desktop and OS are taken into account. */
  resolved: ResolvedTheme;
  isDark: boolean;
  /** The concrete desktop theme this window's chrome should render with. */
  windowTheme: ThemeId;
  /**
   * The same answer reduced to one of the three original theme ids, for code
   * that still keys its own class map by them.
   */
  chromeTheme: ThemeId;
  /** Whether the desktop as a whole is dark, for explanatory copy. */
  globalIsDark: boolean;
  /** A sentence describing the current state, for menus and settings rows. */
  describe: (appTitle: string) => string;
  options: typeof APP_THEME_CHOICES;
}

/**
 * An application's theme, resolved from its own preference plus the two things
 * that preference can point at.
 *
 * Every value here is derived from store state or a live media query, so
 * changing the global theme in Settings updates open windows immediately —
 * there is nothing cached to invalidate.
 */
export function useAppTheme(appId: string): AppTheme {
  const globalTheme = useSystemStore((state) => state.settings.theme);
  const preferences = useSystemStore((state) => state.settings.appPreferences?.[appId]);
  const setSettings = useSystemStore((state) => state.setSettings);
  const osPrefersDark = useOsPrefersDark();

  const choice = useMemo(() => readAppThemeChoice(preferences), [preferences]);
  const inputs = useMemo(
    () => ({ choice, globalTheme, osPrefersDark }),
    [choice, globalTheme, osPrefersDark]
  );

  const setChoice = useCallback(
    (next: AppThemeChoice) =>
      setSettings((prev) => ({
        ...prev,
        appPreferences: withAppThemeChoice(prev.appPreferences, appId, next),
      })),
    [appId, setSettings]
  );

  return useMemo(
    () => ({
      choice,
      setChoice,
      resolved: resolveAppTheme(inputs),
      isDark: resolveAppTheme(inputs) === 'dark',
      windowTheme: resolveWindowTheme(inputs),
      chromeTheme: resolveChromeTheme(inputs),
      globalIsDark: globalThemeIsDark(globalTheme),
      describe: (appTitle: string) => describeAppTheme(inputs, appTitle),
      options: APP_THEME_CHOICES,
    }),
    [choice, setChoice, inputs, globalTheme]
  );
}

export { APP_THEME_CHOICES, type AppThemeChoice, type ResolvedTheme } from './appTheme';
