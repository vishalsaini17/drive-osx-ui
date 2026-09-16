import React, { useEffect, useRef, useState } from 'react';
import { Editor, useEditorState } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ListChecks,
  Indent,
  Outdent,
  ListRestart,
  ListPlus,
  Baseline,
  Highlighter,
  Image as ImageIcon,
  Link as LinkIcon,
  ZoomIn,
  ZoomOut,
  Printer,
  SpellCheck,
  Paintbrush,
  RemoveFormatting,
  PanelLeft,
} from 'lucide-react';
import { RibbonDivider, RibbonButton, RibbonSelect, RibbonColorPicker, RibbonStepper } from './RibbonPrimitives';
import { uploadAndInsertImage } from '../../editor/insertImage';
import { promptForLink } from '../../editor/linkActions';

const FONT_FAMILIES = [
  { value: '', label: 'Default' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Calibri, Candara, "Segoe UI", sans-serif', label: 'Calibri' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: '"Garamond", "Palatino Linotype", serif', label: 'Garamond' },
];

const LINE_SPACINGS = ['1', '1.15', '1.5', '2'];
const SPACING_AFTER = ['0pt', '6pt', '8pt', '10pt', '12pt', '18pt', '24pt'];

/** The set of marks a "paint format" copy/apply cycle carries over — text formatting only, never block-level attributes (heading level, spacing, alignment). */
const PAINT_FORMAT_MARKS = ['bold', 'italic', 'underline', 'textStyle', 'highlight', 'link'];

/** 96px/in = 72pt/in, so 1px = 0.75pt at the CSS-standard 96dpi. */
const PX_TO_PT = 0.75;
/** Fallbacks only for the rare tick where the view isn't mounted yet — the live DOM read below is the real source of truth. */
const FALLBACK_FONT_SIZE_PX = 13;
const FALLBACK_LINE_SPACING = 1.5;
const FALLBACK_SPACING_AFTER_PX = 10;

/**
 * The DOM element for the top-level block (paragraph/heading) the selection
 * is currently in. A heading's real size/line-height/spacing lives in
 * block-level CSS (`PageCanvas.tsx`), not in a mark, so there's no schema
 * attribute to read it back from — reading the live computed style instead
 * of hand-duplicating that CSS as constants here is what keeps this display
 * from drifting out of sync with it (the same reasoning `domMeasurement.ts`
 * follows for a block's height and margin during pagination).
 */
function currentBlockElement(editor: Editor): HTMLElement | null {
  try {
    const { $from } = editor.state.selection;
    const dom = editor.view.nodeDOM($from.before($from.depth));
    return dom instanceof HTMLElement ? dom : null;
  } catch {
    return null;
  }
}

/**
 * Parses whatever a `textStyle.fontSize` mark happens to hold — this app's
 * own control always writes `"Npt"`, but a mark can also arrive via pasted
 * HTML carrying an inline `style="font-size: ..."`, most commonly in `px`.
 * A relative unit (em/rem/%) can't be resolved from the raw string alone
 * (the context it was relative to isn't preserved across paste), so those
 * fall through to `null` — same as no override — rather than display a
 * fabricated number.
 */
function parseFontSizeToPt(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const match = /^([\d.]+)\s*(pt|px)?$/.exec(raw.trim());
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  return match[2] === 'px' ? value * PX_TO_PT : value;
}

/** Rounds to the nearest half-point and formats to match the "Npt"/"N.5pt" shape `SPACING_AFTER`'s own options use. */
function formatPt(pt: number): string {
  const rounded = Math.round(pt * 2) / 2;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}pt`;
}

/** Rounds to 2 decimals and drops a trailing ".0" so it matches the plain "1"/"1.5"/"2" shape `LINE_SPACINGS` uses. */
function formatMultiplier(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Ensures `value` has a matching entry so the native `<select>` never lands on a blank/wrong option, sorted numerically. */
function withCurrentValue(presets: string[], value: string): string[] {
  return presets.includes(value) ? presets : [...presets, value].sort((a, b) => parseFloat(a) - parseFloat(b));
}

const HEADING_STYLES = [
  { value: 'paragraph', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
];

interface RibbonToolbarProps {
  editor: Editor | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentFolderId: string | null;
  resolveDefaultFolderId: (name: string) => string | null;
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
}

export default function RibbonToolbar({
  editor,
  zoom,
  onZoomChange,
  currentFolderId,
  resolveDefaultFolderId,
  isOutlineOpen,
  onToggleOutline,
}: RibbonToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [spellcheckOn, setSpellcheckOn] = useState(true);

  // "Paint format": captures the mark set at the cursor, then applies it to
  // whatever the *next* non-empty selection turns out to be, one time. Kept
  // as a one-shot listener rather than always-on so it never fires on a
  // plain click (which collapses to an empty selection — guarded below).
  const [paintFormatActive, setPaintFormatActive] = useState(false);
  const paintFormatMarksRef = useRef<Record<string, Record<string, unknown>> | null>(null);

  // Re-render on every editor transaction so active-state highlighting
  // (bold/heading/align/etc.) stays in sync with the cursor. `useEditorState`
  // subscribes via `useSyncExternalStore` under the hood, which is what
  // keeps this tearing-safe — a hand-rolled `editor.on('transaction', ...)`
  // + manual re-render here raced React's own commit timing during
  // StrictMode's dev double-invoke.
  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });

  useEffect(() => {
    if (!editor || !paintFormatActive) return;
    const applyOnce = () => {
      const marks = paintFormatMarksRef.current;
      if (!marks || editor.state.selection.empty) return;
      const chain = editor.chain().focus().unsetAllMarks();
      Object.entries(marks).forEach(([name, attrs]) => {
        chain.setMark(name, attrs);
      });
      chain.run();
      setPaintFormatActive(false);
      paintFormatMarksRef.current = null;
    };
    editor.on('selectionUpdate', applyOnce);
    return () => {
      editor.off('selectionUpdate', applyOnce);
    };
  }, [editor, paintFormatActive]);

  if (!editor) {
    return <div className="h-11 shrink-0 bg-[#f3f2f6] border-b border-zinc-300" />;
  }

  const activeHeading = HEADING_STYLES.find((h) => h.value !== 'paragraph' && editor.isActive('heading', { level: Number(h.value.slice(1)) }))?.value ?? 'paragraph';
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily ?? '';

  // The block-level defaults (heading size, line spacing, space-after) all
  // live in CSS, not in a schema attribute — read from the live DOM rather
  // than a second hand-kept copy of that CSS. `blockFontSizePx` doubles as
  // the base for recovering line spacing as a plain multiplier below (CSS
  // resolves an inherited unitless `line-height` to its absolute px
  // equivalent, so dividing back by font-size is what gets "1.5" back).
  const blockEl = currentBlockElement(editor);
  const blockStyle = blockEl ? getComputedStyle(blockEl) : null;
  const blockFontSizePx = blockStyle ? parseFloat(blockStyle.fontSize) || FALLBACK_FONT_SIZE_PX : FALLBACK_FONT_SIZE_PX;
  const blockLineHeightPx = blockStyle ? parseFloat(blockStyle.lineHeight) || blockFontSizePx * FALLBACK_LINE_SPACING : blockFontSizePx * FALLBACK_LINE_SPACING;
  const blockMarginBottomPx = blockStyle ? parseFloat(blockStyle.marginBottom) || 0 : FALLBACK_SPACING_AFTER_PX;

  // An inline run can override its own size independently of the block
  // (a `textStyle.fontSize` mark) — that never shows up in the *block*
  // element's own computed style, so it has to be checked first and takes
  // priority; falling back to the block's real rendered size (not a
  // hand-kept default) is what makes a heading with no override show its
  // actual size instead of a flat, wrong constant.
  const explicitFontSizePt = parseFontSizeToPt(editor.getAttributes('textStyle').fontSize as string | undefined);
  const currentFontSizePt = explicitFontSizePt ?? blockFontSizePx * PX_TO_PT;
  const currentLineSpacing = formatMultiplier(blockLineHeightPx / blockFontSizePx);
  const currentSpacingAfter = formatPt(blockMarginBottomPx * PX_TO_PT);

  // The line-spacing/space-after dropdowns are native <select>s — a value
  // with no matching <option> just renders blank/misleading — so make sure
  // whatever's actually in effect always has one to land on.
  const lineSpacingOptions = withCurrentValue(LINE_SPACINGS, currentLineSpacing);
  const spacingAfterOptions = withCurrentValue(SPACING_AFTER, currentSpacingAfter);

  const currentColor = editor.getAttributes('textStyle').color ?? null;
  const currentHighlight = editor.getAttributes('highlight').color ?? null;

  // Line spacing / space-after apply to the block itself (paragraph or
  // heading), never to just a run of inline text — there's no per-run
  // equivalent of `updateAttributes(type, ...)` the way marks have, so this
  // resolves which of the two node types is actually active first.
  const applyBlockSpacing = (attrs: { lineHeight?: string; spacingAfter?: string }) => {
    const type = editor.isActive('heading') ? 'heading' : 'paragraph';
    editor.chain().focus().updateAttributes(type, attrs).run();
  };

  const setHeading = (value: string) => {
    if (value === 'paragraph') editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  };

  const startPaintFormat = () => {
    if (editor.state.selection.empty) return;
    const marks: Record<string, Record<string, unknown>> = {};
    PAINT_FORMAT_MARKS.forEach((name) => {
      if (editor.isActive(name)) marks[name] = editor.getAttributes(name);
    });
    paintFormatMarksRef.current = marks;
    setPaintFormatActive(true);
  };

  const toggleSpellcheck = () => {
    const next = !spellcheckOn;
    editor.view.dom.setAttribute('spellcheck', String(next));
    setSpellcheckOn(next);
  };

  // Unlike Word, this editor does not auto-continue numbering across an
  // interrupting paragraph — every new ordered list starts fresh at 1 (its
  // own attribute default). So the useful direction here is "continue from
  // wherever the nearest earlier list left off", found by walking the
  // document's top-level nodes up to the cursor and remembering the last
  // ordered list's own start + item count.
  const continueNumbering = () => {
    const headPos = editor.state.selection.head;
    let continuation: number | null = null;
    editor.state.doc.forEach((node, offset) => {
      // Only a list that ends *before* the cursor's own list qualifies as
      // "preceding" — checking `offset < headPos` alone also matches the
      // list the cursor is currently inside (its start offset is before the
      // cursor too), which would make this continue from itself.
      if (offset + node.nodeSize > headPos) return;
      if (node.type.name === 'orderedList') {
        const start = (node.attrs as { start?: number }).start ?? 1;
        continuation = start + node.childCount;
      }
    });
    if (continuation !== null) {
      editor.chain().focus().updateAttributes('orderedList', { start: continuation }).run();
    }
  };

  const insertImageFromFile = async (file: File) => {
    try {
      await uploadAndInsertImage(editor, file, currentFolderId, resolveDefaultFolderId);
    } catch (error) {
      console.error('Failed to insert image:', error);
      alert('Could not upload that image. Please try again.');
    }
  };

  const insertLink = () => promptForLink(editor);

  return (
    <div className="shrink-0 bg-[#f3f2f6] border-b border-zinc-300 select-none">
      <div className="flex items-center gap-0.5 min-h-11 px-2 py-1 overflow-x-auto whitespace-nowrap">
        <RibbonButton title={isOutlineOpen ? 'Hide outline' : 'Show outline'} active={isOutlineOpen} onClick={onToggleOutline}>
          <PanelLeft className="w-3.5 h-3.5" />
        </RibbonButton>

        <RibbonDivider />

        <RibbonButton title="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Redo (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="w-3.5 h-3.5" />
        </RibbonButton>

        <RibbonDivider />

        <RibbonButton title="Print" onClick={() => window.print()}>
          <Printer className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title={spellcheckOn ? 'Spellcheck: on' : 'Spellcheck: off'} active={spellcheckOn} onClick={toggleSpellcheck}>
          <SpellCheck className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Paint format — copy formatting, then click or select text to apply it" active={paintFormatActive} onClick={startPaintFormat}>
          <Paintbrush className="w-3.5 h-3.5" />
        </RibbonButton>

        <RibbonDivider />

        <RibbonButton title="Zoom out" disabled={zoom <= 0.5} onClick={() => onZoomChange(Math.max(0.5, Math.round((zoom - 0.1) * 10) / 10))}>
          <ZoomOut className="w-3.5 h-3.5" />
        </RibbonButton>
        <button
          type="button"
          title="Reset zoom"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onZoomChange(1)}
          className="text-xs text-zinc-600 tabular-nums w-10 text-center cursor-pointer hover:text-zinc-900"
        >
          {Math.round(zoom * 100)}%
        </button>
        <RibbonButton title="Zoom in" disabled={zoom >= 2} onClick={() => onZoomChange(Math.min(2, Math.round((zoom + 0.1) * 10) / 10))}>
          <ZoomIn className="w-3.5 h-3.5" />
        </RibbonButton>

        <RibbonDivider />

        <RibbonSelect title="Paragraph style" widthClass="w-28" value={activeHeading} onChange={setHeading} options={HEADING_STYLES} />
        <RibbonSelect
          title="Font family"
          widthClass="w-32"
          value={currentFontFamily}
          onChange={(v) => (v ? editor.chain().focus().setFontFamily(v).run() : editor.chain().focus().unsetFontFamily().run())}
          options={FONT_FAMILIES.map((f) => ({ value: f.value, label: f.label, style: f.value ? { fontFamily: f.value } : undefined }))}
        />
        <RibbonStepper
          title="Font size (pt)"
          value={Math.round(currentFontSizePt * 10) / 10}
          min={1}
          max={400}
          onChange={(v) => editor.chain().focus().setFontSize(`${v}pt`).run()}
        />

        <RibbonDivider />

        <RibbonButton title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonColorPicker
          title="Text color"
          icon={<Baseline className="w-3.5 h-3.5" />}
          currentColor={currentColor}
          onPick={(c) => editor.chain().focus().setColor(c).run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
        />
        <RibbonColorPicker
          title="Highlight"
          icon={<Highlighter className="w-3.5 h-3.5" />}
          currentColor={currentHighlight}
          onPick={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
          onClear={() => editor.chain().focus().unsetHighlight().run()}
        />

        <RibbonDivider />

        <RibbonButton title="Insert link" active={editor.isActive('link')} onClick={insertLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Insert image" onClick={() => imageInputRef.current?.click()}>
          <ImageIcon className="w-3.5 h-3.5" />
        </RibbonButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void insertImageFromFile(file);
            e.target.value = '';
          }}
        />

        <RibbonDivider />

        <RibbonButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonSelect
          title="Line spacing"
          widthClass="w-14"
          value={currentLineSpacing}
          onChange={(v) => applyBlockSpacing({ lineHeight: v })}
          options={lineSpacingOptions.map((s) => ({ value: s, label: s }))}
        />
        <RibbonSelect
          title="Space after paragraph"
          widthClass="w-16"
          value={currentSpacingAfter}
          onChange={(v) => applyBlockSpacing({ spacingAfter: v })}
          options={spacingAfterOptions.map((s) => ({ value: s, label: s }))}
        />

        <RibbonDivider />

        <RibbonButton title="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListChecks className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton
          title="Decrease indent (Shift+Tab in a list)"
          disabled={!editor.can().liftListItem('listItem')}
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
        >
          <Outdent className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton
          title="Increase indent / nest list (Tab in a list)"
          disabled={!editor.can().sinkListItem('listItem')}
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
        >
          <Indent className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton
          title="Continue numbering from the previous list"
          disabled={!editor.isActive('orderedList')}
          onClick={continueNumbering}
        >
          <ListPlus className="w-3.5 h-3.5" />
        </RibbonButton>
        <RibbonButton
          title="Restart numbering at 1"
          disabled={!editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().updateAttributes('orderedList', { start: 1 }).run()}
        >
          <ListRestart className="w-3.5 h-3.5" />
        </RibbonButton>

        <RibbonDivider />

        <RibbonButton title="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting className="w-3.5 h-3.5" />
        </RibbonButton>
      </div>
    </div>
  );
}
