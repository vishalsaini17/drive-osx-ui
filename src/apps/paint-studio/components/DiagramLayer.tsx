import React from 'react';
import {
  ArrowHead,
  DiagramEdge,
  DiagramNode,
  DiagramObject,
  Point,
  Rect,
  isEdge,
  isNode,
} from '../types';
import {
  ANCHOR_SIDES,
  HANDLE_CURSOR,
  RESIZE_HANDLES,
  ResizeHandle,
  anchorPoint,
  boundsOf,
  dashArray,
  edgeMidpoint,
  edgePath,
  handlePositions,
  nodePath,
} from '../utils/diagram';

interface DiagramLayerProps {
  objects: DiagramObject[];
  selectedIds: string[];
  scale: number;
  width: number;
  height: number;
  /** Marquee rectangle while the user drags on empty canvas. */
  marquee: Rect | null;
  /** Live connector preview while dragging from an anchor. */
  pendingEdge: { from: Point; to: Point } | null;
  /** Node whose anchors are exposed for starting a connector. */
  anchorHostId: string | null;
  editingNodeId: string | null;
  interactive: boolean;
  onAnchorPointerDown: (nodeId: string, anchor: (typeof ANCHOR_SIDES)[number], event: React.PointerEvent) => void;
  onHandlePointerDown: (handle: ResizeHandle, event: React.PointerEvent) => void;
}

/** Marker ids are shared per (kind, colour) so the defs block stays small. */
function markerId(head: ArrowHead, color: string, position: 'start' | 'end'): string {
  return `mk-${head}-${position}-${color.replace('#', '')}`;
}

function ArrowMarker({ head, color, position }: { head: ArrowHead; color: string; position: 'start' | 'end' }) {
  if (head === 'none') return null;
  const id = markerId(head, color, position);
  // Start markers point the opposite way.
  const flip = position === 'start' ? 'rotate(180 5 5)' : undefined;

  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={head === 'circle' ? 5 : 9}
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <g transform={flip}>
        {head === 'arrow' && <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />}
        {head === 'triangle' && <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />}
        {head === 'diamond' && <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill={color} />}
        {head === 'circle' && <circle cx="5" cy="5" r="4" fill={color} />}
      </g>
    </marker>
  );
}

