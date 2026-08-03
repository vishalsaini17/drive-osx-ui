export type AnnotationType = 'highlight' | 'underline' | 'strikeout' | 'sticky-note' | 'drawing';

export interface TextSelection {
  pageIndex: number;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
}

export interface StickyNote {
  id: string;
  pageIndex: number;
  x: number; // percentage
  y: number; // percentage
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
  rect: { x: number; y: number; width: number; height: number };
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

export interface PDFPageData {
  pageNumber: number;
  title: string;
  contentLines: string[];
  tables?: { headers: string[]; rows: string[][] }[];
  keyFacts?: string[];
}

export interface PDFDocumentData {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  totalPages: number;
  isPasswordProtected?: boolean;
  password?: string;
  isLocked?: boolean;
  author?: string;
  createdAt?: string;
  bookmarks: Bookmark[];
  pages: PDFPageData[];
}

export interface SearchMatch {
  id: string;
  pageIndex: number;
  lineIndex: number;
  textSnippet: string;
  matchTerm: string;
}
