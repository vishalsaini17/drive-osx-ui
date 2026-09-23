import { AppManifest } from './AppRegistry';
import { BOOK_MIME_TYPE } from '../documents/book/bookFormat';

export interface EditorMapping {
  appId: string;
  mimeTypes: string[];
  extensions: string[];
  label: string;
}

export const EDITOR_REGISTRY: EditorMapping[] = [
  {
    appId: 'editor',
    mimeTypes: ['text/plain', 'text/markdown', 'text/html', 'text/css', 'text/javascript', 'application/json'],
    extensions: ['txt', 'md', 'html', 'css', 'js', 'ts', 'tsx', 'json', 'xml', 'yaml', 'yml', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'sql', 'sh', 'bash', 'zsh', 'gitignore', 'env', 'ini', 'cfg', 'conf', 'log'],
    label: 'Editor',
  },
  {
    appId: 'pdf-viewer',
    mimeTypes: ['application/pdf'],
    extensions: ['pdf'],
    label: 'PDF Viewer',
  },
  {
    appId: 'paint',
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp', 'image/bmp'],
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'],
    label: 'Image Editor',
  },
  {
    appId: 'spreadsheet',
    mimeTypes: ['text/csv', 'application/vnd.ms-excel'],
    extensions: ['csv', 'xlsx', 'xls'],
    label: 'Spreadsheet',
  },
  {
    appId: 'presentation',
    mimeTypes: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    extensions: ['ppt', 'pptx'],
    label: 'Presentation',
  },
  {
    appId: 'browser',
    mimeTypes: ['text/html'],
    extensions: ['htm', 'html'],
    label: 'Web Browser',
  },
  {
    appId: 'wordbook',
    // `.doc`/`.docx` open in Word Book via a best-effort import (Mammoth
    // converts the file to HTML, which the editor then ingests) — not a
    // full, lossless round-trip of every Word feature, but a real, working
    // open rather than the dead end (a blank preview pane) double-clicking
    // one produced before this entry existed.
    mimeTypes: [BOOK_MIME_TYPE, 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['book', 'doc', 'docx'],
    label: 'Word Book',
  },
];

export function getEditorForFile(name: string, mimeType: string): EditorMapping | undefined {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  // Extension is checked across the *whole* registry before mimeType is
  // consulted at all — not mapping-by-mapping in one pass. A single-pass
  // `.find()` would return whichever mapping happens to come first in the
  // array the moment either side of its check matched, so a callsite that
  // (for lack of anything better) passes a coarse mimeType guess like
  // `text/plain` for "this is some kind of document" could match `editor`
  // (mimeTypes includes `text/plain`) before ever reaching `pdf-viewer` —
  // even for a file named `report.pdf`, whose extension is unambiguous.
  const byExtension = EDITOR_REGISTRY.find((mapping) => mapping.extensions.includes(ext));
  if (byExtension) return byExtension;

  if (!mimeType) return undefined;
  return EDITOR_REGISTRY.find((mapping) => mapping.mimeTypes.includes(mimeType));
}

export function getAppForFile(name: string, mimeType: string): string | undefined {
  return getEditorForFile(name, mimeType)?.appId;
}
