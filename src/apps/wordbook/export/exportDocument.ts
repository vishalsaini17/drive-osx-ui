import TurndownService from 'turndown';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  type ParagraphChild,
} from 'docx';
import type { PageBreakPlan } from '../../../platform/documents/pagination/types';

/** A ProseMirror JSON node/mark — this module only ever reads plain JSON (`editor.getJSON()`), never touches the live editor or DOM. */
interface PMJSONNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMJSONNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Each format below is split into a `buildXBlob` (the actual conversion,
// used by both "Download" and "Share to Chat" — see ShareToChatModal.tsx,
// which attaches the same blob to a message instead of saving it to disk)
// and a thin `downloadAsX` wrapper that just hands that blob to
// `triggerDownload`.

export function buildTxtBlob(text: string): Blob {
  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}

export function downloadAsTxt(text: string, baseName: string): void {
  triggerDownload(buildTxtBlob(text), `${baseName}.txt`);
}

/** Wraps `editor.getHTML()` in a minimal standalone document — the editor's own fragment has no `<html>/<head>`, so opened on its own in a browser it would render unstyled and title-less. */
export function buildHtmlBlob(bodyHtml: string, docTitle: string): Blob {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(docTitle)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.5; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #999; padding: 4px 8px; }
  img { max-width: 100%; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

export function downloadAsHtml(bodyHtml: string, docTitle: string): void {
  triggerDownload(buildHtmlBlob(bodyHtml, docTitle), `${docTitle}.html`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Markdown export goes HTML → Markdown via Turndown rather than walking ProseMirror JSON directly — reusing `editor.getHTML()` means every mark TipTap already knows how to render (color, highlight, links, tables) is handled by Turndown's own rules instead of a second hand-written conversion. */
export function buildMarkdownBlob(bodyHtml: string): Blob {
  const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
  const markdown = turndown.turndown(bodyHtml);
  return new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
}

export function downloadAsMarkdown(bodyHtml: string, baseName: string): void {
  triggerDownload(buildMarkdownBlob(bodyHtml), `${baseName}.md`);
}

// --------------------------------------------------------------------------
// DOCX — walks the raw ProseMirror JSON (not HTML) since `docx` builds a
// structured document model, not markup. Deliberately text-focused: bold,
// italic, underline, strike, sub/superscript, color, headings, alignment,
// tables, and lists (as plain "1. "/"• " prefixed paragraphs rather than
// real Word auto-numbering, which needs a `numbering` definition wired into
// the `Document` itself — a correctness risk not worth taking for a detail
// most read-only Word compatibility doesn't hinge on). Images are skipped:
// embedding them correctly needs fetching each one, detecting its real
// format, and getting `docx`'s `ImageRun` transformation options right, none
// of which this file can verify without a way to actually open the result
// in Word.
// --------------------------------------------------------------------------

function marksToRunOptions(marks: PMJSONNode['marks'] = []): Record<string, unknown> {
  const opts: Record<string, unknown> = {};
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') opts.bold = true;
    else if (mark.type === 'italic') opts.italics = true;
    else if (mark.type === 'underline') opts.underline = {};
    else if (mark.type === 'strike') opts.strike = true;
    else if (mark.type === 'subscript') opts.subScript = true;
    else if (mark.type === 'superscript') opts.superScript = true;
    else if (mark.type === 'textStyle') {
      const color = (mark.attrs as { color?: string } | undefined)?.color;
      if (color) opts.color = color.replace('#', '');
    }
  }
  return opts;
}

function inlineToRuns(content: PMJSONNode[] = []): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  for (const node of content) {
    if (node.type === 'text') {
      runs.push(new TextRun({ text: node.text ?? '', ...marksToRunOptions(node.marks) }));
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ text: '', break: 1 }));
    }
  }
  return runs;
}

function alignmentFromAttrs(attrs: Record<string, unknown> | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  switch (attrs?.textAlign) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return undefined;
  }
}

const DOCX_HEADING_LEVELS: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

function listToParagraphs(node: PMJSONNode, ordered: boolean): Paragraph[] {
  const out: Paragraph[] = [];
  let index = 1;
  for (const item of node.content ?? []) {
    for (const child of item.content ?? []) {
      if (child.type !== 'paragraph') continue;
      const prefix = ordered ? `${index}. ` : '• ';
      out.push(new Paragraph({ children: [new TextRun({ text: prefix }), ...inlineToRuns(child.content)] }));
    }
    index += 1;
  }
  return out;
}

function tableToElement(node: PMJSONNode): Table {
  const rows: TableRow[] = [];
  for (const row of node.content ?? []) {
    const cells: TableCell[] = [];
    for (const cell of row.content ?? []) {
      const cellParagraphs = (cell.content ?? []).flatMap((child) => blockToParagraphs(child));
      cells.push(new TableCell({ children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({})] }));
    }
    rows.push(new TableRow({ children: cells }));
  }
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

