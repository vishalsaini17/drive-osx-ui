import * as pdfjsLib from 'pdfjs-dist';
// Vite `?url` import: bundles the worker script and gives us its final URL,
// which is the supported way to point pdf.js at a worker under a bundler
// (pdf.js can't locate its own worker file otherwise).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { pdfjsLib };
export const { getDocument, PasswordResponses, TextLayer } = pdfjsLib;
export type { PDFDocumentProxy, PDFPageProxy, PDFDocumentLoadingTask, PageViewport, RenderTask } from 'pdfjs-dist';

// `pdfjs-dist`'s top-level type declarations don't re-export these (they're
// only reachable via a deep internal path), so they're declared here to
// match `PDFPageProxy.getTextContent()`'s real return shape.
export interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

export interface TextMarkedContent {
  type: string;
  id?: string;
}

export interface TextStyle {
  fontFamily: string;
  ascent: number;
  descent: number;
  vertical: boolean;
}

export interface TextContent {
  items: Array<TextItem | TextMarkedContent>;
  styles: Record<string, TextStyle>;
  lang: string | null;
}
