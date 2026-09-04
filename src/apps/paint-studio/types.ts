/**
 * Paint Studio document model.
 *
 * A document has two layers:
 *  - a raster layer (the canvas bitmap) for freehand, brush, eraser and fill
 *  - a diagram layer of vector objects for flowchart work
 *
 * Diagram objects stay editable after they are created: they can be moved,
 * resized, relabelled, grouped and connected, which raster pixels cannot.
 */

export type NodeShape =
  | 'rectangle'
  | 'rounded-rect'
  | 'ellipse'
  | 'diamond'
  | 'parallelogram'
  | 'capsule'
  | 'triangle'
  | 'cylinder'
  | 'hexagon'
  | 'document'
  | 'star'
  | 'heart'
  | 'speech-bubble'
  | 'text';

export type EdgeRouting = 'straight' | 'orthogonal' | 'curved';
export type ArrowHead = 'none' | 'arrow' | 'triangle' | 'diamond' | 'circle';
export type StrokeDash = 'solid' | 'dashed' | 'dotted';
export type TextAlign = 'left' | 'center' | 'right';

/** Named connection points around a node's bounding box. */
export type AnchorSide = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash: StrokeDash;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  opacity: number;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  dash: StrokeDash;
  routing: EdgeRouting;
  arrowStart: ArrowHead;
  arrowEnd: ArrowHead;
  fontSize: number;
  fontColor: string;
}

export interface DiagramNode {
  id: string;
  kind: 'node';
  shape: NodeShape;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  text: string;
  style: NodeStyle;
  /** Members of the same group are selected and moved together. */
  groupId?: string;
  locked?: boolean;
}

/** An endpoint either sticks to a node's anchor or sits at a fixed point. */
export type EdgeEndpoint =
  | { nodeId: string; anchor: AnchorSide }
  | { x: number; y: number };

export interface DiagramEdge {
  id: string;
  kind: 'edge';
  from: EdgeEndpoint;
  to: EdgeEndpoint;
  label: string;
  style: EdgeStyle;
  groupId?: string;
}

export type DiagramObject = DiagramNode | DiagramEdge;

export function isNode(object: DiagramObject): object is DiagramNode {
  return object.kind === 'node';
}

export function isEdge(object: DiagramObject): object is DiagramEdge {
  return object.kind === 'edge';
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

/** One undoable state of the whole document. */
export interface DocumentSnapshot {
  /** Null when this step changed only the diagram, to keep history light. */
  raster: ImageData | null;
  objects: DiagramObject[];
  canvasWidth: number;
  canvasHeight: number;
  label: string;
}

export const DEFAULT_NODE_STYLE: NodeStyle = {
  fill: '#ffffff',
  stroke: '#1e293b',
  strokeWidth: 2,
  dash: 'solid',
  fontSize: 13,
  fontColor: '#0f172a',
  fontFamily: 'Inter, sans-serif',
  bold: false,
  italic: false,
  align: 'center',
  opacity: 1,
};

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  stroke: '#1e293b',
  strokeWidth: 2,
  dash: 'solid',
  routing: 'orthogonal',
  arrowStart: 'none',
  arrowEnd: 'arrow',
  fontSize: 11,
  fontColor: '#334155',
};

/** Ready-made flowchart nodes, matching the vocabulary draw.io uses. */
export const FLOWCHART_PRESETS: {
  id: string;
  label: string;
  shape: NodeShape;
  w: number;
  h: number;
  text: string;
  fill: string;
}[] = [
  { id: 'process', label: 'Process', shape: 'rectangle', w: 150, h: 64, text: 'Process', fill: '#eff6ff' },
  { id: 'decision', label: 'Decision', shape: 'diamond', w: 150, h: 90, text: 'Decision?', fill: '#fef9c3' },
  { id: 'terminal', label: 'Start / End', shape: 'capsule', w: 140, h: 56, text: 'Start', fill: '#dcfce7' },
  { id: 'data', label: 'Input / Output', shape: 'parallelogram', w: 150, h: 64, text: 'Input', fill: '#f3e8ff' },
  { id: 'database', label: 'Database', shape: 'cylinder', w: 130, h: 90, text: 'Database', fill: '#e0f2fe' },
  { id: 'document', label: 'Document', shape: 'document', w: 140, h: 80, text: 'Document', fill: '#fff7ed' },
  { id: 'prep', label: 'Preparation', shape: 'hexagon', w: 150, h: 68, text: 'Prepare', fill: '#ecfeff' },
  { id: 'note', label: 'Note', shape: 'speech-bubble', w: 150, h: 80, text: 'Note', fill: '#fef2f2' },
];
