import {
  AnchorSide,
  DiagramEdge,
  DiagramNode,
  DiagramObject,
  EdgeEndpoint,
  NodeShape,
  Point,
  Rect,
  isEdge,
  isNode,
} from '../types';

export const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
export type ResizeHandle = (typeof RESIZE_HANDLES)[number];

export const ANCHOR_SIDES: AnchorSide[] = ['top', 'right', 'bottom', 'left'];

let idCounter = 0;
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

// ---------------------------------------------------------------------------
// Rectangles
// ---------------------------------------------------------------------------

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

export function nodeRect(node: DiagramNode): Rect {
  return { x: node.x, y: node.y, w: node.w, h: node.h };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

export function pointInRect(point: Point, rect: Rect, padding = 0): boolean {
  return (
    point.x >= rect.x - padding &&
    point.x <= rect.x + rect.w + padding &&
    point.y >= rect.y - padding &&
    point.y <= rect.y + rect.h + padding
  );
}

/** Bounding box around several objects, used for group move and alignment. */
export function boundsOf(objects: DiagramObject[], all: DiagramObject[]): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const object of objects) {
    if (isNode(object)) {
      minX = Math.min(minX, object.x);
      minY = Math.min(minY, object.y);
      maxX = Math.max(maxX, object.x + object.w);
      maxY = Math.max(maxY, object.y + object.h);
    } else {
      const from = resolveEndpoint(object.from, all);
      const to = resolveEndpoint(object.to, all);
      minX = Math.min(minX, from.x, to.x);
      minY = Math.min(minY, from.y, to.y);
      maxX = Math.max(maxX, from.x, to.x);
      maxY = Math.max(maxY, from.y, to.y);
    }
  }

  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ---------------------------------------------------------------------------
// Anchors and endpoints
// ---------------------------------------------------------------------------

export function anchorPoint(node: DiagramNode, anchor: AnchorSide): Point {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  switch (anchor) {
    case 'top': return { x: cx, y: node.y };
    case 'right': return { x: node.x + node.w, y: cy };
    case 'bottom': return { x: cx, y: node.y + node.h };
    case 'left': return { x: node.x, y: cy };
    default: return { x: cx, y: cy };
  }
}

export function resolveEndpoint(endpoint: EdgeEndpoint, objects: DiagramObject[]): Point {
  if ('nodeId' in endpoint) {
    const node = objects.find((o) => o.id === endpoint.nodeId && isNode(o)) as DiagramNode | undefined;
    // A deleted node leaves the edge dangling at the origin rather than crashing.
    if (!node) return { x: 0, y: 0 };
    return anchorPoint(node, endpoint.anchor);
  }
  return { x: endpoint.x, y: endpoint.y };
}

