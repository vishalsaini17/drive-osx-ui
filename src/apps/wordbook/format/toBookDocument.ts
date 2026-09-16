import {
  BOOK_FORMAT_VERSION,
  BookDocument,
  BookMetadata,
  generateBookId,
} from '../../../platform/documents/book/bookFormat';
import { a4PageSetup, PageSetup } from '../../../platform/documents/book/pageSetup';

/**
 * Wraps the editor's `getJSON()` output into the `.book` file shape.
 *
 * Phase 1 only ever produces one implicit section (a literal multi-section
 * ProseMirror schema is deferred until the UI actually needs to create a
 * second one — see the Phase 1 plan's document-model note), so this is a
 * straightforward single-entry wrap rather than a real splitting pass.
 */
export function toBookDocument(
  editorJSON: unknown,
  existing: Pick<BookDocument, 'metadata' | 'defaultPageSetup' | 'headers' | 'footers' | 'assets'> | null,
  /** The page setup actually in effect right now — takes priority over `existing`'s, since the live editor state (e.g. after a Page Setup change) is always more current than whatever was last loaded/saved, including for a brand-new document that has no `existing` at all yet. */
  currentPageSetup?: PageSetup,
): BookDocument {
  const now = new Date().toISOString();
  const metadata: BookMetadata = existing
    ? { ...existing.metadata, modifiedAt: now }
    : { title: 'Untitled Document', author: '', createdAt: now, modifiedAt: now };

  return {
    formatVersion: BOOK_FORMAT_VERSION,
    metadata,
    defaultPageSetup: currentPageSetup ?? existing?.defaultPageSetup ?? a4PageSetup('portrait'),
    sections: [
      {
        id: 'main',
        pageSetup: {},
        headerRef: null,
        footerRef: null,
        content: editorJSON,
      },
    ],
    headers: existing?.headers ?? {},
    footers: existing?.footers ?? {},
    assets: existing?.assets ?? {},
  };
}

export function newBookId(): string {
  return generateBookId('book');
}
