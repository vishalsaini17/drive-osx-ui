import { PageSetup } from '../book/pageSetup';

/**
 * A safe place inside a splittable block (paragraph/heading/list-item/table)
 * to break across a page boundary — always a word/line/row boundary, never
 * mid-character. `pos` is an absolute ProseMirror document position.
 */
export interface BlockSplitPoint {
  pos: number;
  /** Cumulative height, in px, of the block's own content up to this point. */
  heightBeforePx: number;
}

/**
 * One top-level block's measured geometry, as gathered by `domMeasurement.ts`.
 *
 * `heightPx` is the block's own intrinsic content height — deliberately NOT
 * derived from the gap between this block and its neighbours in the live
 * DOM, because that gap already includes any page-break spacer decorations
 * from the *previous* pagination pass. Measuring intrinsic heights and
 * letting `computePageBreaks` accumulate them itself is what keeps
 * pagination idempotent instead of compounding gaps on every recompute.
 */
export interface BlockMeasurement {
  pos: number;
  endPos: number;
  nodeType: string;
  heightPx: number;
  keepWithNext: boolean;
  /** Can this block be split mid-content across a page boundary at all? */
  splittable: boolean;
  /** An explicit `pageBreak` node immediately precedes this block. */
  forcedBreakBefore: boolean;
  sectionId: string;
  /** Empty for non-splittable blocks — such a block always moves as a whole. */
  splitPoints: BlockSplitPoint[];
}

export interface PageLayout {
  pageIndex: number;
  sectionId: string;
  pageSetup: PageSetup;
  contentStartPos: number;
  contentEndPos: number;
  /** Set when this page's content starts mid-block, continuing the previous page's split block. */
  splitOffsetInStartNode?: number;
  /** Set when this page's content ends mid-block, continuing onto the next page. */
  splitOffsetInEndNode?: number;
  /** Cumulative top offset of this page's sheet background, in the stacked-pages coordinate space. */
  topOffsetPx: number;
  /** Full outer sheet height (not just content area), in px. */
  heightPx: number;
  /**
   * How much of this page's printable content-area height its content
   * actually fills. `contentAreaHeightPx - contentUsedHeightPx` is the
   * trailing whitespace a page-gap spacer decoration needs to account for,
   * on top of the margins/header-footer reserve/inter-page gap themselves.
   */
  contentUsedHeightPx: number;
}

export interface PageBreakPlan {
  pages: PageLayout[];
}

/** Visual gap rendered between consecutive page sheets on screen. */
export const INTER_PAGE_GAP_PX = 24;
