import React, { useRef, useState } from 'react';
import { Editor, useEditorState } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  ListRestart,
  ListPlus,
  Baseline,
  Highlighter,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Minus,
  FileDown,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { RibbonGroup, RibbonDivider, RibbonButton, RibbonSelect, RibbonColorPicker, RibbonTab } from './RibbonPrimitives';
import { FileService } from '../../../../platform/files/FileService';

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

const FONT_SIZES = ['8pt', '9pt', '10pt', '10.5pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt', '36pt', '48pt', '72pt'];

const HEADING_STYLES = [
  { value: 'paragraph', label: 'Normal' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
];

type RibbonTabId = 'home' | 'insert' | 'view';

interface RibbonToolbarProps {
  editor: Editor | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentFolderId: string | null;
  resolveDefaultFolderId: (name: string) => string | null;
}

export default function RibbonToolbar({ editor, zoom, onZoomChange, currentFolderId, resolveDefaultFolderId }: RibbonToolbarProps) {
  const [tab, setTab] = useState<RibbonTabId>('home');
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Re-render on every editor transaction so active-state highlighting
  // (bold/heading/align/etc.) stays in sync with the cursor. `useEditorState`
  // subscribes via `useSyncExternalStore` under the hood, which is what
  // keeps this tearing-safe — a hand-rolled `editor.on('transaction', ...)`
  // + manual re-render here raced React's own commit timing during
  // StrictMode's dev double-invoke.
  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });

  if (!editor) {
    return <div className="h-[104px] shrink-0 bg-[#f3f2f6] border-b border-zinc-300" />;
  }

  const activeHeading = HEADING_STYLES.find((h) => h.value !== 'paragraph' && editor.isActive('heading', { level: Number(h.value.slice(1)) }))?.value ?? 'paragraph';
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily ?? '';
  const currentFontSize = editor.getAttributes('textStyle').fontSize ?? '12pt';
  const currentColor = editor.getAttributes('textStyle').color ?? null;
  const currentHighlight = editor.getAttributes('highlight').color ?? null;

  const setHeading = (value: string) => {
    if (value === 'paragraph') editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
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
      const parentId = currentFolderId ?? resolveDefaultFolderId('Documents');
      const uploaded = await FileService.upload(file, { parentId: parentId ?? undefined });
      const url = await FileService.downloadUrl(uploaded._id);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (error) {
      console.error('Failed to insert image:', error);
      alert('Could not upload that image. Please try again.');
    }
  };

  const insertLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = prompt('Link URL:', previousUrl ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="shrink-0 bg-[#f3f2f6] border-b border-zinc-300 select-none">
      <div className="flex items-center gap-0.5 px-3 pt-1">
        <RibbonTab active={tab === 'home'} onClick={() => setTab('home')}>Home</RibbonTab>
        <RibbonTab active={tab === 'insert'} onClick={() => setTab('insert')}>Insert</RibbonTab>
        <RibbonTab active={tab === 'view'} onClick={() => setTab('view')}>View</RibbonTab>
      </div>

      <div className="flex items-stretch min-h-[78px] px-2 py-1.5 bg-white/60 border-t border-white">
        {tab === 'home' && (
          <>
            <RibbonGroup label="Undo">
              <RibbonButton title="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
                <Undo2 className="w-3.5 h-3.5" />
              </RibbonButton>
              <RibbonButton title="Redo (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
                <Redo2 className="w-3.5 h-3.5" />
              </RibbonButton>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Font">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <RibbonSelect
                    title="Font family"
                    widthClass="w-32"
                    value={currentFontFamily}
                    onChange={(v) => (v ? editor.chain().focus().setFontFamily(v).run() : editor.chain().focus().unsetFontFamily().run())}
                    options={FONT_FAMILIES.map((f) => ({ value: f.value, label: f.label, style: f.value ? { fontFamily: f.value } : undefined }))}
                  />
                  <RibbonSelect
                    title="Font size"
                    widthClass="w-16"
                    value={currentFontSize}
                    onChange={(v) => editor.chain().focus().setFontSize(v).run()}
                    options={FONT_SIZES.map((s) => ({ value: s, label: s }))}
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <RibbonButton title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="w-3.5 h-3.5" />
                  </RibbonButton>
                  <RibbonButton title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="w-3.5 h-3.5" />
                  </RibbonButton>
                  <RibbonButton title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="w-3.5 h-3.5" />
                  </RibbonButton>
                  <RibbonButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="w-3.5 h-3.5" />
                  </RibbonButton>
                  <RibbonButton title="Subscript" active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()}>
                    <SubscriptIcon className="w-3.5 h-3.5" />
                  </RibbonButton>
                  <RibbonButton title="Superscript" active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
                    <SuperscriptIcon className="w-3.5 h-3.5" />
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
                </div>
              </div>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Paragraph">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-0.5">
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
                </div>
                <div className="flex items-center gap-0.5">
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
                </div>
              </div>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Styles">
              <RibbonSelect title="Paragraph style" widthClass="w-28" value={activeHeading} onChange={setHeading} options={HEADING_STYLES} />
            </RibbonGroup>
          </>
        )}

        {tab === 'insert' && (
          <>
            <RibbonGroup label="Tables">
              <RibbonButton title="Insert 3×3 table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </RibbonButton>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Media">
              <RibbonButton title="Insert image" onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image</span>
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
              <RibbonButton title="Insert link" active={editor.isActive('link')} onClick={insertLink}>
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link</span>
              </RibbonButton>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Pages">
              <RibbonButton title="Page break (Ctrl+Enter)" onClick={() => editor.chain().focus().insertPageBreak().run()}>
                <FileDown className="w-3.5 h-3.5" />
                <span>Page break</span>
              </RibbonButton>
              <RibbonButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <Minus className="w-3.5 h-3.5" />
                <span>Rule</span>
              </RibbonButton>
            </RibbonGroup>
          </>
        )}

        {tab === 'view' && (
          <RibbonGroup label="Zoom">
            <RibbonButton title="Zoom out" disabled={zoom <= 0.5} onClick={() => onZoomChange(Math.max(0.5, Math.round((zoom - 0.1) * 10) / 10))}>
              <ZoomOut className="w-3.5 h-3.5" />
            </RibbonButton>
            <span className="text-xs text-zinc-600 tabular-nums w-11 text-center">{Math.round(zoom * 100)}%</span>
            <RibbonButton title="Zoom in" disabled={zoom >= 2} onClick={() => onZoomChange(Math.min(2, Math.round((zoom + 0.1) * 10) / 10))}>
              <ZoomIn className="w-3.5 h-3.5" />
            </RibbonButton>
            <RibbonButton title="Reset zoom" onClick={() => onZoomChange(1)}>
              <span>100%</span>
            </RibbonButton>
          </RibbonGroup>
        )}
      </div>
    </div>
  );
}
