import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Pencil,
  Eraser,
  Square,
  Circle as CircleIcon,
  Minus,
  Type,
  RotateCcw,
  Trash2,
  Download,
  HardDrive,
  Sparkles,
  Check,
} from 'lucide-react';
import { useSystemStore } from '../../../systemStore';

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
}

export default function WhiteboardModal({ isOpen, onClose, isLight }: WhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'rect' | 'circle' | 'line' | 'text'>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const setFiles = useSystemStore((state) => state.setFiles);

  // Canvas history for undo
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 900;
    canvas.height = 550;

    // Default white/light background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state to history
    const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialData]);
  }, [isOpen]);

  if (!isOpen) return null;

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), data]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHist = history.slice(0, history.length - 1);
    setHistory(newHist);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(newHist[newHist.length - 1], 0, 0);
  };

  const handleClearAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'pen' || activeTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = activeTool === 'eraser' ? lineWidth * 4 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeTool === 'text') {
      const text = prompt('Enter text note for whiteboard:');
      if (text) {
        ctx.fillStyle = color;
        ctx.font = `${lineWidth * 5 + 14}px sans-serif`;
        ctx.fillText(text, coords.x, coords.y);
        saveCanvasState();
      }
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    if (activeTool === 'pen' || activeTool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'line') {
      // Restore last history state before drawing preview shape
      if (history.length > 0) {
        ctx.putImageData(history[history.length - 1], 0, 0);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.fillStyle = color + '22'; // subtle transparent fill
      ctx.beginPath();

      if (activeTool === 'rect') {
        const w = coords.x - startPos.x;
        const h = coords.y - startPos.y;
        ctx.rect(startPos.x, startPos.y, w, h);
        ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'circle') {
        const radius = Math.hypot(coords.x - startPos.x, coords.y - startPos.y);
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStartPos(null);
      saveCanvasState();
    }
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = image;
    a.download = `OSX_Meet_Whiteboard_${Date.now()}.png`;
    a.click();
  };

  const handleSaveToDriveOSX = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const fileName = `Whiteboard_${Date.now().toString().slice(-4)}.png`;

    setFiles((prev) => [
      ...prev,
      {
        id: `file-wb-${Date.now()}`,
        name: fileName,
        type: 'file',
        content: dataUrl,
        parentId: 'folder-pictures',
        createdAt: new Date().toLocaleDateString(),
      },
    ]);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden max-h-[92vh] ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#1e1d24] border-white/15 text-white'
        }`}
      >
        {/* Header Toolbar */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Collaborative Whiteboard</h2>
              <p className="text-[11px] text-zinc-400 hidden sm:block">Draw, sketch diagrams & export to DriveOSX</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Actions */}
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="p-2 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 cursor-pointer transition-colors flex items-center gap-1.5"
              title="Undo"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-red-900/40 text-red-400 cursor-pointer transition-colors flex items-center gap-1.5"
              title="Clear Canvas"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            <button
              onClick={handleSaveToDriveOSX}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors flex items-center gap-1.5 shadow-md"
            >
              {savedSuccess ? <Check size={14} /> : <HardDrive size={14} />}
              <span>{savedSuccess ? 'Saved to Drive!' : 'Save to DriveOSX'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tools Bar + Canvas Container */}
        <div className="flex-1 flex flex-col sm:flex-row min-h-0 relative overflow-hidden bg-slate-200 dark:bg-zinc-950">
          {/* Side Tool Palette */}
          <div className="w-full sm:w-16 p-2 sm:p-3 bg-zinc-900 border-b sm:border-b-0 sm:border-r border-zinc-800 flex sm:flex-col items-center justify-between sm:justify-start gap-2 shrink-0 overflow-x-auto">
            <div className="flex sm:flex-col items-center gap-2">
              <button
                onClick={() => setActiveTool('pen')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'pen'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
                title="Pen Tool"
              >
                <Pencil size={18} />
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'eraser'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
                title="Eraser Tool"
              >
                <Eraser size={18} />
              </button>

              <button
                onClick={() => setActiveTool('rect')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'rect'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
                title="Rectangle"
              >
                <Square size={18} />
              </button>

              <button
                onClick={() => setActiveTool('circle')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'circle'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
                title="Circle"
              >
                <CircleIcon size={18} />
              </button>

              <button
                onClick={() => setActiveTool('line')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'line'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
                title="Line"
              >
                <Minus size={18} />
              </button>

              <button
                onClick={() => setActiveTool('text')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
                title="Text Note"
              >
                <Type size={18} />
              </button>
            </div>

            {/* Colors Palette */}
            <div className="flex sm:flex-col items-center gap-1.5 pt-2 sm:pt-4 border-l sm:border-l-0 sm:border-t border-zinc-800">
              {['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b', '#000000'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full cursor-pointer transition-transform ${
                    color === c ? 'ring-2 ring-white scale-125' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Interactive Canvas */}
          <div className="flex-1 p-3 flex items-center justify-center overflow-auto min-h-0 bg-slate-900">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="bg-white shadow-2xl rounded-xl cursor-crosshair border border-white/20 max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
