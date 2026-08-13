import React, { useRef, useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import {
  Pencil,
  PaintBucket,
  Type,
  Eraser,
  Pipette,
  Search,
  Brush,
  Square,
  Circle,
  Minus,
  Triangle,
  Star,
  Heart,
  MessageSquare,
  ArrowRight,
  ArrowLeftRight,
  CornerDownRight,
  GitCommit,
  Layers,
  Database,
  Workflow,
  Box,
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Scissors,
  Copy,
  Clipboard,
  Download,
  Upload,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Check,
  X,
  ChevronDown,
  MousePointer,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Keyboard,
  HelpCircle,
  Grid,
  Palette,
  Layout,
  Sparkles,
  PenTool,
  Highlighter,
  StickyNote as StickyIcon,
  MessageSquarePlus,
  Users,
  Plus,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  Send,
  MessageCircle,
  FileDown
} from 'lucide-react';

type ToolType =
  | 'pen'
  | 'pencil'
  | 'marker'
  | 'brush'
  | 'eraser'
  | 'fill'
  | 'text'
  | 'sticky'
  | 'comment'
  | 'picker'
  | 'magnifier'
  | 'select'
  | 'shape';

type ShapeType =
  | 'line'
  | 'arrow'
  | 'double-arrow'
  | 'elbow-arrow'
  | 'rectangle'
  | 'rounded-rect'
  | 'diamond'
  | 'parallelogram'
  | 'capsule'
  | 'ellipse'
  | 'triangle'
  | 'database'
  | 'star'
  | 'heart'
  | 'speech-bubble';

type BrushStyle = 'standard' | 'calligraphy' | 'airbrush' | 'crayon' | 'marker' | 'watercolor';

interface StickyNoteItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  author: string;
  createdAt: string;
}

interface CommentPinItem {
  id: string;
  x: number;
  y: number;
  author: string;
  text: string;
  createdAt: string;
  resolved: boolean;
  avatarColor: string;
}

interface PeerCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  tool: string;
}

interface FloatingSelection {
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
  isDragging: boolean;
  isResizing: boolean;
  resizeHandle?: string;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  startImgX: number;
  startImgY: number;
}

interface SelectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  isDragging: boolean;
  isResizing: boolean;
  canvasData?: ImageData;
}

