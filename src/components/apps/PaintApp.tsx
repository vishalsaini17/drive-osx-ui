import React, { useRef, useState, useEffect } from 'react';
import { Palette, Trash, Download, RotateCcw, Brush, Eraser } from 'lucide-react';

export default function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ec4899'); // default pink color matching theme
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  
  // Track stroke history for undo
  const [history, setHistory] = useState<string[]>([]);

  // Setup canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on client bounds
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - 48; // subtract toolbar height

    // Standard canvas configurations
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set a solid dark background for export
    ctx.fillStyle = '#09090b'; // matching zinc-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state to undo history
    setHistory([canvas.toDataURL()]);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Bring cursor coordinate details relative to canvas bounds
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#09090b' : color;
    ctx.lineWidth = brushSize;
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Save state to undo history
      const canvas = canvasRef.current;
      if (canvas) {
        setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]); // limit to 20 history states
      }
    }
  };

  // Undo function
  const handleUndo = () => {
    if (history.length <= 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const img = new Image();
    img.src = newHistory[newHistory.length - 1];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  // Export to PNG Image file
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'webos_artwork.png';
    link.href = dataUrl;
    link.click();
  };

  // Clear Canvas back to zinc-950 dark background
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, canvas.toDataURL()]);
  };

  const colorPresets = [
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#eab308', // Yellow
    '#10b981', // Emerald
    '#ef4444', // Red
    '#ffffff', // White
  ];

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-zinc-950 text-white font-sans select-none overflow-hidden">
      {/* 1. PAINT APP TOOLBAR */}
      <div className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Tool selectors */}
          <div className="flex gap-1.5 bg-black/40 p-1 rounded-lg">
            <button
              onClick={() => setTool('brush')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                tool === 'brush' ? 'bg-pink-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Paint Brush"
            >
              <Brush className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                tool === 'eraser' ? 'bg-pink-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Eraser tool"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Palettes */}
          {tool === 'brush' && (
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
              {colorPresets.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform active:scale-90 cursor-pointer ${
                    color === c ? 'scale-110 ring-1 ring-white' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-4 h-4 rounded bg-transparent border-none outline-none cursor-pointer p-0"
                title="Custom color picker"
              />
            </div>
          )}

          {/* Brush thickness slider */}
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg border border-white/5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Size</span>
            <input
              type="range"
              min="2"
              max="40"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <span className="text-[10px] text-zinc-400 font-mono w-4">{brushSize}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
            title="Undo last stroke"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded-lg cursor-pointer"
            title="Wipe canvas clean"
          >
            <Trash className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-lg"
            title="Download painting as PNG"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* 2. DRAWS STAGE INTERACTION */}
      <div className="flex-1 bg-zinc-950 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  );
}
