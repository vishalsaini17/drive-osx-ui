import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}

/**
 * A manual page break — a real document node (spec: "not as a collection of
 * blank lines"), distinct from the automatic overflow-driven pagination the
 * layout engine performs. `domMeasurement.ts` reads this node to flag the
 * block that follows it as `forcedBreakBefore`, and the engine always starts
 * a fresh page there regardless of remaining space.
 *
 * Rendered as a thin, visible marker in the editing view (not just an
 * invisible zero-height node) so the user can see and select it, matching
 * how Word/LibreOffice show manual breaks on screen.
 */
export const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-page-break': '',
        class: 'wb-page-break',
        contenteditable: 'false',
        style:
          'position:relative;margin:8px 0;height:0;border-top:2px dashed #a78bfa;user-select:none;',
      }),
      [
        'span',
        {
          class: 'wb-page-break-label',
          style:
            'position:absolute;top:-9px;left:50%;transform:translateX(-50%);' +
            'background:#f5f3ff;color:#7c3aed;font-size:10px;font-weight:700;' +
            'letter-spacing:0.05em;text-transform:uppercase;padding:1px 8px;border-radius:9999px;',
        },
        'Page Break',
      ],
    ];
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },

  addKeyboardShortcuts() {
    // Matches the shortcut label shown next to "Insert > Page Break" in the
    // menu — menu `shortcut` text is display-only, so the binding itself has
    // to live here for it to actually fire.
    return {
      'Mod-Enter': () => this.editor.commands.insertPageBreak(),
    };
  },
});

export default PageBreakNode;
