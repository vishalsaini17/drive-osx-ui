import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TextLayer } from '../lib/pdfjs';
import type { PDFDocumentProxy, RenderTask } from '../lib/pdfjs';
import { rotatePointPct, rotateRectPct, inverseRotation } from '../lib/geometry';
import type { IndexedPage } from '../hooks/usePdfTextIndex';
import {
  AnnotationType,
  StickyNote,
  TextAnnotation,
  DrawingPath,
} from '../types';
import { MessageSquare, Trash2, X } from 'lucide-react';

interface PDFPageViewProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number; // 1-indexed
  zoomLevel: number;
  fitMode: 'custom' | 'fit-width' | 'fit-page';
  rotation: number;
  containerRef: React.RefObject<HTMLDivElement>;
  activeAnnotationTool: AnnotationType | 'select' | null;
  isReadOnly: boolean;
  stickyNotes: StickyNote[];
  textAnnotations: TextAnnotation[];
  drawingPaths: DrawingPath[];
  searchQuery: string;
  ensurePageText: (pageNumber: number) => Promise<IndexedPage | undefined>;
  onAddStickyNote: (note: Omit<StickyNote, 'id' | 'createdAt'>) => void;
  onAddTextAnnotation: (annotation: Omit<TextAnnotation, 'id'>) => void;
  onAddDrawingPath: (path: Omit<DrawingPath, 'id'>) => void;
  onDeleteStickyNote: (id: string) => void;
  onDeleteTextAnnotation: (id: string) => void;
  onSelectTextToCopy?: (text: string) => void;
}

// pdf.js's per-glyph text-layer spans are cropped tight to the ink (roughly
// cap-height down to baseline), not a full ascent-to-descent line box — so a
// line anchored exactly at the span's own top/bottom lands mid-glyph rather
// than clear of it. These push the line down from the box's top by that
// fraction of its height instead: underline just past the baseline (clearing
// descenders like g/y/p), strikeout through the middle of lowercase glyphs.
const UNDERLINE_OFFSET = 1.1;
const STRIKEOUT_OFFSET = 0.62;

const ANNOTATION_COLORS: Record<'highlight' | 'underline' | 'strikeout', string> = {
  highlight: '#fde047',
  underline: '#3b82f6',
  strikeout: '#f43f5e',
};

