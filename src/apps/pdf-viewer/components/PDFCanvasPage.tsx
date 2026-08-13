import React, { useRef, useState, useEffect } from 'react';
import {
  PDFPageData,
  AnnotationType,
  StickyNote,
  TextAnnotation,
  DrawingPath,
  SearchMatch,
} from '../types';
import { MessageSquare, Trash2, X, Plus, Sparkles } from 'lucide-react';

interface PDFCanvasPageProps {
  page: PDFPageData;
  pageIndex: number;
  zoomLevel: number;
  fitMode: 'custom' | 'fit-width' | 'fit-page';
  rotation: number;
  activeAnnotationTool: AnnotationType | 'select' | null;
  isReadOnly: boolean;
  stickyNotes: StickyNote[];
  textAnnotations: TextAnnotation[];
  drawingPaths: DrawingPath[];
  searchMatches: SearchMatch[];
  onAddStickyNote: (note: Omit<StickyNote, 'id' | 'createdAt'>) => void;
  onAddTextAnnotation: (annotation: Omit<TextAnnotation, 'id'>) => void;
  onAddDrawingPath: (path: Omit<DrawingPath, 'id'>) => void;
  onDeleteStickyNote: (id: string) => void;
  onSelectTextToCopy?: (text: string) => void;
}

