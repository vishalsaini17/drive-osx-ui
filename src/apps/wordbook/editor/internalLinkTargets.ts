import { Editor } from '@tiptap/react';

export interface HeadingTarget {
  pos: number;
  level: number;
  text: string;
  id: string | null;
}

export interface BookmarkTarget {
  pos: number;
  id: string;
  contextText: string;
}

/** Every heading currently in the document — same walk `OutlineSidebar.tsx` already does for its own list, reused here for the Link dialog's "Headings" section. */
export function collectHeadings(editor: Editor): HeadingTarget[] {
  const out: HeadingTarget[] = [];
  editor.state.doc.forEach((node, pos) => {
    if (node.type.name === 'heading') {
      const attrs = node.attrs as { level?: number; headingId?: string | null };
      out.push({ pos, level: attrs.level ?? 1, text: node.textContent.trim() || 'Untitled heading', id: attrs.headingId ?? null });
    }
  });
  return out;
}

/** Every bookmark currently in the document, labeled with its enclosing paragraph's text — bookmarks carry no text of their own (see BookmarkNode.ts), so this is the only way to tell two apart in a list. */
export function collectBookmarks(editor: Editor): BookmarkTarget[] {
  const out: BookmarkTarget[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'bookmark') {
      const $pos = editor.state.doc.resolve(pos);
      const contextText = $pos.parent.textContent.trim() || 'Bookmark';
      out.push({ pos, id: node.attrs.id as string, contextText });
    }
  });
  return out;
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Assigns a heading a stable id the first time something actually links to it — a document with no internal links stays free of ids nobody uses, the same reasoning BookmarkNode's own id generation already follows for a fresh bookmark. */
export function ensureHeadingId(editor: Editor, headingPos: number): string {
  const node = editor.state.doc.nodeAt(headingPos);
  const existing = (node?.attrs as { headingId?: string | null } | undefined)?.headingId;
  if (existing) return existing;
  const id = randomId('h');
  if (node) {
    editor.view.dispatch(editor.view.state.tr.setNodeMarkup(headingPos, undefined, { ...node.attrs, headingId: id }));
  }
  return id;
}
