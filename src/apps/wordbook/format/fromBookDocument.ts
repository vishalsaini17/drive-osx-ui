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

export function blankBookDocument(title: string): BookDocument {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    metadata: { title, author: '', createdAt: now, modifiedAt: now },
    defaultPageSetup: a4PageSetup('portrait'),
    sections: [
      { id: 'main', title: 'Tab 1', emoji: null, parentId: null, order: 0, pageSetup: {}, headerRef: null, footerRef: null, content: EMPTY_DOC },
    ],
    headers: {},
    footers: {},
    assets: {},
  };
}
