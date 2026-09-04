import Image from '@tiptap/extension-image';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wordBookImage: {
      setImageAlign: (align: 'left' | 'center' | 'right') => ReturnType;
      setImageWrap: (wrap: 'inline' | 'block') => ReturnType;
    };
  }
}

/**
 * Extends the stock Image node (which already ships real drag-to-resize via
 * its built-in `resize` NodeView option — no custom resize handling needed
 * here) with alignment and text-wrap, the two attributes it doesn't carry by
 * default. `wrap: 'inline'` lets a small image sit beside text on the same
 * line; `'block'` (the default) puts it on its own line, aligned per
 * `align` — a deliberately simpler model than Word's full float/wrap-around
 * positioning, but a real, functioning one rather than a placeholder.
 */
export const WordBookImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-align') || 'left',
        renderHTML: (attributes) => ({ 'data-align': attributes.align }),
      },
      wrap: {
        default: 'block',
        parseHTML: (element) => element.getAttribute('data-wrap') || 'block',
        renderHTML: (attributes) => ({ 'data-wrap': attributes.wrap }),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align: 'left' | 'center' | 'right') =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { align }),
      setImageWrap:
        (wrap: 'inline' | 'block') =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { wrap }),
    };
  },
});

export default WordBookImage;