/** Picks the anchor on `node` that faces `target`, so edges leave sensibly. */
export function bestAnchor(node: DiagramNode, target: Point): AnchorSide {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  // Compare against the box aspect so wide boxes still prefer left/right.
  if (Math.abs(dx) / Math.max(1, node.w) > Math.abs(dy) / Math.max(1, node.h)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

// ---------------------------------------------------------------------------
// Edge routing
// ---------------------------------------------------------------------------

/** Builds the SVG path for an edge, honouring its routing mode. */
export function edgePath(edge: DiagramEdge, objects: DiagramObject[]): string {
  const from = resolveEndpoint(edge.from, objects);
  const to = resolveEndpoint(edge.to, objects);

  if (edge.style.routing === 'straight') {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  if (edge.style.routing === 'curved') {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const horizontal = dx > dy;
    const offset = Math.max(40, (horizontal ? dx : dy) / 2);
    const c1 = horizontal ? { x: from.x + offset, y: from.y } : { x: from.x, y: from.y + offset };
    const c2 = horizontal ? { x: to.x - offset, y: to.y } : { x: to.x, y: to.y - offset };
    return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
  }

  // Orthogonal: leave along the source side, arrive along the target side.
  const fromSide = 'nodeId' in edge.from ? edge.from.anchor : null;
  const toSide = 'nodeId' in edge.to ? edge.to.anchor : null;
  const points = orthogonalPoints(from, to, fromSide, toSide);
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function orthogonalPoints(
  from: Point,
  to: Point,
  fromSide: AnchorSide | null,
  toSide: AnchorSide | null
): Point[] {
  const stub = 20;
  const startsVertical = fromSide === 'top' || fromSide === 'bottom';
  const endsVertical = toSide === 'top' || toSide === 'bottom';

  const start: Point = startsVertical
    ? { x: from.x, y: from.y + (fromSide === 'top' ? -stub : stub) }
    : fromSide
    ? { x: from.x + (fromSide === 'left' ? -stub : stub), y: from.y }
    : { x: from.x, y: from.y };

  const end: Point = endsVertical
    ? { x: to.x, y: to.y + (toSide === 'top' ? -stub : stub) }
    : toSide
    ? { x: to.x + (toSide === 'left' ? -stub : stub), y: to.y }
    : { x: to.x, y: to.y };

  const middle: Point[] = [];
  if (startsVertical) {
    const midY = (start.y + end.y) / 2;
    middle.push({ x: start.x, y: midY }, { x: end.x, y: midY });
  } else {
    const midX = (start.x + end.x) / 2;
    middle.push({ x: midX, y: start.y }, { x: midX, y: end.y });
  }

  return [from, start, ...middle, end, to];
}

/** Distance from a point to a segment, for edge hit-testing. */
function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function edgeHitTest(
  edge: DiagramEdge,
  objects: DiagramObject[],
  point: Point,
  tolerance = 6
): boolean {
  const from = resolveEndpoint(edge.from, objects);
  const to = resolveEndpoint(edge.to, objects);

  if (edge.style.routing === 'orthogonal') {
    const fromSide = 'nodeId' in edge.from ? edge.from.anchor : null;
    const toSide = 'nodeId' in edge.to ? edge.to.anchor : null;
    const points = orthogonalPoints(from, to, fromSide, toSide);
    for (let i = 0; i < points.length - 1; i++) {
      if (distanceToSegment(point, points[i], points[i + 1]) <= tolerance) return true;
    }
    return false;
  }

  // Straight and curved are both approximated by the chord, which is close
  // enough for picking and much cheaper than sampling the bezier.
  return distanceToSegment(point, from, to) <= tolerance + (edge.style.routing === 'curved' ? 10 : 0);
}

/** Midpoint of an edge, where its label sits. */
export function edgeMidpoint(edge: DiagramEdge, objects: DiagramObject[]): Point {
  const from = resolveEndpoint(edge.from, objects);
  const to = resolveEndpoint(edge.to, objects);
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

// ---------------------------------------------------------------------------
// Node outlines
// ---------------------------------------------------------------------------

/** SVG path data for a node shape inside its bounding box. */
export function nodePath(shape: NodeShape, rect: Rect): string {
  const { x, y, w, h } = rect;
  const right = x + w;
  const bottom = y + h;
  const cx = x + w / 2;
  const cy = y + h / 2;

  switch (shape) {
    case 'rounded-rect': {
      const r = Math.min(12, w / 4, h / 4);
      return roundedRectPath(x, y, w, h, r);
    }
    case 'capsule': {
      const r = Math.min(h / 2, w / 2);
      return roundedRectPath(x, y, w, h, r);
    }
    case 'ellipse':
      return `M ${x} ${cy} A ${w / 2} ${h / 2} 0 1 0 ${right} ${cy} A ${w / 2} ${h / 2} 0 1 0 ${x} ${cy} Z`;
    case 'diamond':
      return `M ${cx} ${y} L ${right} ${cy} L ${cx} ${bottom} L ${x} ${cy} Z`;
    case 'parallelogram': {
      const shift = Math.min(w * 0.2, 30);
      return `M ${x + shift} ${y} L ${right} ${y} L ${right - shift} ${bottom} L ${x} ${bottom} Z`;
    }
    case 'triangle':
      return `M ${cx} ${y} L ${right} ${bottom} L ${x} ${bottom} Z`;
    case 'hexagon': {
      const shift = Math.min(w * 0.18, 26);
      return `M ${x + shift} ${y} L ${right - shift} ${y} L ${right} ${cy} L ${right - shift} ${bottom} L ${x + shift} ${bottom} L ${x} ${cy} Z`;
    }
    case 'cylinder': {
      const ry = Math.min(h * 0.18, 18);
      return [
        `M ${x} ${y + ry}`,
        `A ${w / 2} ${ry} 0 0 1 ${right} ${y + ry}`,
        `L ${right} ${bottom - ry}`,
        `A ${w / 2} ${ry} 0 0 1 ${x} ${bottom - ry}`,
        'Z',
      ].join(' ');
    }
    case 'document': {
      const wave = Math.min(h * 0.18, 18);
      return [
        `M ${x} ${y}`,
        `L ${right} ${y}`,
        `L ${right} ${bottom - wave}`,
        `Q ${x + (w * 3) / 4} ${bottom} ${cx} ${bottom - wave / 2}`,
        `Q ${x + w / 4} ${bottom - wave} ${x} ${bottom - wave / 2}`,
        'Z',
      ].join(' ');
    }
    case 'star': {
      const outer = Math.min(w, h) / 2;
      const inner = outer * 0.45;
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        points.push(`${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)}`);
      }
      return `M ${points.join(' L ')} Z`;
    }
    case 'heart': {
      const topY = y + h * 0.3;
      return [
        `M ${cx} ${bottom}`,
        `C ${x - w * 0.1} ${cy} ${x + w * 0.05} ${y} ${cx} ${topY}`,
        `C ${right - w * 0.05} ${y} ${right + w * 0.1} ${cy} ${cx} ${bottom}`,
        'Z',
      ].join(' ');
    }
    case 'speech-bubble': {
      const r = Math.min(10, w / 6, h / 6);
      const tailTop = bottom - Math.min(20, h * 0.25);
      return [
        roundedRectPath(x, y, w, tailTop - y, r).replace(/Z$/, ''),
        `M ${x + w * 0.2} ${tailTop}`,
        `L ${x + w * 0.16} ${bottom}`,
        `L ${x + w * 0.34} ${tailTop}`,
        'Z',
      ].join(' ');
    }
    case 'text':
      return '';
    case 'rectangle':
    default:
      return `M ${x} ${y} L ${right} ${y} L ${right} ${bottom} L ${x} ${bottom} Z`;
  }
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h - radius}`,
    `Q ${x + w} ${y + h} ${x + w - radius} ${y + h}`,
    `L ${x + radius} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + h - radius}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    'Z',
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

/**
 * Topmost object under a point. Nodes are tested before edges because the
 * renderer always paints nodes above edges, so picking must agree with what
 * the user can actually see.
 */
export function hitTest(objects: DiagramObject[], point: Point): DiagramObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const object = objects[i];
    if (isNode(object) && pointInRect(point, nodeRect(object))) return object;
  }
  for (let i = objects.length - 1; i >= 0; i--) {
    const object = objects[i];
    if (isEdge(object) && edgeHitTest(object, objects, point)) return object;
  }
  return null;
}

export function objectsInRect(objects: DiagramObject[], rect: Rect): DiagramObject[] {
  return objects.filter((object) => {
    if (isNode(object)) return rectsIntersect(nodeRect(object), rect);
    const from = resolveEndpoint(object.from, objects);
    const to = resolveEndpoint(object.to, objects);
    return pointInRect(from, rect) || pointInRect(to, rect);
  });
}

/** Expands a selection to whole groups, so grouped objects move together. */
export function expandGroups(ids: string[], objects: DiagramObject[]): string[] {
  const groupIds = new Set(
    objects.filter((o) => ids.includes(o.id) && o.groupId).map((o) => o.groupId!)
  );
  if (groupIds.size === 0) return ids;
  const expanded = new Set(ids);
  for (const object of objects) {
    if (object.groupId && groupIds.has(object.groupId)) expanded.add(object.id);
  }
  return [...expanded];
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

export function applyResize(
  rect: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  keepAspect: boolean,
  minSize = 20
): Rect {
  let { x, y, w, h } = rect;

  if (handle.includes('e')) w = rect.w + dx;
  if (handle.includes('s')) h = rect.h + dy;
  if (handle.includes('w')) {
    w = rect.w - dx;
    x = rect.x + dx;
  }
  if (handle.includes('n')) {
    h = rect.h - dy;
    y = rect.y + dy;
  }

  if (keepAspect && rect.w > 0 && rect.h > 0) {
    const ratio = rect.w / rect.h;
    // Drive the smaller change from the larger one so the box keeps its shape.
    if (Math.abs(w - rect.w) > Math.abs(h - rect.h)) {
      const newH = w / ratio;
      if (handle.includes('n')) y = rect.y + (rect.h - newH);
      h = newH;
    } else {
      const newW = h * ratio;
      if (handle.includes('w')) x = rect.x + (rect.w - newW);
      w = newW;
    }
  }

  // Keep a minimum size without letting the box jump when it is reached.
  if (w < minSize) {
    if (handle.includes('w')) x = rect.x + rect.w - minSize;
    w = minSize;
  }
  if (h < minSize) {
    if (handle.includes('n')) y = rect.y + rect.h - minSize;
    h = minSize;
  }

  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

export function handlePositions(rect: Rect): Record<ResizeHandle, Point> {
  const { x, y, w, h } = rect;
  return {
    nw: { x, y },
    n: { x: x + w / 2, y },
    ne: { x: x + w, y },
    e: { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w: { x, y: y + h / 2 },
  };
}

export const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

// ---------------------------------------------------------------------------
// Alignment and distribution
// ---------------------------------------------------------------------------

export type AlignMode = 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom';

export function alignNodes(nodes: DiagramNode[], mode: AlignMode): DiagramNode[] {
  if (nodes.length < 2) return nodes;
  const bounds = boundsOf(nodes, nodes)!;

  return nodes.map((node) => {
    switch (mode) {
      case 'left': return { ...node, x: Math.round(bounds.x) };
      case 'right': return { ...node, x: Math.round(bounds.x + bounds.w - node.w) };
      case 'center-h': return { ...node, x: Math.round(bounds.x + (bounds.w - node.w) / 2) };
      case 'top': return { ...node, y: Math.round(bounds.y) };
      case 'bottom': return { ...node, y: Math.round(bounds.y + bounds.h - node.h) };
      case 'middle-v': return { ...node, y: Math.round(bounds.y + (bounds.h - node.h) / 2) };
      default: return node;
    }
  });
}

/** Even gaps between nodes along one axis, as draw.io's distribute does. */
export function distributeNodes(nodes: DiagramNode[], axis: 'horizontal' | 'vertical'): DiagramNode[] {
  if (nodes.length < 3) return nodes;

  const sorted = [...nodes].sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const totalSpan =
    axis === 'horizontal' ? last.x + last.w - first.x : last.y + last.h - first.y;
  const usedSpace = sorted.reduce((sum, node) => sum + (axis === 'horizontal' ? node.w : node.h), 0);
  const gap = (totalSpan - usedSpace) / (sorted.length - 1);

  let cursor = axis === 'horizontal' ? first.x : first.y;
  const moved = new Map<string, DiagramNode>();
  for (const node of sorted) {
    moved.set(
      node.id,
      axis === 'horizontal'
        ? { ...node, x: Math.round(cursor) }
        : { ...node, y: Math.round(cursor) }
    );
    cursor += (axis === 'horizontal' ? node.w : node.h) + gap;
  }

  return nodes.map((node) => moved.get(node.id) || node);
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

export function cloneObjects(objects: DiagramObject[]): DiagramObject[] {
  return objects.map((object) =>
    isNode(object)
      ? { ...object, style: { ...object.style } }
      : { ...object, style: { ...object.style }, from: { ...object.from }, to: { ...object.to } }
  );
}

/**
 * Duplicates objects with fresh ids, offset by a delta. Edges between two
 * copied nodes are rewired to the copies; edges to outside nodes keep their
 * original target.
 */
export function duplicateObjects(
  objects: DiagramObject[],
  offset: number
): DiagramObject[] {
  const idMap = new Map<string, string>();
  const groupMap = new Map<string, string>();

  for (const object of objects) {
    idMap.set(object.id, makeId(isNode(object) ? 'node' : 'edge'));
    if (object.groupId && !groupMap.has(object.groupId)) {
      groupMap.set(object.groupId, makeId('group'));
    }
  }

  const remapEndpoint = (endpoint: EdgeEndpoint): EdgeEndpoint => {
    if ('nodeId' in endpoint) {
      const mapped = idMap.get(endpoint.nodeId);
      return mapped ? { nodeId: mapped, anchor: endpoint.anchor } : { ...endpoint };
    }
    return { x: endpoint.x + offset, y: endpoint.y + offset };
  };

  return objects.map((object) => {
    const groupId = object.groupId ? groupMap.get(object.groupId) : undefined;
    if (isNode(object)) {
      return {
        ...object,
        id: idMap.get(object.id)!,
        x: object.x + offset,
        y: object.y + offset,
        style: { ...object.style },
        groupId,
      };
    }
    return {
      ...object,
      id: idMap.get(object.id)!,
      from: remapEndpoint(object.from),
      to: remapEndpoint(object.to),
      style: { ...object.style },
      groupId,
    };
  });
}

export function dashArray(dash: 'solid' | 'dashed' | 'dotted', strokeWidth: number): string | undefined {
  if (dash === 'dashed') return `${strokeWidth * 3} ${strokeWidth * 2}`;
  if (dash === 'dotted') return `${strokeWidth} ${strokeWidth * 2}`;
  return undefined;
}

export function snap(value: number, gridSize: number, enabled: boolean): number {
  return enabled && gridSize > 0 ? Math.round(value / gridSize) * gridSize : Math.round(value);
}

export { isNode, isEdge };
