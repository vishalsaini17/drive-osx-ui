import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  Pencil, PaintBucket, Type, Eraser, Pipette, Brush, Square, Circle, Minus,
  Triangle, Star, Heart, MessageSquare, ArrowRight, Database, Workflow, Box,
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Copy, Clipboard, Download,
  Undo2, Redo2, X, MousePointer2, ZoomIn, ZoomOut, Keyboard, Grid,
  PenTool, Highlighter, Trash2, Eye, EyeOff, Send, MessageCircle,
  FileDown, Hand, Group, Ungroup, AlignHorizontalJustifyStart, AlignVerticalJustifyStart,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyEnd, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  BringToFront, SendToBack, Spline, Share2, Magnet, Hexagon, FileText,
  Slash, MoveRight, Save,
} from 'lucide-react';
import WindowStatus from '../../shell/window-manager/WindowStatusContext';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';
import { useSystemStore } from '../../shell/state/systemStore';
import DiagramLayer from './components/DiagramLayer';
import {
  DEFAULT_EDGE_STYLE, DEFAULT_NODE_STYLE, DiagramEdge, DiagramNode, DiagramObject,
  DocumentSnapshot, EdgeRouting, FLOWCHART_PRESETS, NodeShape, Point, Rect,
  isEdge, isNode, ArrowHead, StrokeDash, AnchorSide,
} from './types';
import {
  AlignMode, ResizeHandle, alignNodes, applyResize, bestAnchor, boundsOf,
  cloneObjects, distributeNodes, duplicateObjects, expandGroups, hitTest, makeId,
  normalizeRect, objectsInRect, resolveEndpoint, snap,
} from './utils/diagram';

type RasterTool = 'pen' | 'pencil' | 'marker' | 'brush' | 'eraser' | 'fill' | 'picker';
type DiagramTool = 'select' | 'connector' | 'shape' | 'text' | 'pan';
type Tool = RasterTool | DiagramTool;

const RASTER_TOOLS: Tool[] = ['pen', 'pencil', 'marker', 'brush', 'eraser', 'fill', 'picker'];
const isRasterTool = (tool: Tool): tool is RasterTool => RASTER_TOOLS.includes(tool);

type BrushStyle = 'standard' | 'airbrush' | 'calligraphy' | 'crayon' | 'watercolor';

/** Full-canvas bitmaps are large, so only the newest few are retained. */
const MAX_RASTER_SNAPSHOTS = 12;

interface Comment {
  id: string;
  x: number;
  y: number;
  author: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  access: 'view' | 'edit';
  sharedAt: string;
}

interface Interaction {
  type: 'move' | 'resize' | 'marquee' | 'connect' | 'pan';
  startCanvas: Point;
  startClient: Point;
  handle?: ResizeHandle;
  originObjects?: DiagramObject[];
  connectFrom?: { nodeId: string; anchor: AnchorSide };
  additive?: boolean;
  startScroll?: { left: number; top: number };
}

const PALETTE = [
  '#000000', '#475569', '#94a3b8', '#ffffff', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#d946ef', '#ec4899', '#78350f', '#1e293b', '#dcfce7',
  '#dbeafe', '#fef9c3',
];

const SHAPE_PALETTE: { shape: NodeShape; label: string; icon: React.ComponentType<any> }[] = [
  { shape: 'rectangle', label: 'Rectangle', icon: Square },
  { shape: 'rounded-rect', label: 'Rounded rectangle', icon: Square },
  { shape: 'ellipse', label: 'Ellipse', icon: Circle },
  { shape: 'diamond', label: 'Decision', icon: Diamond },
  { shape: 'parallelogram', label: 'Data', icon: Slash },
  { shape: 'capsule', label: 'Terminal', icon: Box },
  { shape: 'hexagon', label: 'Preparation', icon: Hexagon },
  { shape: 'cylinder', label: 'Database', icon: Database },
  { shape: 'document', label: 'Document', icon: FileText },
  { shape: 'triangle', label: 'Triangle', icon: Triangle },
  { shape: 'star', label: 'Star', icon: Star },
  { shape: 'heart', label: 'Heart', icon: Heart },
  { shape: 'speech-bubble', label: 'Callout', icon: MessageSquare },
  { shape: 'text', label: 'Text label', icon: Type },
];

/** lucide has no Diamond export in this version; draw one from a square. */
function Diamond({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinejoin="round" className={className}>
      <path d="M12 3 L21 12 L12 21 L3 12 Z" />
    </svg>
  );
}