export const PDFPageView: React.FC<PDFPageViewProps> = ({
  pdfDoc,
  pageNumber,
  zoomLevel,
  fitMode,
  rotation,
  containerRef,
  activeAnnotationTool,
  isReadOnly,
  stickyNotes,
  textAnnotations,
  drawingPaths,
  searchQuery,
  ensurePageText,
  onAddStickyNote,
  onAddTextAnnotation,
  onAddDrawingPath,
  onDeleteStickyNote,
  onDeleteTextAnnotation,
  onSelectTextToCopy,
}) => {
  const pageWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number; scale: number } | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [searchRects, setSearchRects] = useState<{ left: number; top: number; width: number; height: number }[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPathPoints, setCurrentPathPoints] = useState<{ x: number; y: number }[]>([]);
  const [activeNotePopupId, setActiveNotePopupId] = useState<string | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  // Track the available viewport size for fit-width / fit-page scale math.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // Render the page canvas + text layer whenever anything affecting layout changes.
  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    (async () => {
      setIsRendering(true);
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;

      const nativeViewport = page.getViewport({ scale: 1, rotation });
      let scale = zoomLevel / 100;
      const padding = 48;
      if (containerSize) {
        if (fitMode === 'fit-width') {
          scale = Math.max(0.1, (containerSize.width - padding) / nativeViewport.width);
        } else if (fitMode === 'fit-page') {
          scale = Math.max(
            0.1,
            Math.min(
              (containerSize.width - padding) / nativeViewport.width,
              (containerSize.height - padding) / nativeViewport.height
            )
          );
        }
      }

      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      renderTask = page.render({ canvas, canvasContext: ctx, viewport, transform: transform as number[] | undefined });
      try {
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') return;
        throw err;
      }
      if (cancelled) return;

      setRenderedSize({ width: Math.floor(viewport.width), height: Math.floor(viewport.height), scale });
      setIsRendering(false);

      // Selectable text layer, positioned exactly over the rendered glyphs.
      const textLayerEl = textLayerRef.current;
      if (textLayerEl) {
        textLayerEl.innerHTML = '';
        textLayerEl.style.width = `${Math.floor(viewport.width)}px`;
        textLayerEl.style.height = `${Math.floor(viewport.height)}px`;
        const indexed = await ensurePageText(pageNumber);
        if (cancelled || !indexed) return;
        // `indexed.content` is `getTextContent()`'s real result — our local
        // `TextContent` type (declared in lib/pdfjs.ts, since pdfjs-dist
        // doesn't publicly export it) is structurally almost identical but
        // not nominally identical to pdf.js's own internal type that
        // `TextLayer`'s constructor is declared against.
        const layer = new TextLayer({ textContentSource: indexed.content as any, container: textLayerEl, viewport });
        await layer.render().catch(() => {});
        if (cancelled) return;

        // Search-match highlight rects. Measured off the text layer's own
        // rendered spans (rather than re-deriving a box from the item's raw
        // PDF-space transform/height) — pdf.js's own span positioning
        // already accounts for font ascent/descent correctly, which a
        // from-scratch transform of `item.height` does not: that field spans
        // the full font bounding box, taller than the glyphs actually drawn,
        // and bled into the line above when used directly.
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const wrapRect = pageWrapRef.current?.getBoundingClientRect();
          if (wrapRect) {
            const rects = Array.from(textLayerEl.querySelectorAll('span'))
              .filter((span) => (span.textContent || '').toLowerCase().includes(query))
              .map((span) => {
                const r = span.getBoundingClientRect();
                return { left: r.left - wrapRect.left, top: r.top - wrapRect.top, width: r.width, height: r.height };
              });
            if (!cancelled) setSearchRects(rects);
          }
        } else {
          setSearchRects([]);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageNumber, rotation, zoomLevel, fitMode, containerSize, searchQuery]);

  // Freehand-drawing overlay: redraw saved + in-progress strokes for this page.
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !renderedSize) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const strokeFrom = (points: { x: number; y: number }[], color: string, width: number) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo((points[0].x / 100) * canvas.width, (points[0].y / 100) * canvas.height);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo((points[i].x / 100) * canvas.width, (points[i].y / 100) * canvas.height);
      }
      ctx.stroke();
    };

    drawingPaths
      .filter((dp) => dp.pageIndex === pageNumber - 1)
      .forEach((dp) =>
        strokeFrom(
          dp.points.map((p) => rotatePointPct(p, rotation)),
          dp.color || '#9333ea',
          dp.strokeWidth || 3
        )
      );
    // Still mid-drag: already in display coordinates, not yet stored/normalized.
    strokeFrom(currentPathPoints, '#9333ea', 3);
  }, [drawingPaths, currentPathPoints, pageNumber, renderedSize, rotation]);

  const getPercentPoint = (e: React.MouseEvent) => {
    const rect = pageWrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    const { x, y } = getPercentPoint(e);

    if (activeAnnotationTool === 'drawing') {
      setIsDrawing(true);
      setCurrentPathPoints([{ x, y }]);
    } else if (activeAnnotationTool === 'sticky-note') {
      const noteText = prompt('Enter Sticky Note comment:', '');
      if (noteText) {
        // Stored normalized to the page's 0° frame — see lib/geometry.ts.
        const base = rotatePointPct({ x, y }, inverseRotation(rotation));
        onAddStickyNote({ pageIndex: pageNumber - 1, x: base.x, y: base.y, text: noteText, author: 'You', color: '#fef08a' });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || activeAnnotationTool !== 'drawing') return;
    setCurrentPathPoints((prev) => [...prev, getPercentPoint(e)]);
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPathPoints.length > 1) {
      const basePoints = currentPathPoints.map((p) => rotatePointPct(p, inverseRotation(rotation)));
      onAddDrawingPath({ pageIndex: pageNumber - 1, points: basePoints, color: '#9333ea', strokeWidth: 3 });
    }
    setIsDrawing(false);
    setCurrentPathPoints([]);
  };

  // Turn a real text selection into a highlight/underline/strikeout annotation.
  const handleTextMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const selText = selection.toString().trim();
    if (!selText) return;

    onSelectTextToCopy?.(selText);

    if (!isReadOnly && activeAnnotationTool && ['highlight', 'underline', 'strikeout'].includes(activeAnnotationTool)) {
      const wrapRect = pageWrapRef.current?.getBoundingClientRect();
      // One rect per visual line — a selection that wraps a paragraph needs
      // a box per line, not one box stretched across every line in between
      // (which is what a single `getBoundingClientRect()` would give).
      const clientRects = Array.from(selection.getRangeAt(0).getClientRects()).filter((r) => r.width > 1 && r.height > 1);
      if (wrapRect && clientRects.length > 0) {
        const type = activeAnnotationTool as 'highlight' | 'underline' | 'strikeout';
        const rects = clientRects.map((r) => {
          const displayRect = {
            x: ((r.left - wrapRect.left) / wrapRect.width) * 100,
            y: ((r.top - wrapRect.top) / wrapRect.height) * 100,
            width: (r.width / wrapRect.width) * 100,
            height: (r.height / wrapRect.height) * 100,
          };
          // Stored normalized to the page's 0° frame — see lib/geometry.ts.
          return rotateRectPct(displayRect, inverseRotation(rotation));
        });
        onAddTextAnnotation({ type, pageIndex: pageNumber - 1, text: selText, color: ANNOTATION_COLORS[type], rects });
      }
      selection.removeAllRanges();
    }
  };

  const pageStickyNotes = stickyNotes.filter((sn) => sn.pageIndex === pageNumber - 1);
  const pageTextAnnotations = textAnnotations.filter((ta) => ta.pageIndex === pageNumber - 1);

  return (
    <div
      ref={pageWrapRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={(e) => {
        handleMouseUp();
        handleTextMouseUp();
      }}
      style={
        renderedSize
          ? ({
              width: renderedSize.width,
              height: renderedSize.height,
              // pdf.js's `TextLayer` positions its spans using these custom
              // properties (normally supplied by its own full viewer chrome,
              // which we don't use) — set them ourselves so the text layer
              // it builds lines up with the canvas underneath.
              '--scale-factor': renderedSize.scale,
              '--user-unit': 1,
              '--scale-round-x': '1px',
              '--scale-round-y': '1px',
            } as React.CSSProperties)
          : undefined
      }
      className={`relative bg-white shadow-2xl rounded-sm my-6 mx-auto select-text ${
        activeAnnotationTool === 'drawing' ? 'cursor-crosshair' : activeAnnotationTool === 'sticky-note' ? 'cursor-copy' : ''
      }`}
    >
      <canvas ref={canvasRef} className="block" />

      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      )}

      {/* pdf.js selectable text layer, invisible but positioned exactly over the glyphs. */}
      <div ref={textLayerRef} className="textLayer" />

      {/* Search-match highlights */}
      {searchRects.map((r, i) => (
        <div
          key={i}
          className="absolute bg-amber-300/60 ring-1 ring-amber-500 rounded-xs pointer-events-none z-10"
          style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
        />
      ))}

      {/* Highlight / underline / strikeout markup */}
      {pageTextAnnotations.map((ann) => {
        const rects = ann.rects.map((r) => rotateRectPct(r, rotation));
        // Only actionable in Select mode — otherwise these would eat clicks
        // meant to start a brand-new selection (e.g. underlining a phrase
        // that's already highlighted).
        const interactive = activeAnnotationTool === 'select' && !isReadOnly;
        const isHovered = hoveredAnnotationId === ann.id;
        return (
          <React.Fragment key={ann.id}>
            {rects.map((rect, i) => (
              <div
                key={i}
                title={ann.text}
                onMouseEnter={() => interactive && setHoveredAnnotationId(ann.id)}
                onMouseLeave={() => interactive && setHoveredAnnotationId((id) => (id === ann.id ? null : id))}
                className={`absolute rounded-xs transition-colors ${interactive ? 'pointer-events-auto' : 'pointer-events-none'} ${
                  isHovered ? 'ring-2 ring-rose-500/70' : ''
                }`}
                style={{
                  left: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                  zIndex: 10,
                  backgroundColor: ann.type === 'highlight' ? `${ann.color}${isHovered ? '99' : '66'}` : 'transparent',
                }}
              />
            ))}
            {ann.type !== 'highlight' &&
              rects.map((rect, i) => (
                <div
                  key={`line-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y + rect.height * (ann.type === 'underline' ? UNDERLINE_OFFSET : STRIKEOUT_OFFSET)}%`,
                    width: `${rect.width}%`,
                    height: '2px',
                    zIndex: 11,
                    backgroundColor: ann.color,
                  }}
                />
              ))}
            {isHovered && rects[0] && (
              <button
                onClick={() => onDeleteTextAnnotation(ann.id)}
                onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                onMouseLeave={() => setHoveredAnnotationId((id) => (id === ann.id ? null : id))}
                title="Remove annotation"
                className="absolute z-40 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg pointer-events-auto cursor-pointer transition-transform hover:scale-110"
                style={{ left: `calc(${rects[0].x + rects[0].width}% - 9px)`, top: `calc(${rects[0].y}% - 9px)` }}
              >
                <X size={10} strokeWidth={3} />
              </button>
            )}
          </React.Fragment>
        );
      })}

      {/* Freehand drawing overlay */}
      {renderedSize && (
        <canvas
          ref={drawCanvasRef}
          width={renderedSize.width}
          height={renderedSize.height}
          className="absolute inset-0 z-20 pointer-events-none"
        />
      )}

      {/* Sticky notes */}
      {pageStickyNotes.map((note) => {
        const pos = rotatePointPct(note, rotation);
        return (
        <div
          key={note.id}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
        >
          <button
            onClick={() => setActiveNotePopupId(activeNotePopupId === note.id ? null : note.id)}
            className="p-2 bg-amber-300 hover:bg-amber-400 text-slate-900 rounded-full shadow-lg border-2 border-slate-900 cursor-pointer transition-transform hover:scale-110"
            title={`Sticky note from ${note.author}`}
          >
            <MessageSquare size={16} />
          </button>

          {activeNotePopupId === note.id && (
            <div className="absolute top-8 left-0 w-56 bg-amber-100 text-slate-900 p-3 rounded-2xl shadow-2xl border border-amber-300 z-40 text-xs space-y-2 font-sans">
              <div className="flex items-center justify-between border-b border-amber-200 pb-1 font-extrabold">
                <span className="text-amber-900">{note.author}</span>
                <button onClick={() => onDeleteStickyNote(note.id)} className="text-slate-600 hover:text-rose-600 p-0.5 cursor-pointer">
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="font-semibold text-slate-800 leading-snug">{note.text}</p>
              <span className="text-[10px] text-slate-500 font-bold block text-right">{note.createdAt}</span>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
};
