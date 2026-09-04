import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Extension } from '@tiptap/core';
import { PageBreakNode } from './nodes/PageBreakNode';
import { WordBookImage } from './nodes/WordBookImage';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * `@tiptap/extension-font-size` only exists as an unstable `next` prerelease
 * (no stable release alongside the rest of the 3.30.1 set), so font size is
 * implemented the same way that package itself does it: a `fontSize`
 * attribute grafted onto the existing `textStyle` mark, rendered as an inline
 * style. Same technique this file already uses for `keepWithNext` below.
 */
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/**
 * Extends the built-in heading node with `keepWithNext` — used by the
 * pagination engine so a heading is never orphaned alone at the bottom of a
 * page, separated from the paragraph that follows it.
 */
const KeepWithNext = Extension.create({
  name: 'keepWithNext',
  addGlobalAttributes() {
    return [
      {
        types: ['heading'],
        attributes: {
          keepWithNext: {
            default: true,
            parseHTML: (element) => element.getAttribute('data-keep-with-next') !== 'false',
            renderHTML: (attributes) => ({ 'data-keep-with-next': attributes.keepWithNext ? 'true' : 'false' }),
          },
        },
      },
    ];
  },
});

/**
 * The full extension list, assembled once so both the live editor and any
 * headless (export) instance build the exact same schema.
 *
 * Table/color/highlight/link/image extensions are included now — cheap,
 * schema-stable — even though their toolbar insertion UI is Phase 2; adding
 * a node type after documents already exist is a breaking migration,
 * enabling one isn't.
 */
export function wordBookExtensions() {
  return [
    StarterKit.configure({
      // History has its own undo/redo keymaps; keep the default. Heading
      // levels 1-6 match the spec's "heading styles" requirement.
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      // This version of StarterKit bundles its own Link/Underline; disabled
      // here so the explicitly-configured ones below (openOnClick, etc.)
      // are the only ones registered — otherwise both register under the
      // same names and Tiptap warns on every mount.
      link: false,
      underline: false,
    }),
    Underline,
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Subscript,
    Superscript,
    Highlight.configure({ multicolor: true }),
    Link.configure({ openOnClick: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    WordBookImage.configure({
      resize: { enabled: true, directions: ['left', 'right', 'bottom-left', 'bottom-right'], minWidth: 60, minHeight: 40 },
    }),
    KeepWithNext,
    PageBreakNode,
  ];
}
