import { AppManifest } from './AppRegistry';

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
    label: 'Code Editor',
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
];

export function getEditorForFile(name: string, mimeType: string): EditorMapping | undefined {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  return EDITOR_REGISTRY.find((mapping) => {
    if (mapping.extensions.includes(ext)) return true;
    if (mimeType && mapping.mimeTypes.includes(mimeType)) return true;
    return false;
  });
}

export function getAppForFile(name: string, mimeType: string): string | undefined {
  return getEditorForFile(name, mimeType)?.appId;
}
