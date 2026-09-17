import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import { PageBreakPlan } from '../../../platform/documents/pagination/types';
import { contentAreaMm, mmToPx, PageSetup } from '../../../platform/documents/book/pageSetup';
import PageRuler from './PageRuler';

interface PageCanvasProps {
  editor: Editor | null;
  plan: PageBreakPlan;
  pageSetup: PageSetup;
  zoom: number;
  showLineNumbers?: boolean;
  showRuler?: boolean;
  printLayoutOn?: boolean;
  showNonPrintingChars?: boolean;
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
export default function PageCanvas({
  editor,
  plan,
  pageSetup,
  zoom,
  showLineNumbers,
  showRuler,
  printLayoutOn = true,
  showNonPrintingChars,
}: PageCanvasProps) {
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
    <div
      className={`flex-1 min-h-0 overflow-auto bg-[#e9eaee] ${showLineNumbers ? 'wb-line-numbers' : ''} ${
        showNonPrintingChars ? 'wb-nonprinting' : ''
      }`}
      data-testid="wb-scroll-container"
    >
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

        /* Checklist style variants (Insert-menu-style picker on the ribbon's checklist button). */
        .wb-prosemirror ul[data-type="taskList"][data-checklist-variant="round"] li > label input[type="checkbox"] {
          appearance: none; -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
          border: 1.5px solid #a1a1aa; background: #fff; cursor: pointer; position: relative; margin: 0;
        }
        .wb-prosemirror ul[data-type="taskList"][data-checklist-variant="round"] li > label input[type="checkbox"]:checked {
          background: #16a34a; border-color: #16a34a;
        }
        .wb-prosemirror ul[data-type="taskList"][data-checklist-variant="round"] li > label input[type="checkbox"]:checked::after {
          content: ''; position: absolute; left: 4px; top: 1px; width: 3px; height: 7px; border: solid white;
          border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
        }

        /*
          Bullet-style presets. Only the shape/glyph varies — native browser
          nesting already shows disc/circle/square per depth for an
          untagged list, so "default" is simply the absence of an override.
          Modern \`::marker\` supports arbitrary \`content\` directly (no
          \`list-style:none\` + \`::before\` workaround needed).
        */
        .wb-prosemirror ul[data-bullet-style="diamond"] > li::marker { content: "❖  "; }
        .wb-prosemirror ul[data-bullet-style="diamond"] ul > li::marker { content: "➢  "; }
        .wb-prosemirror ul[data-bullet-style="diamond"] ul ul > li::marker { content: "▪  "; }
        .wb-prosemirror ul[data-bullet-style="boxes"] > li::marker { content: "▪  "; }
        .wb-prosemirror ul[data-bullet-style="boxes"] ul > li::marker { content: "▫  "; }
        .wb-prosemirror ul[data-bullet-style="boxes"] ul ul > li::marker { content: "▣  "; }
        .wb-prosemirror ul[data-bullet-style="arrow"] > li::marker { content: "➤  "; }
        .wb-prosemirror ul[data-bullet-style="arrow"] ul > li::marker { content: "◆  "; }
        .wb-prosemirror ul[data-bullet-style="arrow"] ul ul > li::marker { content: "▪  "; }
        .wb-prosemirror ul[data-bullet-style="star"] > li::marker { content: "★  "; }
        .wb-prosemirror ul[data-bullet-style="star"] ul > li::marker { content: "○  "; }
        .wb-prosemirror ul[data-bullet-style="star"] ul ul > li::marker { content: "▪  "; }
        .wb-prosemirror ul[data-bullet-style="arrow2"] > li::marker { content: "➤  "; }
        .wb-prosemirror ul[data-bullet-style="arrow2"] ul > li::marker { content: "○  "; }
        .wb-prosemirror ul[data-bullet-style="arrow2"] ul ul > li::marker { content: "▪  "; }

        /*
          Numbered-list-style presets. \`counters(list-item, ".")\` (plural)
          walks every ancestor list's implicit \`list-item\` counter and joins
          them — exactly the "1.2.3." legal-numbering look — with no manual
          counter-reset bookkeeping needed.
        */
        .wb-prosemirror ol[data-number-style="default"] { list-style-type: decimal; }
        .wb-prosemirror ol[data-number-style="default"] ol { list-style-type: lower-alpha; }
        .wb-prosemirror ol[data-number-style="default"] ol ol { list-style-type: lower-roman; }
        .wb-prosemirror ol[data-number-style="parens"] > li::marker { content: counter(list-item) ") "; }
        .wb-prosemirror ol[data-number-style="parens"] ol > li::marker { content: counter(list-item, lower-alpha) ") "; }
        .wb-prosemirror ol[data-number-style="parens"] ol ol > li::marker { content: counter(list-item, lower-roman) ") "; }
        .wb-prosemirror ol[data-number-style="legal"] > li::marker,
        .wb-prosemirror ol[data-number-style="legal"] ol > li::marker,
        .wb-prosemirror ol[data-number-style="legal"] ol ol > li::marker { content: counters(list-item, ".") ". "; }
        .wb-prosemirror ol[data-number-style="upperAlpha"] { list-style-type: upper-alpha; }
        .wb-prosemirror ol[data-number-style="upperAlpha"] ol { list-style-type: lower-alpha; }
        .wb-prosemirror ol[data-number-style="upperAlpha"] ol ol { list-style-type: lower-roman; }
        .wb-prosemirror ol[data-number-style="upperRoman"] { list-style-type: upper-roman; }
        .wb-prosemirror ol[data-number-style="upperRoman"] ol { list-style-type: upper-alpha; }
        .wb-prosemirror ol[data-number-style="upperRoman"] ol ol { list-style-type: decimal; }
        .wb-prosemirror ol[data-number-style="zeroPadded"] { list-style-type: decimal-leading-zero; }
        .wb-prosemirror ol[data-number-style="zeroPadded"] ol { list-style-type: lower-alpha; }
        .wb-prosemirror ol[data-number-style="zeroPadded"] ol ol { list-style-type: lower-roman; }
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
        .wb-chip-citation {
          background: transparent; border: none; padding: 0 1px; margin: 0; color: #2563eb; font-weight: 600;
          font-size: 0.75em; vertical-align: super; line-height: 1; cursor: pointer;
        }

        /*
          Continuous, document-wide numbering of each top-level block — not
          true per-wrapped-visual-line numbers the way Word/Docs count them
          (that needs live layout measurement of soft-wraps, the same
          technique domMeasurement.ts uses for pagination; a real thing to
          add later, not something CSS counters alone can do). Counting
          blocks instead is what a CSS counter can express reliably with no
          extra JS, and reads sensibly here since every editable page is one
          continuous surface with no per-page DOM boundary to reset a
          per-page counter at anyway.
        */
        .wb-line-numbers .wb-prosemirror { counter-reset: wb-line; }
        .wb-line-numbers .wb-prosemirror > * { counter-increment: wb-line; position: relative; }
        .wb-line-numbers .wb-prosemirror > *::before {
          content: counter(wb-line);
          position: absolute;
          left: -2.6em;
          top: 0.1em;
          width: 2em;
          text-align: right;
          font-size: 0.7em;
          color: #a1a1aa;
          user-select: none;
        }
        .wb-prosemirror a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        .wb-search-match { background: #fef08a; border-radius: 2px; }
        .wb-search-match-current { background: #fb923c; }

        /*
          View > Show non-printing characters. A real pilcrow-per-paragraph
          marker, not a full formatting-marks engine (that would also need
          visible dots for spaces and arrows for tabs, which means walking
          and re-rendering text nodes rather than a CSS-only rule) — this
          still shows exactly where each block ends, the most useful part of
          the feature for catching stray empty paragraphs.
        */
        .wb-nonprinting .wb-prosemirror > p::after,
        .wb-nonprinting .wb-prosemirror > h1::after,
        .wb-nonprinting .wb-prosemirror > h2::after,
        .wb-nonprinting .wb-prosemirror > h3::after,
        .wb-nonprinting .wb-prosemirror > h4::after,
        .wb-nonprinting .wb-prosemirror > h5::after,
        .wb-nonprinting .wb-prosemirror > h6::after,
        .wb-nonprinting .wb-prosemirror li::after {
          content: '¶';
          color: #93c5fd;
          margin-left: 3px;
          font-size: 0.85em;
          user-select: none;
        }

        /*
          Print's default target is the whole browser tab — which for this
          app means the entire OS simulation (desktop, taskbar, other open
          app windows), not just this document. The "hide everything, then
          re-reveal one subtree" trick is what actually scopes it: setting
          \`visibility\` (not \`display\`) on the page stack's descendants lets
          them override their now-hidden ancestors, and \`position: fixed\`
          detaches it from wherever that (invisible but still laid-out)
          ancestor chain happens to be scrolled to, so the page always starts
          at the printed sheet's own top-left rather than leaving a blank
          run of pages first.
        */
        /*
          Chrome (and most browsers) add their own header (page title, URL)
          and footer (date, page number) around printed content by default —
          that's the "date, drive OSX, link" chrome, not anything this app
          drew. There's no direct CSS switch to turn that off, but browsers
          only draw it into the page's own margin area — a zero \`@page\`
          margin leaves no room for it, so it simply doesn't render. Sized to
          this document's actual page setup so the browser paginates against
          the same physical page size our own layout was computed for,
          instead of guessing at a generic default.
        */
        @page {
          size: ${pageSetup.widthMm}mm ${pageSetup.heightMm}mm;
          margin: 0;
        }

        @media print {
          body * { visibility: hidden; }
          [data-wb-page-stack], [data-wb-page-stack] * { visibility: visible; }
          [data-wb-page-stack] {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
          }
          /* Aligns the browser's own print pagination with this app's page
             breaks — otherwise the printer would paginate the continuous
             editable surface at whatever height a sheet of paper happens to
             be, ignoring where our own layout actually ends a page. */
          .wb-page-gap-spacer {
            break-after: page;
            page-break-after: always;
          }
        }
      `}</style>

      <div className="flex flex-col items-center py-10">
        {/*
          View > Show ruler. Lives in normal document flow (scrolls with the
          page) rather than sticking to the viewport top — a sticky ruler
          would need to track the scroll container's own scroll position,
          which isn't otherwise observed here and isn't verifiable without a
          live browser to test the interaction in.
        */}
        {showRuler && (
          <div className="mb-1">
            <PageRuler pageSetup={pageSetup} zoom={zoom} />
          </div>
        )}
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
          {/*
            Decorative page chrome — behind the content column. View > Show
            print layout off swaps the per-sheet borders/shadows/page-number
            chrome for one continuous white surface spanning the whole
            stack — a "web layout" look. The actual content still breaks at
            the same vertical offsets (that's the pagination engine's own
            live decorations inside the editable surface, not this layer),
            since reflowing content independent of page breaks would mean
            changing the pagination engine itself, a much larger change than
            this decorative toggle.
          */}
          {printLayoutOn
            ? pages.map((page) => (
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
              ))
            : (
                <div className="absolute left-0 top-0 bg-white" style={{ width: pageWidthPx, height: stackHeightPx, zIndex: 0 }} />
              )}

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
