import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CellData, CellStyle } from '../types';
import { coordsToCellKey, colIndexToLetter } from '../utils/formula';
import {
  AxisMetrics,
  COL_HEADER_HEIGHT,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  ROW_HEADER_WIDTH,
  Selection,
  TOTAL_COLS,
  TOTAL_ROWS,
  isInRange,
  normalizeSelection,
} from '../utils/grid';

export interface RenderedCell {
  text: string;
  style?: CellStyle;
  /** Right-aligned by default, as numbers are in every spreadsheet. */
  numeric: boolean;
  hasComment: boolean;
  isError: boolean;
  overrideBg?: string;
  overrideColor?: string;
  overrideBold?: boolean;
}

interface SheetGridProps {
  data: Record<string, CellData>;
  selection: Selection;
  onSelectionChange: (selection: Selection, extend: boolean) => void;
  editingKey: string | null;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onCommitEdit: (move: 'down' | 'right' | 'up' | 'left' | 'none') => void;
  onCancelEdit: () => void;
  onStartEdit: (key: string) => void;
  getCell: (col: number, row: number) => RenderedCell;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  onResizeColumn: (col: number, width: number) => void;
  onResizeRow: (row: number, height: number) => void;
  onAutoFitColumn: (col: number) => void;
  frozenCols: number;
  frozenRows: number;
  /** Cells matching the current find query, highlighted in place. */
  highlightKeys?: Set<string>;
  activeHighlightKey?: string | null;
  /** Rows hidden by a filter. */
  hiddenRows?: Set<number>;
  onHeaderContextMenu?: (event: React.MouseEvent, type: 'col' | 'row', index: number) => void;
  onCellContextMenu?: (event: React.MouseEvent, col: number, row: number) => void;
}

/**
 * Virtualised sheet grid.
 *
 * Only the cells inside the viewport are mounted, so the addressable grid can
 * be 128 x 2000 without the DOM cost. Headers and frozen panes live in their
 * own overflow-hidden strips whose scroll offset is mirrored from the body,
 * which behaves predictably where nested `position: sticky` did not.
 */
