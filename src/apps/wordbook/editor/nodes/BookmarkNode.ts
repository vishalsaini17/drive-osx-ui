import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bookmark: {
      insertBookmark: () => ReturnType;
    };
  }
}

function randomBookmarkId(): string {
  return `bm-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * An inline, invisible-except-for-its-flag anchor a `Link` can point at
 * (`#bookmark:<id>` as the href) — see the `handleClickOn` wiring in
 * index.tsx that resolves that scheme by scrolling here instead of trying
 * to navigate the browser to it. Selectable/clickable like Word/Docs show
 * an otherwise-invisible anchor, rather than leaving it with no on-screen
 * presence at all.
 */
export const BookmarkNode = Node.create({
  name: 'bookmark',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-bookmark-id'),
        renderHTML: (attributes) => ({ 'data-bookmark-id': attributes.id }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-bookmark-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-bookmark': '',
        class: 'wb-bookmark',
        contenteditable: 'false',
        title: 'Bookmark — click to copy a link to this spot',
      }),
      '🔖',
    ];
  },

  addCommands() {
    return {
      insertBookmark:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { id: randomBookmarkId() } }),
    };
  },
});

export default BookmarkNode;
