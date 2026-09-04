import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import { computePageBreaks } from '../../../platform/documents/pagination/paginationEngine';
import { measureDocument } from '../../../platform/documents/pagination/domMeasurement';
import { contentAreaPx, PageSetup } from '../../../platform/documents/book/pageSetup';
import { PageBreakPlan } from '../../../platform/documents/pagination/types';
import { buildPageBreakDecorations } from './pageChromeDom';

export type PaginationMode = 'automatic' | 'manual';

interface PaginationPluginState {
  plan: PageBreakPlan;
  decorations: DecorationSet;
}

const RELAYOUT_META = 'wordbook-pagination-relayout';

export const paginationPluginKey = new PluginKey<PaginationPluginState>('wordbook-pagination');

export interface PaginationPluginOptions {
  getPageSetup: () => PageSetup;
  getMode: () => PaginationMode;
  /** Current visual zoom of the page canvas (1 = 100%); defaults to 1 if omitted. */
  getZoom?: () => number;
  /** Called whenever a new plan is actually applied — drives the page-chrome React layer. */
  onPlanChange?: (plan: PageBreakPlan) => void;
}

/**
 * The ProseMirror-facing half of pagination: schedules `computePageBreaks`
 * runs and turns the result into decorations, with the guards a
 * decoration-driven layout pass needs to avoid fighting the editor:
 *
 *  - coalesced to once per animation frame, not once per keystroke;
 *  - skipped entirely while an IME composition is in progress, and re-run
 *    once it ends;
 *  - the relayout transaction never changes `doc`, so ProseMirror's own
 *    `view.state.doc === prevState.doc` identity check in `update()` is
 *    exactly what prevents it from re-triggering itself — no extra
 *    dispatch-loop bookkeeping needed beyond that.
 */
export function createPaginationPlugin(options: PaginationPluginOptions): Plugin<PaginationPluginState> {
  let frame: number | null = null;

  return new Plugin<PaginationPluginState>({
    key: paginationPluginKey,
    state: {
      init(): PaginationPluginState {
        return { plan: { pages: [] }, decorations: DecorationSet.empty };
      },
      apply(tr, prev): PaginationPluginState {
        const forced = tr.getMeta(RELAYOUT_META) as PaginationPluginState | undefined;
        if (forced) return forced;
        if (!tr.docChanged) return prev;
        return { plan: prev.plan, decorations: prev.decorations.map(tr.mapping, tr.doc) };
      },
    },
    props: {
      decorations(state) {
        return paginationPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
    view(editorView) {
      const schedule = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = null;
          if (editorView.isDestroyed) return;
          runPagination(editorView, options, false);
        });
      };

      const onCompositionEnd = () => schedule();
      editorView.dom.addEventListener('compositionend', onCompositionEnd);

      // Lay out the freshly-mounted document once.
      schedule();

      return {
        update(view, prevState) {
          if (view.composing) return;
          if (view.state.doc === prevState.doc) return;
          schedule();
        },
        destroy() {
          if (frame !== null) cancelAnimationFrame(frame);
          editorView.dom.removeEventListener('compositionend', onCompositionEnd);
        },
      };
    },
  });
}

/** The current plan, if pagination has run at least once. */
export function getPaginationPlan(view: EditorView): PageBreakPlan | undefined {
  return paginationPluginKey.getState(view.state)?.plan;
}

/** Forces a full, precise repagination right now — "Repaginate Now" and Save use this. */
export function repaginateNow(view: EditorView, options: PaginationPluginOptions): void {
  runPagination(view, options, true);
}

function runPagination(view: EditorView, options: PaginationPluginOptions, force: boolean): void {
  const mode = options.getMode();
  const current = paginationPluginKey.getState(view.state);

  if (!force && mode === 'manual' && current && current.plan.pages.length > 0) {
    if (tailStillFits(view, current.plan, options.getZoom?.() ?? 1)) {
      // Deferred: still fits, so the expensive full remeasure is skipped
      // entirely until "Repaginate Now"/Save or an actual overflow.
      return;
    }
  }

  const measurements = measureDocument(view, { zoom: options.getZoom?.() ?? 1 });
  const plan = computePageBreaks(measurements, options.getPageSetup());
  const decorations = buildPageBreakDecorations(plan, view.state.doc);

  view.dispatch(view.state.tr.setMeta(RELAYOUT_META, { plan, decorations } satisfies PaginationPluginState));
  options.onPlanChange?.(plan);
}

/**
 * Manual mode's cheap check: does the page currently holding the cursor
 * still fit its content? Only sums intrinsic heights (no per-word
 * split-point walk), so this is a fraction of the cost of a full pass —
 * edits elsewhere in the document never reach this measurement at all,
 * which is what keeps them from triggering a reflow in manual mode.
 */
function tailStillFits(view: EditorView, plan: PageBreakPlan, zoom: number): boolean {
  const head = view.state.selection.head;
  const page =
    plan.pages.find((p) => head >= p.contentStartPos && head <= p.contentEndPos) ??
    plan.pages[plan.pages.length - 1];
  if (!page) return true;

  const tail = measureDocument(view, { fromPos: page.contentStartPos, computeSplits: false, zoom });
  const usedHeight = tail.reduce((sum, m) => sum + m.heightPx, 0);
  const availableHeight = contentAreaPx(page.pageSetup).heightPx;
  return usedHeight <= availableHeight;
}
