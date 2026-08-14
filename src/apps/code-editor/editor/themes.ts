import type * as Monaco from 'monaco-editor';

/**
 * The AppRegistry's `editorTheme` setting has offered "Monokai" and
 * "Solarized" as options since before this editor existed (inherited from
 * the old text-editor's settingsSchema) — Monaco only ships `vs`/`vs-dark`/
 * `hc-black`/`hc-light` out of the box, so those two options were dead until
 * now. Defined here from each theme's well-known published palette, not
 * guessed.
 */
export const MONACO_THEME_IDS = {
  'Classic Light': 'vs',
  Monokai: 'wb-monokai',
  'VS-Dark': 'vs-dark',
  Solarized: 'wb-solarized-light',
} as const;

export type EditorThemeName = keyof typeof MONACO_THEME_IDS;

export function registerCustomThemes(monaco: typeof Monaco) {
  monaco.editor.defineTheme('wb-monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715E', fontStyle: 'italic' },
      { token: 'string', foreground: 'E6DB74' },
      { token: 'keyword', foreground: 'F92672' },
      { token: 'number', foreground: 'AE81FF' },
      { token: 'type', foreground: '66D9EF', fontStyle: 'italic' },
      { token: 'function', foreground: 'A6E22E' },
      { token: 'variable', foreground: 'F8F8F2' },
      { token: 'delimiter', foreground: 'F8F8F2' },
      { token: 'tag', foreground: 'F92672' },
      { token: 'attribute.name', foreground: 'A6E22E' },
      { token: 'attribute.value', foreground: 'E6DB74' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#F8F8F2',
      'editorLineNumber.foreground': '#75715E',
      'editorLineNumber.activeForeground': '#F8F8F2',
      'editor.selectionBackground': '#49483E',
      'editor.lineHighlightBackground': '#3E3D32',
      'editorCursor.foreground': '#F8F8F0',
      'editorIndentGuide.background': '#3B3A32',
    },
  });

  monaco.editor.defineTheme('wb-solarized-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '93A1A1', fontStyle: 'italic' },
      { token: 'string', foreground: '2AA198' },
      { token: 'keyword', foreground: '859900' },
      { token: 'number', foreground: 'D33682' },
      { token: 'type', foreground: 'B58900' },
      { token: 'function', foreground: '268BD2' },
      { token: 'variable', foreground: '657B83' },
      { token: 'delimiter', foreground: '657B83' },
      { token: 'tag', foreground: '268BD2' },
      { token: 'attribute.name', foreground: 'B58900' },
      { token: 'attribute.value', foreground: '2AA198' },
    ],
    colors: {
      'editor.background': '#FDF6E3',
      'editor.foreground': '#657B83',
      'editorLineNumber.foreground': '#93A1A1',
      'editorLineNumber.activeForeground': '#657B83',
      'editor.selectionBackground': '#EEE8D5',
      'editor.lineHighlightBackground': '#EEE8D5',
      'editorCursor.foreground': '#657B83',
      'editorIndentGuide.background': '#EEE8D5',
    },
  });
}
