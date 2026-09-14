import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { BlockMeasurement, BlockSplitPoint } from './types';

/**
 * The only file in the pagination system that touches the DOM/ProseMirror
 * view. Everything downstream (`paginationEngine.ts`) works off the plain
 * data this produces, which is what lets that engine be reused by
 * print/export without a browser.
 *
 * Deliberately reads geometry straight off the live, browser-rendered DOM
 * rather than computing word-wrap independently (e.g. via Canvas 2D
 * `measureText`): a synthetic layout can only ever *approximate* the
 * browser's actual text rendering (font substitution, kerning, subpixel
 * rounding all vary), and in a contentEditable surface the visible text is
 * still laid out by the browser regardless of what a separate computation
 * decided — so any drift between the two shows up as decorations landing
 * off the real line boundaries, compounding page over page. Reading the
 * real rendered DOM is exact by construction; that trade (depending on a
 * mounted view instead of being usable headless) is the right one for an
 * editor that has to stay visually correct above all else.
 */

const LINE_SPLITTABLE_TYPES = new Set(['paragraph', 'heading', 'listItem']);

/**
 * Phase 1 only ever has one implicit section (multi-section documents with
 * differing page setups are a later extension of this same shape), so every
 * measurement is tagged with a constant id rather than a real section node.
 */
export const DEFAULT_SECTION_ID = 'main';

export interface MeasureOptions {
  /**
   * Only measure blocks starting at or after this document position.
   * Used by the cheap "manual pagination mode" tail check, which only needs
   * to know whether newly-typed content still fits on the last known page —
   * not to re-measure the whole document.
   */
  fromPos?: number;
  /**
   * Skip the expensive per-word split-point walk (still measures each
   * block's own height). The tail check only needs to know whether a block
   * fits *at all*, not exactly where to split it if it doesn't — precision
   * there is restored by the next full "Repaginate Now"/save pass.
   */
  computeSplits?: boolean;
  /**
   * The page canvas's current visual zoom (1 = 100%). `getBoundingClientRect`
   * reports post-transform screen pixels, so every raw measurement is
   * divided by this before it leaves this file — the rest of the pipeline
   * (and the physical page dimensions it's compared against) always deals in
   * true 96dpi pixels, exactly like Word: zooming the view never moves where
   * a page actually breaks.
   */
  zoom?: number;
}

export function measureDocument(view: EditorView, options: MeasureOptions = {}): BlockMeasurement[] {
  const { fromPos = 0, computeSplits = true, zoom = 1 } = options;
  const { doc } = view.state;
  const measurements: BlockMeasurement[] = [];
  let forcedBreakPending = false;

  doc.forEach((node: PMNode, offset: number) => {
    const pos = offset;
    const endPos = offset + node.nodeSize;
    if (endPos <= fromPos) return;

    if (node.type.name === 'pageBreak') {
      // No visible height of its own — it just flags the next block.
      forcedBreakPending = true;
      return;
    }

    const dom = view.nodeDOM(pos);
    const el = dom instanceof HTMLElement ? dom : (dom?.parentElement ?? null);
    // `getBoundingClientRect` never includes an element's own margin (it's
    // outside the border box by definition), but the vertical space a block
    // actually occupies in the page's flow does include the gap its
    // margin-bottom opens up before the next block. Omitting it understates
    // every paragraph's contribution to a page's used height — with a dozen
    // paragraphs stacked on a page that adds up to real, visible space the
    // budget doesn't know about, so content keeps getting packed in past
    // where it actually fits, and the overflow shows up as a growing
    // misalignment on the pages that follow. Reading the real computed
    // margin (not a hand-kept constant) keeps this exact by construction —
    // it can never drift from whatever the CSS actually says.
    const marginBottomPx = el ? parseFloat(getComputedStyle(el).marginBottom || '0') : 0;
    const heightPx = el ? el.getBoundingClientRect().height / zoom + marginBottomPx : 0;

    const splittable = LINE_SPLITTABLE_TYPES.has(node.type.name);
    const splitPoints = splittable && computeSplits && el ? computeSplitPoints(view, el, pos, node, zoom) : [];

    measurements.push({
      pos,
      endPos,
      nodeType: node.type.name,
      heightPx,
      keepWithNext: Boolean((node.attrs as { keepWithNext?: boolean } | undefined)?.keepWithNext),
      splittable,
      forcedBreakBefore: forcedBreakPending,
      sectionId: DEFAULT_SECTION_ID,
      splitPoints,
    });
    forcedBreakPending = false;
  });

  return measurements;
}

/**
 * Word-boundary break points inside one block, each mapped to both a real
 * ProseMirror position (so a decoration/split can be placed exactly there)
 * and the pixel height of the block's own content above it (so the pure
 * engine can decide which one fits).
 *
 * Computed eagerly for every splittable block on every full measurement
 * pass — simplest-correct option for Phase 1 per "correctness over
 * premature optimization". The natural follow-up optimization, if a very
 * long document ever makes this measurably slow, is two-pass: measure
 * heights only, run `computePageBreaks` once to find which blocks actually
 * straddle a boundary, then compute split points only for those and
 * re-run — a change local to this file and the plugin that calls it, not
 * to the pure engine or its output shape.
 */
function computeSplitPoints(
  view: EditorView,
  el: HTMLElement,
  blockPos: number,
  node: PMNode,
  zoom: number,
): BlockSplitPoint[] {
  const blockRect = el.getBoundingClientRect();
  const raw: BlockSplitPoint[] = [];
  // Tracks the top of the last line a candidate was recorded for, so only
  // the first word of each visual line becomes a split candidate — every
  // other word on that line shares its `heightBeforePx`, and the engine
  // picks the *last* candidate whose height still fits. Without this dedup,
  // that would pick the last word of a line whose top (but not bottom) fits,
  // splitting the line itself across the page boundary instead of moving it
  // to the next page as a whole — never how a real word processor breaks.
  let lastLineTop: number | null = null;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode() as Text | null;

  while (textNode) {
    const text = textNode.data;
    for (const match of text.matchAll(/\S+/g)) {
      const offset = match.index ?? 0;
      const range = document.createRange();
      range.setStart(textNode, offset);
      range.collapse(true);
      const rect = range.getClientRects()[0];
      if (!rect) continue;

      if (lastLineTop !== null && Math.abs(rect.top - lastLineTop) < 0.5) continue;
      lastLineTop = rect.top;

      const pmPos = view.posAtDOM(textNode, offset);
      if (pmPos > blockPos) {
        raw.push({ pos: pmPos, heightBeforePx: (rect.top - blockRect.top) / zoom });
      }
    }
    textNode = walker.nextNode() as Text | null;
  }

  // Safety fallback: the very end of the block is always a valid "split"
  // (i.e. don't split at all, take the whole thing) so the engine always
  // has somewhere to land even for a block with no internal word boundaries.
  raw.push({ pos: blockPos + node.nodeSize - 1, heightBeforePx: blockRect.height / zoom });

  const seen = new Set<number>();
  return raw
    .filter((p) => {
      if (seen.has(p.pos)) return false;
      seen.add(p.pos);
      return true;
    })
    .sort((a, b) => a.pos - b.pos);
}