export const PDFCanvasPage: React.FC<PDFCanvasPageProps> = ({
  page,
  pageIndex,
  zoomLevel,
  fitMode,
  rotation,
  activeAnnotationTool,
  isReadOnly,
  stickyNotes,
  textAnnotations,
  drawingPaths,
  searchMatches,
  onAddStickyNote,
  onAddTextAnnotation,
  onAddDrawingPath,
  onDeleteStickyNote,
  onSelectTextToCopy,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Freehand Drawing State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPathPoints, setCurrentPathPoints] = useState<{ x: number; y: number }[]>([]);

  // Selected Text State
  const [selectedText, setSelectedText] = useState<string>('');

  // Active Sticky Note Popup state
  const [activeNotePopupId, setActiveNotePopupId] = useState<string | null>(null);

  // Compute Container Width style based on fitMode / zoomLevel
  const getScaleStyle = () => {
    if (fitMode === 'fit-width') return { width: '100%' };
    if (fitMode === 'fit-page') return { width: '85%', maxHeight: '85vh' };
    return { width: `${zoomLevel}%` };
  };

  // Handle Freehand Drawing Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved paths for this page
    drawingPaths
      .filter((dp) => dp.pageIndex === pageIndex)
      .forEach((dp) => {
        if (dp.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = dp.color || '#9333ea';
        ctx.lineWidth = dp.strokeWidth || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo((dp.points[0].x / 100) * canvas.width, (dp.points[0].y / 100) * canvas.height);
        for (let i = 1; i < dp.points.length; i++) {
          ctx.lineTo((dp.points[i].x / 100) * canvas.width, (dp.points[i].y / 100) * canvas.height);
        }
        ctx.stroke();
      });

    // Draw active path while dragging
    if (currentPathPoints.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#9333ea';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo((currentPathPoints[0].x / 100) * canvas.width, (currentPathPoints[0].y / 100) * canvas.height);
      for (let i = 1; i < currentPathPoints.length; i++) {
        ctx.lineTo(
          (currentPathPoints[i].x / 100) * canvas.width,
          (currentPathPoints[i].y / 100) * canvas.height
        );
      }
      ctx.stroke();
    }
  }, [drawingPaths, currentPathPoints, pageIndex]);

  // Handle Mouse Down for Drawing / Sticky Note placement
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (activeAnnotationTool === 'drawing') {
      setIsDrawing(true);
      setCurrentPathPoints([{ x: xPct, y: yPct }]);
    } else if (activeAnnotationTool === 'sticky-note') {
      const noteText = prompt('Enter Sticky Note comment:', 'Review required for this section.');
      if (noteText) {
        onAddStickyNote({
          pageIndex,
          x: xPct,
          y: yPct,
          text: noteText,
          author: 'You',
          color: '#fef08a',
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || activeAnnotationTool !== 'drawing' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setCurrentPathPoints((prev) => [...prev, { x: xPct, y: yPct }]);
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPathPoints.length > 1) {
      onAddDrawingPath({
        pageIndex,
        points: currentPathPoints,
        color: '#9333ea',
        strokeWidth: 3,
      });
    }
    setIsDrawing(false);
    setCurrentPathPoints([]);
  };

  // Handle Text Selection Markup
  const handleTextMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selText = selection.toString().trim();
    if (!selText) return;

    if (onSelectTextToCopy) onSelectTextToCopy(selText);

    if (!isReadOnly && activeAnnotationTool && ['highlight', 'underline', 'strikeout'].includes(activeAnnotationTool)) {
      onAddTextAnnotation({
        type: activeAnnotationTool as 'highlight' | 'underline' | 'strikeout',
        pageIndex,
        text: selText,
        color:
          activeAnnotationTool === 'highlight'
            ? '#fef08a'
            : activeAnnotationTool === 'underline'
            ? '#3b82f6'
            : '#f43f5e',
        rect: { x: 10, y: 20, width: 80, height: 5 },
      });
      selection.removeAllRanges();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseUpCapture={handleTextMouseUp}
      style={{
        ...getScaleStyle(),
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
      className="bg-white text-slate-900 shadow-2xl rounded-xl border border-slate-300 relative transition-all duration-300 select-text overflow-hidden font-serif p-8 md:p-12 my-6 mx-auto min-h-[720px] flex flex-col justify-between"
    >
      {/* Freehand Canvas Drawing Layer Overlay */}
      <canvas
        ref={canvasRef}
        width={800}
        height={1000}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* Page Header Header */}
      <div className="border-b border-slate-300 pb-3 mb-6 flex items-center justify-between font-sans">
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">
          DOCUMENT PAGE {page.pageNumber}
        </span>
        <span className="text-xs font-extrabold text-blue-800 tracking-wider">
          {page.title}
        </span>
      </div>

      {/* Page Body Content */}
      <div className="flex-1 space-y-6 font-sans">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
          {page.title}
        </h2>

        {/* Content Paragraphs */}
        <div className="space-y-3 leading-relaxed text-sm text-slate-800 font-medium">
          {page.contentLines.map((line, idx) => {
            const pageMatches = searchMatches.filter((m) => m.pageIndex === pageIndex && m.lineIndex === idx);
            const isMatch = pageMatches.length > 0;

            return (
              <p
                key={idx}
                className={`p-1 rounded transition-colors ${
                  isMatch ? 'bg-amber-200 ring-2 ring-amber-400 font-bold' : ''
                }`}
              >
                {line}
              </p>
            );
          })}
        </div>

        {/* Render Tables if present */}
        {page.tables &&
          page.tables.map((table, tIdx) => (
            <div key={tIdx} className="my-6 rounded-xl border border-slate-300 overflow-hidden shadow-sm font-sans text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold text-left">
                    {table.headers.map((h, hIdx) => (
                      <th key={hIdx} className="p-2.5 border-r border-slate-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? 'bg-slate-50 text-slate-800' : 'bg-white text-slate-800'}
                    >
                      {r.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 border-t border-slate-200 border-r border-slate-200 font-semibold">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {/* Key Facts Highlight Box */}
        {page.keyFacts && page.keyFacts.length > 0 && (
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl font-sans space-y-2">
            <span className="text-xs font-black text-blue-900 uppercase tracking-wider block">
              Key Metrics & Findings
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-800">
              {page.keyFacts.map((kf, kfIdx) => (
                <div key={kfIdx} className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                  <Sparkles size={14} className="text-blue-600 shrink-0" />
                  <span>{kf}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Render Text Markup Annotations Layer */}
      {textAnnotations
        .filter((ta) => ta.pageIndex === pageIndex)
        .map((ann) => (
          <div
            key={ann.id}
            className="p-1 rounded font-sans text-xs font-bold my-1 border shadow-xs"
            style={{
              backgroundColor: ann.type === 'highlight' ? '#fef08a' : 'transparent',
              textDecoration: ann.type === 'underline' ? 'underline' : ann.type === 'strikeout' ? 'line-through' : 'none',
              color: ann.type === 'strikeout' ? '#e11d48' : '#0f172a',
              borderColor: ann.color,
            }}
          >
            Markup: "{ann.text}"
          </div>
        ))}

      {/* Render Sticky Notes Layer Overlay */}
      {stickyNotes
        .filter((sn) => sn.pageIndex === pageIndex)
        .map((note) => (
          <div
            key={note.id}
            style={{ left: `${note.x}%`, top: `${note.y}%` }}
            className="absolute z-30 font-sans -translate-x-1/2 -translate-y-1/2"
          >
            <button
              onClick={() => setActiveNotePopupId(activeNotePopupId === note.id ? null : note.id)}
              className="p-2 bg-amber-300 hover:bg-amber-400 text-slate-900 rounded-full shadow-lg border-2 border-slate-900 cursor-pointer animate-bounce transition-transform hover:scale-110"
              title={`Sticky Note from ${note.author}`}
            >
              <MessageSquare size={16} />
            </button>

            {/* Note Text Popover Drawer */}
            {activeNotePopupId === note.id && (
              <div className="absolute top-8 left-0 w-56 bg-amber-100 text-slate-900 p-3 rounded-2xl shadow-2xl border border-amber-300 z-40 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-amber-200 pb-1 font-extrabold">
                  <span className="text-amber-900">{note.author}</span>
                  <button
                    onClick={() => onDeleteStickyNote(note.id)}
                    className="text-slate-600 hover:text-rose-600 p-0.5 cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="font-semibold text-slate-800 leading-snug">{note.text}</p>
                <span className="text-[10px] text-slate-500 font-bold block text-right">{note.createdAt}</span>
              </div>
            )}
          </div>
        ))}

      {/* Page Footer */}
      <div className="border-t border-slate-300 pt-3 mt-6 flex items-center justify-between text-xs text-slate-500 font-sans font-bold">
        <span>Confidential • Drive OS Virtual Reader</span>
        <span>Page {page.pageNumber}</span>
      </div>
    </div>
  );
};