export default function PaintApp() {
  // Canvas Ref & Container
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Canvas Dimensions (Windows Paint Frame size)
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(550);

  // Frame Resizing Drag state
  const [isResizingFrame, setIsResizingFrame] = useState<'right' | 'bottom' | 'corner' | null>(null);
  const [frameResizeStart, setFrameResizeStart] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 800,
    h: 550,
  });

  // Tools & Settings
  const [tool, setTool] = useState<ToolType>('pencil');
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [brushStyle, setBrushStyle] = useState<BrushStyle>('standard');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [activeColorSlot, setActiveColorSlot] = useState<1 | 2>(1);
  const [color1, setColor1] = useState('#000000'); // Primary / Foreground
  const [color2, setColor2] = useState('#ffffff'); // Secondary / Background
  const [shapeOutline, setShapeOutline] = useState<'solid' | 'none'>('solid');
  const [shapeFill, setShapeFill] = useState<'none' | 'solid'>('none');

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState(100);

  // Active Drawing & History
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState<{ x: number; y: number } | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoList, setRedoList] = useState<ImageData[]>([]);

  // Mouse Coordinates for Status Bar
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Floating Pasted Image Selection
  const [floatingSelection, setFloatingSelection] = useState<FloatingSelection | null>(null);

  // Selection Box
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Text Tool Default Font Options State
  const [textFontFamily, setTextFontFamily] = useState<string>('sans-serif');
  const [textFontSize, setTextFontSize] = useState<number>(24);
  const [textIsBold, setTextIsBold] = useState<boolean>(false);
  const [textIsItalic, setTextIsItalic] = useState<boolean>(false);

  // Text Tool Overlay State
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    text: string;
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
    fontFamily: string;
    active: boolean;
  } | null>(null);

  // Whiteboard Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([
    {
      id: 'note_1',
      x: 60,
      y: 60,
      w: 180,
      h: 130,
      text: '📌 Project Roadmap:\n- Design UI Mockups\n- Connect Backend Services',
      color: '#fef08a',
      author: 'Alex',
      createdAt: '10:15 AM',
    },
  ]);

  // Whiteboard Comments State & Drawer
  const [comments, setComments] = useState<CommentPinItem[]>([
    {
      id: 'comment_1',
      x: 320,
      y: 110,
      author: 'Maya',
      text: 'Can we change the border style of this shape to rounded?',
      createdAt: '10:22 AM',
      resolved: false,
      avatarColor: '#8b5cf6',
    },
  ]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [showCommentsOnCanvas, setShowCommentsOnCanvas] = useState(true);
  const [newCommentInput, setNewCommentInput] = useState('');

  // Collaboration Multi-User Sync & Simulated Peer Cursors
  const [isCollabActive, setIsCollabActive] = useState(true);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([
    { id: 'peer_1', name: 'Alex M.', color: '#3b82f6', x: 210, y: 150, tool: 'Pencil' },
    { id: 'peer_2', name: 'Maya S.', color: '#8b5cf6', x: 340, y: 220, tool: 'Sticky Note' },
    { id: 'peer_3', name: 'Jordan T.', color: '#10b981', x: 480, y: 190, tool: 'Connector' },
  ]);

  // Resize & Skew Modal State
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [gridType, setGridType] = useState<'none' | 'grid' | 'dots' | 'blueprint' | 'ruled' | 'isometric'>('none');
  const [gridSize, setGridSize] = useState<number>(25);
  const [gridColor, setGridColor] = useState<string>('#cbd5e1');
  const [canvasBgColor, setCanvasBgColor] = useState<string>('#ffffff');
  const [resizeMode, setResizeMode] = useState<'pixels' | 'percent'>('pixels');
  const [resizeWInput, setResizeWInput] = useState('800');
  const [resizeHInput, setResizeHInput] = useState('550');
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // Color Palette Swatches (Windows Paint Classic)
  const classicColors = [
    '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
    '#ffffff', '#c3c3c3', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7', '#ef4444', '#f97316', '#eab308', '#10b981',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#84cc16', '#0284c7', '#d946ef'
  ];

  // Save current canvas state to Undo History
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-20), imgData]);
    setRedoList([]);
  }, []);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fill background with white (Color 2 default)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    saveToHistory();
  }, []);

  // Sync canvas size on frame resize while preserving image content
  const resizeCanvasAndPreserveContent = (newW: number, newH: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Snapshot existing content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    setCanvasWidth(newW);
    setCanvasHeight(newH);

    canvas.width = newW;
    canvas.height = newH;

    // Fill white background on newly expanded areas
    ctx.fillStyle = color2 || '#ffffff';
    ctx.fillRect(0, 0, newW, newH);

    // Draw previous image back
    ctx.drawImage(tempCanvas, 0, 0);
    saveToHistory();
  };

  // Commit Floating Selection (Pasted Image) onto Canvas
  const commitFloatingSelection = useCallback(() => {
    if (!floatingSelection) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      floatingSelection.img,
      floatingSelection.x,
      floatingSelection.y,
      floatingSelection.w,
      floatingSelection.h
    );

    setFloatingSelection(null);
    saveToHistory();
  }, [floatingSelection, saveToHistory]);

  // Global Paste Event Listener (Pasting images directly into Paint)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              // Commit any existing pasted image first
              commitFloatingSelection();

              // If canvas is smaller than pasted image, auto adjust canvas dimensions if needed
              let initialW = img.width;
              let initialH = img.height;
              if (initialW > 1200 || initialH > 800) {
                const ratio = Math.min(1000 / initialW, 700 / initialH);
                initialW = Math.round(initialW * ratio);
                initialH = Math.round(initialH * ratio);
              }

              setFloatingSelection({
                img,
                x: 20,
                y: 20,
                w: initialW,
                h: initialH,
                isDragging: false,
                isResizing: false,
                startX: 0,
                startY: 0,
                startW: initialW,
                startH: initialH,
                startImgX: 20,
                startImgY: 20,
              });
            };
            img.src = event.target?.result as string;
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [commitFloatingSelection]);

  // Handle File Upload as Pasted Image
  const handlePasteFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        commitFloatingSelection();
        setFloatingSelection({
          img,
          x: 20,
          y: 20,
          w: img.width,
          h: img.height,
          isDragging: false,
          isResizing: false,
          startX: 0,
          startY: 0,
          startW: img.width,
          startH: img.height,
          startImgX: 20,
          startImgY: 20,
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const current = history[history.length - 1];
    const prev = history[history.length - 2];

    setRedoList((r) => [current, ...r]);
    setHistory((h) => h.slice(0, -1));

    if (prev.width !== canvas.width || prev.height !== canvas.height) {
      setCanvasWidth(prev.width);
      setCanvasHeight(prev.height);
      canvas.width = prev.width;
      canvas.height = prev.height;
    }

    ctx.putImageData(prev, 0, 0);
  }, [history]);

  const handleRedo = useCallback(() => {
    if (redoList.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const next = redoList[0];
    setRedoList((r) => r.slice(1));
    setHistory((h) => [...h, next]);

    if (next.width !== canvas.width || next.height !== canvas.height) {
      setCanvasWidth(next.width);
      setCanvasHeight(next.height);
      canvas.width = next.width;
      canvas.height = next.height;
    }

    ctx.putImageData(next, 0, 0);
  }, [redoList]);

  // Clear Canvas
  const handleClearCanvas = () => {
    commitFloatingSelection();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = canvasBgColor || color2 || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  // Fill Canvas Pixels with Background Color
  const handleFillCanvasBackground = (fillColor: string) => {
    commitFloatingSelection();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveToHistory();
    setCanvasBgColor(fillColor);
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Permanently Bake Grid lines to Canvas Pixels
  const handleBakeGridToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (gridType === 'none') return;
    saveToHistory();

    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    if (gridType === 'grid' || gridType === 'blueprint') {
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    } else if (gridType === 'dots') {
      ctx.fillStyle = gridColor;
      for (let x = gridSize / 2; x < canvas.width; x += gridSize) {
        for (let y = gridSize / 2; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridType === 'ruled') {
      for (let y = gridSize; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    } else if (gridType === 'isometric') {
      const h = gridSize;
      const w = gridSize * 1.732;
      for (let y = 0; y <= canvas.height + w; y += h) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y - canvas.width * 0.577);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y + canvas.width * 0.577);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // Flood Fill (Paint Bucket)
  const handleFloodFill = (startX: number, startY: number, fillColorHex: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Convert target hex to RGBA
    const temp = document.createElement('canvas').getContext('2d')!;
    temp.fillStyle = fillColorHex;
    temp.fillRect(0, 0, 1, 1);
    const fillRgba = temp.getImageData(0, 0, 1, 1).data;

    const startPos = (startY * w + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    if (
      startR === fillRgba[0] &&
      startG === fillRgba[1] &&
      startB === fillRgba[2] &&
      startA === fillRgba[3]
    ) {
      return;
    }

    const matchesStart = (pos: number) => {
      return (
        data[pos] === startR &&
        data[pos + 1] === startG &&
        data[pos + 2] === startB &&
        data[pos + 3] === startA
      );
    };

    const queue: [number, number][] = [[startX, startY]];

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      let cy = y;

      while (cy >= 0 && matchesStart((cy * w + x) * 4)) {
        cy--;
      }
      cy++;

      let reachLeft = false;
      let reachRight = false;

      while (cy < h && matchesStart((cy * w + x) * 4)) {
        const p = (cy * w + x) * 4;
        data[p] = fillRgba[0];
        data[p + 1] = fillRgba[1];
        data[p + 2] = fillRgba[2];
        data[p + 3] = fillRgba[3];

        if (x > 0) {
          if (matchesStart((cy * w + (x - 1)) * 4)) {
            if (!reachLeft) {
              queue.push([x - 1, cy]);
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }

        if (x < w - 1) {
          if (matchesStart((cy * w + (x + 1)) * 4)) {
            if (!reachRight) {
              queue.push([x + 1, cy]);
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }

        cy++;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    saveToHistory();
  };

  // Color Eyedropper
  const handlePickColor = (x: number, y: number, isRightClick: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
      .toString(16)
      .slice(1)}`;

    if (isRightClick) {
      setColor2(hex);
    } else {
      setColor1(hex);
    }
    setTool('pencil');
  };

  // Rotate & Flip Operations
  const handleRotate = (angleDegrees: number) => {
    commitFloatingSelection();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(canvas, 0, 0);

    let newW = canvas.width;
    let newH = canvas.height;
    if (angleDegrees === 90 || angleDegrees === 270) {
      newW = canvas.height;
      newH = canvas.width;
    }

    setCanvasWidth(newW);
    setCanvasHeight(newH);
    canvas.width = newW;
    canvas.height = newH;

    ctx.fillStyle = color2 || '#ffffff';
    ctx.fillRect(0, 0, newW, newH);

    ctx.save();
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate((angleDegrees * Math.PI) / 180);
    ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
    ctx.restore();

    saveToHistory();
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    commitFloatingSelection();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(canvas, 0, 0);

    ctx.fillStyle = color2 || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (direction === 'horizontal') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    saveToHistory();
  };

  // Draw Shape Preview or Finalize
  const drawShapeOnContext = (
    ctx: CanvasRenderingContext2D,
    shape: ShapeType,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    primaryColor: string,
    secondaryColor: string
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = primaryColor;
    ctx.fillStyle = secondaryColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const w = x2 - x1;
    const h = y2 - y1;

    switch (shape) {
      case 'line':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        break;

      case 'arrow': {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        const headlen = 15;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        ctx.lineTo(
          x2 - headlen * Math.cos(angle - Math.PI / 6),
          y2 - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headlen * Math.cos(angle + Math.PI / 6),
          y2 - headlen * Math.sin(angle + Math.PI / 6)
        );
        break;
      }

      case 'double-arrow': {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        const headlen = 14;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        // Head at end
        ctx.lineTo(
          x2 - headlen * Math.cos(angle - Math.PI / 6),
          y2 - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headlen * Math.cos(angle + Math.PI / 6),
          y2 - headlen * Math.sin(angle + Math.PI / 6)
        );
        // Head at start
        ctx.moveTo(x1, y1);
        ctx.lineTo(
          x1 + headlen * Math.cos(angle - Math.PI / 6),
          y1 + headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x1, y1);
        ctx.lineTo(
          x1 + headlen * Math.cos(angle + Math.PI / 6),
          y1 + headlen * Math.sin(angle + Math.PI / 6)
        );
        break;
      }

      case 'elbow-arrow': {
        // Orthogonal connector path
        const midY = y1 + h / 2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, midY);
        ctx.lineTo(x2, midY);
        ctx.lineTo(x2, y2);

        // Arrowhead at end (pointing vertically or horizontally towards y2)
        const headlen = 12;
        const angle = y2 >= midY ? Math.PI / 2 : -Math.PI / 2;
        ctx.lineTo(
          x2 - headlen * Math.cos(angle - Math.PI / 6),
          y2 - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headlen * Math.cos(angle + Math.PI / 6),
          y2 - headlen * Math.sin(angle + Math.PI / 6)
        );
        break;
      }

      case 'rectangle':
        ctx.rect(x1, y1, w, h);
        break;

      case 'rounded-rect': {
        const radius = Math.min(Math.abs(w), Math.abs(h)) * 0.15;
        ctx.roundRect(x1, y1, w, h, radius);
        break;
      }

      case 'diamond': {
        // Decision block in flowcharts
        const cx = x1 + w / 2;
        const cy = y1 + h / 2;
        ctx.moveTo(cx, y1);
        ctx.lineTo(x2, cy);
        ctx.lineTo(cx, y2);
        ctx.lineTo(x1, cy);
        ctx.closePath();
        break;
      }

      case 'parallelogram': {
        // Data / IO block in flowcharts
        const shift = w * 0.2;
        ctx.moveTo(x1 + shift, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2 - shift, y2);
        ctx.lineTo(x1, y2);
        ctx.closePath();
        break;
      }

      case 'capsule': {
        // Terminal / Start-End block
        const r = Math.min(Math.abs(w), Math.abs(h)) / 2;
        ctx.roundRect(x1, y1, w, h, r);
        break;
      }

      case 'database': {
        // Database cylinder shape
        const rx = Math.abs(w / 2);
        const ry = Math.min(Math.abs(h / 4), 20);
        const cx = x1 + w / 2;

        // Top oval
        ctx.ellipse(cx, y1 + ry, rx, ry, 0, 0, 2 * Math.PI);
        // Vertical walls & bottom arc
        ctx.moveTo(x1, y1 + ry);
        ctx.lineTo(x1, y2 - ry);
        ctx.ellipse(cx, y2 - ry, rx, ry, 0, 0, Math.PI, false);
        ctx.lineTo(x2, y1 + ry);
        break;
      }

      case 'ellipse':
        ctx.ellipse(
          x1 + w / 2,
          y1 + h / 2,
          Math.abs(w / 2),
          Math.abs(h / 2),
          0,
          0,
          2 * Math.PI
        );
        break;

      case 'triangle':
        ctx.moveTo(x1 + w / 2, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1, y2);
        ctx.closePath();
        break;

      case 'star': {
        const cx = x1 + w / 2;
        const cy = y1 + h / 2;
        const outerR = Math.min(Math.abs(w), Math.abs(h)) / 2;
        const innerR = outerR / 2.2;
        const spikes = 5;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
          rot += step;
          ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
          rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
        break;
      }

      case 'heart': {
        const topCurveHeight = h * 0.3;
        ctx.moveTo(x1 + w / 2, y1 + topCurveHeight);
        ctx.bezierCurveTo(
          x1 + w / 2, y1,
          x1, y1,
          x1, y1 + topCurveHeight
        );
        ctx.bezierCurveTo(
          x1, y1 + (h + topCurveHeight) / 2,
          x1 + w / 2, y2,
          x1 + w / 2, y2
        );
        ctx.bezierCurveTo(
          x1 + w / 2, y2,
          x2, y1 + (h + topCurveHeight) / 2,
          x2, y1 + topCurveHeight
        );
        ctx.bezierCurveTo(
          x2, y1,
          x1 + w / 2, y1,
          x1 + w / 2, y1 + topCurveHeight
        );
        ctx.closePath();
        break;
      }

      case 'speech-bubble': {
        const radius = 10;
        const tailW = 20;
        ctx.moveTo(x1 + radius, y1);
        ctx.lineTo(x2 - radius, y1);
        ctx.quadraticCurveTo(x2, y1, x2, y1 + radius);
        ctx.lineTo(x2, y2 - 20 - radius);
        ctx.quadraticCurveTo(x2, y2 - 20, x2 - radius, y2 - 20);
        ctx.lineTo(x1 + 40 + tailW, y2 - 20);
        ctx.lineTo(x1 + 20, y2);
        ctx.lineTo(x1 + 40, y2 - 20);
        ctx.lineTo(x1 + radius, y2 - 20);
        ctx.quadraticCurveTo(x1, y2 - 20, x1, y2 - 20 - radius);
        ctx.lineTo(x1, y1 + radius);
        ctx.quadraticCurveTo(x1, y1, x1 + radius, y1);
        ctx.closePath();
        break;
      }
    }

    if (shapeFill === 'solid') {
      ctx.fill();
    }
    if (shapeOutline === 'solid') {
      ctx.stroke();
    }
  };

  // Dynamic Canvas Cursor based on Active Tool
  const getCanvasCursor = () => {
    if (tool === 'picker') {
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m2 22 1-1h3l9-9'/%3E%3Cpath d='M13 6l5 5'/%3E%3Cpath d='m15 4 2-2 4 4-2 2'/%3E%3C/svg%3E") 2 22, copy`;
    }
    if (tool === 'text') {
      return 'text';
    }
    if (tool === 'fill') {
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z'/%3E%3Cpath d='m5 2 5 5'/%3E%3Cpath d='M2 13h15'/%3E%3Cpath d='M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z'/%3E%3C/svg%3E") 2 18, pointer`;
    }
    if (tool === 'magnifier') {
      return 'zoom-in';
    }
    if (tool === 'eraser') {
      return 'cell';
    }
    if (tool === 'select') {
      return 'crosshair';
    }
    return 'crosshair';
  };

  // Mouse Down / Drawing Start
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (floatingSelection) {
      commitFloatingSelection();
    }

    // Auto-commit existing text input when clicking on canvas
    if (textInput && textInput.active) {
      handleCommitText();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));

    const isRight = e.button === 2;
    const drawColor = isRight ? color2 : color1;

    if (tool === 'picker') {
      handlePickColor(x, y, isRight);
      return;
    }

    if (tool === 'fill') {
      handleFloodFill(x, y, drawColor);
      return;
    }

    if (tool === 'text') {
      setTextInput({
        x,
        y,
        text: '',
        fontSize: textFontSize,
        isBold: textIsBold,
        isItalic: textIsItalic,
        fontFamily: textFontFamily,
        active: true,
      });
      return;
    }

    if (tool === 'sticky') {
      const newNote: StickyNoteItem = {
        id: 'note_' + Date.now(),
        x: Math.max(20, x - 80),
        y: Math.max(20, y - 60),
        w: 180,
        h: 130,
        text: 'New sticky note...',
        color: '#fef08a',
        author: 'You',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setStickyNotes((prev) => [...prev, newNote]);
      setTool('pen');
      return;
    }

    if (tool === 'comment') {
      const newComment: CommentPinItem = {
        id: 'comment_' + Date.now(),
        x,
        y,
        author: 'You',
        text: 'Click to edit comment text...',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        resolved: false,
        avatarColor: '#3b82f6',
      };
      setComments((prev) => [...prev, newComment]);
      setActiveCommentId(newComment.id);
      setShowCommentsSidebar(true);
      setTool('pen');
      return;
    }

    if (tool === 'magnifier') {
      if (isRight) {
        setZoomLevel((z) => Math.max(50, z - 25));
      } else {
        setZoomLevel((z) => Math.min(400, z + 50));
      }
      return;
    }

    setIsDrawing(true);
    setDrawStartPos({ x, y });
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'pen' || tool === 'pencil' || tool === 'marker' || tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);

      if (tool === 'eraser') {
        ctx.strokeStyle = color2 || '#ffffff';
        ctx.lineWidth = strokeWidth * 3;
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
      } else if (tool === 'pen') {
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = Math.max(1.5, strokeWidth * 1.2);
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
      } else if (tool === 'pencil') {
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = Math.max(1, strokeWidth);
        ctx.globalAlpha = 0.85;
        ctx.lineCap = 'round';
      } else if (tool === 'marker') {
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = strokeWidth * 3.5;
        ctx.globalAlpha = 0.45;
        ctx.lineCap = 'square';
      } else {
        // Brush styles
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = strokeWidth * 2;
        ctx.globalAlpha = 1.0;
        if (brushStyle === 'airbrush') {
          ctx.fillStyle = drawColor;
        }
        ctx.lineCap = 'round';
      }
      ctx.lineJoin = 'round';
    }
  };

  // Mouse Move / Drawing
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));
    setMousePos({ x, y });

    if (!isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isRight = e.buttons === 2;
    const drawColor = isRight ? color2 : color1;

    if (tool === 'pen' || tool === 'pencil' || tool === 'marker' || tool === 'brush' || tool === 'eraser') {
      if (tool === 'brush' && brushStyle === 'airbrush') {
        // Spray effect
        for (let i = 0; i < 15; i++) {
          const offsetX = (Math.random() - 0.5) * strokeWidth * 4;
          const offsetY = (Math.random() - 0.5) * strokeWidth * 4;
          ctx.fillRect(x + offsetX, y + offsetY, 1.5, 1.5);
        }
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else if ((tool === 'shape' || tool === 'select') && drawStartPos && snapshot) {
      // Restore pre-drag snapshot for live shape preview
      ctx.putImageData(snapshot, 0, 0);

      if (tool === 'shape') {
        drawShapeOnContext(
          ctx,
          selectedShape,
          drawStartPos.x,
          drawStartPos.y,
          x,
          y,
          drawColor,
          color2
        );
      } else if (tool === 'select') {
        // Render dashed selection outline
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          drawStartPos.x,
          drawStartPos.y,
          x - drawStartPos.x,
          y - drawStartPos.y
        );
        ctx.restore();
      }
    }
  };

  // Mouse Up / Finish Drawing
  const handleMouseUp = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas && drawStartPos && mousePos && tool === 'select' && snapshot) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const x1 = drawStartPos.x;
          const y1 = drawStartPos.y;
          const x2 = mousePos.x;
          const y2 = mousePos.y;
          const selX = Math.min(x1, x2);
          const selY = Math.min(y1, y2);
          const selW = Math.abs(x2 - x1);
          const selH = Math.abs(y2 - y1);

          if (selW > 5 && selH > 5) {
            // Restore clean snapshot before dash line preview
            ctx.putImageData(snapshot, 0, 0);

            // Extract ImageData
            const imgData = ctx.getImageData(selX, selY, selW, selH);

            // Clear selected area on canvas with Color 2 (background)
            ctx.fillStyle = color2 || '#ffffff';
            ctx.fillRect(selX, selY, selW, selH);

            // Create image from extracted ImageData
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = selW;
            tempCanvas.height = selH;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.putImageData(imgData, 0, 0);
              const img = new Image();
              img.onload = () => {
                setFloatingSelection({
                  img,
                  x: selX,
                  y: selY,
                  w: selW,
                  h: selH,
                  isDragging: false,
                  isResizing: false,
                  startX: 0,
                  startY: 0,
                  startW: selW,
                  startH: selH,
                  startImgX: selX,
                  startImgY: selY,
                });
              };
              img.src = tempCanvas.toDataURL();
            }
          }
        }
      }

      setIsDrawing(false);
      setSnapshot(null);
      saveToHistory();
    }
  };

  // Quick Insert Flowchart Node Template
  const handleInsertFlowchartBlock = (type: 'process' | 'decision' | 'terminal' | 'data' | 'database') => {
    commitFloatingSelection();
    const tempCanvas = document.createElement('canvas');
    const w = 160;
    const h = 80;
    tempCanvas.width = w;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = color1 || '#2563eb';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#f8fafc';

    ctx.beginPath();
    if (type === 'process') {
      ctx.roundRect(4, 4, w - 8, h - 8, 8);
    } else if (type === 'decision') {
      ctx.moveTo(w / 2, 4);
      ctx.lineTo(w - 4, h / 2);
      ctx.lineTo(w / 2, h - 4);
      ctx.lineTo(4, h / 2);
      ctx.closePath();
    } else if (type === 'terminal') {
      ctx.roundRect(4, 4, w - 8, h - 8, (h - 8) / 2);
    } else if (type === 'data') {
      const shift = 24;
      ctx.moveTo(4 + shift, 4);
      ctx.lineTo(w - 4, 4);
      ctx.lineTo(w - 4 - shift, h - 4);
      ctx.lineTo(4, h - 4);
      ctx.closePath();
    } else if (type === 'database') {
      const rx = (w - 8) / 2;
      const ry = 14;
      const cx = w / 2;
      ctx.ellipse(cx, 4 + ry, rx, ry, 0, 0, 2 * Math.PI);
      ctx.moveTo(4, 4 + ry);
      ctx.lineTo(4, h - 4 - ry);
      ctx.ellipse(cx, h - 4 - ry, rx, ry, 0, 0, Math.PI, false);
      ctx.lineTo(w - 4, 4 + ry);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels: Record<string, string> = {
      process: 'Process Step',
      decision: 'Decision?',
      terminal: 'Start / End',
      data: 'Input / Output',
      database: 'Database',
    };
    ctx.fillText(labels[type] || 'Node', w / 2, h / 2);

    const img = new Image();
    img.onload = () => {
      setFloatingSelection({
        img,
        x: Math.round((canvasWidth - w) / 2),
        y: Math.round((canvasHeight - h) / 2),
        w,
        h,
        isDragging: false,
        isResizing: false,
        startX: 0,
        startY: 0,
        startW: w,
        startH: h,
        startImgX: Math.round((canvasWidth - w) / 2),
        startImgY: Math.round((canvasHeight - h) / 2),
      });
    };
    img.src = tempCanvas.toDataURL();
  };

  // Text Tool Commit
  const handleCommitText = (targetInput?: typeof textInput) => {
    const input = targetInput !== undefined ? targetInput : textInput;
    if (!input || !input.text || !input.text.trim()) {
      setTextInput(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.font = `${input.isItalic ? 'italic ' : ''}${input.isBold ? 'bold ' : ''}${input.fontSize}px ${input.fontFamily || 'sans-serif'}`;
    ctx.fillStyle = color1;
    ctx.textBaseline = 'top';

    const lines = input.text.split('\n');
    const lineHeight = input.fontSize * 1.25;
    lines.forEach((line, idx) => {
      ctx.fillText(line, input.x, input.y + idx * lineHeight);
    });

    ctx.restore();

    setTextInput(null);
    saveToHistory();
  };

  // Frame Resize Dragging Logic
  const handleFrameResizeStart = (
    direction: 'right' | 'bottom' | 'corner',
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    commitFloatingSelection();

    setIsResizingFrame(direction);
    setFrameResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: canvasWidth,
      h: canvasHeight,
    });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizingFrame) return;

      const deltaX = (e.clientX - frameResizeStart.x) * (100 / zoomLevel);
      const deltaY = (e.clientY - frameResizeStart.y) * (100 / zoomLevel);

      let newW = frameResizeStart.w;
      let newH = frameResizeStart.h;

      if (isResizingFrame === 'right' || isResizingFrame === 'corner') {
        newW = Math.max(100, Math.round(frameResizeStart.w + deltaX));
      }
      if (isResizingFrame === 'bottom' || isResizingFrame === 'corner') {
        newH = Math.max(100, Math.round(frameResizeStart.h + deltaY));
      }

      setCanvasWidth(newW);
      setCanvasHeight(newH);
    };

    const handleGlobalMouseUp = () => {
      if (isResizingFrame) {
        setIsResizingFrame(null);
        resizeCanvasAndPreserveContent(canvasWidth, canvasHeight);
      }
    };

    if (isResizingFrame) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isResizingFrame, frameResizeStart, canvasWidth, canvasHeight, zoomLevel]);

  // Floating Selection Dragging & Resizing
  const handleFloatingMouseDown = (e: React.MouseEvent, handle?: string) => {
    e.stopPropagation();
    if (!floatingSelection) return;

    setFloatingSelection((prev) =>
      prev
        ? {
            ...prev,
            isDragging: !handle,
            isResizing: !!handle,
            resizeHandle: handle,
            startX: e.clientX,
            startY: e.clientY,
            startW: prev.w,
            startH: prev.h,
            startImgX: prev.x,
            startImgY: prev.y,
          }
        : null
    );
  };

  useEffect(() => {
    const handleFloatingMouseMove = (e: MouseEvent) => {
      if (!floatingSelection || (!floatingSelection.isDragging && !floatingSelection.isResizing))
        return;

      const deltaX = (e.clientX - floatingSelection.startX) * (100 / zoomLevel);
      const deltaY = (e.clientY - floatingSelection.startY) * (100 / zoomLevel);

      if (floatingSelection.isDragging) {
        setFloatingSelection((prev) =>
          prev
            ? {
                ...prev,
                x: Math.round(prev.startImgX + deltaX),
                y: Math.round(prev.startImgY + deltaY),
              }
            : null
        );
      } else if (floatingSelection.isResizing) {
        setFloatingSelection((prev) => {
          if (!prev) return null;
          let nx = prev.startImgX;
          let ny = prev.startImgY;
          let nw = prev.startW;
          let nh = prev.startH;
          const handle = prev.resizeHandle || '';

          if (handle.includes('e')) {
            nw = Math.max(15, prev.startW + deltaX);
          }
          if (handle.includes('s')) {
            nh = Math.max(15, prev.startH + deltaY);
          }
          if (handle.includes('w')) {
            const clampedDeltaX = Math.min(deltaX, prev.startW - 15);
            nx = prev.startImgX + clampedDeltaX;
            nw = prev.startW - clampedDeltaX;
          }
          if (handle.includes('n')) {
            const clampedDeltaY = Math.min(deltaY, prev.startH - 15);
            ny = prev.startImgY + clampedDeltaY;
            nh = prev.startH - clampedDeltaY;
          }

          return {
            ...prev,
            x: Math.round(nx),
            y: Math.round(ny),
            w: Math.round(nw),
            h: Math.round(nh),
          };
        });
      }
    };

    const handleFloatingMouseUp = () => {
      if (floatingSelection?.isDragging || floatingSelection?.isResizing) {
        setFloatingSelection((prev) =>
          prev ? { ...prev, isDragging: false, isResizing: false } : null
        );
      }
    };

    window.addEventListener('mousemove', handleFloatingMouseMove);
    window.addEventListener('mouseup', handleFloatingMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleFloatingMouseMove);
      window.removeEventListener('mouseup', handleFloatingMouseUp);
    };
  }, [floatingSelection, zoomLevel]);

  // Export Canvas as PNG
  const handleExport = useCallback(() => {
    commitFloatingSelection();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'whiteboard_artwork.png';
    link.href = dataUrl;
    link.click();
  }, [commitFloatingSelection]);

  // Export Canvas as PDF
  const handleExportPDF = useCallback(() => {
    commitFloatingSelection();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('whiteboard_artwork.pdf');
  }, [commitFloatingSelection]);

  // Peer Cursors Motion Simulation for Real-Time Collaboration
  useEffect(() => {
    if (!isCollabActive) return;

    const interval = setInterval(() => {
      setPeerCursors((prev) =>
        prev.map((peer) => {
          const dx = (Math.random() - 0.5) * 35;
          const dy = (Math.random() - 0.5) * 35;
          const newX = Math.min(Math.max(30, peer.x + dx), canvasWidth - 30);
          const newY = Math.min(Math.max(30, peer.y + dy), canvasHeight - 30);
          return { ...peer, x: Math.round(newX), y: Math.round(newY) };
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [isCollabActive, canvasWidth, canvasHeight]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input fields, textareas, or contentEditable
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier) {
        const key = e.key.toLowerCase();
        // Undo: Ctrl/Cmd + Z
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
          return;
        }
        // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
        if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
          return;
        }
        // Save: Ctrl/Cmd + S
        if (key === 's') {
          e.preventDefault();
          handleExport();
          return;
        }
      }

      // Tool Single-Key Hotkeys
      if (!modifier && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'p') setTool('pencil');
        else if (key === 'b') setTool('brush');
        else if (key === 'e') setTool('eraser');
        else if (key === 'f' || key === 'g') setTool('fill');
        else if (key === 't') setTool('text');
        else if (key === 'i') setTool('picker');
        else if (key === 'm') setTool('magnifier');
        else if (key === 'v') setTool('select');
        else if (e.key === 'Escape') {
          commitFloatingSelection();
          if (textInput) setTextInput(null);
          setShowShortcutsModal(false);
          setShowResizeModal(false);
          setShowBackgroundModal(false);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (floatingSelection) {
            e.preventDefault();
            setFloatingSelection(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleExport, commitFloatingSelection, textInput, floatingSelection]);

  // Submit Modal Canvas Resize
  const handleApplyResizeModal = () => {
    let w = parseInt(resizeWInput) || canvasWidth;
    let h = parseInt(resizeHInput) || canvasHeight;

    if (resizeMode === 'percent') {
      w = Math.round((canvasWidth * w) / 100);
      h = Math.round((canvasHeight * h) / 100);
    }

    w = Math.max(50, Math.min(4000, w));
    h = Math.max(50, Math.min(4000, h));

    resizeCanvasAndPreserveContent(w, h);
    setShowResizeModal(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#f0f3f9] text-slate-800 font-sans select-none overflow-hidden relative">
      {/* Hidden File Input for "Paste from..." */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePasteFromFile}
        className="hidden"
      />

      {/* ================= 1. WINDOWS PAINT RIBBON HEADER ================= */}
      <div className="bg-[#f3f6fb] border-b border-slate-300 shadow-2xs shrink-0 z-20">
        {/* Quick Access & Title Bar */}
        <div className="h-9 px-3 bg-white/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="px-2 py-1 flex items-center gap-1 rounded-md hover:bg-slate-200 disabled:opacity-30 cursor-pointer text-[11px] font-bold text-slate-700"
              title="Undo Action (Ctrl + Z)"
            >
              <Undo2 size={14} className="text-blue-600" />
              <span>Undo</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={redoList.length === 0}
              className="px-2 py-1 flex items-center gap-1 rounded-md hover:bg-slate-200 disabled:opacity-30 cursor-pointer text-[11px] font-bold text-slate-700"
              title="Redo Action (Ctrl + Y)"
            >
              <Redo2 size={14} className="text-blue-600" />
              <span>Redo</span>
            </button>
            <div className="h-3.5 w-px bg-slate-300 mx-1" />
            <span className="font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Pencil size={14} className="text-blue-600" /> Untitled - Paint
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-User Collaboration Pill & Toggle */}
            <button
              onClick={() => setIsCollabActive(!isCollabActive)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                isCollabActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title="Toggle Multi-User Real-Time Live Cursor Presence"
            >
              <Users size={13} className={isCollabActive ? 'text-emerald-600' : 'text-slate-500'} />
              <span>Collab: {isCollabActive ? 'Live (4)' : 'Paused'}</span>
            </button>

            {/* Comments Drawer Toggle */}
            <button
              onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                showCommentsSidebar
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Toggle Whiteboard Comments Drawer"
            >
              <MessageCircle size={13} />
              <span>Comments ({comments.length})</span>
            </button>

            <button
              onClick={() => setShowBackgroundModal(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 bg-slate-100 border border-slate-200/90 shadow-2xs"
              title="Canvas Background Fill & Grid Pattern Options"
            >
              <Grid size={13} className="text-blue-600" /> Background & Grid
            </button>
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 bg-slate-100 border border-slate-200/90 shadow-2xs"
              title="View Keyboard Shortcuts"
            >
              <Keyboard size={13} className="text-blue-600" /> Shortcuts
            </button>
            <button
              onClick={handleClearCanvas}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            >
              Clear Canvas
            </button>

            {/* Export Actions (PNG & PDF) */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleExport}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Export Artwork as PNG Image"
              >
                <Download size={13} /> PNG
              </button>
              <button
                onClick={handleExportPDF}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Export Artwork as PDF Document"
              >
                <FileDown size={13} /> PDF
              </button>
            </div>
          </div>
        </div>

        {/* Top Ribbon Toolbar (Context Options & Colors) */}
        <div className="px-3 py-1.5 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 shrink-0">
            {/* Group 1: Clipboard & Selection */}
            <div className="flex flex-col items-center justify-between h-14 border-r border-slate-300/80 pr-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center px-2 py-0.5 hover:bg-slate-200/80 rounded-lg text-slate-800 cursor-pointer transition-colors"
                  title="Paste Image from File (or press Ctrl+V anywhere)"
                >
                  <Clipboard size={16} className="text-blue-600" />
                  <span className="text-[9px] font-bold mt-0.5">Paste</span>
                </button>

                <button
                  onClick={() => setTool('select')}
                  className={`p-1.5 rounded-lg flex flex-col items-center text-[9px] font-bold cursor-pointer transition-all ${
                    tool === 'select'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'hover:bg-slate-200/80 text-slate-700'
                  }`}
                  title="Select Region to Drag / Move / Resize"
                >
                  <MousePointer size={15} />
                  <span>Select</span>
                </button>

                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => {
                      setShowResizeModal(true);
                      setResizeWInput(String(canvasWidth));
                      setResizeHInput(String(canvasHeight));
                    }}
                    className="px-1.5 py-0.5 hover:bg-slate-200/80 rounded flex items-center gap-1 text-[9px] font-semibold text-slate-700 cursor-pointer"
                    title="Resize Canvas"
                  >
                    <Maximize2 size={11} /> Resize
                  </button>
                  <button
                    onClick={() => handleRotate(90)}
                    className="px-1.5 py-0.5 hover:bg-slate-200/80 rounded flex items-center gap-1 text-[9px] font-semibold text-slate-700 cursor-pointer"
                    title="Rotate 90°"
                  >
                    <RotateCw size={11} /> Rotate
                  </button>
                </div>
              </div>
              <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                Clipboard & Canvas
              </span>
            </div>

            {/* Group 2: Stroke Size / Thickness */}
            <div className="flex flex-col items-center justify-between h-14 border-r border-slate-300/80 pr-3">
              <div className="flex flex-col items-center justify-center gap-1 my-auto">
                <span className="text-[9px] font-bold text-slate-600">Stroke Size: {strokeWidth}px</span>
                <div className="flex items-center gap-1">
                  {[1, 3, 5, 8, 12, 18].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setStrokeWidth(sz)}
                      className={`w-4.5 h-4.5 rounded flex items-center justify-center cursor-pointer transition-colors ${
                        strokeWidth === sz
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 text-[9px]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                Stroke Size
              </span>
            </div>

            {/* Group 3: Context options (Brush Style & Shape Outline/Fill) */}
            <div className="flex flex-col items-center justify-between h-14 border-r border-slate-300/80 pr-3">
              <div className="flex items-center gap-2 my-auto">
                {tool === 'brush' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600">Brush:</span>
                    <select
                      value={brushStyle}
                      onChange={(e) => setBrushStyle(e.target.value as BrushStyle)}
                      className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="standard">Standard Brush</option>
                      <option value="airbrush">Airbrush / Spray</option>
                      <option value="calligraphy">Calligraphy</option>
                      <option value="crayon">Crayon</option>
                      <option value="marker">Marker</option>
                      <option value="watercolor">Watercolor</option>
                    </select>
                  </div>
                )}

                {tool === 'shape' && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                    <div className="flex items-center gap-1">
                      <span>Outline:</span>
                      <button
                        onClick={() => setShapeOutline((s) => (s === 'solid' ? 'none' : 'solid'))}
                        className="px-1.5 py-0.5 rounded bg-white border border-slate-300 uppercase text-[9px] font-extrabold text-blue-700 cursor-pointer"
                      >
                        {shapeOutline}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Fill:</span>
                      <button
                        onClick={() => setShapeFill((s) => (s === 'solid' ? 'none' : 'solid'))}
                        className="px-1.5 py-0.5 rounded bg-white border border-slate-300 uppercase text-[9px] font-extrabold text-blue-700 cursor-pointer"
                      >
                        {shapeFill}
                      </button>
                    </div>
                  </div>
                )}

                {tool === 'text' && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                    <div className="flex items-center gap-1">
                      <span>Font:</span>
                      <select
                        value={textFontFamily}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTextFontFamily(val);
                          if (textInput) setTextInput({ ...textInput, fontFamily: val });
                        }}
                        className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-800"
                      >
                        <option value="sans-serif">Sans-Serif</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Monospace</option>
                        <option value="cursive">Cursive</option>
                        <option value="Impact">Impact</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <span>Size:</span>
                      <select
                        value={textFontSize}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTextFontSize(val);
                          if (textInput) setTextInput({ ...textInput, fontSize: val });
                        }}
                        className="bg-white border border-slate-300 rounded px-1 py-0.5 text-[10px] font-bold text-slate-800"
                      >
                        {[12, 14, 16, 20, 24, 28, 32, 40, 48, 64, 72].map((sz) => (
                          <option key={sz} value={sz}>{sz}px</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const next = !textIsBold;
                          setTextIsBold(next);
                          if (textInput) setTextInput({ ...textInput, isBold: next });
                        }}
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold cursor-pointer ${
                          textIsBold ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        B
                      </button>
                      <button
                        onClick={() => {
                          const next = !textIsItalic;
                          setTextIsItalic(next);
                          if (textInput) setTextInput({ ...textInput, isItalic: next });
                        }}
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold italic cursor-pointer ${
                          textIsItalic ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        I
                      </button>
                    </div>
                  </div>
                )}

                {tool !== 'brush' && tool !== 'shape' && tool !== 'text' && (
                  <span className="text-[10px] text-slate-500 font-medium italic">
                    Select Brush, Shape, or Text for options
                  </span>
                )}
              </div>
              <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                Tool Options
              </span>
            </div>

            {/* Group 4: Color Palette */}
            <div className="flex flex-col items-center justify-between h-14">
              <div className="flex items-center gap-2.5">
                {/* Color 1 & Color 2 */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveColorSlot(1)}
                    className={`flex flex-col items-center cursor-pointer p-0.5 rounded-lg transition-all ${
                      activeColorSlot === 1 ? 'bg-white ring-2 ring-blue-500 shadow-xs' : 'hover:bg-slate-200/70'
                    }`}
                    title="Color 1 (Primary)"
                  >
                    <div
                      className="w-5 h-5 rounded border border-slate-400"
                      style={{ backgroundColor: color1 }}
                    />
                    <span className="text-[8px] font-bold text-slate-600">Color 1</span>
                  </button>

                  <button
                    onClick={() => setActiveColorSlot(2)}
                    className={`flex flex-col items-center cursor-pointer p-0.5 rounded-lg transition-all ${
                      activeColorSlot === 2 ? 'bg-white ring-2 ring-blue-500 shadow-xs' : 'hover:bg-slate-200/70'
                    }`}
                    title="Color 2 (Secondary / Eraser)"
                  >
                    <div
                      className="w-5 h-5 rounded border border-slate-400"
                      style={{ backgroundColor: color2 }}
                    />
                    <span className="text-[8px] font-bold text-slate-600">Color 2</span>
                  </button>
                </div>

                {/* Swatch Palette Grid */}
                <div className="grid grid-cols-10 gap-0.5 bg-white p-1 rounded-lg border border-slate-300/80 shadow-2xs">
                  {classicColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        if (activeColorSlot === 1) setColor1(c);
                        else setColor2(c);
                      }}
                      className="w-3.5 h-3.5 rounded-xs border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Native Custom Color Picker */}
                <label className="flex flex-col items-center cursor-pointer hover:bg-slate-200/80 p-1 rounded-lg">
                  <input
                    type="color"
                    value={activeColorSlot === 1 ? color1 : color2}
                    onChange={(e) => {
                      if (activeColorSlot === 1) setColor1(e.target.value);
                      else setColor2(e.target.value);
                    }}
                    className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer rounded"
                  />
                  <span className="text-[8px] font-bold text-slate-600">Custom</span>
                </label>
              </div>

              <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                Colors
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. WORKSPACE CONTAINER (LEFT SIDEBAR + CANVAS STAGE) ================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Tool Sidebar */}
        <div className="w-48 bg-slate-100 border-r border-slate-200/90 flex flex-col shrink-0 overflow-y-auto p-2.5 gap-3.5 custom-scrollbar select-none text-slate-800 z-10">
          {/* Section 0: History (Undo / Redo) */}
          <div>
            <div className="flex items-center justify-between text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1 px-1">
              <span>History</span>
              <span className="text-blue-600 font-bold">Ctrl+Z / Y</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                title="Undo last action (Ctrl + Z)"
              >
                <Undo2 size={13} className="text-blue-600 shrink-0" />
                <span>Undo</span>
              </button>

              <button
                onClick={handleRedo}
                disabled={redoList.length === 0}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                title="Redo action (Ctrl + Y)"
              >
                <Redo2 size={13} className="text-blue-600 shrink-0" />
                <span>Redo</span>
              </button>
            </div>
          </div>

          {/* Section 1: Drawing Tools & Elements */}
          <div>
            <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1 px-1 flex items-center justify-between">
              <span>Drawing & Insert</span>
              <span className="text-blue-600 font-bold">12 Tools</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'pen', name: 'Pen (Smooth Ink)', icon: PenTool },
                { id: 'pencil', name: 'Pencil (Fine Graphite)', icon: Pencil },
                { id: 'marker', name: 'Marker / Highlighter', icon: Highlighter },
                { id: 'eraser', name: 'Eraser (Clear Canvas)', icon: Eraser },
                { id: 'brush', name: 'Paint Brush', icon: Brush },
                { id: 'fill', name: 'Paint Bucket Fill', icon: PaintBucket },
                { id: 'text', name: 'Rich Text', icon: Type },
                { id: 'sticky', name: 'Sticky Note Card', icon: StickyIcon },
                { id: 'comment', name: 'Comment Pin', icon: MessageSquarePlus },
                { id: 'select', name: 'Select Region', icon: MousePointer },
                { id: 'picker', name: 'Eyedropper Color Picker', icon: Pipette },
                { id: 'magnifier', name: 'Magnifier / Zoom', icon: Search },
              ].map((t) => {
                const IconComp = t.icon;
                const active = tool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id as ToolType)}
                    className={`p-2 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
                      active
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                    title={t.name}
                  >
                    <IconComp size={15} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Shapes & Flowcharts */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                Shapes & Connectors
              </span>
              <span className="text-[9px] font-bold text-blue-600">15 Shapes</span>
            </div>
            <div className="grid grid-cols-5 gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
              {[
                { type: 'line', icon: Minus, name: 'Line' },
                { type: 'arrow', icon: ArrowRight, name: 'Connecting Arrow' },
                { type: 'double-arrow', icon: ArrowLeftRight, name: 'Double Arrow' },
                { type: 'elbow-arrow', icon: CornerDownRight, name: 'Elbow / Orthogonal Arrow' },
                { type: 'rectangle', icon: Square, name: 'Process Block (Rectangle)' },
                { type: 'rounded-rect', icon: Square, name: 'Subprocess (Rounded Rect)' },
                { type: 'diamond', icon: GitCommit, name: 'Decision Diamond' },
                { type: 'parallelogram', icon: Layers, name: 'Data / Input-Output' },
                { type: 'capsule', icon: Box, name: 'Terminal (Start / End)' },
                { type: 'database', icon: Database, name: 'Database Storage' },
                { type: 'ellipse', icon: Circle, name: 'Connector / Circle' },
                { type: 'triangle', icon: Triangle, name: 'Triangle' },
                { type: 'star', icon: Star, name: 'Star' },
                { type: 'heart', icon: Heart, name: 'Heart' },
                { type: 'speech-bubble', icon: MessageSquare, name: 'Speech Bubble' },
              ].map((s) => {
                const IconComp = s.icon;
                const isSel = tool === 'shape' && selectedShape === s.type;
                return (
                  <button
                    key={s.type}
                    onClick={() => {
                      setTool('shape');
                      setSelectedShape(s.type as ShapeType);
                    }}
                    className={`p-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                      isSel
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    title={s.name}
                  >
                    <IconComp size={14} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Quick Flowchart Blocks */}
          <div className="bg-gradient-to-b from-blue-50/80 to-slate-50 p-2 rounded-xl border border-blue-200/80">
            <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase text-blue-700 tracking-wider mb-1.5">
              <Workflow size={12} /> Flowchart Nodes
            </div>
            <div className="flex flex-col gap-1">
              {[
                { type: 'process', label: '+ Process Step' },
                { type: 'decision', label: '+ Decision Node' },
                { type: 'terminal', label: '+ Start / End' },
                { type: 'data', label: '+ Input / Output' },
                { type: 'database', label: '+ Database Node' },
              ].map((fb) => (
                <button
                  key={fb.type}
                  onClick={() => handleInsertFlowchartBlock(fb.type as any)}
                  className="w-full text-left px-2 py-1 bg-white hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center justify-between"
                >
                  <span>{fb.label}</span>
                  <span className="text-[9px] opacity-60">Add</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Canvas Background & Grid Options */}
          <div className="bg-slate-200/60 p-2 rounded-xl border border-slate-300/80">
            <div className="flex items-center justify-between text-[9px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5 px-0.5">
              <span className="flex items-center gap-1"><Grid size={11} /> Canvas Background</span>
              <span className="text-[9px] font-bold text-blue-600 capitalize">{gridType}</span>
            </div>
            <button
              onClick={() => setShowBackgroundModal(true)}
              className="w-full py-1.5 px-2 bg-white hover:bg-blue-600 hover:text-white text-slate-800 border border-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-2xs flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-slate-400 shrink-0"
                  style={{ backgroundColor: canvasBgColor }}
                />
                <span className="truncate">Bg & Grid Options</span>
              </div>
              <SlidersHorizontal size={12} className="shrink-0 opacity-70" />
            </button>
          </div>
        </div>

        {/* Canvas Stage Frame */}
        <div
          ref={containerRef}
          className="flex-1 bg-[#dbe2ef]/70 relative overflow-auto p-8 flex items-start justify-start custom-scrollbar"
        >
        {/* Canvas Frame Box */}
        <div
          className="relative shadow-xl transition-shadow rounded-2xs overflow-hidden"
          style={{
            width: `${(canvasWidth * zoomLevel) / 100}px`,
            height: `${(canvasHeight * zoomLevel) / 100}px`,
            backgroundColor: canvasBgColor,
          }}
        >
          {/* Grid & Guide Overlay Pattern */}
          {gridType !== 'none' && (
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                mixBlendMode: canvasBgColor === '#0f172a' || canvasBgColor === '#1e3a8a' ? 'screen' : 'multiply',
              }}
            >
              {gridType === 'grid' && (
                <svg className="w-full h-full opacity-60">
                  <defs>
                    <pattern
                      id="paintGridPattern"
                      width={(gridSize * zoomLevel) / 100}
                      height={(gridSize * zoomLevel) / 100}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${(gridSize * zoomLevel) / 100} 0 L 0 0 0 ${(gridSize * zoomLevel) / 100}`}
                        fill="none"
                        stroke={gridColor}
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#paintGridPattern)" />
                </svg>
              )}

              {gridType === 'dots' && (
                <svg className="w-full h-full opacity-70">
                  <defs>
                    <pattern
                      id="paintDotsPattern"
                      width={(gridSize * zoomLevel) / 100}
                      height={(gridSize * zoomLevel) / 100}
                      patternUnits="userSpaceOnUse"
                    >
                      <circle
                        cx={((gridSize / 2) * zoomLevel) / 100}
                        cy={((gridSize / 2) * zoomLevel) / 100}
                        r={Math.max(1, (1.5 * zoomLevel) / 100)}
                        fill={gridColor}
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#paintDotsPattern)" />
                </svg>
              )}

              {gridType === 'blueprint' && (
                <svg className="w-full h-full">
                  <defs>
                    <pattern
                      id="paintBlueprintSubPattern"
                      width={(gridSize * zoomLevel) / 100}
                      height={(gridSize * zoomLevel) / 100}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${(gridSize * zoomLevel) / 100} 0 L 0 0 0 ${(gridSize * zoomLevel) / 100}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                    </pattern>
                    <pattern
                      id="paintBlueprintMajorPattern"
                      width={(gridSize * 4 * zoomLevel) / 100}
                      height={(gridSize * 4 * zoomLevel) / 100}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${(gridSize * 4 * zoomLevel) / 100} 0 L 0 0 0 ${(gridSize * 4 * zoomLevel) / 100}`}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="1.5"
                        opacity="0.8"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#paintBlueprintSubPattern)" />
                  <rect width="100%" height="100%" fill="url(#paintBlueprintMajorPattern)" />
                </svg>
              )}

              {gridType === 'ruled' && (
                <svg className="w-full h-full opacity-60">
                  <defs>
                    <pattern
                      id="paintRuledPattern"
                      width="100%"
                      height={(gridSize * zoomLevel) / 100}
                      patternUnits="userSpaceOnUse"
                    >
                      <line
                        x1="0"
                        y1={(gridSize * zoomLevel) / 100}
                        x2="100%"
                        y2={(gridSize * zoomLevel) / 100}
                        stroke={gridColor}
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#paintRuledPattern)" />
                </svg>
              )}

              {gridType === 'isometric' && (
                <svg className="w-full h-full opacity-50">
                  <defs>
                    <pattern
                      id="paintIsometricPattern"
                      width={(gridSize * 1.732 * zoomLevel) / 100}
                      height={(gridSize * zoomLevel) / 100}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M 0 ${(gridSize * zoomLevel) / 100} L ${(gridSize * 1.732 * zoomLevel) / 100} 0 M 0 0 L ${(gridSize * 1.732 * zoomLevel) / 100} ${(gridSize * zoomLevel) / 100} M 0 ${(gridSize * 0.5 * zoomLevel) / 100} L ${(gridSize * 1.732 * zoomLevel) / 100} ${(gridSize * 0.5 * zoomLevel) / 100}`}
                        fill="none"
                        stroke={gridColor}
                        strokeWidth="0.8"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#paintIsometricPattern)" />
                </svg>
              )}
            </div>
          )}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full block"
            style={{
              imageRendering: zoomLevel > 100 ? 'pixelated' : 'auto',
              cursor: getCanvasCursor(),
            }}
          />

          {/* Text Tool Overlay Input & Interactive Editor */}
          {textInput && textInput.active && (
            <div
              className="absolute z-30 flex flex-col gap-1 items-start"
              style={{
                left: `${(textInput.x * zoomLevel) / 100}px`,
                top: `${(textInput.y * zoomLevel) / 100}px`,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Floating Inline Text Toolbar */}
              <div className="bg-white/95 backdrop-blur-xs border border-slate-300 shadow-md rounded-lg p-1 flex items-center gap-1 z-40 text-xs font-bold whitespace-nowrap select-none">
                <button
                  onClick={() => setTextInput({ ...textInput, isBold: !textInput.isBold })}
                  className={`px-1.5 py-0.5 rounded font-extrabold cursor-pointer ${
                    textInput.isBold ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Toggle Bold"
                >
                  B
                </button>
                <button
                  onClick={() => setTextInput({ ...textInput, isItalic: !textInput.isItalic })}
                  className={`px-1.5 py-0.5 rounded italic font-extrabold cursor-pointer ${
                    textInput.isItalic ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Toggle Italic"
                >
                  I
                </button>
                <select
                  value={textInput.fontSize}
                  onChange={(e) => setTextInput({ ...textInput, fontSize: Number(e.target.value) })}
                  className="bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-[10px] font-bold cursor-pointer"
                >
                  {[12, 14, 16, 20, 24, 28, 32, 40, 48, 64, 72].map((s) => (
                    <option key={s} value={s}>{s}px</option>
                  ))}
                </select>
                <select
                  value={textInput.fontFamily || 'sans-serif'}
                  onChange={(e) => setTextInput({ ...textInput, fontFamily: e.target.value })}
                  className="bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-[10px] font-bold cursor-pointer"
                >
                  <option value="sans-serif">Sans-Serif</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Monospace</option>
                  <option value="cursive">Cursive</option>
                  <option value="Impact">Impact</option>
                </select>
                <button
                  onClick={() => handleCommitText()}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Commit Text to Canvas"
                >
                  <Check size={12} /> Apply
                </button>
                <button
                  onClick={() => setTextInput(null)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>

              <textarea
                autoFocus
                value={textInput.text}
                onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setTextInput(null);
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommitText();
                }}
                placeholder="Type text here..."
                rows={Math.max(2, textInput.text.split('\n').length)}
                className="bg-white/90 border-2 border-dashed border-blue-500 p-2 focus:outline-none shadow-lg rounded-lg resize font-sans min-w-[200px]"
                style={{
                  color: color1,
                  fontSize: `${(textInput.fontSize * zoomLevel) / 100}px`,
                  fontWeight: textInput.isBold ? 'bold' : 'normal',
                  fontStyle: textInput.isItalic ? 'italic' : 'normal',
                  fontFamily: textInput.fontFamily || 'sans-serif',
                  lineHeight: 1.25,
                }}
              />
            </div>
          )}

          {/* Floating Selection Box for Pasted Image */}
          {floatingSelection && (
            <div
              onMouseDown={(e) => handleFloatingMouseDown(e)}
              className="absolute border-2 border-dashed border-blue-600 bg-blue-500/10 cursor-move z-40 select-none"
              style={{
                left: `${(floatingSelection.x * zoomLevel) / 100}px`,
                top: `${(floatingSelection.y * zoomLevel) / 100}px`,
                width: `${(floatingSelection.w * zoomLevel) / 100}px`,
                height: `${(floatingSelection.h * zoomLevel) / 100}px`,
              }}
            >
              {/* Render Image inside selection */}
              <img
                src={floatingSelection.img.src}
                alt="Pasted"
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Commit / Stamp Button Overlay */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  commitFloatingSelection();
                }}
                className="absolute -top-7 right-0 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded shadow-md cursor-pointer flex items-center gap-1"
              >
                <Check size={12} /> Stamp
              </button>

              {/* Corner & Edge Handles (8 Direction Resizing) */}
              {[
                { h: 'nw', pos: '-left-1.5 -top-1.5', cursor: 'cursor-nwse-resize' },
                { h: 'n', pos: 'left-1/2 -top-1.5 -translate-x-1/2', cursor: 'cursor-ns-resize' },
                { h: 'ne', pos: '-right-1.5 -top-1.5', cursor: 'cursor-nesw-resize' },
                { h: 'e', pos: '-right-1.5 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
                { h: 'se', pos: '-right-1.5 -bottom-1.5', cursor: 'cursor-nwse-resize' },
                { h: 's', pos: 'left-1/2 -bottom-1.5 -translate-x-1/2', cursor: 'cursor-ns-resize' },
                { h: 'sw', pos: '-left-1.5 -bottom-1.5', cursor: 'cursor-nesw-resize' },
                { h: 'w', pos: '-left-1.5 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
              ].map((item) => (
                <div
                  key={item.h}
                  onMouseDown={(e) => handleFloatingMouseDown(e, item.h)}
                  className={`absolute w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full z-50 hover:scale-125 transition-transform ${item.pos} ${item.cursor}`}
                />
              ))}
            </div>
          )}

          {/* Sticky Notes Overlay */}
          {stickyNotes.map((note) => (
            <div
              key={note.id}
              className="absolute z-25 p-2.5 rounded-xl shadow-lg border border-amber-300/60 flex flex-col gap-1 transition-shadow hover:shadow-xl group"
              style={{
                left: `${(note.x * zoomLevel) / 100}px`,
                top: `${(note.y * zoomLevel) / 100}px`,
                width: `${(note.w * zoomLevel) / 100}px`,
                height: `${(note.h * zoomLevel) / 100}px`,
                backgroundColor: note.color,
              }}
            >
              <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-700/80 cursor-move border-b border-black/10 pb-1">
                <span>{note.author} • {note.createdAt}</span>
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setStickyNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, color: c } : n)))}
                      className="w-2.5 h-2.5 rounded-full border border-black/20 cursor-pointer"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <button
                    onClick={() => setStickyNotes((prev) => prev.filter((n) => n.id !== note.id))}
                    className="p-0.5 hover:text-rose-600 rounded cursor-pointer ml-1"
                    title="Delete Sticky Note"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              <textarea
                value={note.text}
                onChange={(e) => {
                  const txt = e.target.value;
                  setStickyNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, text: txt } : n)));
                }}
                className="w-full h-full bg-transparent resize-none focus:outline-none text-slate-900 font-sans text-xs font-semibold leading-snug"
                placeholder="Type sticky note details..."
              />
            </div>
          ))}

          {/* Comment Pins Overlay */}
          {showCommentsOnCanvas &&
            comments.map((comment) => (
              <div
                key={comment.id}
                onClick={() => {
                  setActiveCommentId(comment.id);
                  setShowCommentsSidebar(true);
                }}
                className={`absolute z-30 cursor-pointer group flex items-center gap-1 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 ${
                  comment.resolved ? 'opacity-60' : ''
                }`}
                style={{
                  left: `${(comment.x * zoomLevel) / 100}px`,
                  top: `${(comment.y * zoomLevel) / 100}px`,
                }}
              >
                <div
                  className={`w-7 h-7 rounded-full text-white font-extrabold text-xs flex items-center justify-center shadow-md ring-2 ring-white ${
                    activeCommentId === comment.id ? 'scale-115 ring-blue-500' : ''
                  }`}
                  style={{ backgroundColor: comment.avatarColor }}
                >
                  💬
                </div>
                <div className="hidden group-hover:flex flex-col bg-slate-900/90 text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow-xl whitespace-nowrap z-40 max-w-[180px] truncate">
                  <span>
                    {comment.author}: {comment.text}
                  </span>
                </div>
              </div>
            ))}

          {/* Live Peer Cursors Overlay */}
          {isCollabActive &&
            peerCursors.map((peer) => (
              <div
                key={peer.id}
                className="absolute pointer-events-none z-30 transition-all duration-300 ease-out flex items-start gap-1"
                style={{
                  left: `${(peer.x * zoomLevel) / 100}px`,
                  top: `${(peer.y * zoomLevel) / 100}px`,
                }}
              >
                <MousePointer
                  size={16}
                  className="rotate-[-20deg] drop-shadow-md"
                  style={{ color: peer.color, fill: peer.color }}
                />
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold text-white shadow-md whitespace-nowrap"
                  style={{ backgroundColor: peer.color }}
                >
                  {peer.name}
                </span>
              </div>
            ))}

          {/* ================= CANVAS FRAME RESIZE HANDLES (Windows Paint) ================= */}
          {/* Right Handle */}
          <div
            onMouseDown={(e) => handleFrameResizeStart('right', e)}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-slate-500 rounded-xs hover:bg-blue-500 cursor-ew-resize z-30 shadow-xs"
            title="Drag to resize canvas width"
          />

          {/* Bottom Handle */}
          <div
            onMouseDown={(e) => handleFrameResizeStart('bottom', e)}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border border-slate-500 rounded-xs hover:bg-blue-500 cursor-ns-resize z-30 shadow-xs"
            title="Drag to resize canvas height"
          />

          {/* Bottom-Right Handle */}
          <div
            onMouseDown={(e) => handleFrameResizeStart('corner', e)}
            className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-white border border-slate-500 rounded-xs hover:bg-blue-500 cursor-nwse-resize z-30 shadow-xs"
            title="Drag to resize canvas frame"
          />
        </div>
      </div>

      {/* ================= WHITEBOARD COMMENTS SIDEBAR DRAWER ================= */}
      {showCommentsSidebar && (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-30 shadow-xl font-sans text-slate-800">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquarePlus size={16} className="text-blue-600" />
              <span className="font-extrabold text-xs text-slate-800">Canvas Feedback Comments</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCommentsOnCanvas(!showCommentsOnCanvas)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500"
                title={showCommentsOnCanvas ? 'Hide Pins on Canvas' : 'Show Pins on Canvas'}
              >
                {showCommentsOnCanvas ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => setShowCommentsSidebar(false)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                No comment pins yet.<br />Select <span className="text-blue-600 font-bold">Comment Tool</span> from left sidebar and click on canvas to leave feedback!
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveCommentId(c.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    activeCommentId === c.id
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center"
                        style={{ backgroundColor: c.avatarColor }}
                      >
                        {c.author.charAt(0)}
                      </div>
                      <span className="font-bold text-xs text-slate-800">{c.author}</span>
                      <span className="text-[10px] text-slate-400">• {c.createdAt}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setComments((prev) => prev.filter((item) => item.id !== c.id));
                      }}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{c.text}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setComments((prev) =>
                          prev.map((item) => (item.id === c.id ? { ...item, resolved: !item.resolved } : item))
                        );
                      }}
                      className={`font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        c.resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      <Check size={11} /> {c.resolved ? 'Resolved' : 'Mark Resolved'}
                    </button>
                    <span className="text-slate-400 font-mono">Pin ({c.x}, {c.y})</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={newCommentInput}
              onChange={(e) => setNewCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCommentInput.trim()) {
                  const newC: CommentPinItem = {
                    id: 'comment_' + Date.now(),
                    x: Math.round(canvasWidth / 2),
                    y: Math.round(canvasHeight / 2),
                    author: 'You',
                    text: newCommentInput.trim(),
                    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    resolved: false,
                    avatarColor: '#3b82f6',
                  };
                  setComments((prev) => [...prev, newC]);
                  setActiveCommentId(newC.id);
                  setNewCommentInput('');
                }
              }}
              placeholder="Type feedback or question..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (!newCommentInput.trim()) return;
                const newC: CommentPinItem = {
                  id: 'comment_' + Date.now(),
                  x: Math.round(canvasWidth / 2),
                  y: Math.round(canvasHeight / 2),
                  author: 'You',
                  text: newCommentInput.trim(),
                  createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  resolved: false,
                  avatarColor: '#3b82f6',
                };
                setComments((prev) => [...prev, newC]);
                setActiveCommentId(newC.id);
                setNewCommentInput('');
              }}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>

      {/* ================= 3. WINDOWS PAINT STATUS BAR ================= */}
      <div className="h-6 px-4 bg-[#f3f6fb] border-t border-slate-300 flex items-center justify-between text-[11px] font-semibold text-slate-600 shrink-0 z-20 select-none">
        <div className="flex items-center gap-6">
          <span>
            Mouse: {mousePos ? `${mousePos.x}, ${mousePos.y}px` : '---, ---'}
          </span>
          <span className="flex items-center gap-1 font-bold text-slate-800">
            <Maximize2 size={12} className="text-slate-400" /> Canvas: {canvasWidth} × {canvasHeight}px
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
            className="p-0.5 hover:bg-slate-200 rounded cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="w-10 text-center font-mono font-bold text-slate-800">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(400, z + 25))}
            className="p-0.5 hover:bg-slate-200 rounded cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* ================= MODAL: BACKGROUND & GRID OPTIONS ================= */}
      {showBackgroundModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Grid size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Canvas Background & Grid</h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    Customize background fill, graph grids, and guide patterns
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBackgroundModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar text-xs">
              {/* Section 1: Background Fill Color */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                    <Palette size={14} className="text-blue-600" /> Canvas Background Color
                  </label>
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">{canvasBgColor}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { name: 'Pure White', color: '#ffffff' },
                    { name: 'Off-White', color: '#f8fafc' },
                    { name: 'Dark Slate', color: '#0f172a' },
                    { name: 'Blueprint Blue', color: '#1e3a8a' },
                    { name: 'Parchment', color: '#fef3c7' },
                    { name: 'Soft Mint', color: '#f0fdf4' },
                    { name: 'Soft Rose', color: '#fff1f2' },
                    { name: 'Light Gray', color: '#e2e8f0' },
                  ].map((preset) => {
                    const active = canvasBgColor.toLowerCase() === preset.color.toLowerCase();
                    return (
                      <button
                        key={preset.color}
                        onClick={() => setCanvasBgColor(preset.color)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer transition-all ${
                          active
                            ? 'border-blue-600 bg-blue-50/80 text-blue-700 shadow-xs ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: preset.color }}
                        >
                          {active && (
                            <Check
                              size={11}
                              className={
                                preset.color === '#0f172a' || preset.color === '#1e3a8a'
                                  ? 'text-white'
                                  : 'text-slate-800'
                              }
                            />
                          )}
                        </div>
                        <span className="truncate max-w-full">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                    <span className="font-bold text-slate-600 text-[11px]">Custom Hex:</span>
                    <input
                      type="color"
                      value={canvasBgColor.startsWith('#') ? canvasBgColor : '#ffffff'}
                      onChange={(e) => setCanvasBgColor(e.target.value)}
                      className="w-6 h-6 rounded-md cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={canvasBgColor}
                      onChange={(e) => setCanvasBgColor(e.target.value)}
                      className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>

                  <button
                    onClick={() => handleFillCanvasBackground(canvasBgColor)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl border border-slate-200 cursor-pointer transition-colors shadow-2xs"
                    title="Apply background color to canvas pixel data"
                  >
                    Fill Canvas Pixels
                  </button>
                </div>
              </div>

              {/* Section 2: Grid & Guide Pattern Type */}
              <div>
                <label className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5 mb-2">
                  <Layout size={14} className="text-blue-600" /> Grid / Guide Type
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'none', label: 'Solid Blank', desc: 'No background grid' },
                    { id: 'grid', label: 'Square Grid', desc: 'Graph paper style' },
                    { id: 'dots', label: 'Dot Matrix', desc: 'Bullet journal style' },
                    { id: 'blueprint', label: 'CAD Blueprint', desc: 'Engineering grid' },
                    { id: 'ruled', label: 'Ruled Lines', desc: 'Notebook line guide' },
                    { id: 'isometric', label: 'Isometric 3D', desc: 'Spatial 3D grid' },
                  ].map((gt) => {
                    const active = gridType === gt.id;
                    return (
                      <button
                        key={gt.id}
                        onClick={() => setGridType(gt.id as any)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                          active
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-xs">{gt.label}</span>
                          {active && <Check size={14} className="text-blue-600" />}
                        </div>
                        <span className="text-[10px] text-slate-500 leading-tight font-medium">{gt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Fine-Tuning Grid Controls */}
              {gridType !== 'none' && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-[11px]">Grid Step Size: {gridSize}px</label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={gridSize}
                      onChange={(e) => setGridSize(Number(e.target.value))}
                      className="w-36 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-[11px]">Grid Line Color:</label>
                    <div className="flex items-center gap-1.5">
                      {['#cbd5e1', '#94a3b8', '#64748b', '#3b82f6', '#10b981', '#0f172a'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setGridColor(c)}
                          className={`w-5 h-5 rounded-full border border-slate-300 cursor-pointer transition-transform ${
                            gridColor === c ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={gridColor}
                        onChange={(e) => setGridColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Include grid lines in saved image?
                    </span>
                    <button
                      onClick={handleBakeGridToCanvas}
                      className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-[10px] cursor-pointer shadow-2xs"
                    >
                      Bake Grid to Canvas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Guides scale seamlessly with zoom
              </span>
              <button
                onClick={() => setShowBackgroundModal(false)}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESIZE & SKEW ================= */}
      {showResizeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Maximize2 size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Resize & Skew Canvas</h3>
                  <p className="text-[11px] font-medium text-slate-500">Adjust canvas width and height</p>
                </div>
              </div>
              <button
                onClick={() => setShowResizeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Mode selection */}
              <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="resizemode"
                    checked={resizeMode === 'pixels'}
                    onChange={() => setResizeMode('pixels')}
                    className="accent-blue-600 cursor-pointer"
                  />
                  Pixels
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="resizemode"
                    checked={resizeMode === 'percent'}
                    onChange={() => setResizeMode('percent')}
                    className="accent-blue-600 cursor-pointer"
                  />
                  Percentage
                </label>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Horizontal ({resizeMode === 'pixels' ? 'px' : '%'})
                  </label>
                  <input
                    type="number"
                    value={resizeWInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setResizeWInput(val);
                      if (lockAspectRatio && val) {
                        const ratio = canvasHeight / canvasWidth;
                        setResizeHInput(String(Math.round(Number(val) * ratio)));
                      }
                    }}
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Vertical ({resizeMode === 'pixels' ? 'px' : '%'})
                  </label>
                  <input
                    type="number"
                    value={resizeHInput}
                    onChange={(e) => setResizeHInput(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockAspectRatio}
                  onChange={(e) => setLockAspectRatio(e.target.checked)}
                  className="accent-blue-600 cursor-pointer"
                />
                Maintain aspect ratio
              </label>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResizeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyResizeModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer transition-colors"
              >
                Apply Resize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Keyboard size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Keyboard Shortcuts</h3>
                  <p className="text-[11px] font-medium text-slate-500">Paint Studio hotkey reference</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-xs">
              {/* History & Canvas Controls */}
              <div>
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">History & Actions</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Undo Action</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800 shadow-2xs">Ctrl + Z</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Redo Action</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800 shadow-2xs">Ctrl + Y / Ctrl + Shift + Z</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Save Artwork</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800 shadow-2xs">Ctrl + S</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Paste Image</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800 shadow-2xs">Ctrl + V</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Delete Selection / Cancel</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800 shadow-2xs">Delete / Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Tool Selection Hotkeys */}
              <div>
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">Tool Hotkeys</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Pencil</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800">P</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Brush</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800">B</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Eraser</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800">E</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Fill Bucket</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800">F / G</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Text Tool</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800">T</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Eyedropper</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800">I</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Select Region</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800">V</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Magnifier</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800">M</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
