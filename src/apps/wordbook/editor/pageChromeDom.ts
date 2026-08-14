import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { INTER_PAGE_GAP_PX, PageBreakPlan, PageLayout } from '../../../platform/documents/pagination/types';
import { contentAreaPx, mmToPx } from '../../../platform/documents/book/pageSetup';

/**
 * Builds the invisible spacer decorations that make one continuous flow of
 * text visually land on separate A4 sheets.
 *
 * Deliberately the *only* thing this system asks ProseMirror decorations to
 * do — the visible page sheet (white background, border, header/footer
 * text, page number) is rendered separately by React as a plain absolutely
 * positioned layer behind the content column (see `PageCanvas.tsx`), driven
 * by the same `PageBreakPlan`. Decorations are reserved for content that
 * must live *inside* the single editable DOM tree; the page chrome never
 * needs to be part of that tree at all.
 *
 * The same spacer builder handles both cases the plan calls for:
 *  - Between two sibling blocks: the widget renders as an ordinary DOM
 *    sibling, taking its own line.
 *  - Mid-paragraph/heading (a split point that isn't a block boundary): a
 *    `display:block` element inserted inline forces the browser to wrap the
 *    surrounding inline content in anonymous blocks above/below it
 *    (CSS2.1 §9.2.1.1) — the paragraph's DOM node is never actually split,
 *    so native caret movement, selection, and copy/paste across it keep
 *    working unmodified.
 */
export function buildPageBreakDecorations(plan: PageBreakPlan, doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];

  for (let i = 0; i < plan.pages.length - 1; i += 1) {
    const page = plan.pages[i];
    const next = plan.pages[i + 1];
    const breakPos = page.contentEndPos;
    if (breakPos < 0 || breakPos > doc.content.size) continue;

    const height = gapHeightPx(page, next);
    decorations.push(
      Decoration.widget(breakPos, () => buildSpacerDom(height), {
        side: 1,
        key: `wb-gap-${page.pageIndex}`,
      })
    );
  }

  // The last page never gets a "bridge to the next page" spacer above, so
  // whatever's left unused at the bottom of ITS content area was previously
  // never part of the editable DOM at all — the visible sheet still drew
  // that far down (page chrome is sized to the full page independently),
  // but a click there hit inert background behind the editor, not text.
  // ProseMirror already maps a click anywhere inside its own DOM bounds to
  // the nearest valid position (Word/Docs' "click anywhere" behavior) — the
  // bug was that those bounds stopped short of the visible page, not that
  // the click→position mapping itself was wrong.
  const lastPage = plan.pages[plan.pages.length - 1];
  if (lastPage) {
    const available = contentAreaPx(lastPage.pageSetup).heightPx;
    const trailing = Math.max(0, available - lastPage.contentUsedHeightPx);
    if (trailing > 0) {
      decorations.push(
        Decoration.widget(doc.content.size, () => buildSpacerDom(trailing), {
          side: 1,
          key: 'wb-gap-trailing',
        })
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}

function buildSpacerDom(heightPx: number): HTMLElement {
  const el = document.createElement('span');
  el.className = 'wb-page-gap-spacer';
  el.style.display = 'block';
  el.style.width = '100%';
  el.style.height = `${Math.max(0, heightPx)}px`;
  el.setAttribute('contenteditable', 'false');
  el.setAttribute('data-page-gap-spacer', 'true');
  return el;
}

/**
 * The vertical distance a spacer must bridge: whatever's left unused at the
 * bottom of the ending page's content area, plus that page's bottom margin
 * and footer reserve, plus the visual gap between sheets, plus the next
 * page's top margin and header reserve.
 */
function gapHeightPx(page: PageLayout, next: PageLayout): number {
  const available = contentAreaPx(page.pageSetup).heightPx;
  const unused = Math.max(0, available - page.contentUsedHeightPx);
  return (
    unused +
    mmToPx(page.pageSetup.marginBottomMm) +
    mmToPx(page.pageSetup.footerReserveMm) +
    INTER_PAGE_GAP_PX +
    mmToPx(next.pageSetup.marginTopMm) +
    mmToPx(next.pageSetup.headerReserveMm)
  );
}
