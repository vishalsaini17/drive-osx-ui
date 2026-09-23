import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dropdownChip: {
      insertDropdownChip: (options: string[]) => ReturnType;
    };
  }
}

/**
 * A real inline dropdown, not a static label — clicking it opens a live
 * option picker (wired in index.tsx's `handleClick`, reusing the same
 * `MenuPanel` the app's own menus already render with) that writes the
 * chosen index back onto this node's `selected` attribute.
 */
export const DropdownChipNode = Node.create({
  name: 'dropdownChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      options: {
        default: [] as string[],
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute('data-options') || '[]');
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({ 'data-options': JSON.stringify(attrs.options ?? []) }),
      },
      selected: {
        default: 0,
        parseHTML: (el) => parseInt(el.getAttribute('data-selected') || '0', 10),
        renderHTML: (attrs) => ({ 'data-selected': String(attrs.selected ?? 0) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-dropdown-chip]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const options = (node.attrs.options as string[]) ?? [];
    const selected = (node.attrs.selected as number) ?? 0;
    const current = options[selected] ?? 'Choose…';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-dropdown-chip': '',
        class: 'wb-chip wb-dropdown-chip',
        contenteditable: 'false',
        title: 'Click to change',
      }),
      `${current} ▾`,
    ];
  },

  addCommands() {
    return {
      insertDropdownChip:
        (options: string[]) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { options, selected: 0 } }),
    };
  },
});

export default DropdownChipNode;
