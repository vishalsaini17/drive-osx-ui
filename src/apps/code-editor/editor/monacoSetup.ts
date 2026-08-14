import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
// `monaco-editor`'s own package.json exports map already prepends `esm/vs/`
// (`"./*": "./esm/vs/*.js"`), so the import specifier is the path *under*
// that, not the full on-disk path.
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

/**
 * `@monaco-editor/react` fetches Monaco from a CDN (jsdelivr) by default —
 * incompatible with this platform's offline-first requirement (CLAUDE.md
 * §18). Pointing its loader at the `monaco-editor` package already bundled
 * into this app's own chunk means the editor works with no network request
 * at all, same as everything else in this app.
 */
loader.config({ monaco });

/**
 * Language services (TS/JS type-checking, JSON/CSS/HTML validation) run in
 * dedicated web workers. Vite's native `?worker` import builds each of
 * these as its own bundled worker script — no extra plugin dependency
 * needed, matching CLAUDE.md §46's "prefer fewer technologies".
 */
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  },
};

export { monaco };
