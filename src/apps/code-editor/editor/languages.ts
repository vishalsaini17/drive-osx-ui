/** Extension → Monaco language id. Mirrors `EditorRegistry.ts`'s extension list — every extension that opens this app should get real highlighting, not silently fall back to plain text. */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  env: 'shell',
  gitignore: 'plaintext',
  log: 'plaintext',
  txt: 'plaintext',
};

export function languageForFileName(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
  return (ext && EXTENSION_LANGUAGE_MAP[ext]) || 'plaintext';
}

/**
 * Whether this file is worth fetching content for during a workspace search —
 * skips images/video/archives/etc. before making a network call for them.
 * Errs toward including anything ambiguous (an unrecognized extension with no
 * mimeType) rather than silently missing real matches.
 */
export function isSearchableTextFile(name: string, mimeType: string | undefined): boolean {
  if (mimeType?.startsWith('text/')) return true;
  if (mimeType === 'application/json' || mimeType === 'application/xml' || mimeType === 'application/javascript') return true;
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
  if (ext && ext in EXTENSION_LANGUAGE_MAP) return true;
  if (!mimeType) return true;
  return false;
}
