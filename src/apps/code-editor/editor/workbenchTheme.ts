import type { EditorThemeName } from './themes';

/**
 * The workbench chrome (activity bar, sidebar, tabs, breadcrumb, settings,
 * modals) used to be hardcoded to VS Code Dark+ colors regardless of the
 * selected `editorTheme` — only the Monaco pane itself actually switched.
 * Picking a light theme (Classic Light, Solarized) left the surrounding UI
 * dark, which read as broken. These CSS custom properties drive every color
 * in that chrome instead, resolved here per theme and applied once via
 * `style` on the app's root element (see index.tsx) so they cascade to
 * everything, including the Open File/Open Folder modals rendered outside
 * `AppShell`.
 *
 * `--wb-fg`/`--wb-border-*` are deliberately reused with Tailwind's opacity
 * modifier (e.g. `text-[var(--wb-fg)]/60`) the same way `text-white/60` was
 * used before — Tailwind v4 resolves opacity on arbitrary `var()` colors via
 * `color-mix()`, so one near-white/near-black base still produces a full
 * text-emphasis hierarchy in both themes.
 */
export function getWorkbenchVars(themeName: EditorThemeName): Record<string, string> {
  const isDark = themeName === 'Monokai' || themeName === 'VS-Dark';

  return isDark
    ? {
        '--wb-surface': '#1e1e1e',
        '--wb-surface-raised': '#252526',
        '--wb-surface-sunken': '#333333',
        '--wb-surface-overlay': '#2d2d2d',
        '--wb-control-bg': '#3c3c3c',
        '--wb-control-bg-hover': '#4a4a4a',
        '--wb-tab-hover': '#2a2a2a',
        '--wb-selected': '#37373d',
        '--wb-fg': '#ffffff',
        '--wb-border-strong': 'rgba(0, 0, 0, 0.4)',
        '--wb-border-subtle': 'rgba(255, 255, 255, 0.1)',
        '--wb-drag-over': '#04395e',
        '--wb-match-bg': '#613214',
        '--wb-match-fg': '#ffd479',
        '--wb-status-bg': '#007acc',
        '--wb-accent': '#007acc',
        '--wb-accent-hover': '#1177bb',
        '--wb-accent-soft': '#0e639c',
        '--wb-on-accent': '#ffffff',
        '--wb-folder': '#dcb67a',
      }
    : {
        '--wb-surface': '#ffffff',
        '--wb-surface-raised': '#f3f3f3',
        '--wb-surface-sunken': '#e8e8e8',
        '--wb-surface-overlay': '#ececec',
        '--wb-control-bg': '#ffffff',
        '--wb-control-bg-hover': '#e2e2e2',
        '--wb-tab-hover': '#e2e2e2',
        '--wb-selected': '#e4e6f1',
        '--wb-fg': '#1f1f1f',
        '--wb-border-strong': '#dcdcdc',
        '--wb-border-subtle': 'rgba(0, 0, 0, 0.08)',
        '--wb-drag-over': '#d3e8fb',
        '--wb-match-bg': '#ffe08a',
        '--wb-match-fg': '#4d3a00',
        '--wb-status-bg': '#007acc',
        '--wb-accent': '#007acc',
        '--wb-accent-hover': '#1177bb',
        '--wb-accent-soft': '#0e639c',
        '--wb-on-accent': '#ffffff',
        '--wb-folder': '#dcb67a',
      };
}
