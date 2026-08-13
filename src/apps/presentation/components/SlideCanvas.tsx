import React, { useState, useRef } from 'react';
import { Slide, SlideElement } from '../types';
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent, el: SlideElement) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onSelectElement(el.id);
    setActiveDragId(el.id);
    setIsDragging(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;
      setDragOffset({
        x: clickX - el.x,
        y: clickY - el.y,
      });
    }
  };

  // Handle Mouse Move over Canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !activeDragId || !containerRef.current || isReadOnly) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

    const el = slide.elements.find((item) => item.id === activeDragId);
    if (el) {
      const newX = Math.max(0, Math.min(100 - el.width, mouseX - dragOffset.x));
      const newY = Math.max(0, Math.min(100 - el.height, mouseY - dragOffset.y));
      onUpdateElement({
        ...el,
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveDragId(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
            style={{
              position: 'absolute',
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              height: `${el.height}%`,
              zIndex: el.zIndex || 1,
            }}
            className={`group rounded-lg transition-shadow relative ${
              isSelected && !isReadOnly ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-1 hover:ring-blue-300'
            }`}
          >
            {/* Action Bar for Selected Element */}
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
                  fontSize: `${el.fontSize || 16}px`,
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
              <div className="w-full h-full bg-slate-900 rounded-xl p-3 text-white border border-slate-800 flex flex-col justify-between shadow-inner">
                <span className="text-xs font-bold text-emerald-400 truncate">{el.chartTitle || 'Chart Analysis'}</span>
                <div className="flex-1 flex items-end justify-around gap-2 pt-2 pb-1">
                  {(el.chartData || []).map((d, idx) => {
                    const max = Math.max(...(el.chartData || []).map((i) => i.value), 1);
                    const pct = Math.min(100, Math.max(15, (d.value / max) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                        <div
                          className="w-full rounded-t-sm transition-all duration-300"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: d.color || '#3b82f6',
                          }}
                        />
                        <span className="text-[9px] text-slate-400 font-bold truncate max-w-full mt-1">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TABLE ELEMENT */}
            {el.type === 'table' && (
              <div className="w-full h-full bg-white rounded-xl border border-slate-300 overflow-hidden shadow-md text-xs font-sans">
                <table className="w-full h-full border-collapse">
                  <tbody>
                    {(el.tableData || [[]]).map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-800 text-white font-extrabold' : 'border-t border-slate-200 text-slate-800'}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-1.5 border-r border-slate-200 text-center text-[11px] font-semibold">
                            {cell}
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
        );
      })}
    </div>
  );
};
