import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import { PageBreakPlan } from '../../../platform/documents/pagination/types';
import { contentAreaMm, mmToPx, PageSetup } from '../../../platform/documents/book/pageSetup';

interface PageCanvasProps {
  editor: Editor | null;
  plan: PageBreakPlan;
  pageSetup: PageSetup;
  zoom: number;
}

/**
 * The A4 page workspace.
 *
 * Renders the editable content as ONE continuous ProseMirror surface (the
 * `paginationPlugin` decorations inside it are what make it visually land
 * on separate sheets) and, separately, a purely decorative "page chrome"
 * layer — white sheet backgrounds, borders, page numbers — absolutely
 * positioned behind it from the same `PageBreakPlan`. The chrome never
 * needs to be part of the editable DOM tree, so it's plain React, not
 * ProseMirror decorations.
 */
export default function PageCanvas({ editor, plan, pageSetup, zoom }: PageCanvasProps) {
  const pageWidthPx = mmToPx(pageSetup.widthMm);
  const content = contentAreaMm(pageSetup);
  const contentWidthPx = mmToPx(content.widthMm);
  const marginLeftPx = mmToPx(pageSetup.marginLeftMm);
  const marginRightPx = mmToPx(pageSetup.marginRightMm);
  const firstPageTopPx = mmToPx(pageSetup.marginTopMm + pageSetup.headerReserveMm);
  const lastPageBottomPx = mmToPx(pageSetup.marginBottomMm + pageSetup.footerReserveMm);

  const pages = plan.pages.length > 0 ? plan.pages : [];
  const stackHeightPx =
    pages.length > 0 ? pages[pages.length - 1].topOffsetPx + pages[pages.length - 1].heightPx : mmToPx(pageSetup.heightMm);

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#e9eaee]" data-testid="wb-scroll-container">
      <style>{`
        .wb-prosemirror { outline: none; }
        .wb-prosemirror p { margin: 0 0 10px 0; }
        .wb-prosemirror h1 { font-size: 1.9em; font-weight: 700; margin: 0.3em 0 0.35em; }
        .wb-prosemirror h2 { font-size: 1.5em; font-weight: 700; margin: 0.3em 0 0.3em; }
        .wb-prosemirror h3 { font-size: 1.25em; font-weight: 700; margin: 0.3em 0 0.25em; }
        .wb-prosemirror h4, .wb-prosemirror h5, .wb-prosemirror h6 { font-weight: 700; margin: 0.3em 0 0.25em; }
        .wb-prosemirror ul, .wb-prosemirror ol { margin: 0 0 10px 0; padding-left: 1.4em; }
        .wb-prosemirror table { border-collapse: collapse; margin: 0 0 10px 0; width: 100%; }
        .wb-prosemirror td, .wb-prosemirror th { border: 1px solid #d4d4d8; padding: 4px 8px; }
        .wb-prosemirror img { max-width: 100%; }
        .wb-prosemirror img[data-wrap="block"] { display: block; }
        .wb-prosemirror img[data-wrap="block"][data-align="left"] { margin: 0 auto 10px 0; }
        .wb-prosemirror img[data-wrap="block"][data-align="center"] { margin: 0 auto 10px auto; }
        .wb-prosemirror img[data-wrap="block"][data-align="right"] { margin: 0 0 10px auto; }
        .wb-prosemirror img[data-wrap="inline"][data-align="left"] { float: left; margin: 0 12px 8px 0; }
        .wb-prosemirror img[data-wrap="inline"][data-align="right"] { float: right; margin: 0 0 8px 12px; }
        .wb-prosemirror img[data-wrap="inline"][data-align="center"] { display: inline-block; vertical-align: middle; margin: 0 6px 8px; }
        .wb-page-gap-spacer { pointer-events: none; }
      `}</style>

      <div className="flex justify-center py-10">
        {/*
          The zoom transform below scales paint only, not layout — this
          outer box reserves the actual on-screen (zoomed) footprint so the
          scroll container sizes correctly. The ProseMirror content itself is
          never touched by the transform's ancestor chain in a way that
          affects `domMeasurement.ts`: that file reads screen pixels via
          `getBoundingClientRect` and divides by this same zoom factor, so
          the page-break plan stays identical at every zoom level — matching
          Word, where zooming never moves a page break.
        */}
        <div className="relative" style={{ width: pageWidthPx * zoom, height: stackHeightPx * zoom }}>
          <div
            className="absolute top-0 left-0"
            style={{ width: pageWidthPx, height: stackHeightPx, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
          {/* Decorative page chrome — behind the content column. */}
          {pages.map((page) => (
            <div
              key={page.pageIndex}
              className="absolute left-0 bg-white border border-black/10 shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
              style={{ top: page.topOffsetPx, width: pageWidthPx, height: page.heightPx, zIndex: 0 }}
            >
              <div
                className="absolute left-0 right-0 text-center text-[10px] text-zinc-400 select-none"
                style={{ bottom: mmToPx(page.pageSetup.marginBottomMm) / 2 - 6 }}
              >
                Page {page.pageIndex + 1} of {pages.length}
              </div>
            </div>
          ))}

          {/* The one continuous editable surface. */}
          <div
            className="relative"
            style={{
              zIndex: 1,
              width: pageWidthPx,
              paddingTop: firstPageTopPx,
              paddingBottom: lastPageBottomPx,
              paddingLeft: marginLeftPx,
              paddingRight: marginRightPx,
              boxSizing: 'border-box',
              fontFamily: '"Georgia", "Times New Roman", serif',
              fontSize: 13,
              lineHeight: 1.5,
              color: '#18181b',
            }}
          >
            <div style={{ width: contentWidthPx }}>
              <EditorContent editor={editor} className="wb-prosemirror" />
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
