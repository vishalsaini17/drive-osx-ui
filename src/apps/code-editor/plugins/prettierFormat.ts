import type { Plugin } from 'prettier';

type PrettierParser = 'babel' | 'typescript' | 'css' | 'scss' | 'less' | 'html' | 'json' | 'markdown' | 'yaml' | 'graphql';

/** Monaco language id → the real Prettier parser that formats it. Only
 * languages Prettier itself actually supports are listed here — anything
 * else (Python, Go, Rust, ...) falls back to Monaco's own formatter (or has
 * none), never a silent no-op pretending to have formatted the file. */
const LANGUAGE_TO_PARSER: Partial<Record<string, PrettierParser>> = {
  javascript: 'babel',
  typescript: 'typescript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  markdown: 'markdown',
  yaml: 'yaml',
  graphql: 'graphql',
};

export function prettierSupportsLanguage(language: string): boolean {
  return language in LANGUAGE_TO_PARSER;
}

// Plugins are fetched lazily and cached — most sessions only ever touch one
// or two languages, so there's no reason to pull every Prettier parser
// plugin into the initial bundle.
let standaloneModulePromise: Promise<typeof import('prettier/standalone')> | null = null;
function loadStandalone() {
  if (!standaloneModulePromise) standaloneModulePromise = import('prettier/standalone');
  return standaloneModulePromise;
}

const pluginCache = new Map<PrettierParser, Promise<Plugin[]>>();

function loadPlugins(parser: PrettierParser): Promise<Plugin[]> {
  const cached = pluginCache.get(parser);
  if (cached) return cached;
  const promise = (async () => {
    switch (parser) {
      case 'babel':
      case 'json':
        return [(await import('prettier/plugins/babel')).default, (await import('prettier/plugins/estree')).default];
      case 'typescript':
        return [(await import('prettier/plugins/typescript')).default, (await import('prettier/plugins/estree')).default];
      case 'css':
      case 'scss':
      case 'less':
        return [(await import('prettier/plugins/postcss')).default];
      case 'html':
        return [(await import('prettier/plugins/html')).default];
      case 'markdown':
        return [(await import('prettier/plugins/markdown')).default];
      case 'yaml':
        return [(await import('prettier/plugins/yaml')).default];
      case 'graphql':
        return [(await import('prettier/plugins/graphql')).default];
    }
  })();
  pluginCache.set(parser, promise);
  return promise;
}

export interface PrettierOptions {
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  trailingComma: 'none' | 'es5' | 'all';
  printWidth: number;
}

/** Throws on a genuine parse/format failure — callers decide how to
 * surface that (fall back to Monaco's formatter, show an error), rather
 * than this silently returning the original text as if it had succeeded. */
export async function formatWithPrettier(code: string, language: string, options: PrettierOptions): Promise<string> {
  const parser = LANGUAGE_TO_PARSER[language];
  if (!parser) throw new Error(`Prettier has no parser for language "${language}"`);
  const [prettier, plugins] = await Promise.all([loadStandalone(), loadPlugins(parser)]);
  return prettier.format(code, {
    parser,
    plugins,
    tabWidth: options.tabWidth,
    useTabs: options.useTabs,
    semi: options.semi,
    singleQuote: options.singleQuote,
    trailingComma: options.trailingComma,
    printWidth: options.printWidth,
  });
}
