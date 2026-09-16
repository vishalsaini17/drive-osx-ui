import React, { useEffect, useRef, useState } from 'react';
import WordBookModal from './WordBookModal';

type Tool = 'pen' | 'line' | 'rectangle' | 'ellipse' | 'eraser';

const TOOLS: Tool[] = ['pen', 'line', 'rectangle', 'ellipse', 'eraser'];
const COLORS = ['#18181b', '#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea'];
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 400;

interface DrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
}

/** A real, working freehand/shape drawing tool — not a stub — rasterized to a PNG and inserted the same way any other image is (`setImage`). */
export default function DrawingModal({ isOpen, onClose, onInsert }: DrawingModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(3);

  const drawingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const strokeSnapshotRef = useRef<ImageData | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    undoStackRef.current = [];
  }, [isOpen]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const pushUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStackRef.current.length > 25) undoStackRef.current.shift();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    pushUndo();
    drawingRef.current = true;
    const pos = getPos(e);
    startRef.current = pos;
    strokeSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 3 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !startRef.current) return;
    const pos = getPos(e);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      return;
    }

    if (!strokeSnapshotRef.current) return;
    ctx.putImageData(strokeSnapshotRef.current, 0, 0);
    ctx.beginPath();
    if (tool === 'line') {
      ctx.moveTo(startRef.current.x, startRef.current.y);
      ctx.lineTo(pos.x, pos.y);
    } else if (tool === 'rectangle') {
      ctx.rect(startRef.current.x, startRef.current.y, pos.x - startRef.current.x, pos.y - startRef.current.y);
    } else if (tool === 'ellipse') {
      const rx = Math.abs(pos.x - startRef.current.x) / 2;
      const ry = Math.abs(pos.y - startRef.current.y) / 2;
      const cx = (pos.x + startRef.current.x) / 2;
      const cy = (pos.y + startRef.current.y) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    startRef.current = null;
    strokeSnapshotRef.current = null;
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const last = undoStackRef.current.pop();
    if (canvas && ctx && last) ctx.putImageData(last, 0, 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    pushUndo();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onInsert(canvas.toDataURL('image/png'));
    onClose();
  };

  return (
    <WordBookModal
      isOpen={isOpen}
      onClose={onClose}
      title="Drawing"
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 cursor-pointer">
            Cancel
          </button>
          <button onClick={handleInsert} className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
            Insert
          </button>
        </>
      }
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {TOOLS.map((t) => (
          <button
            key={t}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTool(t)}
            className={`px-2 py-1 text-xs rounded border capitalize cursor-pointer ${
              tool === t ? 'bg-blue-600 text-white border-blue-600' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-1">
          {COLORS.map((c) => (
            <button
              key={c}
              title={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border cursor-pointer ${color === c ? 'ring-2 ring-blue-500 ring-offset-1' : 'border-zinc-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            title="Custom color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 border-0 bg-transparent cursor-pointer"
          />
        </div>
        <input
          type="range"
          title="Stroke width"
          min={1}
          max={20}
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-20"
        />
        <button onMouseDown={(e) => e.preventDefault()} onClick={handleUndo} className="px-2 py-1 text-xs rounded border border-zinc-300 hover:bg-zinc-100 cursor-pointer">
          Undo
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={handleClear} className="px-2 py-1 text-xs rounded border border-zinc-300 hover:bg-zinc-100 cursor-pointer">
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-zinc-300 rounded bg-white touch-none w-full"
        style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
    </WordBookModal>
  );
}
