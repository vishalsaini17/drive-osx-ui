export type AnnotationType = 'highlight' | 'underline' | 'strikeout' | 'sticky-note' | 'drawing';

export interface StickyNote {
  id: string;
  pageIndex: number;
  x: number; // percentage of page width
  y: number; // percentage of page height
  text: string;
  author: string;
  color: string;
  createdAt: string;
}

export interface TextAnnotation {
  id: string;
  type: 'highlight' | 'underline' | 'strikeout';
  pageIndex: number;
  text: string;
  color: string;
  /**
   * One percentage-of-page rect per visual line the selection covered
   * (`Range.getClientRects()`) — a selection spanning a paragraph wrap needs
   * a rect per line, not one box stretched across all of them.
   */
  rects: { x: number; y: number; width: number; height: number }[];
}

export interface DrawingPath {
  id: string;
  pageIndex: number;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

export interface Bookmark {
  id: string;
  title: string;
  pageIndex: number;
}

export interface SearchMatch {
  id: string;
  pageIndex: number;
  snippet: string;
  matchTerm: string;
}

/** Where the currently open document's bytes came from. */
export type PDFSourceKind = 'drive' | 'local';

export interface PDFDocMeta {
  source: PDFSourceKind;
  /** Drive file id — only set for `source === 'drive'`, used to fetch bytes and to Share. */
  fileId?: string;
  folderId?: string | null;
  name: string;
  sizeLabel: string;
  numPages: number;
}
