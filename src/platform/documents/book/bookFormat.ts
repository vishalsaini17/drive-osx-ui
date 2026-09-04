import { PageSetup } from './pageSetup';

/**
 * The native `.book` document format.
 *
 * This is deliberately a distinct shape from raw TipTap/ProseMirror JSON
 * (`BookSection.content` embeds that JSON rather than the file being that
 * JSON) so upgrading the editor library later doesn't force a document
 * migration — only `fromBookDocument`/`toBookDocument` would need to change.
 *
 * Saved through the existing `FileService` as a text file
 * (`application/vnd.driveosx.book+json`, `.book` extension) — no new storage
 * mechanism. Images are referenced by `fileId` into the existing file/object
 * storage, never inlined as base64, so `.book` files stay small.
 */
export const BOOK_FORMAT_VERSION = 1;

export interface BookMetadata {
  title: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
}

export interface BookAsset {
  fileId: string;
  mimeType: string;
  widthPx: number;
  heightPx: number;
}

/** A header or footer is its own small document tree, not part of the main flow. */
export interface HeaderFooterDoc {
  /** TipTap/ProseMirror JSON for a tiny doc (paragraphs + page-number fields only). */
  content: unknown;
}

export interface BookSection {
  id: string;
  /** Overrides merged over `BookDocument.defaultPageSetup`. */
  pageSetup: Partial<PageSetup>;
  headerRef: string | null;
  footerRef: string | null;
  /** TipTap/ProseMirror JSON (`editor.getJSON()` shape) for this section's blocks. */
  content: unknown;
}

export interface BookDocument {
  formatVersion: number;
  metadata: BookMetadata;
  defaultPageSetup: PageSetup;
  sections: BookSection[];
  headers: Record<string, HeaderFooterDoc>;
  footers: Record<string, HeaderFooterDoc>;
  assets: Record<string, BookAsset>;
}

export const BOOK_MIME_TYPE = 'application/vnd.driveosx.book+json';
export const BOOK_EXTENSION = '.book';

export function isBookFileName(name: string): boolean {
  return name.toLowerCase().endsWith(BOOK_EXTENSION);
}

let idCounter = 0;
/** Stable, collision-safe id for nodes/sections/assets created at runtime. */
export function generateBookId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/**
 * Parses and upgrades a raw `.book` file's JSON to the current
 * `BookDocument` shape. Every future format change adds a case here rather
 * than breaking documents already saved in the wild.
 */
export function migrateBookDocument(raw: unknown): BookDocument {
  const doc = raw as Partial<BookDocument> & { formatVersion?: number };
  const version = doc.formatVersion ?? 1;

  if (version > BOOK_FORMAT_VERSION) {
    throw new Error(
      `This .book file was saved by a newer version of Word Book (format v${version}); this version supports up to v${BOOK_FORMAT_VERSION}.`
    );
  }

  // No migrations exist yet (only format v1 has ever shipped) — this is the
  // seam future versions hang their upgrade steps on.
  return {
    formatVersion: BOOK_FORMAT_VERSION,
    metadata: doc.metadata ?? {
      title: 'Untitled',
      author: '',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    },
    defaultPageSetup: doc.defaultPageSetup as PageSetup,
    sections: doc.sections ?? [],
    headers: doc.headers ?? {},
    footers: doc.footers ?? {},
    assets: doc.assets ?? {},
  };
}