/** Wraps label text to the node width so long labels do not overflow. */
function wrapLabel(text: string, width: number, fontSize: number): string[] {
  if (!text) return [];
  const explicit = text.split('\n');
  const charsPerLine = Math.max(4, Math.floor(width / (fontSize * 0.58)));
  const lines: string[] = [];

  for (const paragraph of explicit) {
    if (paragraph.length <= charsPerLine) {
      lines.push(paragraph);
      continue;
    }
    let current = '';
    for (const word of paragraph.split(' ')) {
      if (current === '') current = word;
      else if ((current + ' ' + word).length <= charsPerLine) current += ' ' + word;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function NodeView({
  node,
  selected,
  editing,
}: {
  node: DiagramNode;
  selected: boolean;
  editing: boolean;
}) {
  const path = nodePath(node.shape, { x: node.x, y: node.y, w: node.w, h: node.h });
  const lines = editing ? [] : wrapLabel(node.text, node.w - 12, node.style.fontSize);
  const lineHeight = node.style.fontSize * 1.3;
  const startY = node.y + node.h / 2 - ((lines.length - 1) * lineHeight) / 2;

  const textX =
    node.style.align === 'left'
      ? node.x + 8
      : node.style.align === 'right'
      ? node.x + node.w - 8
      : node.x + node.w / 2;
  const textAnchor =
    node.style.align === 'left' ? 'start' : node.style.align === 'right' ? 'end' : 'middle';

  const transform = node.rotation
    ? `rotate(${node.rotation} ${node.x + node.w / 2} ${node.y + node.h / 2})`
    : undefined;

  return (
    <g transform={transform} opacity={node.style.opacity}>
      {node.shape !== 'text' && (
        <path
          d={path}
          fill={node.style.fill}
          stroke={node.style.stroke}
          strokeWidth={node.style.strokeWidth}
          strokeDasharray={dashArray(node.style.dash, node.style.strokeWidth)}
          strokeLinejoin="round"
        />
      )}
      {lines.map((line, index) => (
        <text
          key={index}
          x={textX}
          y={startY + index * lineHeight}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          fontSize={node.style.fontSize}
          fontFamily={node.style.fontFamily}
          fontWeight={node.style.bold ? 700 : 400}
          fontStyle={node.style.italic ? 'italic' : 'normal'}
          fill={node.style.fontColor}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {line}
        </text>
      ))}
      {selected && (
        <path
          d={path || `M ${node.x} ${node.y} L ${node.x + node.w} ${node.y} L ${node.x + node.w} ${node.y + node.h} L ${node.x} ${node.y + node.h} Z`}
          fill="none"
          stroke="#2563eb"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </g>
  );
}

function EdgeView({
  edge,
  objects,
  selected,
}: {
  edge: DiagramEdge;
  objects: DiagramObject[];
  selected: boolean;
}) {
  const path = edgePath(edge, objects);
  const mid = edgeMidpoint(edge, objects);

  return (
    <g>
      {/* Invisible fat stroke widens the click target without changing looks. */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={Math.max(12, edge.style.strokeWidth * 4)} />
      <path
        d={path}
        fill="none"
        stroke={selected ? '#2563eb' : edge.style.stroke}
        strokeWidth={edge.style.strokeWidth}
        strokeDasharray={dashArray(edge.style.dash, edge.style.strokeWidth)}
        strokeLinejoin="round"
        strokeLinecap="round"
        markerStart={
          edge.style.arrowStart !== 'none'
            ? `url(#${markerId(edge.style.arrowStart, edge.style.stroke, 'start')})`
            : undefined
        }
        markerEnd={
          edge.style.arrowEnd !== 'none'
            ? `url(#${markerId(edge.style.arrowEnd, edge.style.stroke, 'end')})`
            : undefined
        }
      />
      {edge.label && (
        <>
          <rect
            x={mid.x - (edge.label.length * edge.style.fontSize * 0.3 + 5)}
            y={mid.y - edge.style.fontSize * 0.75}
            width={edge.label.length * edge.style.fontSize * 0.6 + 10}
            height={edge.style.fontSize * 1.5}
            rx={3}
            fill="#ffffff"
            opacity={0.9}
          />
          <text
            x={mid.x}
            y={mid.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={edge.style.fontSize}
            fill={edge.style.fontColor}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {edge.label}
          </text>
        </>
      )}
    </g>
  );
}

/**
 * Vector layer drawn over the raster canvas.
 *
 * Rendering is pure: all pointer handling lives in the parent, which owns the
 * document, so this component stays a projection of state.
 */
export default function DiagramLayer({
  objects,
  selectedIds,
  scale,
  width,
  height,
  marquee,
  pendingEdge,
  anchorHostId,
  editingNodeId,
  interactive,
  onAnchorPointerDown,
  onHandlePointerDown,
}: DiagramLayerProps) {
  const selectedSet = new Set(selectedIds);
  const selectedObjects = objects.filter((object) => selectedSet.has(object.id));
  const selectionBounds = selectedObjects.length ? boundsOf(selectedObjects, objects) : null;
  const anchorHost = anchorHostId
    ? (objects.find((o) => o.id === anchorHostId && isNode(o)) as DiagramNode | undefined)
    : undefined;

  // One marker per distinct arrow head and colour actually in use.
  const markerSpecs = new Map<string, { head: ArrowHead; color: string; position: 'start' | 'end' }>();
  for (const object of objects) {
    if (!isEdge(object)) continue;
    if (object.style.arrowStart !== 'none') {
      markerSpecs.set(markerId(object.style.arrowStart, object.style.stroke, 'start'), {
        head: object.style.arrowStart, color: object.style.stroke, position: 'start',
      });
    }
    if (object.style.arrowEnd !== 'none') {
      markerSpecs.set(markerId(object.style.arrowEnd, object.style.stroke, 'end'), {
        head: object.style.arrowEnd, color: object.style.stroke, position: 'end',
      });
    }
  }
  markerSpecs.set('mk-preview', { head: 'arrow', color: '#2563eb', position: 'end' });

  const singleNodeSelected =
    selectedObjects.length === 1 && isNode(selectedObjects[0]) ? (selectedObjects[0] as DiagramNode) : null;

  return (
    <svg
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0"
      style={{ pointerEvents: 'none', touchAction: 'none' }}
    >
      <defs>
        {[...markerSpecs.entries()].map(([id, spec]) => (
          <ArrowMarker key={id} head={spec.head} color={spec.color} position={spec.position} />
        ))}
      </defs>

      {/* Edges first so nodes paint over their endpoints. */}
      {objects.filter(isEdge).map((edge) => (
        <EdgeView key={edge.id} edge={edge} objects={objects} selected={selectedSet.has(edge.id)} />
      ))}

      {objects.filter(isNode).map((node) => (
        <NodeView
          key={node.id}
          node={node}
          selected={selectedSet.has(node.id)}
          editing={editingNodeId === node.id}
        />
      ))}

      {/* Connector being dragged */}
      {pendingEdge && (
        <path
          d={`M ${pendingEdge.from.x} ${pendingEdge.from.y} L ${pendingEdge.to.x} ${pendingEdge.to.y}`}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
          strokeDasharray="5 4"
          markerEnd="url(#mk-preview)"
          pointerEvents="none"
        />
      )}

      {/* Anchors on the hovered node, to start a connector from */}
      {anchorHost &&
        ANCHOR_SIDES.map((side) => {
          const point = anchorPoint(anchorHost, side);
          return (
            <circle
              key={side}
              cx={point.x}
              cy={point.y}
              r={5 / scale > 5 ? 5 / scale : 5}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={2 / scale}
              className="cursor-crosshair"
              style={{ pointerEvents: interactive ? 'auto' : 'none' }}
              onPointerDown={(event) => onAnchorPointerDown(anchorHost.id, side, event)}
            />
          );
        })}

      {/* Selection frame and resize handles */}
      {selectionBounds && selectedObjects.length > 1 && (
        <rect
          x={selectionBounds.x}
          y={selectionBounds.y}
          width={selectionBounds.w}
          height={selectionBounds.h}
          fill="none"
          stroke="#2563eb"
          strokeWidth={1 / scale}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      )}

      {singleNodeSelected &&
        RESIZE_HANDLES.map((handle) => {
          const position = handlePositions({
            x: singleNodeSelected.x,
            y: singleNodeSelected.y,
            w: singleNodeSelected.w,
            h: singleNodeSelected.h,
          })[handle];
          const size = 8 / scale;
          return (
            <rect
              key={handle}
              x={position.x - size / 2}
              y={position.y - size / 2}
              width={size}
              height={size}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={1.5 / scale}
              style={{ cursor: HANDLE_CURSOR[handle], pointerEvents: interactive ? 'auto' : 'none' }}
              onPointerDown={(event) => onHandlePointerDown(handle, event)}
            />
          );
        })}

      {/* Marquee */}
      {marquee && (
        <rect
          x={marquee.x}
          y={marquee.y}
          width={marquee.w}
          height={marquee.h}
          fill="#2563eb"
          fillOpacity={0.08}
          stroke="#2563eb"
          strokeWidth={1 / scale}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
