import JSZip from 'jszip';
import { PresentationDeck, Slide, SlideElement } from './types';
import { nearestPageSize } from './format';

/**
 * Best-effort `.pptx` import — same spirit as Word Book's `.docx` import via
 * Mammoth (apps/wordbook/index.tsx `loadDocxImport`): not a lossless
 * round-trip of every PowerPoint feature, but a real, working open instead
 * of the "not supported yet" dead end. `.pptx` is a zip of XML parts (Office
 * Open XML), so this reads it with the same `jszip` the rest of this app
 * already depends on (via `pptxgenjs`/`mammoth`/`docx`) and the browser's own
 * `DOMParser` — no bespoke zip/XML parser, no new heavy dependency.
 *
 * What this recovers: slide order, each shape's text (grouped by paragraph),
 * and each shape's on-slide position/size (so the layout roughly matches the
 * original). What it does NOT recover: images, charts, tables, exact fonts,
 * colors, or animations — those stay on the original file, which is
 * untouched; only *this app's* editable copy is an approximation.
 *
 * Legacy binary `.ppt` (pre-2007, not a zip at all) is out of scope — it
 * fails `JSZip.loadAsync` immediately, which the caller turns into a clear
 * "convert to .pptx first" message rather than a silent crash.
 */

// PowerPoint's modern default slide size (16:9, in EMUs — 914400 EMU = 1in).
// Used only as a fallback when `presentation.xml` doesn't give one, so
// position/size percentages still have *some* denominator to divide by.
const DEFAULT_SLIDE_WIDTH_EMU = 12192000;
const DEFAULT_SLIDE_HEIGHT_EMU = 6858000;

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function firstEl(doc: Document | Element, tag: string): Element | null {
  return doc.getElementsByTagName(tag).item(0);
}

function textOfShape(shape: Element): string {
  const paragraphs = Array.from(shape.getElementsByTagName('a:p'));
  const lines = paragraphs.map((p) =>
    Array.from(p.getElementsByTagName('a:t'))
      .map((t) => t.textContent ?? '')
      .join('')
  );
  return lines.join('\n').trim();
}

function isTitleShape(shape: Element): boolean {
  const ph = shape.getElementsByTagName('p:ph').item(0);
  const type = ph?.getAttribute('type') ?? '';
  return type === 'title' || type === 'ctrTitle';
}

