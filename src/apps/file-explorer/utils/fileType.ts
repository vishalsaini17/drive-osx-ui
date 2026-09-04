/**
 * Single source of truth for "what kind of file is this" by extension, shared
 * by icon rendering, grouping, and the "Open With" menu so they don't each
 * carry their own (and inevitably drifting) extension list.
 */
export type FileKind =
  | 'folder'
  | 'image'
  | 'code'
  | 'audio'
  | 'video'
  | 'archive'
  | 'pdf'
  | 'spreadsheet'
  | 'presentation'
  | 'text'
  | 'other';

const EXTENSION_KIND: Record<string, FileKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image', ico: 'image',
  js: 'code', ts: 'code', tsx: 'code', jsx: 'code', py: 'code', html: 'code', css: 'code', java: 'code',
  c: 'code', cpp: 'code', h: 'code', cs: 'code', go: 'code', rs: 'code', rb: 'code', php: 'code', sql: 'code',
  sh: 'code', bash: 'code', zsh: 'code', json: 'code', xml: 'code', yaml: 'code', yml: 'code',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio',
  mp4: 'video', webm: 'video', mov: 'video', avi: 'video', mkv: 'video',
  zip: 'archive', tar: 'archive', gz: 'archive', rar: 'archive', '7z': 'archive',
  pdf: 'pdf',
  csv: 'spreadsheet', xlsx: 'spreadsheet', xls: 'spreadsheet',
  ppt: 'presentation', pptx: 'presentation',
  txt: 'text', md: 'text', log: 'text', gitignore: 'text', env: 'text', ini: 'text', cfg: 'text', conf: 'text',
  doc: 'text', docx: 'text',
};

export function getFileKind(item: { type: string; name: string }): FileKind {
  if (item.type === 'folder') return 'folder';
  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_KIND[ext] || 'other';
}
