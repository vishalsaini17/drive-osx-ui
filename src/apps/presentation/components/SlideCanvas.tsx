import React, { useState } from 'react';
import { Slide, SlideElement } from '../types';
import { useContainerWidth } from '../../../platform/layout/useContainerWidth';
import {
  BarChart2,
  TrendingUp,
  PieChart as PieIcon,
  Play,
  Square,
  Circle,
  Star,
  ArrowRight,
  Shield,
  Type,
  Image as ImageIcon,
  Film,
  Table as TableIcon,
  Sparkles,
  Move,
  Trash2,
} from 'lucide-react';

interface SlideCanvasProps {
  slide: Slide;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: SlideElement) => void;
  onDeleteElement: (id: string) => void;
  isReadOnly?: boolean;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  isReadOnly = false,
}) => {
  // Every element's `x`/`y`/`width`/`height` is already a percentage of the
  // canvas, so it scales for free. `fontSize`, though, is authored as a flat
  // pixel value — on a phone-width window where this same aspect-[16/9] box
  // renders at a fraction of its normal size, an unscaled 36px title no
  // longer fits the same 20%-height box it was designed for and spills text
  // into the element below it.
  //
  // `REFERENCE_CANVAS_WIDTH` is deliberately at or below the *smaller* of
  // this canvas's two real desktop widths — the editor's `max-w-4xl` (896px)
  // and full-screen Presentation Mode's `max-w-5xl` (1024px) — with scale
  // clamped to never exceed 1. That keeps this a no-op at both call sites'
  // normal desktop size: only a canvas actually shrunk by a narrow window
  // rescales text, matching every other compact-only change in this app.
  const REFERENCE_CANVAS_WIDTH = 880;
  const { ref: containerRef, width: canvasWidth } = useContainerWidth<HTMLDivElement>(
    0,
    REFERENCE_CANVAS_WIDTH
  );
  const fontScale =
    canvasWidth >= REFERENCE_CANVAS_WIDTH ? 1 : Math.max(0.45, canvasWidth / REFERENCE_CANVAS_WIDTH);

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Shared by the mouse and touch handlers below — a touch drag is the same
  // arithmetic as a mouse drag, just fed from `Touch.clientX/Y` instead of
  // `MouseEvent.clientX/Y`. Without the touch versions, dragging an element
  // only ever worked with a mouse, which on a phone or tablet is every drag.
  const beginDrag = (clientX: number, clientY: number, el: SlideElement) => {
    if (isReadOnly) return;
    onSelectElement(el.id);
    setActiveDragId(el.id);
    setIsDragging(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      setDragOffset({ x: x - el.x, y: y - el.y });
    }
  };

  const updateDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !activeDragId || !containerRef.current || isReadOnly) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    const el = slide.elements.find((item) => item.id === activeDragId);
    if (el) {
      const newX = Math.max(0, Math.min(100 - el.width, x - dragOffset.x));
      const newY = Math.max(0, Math.min(100 - el.height, y - dragOffset.y));
      onUpdateElement({
        ...el,
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
      });
    }
  };

  const endDrag = () => {
    setIsDragging(false);
    setActiveDragId(null);
  };

  const handleMouseDown = (e: React.MouseEvent, el: SlideElement) => {
    e.stopPropagation();
    beginDrag(e.clientX, e.clientY, el);
  };
  const handleMouseMove = (e: React.MouseEvent) => updateDrag(e.clientX, e.clientY);

  const handleTouchStart = (e: React.TouchEvent, el: SlideElement) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    beginDrag(touch.clientX, touch.clientY, el);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    updateDrag(touch.clientX, touch.clientY);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onTouchMove={handleTouchMove}
      onTouchEnd={endDrag}
      onTouchCancel={endDrag}
      onClick={() => onSelectElement(null)}
      className="relative w-full aspect-[16/9] shadow-2xl rounded-2xl overflow-hidden select-none border border-slate-300 transition-all font-sans"
      style={{ backgroundColor: slide.bgColor || '#ffffff' }}
    >
      {/* Slide Canvas Grid background subtle overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Render Slide Elements */}
      {slide.elements.map((el) => {
        const isSelected = selectedElementId === el.id;

        return (
          <div
            key={el.id}
            onMouseDown={(e) => handleMouseDown(e, el)}
            onTouchStart={(e) => handleTouchStart(e, el)}
            style={{
              position: 'absolute',
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              height: `${el.height}%`,
              zIndex: el.zIndex || 1,
              // Without this, a drag-start touch on the element is also
              // interpreted as a pan/scroll gesture by the browser, so the
              // canvas scrolls instead of (or as well as) the element moving.
              touchAction: isReadOnly ? undefined : 'none',
            }}
            className={`group rounded-lg transition-shadow relative ${
              isSelected && !isReadOnly ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-1 hover:ring-blue-300'
            }`}
          >
            {/* Action Bar for Selected Element — deliberately a sibling of the
                clipped content wrapper below, not a child of it: it renders
                above the element via a negative top offset, and an
                overflow-hidden ancestor would clip it into invisibility. */}
            {isSelected && !isReadOnly && (
              <div className="absolute -top-8 left-0 flex items-center gap-1 bg-slate-900 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold shadow-md z-30 pointer-events-auto">
                <span className="capitalize">{el.type}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteElement(el.id);
                  }}
                  className="ml-2 hover:text-rose-400 cursor-pointer p-0.5"
                  title="Delete element"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}

            {/* Content — clipped at this element's own box, not just the
                outer canvas. Without this, a table (which won't shrink its
                columns below their content's natural width) or an overlong
                chart title renders at its natural size and only gets clipped
                once it reaches the canvas edge — which is what "content
                overflowing near the slide border" on a narrow canvas was:
                each element's box was never enforcing its own bound. */}
            <div className="w-full h-full overflow-hidden rounded-lg">
            {/* TEXT ELEMENT */}
            {el.type === 'text' && (
              <div
                contentEditable={!isReadOnly}
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newText = e.currentTarget.innerText;
                  onUpdateElement({ ...el, content: newText });
                }}
                className="w-full h-full p-2 outline-none break-words flex flex-col justify-center font-sans"
                style={{
                  fontSize: `${(el.fontSize || 16) * fontScale}px`,
                  fontWeight: el.fontWeight || 'normal',
                  color: el.color || '#0f172a',
                  textAlign: el.align || 'left',
                  backgroundColor: el.bgColor || 'transparent',
                }}
              >
                {el.content || 'Click to edit text...'}
              </div>
            )}

            {/* SHAPE ELEMENT */}
            {el.type === 'shape' && (
              <div className="w-full h-full flex items-center justify-center p-1">
                {el.shapeType === 'circle' && (
                  <div
                    className="w-full h-full rounded-full shadow-md"
                    style={{
                      backgroundColor: el.fillColor || '#3b82f6',
                      border: `${el.strokeWidth || 0}px solid ${el.strokeColor || 'transparent'}`,
                    }}
                  />
                )}
                {el.shapeType === 'rectangle' && (
                  <div
                    className="w-full h-full rounded-xl shadow-md"
                    style={{
                      backgroundColor: el.fillColor || '#3b82f6',
                      border: `${el.strokeWidth || 0}px solid ${el.strokeColor || 'transparent'}`,
                    }}
                  />
                )}
                {el.shapeType === 'badge' && (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center font-bold text-xs shadow-md border"
                    style={{
                      backgroundColor: el.fillColor || '#0284c7',
                      borderColor: el.strokeColor || '#38bdf8',
                      color: '#ffffff',
                    }}
                  />
                )}
                {el.shapeType === 'star' && (
                  <div className="w-full h-full flex items-center justify-center text-amber-400">
                    <Star className="w-full h-full fill-amber-400" />
                  </div>
                )}
              </div>
            )}

            {/* CHART ELEMENT */}
            {el.type === 'chart' && (
              <div className="w-full h-full bg-slate-900 rounded-xl p-3 text-white border border-slate-800 flex flex-col justify-between shadow-inner min-w-0">
                <span
                  className="font-bold text-emerald-400 truncate block"
                  style={{ fontSize: `${12 * fontScale}px` }}
                >
                  {el.chartTitle || 'Chart Analysis'}
                </span>
                <div className="flex-1 flex items-end justify-around gap-2 pt-2 pb-1 min-w-0">
                  {(el.chartData || []).map((d, idx) => {
                    const max = Math.max(...(el.chartData || []).map((i) => i.value), 1);
                    const pct = Math.min(100, Math.max(15, (d.value / max) * 100));
                    return (
                      <div key={idx} className="flex-1 min-w-0 flex flex-col items-center h-full justify-end">
                        <div
                          className="w-full rounded-t-sm transition-all duration-300"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: d.color || '#3b82f6',
                          }}
                        />
                        <span
                          className="text-slate-400 font-bold truncate max-w-full mt-1 block"
                          style={{ fontSize: `${9 * fontScale}px` }}
                        >
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TABLE ELEMENT — `table-layout: fixed` makes the browser honor
                the table's own width instead of growing to fit its cells'
                natural (min-content) size, and `truncate` on each cell turns
                a too-narrow column into an ellipsis instead of a table wider
                than the box it's clipped by. */}
            {el.type === 'table' && (
              <div className="w-full h-full bg-white rounded-xl border border-slate-300 overflow-hidden shadow-md font-sans">
                <table className="w-full h-full border-collapse table-fixed">
                  <tbody>
                    {(el.tableData || [[]]).map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-800 text-white font-extrabold' : 'border-t border-slate-200 text-slate-800'}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="p-1.5 border-r border-slate-200 text-center font-semibold overflow-hidden"
                            style={{ fontSize: `${11 * fontScale}px` }}
                          >
                            <span className="block truncate" title={cell}>
                              {cell}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* IMAGE ELEMENT */}
            {el.type === 'image' && (
              <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-md">
                <img
                  src={el.url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'}
                  alt={el.caption || 'Slide Visual'}
                  className="w-full h-full object-cover"
                />
                {el.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[10px] p-1 font-bold text-center backdrop-blur-xs">
                    {el.caption}
                  </div>
                )}
              </div>
            )}

            {/* VIDEO ELEMENT */}
            {el.type === 'video' && (
              <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center text-white relative shadow-md">
                <Film size={32} className="text-sky-400 mb-1" />
                <span className="text-xs font-bold">Interactive Video Media</span>
                <span className="text-[10px] text-slate-400">Click to preview stream</span>
              </div>
            )}

            {/* ICON ELEMENT */}
            {el.type === 'icon' && (
              <div className="w-full h-full flex items-center justify-center text-blue-600">
                <Sparkles className="w-full h-full" />
              </div>
            )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