export default function PaintApp({ windowId = 'paint' }: { windowId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);

  const setFiles = useSystemStore((state) => state.setFiles);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);
  const currentUser = useSystemStore((state) => state.currentUser);
  const userName = currentUser?.fullName || 'You';

  // -------------------------------------------------------------------------
  // Document
  // -------------------------------------------------------------------------
  const [documentName, setDocumentName] = useState('Untitled diagram');
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [objects, setObjects] = useState<DiagramObject[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Collaboration is real state: nobody is listed until the document is
  // actually shared, and comments start empty rather than pre-seeded.
  const [sharedWith, setSharedWith] = useState<Collaborator[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareNameInput, setShareNameInput] = useState('');
  const [shareEmailInput, setShareEmailInput] = useState('');
  const [shareAccess, setShareAccess] = useState<'view' | 'edit'>('edit');
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showCommentPins, setShowCommentPins] = useState(true);
  const [commentDraft, setCommentDraft] = useState('');
  const [pendingCommentPoint, setPendingCommentPoint] = useState<Point | null>(null);

  // -------------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------------
  const [tool, setTool] = useState<Tool>('select');
  const [shapeToPlace, setShapeToPlace] = useState<NodeShape>('rectangle');
  const [brushStyle, setBrushStyle] = useState<BrushStyle>('standard');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [primaryColor, setPrimaryColor] = useState('#1e293b');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

  const [nodeStyle, setNodeStyle] = useState({ ...DEFAULT_NODE_STYLE });
  const [edgeStyle, setEdgeStyle] = useState({ ...DEFAULT_EDGE_STYLE });

  // -------------------------------------------------------------------------
  // View
  // -------------------------------------------------------------------------
  const [zoom, setZoom] = useState(100);
  const scale = zoom / 100;
  const [gridType, setGridType] = useState<'none' | 'grid' | 'dots'>('grid');
  const [gridSize, setGridSize] = useState(20);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [canvasBg, setCanvasBg] = useState('#ffffff');

  // -------------------------------------------------------------------------
  // Selection and interaction
  // -------------------------------------------------------------------------
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [pendingEdge, setPendingEdge] = useState<{ from: Point; to: Point } | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const interactionRef = useRef<Interaction | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  // Canvas frame resizing (drag the right edge, bottom edge or corner)
  const [frameDrag, setFrameDrag] = useState<
    { edge: 'right' | 'bottom' | 'corner'; startX: number; startY: number; startW: number; startH: number } | null
  >(null);
  const [pendingSize, setPendingSize] = useState<{ w: number; h: number } | null>(null);

  // Raster drawing
  const [isDrawing, setIsDrawing] = useState(false);
  const rasterSnapshotRef = useRef<ImageData | null>(null);

  const [clipboard, setClipboard] = useState<DiagramObject[]>([]);

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------
  const [past, setPast] = useState<DocumentSnapshot[]>([]);
  const [future, setFuture] = useState<DocumentSnapshot[]>([]);
  const [lastAction, setLastAction] = useState('New document');

  const captureRaster = useCallback((): ImageData | null => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  /**
   * Pushes an undo step. `includeRaster` is false for diagram-only edits so
   * history does not carry a full bitmap for every node nudge.
   */
  const pushHistory = useCallback(
    (label: string, includeRaster: boolean) => {
      setPast((prev) => {
        const snapshot: DocumentSnapshot = {
          raster: includeRaster ? captureRaster() : null,
          objects: cloneObjects(objects),
          canvasWidth,
          canvasHeight,
          label,
        };
        let next = [...prev, snapshot];
        if (next.length > 60) next = next.slice(next.length - 60);
        // Bitmaps dominate memory, so keep only the most recent few. Older
        // steps stay in history but lose their raster, and restoring one of
        // them leaves the pixels as they are rather than reverting them.
        const rasterIndexes = next.reduce<number[]>(
          (acc, entry, index) => (entry.raster ? [...acc, index] : acc),
          []
        );
        if (rasterIndexes.length > MAX_RASTER_SNAPSHOTS) {
          const drop = new Set(rasterIndexes.slice(0, rasterIndexes.length - MAX_RASTER_SNAPSHOTS));
          next = next.map((entry, index) => (drop.has(index) ? { ...entry, raster: null } : entry));
        }
        return next;
      });
      setFuture([]);
      setLastAction(label);
      setIsDirty(true);
    },
    [objects, canvasWidth, canvasHeight, captureRaster]
  );

  const restoreSnapshot = useCallback((snapshot: DocumentSnapshot) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    setObjects(snapshot.objects);
    setCanvasWidth(snapshot.canvasWidth);
    setCanvasHeight(snapshot.canvasHeight);

    if (snapshot.raster && canvas && ctx) {
      if (canvas.width !== snapshot.raster.width || canvas.height !== snapshot.raster.height) {
        canvas.width = snapshot.raster.width;
        canvas.height = snapshot.raster.height;
      }
      ctx.putImageData(snapshot.raster, 0, 0);
    }
    setSelectedIds([]);
  }, []);

  const undo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      setFuture((f) => [
        {
          raster: entry.raster ? captureRaster() : null,
          objects: cloneObjects(objects),
          canvasWidth,
          canvasHeight,
          label: entry.label,
        },
        ...f,
      ]);
      restoreSnapshot(entry);
      setLastAction(`Undo: ${entry.label}`);
      return prev.slice(0, -1);
    });
  }, [objects, canvasWidth, canvasHeight, captureRaster, restoreSnapshot]);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const entry = prev[0];
      setPast((p) => [
        ...p,
        {
          raster: entry.raster ? captureRaster() : null,
          objects: cloneObjects(objects),
          canvasWidth,
          canvasHeight,
          label: entry.label,
        },
      ]);
      restoreSnapshot(entry);
      setLastAction(`Redo: ${entry.label}`);
      return prev.slice(1);
    });
  }, [objects, canvasWidth, canvasHeight, captureRaster, restoreSnapshot]);

  // -------------------------------------------------------------------------
  // Canvas setup
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Intentionally runs once: later size changes go through resizeCanvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resizeCanvas = useCallback(
    (width: number, height: number, label = 'Resize canvas') => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      pushHistory(label, true);

      const buffer = document.createElement('canvas');
      buffer.width = canvas.width;
      buffer.height = canvas.height;
      buffer.getContext('2d')?.drawImage(canvas, 0, 0);

      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = canvasBg;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(buffer, 0, 0);

      setCanvasWidth(width);
      setCanvasHeight(height);
    },
    [pushHistory, canvasBg]
  );

  // Text drafts for the size fields, so typing is not fought by clamping.
  const [sizeDraft, setSizeDraft] = useState({ w: String(canvasWidth), h: String(canvasHeight) });
  useEffect(() => {
    setSizeDraft({ w: String(canvasWidth), h: String(canvasHeight) });
  }, [canvasWidth, canvasHeight]);

  const commitSizeDraft = useCallback(() => {
    const width = Math.round(Number(sizeDraft.w));
    const height = Math.round(Number(sizeDraft.h));
    const nextW = Number.isFinite(width) && width >= 50 ? Math.min(8000, width) : canvasWidth;
    const nextH = Number.isFinite(height) && height >= 50 ? Math.min(8000, height) : canvasHeight;
    if (nextW === canvasWidth && nextH === canvasHeight) {
      setSizeDraft({ w: String(canvasWidth), h: String(canvasHeight) });
      return;
    }
    resizeCanvas(nextW, nextH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeDraft, canvasWidth, canvasHeight, resizeCanvas]);

  // Live frame drag. Tracked on the window so the pointer may leave the handle.
  useEffect(() => {
    if (!frameDrag) return;

    const onMove = (event: PointerEvent) => {
      const dx = (event.clientX - frameDrag.startX) / scale;
      const dy = (event.clientY - frameDrag.startY) / scale;
      setPendingSize({
        w: frameDrag.edge === 'bottom' ? frameDrag.startW : Math.max(50, Math.round(frameDrag.startW + dx)),
        h: frameDrag.edge === 'right' ? frameDrag.startH : Math.max(50, Math.round(frameDrag.startH + dy)),
      });
    };

    const onUp = () => {
      setFrameDrag(null);
      setPendingSize((pending) => {
        if (pending && (pending.w !== canvasWidth || pending.h !== canvasHeight)) {
          resizeCanvas(pending.w, pending.h);
        }
        return null;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [frameDrag, scale, canvasWidth, canvasHeight, resizeCanvas]);

  const startFrameDrag = (edge: 'right' | 'bottom' | 'corner') => (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setFrameDrag({
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startW: canvasWidth,
      startH: canvasHeight,
    });
    setPendingSize({ w: canvasWidth, h: canvasHeight });
  };

  // -------------------------------------------------------------------------
  // Coordinate conversion
  // -------------------------------------------------------------------------
  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const stage = stageRef.current;
      if (!stage) return { x: 0, y: 0 };
      const rect = stage.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  // -------------------------------------------------------------------------
  // Selection helpers
  // -------------------------------------------------------------------------
  const selectedObjects = useMemo(
    () => objects.filter((object) => selectedIds.includes(object.id)),
    [objects, selectedIds]
  );
  const selectedNodes = useMemo(() => selectedObjects.filter(isNode), [selectedObjects]);
  const selectedEdges = useMemo(() => selectedObjects.filter(isEdge), [selectedObjects]);

  const updateObjects = useCallback(
    (label: string, updater: (objects: DiagramObject[]) => DiagramObject[]) => {
      pushHistory(label, false);
      setObjects((prev) => updater(prev));
    },
    [pushHistory]
  );

  const patchSelectedNodes = useCallback(
    (label: string, patch: Partial<DiagramNode> | ((node: DiagramNode) => Partial<DiagramNode>)) => {
      if (selectedNodes.length === 0) return;
      updateObjects(label, (prev) =>
        prev.map((object) => {
          if (!isNode(object) || !selectedIds.includes(object.id)) return object;
          const value = typeof patch === 'function' ? patch(object) : patch;
          return { ...object, ...value };
        })
      );
    },
    [selectedNodes.length, selectedIds, updateObjects]
  );

  const patchSelectedNodeStyle = useCallback(
    (label: string, patch: Partial<DiagramNode['style']>) => {
      setNodeStyle((prev) => ({ ...prev, ...patch }));
      if (selectedNodes.length === 0) return;
      updateObjects(label, (prev) =>
        prev.map((object) =>
          isNode(object) && selectedIds.includes(object.id)
            ? { ...object, style: { ...object.style, ...patch } }
            : object
        )
      );
    },
    [selectedNodes.length, selectedIds, updateObjects]
  );

  const patchSelectedEdgeStyle = useCallback(
    (label: string, patch: Partial<DiagramEdge['style']>) => {
      setEdgeStyle((prev) => ({ ...prev, ...patch }));
      if (selectedEdges.length === 0) return;
      updateObjects(label, (prev) =>
        prev.map((object) =>
          isEdge(object) && selectedIds.includes(object.id)
            ? { ...object, style: { ...object.style, ...patch } }
            : object
        )
      );
    },
    [selectedEdges.length, selectedIds, updateObjects]
  );

  // -------------------------------------------------------------------------
  // Object creation
  // -------------------------------------------------------------------------
  const addNode = useCallback(
    (shape: NodeShape, at: Point, size?: { w: number; h: number }, text = '', fill?: string) => {
      const w = size?.w ?? (shape === 'text' ? 120 : 150);
      const h = size?.h ?? (shape === 'text' ? 40 : 70);
      const node: DiagramNode = {
        id: makeId('node'),
        kind: 'node',
        shape,
        x: snap(at.x - w / 2, gridSize, snapToGrid),
        y: snap(at.y - h / 2, gridSize, snapToGrid),
        w,
        h,
        rotation: 0,
        text,
        style: { ...nodeStyle, ...(fill ? { fill } : {}) },
      };
      updateObjects(`Add ${shape}`, (prev) => [...prev, node]);
      setSelectedIds([node.id]);
      return node;
    },
    [nodeStyle, gridSize, snapToGrid, updateObjects]
  );

  const deleteSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const ids = new Set(expandGroups(selectedIds, objects));
    updateObjects(`Delete ${ids.size} object${ids.size > 1 ? 's' : ''}`, (prev) =>
      prev.filter((object) => {
        if (ids.has(object.id)) return false;
        // Drop edges whose endpoint node is going away.
        if (isEdge(object)) {
          if ('nodeId' in object.from && ids.has(object.from.nodeId)) return false;
          if ('nodeId' in object.to && ids.has(object.to.nodeId)) return false;
        }
        return true;
      })
    );
    setSelectedIds([]);
  }, [selectedIds, objects, updateObjects]);

  const copySelection = useCallback(
    (cut: boolean) => {
      if (selectedIds.length === 0) return;
      const ids = expandGroups(selectedIds, objects);
      setClipboard(cloneObjects(objects.filter((o) => ids.includes(o.id))));
      setLastAction(cut ? 'Cut objects' : 'Copied objects');
      if (cut) deleteSelection();
    },
    [selectedIds, objects, deleteSelection]
  );

  const pasteClipboard = useCallback(() => {
    if (clipboard.length === 0) return;
    const copies = duplicateObjects(clipboard, 24);
    updateObjects(`Paste ${copies.length} object${copies.length > 1 ? 's' : ''}`, (prev) => [...prev, ...copies]);
    setSelectedIds(copies.map((o) => o.id));
  }, [clipboard, updateObjects]);

  const duplicateSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const ids = expandGroups(selectedIds, objects);
    const copies = duplicateObjects(objects.filter((o) => ids.includes(o.id)), 24);
    updateObjects('Duplicate', (prev) => [...prev, ...copies]);
    setSelectedIds(copies.map((o) => o.id));
  }, [selectedIds, objects, updateObjects]);

  // -------------------------------------------------------------------------
  // Grouping, ordering, alignment
  // -------------------------------------------------------------------------
  const groupSelection = useCallback(() => {
    if (selectedIds.length < 2) return;
    const groupId = makeId('group');
    updateObjects('Group', (prev) =>
      prev.map((object) => (selectedIds.includes(object.id) ? { ...object, groupId } : object))
    );
  }, [selectedIds, updateObjects]);

  const ungroupSelection = useCallback(() => {
    const ids = expandGroups(selectedIds, objects);
    if (ids.length === 0) return;
    updateObjects('Ungroup', (prev) =>
      prev.map((object) => (ids.includes(object.id) ? { ...object, groupId: undefined } : object))
    );
    setSelectedIds(ids);
  }, [selectedIds, objects, updateObjects]);

  const reorderSelection = useCallback(
    (direction: 'front' | 'back') => {
      if (selectedIds.length === 0) return;
      const ids = expandGroups(selectedIds, objects);
      updateObjects(direction === 'front' ? 'Bring to front' : 'Send to back', (prev) => {
        const moving = prev.filter((o) => ids.includes(o.id));
        const rest = prev.filter((o) => !ids.includes(o.id));
        return direction === 'front' ? [...rest, ...moving] : [...moving, ...rest];
      });
    },
    [selectedIds, objects, updateObjects]
  );

  const applyAlign = useCallback(
    (mode: AlignMode) => {
      if (selectedNodes.length < 2) return;
      const aligned = alignNodes(selectedNodes, mode);
      const byId = new Map(aligned.map((n) => [n.id, n]));
      updateObjects(`Align ${mode}`, (prev) =>
        prev.map((object) => (isNode(object) && byId.has(object.id) ? byId.get(object.id)! : object))
      );
    },
    [selectedNodes, updateObjects]
  );

  const applyDistribute = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (selectedNodes.length < 3) return;
      const spread = distributeNodes(selectedNodes, axis);
      const byId = new Map(spread.map((n) => [n.id, n]));
      updateObjects(`Distribute ${axis}`, (prev) =>
        prev.map((object) => (isNode(object) && byId.has(object.id) ? byId.get(object.id)! : object))
      );
    },
    [selectedNodes, updateObjects]
  );

  // -------------------------------------------------------------------------
  // Raster drawing
  // -------------------------------------------------------------------------
  const configureStroke = (ctx: CanvasRenderingContext2D, drawColor: string) => {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = drawColor;
    ctx.fillStyle = drawColor;

    switch (tool) {
      case 'eraser':
        ctx.strokeStyle = canvasBg;
        ctx.lineWidth = strokeWidth * 3;
        break;
      case 'pen':
        ctx.lineWidth = Math.max(1.5, strokeWidth * 1.2);
        break;
      case 'pencil':
        ctx.lineWidth = Math.max(1, strokeWidth);
        ctx.globalAlpha = 0.85;
        break;
      case 'marker':
        ctx.lineWidth = strokeWidth * 3.5;
        ctx.globalAlpha = 0.4;
        ctx.lineCap = 'square';
        break;
      case 'brush':
      default:
        ctx.lineWidth = strokeWidth * 2;
        if (brushStyle === 'calligraphy') {
          ctx.lineCap = 'butt';
          ctx.lineWidth = strokeWidth * 3;
        } else if (brushStyle === 'watercolor') {
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = strokeWidth * 4;
        } else if (brushStyle === 'crayon') {
          ctx.globalAlpha = 0.75;
        }
        break;
    }
  };

  /** Brush textures that need per-move stamping rather than a plain lineTo. */
  const stampBrush = (ctx: CanvasRenderingContext2D, point: Point, drawColor: string) => {
    if (brushStyle === 'airbrush') {
      ctx.fillStyle = drawColor;
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * strokeWidth * 2.5;
        ctx.fillRect(point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius, 1.5, 1.5);
      }
      return true;
    }
    if (brushStyle === 'crayon') {
      // Scatter short strokes around the path for a grainy edge.
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = drawColor;
      for (let i = 0; i < 6; i++) {
        const offsetX = (Math.random() - 0.5) * strokeWidth * 2.2;
        const offsetY = (Math.random() - 0.5) * strokeWidth * 2.2;
        ctx.fillRect(point.x + offsetX, point.y + offsetY, 1.2, 1.2);
      }
      ctx.restore();
      return false;
    }
    return false;
  };

  const floodFill = useCallback((startX: number, startY: number, fillHex: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const x0 = Math.round(startX);
    const y0 = Math.round(startY);
    if (x0 < 0 || x0 >= w || y0 < 0 || y0 >= h) return;

    const image = ctx.getImageData(0, 0, w, h);
    const data = image.data;

    const probe = document.createElement('canvas').getContext('2d')!;
    probe.fillStyle = fillHex;
    probe.fillRect(0, 0, 1, 1);
    const target = probe.getImageData(0, 0, 1, 1).data;

    const start = (y0 * w + x0) * 4;
    const sr = data[start], sg = data[start + 1], sb = data[start + 2], sa = data[start + 3];
    if (sr === target[0] && sg === target[1] && sb === target[2] && sa === target[3]) return;

    const matches = (pos: number) =>
      data[pos] === sr && data[pos + 1] === sg && data[pos + 2] === sb && data[pos + 3] === sa;

    const stack: number[] = [x0, y0];
    while (stack.length) {
      const y = stack.pop()!;
      const x = stack.pop()!;
      let top = y;
      while (top >= 0 && matches((top * w + x) * 4)) top--;
      top++;

      let spanLeft = false;
      let spanRight = false;
      for (let cy = top; cy < h && matches((cy * w + x) * 4); cy++) {
        const pos = (cy * w + x) * 4;
        data[pos] = target[0];
        data[pos + 1] = target[1];
        data[pos + 2] = target[2];
        data[pos + 3] = target[3];

        if (x > 0) {
          const leftMatch = matches((cy * w + x - 1) * 4);
          if (leftMatch && !spanLeft) { stack.push(x - 1, cy); spanLeft = true; }
          else if (!leftMatch) spanLeft = false;
        }
        if (x < w - 1) {
          const rightMatch = matches((cy * w + x + 1) * 4);
          if (rightMatch && !spanRight) { stack.push(x + 1, cy); spanRight = true; }
          else if (!rightMatch) spanRight = false;
        }
      }
    }
    ctx.putImageData(image, 0, 0);
  }, []);

  const pickColor = useCallback((x: number, y: number, secondary: boolean) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const hex = `#${[pixel[0], pixel[1], pixel[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    if (secondary) setSecondaryColor(hex);
    else setPrimaryColor(hex);
    setLastAction(`Picked ${hex}`);
  }, []);

  // -------------------------------------------------------------------------
  // Pointer handling
  // -------------------------------------------------------------------------
  const handleStagePointerDown = (event: React.PointerEvent) => {
    if (editingNodeId) commitNodeText();
    const point = toCanvasPoint(event.clientX, event.clientY);
    const secondary = event.button === 2;
    const drawColor = secondary ? secondaryColor : primaryColor;

    // Middle-drag pans regardless of the active tool.
    if (event.button === 1 || tool === 'pan') {
      const scroller = scrollRef.current;
      interactionRef.current = {
        type: 'pan',
        startCanvas: point,
        startClient: { x: event.clientX, y: event.clientY },
        startScroll: { left: scroller?.scrollLeft ?? 0, top: scroller?.scrollTop ?? 0 },
      };
      event.preventDefault();
      return;
    }

    if (isRasterTool(tool)) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      if (tool === 'picker') {
        pickColor(point.x, point.y, secondary);
        return;
      }
      if (tool === 'fill') {
        pushHistory('Fill area', true);
        floodFill(point.x, point.y, drawColor);
        return;
      }

      pushHistory('Draw', true);
      rasterSnapshotRef.current = null;
      setIsDrawing(true);
      configureStroke(ctx, drawColor);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      return;
    }

    if (tool === 'shape') {
      addNode(shapeToPlace, point);
      setTool('select');
      return;
    }

    if (tool === 'text') {
      const node = addNode('text', point, { w: 140, h: 40 }, 'Text');
      setEditingNodeId(node.id);
      setEditingText('Text');
      setTool('select');
      return;
    }

    if (tool === 'connector') {
      const target = hitTest(objects, point);
      if (target && isNode(target)) {
        const anchor = bestAnchor(target, point);
        interactionRef.current = {
          type: 'connect',
          startCanvas: point,
          startClient: { x: event.clientX, y: event.clientY },
          connectFrom: { nodeId: target.id, anchor },
        };
        setPendingEdge({ from: point, to: point });
      }
      return;
    }

    // Select tool
    const target = hitTest(objects, point);
    if (target) {
      const groupIds = expandGroups([target.id], objects);
      const alreadySelected = selectedIds.includes(target.id);
      const nextSelection = event.shiftKey
        ? alreadySelected
          ? selectedIds.filter((id) => !groupIds.includes(id))
          : [...selectedIds, ...groupIds]
        : alreadySelected
        ? selectedIds
        : groupIds;

      setSelectedIds(nextSelection);
      interactionRef.current = {
        type: 'move',
        startCanvas: point,
        startClient: { x: event.clientX, y: event.clientY },
        originObjects: cloneObjects(objects.filter((o) => nextSelection.includes(o.id))),
      };
    } else {
      if (!event.shiftKey) setSelectedIds([]);
      interactionRef.current = {
        type: 'marquee',
        startCanvas: point,
        startClient: { x: event.clientX, y: event.clientY },
        additive: event.shiftKey,
      };
      setMarquee({ x: point.x, y: point.y, w: 0, h: 0 });
    }
  };

  const handleStagePointerMove = (event: React.PointerEvent) => {
    const point = toCanvasPoint(event.clientX, event.clientY);
    setMousePos({ x: Math.round(point.x), y: Math.round(point.y) });

    // Reveal connection anchors on the node under the cursor.
    if ((tool === 'select' || tool === 'connector') && !interactionRef.current) {
      const target = hitTest(objects, point);
      setHoverNodeId(target && isNode(target) ? target.id : null);
    }

    if (isDrawing && isRasterTool(tool)) {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const drawColor = event.buttons === 2 ? secondaryColor : primaryColor;
      // A stamping brush (airbrush) paints on its own and skips the stroke;
      // a texturing brush (crayon) adds grain and still strokes the path.
      if (tool === 'brush' && stampBrush(ctx, point, drawColor)) return;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      return;
    }

    const interaction = interactionRef.current;
    if (!interaction) return;

    if (interaction.type === 'pan') {
      const scroller = scrollRef.current;
      if (scroller && interaction.startScroll) {
        scroller.scrollLeft = interaction.startScroll.left - (event.clientX - interaction.startClient.x);
        scroller.scrollTop = interaction.startScroll.top - (event.clientY - interaction.startClient.y);
      }
      return;
    }

    if (interaction.type === 'marquee') {
      setMarquee(normalizeRect(interaction.startCanvas.x, interaction.startCanvas.y, point.x, point.y));
      return;
    }

    if (interaction.type === 'connect') {
      setPendingEdge({ from: interaction.startCanvas, to: point });
      const target = hitTest(objects, point);
      setHoverNodeId(target && isNode(target) ? target.id : null);
      return;
    }

    const dx = point.x - interaction.startCanvas.x;
    const dy = point.y - interaction.startCanvas.y;

    if (interaction.type === 'move' && interaction.originObjects) {
      const originById = new Map(interaction.originObjects.map((o) => [o.id, o]));
      setObjects((prev) =>
        prev.map((object) => {
          const origin = originById.get(object.id);
          if (!origin) return object;
          if (isNode(object) && isNode(origin)) {
            return {
              ...object,
              x: snap(origin.x + dx, gridSize, snapToGrid),
              y: snap(origin.y + dy, gridSize, snapToGrid),
            };
          }
          if (isEdge(object) && isEdge(origin)) {
            // Only free endpoints move; endpoints bound to a node follow it.
            return {
              ...object,
              from: 'x' in origin.from ? { x: origin.from.x + dx, y: origin.from.y + dy } : origin.from,
              to: 'x' in origin.to ? { x: origin.to.x + dx, y: origin.to.y + dy } : origin.to,
            };
          }
          return object;
        })
      );
      return;
    }

    if (interaction.type === 'resize' && interaction.handle && interaction.originObjects) {
      const origin = interaction.originObjects[0];
      if (!origin || !isNode(origin)) return;
      const next = applyResize(
        { x: origin.x, y: origin.y, w: origin.w, h: origin.h },
        interaction.handle,
        dx,
        dy,
        event.shiftKey
      );
      setObjects((prev) =>
        prev.map((object) =>
          object.id === origin.id && isNode(object)
            ? {
                ...object,
                x: snap(next.x, gridSize, snapToGrid),
                y: snap(next.y, gridSize, snapToGrid),
                w: snap(next.w, gridSize, snapToGrid),
                h: snap(next.h, gridSize, snapToGrid),
              }
            : object
        )
      );
    }
  };

  const handleStagePointerUp = (event: React.PointerEvent) => {
    if (isDrawing) {
      setIsDrawing(false);
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.closePath();
      if (ctx) ctx.globalAlpha = 1;
    }

    const interaction = interactionRef.current;
    interactionRef.current = null;

    if (!interaction) return;

    if (interaction.type === 'marquee' && marquee) {
      const hits = objectsInRect(objects, marquee).map((o) => o.id);
      const expanded = expandGroups(hits, objects);
      setSelectedIds((prev) => (interaction.additive ? [...new Set([...prev, ...expanded])] : expanded));
      setMarquee(null);
      return;
    }

    if (interaction.type === 'connect' && interaction.connectFrom) {
      const point = toCanvasPoint(event.clientX, event.clientY);
      const target = hitTest(objects, point);
      setPendingEdge(null);

      if (target && isNode(target) && target.id !== interaction.connectFrom.nodeId) {
        const source = objects.find((o) => o.id === interaction.connectFrom!.nodeId) as DiagramNode;
        const edge: DiagramEdge = {
          id: makeId('edge'),
          kind: 'edge',
          from: { nodeId: interaction.connectFrom.nodeId, anchor: bestAnchor(source, point) },
          to: { nodeId: target.id, anchor: bestAnchor(target, interaction.startCanvas) },
          label: '',
          style: { ...edgeStyle },
        };
        updateObjects('Connect shapes', (prev) => [...prev, edge]);
        setSelectedIds([edge.id]);
      }
      return;
    }

    if (interaction.type === 'move' || interaction.type === 'resize') {
      // Record the step only when something actually shifted.
      const moved = interaction.originObjects?.some((origin) => {
        const current = objects.find((o) => o.id === origin.id);
        if (!current || !isNode(current) || !isNode(origin)) return false;
        return current.x !== origin.x || current.y !== origin.y || current.w !== origin.w || current.h !== origin.h;
      });
      if (moved) {
        setPast((prev) => {
          const appended = [
            ...prev,
            {
              raster: null,
              // The pre-drag document: current objects with the dragged ones
              // put back where they started.
              objects: objects.map((o) => {
                const origin = interaction.originObjects!.find((x) => x.id === o.id);
                return origin ?? o;
              }),
              canvasWidth,
              canvasHeight,
              label: interaction.type === 'move' ? 'Move' : 'Resize',
            },
          ];
          return appended.length > 60 ? appended.slice(appended.length - 60) : appended;
        });
        setFuture([]);
        setLastAction(interaction.type === 'move' ? 'Moved objects' : 'Resized object');
        setIsDirty(true);
      }
    }
  };

  const handleAnchorPointerDown = (
    nodeId: string,
    anchor: AnchorSide,
    event: React.PointerEvent
  ) => {
    event.stopPropagation();
    const node = objects.find((o) => o.id === nodeId) as DiagramNode | undefined;
    if (!node) return;
    const point = toCanvasPoint(event.clientX, event.clientY);
    interactionRef.current = {
      type: 'connect',
      startCanvas: point,
      startClient: { x: event.clientX, y: event.clientY },
      connectFrom: { nodeId, anchor },
    };
    setPendingEdge({ from: point, to: point });
  };

  const handleResizeHandleDown = (handle: ResizeHandle, event: React.PointerEvent) => {
    event.stopPropagation();
    const node = selectedNodes[0];
    if (!node) return;
    interactionRef.current = {
      type: 'resize',
      handle,
      startCanvas: toCanvasPoint(event.clientX, event.clientY),
      startClient: { x: event.clientX, y: event.clientY },
      originObjects: cloneObjects([node]),
    };
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    const point = toCanvasPoint(event.clientX, event.clientY);
    const target = hitTest(objects, point);
    if (target && isNode(target)) {
      setEditingNodeId(target.id);
      setEditingText(target.text);
      setSelectedIds([target.id]);
    } else if (target && isEdge(target)) {
      const label = window.prompt('Connector label', target.label);
      if (label !== null) {
        updateObjects('Label connector', (prev) =>
          prev.map((o) => (o.id === target.id && isEdge(o) ? { ...o, label } : o))
        );
      }
    }
  };

  const commitNodeText = useCallback(() => {
    if (!editingNodeId) return;
    const node = objects.find((o) => o.id === editingNodeId) as DiagramNode | undefined;
    const id = editingNodeId;
    const text = editingText;
    setEditingNodeId(null);
    setEditingText('');
    if (node && node.text !== text) {
      updateObjects('Edit label', (prev) =>
        prev.map((o) => (o.id === id && isNode(o) ? { ...o, text } : o))
      );
    }
  }, [editingNodeId, editingText, objects, updateObjects]);

  // -------------------------------------------------------------------------
  // Canvas operations
  // -------------------------------------------------------------------------
  const rotateCanvas = (degrees: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    pushHistory(`Rotate ${degrees}°`, true);

    const buffer = document.createElement('canvas');
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    buffer.getContext('2d')?.drawImage(canvas, 0, 0);

    const swap = degrees === 90 || degrees === 270;
    const newW = swap ? canvas.height : canvas.width;
    const newH = swap ? canvas.width : canvas.height;

    canvas.width = newW;
    canvas.height = newH;
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, newW, newH);
    ctx.save();
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(buffer, -buffer.width / 2, -buffer.height / 2);
    ctx.restore();

    setCanvasWidth(newW);
    setCanvasHeight(newH);
  };

  const flipCanvas = (axis: 'horizontal' | 'vertical') => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    pushHistory(`Flip ${axis}`, true);

    const buffer = document.createElement('canvas');
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    buffer.getContext('2d')?.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (axis === 'horizontal') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(buffer, 0, 0);
    ctx.restore();
  };

  const clearAll = () => {
    if (!window.confirm('Clear the drawing and every shape? This can be undone with Ctrl+Z.')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    pushHistory('Clear document', true);
    if (canvas && ctx) {
      ctx.fillStyle = canvasBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setObjects([]);
    setSelectedIds([]);
  };

  // -------------------------------------------------------------------------
  // Import / export
  // -------------------------------------------------------------------------
  const importImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loaded) => {
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        pushHistory('Import image', true);
        const ratio = Math.min(1, canvas.width / image.width, canvas.height / image.height);
        const w = image.width * ratio;
        const h = image.height * ratio;
        ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        setLastAction(`Imported ${file.name}`);
      };
      image.src = loaded.target?.result as string;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  /** Flattens the raster layer and the vector layer into one bitmap. */
  const composite = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const canvas = canvasRef.current;
    const svg = svgHostRef.current?.querySelector('svg');
    if (!canvas) return null;

    const output = document.createElement('canvas');
    output.width = canvas.width;
    output.height = canvas.height;
    const ctx = output.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(canvas, 0, 0);

    if (svg && objects.length > 0) {
      // Clone so the exported copy can be sized independently of the view.
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('width', String(canvas.width));
      clone.setAttribute('height', String(canvas.height));
      clone.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
      const markup = new XMLSerializer().serializeToString(clone);
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

      await new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 0, 0);
          resolve();
        };
        image.onerror = () => resolve();
        image.src = url;
      });
    }

    return output;
  }, [canvasBg, objects.length]);

  const exportPNG = useCallback(async () => {
    const output = await composite();
    if (!output) return;
    const link = document.createElement('a');
    link.download = `${documentName || 'diagram'}.png`;
    link.href = output.toDataURL('image/png');
    link.click();
    setLastAction('Exported PNG');
  }, [composite, documentName]);

  const exportPDF = useCallback(async () => {
    const output = await composite();
    if (!output) return;
    const pdf = new jsPDF({
      orientation: output.width > output.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [output.width, output.height],
    });
    pdf.addImage(output.toDataURL('image/png'), 'PNG', 0, 0, output.width, output.height);
    pdf.save(`${documentName || 'diagram'}.pdf`);
    setLastAction('Exported PDF');
  }, [composite, documentName]);

  const saveToDrive = useCallback(async () => {
    const output = await composite();
    if (!output) return;
    setFiles((prev) => [
      ...prev,
      {
        id: `file_paint_${Date.now()}`,
        name: `${documentName || 'diagram'}.png`,
        type: 'file',
        content: output.toDataURL('image/png'),
        parentId: resolveDefaultFolderId('Pictures') || resolveDefaultFolderId('Documents') || null,
        createdAt: new Date().toLocaleDateString(),
      },
    ]);
    setIsDirty(false);
    setLastAction(`Saved ${documentName} to Drive`);
  }, [composite, documentName, setFiles, resolveDefaultFolderId]);

  // -------------------------------------------------------------------------
  // Sharing and comments (real state)
  // -------------------------------------------------------------------------
  const shareDocument = () => {
    const name = shareNameInput.trim();
    const email = shareEmailInput.trim();
    if (!name && !email) return;
    setSharedWith((prev) => [
      ...prev,
      {
        id: makeId('share'),
        name: name || email,
        email,
        access: shareAccess,
        sharedAt: new Date().toLocaleString(),
      },
    ]);
    setShareNameInput('');
    setShareEmailInput('');
    setLastAction(`Shared with ${name || email}`);
  };

  const addComment = () => {
    if (!commentDraft.trim() || !pendingCommentPoint) return;
    setComments((prev) => [
      ...prev,
      {
        id: makeId('comment'),
        x: pendingCommentPoint.x,
        y: pendingCommentPoint.y,
        author: userName,
        text: commentDraft.trim(),
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        resolved: false,
      },
    ]);
    setCommentDraft('');
    setPendingCommentPoint(null);
  };

  // -------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (event.key === 'Escape') (target as HTMLElement).blur();
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod) {
        switch (key) {
          case 'z': event.preventDefault(); event.shiftKey ? redo() : undo(); return;
          case 'y': event.preventDefault(); redo(); return;
          case 'c': event.preventDefault(); copySelection(false); return;
          case 'x': event.preventDefault(); copySelection(true); return;
          case 'v': event.preventDefault(); pasteClipboard(); return;
          case 'd': event.preventDefault(); duplicateSelection(); return;
          case 'a':
            event.preventDefault();
            setSelectedIds(objects.map((o) => o.id));
            return;
          case 'g':
            event.preventDefault();
            event.shiftKey ? ungroupSelection() : groupSelection();
            return;
          case 's': event.preventDefault(); saveToDrive(); return;
          case '=': case '+': event.preventDefault(); setZoom((z) => Math.min(400, z + 25)); return;
          case '-': event.preventDefault(); setZoom((z) => Math.max(25, z - 25)); return;
          case '0': event.preventDefault(); setZoom(100); return;
        }
        return;
      }

      switch (event.key) {
        case 'Delete': case 'Backspace': event.preventDefault(); deleteSelection(); return;
        case 'Escape':
          setSelectedIds([]);
          setPendingEdge(null);
          setMarquee(null);
          interactionRef.current = null;
          return;
        case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': {
          if (selectedIds.length === 0) return;
          event.preventDefault();
          const step = event.shiftKey ? 10 : snapToGrid ? gridSize : 1;
          const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
          const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
          updateObjects('Nudge', (prev) =>
            prev.map((object) =>
              isNode(object) && selectedIds.includes(object.id)
                ? { ...object, x: object.x + dx, y: object.y + dy }
                : object
            )
          );
          return;
        }
      }

      // Tool hotkeys
      const hotkeys: Record<string, Tool> = {
        v: 'select', h: 'pan', c: 'connector', r: 'shape', t: 'text',
        p: 'pencil', n: 'pen', b: 'brush', e: 'eraser', f: 'fill', i: 'picker', m: 'marker',
      };
      if (hotkeys[key]) {
        setTool(hotkeys[key]);
        if (key === 'r') setShapeToPlace('rectangle');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    undo, redo, copySelection, pasteClipboard, duplicateSelection, deleteSelection,
    groupSelection, ungroupSelection, saveToDrive, objects, selectedIds, snapToGrid,
    gridSize, updateObjects,
  ]);

  // -------------------------------------------------------------------------
  // Responsive chrome
  // -------------------------------------------------------------------------
  const [containerWidth, setContainerWidth] = useState(1200);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const isCompact = containerWidth < 1024;
  const isTight = containerWidth < 720;

  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  useEffect(() => {
    setShowLeftPanel(!isTight);
    setShowRightPanel(!isCompact);
  }, [isTight, isCompact]);

  const editingNode = editingNodeId
    ? (objects.find((o) => o.id === editingNodeId) as DiagramNode | undefined)
    : undefined;

  const selectionBounds = selectedObjects.length ? boundsOf(selectedObjects, objects) : null;

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const toolButton = (id: Tool, label: string, Icon: React.ComponentType<any>, hotkey?: string) => (
    <button
      key={id}
      onClick={() => setTool(id)}
      title={hotkey ? `${label} (${hotkey})` : label}
      className={`p-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
        tool === id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
      }`}
    >
      <Icon size={15} />
    </button>
  );

  const iconButton = (
    onClick: () => void,
    label: string,
    Icon: React.ComponentType<any>,
    disabled = false,
    active = false
  ) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-700'
      }`}
    >
      <Icon size={15} />
    </button>
  );

  useAppMenu(windowId, [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'import', label: 'Import Image…', onSelect: () => fileInputRef.current?.click() },
        { id: 'save', label: 'Save to Drive', shortcut: 'Ctrl+S', onSelect: saveToDrive },
        separator(),
        {
          kind: 'submenu', id: 'export', label: 'Export',
          items: [
            { id: 'exp-png', label: 'PNG Image', onSelect: exportPNG },
            { id: 'exp-pdf', label: 'PDF Document', onSelect: exportPDF },
          ],
        },
        separator(),
        { id: 'share', label: 'Share…', onSelect: () => setShowShareDialog(true) },
        separator(),
        { id: 'clear', label: 'Clear Document', danger: true, onSelect: clearAll },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', disabled: past.length === 0, onSelect: undo },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', disabled: future.length === 0, onSelect: redo },
        separator(),
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', disabled: selectedIds.length === 0, onSelect: () => copySelection(true) },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', disabled: selectedIds.length === 0, onSelect: () => copySelection(false) },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', disabled: clipboard.length === 0, onSelect: pasteClipboard },
        { id: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D', disabled: selectedIds.length === 0, onSelect: duplicateSelection },
        { id: 'delete', label: 'Delete', shortcut: 'Delete', danger: true, disabled: selectedIds.length === 0, onSelect: deleteSelection },
        separator(),
        { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', onSelect: () => setSelectedIds(objects.map((o) => o.id)) },
        { id: 'select-none', label: 'Deselect', shortcut: 'Esc', disabled: selectedIds.length === 0, onSelect: () => setSelectedIds([]) },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'zoom-in', label: 'Zoom In', shortcut: 'Ctrl++', onSelect: () => setZoom((z) => Math.min(400, z + 25)) },
        { id: 'zoom-out', label: 'Zoom Out', shortcut: 'Ctrl+-', onSelect: () => setZoom((z) => Math.max(25, z - 25)) },
        { id: 'zoom-reset', label: 'Actual Size', shortcut: 'Ctrl+0', onSelect: () => setZoom(100) },
        separator(),
        {
          kind: 'submenu', id: 'grid-menu', label: 'Grid',
          items: ([
            ['none', 'No Grid'], ['grid', 'Square Grid'], ['dots', 'Dot Grid'],
          ] as const).map(([type, label]) => ({
            id: `grid-${type}`, label, selected: gridType === type,
            onSelect: () => setGridType(type),
          })),
        },
        { id: 'snap', label: 'Snap to Grid', checked: snapToGrid, onSelect: () => setSnapToGrid((s) => !s) },
        separator(),
        { id: 'tools-panel', label: 'Tools Panel', checked: showLeftPanel, onSelect: () => setShowLeftPanel((p) => !p) },
        { id: 'props-panel', label: 'Properties Panel', checked: showRightPanel, onSelect: () => setShowRightPanel((p) => !p) },
        { id: 'comments-panel', label: 'Comments', checked: showCommentsPanel, onSelect: () => setShowCommentsPanel((p) => !p) },
        { id: 'comment-pins', label: 'Comment Pins', checked: showCommentPins, onSelect: () => setShowCommentPins((p) => !p) },
      ],
    },
    {
      id: 'image',
      label: 'Image',
      items: [
        { id: 'rot-cw', label: 'Rotate 90° Right', onSelect: () => rotateCanvas(90) },
        { id: 'rot-ccw', label: 'Rotate 90° Left', onSelect: () => rotateCanvas(270) },
        { id: 'rot-180', label: 'Rotate 180°', onSelect: () => rotateCanvas(180) },
        separator(),
        { id: 'flip-h', label: 'Flip Horizontal', onSelect: () => flipCanvas('horizontal') },
        { id: 'flip-v', label: 'Flip Vertical', onSelect: () => flipCanvas('vertical') },
        separator(),
        {
          kind: 'submenu', id: 'canvas-size', label: 'Canvas Size',
          items: [
            { id: 'size-720', label: '1280 × 720', onSelect: () => resizeCanvas(1280, 720) },
            { id: 'size-1080', label: '1920 × 1080', onSelect: () => resizeCanvas(1920, 1080) },
            { id: 'size-a4', label: 'A4 landscape', onSelect: () => resizeCanvas(1123, 794) },
            separator(),
            {
              id: 'size-fit',
              label: 'Fit to Content',
              disabled: objects.length === 0,
              onSelect: () => {
                const bounds = objects.length ? boundsOf(objects, objects) : null;
                if (!bounds) return;
                resizeCanvas(
                  Math.max(200, Math.ceil(bounds.x + bounds.w + 40)),
                  Math.max(200, Math.ceil(bounds.y + bounds.h + 40))
                );
              },
            },
          ],
        },
      ],
    },
    {
      id: 'arrange',
      label: 'Arrange',
      items: [
        { id: 'group', label: 'Group', shortcut: 'Ctrl+G', disabled: selectedIds.length < 2, onSelect: groupSelection },
        { id: 'ungroup', label: 'Ungroup', shortcut: 'Ctrl+Shift+G', disabled: selectedIds.length === 0, onSelect: ungroupSelection },
        separator(),
        { id: 'front', label: 'Bring to Front', disabled: selectedIds.length === 0, onSelect: () => reorderSelection('front') },
        { id: 'back', label: 'Send to Back', disabled: selectedIds.length === 0, onSelect: () => reorderSelection('back') },
        separator(),
        {
          kind: 'submenu', id: 'align-menu', label: 'Align',
          disabled: selectedNodes.length < 2,
          items: ([
            ['left', 'Left'], ['center-h', 'Centre'], ['right', 'Right'],
            ['top', 'Top'], ['middle-v', 'Middle'], ['bottom', 'Bottom'],
          ] as const).map(([mode, label]) => ({
            id: `align-${mode}`, label, onSelect: () => applyAlign(mode as AlignMode),
          })),
        },
        {
          kind: 'submenu', id: 'distribute-menu', label: 'Distribute',
          disabled: selectedNodes.length < 3,
          items: [
            { id: 'dist-h', label: 'Horizontally', onSelect: () => applyDistribute('horizontal') },
            { id: 'dist-v', label: 'Vertically', onSelect: () => applyDistribute('vertical') },
          ],
        },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      items: [
        { id: 't-select', label: 'Select', shortcut: 'V', selected: tool === 'select', onSelect: () => setTool('select') },
        { id: 't-connector', label: 'Connector', shortcut: 'C', selected: tool === 'connector', onSelect: () => setTool('connector') },
        { id: 't-text', label: 'Text', shortcut: 'T', selected: tool === 'text', onSelect: () => setTool('text') },
        { id: 't-pan', label: 'Pan', shortcut: 'H', selected: tool === 'pan', onSelect: () => setTool('pan') },
        separator(),
        { id: 't-pen', label: 'Pen', shortcut: 'N', selected: tool === 'pen', onSelect: () => setTool('pen') },
        { id: 't-pencil', label: 'Pencil', shortcut: 'P', selected: tool === 'pencil', onSelect: () => setTool('pencil') },
        { id: 't-brush', label: 'Brush', shortcut: 'B', selected: tool === 'brush', onSelect: () => setTool('brush') },
        { id: 't-eraser', label: 'Eraser', shortcut: 'E', selected: tool === 'eraser', onSelect: () => setTool('eraser') },
        { id: 't-fill', label: 'Fill', shortcut: 'F', selected: tool === 'fill', onSelect: () => setTool('fill') },
        { id: 't-picker', label: 'Eyedropper', shortcut: 'I', selected: tool === 'picker', onSelect: () => setTool('picker') },
        separator(),
        {
          kind: 'submenu', id: 'brush-style', label: 'Brush Style',
          items: ([
            ['standard', 'Standard'], ['airbrush', 'Airbrush'], ['calligraphy', 'Calligraphy'],
            ['crayon', 'Crayon'], ['watercolor', 'Watercolour'],
          ] as const).map(([style, label]) => ({
            id: `brush-${style}`, label, selected: brushStyle === style,
            onSelect: () => { setBrushStyle(style); setTool('brush'); },
          })),
        },
      ],
    },
  ]);

  return (
    <div ref={rootRef} className="h-full flex flex-col bg-[#f0f3f9] text-slate-800 font-sans select-none overflow-hidden">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={importImage} className="hidden" />

      {/* ================= TITLE BAR ================= */}
      <div className="h-10 px-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white shrink-0">
            <PenTool size={14} />
          </div>
          <input
            value={documentName}
            onChange={(e) => { setDocumentName(e.target.value); setIsDirty(true); }}
            className="bg-transparent text-xs font-bold text-slate-900 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none min-w-0 w-44"
          />
          {isDirty && <span className="text-[10px] font-semibold text-amber-600 shrink-0">Unsaved</span>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {iconButton(undo, 'Undo (Ctrl+Z)', Undo2, past.length === 0)}
          {iconButton(redo, 'Redo (Ctrl+Y)', Redo2, future.length === 0)}
          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Shared users appear only once the document is actually shared. */}
          {sharedWith.length > 0 && (
            <div className="flex items-center gap-1 mr-1" title={`Shared with ${sharedWith.length}`}>
              <div className="flex -space-x-1.5">
                {sharedWith.slice(0, 3).map((person) => (
                  <div
                    key={person.id}
                    className="w-6 h-6 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white"
                    title={`${person.name} · ${person.access}`}
                  >
                    {person.name.slice(0, 2).toUpperCase()}
                  </div>
                ))}
              </div>
              {sharedWith.length > 3 && (
                <span className="text-[10px] font-bold text-slate-500">+{sharedWith.length - 3}</span>
              )}
            </div>
          )}

          <button
            onClick={() => setShowShareDialog(true)}
            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 size={13} /> {!isTight && 'Share'}
          </button>

          <button
            onClick={() => setShowCommentsPanel((p) => !p)}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
              showCommentsPanel ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <MessageCircle size={13} />
            {comments.length > 0 && <span>{comments.length}</span>}
          </button>

          <button
            onClick={saveToDrive}
            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={13} /> {!isTight && 'Save'}
          </button>
        </div>
      </div>

      {/* ================= TOOLBAR ================= */}
      <div className="bg-white border-b border-slate-200 px-2 py-1.5 flex flex-wrap items-center gap-1.5 shrink-0">
        {/* Colours */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setActiveSlot(1)}
              className={`w-6 h-6 rounded border-2 cursor-pointer ${activeSlot === 1 ? 'border-blue-500' : 'border-slate-300'}`}
              style={{ backgroundColor: primaryColor }}
              title="Primary colour"
            />
            <button
              onClick={() => setActiveSlot(2)}
              className={`w-6 h-6 rounded border-2 cursor-pointer ${activeSlot === 2 ? 'border-blue-500' : 'border-slate-300'}`}
              style={{ backgroundColor: secondaryColor }}
              title="Secondary colour"
            />
          </div>
          {!isCompact && (
            <div className="grid grid-cols-10 gap-0.5">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    if (activeSlot === 1) setPrimaryColor(color);
                    else setSecondaryColor(color);
                    if (selectedNodes.length) patchSelectedNodeStyle('Fill colour', activeSlot === 1 ? { stroke: color } : { fill: color });
                    if (selectedEdges.length && activeSlot === 1) patchSelectedEdgeStyle('Line colour', { stroke: color });
                  }}
                  className="w-3.5 h-3.5 rounded-xs border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
          <input
            type="color"
            value={activeSlot === 1 ? primaryColor : secondaryColor}
            onChange={(e) => (activeSlot === 1 ? setPrimaryColor(e.target.value) : setSecondaryColor(e.target.value))}
            className="w-6 h-6 rounded cursor-pointer border border-slate-300 p-0"
            title="Custom colour"
          />
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Stroke width */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500">{strokeWidth}px</span>
          <input
            type="range"
            min={1}
            max={24}
            value={strokeWidth}
            onChange={(e) => {
              const value = Number(e.target.value);
              setStrokeWidth(value);
              if (selectedNodes.length) patchSelectedNodeStyle('Stroke width', { strokeWidth: value });
              if (selectedEdges.length) patchSelectedEdgeStyle('Stroke width', { strokeWidth: value });
            }}
            className="w-20 accent-blue-600 cursor-pointer"
          />
        </div>

        {tool === 'brush' && (
          <select
            value={brushStyle}
            onChange={(e) => setBrushStyle(e.target.value as BrushStyle)}
            className="h-7 bg-white border border-slate-300 rounded px-1.5 text-[11px] font-semibold cursor-pointer"
          >
            <option value="standard">Standard</option>
            <option value="airbrush">Airbrush</option>
            <option value="calligraphy">Calligraphy</option>
            <option value="crayon">Crayon</option>
            <option value="watercolor">Watercolour</option>
          </select>
        )}

        <div className="w-px h-5 bg-slate-200" />

        {/* Arrange, shown when a selection exists */}
        {selectedIds.length > 0 && (
          <>
            {iconButton(() => applyAlign('left'), 'Align left', AlignHorizontalJustifyStart, selectedNodes.length < 2)}
            {iconButton(() => applyAlign('center-h'), 'Align centre', AlignHorizontalJustifyCenter, selectedNodes.length < 2)}
            {iconButton(() => applyAlign('right'), 'Align right', AlignHorizontalJustifyEnd, selectedNodes.length < 2)}
            {iconButton(() => applyAlign('top'), 'Align top', AlignVerticalJustifyStart, selectedNodes.length < 2)}
            {iconButton(() => applyAlign('middle-v'), 'Align middle', AlignVerticalJustifyCenter, selectedNodes.length < 2)}
            {iconButton(() => applyAlign('bottom'), 'Align bottom', AlignVerticalJustifyEnd, selectedNodes.length < 2)}
            {iconButton(() => applyDistribute('horizontal'), 'Distribute horizontally', AlignHorizontalDistributeCenter, selectedNodes.length < 3)}
            {iconButton(() => applyDistribute('vertical'), 'Distribute vertically', AlignVerticalDistributeCenter, selectedNodes.length < 3)}
            <div className="w-px h-5 bg-slate-200" />
            {iconButton(groupSelection, 'Group (Ctrl+G)', Group, selectedIds.length < 2)}
            {iconButton(ungroupSelection, 'Ungroup (Ctrl+Shift+G)', Ungroup)}
            {iconButton(() => reorderSelection('front'), 'Bring to front', BringToFront)}
            {iconButton(() => reorderSelection('back'), 'Send to back', SendToBack)}
            {iconButton(duplicateSelection, 'Duplicate (Ctrl+D)', Copy)}
            {iconButton(deleteSelection, 'Delete', Trash2)}
            <div className="w-px h-5 bg-slate-200" />
          </>
        )}

        {/* Canvas ops */}
        {iconButton(() => rotateCanvas(90), 'Rotate canvas 90° right', RotateCw)}
        {iconButton(() => rotateCanvas(270), 'Rotate canvas 90° left', RotateCcw)}
        {iconButton(() => flipCanvas('horizontal'), 'Flip horizontal', FlipHorizontal)}
        {iconButton(() => flipCanvas('vertical'), 'Flip vertical', FlipVertical)}
        {iconButton(() => fileInputRef.current?.click(), 'Import image', Clipboard)}
        {iconButton(exportPNG, 'Export PNG', Download)}
        {iconButton(exportPDF, 'Export PDF', FileDown)}
        {iconButton(clearAll, 'Clear document', Trash2)}

        <div className="w-px h-5 bg-slate-200" />
        {iconButton(() => setSnapToGrid((s) => !s), 'Snap to grid', Magnet, false, snapToGrid)}
        {iconButton(
          () => setGridType((g) => (g === 'none' ? 'grid' : g === 'grid' ? 'dots' : 'none')),
          `Grid: ${gridType}`,
          Grid,
          false,
          gridType !== 'none'
        )}
      </div>

      {/* ================= BODY ================= */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Left: tools and shapes */}
        {showLeftPanel && (
          <div className={`bg-slate-100 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-2 gap-3 ${
            isTight ? 'absolute inset-y-0 left-0 z-30 w-52 shadow-2xl' : 'w-52'
          }`}>
            {isTight && (
              <button onClick={() => setShowLeftPanel(false)} className="self-end p-1 text-slate-500 hover:text-slate-800 cursor-pointer">
                <X size={14} />
              </button>
            )}

            <div>
              <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1 px-1">Diagram</div>
              <div className="grid grid-cols-5 gap-1">
                {toolButton('select', 'Select', MousePointer2, 'V')}
                {toolButton('connector', 'Connector', Spline, 'C')}
                {toolButton('text', 'Text', Type, 'T')}
                {toolButton('pan', 'Pan', Hand, 'H')}
                {toolButton('shape', 'Place shape', Square, 'R')}
              </div>
            </div>

            <div>
              <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1 px-1">Draw</div>
              <div className="grid grid-cols-5 gap-1">
                {toolButton('pen', 'Pen', PenTool, 'N')}
                {toolButton('pencil', 'Pencil', Pencil, 'P')}
                {toolButton('marker', 'Marker', Highlighter, 'M')}
                {toolButton('brush', 'Brush', Brush, 'B')}
                {toolButton('eraser', 'Eraser', Eraser, 'E')}
                {toolButton('fill', 'Fill', PaintBucket, 'F')}
                {toolButton('picker', 'Eyedropper', Pipette, 'I')}
              </div>
            </div>

            <div>
              <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1 px-1">Shapes</div>
              <div className="grid grid-cols-5 gap-1 bg-white p-1.5 rounded-xl border border-slate-200">
                {SHAPE_PALETTE.map(({ shape, label, icon: Icon }) => (
                  <button
                    key={shape}
                    onClick={() => { setShapeToPlace(shape); setTool('shape'); }}
                    title={label}
                    className={`p-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                      tool === 'shape' && shapeToPlace === shape ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 px-1 leading-snug">
                Pick a shape, then click the canvas to place it.
              </p>
            </div>

            <div>
              <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1 px-1 flex items-center gap-1">
                <Workflow size={11} /> Flowchart
              </div>
              <div className="flex flex-col gap-1">
                {FLOWCHART_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      const scroller = scrollRef.current;
                      const centre = {
                        x: ((scroller?.scrollLeft ?? 0) + (scroller?.clientWidth ?? 400) / 2) / scale,
                        y: ((scroller?.scrollTop ?? 0) + (scroller?.clientHeight ?? 300) / 2) / scale,
                      };
                      addNode(preset.shape, centre, { w: preset.w, h: preset.h }, preset.text, preset.fill);
                      setTool('select');
                    }}
                    className="w-full text-left px-2 py-1 bg-white hover:bg-blue-600 hover:text-white border border-slate-200 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Canvas stage */}
        <div ref={scrollRef} className="flex-1 min-w-0 overflow-auto bg-[#dbe2ef]/70 p-6 custom-scrollbar relative">
          {!showLeftPanel && (
            <button
              onClick={() => setShowLeftPanel(true)}
              className="absolute top-2 left-2 z-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold shadow-sm cursor-pointer"
            >
              Tools
            </button>
          )}

          <div
            ref={stageRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerLeave={handleStagePointerUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => e.preventDefault()}
            className="relative shadow-xl origin-top-left"
            style={{
              // A little slack so the edge handles are always inside the
              // scrollable area and can be grabbed.
              width: canvasWidth * scale + 14,
              height: canvasHeight * scale + 14,
              cursor:
                tool === 'pan' ? (interactionRef.current?.type === 'pan' ? 'grabbing' : 'grab')
                : tool === 'picker' ? 'copy'
                : tool === 'text' ? 'text'
                : tool === 'select' ? 'default'
                : 'crosshair',
            }}
          >
            <div
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: canvasWidth * scale, height: canvasHeight * scale, backgroundColor: canvasBg }}
            />
            {/* Grid */}
            {gridType !== 'none' && (
              <svg className="absolute inset-0 pointer-events-none" width={canvasWidth * scale} height={canvasHeight * scale}>
                <defs>
                  <pattern id="paint-grid" width={gridSize * scale} height={gridSize * scale} patternUnits="userSpaceOnUse">
                    {gridType === 'grid' ? (
                      <path d={`M ${gridSize * scale} 0 L 0 0 0 ${gridSize * scale}`} fill="none" stroke="#cbd5e1" strokeWidth={1} />
                    ) : (
                      <circle cx={(gridSize * scale) / 2} cy={(gridSize * scale) / 2} r={1.2} fill="#cbd5e1" />
                    )}
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#paint-grid)" />
              </svg>
            )}

            {/* Raster layer */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0"
              style={{
                width: canvasWidth * scale,
                height: canvasHeight * scale,
                imageRendering: scale >= 2 ? 'pixelated' : 'auto',
              }}
            />

            {/* Vector layer */}
            <div ref={svgHostRef} className="absolute inset-0">
              <DiagramLayer
                objects={objects}
                selectedIds={selectedIds}
                scale={scale}
                width={canvasWidth}
                height={canvasHeight}
                marquee={marquee}
                pendingEdge={pendingEdge}
                anchorHostId={tool === 'select' || tool === 'connector' ? hoverNodeId : null}
                editingNodeId={editingNodeId}
                interactive={tool === 'select' || tool === 'connector'}
                onAnchorPointerDown={handleAnchorPointerDown}
                onHandlePointerDown={handleResizeHandleDown}
              />
            </div>

            {/* Inline label editor */}
            {editingNode && (
              <textarea
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={commitNodeText}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setEditingNodeId(null); setEditingText(''); }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitNodeText(); }
                  e.stopPropagation();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute z-40 resize-none text-center bg-white/95 border-2 border-blue-500 rounded outline-none p-1"
                style={{
                  left: editingNode.x * scale,
                  top: editingNode.y * scale,
                  width: editingNode.w * scale,
                  height: editingNode.h * scale,
                  fontSize: editingNode.style.fontSize * scale,
                  fontFamily: editingNode.style.fontFamily,
                }}
              />
            )}

            {/* Pending canvas size while dragging an edge handle */}
            {pendingSize && (
              <>
                <div
                  className="absolute border-2 border-dashed border-blue-500 pointer-events-none z-40"
                  style={{ left: 0, top: 0, width: pendingSize.w * scale, height: pendingSize.h * scale }}
                />
                <div
                  className="absolute z-40 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold font-mono pointer-events-none"
                  style={{ left: pendingSize.w * scale + 6, top: pendingSize.h * scale + 6 }}
                >
                  {pendingSize.w} × {pendingSize.h}
                </div>
              </>
            )}

            {/* Canvas frame resize handles */}
            <div
              onPointerDown={startFrameDrag('right')}
              title="Drag to change canvas width"
              className="absolute z-40 cursor-ew-resize bg-transparent hover:bg-blue-500/30"
              style={{ left: canvasWidth * scale - 3, top: 0, width: 8, height: canvasHeight * scale }}
            />
            <div
              onPointerDown={startFrameDrag('bottom')}
              title="Drag to change canvas height"
              className="absolute z-40 cursor-ns-resize bg-transparent hover:bg-blue-500/30"
              style={{ left: 0, top: canvasHeight * scale - 3, width: canvasWidth * scale, height: 8 }}
            />
            <div
              onPointerDown={startFrameDrag('corner')}
              title="Drag to resize the canvas"
              className="absolute z-40 cursor-nwse-resize bg-white border-2 border-blue-500 rounded-sm shadow"
              style={{ left: canvasWidth * scale - 5, top: canvasHeight * scale - 5, width: 11, height: 11 }}
            />

            {/* Comment pins */}
            {showCommentPins && comments.map((comment, index) => (
              <button
                key={comment.id}
                onClick={() => setShowCommentsPanel(true)}
                className={`absolute z-30 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md border-2 border-white cursor-pointer ${
                  comment.resolved ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ left: comment.x * scale - 12, top: comment.y * scale - 12 }}
                title={`${comment.author}: ${comment.text}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Right: properties. Reopenable, since it is the only place the
            canvas size and object styles live. */}
        {!showRightPanel && (
          <button
            onClick={() => setShowRightPanel(true)}
            className="absolute top-2 right-2 z-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold shadow-sm cursor-pointer"
          >
            Properties
          </button>
        )}
        {showRightPanel && (
          <div className="w-60 bg-white border-l border-slate-200 shrink-0 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                {selectedIds.length === 0 ? 'Canvas' : selectedIds.length === 1 ? 'Object' : `${selectedIds.length} objects`}
              </span>
              <button onClick={() => setShowRightPanel(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer" title="Hide panel">
                <X size={13} />
              </button>
            </div>

            {selectedIds.length === 0 && (
              <>
                <label className="text-[11px] font-bold text-slate-600">Canvas size</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={sizeDraft.w}
                    onChange={(e) => setSizeDraft((d) => ({ ...d, w: e.target.value }))}
                    onBlur={commitSizeDraft}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-400 text-[11px]">×</span>
                  <input
                    type="number"
                    value={sizeDraft.h}
                    onChange={(e) => setSizeDraft((d) => ({ ...d, h: e.target.value }))}
                    onBlur={commitSizeDraft}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Fit content', w: 0, h: 0 },
                    { label: '1280×720', w: 1280, h: 720 },
                    { label: '1920×1080', w: 1920, h: 1080 },
                    { label: 'A4', w: 1123, h: 794 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        if (preset.w === 0) {
                          const bounds = objects.length ? boundsOf(objects, objects) : null;
                          if (!bounds) return;
                          resizeCanvas(
                            Math.max(200, Math.ceil(bounds.x + bounds.w + 40)),
                            Math.max(200, Math.ceil(bounds.y + bounds.h + 40))
                          );
                        } else {
                          resizeCanvas(preset.w, preset.h);
                        }
                      }}
                      className="px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <label className="text-[11px] font-bold text-slate-600">Background</label>
                <input
                  type="color"
                  value={canvasBg}
                  onChange={(e) => setCanvasBg(e.target.value)}
                  className="w-full h-8 rounded border border-slate-300 cursor-pointer"
                />

                <label className="text-[11px] font-bold text-slate-600">Grid size</label>
                <input
                  type="range" min={5} max={80} value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />

                <div className="mt-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
                  {objects.length === 0
                    ? 'No shapes yet. Pick a shape or a flowchart node to start a diagram.'
                    : `${objects.filter(isNode).length} shapes · ${objects.filter(isEdge).length} connectors`}
                </div>
              </>
            )}

            {selectedNodes.length > 0 && (
              <>
                <label className="text-[11px] font-bold text-slate-600">Fill</label>
                <input type="color" value={selectedNodes[0].style.fill}
                  onChange={(e) => patchSelectedNodeStyle('Fill colour', { fill: e.target.value })}
                  className="w-full h-7 rounded border border-slate-300 cursor-pointer" />

                <label className="text-[11px] font-bold text-slate-600">Border</label>
                <input type="color" value={selectedNodes[0].style.stroke}
                  onChange={(e) => patchSelectedNodeStyle('Border colour', { stroke: e.target.value })}
                  className="w-full h-7 rounded border border-slate-300 cursor-pointer" />

                <label className="text-[11px] font-bold text-slate-600">Line style</label>
                <select
                  value={selectedNodes[0].style.dash}
                  onChange={(e) => patchSelectedNodeStyle('Line style', { dash: e.target.value as StrokeDash })}
                  className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>

                <label className="text-[11px] font-bold text-slate-600">Text</label>
                <div className="flex items-center gap-1">
                  <input type="number" min={8} max={72} value={selectedNodes[0].style.fontSize}
                    onChange={(e) => patchSelectedNodeStyle('Font size', { fontSize: Number(e.target.value) || 12 })}
                    className="w-14 px-1.5 py-1 border border-slate-300 rounded text-[11px]" />
                  <button
                    onClick={() => patchSelectedNodeStyle('Bold', { bold: !selectedNodes[0].style.bold })}
                    className={`px-2 py-1 rounded border text-[11px] font-extrabold cursor-pointer ${
                      selectedNodes[0].style.bold ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300'
                    }`}
                  >B</button>
                  <button
                    onClick={() => patchSelectedNodeStyle('Italic', { italic: !selectedNodes[0].style.italic })}
                    className={`px-2 py-1 rounded border text-[11px] font-extrabold italic cursor-pointer ${
                      selectedNodes[0].style.italic ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300'
                    }`}
                  >I</button>
                  <input type="color" value={selectedNodes[0].style.fontColor}
                    onChange={(e) => patchSelectedNodeStyle('Text colour', { fontColor: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-300 cursor-pointer" />
                </div>

                <label className="text-[11px] font-bold text-slate-600">Opacity</label>
                <input type="range" min={10} max={100} value={selectedNodes[0].style.opacity * 100}
                  onChange={(e) => patchSelectedNodeStyle('Opacity', { opacity: Number(e.target.value) / 100 })}
                  className="w-full accent-blue-600 cursor-pointer" />

                {selectedNodes.length === 1 && (
                  <>
                    <label className="text-[11px] font-bold text-slate-600">Position &amp; size</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['x', 'y', 'w', 'h'] as const).map((field) => (
                        <div key={field} className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase w-3">{field}</span>
                          <input
                            type="number"
                            value={Math.round(selectedNodes[0][field])}
                            onChange={(e) =>
                              patchSelectedNodes('Set geometry', { [field]: Number(e.target.value) || 0 } as Partial<DiagramNode>)
                            }
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-[11px]"
                          />
                        </div>
                      ))}
                    </div>
                    <label className="text-[11px] font-bold text-slate-600">Rotation</label>
                    <input type="range" min={0} max={359} value={selectedNodes[0].rotation}
                      onChange={(e) => patchSelectedNodes('Rotate', { rotation: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer" />
                  </>
                )}
              </>
            )}

            {selectedEdges.length > 0 && (
              <>
                <label className="text-[11px] font-bold text-slate-600">Connector routing</label>
                <select
                  value={selectedEdges[0].style.routing}
                  onChange={(e) => patchSelectedEdgeStyle('Routing', { routing: e.target.value as EdgeRouting })}
                  className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                >
                  <option value="orthogonal">Orthogonal</option>
                  <option value="straight">Straight</option>
                  <option value="curved">Curved</option>
                </select>

                <label className="text-[11px] font-bold text-slate-600">Arrows</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedEdges[0].style.arrowStart}
                    onChange={(e) => patchSelectedEdgeStyle('Start arrow', { arrowStart: e.target.value as ArrowHead })}
                    className="flex-1 min-w-0 px-1.5 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                  >
                    <option value="none">None</option>
                    <option value="arrow">Arrow</option>
                    <option value="diamond">Diamond</option>
                    <option value="circle">Circle</option>
                  </select>
                  <MoveRight size={13} className="text-slate-400 shrink-0" />
                  <select
                    value={selectedEdges[0].style.arrowEnd}
                    onChange={(e) => patchSelectedEdgeStyle('End arrow', { arrowEnd: e.target.value as ArrowHead })}
                    className="flex-1 min-w-0 px-1.5 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                  >
                    <option value="none">None</option>
                    <option value="arrow">Arrow</option>
                    <option value="diamond">Diamond</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>

                <label className="text-[11px] font-bold text-slate-600">Line style</label>
                <select
                  value={selectedEdges[0].style.dash}
                  onChange={(e) => patchSelectedEdgeStyle('Line style', { dash: e.target.value as StrokeDash })}
                  className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>

                <label className="text-[11px] font-bold text-slate-600">Label</label>
                <input
                  value={selectedEdges[0].label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setObjects((prev) =>
                      prev.map((o) => (o.id === selectedEdges[0].id && isEdge(o) ? { ...o, label } : o))
                    );
                    setIsDirty(true);
                  }}
                  placeholder="Connector label"
                  className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-blue-500"
                />
              </>
            )}
          </div>
        )}

        {/* Comments panel */}
        {showCommentsPanel && (
          <div className={`bg-white border-l border-slate-200 flex flex-col shrink-0 min-h-0 ${
            isTight ? 'absolute inset-y-0 right-0 z-30 w-full shadow-2xl' : 'w-64'
          }`}>
            <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-extrabold flex items-center gap-1.5">
                <MessageCircle size={13} className="text-blue-600" /> Comments ({comments.length})
              </span>
              <div className="flex items-center gap-1">
                {iconButton(() => setShowCommentPins((p) => !p), showCommentPins ? 'Hide pins' : 'Show pins', showCommentPins ? Eye : EyeOff)}
                <button onClick={() => setShowCommentsPanel(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
              {comments.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-8 leading-relaxed">
                  No comments yet.<br />Click a spot on the canvas below to add one.
                </p>
              ) : (
                comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className={`p-2.5 rounded-xl border ${comment.resolved ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-700">
                        #{index + 1} {comment.author}
                      </span>
                      <span className="text-[9px] text-slate-400">{comment.createdAt}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug break-words">{comment.text}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        onClick={() =>
                          setComments((prev) =>
                            prev.map((c) => (c.id === comment.id ? { ...c, resolved: !c.resolved } : c))
                          )
                        }
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        {comment.resolved ? 'Reopen' : 'Resolve'}
                      </button>
                      <button
                        onClick={() => setComments((prev) => prev.filter((c) => c.id !== comment.id))}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 border-t border-slate-200 shrink-0 space-y-1.5">
              <button
                onClick={() =>
                  setPendingCommentPoint(
                    pendingCommentPoint
                      ? null
                      : mousePos || { x: canvasWidth / 2, y: canvasHeight / 2 }
                  )
                }
                className={`w-full py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                  pendingCommentPoint ? 'bg-amber-500 text-white' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {pendingCommentPoint
                  ? `Placing at ${Math.round(pendingCommentPoint.x)}, ${Math.round(pendingCommentPoint.y)}`
                  : 'Pin a comment here'}
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }}
                  placeholder="Write a comment…"
                  className="flex-1 min-w-0 px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={addComment}
                  disabled={!commentDraft.trim() || !pendingCommentPoint}
                  className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg cursor-pointer shrink-0"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= STATUS BAR ================= */}
      <WindowStatus
        left={
          <span className="flex items-center gap-3">
            <span>{mousePos ? `${mousePos.x}, ${mousePos.y}` : '—, —'}</span>
            <span className="opacity-75">{canvasWidth} × {canvasHeight}</span>
            {selectionBounds && (
              <span className="opacity-75">
                Sel {Math.round(selectionBounds.w)} × {Math.round(selectionBounds.h)}
              </span>
            )}
          </span>
        }
        center={
          <span className="opacity-80">
            {objects.filter(isNode).length} shapes · {objects.filter(isEdge).length} connectors
            {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
          </span>
        }
        right={
          <span className="flex items-center gap-2">
            <span className="opacity-70 truncate max-w-28">{lastAction}</span>
            <button onClick={() => setZoom((z) => Math.max(25, z - 25))} className="p-0.5 hover:bg-current/10 rounded cursor-pointer" title="Zoom out">
              <ZoomOut size={13} />
            </button>
            <button onClick={() => setZoom(100)} className="w-10 text-center font-mono font-semibold cursor-pointer hover:bg-current/10 rounded" title="Reset zoom">
              {zoom}%
            </button>
            <button onClick={() => setZoom((z) => Math.min(400, z + 25))} className="p-0.5 hover:bg-current/10 rounded cursor-pointer" title="Zoom in">
              <ZoomIn size={13} />
            </button>
          </span>
        }
      />

      {/* ================= SHARE DIALOG ================= */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg"><Share2 size={16} /></div>
                <div>
                  <h3 className="font-extrabold text-sm">Share "{documentName}"</h3>
                  <p className="text-[11px] text-slate-500">
                    {sharedWith.length === 0
                      ? 'Only you have access right now'
                      : `Shared with ${sharedWith.length} ${sharedWith.length === 1 ? 'person' : 'people'}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowShareDialog(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={shareNameInput}
                  onChange={(e) => setShareNameInput(e.target.value)}
                  placeholder="Name"
                  className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
                <input
                  value={shareEmailInput}
                  onChange={(e) => setShareEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') shareDocument(); }}
                  placeholder="Email"
                  className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
                <select
                  value={shareAccess}
                  onChange={(e) => setShareAccess(e.target.value as 'view' | 'edit')}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs cursor-pointer shrink-0"
                >
                  <option value="edit">Edit</option>
                  <option value="view">View</option>
                </select>
                <button
                  onClick={shareDocument}
                  disabled={!shareNameInput.trim() && !shareEmailInput.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                >
                  Share
                </button>
              </div>

              {sharedWith.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-6 leading-relaxed">
                  This document has not been shared.<br />
                  Add someone above and they will appear here and in the title bar.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                  {sharedWith.map((person) => (
                    <div key={person.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {person.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold truncate">{person.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {person.email || 'No email'} · shared {person.sharedAt}
                        </div>
                      </div>
                      <select
                        value={person.access}
                        onChange={(e) =>
                          setSharedWith((prev) =>
                            prev.map((p) => (p.id === person.id ? { ...p, access: e.target.value as 'view' | 'edit' } : p))
                          )
                        }
                        className="text-[10px] border border-slate-300 rounded px-1 py-0.5 cursor-pointer shrink-0"
                      >
                        <option value="edit">Edit</option>
                        <option value="view">View</option>
                      </select>
                      <button
                        onClick={() => setSharedWith((prev) => prev.filter((p) => p.id !== person.id))}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                        title="Remove access"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
