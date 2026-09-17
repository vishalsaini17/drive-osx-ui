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
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';
import { PageBreakNode } from './nodes/PageBreakNode';
import { WordBookImage } from './nodes/WordBookImage';
import { BookmarkNode } from './nodes/BookmarkNode';
import { SmartChipNode } from './nodes/SmartChipNode';
import { DropdownChipNode } from './nodes/DropdownChipNode';

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
 * Line spacing and space-after, adjustable per paragraph/heading like
 * Word's paragraph controls — both were previously fixed by the stylesheet
 * for every block alike (`PageCanvas.tsx`'s `lineHeight: 1.5` and
 * `.wb-prosemirror p { margin: 0 0 10px 0 }`). Rendered as plain inline
 * styles, the same technique `FontSize` above already uses on `textStyle`;
 * `null` (unset) leaves the stylesheet default in effect. Nothing in the
 * pagination engine needs to change for this to paginate correctly — it
 * already reads a block's real rendered height and computed margin
 * straight off the DOM rather than from a fixed constant.
 */
const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
          spacingAfter: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) => {
              if (!attributes.spacingAfter) return {};
              return { style: `margin-bottom: ${attributes.spacingAfter}` };
            },
          },
        },
      },
    ];
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
          /**
           * A stable jump target for the Link dialog's "Headings, bookmarks,
           * and tabs" list (LinkModal.tsx) — assigned lazily the first time a
           * link is actually made to this heading (see `ensureHeadingId` in
           * that file), not up front for every heading, so a document with
           * no internal links stays free of ids nobody uses.
           */
          headingId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-heading-id'),
            renderHTML: (attributes) => (attributes.headingId ? { 'data-heading-id': attributes.headingId } : {}),
          },
        },
      },
    ];
  },
});

/**
 * Which preset glyph/numbering set a bullet/ordered list uses, and which
 * checkbox look a checklist uses — cosmetic per-list choices, matching
 * Google Docs' bullet/numbered-list/checklist style pickers. Applied purely
 * via CSS (`PageCanvas.tsx`, keyed off the rendered `data-*-style` attribute
 * below) using `::marker` content overrides and `counters()` for the
 * multi-level numbering presets — no separate list-rendering logic needed.
 */
const ListStyles = Extension.create({
  name: 'listStyles',
  addGlobalAttributes() {
    return [
      {
        types: ['bulletList'],
        attributes: {
          bulletStyle: {
            default: 'default',
            parseHTML: (element) => element.getAttribute('data-bullet-style') || 'default',
            renderHTML: (attributes) => ({ 'data-bullet-style': attributes.bulletStyle ?? 'default' }),
          },
        },
      },
      {
        types: ['orderedList'],
        attributes: {
          numberStyle: {
            default: 'default',
            parseHTML: (element) => element.getAttribute('data-number-style') || 'default',
            renderHTML: (attributes) => ({ 'data-number-style': attributes.numberStyle ?? 'default' }),
          },
        },
      },
      {
        types: ['taskList'],
        attributes: {
          checklistVariant: {
            default: 'square',
            parseHTML: (element) => element.getAttribute('data-checklist-variant') || 'square',
            renderHTML: (attributes) => ({ 'data-checklist-variant': attributes.checklistVariant ?? 'square' }),
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
    // `inclusive` (whether typing right at a mark's end boundary keeps
    // extending it) defaults to following the `autolink` option in this
    // version of the extension — which is on by default — so without this
    // override, typing immediately after a link silently kept adding new
    // characters to it instead of starting normal text.
    Link.extend({ inclusive: () => false }).configure({
      openOnClick: false,
      HTMLAttributes: { title: 'Click to open', rel: 'noopener noreferrer' },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    WordBookImage.configure({
      resize: { enabled: true, directions: ['left', 'right', 'bottom-left', 'bottom-right'], minWidth: 60, minHeight: 40 },
    }),
    ParagraphSpacing,
    KeepWithNext,
    ListStyles,
    PageBreakNode,
    BookmarkNode,
    SmartChipNode,
    DropdownChipNode,
  ];
}