interface ShapeGeometry {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

interface EmuBox {
  x: number;
  y: number;
  cx: number;
  cy: number;
}

function readBox(xfrm: Element, offTag: string, extTag: string): EmuBox | null {
  const off = xfrm.getElementsByTagName(offTag).item(0);
  const ext = xfrm.getElementsByTagName(extTag).item(0);
  if (!off || !ext) return null;
  const x = Number(off.getAttribute('x'));
  const y = Number(off.getAttribute('y'));
  const cx = Number(ext.getAttribute('cx'));
  const cy = Number(ext.getAttribute('cy'));
  if (![x, y, cx, cy].every((n) => Number.isFinite(n))) return null;
  return { x, y, cx, cy };
}

// Maps a shape's own (locally-authored) EMU coordinates into slide-absolute
// EMUs: `absolute = offset + local * scale`. Identity for anything at the
// top of the shape tree; every level of `<p:grpSp>` nesting composes a new
// one (see `collectShapes` below) — grouped shapes' own `<a:xfrm>` is
// expressed in the *group's* local coordinate space, not the slide's, so
// reading it as if it already were slide-absolute (as a flat
// `getElementsByTagName('p:sp')` scan over the whole document would) puts
// every grouped shape in roughly the same wrong corner of the slide. This
// is likely the largest single source of visual mismatch between a
// PowerPoint/Google Slides file and what this importer used to produce —
// real slides routinely group the shapes that make up one visual "card" or
// "column" (see the module doc comment for the bigger picture).
interface Transform {
  offX: number;
  offY: number;
  scaleX: number;
  scaleY: number;
}
const IDENTITY_TRANSFORM: Transform = { offX: 0, offY: 0, scaleX: 1, scaleY: 1 };

interface CollectedShape {
  text: string;
  isTitle: boolean;
  geometry: ShapeGeometry | null;
}

// `childNodes` (not `.children`) so this doesn't depend on `ParentNode`
// support in whatever `DOMParser` implementation is running the XML
// through — filtered to element nodes (type 1) since XML text/whitespace
// nodes between tags would otherwise show up here too.
function elementChildren(node: Element): Element[] {
  return Array.from(node.childNodes).filter((n): n is Element => n.nodeType === 1);
}

function collectShapes(node: Element, transform: Transform, slideWidthEmu: number, slideHeightEmu: number, out: CollectedShape[]): void {
  elementChildren(node).forEach((child) => {
    if (child.tagName === 'p:sp') {
      const text = textOfShape(child);
      if (!text) return;
      const xfrm = child.getElementsByTagName('p:spPr').item(0)?.getElementsByTagName('a:xfrm').item(0);
      const local = xfrm ? readBox(xfrm, 'a:off', 'a:ext') : null;
      const geometry: ShapeGeometry | null = local
        ? {
            xPct: ((transform.offX + local.x * transform.scaleX) / slideWidthEmu) * 100,
            yPct: ((transform.offY + local.y * transform.scaleY) / slideHeightEmu) * 100,
            widthPct: ((local.cx * transform.scaleX) / slideWidthEmu) * 100,
            heightPct: ((local.cy * transform.scaleY) / slideHeightEmu) * 100,
          }
        : null;
      out.push({ text, isTitle: isTitleShape(child), geometry });
      return;
    }

    if (child.tagName === 'p:grpSp') {
      const xfrm = child.getElementsByTagName('p:grpSpPr').item(0)?.getElementsByTagName('a:xfrm').item(0);
      const box = xfrm ? readBox(xfrm, 'a:off', 'a:ext') : null;
      const childBox = xfrm ? readBox(xfrm, 'a:chOff', 'a:chExt') : null;
      if (box && childBox && childBox.cx !== 0 && childBox.cy !== 0) {
        const absOffX = transform.offX + box.x * transform.scaleX;
        const absOffY = transform.offY + box.y * transform.scaleY;
        const absExtX = box.cx * transform.scaleX;
        const absExtY = box.cy * transform.scaleY;
        const scaleX = absExtX / childBox.cx;
        const scaleY = absExtY / childBox.cy;
        collectShapes(
          child,
          { scaleX, scaleY, offX: absOffX - childBox.x * scaleX, offY: absOffY - childBox.y * scaleY },
          slideWidthEmu,
          slideHeightEmu,
          out
        );
        return;
      }
      // A group without a resolvable transform (rare/malformed) — still walk
      // its children under the current transform rather than dropping their
      // text entirely; positions will be approximate at worst.
      collectShapes(child, transform, slideWidthEmu, slideHeightEmu, out);
    }

    // `p:pic`, `p:graphicFrame` (tables/charts), `p:cxnSp` (connectors), etc.
    // are intentionally not walked — out of scope, see the module doc
    // comment.
  });
}

function collectSlideShapes(doc: Document, slideWidthEmu: number, slideHeightEmu: number): CollectedShape[] {
  const spTree = doc.getElementsByTagName('p:spTree').item(0);
  const out: CollectedShape[] = [];
  if (spTree) collectShapes(spTree, IDENTITY_TRANSFORM, slideWidthEmu, slideHeightEmu, out);
  return out;
}

// Resolves the real, user-visible slide order from `presentation.xml` +
// `presentation.xml.rels` (the `<p:sldIdLst>` order, not filename order —
// PowerPoint/Google Slides don't guarantee `slide2.xml` is actually the
// second slide once slides have been reordered or deleted). Falls back to a
// numeric filename sort if either part is missing or malformed, which is
// still right for the overwhelming majority of real files.
async function resolveSlideOrder(zip: JSZip): Promise<string[]> {
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  const relsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text');

  if (presentationXml && relsXml) {
    try {
      const relDoc = parseXml(relsXml);
      const relTargetById = new Map<string, string>();
      Array.from(relDoc.getElementsByTagName('Relationship')).forEach((rel) => {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        if (id && target) relTargetById.set(id, target);
      });

      const presDoc = parseXml(presentationXml);
      const sldIdList = firstEl(presDoc, 'p:sldIdLst');
      const ids = sldIdList ? Array.from(sldIdList.getElementsByTagName('p:sldId')) : [];
      const ordered = ids
        .map((sldId) => sldId.getAttribute('r:id'))
        .filter((id): id is string => !!id)
        .map((id) => relTargetById.get(id))
        .filter((target): target is string => !!target)
        .map((target) => `ppt/${target.replace(/^\.?\//, '')}`);

      if (ordered.length > 0) return ordered;
    } catch {
      // Falls through to the filename-sort fallback below.
    }
  }

  const slideFiles = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
  return slideFiles.sort((a, b) => {
    const numOf = (p: string) => Number(p.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
    return numOf(a) - numOf(b);
  });
}

export async function importPptxFile(arrayBuffer: ArrayBuffer, title: string): Promise<PresentationDeck> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  let slideWidthEmu = DEFAULT_SLIDE_WIDTH_EMU;
  let slideHeightEmu = DEFAULT_SLIDE_HEIGHT_EMU;
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  if (presentationXml) {
    const sldSz = firstEl(parseXml(presentationXml), 'p:sldSz');
    const w = Number(sldSz?.getAttribute('cx'));
    const h = Number(sldSz?.getAttribute('cy'));
    if (Number.isFinite(w) && w > 0) slideWidthEmu = w;
    if (Number.isFinite(h) && h > 0) slideHeightEmu = h;
  }

  const slidePaths = await resolveSlideOrder(zip);
  if (slidePaths.length === 0) {
    throw new Error('No slides found in this PowerPoint file.');
  }

  const now = Date.now();
  const slides: Slide[] = [];

  for (let slideIndex = 0; slideIndex < slidePaths.length; slideIndex += 1) {
    const xml = await zip.file(slidePaths[slideIndex])?.async('text');
    if (!xml) continue;
    const doc = parseXml(xml);
    const shapes = collectSlideShapes(doc, slideWidthEmu, slideHeightEmu);

    // A real `<p:ph type="title">` placeholder is the reliable signal — any
    // slide built from PowerPoint/Google Slides' own layout picker has one.
    // A slide with no such placeholder (a deck made of freeform text boxes,
    // with no layout at all) still gets *something* readable as a title
    // rather than every slide falling back to the generic "Slide N": its
    // first shape stands in for one.
    let titleIndex = shapes.findIndex((s) => s.isTitle);
    if (titleIndex === -1 && shapes.length > 0) titleIndex = 0;

    let fallbackY = 10;
    const elements: SlideElement[] = shapes.map((shape, i) => {
      const isTitleEl = i === titleIndex;
      if (!shape.geometry) fallbackY += 18;
      return {
        id: `el_${now}_${slideIndex}_${i + 1}`,
        type: 'text',
        x: shape.geometry?.xPct ?? 10,
        y: shape.geometry?.yPct ?? fallbackY,
        width: shape.geometry?.widthPct ?? 80,
        height: shape.geometry?.heightPct ?? 15,
        zIndex: i + 1,
        content: shape.text,
        fontSize: isTitleEl ? 36 : 18,
        fontWeight: isTitleEl ? 'black' : 'normal',
        color: isTitleEl ? '#0f172a' : '#1e293b',
        align: isTitleEl ? 'center' : 'left',
      };
    });

    slides.push({
      id: `slide_${now}_${slideIndex}`,
      title: titleIndex >= 0 ? shapes[titleIndex].text.split('\n')[0] : `Slide ${slideIndex + 1}`,
      layout: slideIndex === 0 ? 'title' : 'content',
      bgColor: '#ffffff',
      transition: 'fade',
      notes: '',
      elements,
      comments: [],
    });
  }

  return {
    id: `deck_${now}`,
    title,
    theme: 'clean-light',
    pageSize: nearestPageSize(slideWidthEmu, slideHeightEmu),
    slides,
  };
}
