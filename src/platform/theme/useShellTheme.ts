import { useMemo } from 'react';
import { useSystemStore } from '../../shell/state/systemStore';
import {
  themeById,
  themeFamily,
  themeSurfaces,
  type ThemeFamily,
  type ThemeSurfaces,
} from './themes';

/**
 * The surface treatment for shell chrome — dock, top bar, popups, menus,
 * notification centre, application menu.
 *
 * Distinct from `useAppTheme`, and deliberately so: the shell is not a window
 * and has no per-application preference. It always follows the global theme,
 * because a dock that disagreed with the desktop behind it would be the one
 * inconsistency the user could never explain.
 */
export interface ShellTheme extends ThemeSurfaces {
  family: ThemeFamily;
  isDark: boolean;
  /** The user's accent, falling back to the theme's own. */
  accentColor: string;
}

export function useShellTheme(): ShellTheme {
  const theme = useSystemStore((state) => state.settings.theme);
  const accentColor = useSystemStore((state) => state.settings.accentColor);

  return useMemo(() => {
    const surfaces = themeSurfaces(theme);
    const family = themeFamily(theme);
    return {
      ...surfaces,
      family,
      isDark: family !== 'light',
      accentColor: accentColor || themeById(theme).accent,
    };
  }, [theme, accentColor]);
}

export default useShellTheme;
