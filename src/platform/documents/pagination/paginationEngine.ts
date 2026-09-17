import { contentAreaPx, mmToPx, PageSetup } from '../book/pageSetup';
import { BlockMeasurement, INTER_PAGE_GAP_PX, PageBreakPlan, PageLayout } from './types';

/**
 * Turns a flat list of measured blocks into a page-by-page layout plan.
 *
 * Pure function — no DOM, no ProseMirror imports — so print/export can reuse
 * the exact same layout the editor is showing (spec: "the renderer used for
 * print/export should be based on the same document layout model used by
 * the editor"). `domMeasurement.ts` is the only thing that touches the DOM;
 * everything here works off already-measured numbers.
 */
export function computePageBreaks(
  measurements: BlockMeasurement[],
  defaultPageSetup: PageSetup,
): PageBreakPlan {
  const pages: PageLayout[] = [];

  if (measurements.length === 0) {
    return { pages: [emptyPage(0, 'default', defaultPageSetup, 0, 0)] };
  }

  let pageIndex = 0;
  let sectionId = measurements[0].sectionId;
  let pageSetup = defaultPageSetup;
  let available = contentAreaPx(pageSetup).heightPx;
  let used = 0;
  let pageStartPos = measurements[0].pos;
  let pageStartSplitOffset: number | undefined;
  let topOffsetPx = 0;

  const pushPage = (endPos: number, endSplitOffset: number | undefined) => {
    const heightPx = mmToPx(pageSetup.heightMm);
    pages.push({
      pageIndex,
      sectionId,
      pageSetup,
      contentStartPos: pageStartPos,
      contentEndPos: endPos,
      splitOffsetInStartNode: pageStartSplitOffset,
      splitOffsetInEndNode: endSplitOffset,
      topOffsetPx,
      heightPx,
      contentUsedHeightPx: used,
    });
    pageIndex += 1;
    topOffsetPx += heightPx + INTER_PAGE_GAP_PX;
  };

  const startNewPage = (startPos: number, startSplitOffset: number | undefined) => {
    pageStartPos = startPos;
    pageStartSplitOffset = startSplitOffset;
    used = 0;
  };

  for (let i = 0; i < measurements.length; i += 1) {
    const block = measurements[i];

    // A section boundary or an explicit page break always starts a fresh page.
    // Phase 1 only ever produces one implicit section, so `pageSetup` stays
    // `defaultPageSetup` throughout; a per-section page-setup lookup is the
    // seam for later portrait/landscape-mixing sections without changing
    // this loop's shape.
    const sectionChanged = block.sectionId !== sectionId;
    if (sectionChanged || (block.forcedBreakBefore && used > 0)) {
      pushPage(block.pos, undefined);
      sectionId = block.sectionId;
      available = contentAreaPx(pageSetup).heightPx;
      startNewPage(block.pos, undefined);
    }

    placeBlock(block, measurements, i);
  }

  // Flush whatever is left on the final page.
  const last = measurements[measurements.length - 1];
  pushPage(last.endPos, undefined);

  return { pages };

  /**
   * Places one block onto the current page, splitting or deferring it to a
   * fresh page as needed. May push zero or more finished pages before
   * returning, always leaving `pageStartPos`/`used` describing the page the
   * *next* block should be considered against.
   */
  function placeBlock(block: BlockMeasurement, all: BlockMeasurement[], index: number): void {
    // "Keep with next": if this heading fits but would end up alone at the
    // bottom of the page (its follower doesn't fit alongside it), push the
    // whole heading to the next page instead of orphaning it.
    if (block.keepWithNext && used > 0) {
      const next = all[index + 1];
      const nextFirstChunk = next
        ? next.splitPoints[0]?.heightBeforePx ?? next.heightPx
        : 0;
      const combined = block.heightPx + nextFirstChunk;
      if (block.heightPx <= available - used && combined > available - used) {
        pushPage(block.pos, undefined);
        startNewPage(block.pos, undefined);
      }
    }

    if (block.heightPx <= available - used) {
      used += block.heightPx;
      return;
    }

    // Doesn't fit in what's left of the current page. Move it to a fresh
    // page whole first — the same thing that already happens for a
    // non-splittable block (image/table) — rather than immediately hunting
    // for an internal split point. A block only ever gets split *within*
    // itself below, once it's alone on a brand-new, fully empty page and
    // still doesn't fit even then (a paragraph/table taller than a full
    // page, genuinely rare). Splitting eagerly instead of as this last
    // resort means every ordinary paragraph moves as one atomic unit, using
    // the plain "next sibling" spacer decoration already proven to render
    // correctly — never the mid-paragraph `display:block` widget trick,
    // which reflows unreliably inside a live contenteditable surface.
    if (used > 0) {
      pushPage(block.pos, undefined);
      startNewPage(block.pos, undefined);
    }

    if (block.heightPx <= available) {
      used += block.heightPx;
      return;
    }

    if (block.splittable && block.splitPoints.length > 0) {
      let cursorPos = block.pos;
      let consumedHeight = 0;

      while (consumedHeight < block.heightPx) {
        const remaining = available - used;
        if (block.heightPx - consumedHeight <= remaining) break;

        const candidates = block.splitPoints.filter(
          (p) => p.pos > cursorPos && p.heightBeforePx - consumedHeight <= remaining
        );
        const best = candidates.length > 0 ? candidates[candidates.length - 1] : undefined;

        if (best && best.heightBeforePx > consumedHeight) {
          // Credit the chunk of the block up to the split point to the page
          // being closed *before* snapshotting it via pushPage — otherwise
          // the finished page's recorded contentUsedHeightPx comes out as
          // whatever it was before this block started (often 0), which
          // throws off the trailing-gap math anything downstream derives
          // from it (the inter-page spacer decorations, print/export).
          used += best.heightBeforePx - consumedHeight;
          pushPage(best.pos, best.pos);
          startNewPage(best.pos, best.pos);
          consumedHeight = best.heightBeforePx;
          cursorPos = best.pos;
        } else {
          // Fresh page and still doesn't fit further — the rest of the
          // block simply runs long on this page rather than losing content.
          break;
        }
      }

      used += block.heightPx - consumedHeight;
      return;
    }

    // Non-splittable and still doesn't fit even alone on a fresh page —
    // runs long on this page rather than losing content.
    used += block.heightPx;
  }
}

function emptyPage(
  pageIndex: number,
  sectionId: string,
  pageSetup: PageSetup,
  contentStartPos: number,
  contentEndPos: number,
): PageLayout {
  return {
    pageIndex,
    sectionId,
    pageSetup,
    contentStartPos,
    contentEndPos,
    topOffsetPx: 0,
    heightPx: mmToPx(pageSetup.heightMm),
    contentUsedHeightPx: 0,
  };
}