export default function SheetGrid({
  selection,
  onSelectionChange,
  editingKey,
  editValue,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onStartEdit,
  getCell,
  colWidths,
  rowHeights,
  onResizeColumn,
  onResizeRow,
  onAutoFitColumn,
  frozenCols,
  frozenRows,
  highlightKeys,
  activeHighlightKey,
  hiddenRows,
  onHeaderContextMenu,
  onCellContextMenu,
}: SheetGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const colHeaderRef = useRef<HTMLDivElement>(null);
  const rowHeaderRef = useRef<HTMLDivElement>(null);
  const frozenColBodyRef = useRef<HTMLDivElement>(null);
  const frozenRowBodyRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [viewport, setViewport] = useState({ width: 800, height: 400 });
  const [dragSelecting, setDragSelecting] = useState(false);
  const [resizing, setResizing] = useState<
    { type: 'col' | 'row'; index: number; start: number; original: number } | null
  >(null);

  const colMetrics = useMemo(
    () => new AxisMetrics(colWidths, DEFAULT_COL_WIDTH, TOTAL_COLS),
    [colWidths]
  );
  const rowMetrics = useMemo(() => {
    if (!hiddenRows || hiddenRows.size === 0) {
      return new AxisMetrics(rowHeights, DEFAULT_ROW_HEIGHT, TOTAL_ROWS);
    }
    // A hidden row collapses to zero height, so filtered rows close up instead
    // of leaving a gap where the row used to be.
    const effective: Record<number, number> = { ...rowHeights };
    for (const row of hiddenRows) effective[row] = 0;
    return new AxisMetrics(effective, DEFAULT_ROW_HEIGHT, TOTAL_ROWS);
  }, [rowHeights, hiddenRows]);

  const frozenWidth = colMetrics.offset(frozenCols);
  const frozenHeight = rowMetrics.offset(frozenRows);

  // Track the viewport so the visible window is computed from real space.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    const top = el.scrollTop;
    setScroll({ left, top });
    // Mirror onto the header and frozen strips in the same frame as the scroll,
    // so they never lag behind the body.
    if (colHeaderRef.current) colHeaderRef.current.scrollLeft = left;
    if (frozenRowBodyRef.current) frozenRowBodyRef.current.scrollLeft = left;
    if (rowHeaderRef.current) rowHeaderRef.current.scrollTop = top;
    if (frozenColBodyRef.current) frozenColBodyRef.current.scrollTop = top;
  }, []);

  // Body scroll is relative to the start of the unfrozen area, so shift it back
  // into absolute sheet coordinates before asking which cells are on screen.
  const visibleCols = colMetrics.visibleRange(
    scroll.left + frozenWidth,
    scroll.left + frozenWidth + viewport.width
  );
  const visibleRows = rowMetrics.visibleRange(
    scroll.top + frozenHeight,
    scroll.top + frozenHeight + viewport.height
  );

  const range = normalizeSelection(selection);

  // Keep the focused cell on screen when selection moves by keyboard.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || editingKey) return;

    const cellLeft = colMetrics.offset(selection.focusCol) - frozenWidth;
    const cellRight = cellLeft + colMetrics.size(selection.focusCol);
    const cellTop = rowMetrics.offset(selection.focusRow) - frozenHeight;
    const cellBottom = cellTop + rowMetrics.size(selection.focusRow);

    // A focus inside the frozen pane is always visible; nothing to do.
    if (selection.focusCol >= frozenCols) {
      if (cellLeft < el.scrollLeft) el.scrollLeft = Math.max(0, cellLeft);
      else if (cellRight > el.scrollLeft + el.clientWidth) el.scrollLeft = cellRight - el.clientWidth;
    }
    if (selection.focusRow >= frozenRows) {
      if (cellTop < el.scrollTop) el.scrollTop = Math.max(0, cellTop);
      else if (cellBottom > el.scrollTop + el.clientHeight) el.scrollTop = cellBottom - el.clientHeight;
    }
  }, [selection.focusCol, selection.focusRow, editingKey, colMetrics, rowMetrics, frozenCols, frozenRows, frozenWidth, frozenHeight]);

  useEffect(() => {
    if (editingKey && editInputRef.current) {
      editInputRef.current.focus();
      // Caret at the end, so typing continues rather than replacing.
      const length = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(length, length);
    }
  }, [editingKey]);

  // Column and row resizing, tracked on the window so the pointer can leave
  // the header while dragging.
  useEffect(() => {
    if (!resizing) return;

    const onMove = (event: MouseEvent) => {
      if (resizing.type === 'col') {
        const width = Math.max(MIN_COL_WIDTH, resizing.original + event.clientX - resizing.start);
        onResizeColumn(resizing.index, Math.round(width));
      } else {
        const height = Math.max(MIN_ROW_HEIGHT, resizing.original + event.clientY - resizing.start);
        onResizeRow(resizing.index, Math.round(height));
      }
    };
    const onUp = () => setResizing(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, onResizeColumn, onResizeRow]);

  useEffect(() => {
    if (!dragSelecting) return;
    const onUp = () => setDragSelecting(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [dragSelecting]);

  const beginSelection = (col: number, row: number, event: React.MouseEvent) => {
    if (event.button !== 0) return;
    onSelectionChange(
      { anchorCol: col, anchorRow: row, focusCol: col, focusRow: row },
      event.shiftKey
    );
    setDragSelecting(true);
  };

  const extendSelection = (col: number, row: number) => {
    if (!dragSelecting) return;
    onSelectionChange(
      { anchorCol: selection.anchorCol, anchorRow: selection.anchorRow, focusCol: col, focusRow: row },
      true
    );
  };

  // -------------------------------------------------------------------------
  // Renderers
  // -------------------------------------------------------------------------

  const renderCell = (col: number, row: number) => {
    const key = coordsToCellKey(col, row);
    const cell = getCell(col, row);
    const selected = selection.focusCol === col && selection.focusRow === row;
    const inRange = isInRange(col, row, range);
    const isEditing = editingKey === key;
    const style = cell.style;
    const isHighlight = highlightKeys?.has(key);
    const isActiveHighlight = activeHighlightKey === key;

    const background = cell.overrideBg || style?.bgColor;
    const alignment = style?.align || (cell.numeric ? 'right' : 'left');

    return (
      <div
        key={key}
        onMouseDown={(event) => beginSelection(col, row, event)}
        onMouseEnter={() => extendSelection(col, row)}
        onDoubleClick={() => onStartEdit(key)}
        onContextMenu={(event) => onCellContextMenu?.(event, col, row)}
        className={`absolute box-border overflow-hidden flex items-center px-1.5 cursor-cell ${
          isActiveHighlight
            ? 'ring-2 ring-amber-500 z-20'
            : isHighlight
            ? 'ring-1 ring-amber-400 z-10'
            : ''
        }`}
        style={{
          left: colMetrics.offset(col),
          top: rowMetrics.offset(row),
          width: colMetrics.size(col),
          height: rowMetrics.size(row),
          backgroundColor: inRange && !selected ? undefined : background,
          borderRight: style?.border?.right ? `1px solid ${style.border.color || '#334155'}` : '1px solid #e2e8f0',
          borderBottom: style?.border?.bottom ? `1px solid ${style.border.color || '#334155'}` : '1px solid #e2e8f0',
          borderTop: style?.border?.top ? `1px solid ${style.border.color || '#334155'}` : undefined,
          borderLeft: style?.border?.left ? `1px solid ${style.border.color || '#334155'}` : undefined,
        }}
      >
        {/* Range tint sits under the text so cell fills stay visible. */}
        {inRange && !selected && (
          <div className="absolute inset-0 bg-emerald-500/12 pointer-events-none" />
        )}
        {background && inRange && !selected && (
          <div className="absolute inset-0 -z-10" style={{ backgroundColor: background }} />
        )}

        {isEditing ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(event) => onEditValueChange(event.target.value)}
            onMouseDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onBlur={() => onCommitEdit('none')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onCommitEdit(event.shiftKey ? 'up' : 'down');
              } else if (event.key === 'Tab') {
                event.preventDefault();
                onCommitEdit(event.shiftKey ? 'left' : 'right');
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onCancelEdit();
              }
              event.stopPropagation();
            }}
            className="absolute inset-0 w-full h-full px-1.5 text-xs font-medium text-slate-900 bg-white outline-none ring-2 ring-emerald-600 z-30"
          />
        ) : (
          <span
            className={`relative w-full ${style?.wrapText ? 'whitespace-pre-wrap break-words' : 'truncate'}`}
            style={{
              textAlign: alignment,
              color: cell.isError ? '#dc2626' : cell.overrideColor || style?.color || '#0f172a',
              fontWeight: cell.overrideBold || style?.bold ? 700 : 400,
              fontStyle: style?.italic ? 'italic' : undefined,
              textDecoration:
                [style?.underline ? 'underline' : '', style?.strikethrough ? 'line-through' : '']
                  .filter(Boolean)
                  .join(' ') || undefined,
              fontSize: `${style?.fontSize || 11}px`,
              fontFamily: style?.fontFamily,
            }}
          >
            {cell.text}
          </span>
        )}

        {cell.hasComment && (
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-amber-500 border-l-[6px] border-l-transparent pointer-events-none" />
        )}

        {selected && !isEditing && (
          <div className="absolute inset-0 ring-2 ring-emerald-600 pointer-events-none z-10" />
        )}
      </div>
    );
  };

  const renderCells = (
    colStart: number,
    colEnd: number,
    rowStart: number,
    rowEnd: number
  ): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    for (let row = rowStart; row <= rowEnd; row++) {
      if (hiddenRows?.has(row)) continue;
      for (let col = colStart; col <= colEnd; col++) {
        nodes.push(renderCell(col, row));
      }
    }
    return nodes;
  };

  const renderColHeader = (col: number) => {
    const active = col >= range.minCol && col <= range.maxCol;
    return (
      <div
        key={`ch-${col}`}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          onSelectionChange(
            { anchorCol: col, anchorRow: 0, focusCol: col, focusRow: TOTAL_ROWS - 1 },
            event.shiftKey
          );
        }}
        onContextMenu={(event) => onHeaderContextMenu?.(event, 'col', col)}
        className={`absolute box-border flex items-center justify-center text-[10px] font-bold uppercase tracking-wide border-r border-b border-slate-300 select-none cursor-pointer ${
          active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        style={{
          left: colMetrics.offset(col),
          top: 0,
          width: colMetrics.size(col),
          height: COL_HEADER_HEIGHT,
        }}
      >
        {colIndexToLetter(col)}
        <div
          onMouseDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setResizing({ type: 'col', index: col, start: event.clientX, original: colMetrics.size(col) });
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onAutoFitColumn(col);
          }}
          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-emerald-500/60"
          title="Drag to resize, double-click to fit"
        />
      </div>
    );
  };

  const renderRowHeader = (row: number) => {
    if (hiddenRows?.has(row)) return null;
    const active = row >= range.minRow && row <= range.maxRow;
    return (
      <div
        key={`rh-${row}`}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          onSelectionChange(
            { anchorCol: 0, anchorRow: row, focusCol: TOTAL_COLS - 1, focusRow: row },
            event.shiftKey
          );
        }}
        onContextMenu={(event) => onHeaderContextMenu?.(event, 'row', row)}
        className={`absolute box-border flex items-center justify-center text-[10px] font-bold border-r border-b border-slate-300 select-none cursor-pointer ${
          active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
        style={{
          left: 0,
          top: rowMetrics.offset(row),
          width: ROW_HEADER_WIDTH,
          height: rowMetrics.size(row),
        }}
      >
        {row + 1}
        <div
          onMouseDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setResizing({ type: 'row', index: row, start: event.clientY, original: rowMetrics.size(row) });
          }}
          className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-emerald-500/60"
          title="Drag to resize"
        />
      </div>
    );
  };

  const bodyWidth = colMetrics.totalSize - frozenWidth;
  const bodyHeight = rowMetrics.totalSize - frozenHeight;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-white select-none">
      {/* ---- Header band: corner, frozen column headers, scrolling headers ---- */}
      <div className="flex shrink-0" style={{ height: COL_HEADER_HEIGHT }}>
        <div
          className="shrink-0 bg-slate-200 border-r border-b border-slate-300"
          style={{ width: ROW_HEADER_WIDTH + frozenWidth }}
        >
          {frozenCols > 0 && (
            <div className="relative h-full" style={{ marginLeft: ROW_HEADER_WIDTH }}>
              {Array.from({ length: frozenCols }, (_, col) => renderColHeader(col))}
            </div>
          )}
        </div>
        <div ref={colHeaderRef} className="flex-1 overflow-hidden relative">
          <div className="relative" style={{ width: colMetrics.totalSize, height: COL_HEADER_HEIGHT }}>
            <div style={{ marginLeft: -frozenWidth }}>
              {Array.from(
                { length: Math.max(0, visibleCols.last - Math.max(visibleCols.first, frozenCols) + 1) },
                (_, i) => renderColHeader(Math.max(visibleCols.first, frozenCols) + i)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Frozen rows band ---- */}
      {frozenRows > 0 && (
        <div className="flex shrink-0 border-b-2 border-slate-400" style={{ height: frozenHeight }}>
          <div
            className="shrink-0 relative bg-slate-100 border-r border-slate-300 overflow-hidden"
            style={{ width: ROW_HEADER_WIDTH + frozenWidth }}
          >
            {Array.from({ length: frozenRows }, (_, row) => renderRowHeader(row))}
            <div className="absolute top-0" style={{ left: ROW_HEADER_WIDTH }}>
              {renderCells(0, Math.max(0, frozenCols - 1), 0, frozenRows - 1)}
            </div>
          </div>
          <div ref={frozenRowBodyRef} className="flex-1 overflow-hidden relative">
            <div className="relative" style={{ width: bodyWidth, height: frozenHeight }}>
              <div style={{ marginLeft: -frozenWidth }}>
                {renderCells(
                  Math.max(visibleCols.first, frozenCols),
                  visibleCols.last,
                  0,
                  frozenRows - 1
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Body band ---- */}
      <div className="flex-1 min-h-0 flex">
        {/* Row headers plus frozen columns, scrolling vertically with the body */}
        <div
          ref={rowHeaderRef}
          className="shrink-0 overflow-hidden relative bg-slate-100 border-r-2 border-slate-400"
          style={{ width: ROW_HEADER_WIDTH + frozenWidth }}
        >
          <div className="relative" style={{ height: rowMetrics.totalSize }}>
            <div style={{ marginTop: -frozenHeight }}>
              {Array.from(
                { length: Math.max(0, visibleRows.last - Math.max(visibleRows.first, frozenRows) + 1) },
                (_, i) => renderRowHeader(Math.max(visibleRows.first, frozenRows) + i)
              )}
              {frozenCols > 0 && (
                <div className="absolute top-0" style={{ left: ROW_HEADER_WIDTH }}>
                  {renderCells(
                    0,
                    frozenCols - 1,
                    Math.max(visibleRows.first, frozenRows),
                    visibleRows.last
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* The one real scroll container */}
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex-1 min-w-0 overflow-auto custom-scrollbar relative"
        >
          <div className="relative" style={{ width: bodyWidth, height: bodyHeight }}>
            <div style={{ marginLeft: -frozenWidth, marginTop: -frozenHeight }}>
              {renderCells(
                Math.max(visibleCols.first, frozenCols),
                visibleCols.last,
                Math.max(visibleRows.first, frozenRows),
                visibleRows.last
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
