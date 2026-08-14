import { Linter } from 'eslint-linter-browserify';

/**
 * `eslint-linter-browserify` is the real `Linter` class from ESLint itself,
 * built for use with no Node.js filesystem/module resolution — it runs
 * ESLint's actual core rules in the browser, not a lookalike. What it can't
 * do is anything that depends on ESLint's plugin ecosystem or project-aware
 * config resolution (reading `.eslintrc`, resolving `node_modules` plugins),
 * so this is scoped to a curated set of core rules rather than claiming to
 * be "your ESLint config" for a real project.
 */
const linter = new Linter();

/**
 * A generous but finite set of ambient globals so `no-undef` catches real
 * typos instead of flagging every reference to `console`/`window`/`module`
 * as an error — this linter has no way to see a project's actual runtime
 * (browser vs Node) or its other files' exports, so `no-undef` runs as a
 * warning, not an error, and only for genuinely undeclared identifiers.
 */
const AMBIENT_GLOBALS: Record<string, 'readonly'> = Object.fromEntries(
  [
    'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
    'console', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'requestAnimationFrame', 'cancelAnimationFrame', 'alert', 'confirm', 'prompt',
    'Promise', 'URL', 'URLSearchParams', 'FormData', 'WebSocket', 'XMLHttpRequest', 'Headers', 'Request', 'Response',
    'process', 'require', 'module', 'exports', '__dirname', '__filename', 'global', 'Buffer',
    'globalThis', 'self', 'structuredClone', 'crypto', 'performance',
  ].map((name) => [name, 'readonly'])
);

/**
 * The rule set this linter enforces. Chosen for genuine bug-catching value
 * (typos, comparison mistakes, dead code, redeclaration) with a low
 * false-positive rate — not ESLint's full "recommended" preset, which
 * assumes project-aware config this linter doesn't have.
 */
const RULES: Linter.RulesRecord = {
  'no-undef': 'warn',
  'no-unused-vars': 'warn',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-dupe-class-members': 'error',
  'no-const-assign': 'error',
  'no-redeclare': 'error',
  'no-self-compare': 'warn',
  'no-self-assign': 'warn',
  'no-unreachable': 'warn',
  'no-fallthrough': 'warn',
  'no-empty': 'warn',
  'no-extra-semi': 'warn',
  'eqeqeq': 'warn',
  'no-var': 'warn',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'no-func-assign': 'error',
  'no-import-assign': 'error',
  'no-obj-calls': 'error',
  'no-sparse-arrays': 'warn',
  'no-async-promise-executor': 'warn',
  'no-compare-neg-zero': 'warn',
  'no-cond-assign': 'warn',
};

export interface LintDiagnostic {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  message: string;
  ruleId: string | null;
  severity: 'error' | 'warning';
}

/** ESLint's real core rules only make sense for JavaScript/JSX — espree (its
 * default parser) doesn't understand TypeScript syntax, so this is never
 * offered for `.ts`/`.tsx` rather than producing constant false parse
 * errors on valid TypeScript. */
export function eslintSupportsLanguage(language: string): boolean {
  return language === 'javascript';
}

export function lintJavaScript(code: string): LintDiagnostic[] {
  const messages = linter.verify(code, {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: AMBIENT_GLOBALS,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: RULES,
  });

  return messages.map((m) => ({
    startLine: m.line || 1,
    startColumn: m.column || 1,
    endLine: m.endLine || m.line || 1,
    endColumn: m.endColumn || (m.column || 1) + 1,
    message: m.message,
    ruleId: m.ruleId,
    severity: m.severity === 2 ? 'error' : 'warning',
  }));
}
