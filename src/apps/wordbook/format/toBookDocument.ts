import {
  BOOK_FORMAT_VERSION,
  BookDocument,
  BookMetadata,
  BookSection,
  generateBookId,
} from '../../../platform/documents/book/bookFormat';
import { a4PageSetup, PageSetup } from '../../../platform/documents/book/pageSetup';

/**
 * Wraps a Document tabs section list into the `.book` file shape.
 *
 * `sections` must already carry every tab's up-to-date content — the caller
 * owns syncing the currently-active tab's live editor content into its
 * section entry first (see `tabsWithLiveContent` in index.tsx), since only
 * the active tab's content actually lives in the editor at any moment; the
 * rest is exactly what's already in state.
 */
export function toBookDocument(
  sections: BookSection[],
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
    sections,
    headers: existing?.headers ?? {},
    footers: existing?.footers ?? {},
    assets: existing?.assets ?? {},
  };
}

export function newBookId(): string {
  return generateBookId('book');
}
