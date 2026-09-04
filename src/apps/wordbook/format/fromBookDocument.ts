import { BookDocument, migrateBookDocument } from '../../../platform/documents/book/bookFormat';
import { a4PageSetup } from '../../../platform/documents/book/pageSetup';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Parses a raw `.book` file's text content into a `BookDocument`, migrating older formats. */
export function parseBookFile(raw: string): BookDocument {
  return migrateBookDocument(JSON.parse(raw));
}

export function serializeBookFile(book: BookDocument): string {
  return JSON.stringify(book, null, 2);
}

/** The TipTap/ProseMirror JSON to load into the editor for this document's (only, in Phase 1) section. */
export function editorContentFromBookDocument(book: BookDocument): unknown {
  return book.sections[0]?.content ?? EMPTY_DOC;
}

export function blankBookDocument(title: string): BookDocument {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    metadata: { title, author: '', createdAt: now, modifiedAt: now },
    defaultPageSetup: a4PageSetup('portrait'),
    sections: [{ id: 'main', pageSetup: {}, headerRef: null, footerRef: null, content: EMPTY_DOC }],
    headers: {},
    footers: {},
    assets: {},
  };
}
