import { CellData, Sheet } from '../types';
import { cellKeyToCoords, coordsToCellKey } from './formula';

export const DEFAULT_COL_WIDTH = 104;
export const DEFAULT_ROW_HEIGHT = 24;
export const ROW_HEADER_WIDTH = 48;
export const COL_HEADER_HEIGHT = 26;
export const MIN_COL_WIDTH = 32;
export const MIN_ROW_HEIGHT = 18;

/** Addressable grid. Only visible cells are rendered, so this can be large. */
export const TOTAL_COLS = 128;
export const TOTAL_ROWS = 2000;

export interface Selection {
  /** Where the selection started; stays put while the focus end moves. */
  anchorCol: number;
  anchorRow: number;
  /** The active cell, which the formula bar and typing target. */
  focusCol: number;
  focusRow: number;
}

export interface NormalizedRange {
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
}

export function normalizeSelection(selection: Selection): NormalizedRange {
  return {
    minCol: Math.min(selection.anchorCol, selection.focusCol),
    maxCol: Math.max(selection.anchorCol, selection.focusCol),
    minRow: Math.min(selection.anchorRow, selection.focusRow),
    maxRow: Math.max(selection.anchorRow, selection.focusRow),
  };
}

export function selectionToA1(selection: Selection): string {
  const range = normalizeSelection(selection);
  const start = coordsToCellKey(range.minCol, range.minRow);
  if (range.minCol === range.maxCol && range.minRow === range.maxRow) return start;
  return `${start}:${coordsToCellKey(range.maxCol, range.maxRow)}`;
}

export function rangeCellKeys(range: NormalizedRange): string[] {
  const keys: string[] = [];
  for (let r = range.minRow; r <= range.maxRow; r++) {
    for (let c = range.minCol; c <= range.maxCol; c++) {
      keys.push(coordsToCellKey(c, r));
    }
  }
  return keys;
}

export function isInRange(col: number, row: number, range: NormalizedRange): boolean {
  return col >= range.minCol && col <= range.maxCol && row >= range.minRow && row <= range.maxRow;
}

// ---------------------------------------------------------------------------
// Axis geometry
// ---------------------------------------------------------------------------

/**
 * Offsets along one axis when most entries share a default size and a few are
 * overridden. Positions are derived from the sorted overrides rather than by
 * summing every entry, so a 2000-row sheet costs the same as a 20-row one.
 */
export class AxisMetrics {
  private sortedOverrides: { index: number; size: number }[];
  private prefix: number[];

  constructor(
    private sizes: Record<number, number> | undefined,
    private defaultSize: number,
    private count: number
  ) {
    this.sortedOverrides = Object.entries(sizes || {})
      .map(([index, size]) => ({ index: Number(index), size }))
      .filter((entry) => entry.index >= 0 && entry.index < count && entry.size !== defaultSize)
      .sort((a, b) => a.index - b.index);

    // Running total of how much the overrides shift everything after them.
    this.prefix = [];
    let delta = 0;
    for (const entry of this.sortedOverrides) {
      delta += entry.size - defaultSize;
      this.prefix.push(delta);
    }
  }

  size(index: number): number {
    return this.sizes?.[index] ?? this.defaultSize;
  }

  /** Pixel offset of the start of `index`. */
  offset(index: number): number {
    const before = this.countOverridesBefore(index);
    const delta = before > 0 ? this.prefix[before - 1] : 0;
    return index * this.defaultSize + delta;
  }

  get totalSize(): number {
    return this.offset(this.count);
  }

  /** Index whose span contains `position`, clamped to the grid. */
  indexAt(position: number): number {
    if (position <= 0) return 0;
    let low = 0;
    let high = this.count - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.offset(mid + 1) <= position) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  /** Inclusive index range covering [start, end) pixels. */
  visibleRange(start: number, end: number, overscan = 2): { first: number; last: number } {
    const first = Math.max(0, this.indexAt(start) - overscan);
    const last = Math.min(this.count - 1, this.indexAt(Math.max(start, end)) + overscan);
    return { first, last };
  }

  private countOverridesBefore(index: number): number {
    let low = 0;
    let high = this.sortedOverrides.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.sortedOverrides[mid].index < index) low = mid + 1;
      else high = mid;
    }
    return low;
  }
}

// ---------------------------------------------------------------------------
// Data extent and clipboard interchange
// ---------------------------------------------------------------------------

/** Bounding box of cells that actually hold something. */
export function getUsedRange(data: Record<string, CellData>): NormalizedRange {
  let minCol = Infinity;
  let minRow = Infinity;
  let maxCol = -Infinity;
  let maxRow = -Infinity;

  for (const key of Object.keys(data)) {
    const cell = data[key];
    if (!cell || (cell.value === '' && !cell.style && !cell.comment)) continue;
    const coords = cellKeyToCoords(key);
    if (!coords) continue;
    minCol = Math.min(minCol, coords.col);
    maxCol = Math.max(maxCol, coords.col);
    minRow = Math.min(minRow, coords.row);
    maxRow = Math.max(maxRow, coords.row);
  }

  if (minCol === Infinity) return { minCol: 0, minRow: 0, maxCol: 0, maxRow: 0 };
  return { minCol, minRow, maxCol, maxRow };
}

/** Tab-separated text, the format every spreadsheet exchanges through. */
export function rangeToTSV(
  data: Record<string, CellData>,
  range: NormalizedRange,
  render: (key: string) => string
): string {
  const lines: string[] = [];
  for (let r = range.minRow; r <= range.maxRow; r++) {
    const cells: string[] = [];
    for (let c = range.minCol; c <= range.maxCol; c++) {
      cells.push(render(coordsToCellKey(c, r)));
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
}

/** Parses pasted text, honouring quoted fields that contain tabs or newlines. */
export function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const delimiter = !text.includes('\t') && text.includes(',') ? ',' : '\t';

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"' && field === '') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (char === '\r') {
      i++;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += char;
    i++;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Deep-ish clone that keeps undo snapshots independent of live state. */
export function cloneSheets(sheets: Sheet[]): Sheet[] {
  return sheets.map((sheet) => ({
    ...sheet,
    data: Object.fromEntries(
      Object.entries(sheet.data).map(([key, cell]) => [
        key,
        { ...cell, style: cell.style ? { ...cell.style, border: cell.style.border ? { ...cell.style.border } : undefined } : undefined },
      ])
    ),
    colWidths: sheet.colWidths ? { ...sheet.colWidths } : undefined,
    rowHeights: sheet.rowHeights ? { ...sheet.rowHeights } : undefined,
    mergedCells: sheet.mergedCells ? sheet.mergedCells.map((m) => ({ ...m })) : undefined,
  }));
}
