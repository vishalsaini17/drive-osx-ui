import { baseThemeFor, globalThemeIsDark, type ThemeId } from './themes';

export { globalThemeIsDark } from './themes';

/** Structural, to avoid a cycle: `types.ts` imports the theme catalogue. */
type AppPreferences = Record<string, Record<string, any>> | undefined;

/**
 * How an application decides whether it renders light or dark.
 *
 * There are two independent inputs — the desktop's own theme, chosen in
 * Settings → Appearance → Theme, and the operating system's `prefers-color-scheme`
 * — so an application needs to say *which* it follows. Hence four choices
 * rather than three:
 *
 *  - `theme`  follow the global desktop theme (the default)
 *  - `light`  pinned light, whatever anything else says
 *  - `dark`   pinned dark, whatever anything else says
 *  - `system` follow the operating system
 *
 * `theme` is the default so a freshly opened window looks like the rest of the
 * desktop and changing the global theme carries every application with it.
 */
export type AppThemeChoice = 'theme' | 'light' | 'dark' | 'system';

/** What a choice actually resolves to once every input is known. */
export type ResolvedTheme = 'light' | 'dark';

export const DEFAULT_APP_THEME_CHOICE: AppThemeChoice = 'theme';

/** The menu/settings presentation of the four choices, in one place. */
export const APP_THEME_CHOICES: ReadonlyArray<{
  value: AppThemeChoice;
  label: string;
  description: string;
}> = [
  { value: 'theme', label: 'Theme', description: 'Follow the global theme from Settings → Appearance.' },
  { value: 'light', label: 'Light', description: 'Always light, whatever the desktop is set to.' },
  { value: 'dark', label: 'Dark', description: 'Always dark, whatever the desktop is set to.' },
  { value: 'system', label: 'System', description: "Follow the operating system's light or dark setting." },
];

/** Where an application's choice is stored inside `appPreferences[appId]`. */
export const APP_THEME_PREFERENCE_KEY = 'themeChoice';

/**
 * The key this setting used before the four-option model existed. It is read
 * for migration and never written again.
 */
export const LEGACY_APP_THEME_KEY = 'theme';

function isAppThemeChoice(value: unknown): value is AppThemeChoice {
  return value === 'theme' || value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Reads an application's stored choice, migrating the older three-option value.
 *
 * The previous model stored `theme: 'system' | 'light' | 'dark'`, where
 * `'system'` meant *follow the desktop* — never the operating system. That is
 * exactly what `'theme'` means now, so the old value maps across without
 * changing what an existing user sees the next time they open the app.
 */
export function readAppThemeChoice(
  preferences: Record<string, unknown> | undefined
): AppThemeChoice {
  const stored = preferences?.[APP_THEME_PREFERENCE_KEY];
  if (isAppThemeChoice(stored)) return stored;

  const legacy = preferences?.[LEGACY_APP_THEME_KEY];
  if (legacy === 'light' || legacy === 'dark') return legacy;
  if (legacy === 'system') return 'theme';

  return DEFAULT_APP_THEME_CHOICE;
}

export interface AppThemeInputs {
  choice: AppThemeChoice;
  globalTheme: ThemeId | undefined;
  osPrefersDark: boolean;
}

/** Resolves a choice down to the single question an application asks: light or dark? */
export function resolveAppTheme({ choice, globalTheme, osPrefersDark }: AppThemeInputs): ResolvedTheme {
  if (choice === 'light') return 'light';
  if (choice === 'dark') return 'dark';
  if (choice === 'system') return osPrefersDark ? 'dark' : 'light';
  return globalThemeIsDark(globalTheme) ? 'dark' : 'light';
}

/**
 * The concrete desktop theme a window's chrome should use.
 *
 * `theme` passes the global theme through unchanged, which is what lets a
 * window wear Amber Terminal or Ember rather than a generic dark: collapsing to
 * "dark" would throw away everything that makes those themes distinct. Any
 * other choice is an explicit override and maps onto the two plain themes.
 */
export function resolveWindowTheme(inputs: AppThemeInputs): ThemeId {
  if (inputs.choice === 'theme') return inputs.globalTheme ?? 'classic-light';
  return resolveAppTheme(inputs) === 'dark' ? 'modern-dark' : 'classic-light';
}

/**
 * The same answer, reduced to one of the three original theme ids.
 *
 * For surfaces that still carry their own class map keyed by those ids: a new
 * theme renders as its family rather than falling through to light.
 */
export function resolveChromeTheme(inputs: AppThemeInputs): ThemeId {
  return baseThemeFor(resolveWindowTheme(inputs));
}

/**
 * Writes a choice into `appPreferences`, returning the whole replacement map.
 *
 * Kept pure so the store update stays a one-liner and the migration rule has a
 * single home: the superseded key is dropped once, so a preference cannot end
 * up described twice with two different answers.
 */
export function withAppThemeChoice(
  preferences: AppPreferences,
  appId: string,
  choice: AppThemeChoice
): AppPreferences {
  const existing = { ...(preferences?.[appId] ?? {}) };

  const legacy = existing[LEGACY_APP_THEME_KEY];
  if (legacy === 'system' || legacy === 'light' || legacy === 'dark') {
    delete existing[LEGACY_APP_THEME_KEY];
  }

  return {
    ...preferences,
    [appId]: { ...existing, [APP_THEME_PREFERENCE_KEY]: choice },
  };
}

/** One-line explanation of what an application is currently doing, for the UI. */
export function describeAppTheme(inputs: AppThemeInputs, appTitle: string): string {
  const resolved = resolveAppTheme(inputs);
  switch (inputs.choice) {
    case 'light':
    case 'dark':
      return `${appTitle} stays ${inputs.choice} whatever the desktop is set to.`;
    case 'system':
      return `${appTitle} follows your operating system, which is currently ${resolved}.`;
    default:
      return `${appTitle} follows the global theme, which is currently ${resolved}.`;
  }
}
