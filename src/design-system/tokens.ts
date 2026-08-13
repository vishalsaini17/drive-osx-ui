/**
 * Design tokens (CLAUDE.md §7).
 *
 * The single source of truth for the platform's visual language. Components
 * reference tokens rather than hard-coded values, so the whole environment —
 * shell and applications alike — changes together.
 *
 * Tokens are also emitted as CSS custom properties (see `cssVariables`) so
 * plain CSS and Tailwind arbitrary values can use the same values.
 */
export const color = {
  // Brand and accents
  accent: { subtle: '#dbeafe', default: '#3b82f6', strong: '#1d4ed8', contrast: '#ffffff' },
  // Semantic states — used consistently for sync, network and validation.
  success: { subtle: '#dcfce7', default: '#22c55e', strong: '#15803d' },
  warning: { subtle: '#fef3c7', default: '#f59e0b', strong: '#b45309' },
  danger: { subtle: '#fee2e2', default: '#ef4444', strong: '#b91c1c' },
  info: { subtle: '#e0f2fe', default: '#0ea5e9', strong: '#0369a1' },
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
  },
  size: {
    xs: '0.6875rem',
    sm: '0.8125rem',
    base: '0.875rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
  },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 },
} as const;

/** 4px base scale — every gap and inset is a multiple of it. */
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const;

export const radius = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
  window: '0.75rem',
} as const;

export const elevation = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
  md: '0 4px 12px rgba(15, 23, 42, 0.12)',
  lg: '0 12px 32px rgba(15, 23, 42, 0.18)',
  window: '0 24px 64px rgba(2, 6, 23, 0.35)',
  popover: '0 8px 24px rgba(2, 6, 23, 0.24)',
} as const;

export const motion = {
  duration: { instant: '80ms', fast: '140ms', normal: '220ms', slow: '360ms' },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
} as const;

/** Stacking order for the OS shell. Windows sit below the system surfaces. */
export const zIndex = {
  desktop: 0,
  window: 100,
  activeWindow: 200,
  dock: 300,
  topBar: 400,
  popover: 500,
  contextMenu: 600,
  dialog: 700,
  toast: 800,
} as const;

export const sizing = {
  topBarHeight: '1.75rem',
  dockHeight: '4rem',
  windowMinWidth: '320px',
  windowMinHeight: '240px',
  windowTitleBarHeight: '2.25rem',
  sidebarWidth: '15rem',
} as const;

/** Visible focus is a requirement, not a preference (CLAUDE.md §43). */
export const focus = {
  ring: `0 0 0 2px ${color.neutral[0]}, 0 0 0 4px ${color.accent.default}`,
  ringOffset: '2px',
  outline: `2px solid ${color.accent.default}`,
} as const;

/** Operation states rendered consistently wherever async work is shown. */
export const stateColor = {
  idle: color.neutral[400],
  pending: color.warning.default,
  processing: color.info.default,
  success: color.success.default,
  failed: color.danger.default,
  retrying: color.warning.strong,
  offline: color.neutral[500],
} as const;

export const tokens = {
  color,
  typography,
  spacing,
  radius,
  elevation,
  motion,
  zIndex,
  sizing,
  focus,
  stateColor,
} as const;

/**
 * Flattens the tokens into CSS custom properties, e.g.
 * `--ds-color-accent-default`. Applied once at boot by `applyDesignTokens`.
 */
export function cssVariables(): Record<string, string> {
  const variables: Record<string, string> = {};

  const walk = (value: unknown, path: string[]): void => {
    if (value === null || typeof value !== 'object') {
      variables[`--ds-${path.join('-')}`] = String(value);
      return;
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      walk(nested, [...path, key.toLowerCase()]);
    }
  };

  walk({ color, spacing, radius, elevation, motion, sizing }, []);
  return variables;
}

export function applyDesignTokens(target: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(cssVariables())) {
    target.style.setProperty(name, value);
  }
}