/** Only ever returns `Paragraph`s — used inside table cells, which `docx` requires to contain paragraphs/tables, not headings-as-a-distinct-type (a heading IS a Paragraph with a `heading` option set, so this covers that case too). */
function blockToParagraphs(node: PMJSONNode): Paragraph[] {
  if (node.type === 'paragraph') {
    return [new Paragraph({ children: inlineToRuns(node.content), alignment: alignmentFromAttrs(node.attrs) })];
  }
  if (node.type === 'heading') {
    const level = (node.attrs as { level?: number } | undefined)?.level ?? 1;
    return [new Paragraph({ heading: DOCX_HEADING_LEVELS[level] ?? HeadingLevel.HEADING_1, children: inlineToRuns(node.content), alignment: alignmentFromAttrs(node.attrs) })];
  }
  if (node.type === 'bulletList') return listToParagraphs(node, false);
  if (node.type === 'orderedList') return listToParagraphs(node, true);
  return [];
}

function docBlockToElements(node: PMJSONNode): (Paragraph | Table)[] {
  if (node.type === 'table') return [tableToElement(node)];
  if (node.type === 'pageBreak' || node.type === 'horizontalRule' || node.type === 'image' || node.type === 'taskList') {
    // Not represented in the DOCX export — see the module comment.
    return [];
  }
  return blockToParagraphs(node);
}

export async function buildDocxBlob(editorJSON: PMJSONNode): Promise<Blob> {
  const elements = (editorJSON.content ?? []).flatMap((node) => docBlockToElements(node));
  const doc = new Document({
    sections: [{ children: elements.length > 0 ? elements : [new Paragraph({})] }],
  });
  return Packer.toBlob(doc);
}

export async function downloadAsDocx(editorJSON: PMJSONNode, docTitle: string): Promise<void> {
  triggerDownload(await buildDocxBlob(editorJSON), `${docTitle}.docx`);
}

// --------------------------------------------------------------------------
// PDF — rasterizes the actual on-screen page stack (via html2canvas-pro)
// rather than redrawing text through jsPDF's own drawing API. Re-deriving
// font metrics, wrapping, and layout a second time in PDF-coordinate space
// would only ever be an approximation of what the pagination engine already
// computed and the browser already painted; screenshotting the real DOM
// means the export is exactly what's on screen — including fonts, colors,
// images, and tables — with zero risk of the two disagreeing.
//
// Specifically the `-pro` fork, not plain `html2canvas`: this app's CSS
// (Tailwind v4) generates colors as `oklch(...)`, which upstream
// html2canvas's parser predates and throws on for essentially every
// element on the page (its own background/text/border colors, not just
// document content) — `html2canvas-pro` is the actively-maintained fork
// that specifically adds support for oklch/lab/lch/color-mix.
//
// Both it and `jspdf` are dynamically imported so their (non-trivial)
// bundle cost is only ever paid by someone who actually exports a PDF.
// --------------------------------------------------------------------------

export async function buildPdfBlob(plan: PageBreakPlan): Promise<Blob> {
  const pageStackEl = document.querySelector<HTMLElement>('[data-wb-page-stack]');
  if (!pageStackEl || plan.pages.length === 0) {
    throw new Error('The document is not ready to export yet — try again in a moment.');
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);

  // A fixed oversampling factor, independent of the page's current on-screen
  // zoom (the captured element's own width/height are already zoom-free —
  // see the `data-wb-page-stack` comment in PageCanvas.tsx) — this is purely
  // about output sharpness.
  const renderScale = 2;
  const fullCanvas = await html2canvas(pageStackEl, {
    scale: renderScale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const first = plan.pages[0];
  const pdf = new jsPDF({
    orientation: first.pageSetup.orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [first.pageSetup.widthMm, first.pageSetup.heightMm],
  });

  plan.pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage([page.pageSetup.widthMm, page.pageSetup.heightMm], page.pageSetup.orientation === 'landscape' ? 'landscape' : 'portrait');
    }

    const sliceTop = Math.round(page.topOffsetPx * renderScale);
    const sliceHeight = Math.round(page.heightPx * renderScale);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = fullCanvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(fullCanvas, 0, sliceTop, fullCanvas.width, sliceHeight, 0, 0, fullCanvas.width, sliceHeight);

    pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, page.pageSetup.widthMm, page.pageSetup.heightMm);
  });

  return pdf.output('blob');
}

export async function downloadAsPdf(plan: PageBreakPlan, docTitle: string): Promise<void> {
  triggerDownload(await buildPdfBlob(plan), `${docTitle}.pdf`);
}
