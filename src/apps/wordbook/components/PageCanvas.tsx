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
        .wb-prosemirror ul[data-type="taskList"] { list-style: none; margin: 0 0 10px 0; padding-left: 0.2em; }
        .wb-prosemirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 6px; }
        .wb-prosemirror ul[data-type="taskList"] li > label { margin-top: 3px; user-select: none; }
        .wb-prosemirror ul[data-type="taskList"] li > div { flex: 1; }
        .wb-prosemirror ul[data-type="taskList"] li[data-checked="true"] > div { color: #9ca3af; text-decoration: line-through; }
        .wb-prosemirror ul[data-type="taskList"] ul[data-type="taskList"] { margin: 0; padding-left: 1.4em; }
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

        /*
          TipTap's Image "resize" option (schema.ts) builds real drag handles
          via ResizableNodeView — the drag/resize logic already works — but
          ships them with no visible styling at all (0×0, no background), so
          without this CSS clicking an image shows no on-screen affordance
          that it's resizable. ProseMirror itself adds "ProseMirror-selectednode"
          to the node view's own dom ([data-resize-container]) once the
          image is clicked/selected, which is what gates handle visibility
          here — matching Word/Docs, where handles appear only once you've
          clicked the image, not all the time.
        */
        .wb-prosemirror [data-resize-container] { outline: 1px solid transparent; }
        .wb-prosemirror [data-resize-container].ProseMirror-selectednode { outline-color: #2563eb; }
        .wb-prosemirror [data-resize-handle] { z-index: 3; pointer-events: none; }
        .wb-prosemirror [data-resize-container].ProseMirror-selectednode [data-resize-handle] { pointer-events: auto; }
        .wb-prosemirror [data-resize-handle="left"], .wb-prosemirror [data-resize-handle="right"] { width: 12px; cursor: ew-resize; }
        .wb-prosemirror [data-resize-handle="left"]::after, .wb-prosemirror [data-resize-handle="right"]::after {
          content: ''; position: absolute; top: 50%; left: 50%; width: 9px; height: 9px;
          transform: translate(-50%, -50%); background: #fff; border: 1.5px solid #2563eb; border-radius: 2px;
          opacity: 0;
        }
        .wb-prosemirror [data-resize-handle="bottom-left"], .wb-prosemirror [data-resize-handle="bottom-right"] {
          width: 9px; height: 9px; background: #fff; border: 1.5px solid #2563eb; border-radius: 2px; opacity: 0;
        }
        .wb-prosemirror [data-resize-handle="bottom-left"] { cursor: nesw-resize; transform: translate(-50%, 50%); }
        .wb-prosemirror [data-resize-handle="bottom-right"] { cursor: nwse-resize; transform: translate(50%, 50%); }
        .wb-prosemirror [data-resize-container].ProseMirror-selectednode [data-resize-handle]::after,
        .wb-prosemirror [data-resize-container].ProseMirror-selectednode [data-resize-handle="bottom-left"],
        .wb-prosemirror [data-resize-container].ProseMirror-selectednode [data-resize-handle="bottom-right"] { opacity: 1; }

        .wb-page-gap-spacer { pointer-events: none; }
        .wb-bookmark { cursor: pointer; padding: 0 2px; }
        .wb-chip {
          display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px 1px 6px; margin: 0 1px;
          border-radius: 9999px; background: #eef2ff; color: #3730a3; font-size: 0.85em; line-height: 1.6;
          border: 1px solid #c7d2fe; cursor: pointer; white-space: nowrap; vertical-align: middle;
        }
        .wb-chip-date { cursor: default; }
        .wb-dropdown-chip { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
        .wb-prosemirror a { cursor: text; }
        .wb-search-match { background: #fef08a; border-radius: 2px; }
        .wb-search-match-current { background: #fb923c; }
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
            // Marks the element PDF export rasterizes via html2canvas. Its
            // own `width`/`height` style are the true, zoom-independent
            // pixel dimensions (a CSS `transform` never changes layout box
            // size, only paint), so capturing exactly this node — not an
            // ancestor or the zoomed outer box — is what keeps the exported
            // PDF's resolution identical no matter what zoom the user
            // happens to be viewing at.
            data-wb-page-stack="true"
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
