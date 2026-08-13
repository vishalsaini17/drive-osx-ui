import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  Sheet,
  CellData,
  CellStyle,
  ConditionalRule,
  ChartConfig,
  VersionSnapshot,
  PeerCursor,
  CellComment,
} from './types';
import { DEFAULT_WORKBOOK_SHEETS } from './data/defaultWorkbook';
import {
  colIndexToLetter,
  cellKeyToCoords,
  coordsToCellKey,
  evaluateCell,
  evaluateFormula,
  formatCellValue,
  cellValueToText,
  isError as isFormulaError,
  isNumericValue,
  getRangeCellKeys,
  CellValue,
  NumberFormat,
} from './utils/formula';
import {
  Selection,
  TOTAL_COLS,
  TOTAL_ROWS,
  cloneSheets,
  getUsedRange,
  normalizeSelection,
  parseTSV,
  rangeCellKeys,
  rangeToTSV,
  selectionToA1,
} from './utils/grid';
import SheetGrid, { RenderedCell } from './components/SheetGrid';
import { ChartStudio } from './components/ChartStudio';
import { ConditionalFormatModal } from './components/ConditionalFormatModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { useSystemStore } from '../../shell/state/systemStore';
import WindowStatus from '../../shell/window-manager/WindowStatusContext';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';
import {
  Plus, Trash2, Copy, Download, Upload, FileSpreadsheet, Bold, Italic, Underline,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, Table, BarChart2, Sparkles,
  History, MessageCircle, RotateCcw, RotateCw, ChevronDown, Search, X, Send,
  Scissors, Clipboard, ArrowUpDown, Filter, Snowflake, WrapText, Edit2, Check,
  MoreHorizontal, Percent, DollarSign, Hash as HashIcon, Palette, Type,
} from 'lucide-react';

const FONT_FAMILIES = ['Inter', 'Arial', 'Georgia', 'Courier New', 'Verdana', 'Times New Roman'];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];
const SWATCHES = [
  '#0f172a', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
  '#2563eb', '#7c3aed', '#db2777', '#64748b', '#ffffff', '#f1f5f9',
  '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#cffafe', '#dbeafe',
];

const FUNCTION_CATALOG = [
  { name: 'SUM', hint: 'Add a range' },
  { name: 'AVERAGE', hint: 'Mean of a range' },
  { name: 'COUNT', hint: 'Count numbers' },
  { name: 'COUNTA', hint: 'Count non-empty' },
  { name: 'COUNTIF', hint: 'Count matching a test' },
  { name: 'SUMIF', hint: 'Add matching a test' },
  { name: 'MIN', hint: 'Smallest value' },
  { name: 'MAX', hint: 'Largest value' },
  { name: 'MEDIAN', hint: 'Middle value' },
  { name: 'STDEV', hint: 'Standard deviation' },
  { name: 'ROUND', hint: 'Round to digits' },
  { name: 'IF', hint: 'Conditional result' },
  { name: 'IFERROR', hint: 'Fallback on error' },
  { name: 'AND', hint: 'All true' },
  { name: 'OR', hint: 'Any true' },
  { name: 'CONCAT', hint: 'Join text' },
  { name: 'LEFT', hint: 'Leading characters' },
  { name: 'RIGHT', hint: 'Trailing characters' },
  { name: 'LEN', hint: 'Text length' },
  { name: 'UPPER', hint: 'Uppercase' },
  { name: 'LOWER', hint: 'Lowercase' },
  { name: 'TRIM', hint: 'Collapse spaces' },
  { name: 'VLOOKUP', hint: 'Look up a row' },
  { name: 'INDEX', hint: 'Value at position' },
  { name: 'MATCH', hint: 'Position of a value' },
  { name: 'TODAY', hint: "Today's date" },
];

/** Functions that take a range, so inserting them can pre-fill one. */
const RANGE_FUNCTIONS = new Set(['SUM', 'AVERAGE', 'COUNT', 'COUNTA', 'MIN', 'MAX', 'MEDIAN', 'STDEV']);

interface HistoryEntry {
  sheets: Sheet[];
  activeSheetId: string;
  label: string;
}

export default function SpreadsheetApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------
  // Workbook state
  // ---------------------------------------------------------------------
  const [workbookTitle, setWorkbookTitle] = useState('Quarterly Financial & Operations.xlsx');
  const [sheets, setSheets] = useState<Sheet[]>(() => cloneSheets(DEFAULT_WORKBOOK_SHEETS));
  const [activeSheetId, setActiveSheetId] = useState<string>(DEFAULT_WORKBOOK_SHEETS[0].id);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  // Undo / redo. Snapshots are cloned so a later mutation cannot reach back
  // into a stored state.
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [lastAction, setLastAction] = useState<string>('Opened workbook');

  const commit = useCallback(
    (label: string, mutate: (sheets: Sheet[]) => Sheet[]) => {
      setPast((prev) => {
        const entry: HistoryEntry = { sheets: cloneSheets(sheets), activeSheetId, label };
        // Bounded so a long editing session cannot grow memory without limit.
        const next = [...prev, entry];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
      setFuture([]);
      setLastAction(label);
      setSheets((prev) => mutate(prev));
    },
    [sheets, activeSheetId]
  );

  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const entry = prevPast[prevPast.length - 1];
      setFuture((prevFuture) => [
        { sheets: cloneSheets(sheets), activeSheetId, label: entry.label },
        ...prevFuture,
      ]);
      setSheets(entry.sheets);
      setActiveSheetId(entry.activeSheetId);
      setLastAction(`Undo: ${entry.label}`);
      return prevPast.slice(0, -1);
    });
  }, [sheets, activeSheetId]);

  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const entry = prevFuture[0];
      setPast((prevPast) => [...prevPast, { sheets: cloneSheets(sheets), activeSheetId, label: entry.label }]);
      setSheets(entry.sheets);
      setActiveSheetId(entry.activeSheetId);
      setLastAction(`Redo: ${entry.label}`);
      return prevFuture.slice(1);
    });
  }, [sheets, activeSheetId]);

  /** Mutates the active sheet's cell map. */
  const mutateActiveData = useCallback(
    (label: string, updater: (data: Record<string, CellData>) => void) => {
      commit(label, (prev) =>
        prev.map((sheet) => {
          if (sheet.id !== activeSheetId) return sheet;
          const data = { ...sheet.data };
          updater(data);
          return { ...sheet, data };
        })
      );
    },
    [commit, activeSheetId]
  );

  const mutateActiveSheet = useCallback(
    (label: string, updater: (sheet: Sheet) => Sheet) => {
      commit(label, (prev) => prev.map((sheet) => (sheet.id === activeSheetId ? updater(sheet) : sheet)));
    },
    [commit, activeSheetId]
  );

  // ---------------------------------------------------------------------
  // Selection and editing
  // ---------------------------------------------------------------------
  const [selection, setSelection] = useState<Selection>({
    anchorCol: 0, anchorRow: 0, focusCol: 0, focusRow: 0,
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formulaDraft, setFormulaDraft] = useState('');
  const [formulaFocused, setFormulaFocused] = useState(false);

  const selectedRange = useMemo(() => normalizeSelection(selection), [selection]);
  const selectedRangeStr = useMemo(() => selectionToA1(selection), [selection]);
  const activeCellKey = coordsToCellKey(selection.focusCol, selection.focusRow);

  // The formula bar mirrors the active cell unless the user is typing in it.
  // The old version wrote to the cell on every keystroke, so a half-typed
  // formula was saved and re-evaluated on each character.
  useEffect(() => {
    if (formulaFocused || editingKey) return;
    setFormulaDraft(activeSheet.data[activeCellKey]?.value ?? '');
  }, [activeCellKey, activeSheet.data, formulaFocused, editingKey]);

  // ---------------------------------------------------------------------
  // Evaluation
  // ---------------------------------------------------------------------

  /**
   * One evaluation cache per data snapshot: a cell referenced by many formulas
   * is computed once per render pass rather than once per reference.
   */
  const evalCache = useMemo(() => new Map<string, CellValue>(), [activeSheet.data]);

  const evaluateKey = useCallback(
    (key: string): CellValue => {
      if (evalCache.has(key)) return evalCache.get(key)!;
      const raw = activeSheet.data[key]?.value ?? '';
      const value = evaluateCell(raw, activeSheet.data, key, evalCache);
      evalCache.set(key, value);
      return value;
    },
    [activeSheet.data, evalCache]
  );

  // ---------------------------------------------------------------------
  // Conditional formatting, comments, collaboration
  // ---------------------------------------------------------------------
  const [conditionalRules, setConditionalRules] = useState<ConditionalRule[]>([
    {
      id: 'rule_1',
      type: 'greaterThan',
      value: '150000',
      range: 'E4:E8',
      style: { bgColor: '#dcfce7', color: '#15803d', bold: true },
    },
  ]);
  const [showConditionalModal, setShowConditionalModal] = useState(false);
  const [showChartStudio, setShowChartStudio] = useState(false);
  const [embeddedCharts, setEmbeddedCharts] = useState<ChartConfig[]>([]);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [versionSnapshots, setVersionSnapshots] = useState<VersionSnapshot[]>([
    {
      id: 'snap_now',
      title: 'Current Live Version',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'You',
      sheets: DEFAULT_WORKBOOK_SHEETS,
    },
  ]);
  const [isCollabActive, setIsCollabActive] = useState(true);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([
    { id: 'peer_1', name: 'Alex M.', color: '#3b82f6', cellKey: 'B4', sheetId: activeSheetId },
    { id: 'peer_2', name: 'Maya S.', color: '#8b5cf6', cellKey: 'D5', sheetId: activeSheetId },
  ]);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    if (!isCollabActive) return;
    const interval = setInterval(() => {
      setPeerCursors((prev) =>
        prev.map((peer) => ({
          ...peer,
          cellKey: coordsToCellKey(Math.floor(Math.random() * 6), Math.floor(Math.random() * 8) + 3),
        }))
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [isCollabActive]);

  // Conditional rules, resolved to the cells they touch once per change.
  const conditionalIndex = useMemo(() => {
    const index = new Map<string, ConditionalRule[]>();
    for (const rule of conditionalRules) {
      for (const key of getRangeCellKeys(rule.range)) {
        const list = index.get(key);
        if (list) list.push(rule);
        else index.set(key, [rule]);
      }
    }
    return index;
  }, [conditionalRules]);

  // ---------------------------------------------------------------------
  // Cell rendering for the grid
  // ---------------------------------------------------------------------
  const getCell = useCallback(
    (col: number, row: number): RenderedCell => {
      const key = coordsToCellKey(col, row);
      const cell = activeSheet.data[key];

      if (!cell || (cell.value === '' && !cell.style && !cell.comment)) {
        return { text: '', numeric: false, hasComment: false, isError: false };
      }

      const value = evaluateKey(key);
      const errored = isFormulaError(value);
      const text = errored
        ? value.code
        : formatCellValue(value, cell.style?.format as NumberFormat | undefined);

      let overrideBg: string | undefined;
      let overrideColor: string | undefined;
      let overrideBold: boolean | undefined;

      const rules = conditionalIndex.get(key);
      if (rules) {
        for (const rule of rules) {
          const numeric = typeof value === 'number' ? value : Number(cellValueToText(value));
          const target = Number(rule.value);
          const plain = cellValueToText(value);
          let match = false;
          if (rule.type === 'greaterThan') match = !Number.isNaN(numeric) && numeric > target;
          else if (rule.type === 'lessThan') match = !Number.isNaN(numeric) && numeric < target;
          else if (rule.type === 'equals') match = plain === String(rule.value);
          else if (rule.type === 'contains') {
            match = plain.toLowerCase().includes(String(rule.value).toLowerCase());
          }
          if (match && rule.style) {
            if (rule.style.bgColor) overrideBg = rule.style.bgColor;
            if (rule.style.color) overrideColor = rule.style.color;
            if (rule.style.bold) overrideBold = true;
          }
        }
      }

      return {
        text,
        style: cell.style,
        numeric: isNumericValue(value) && !cell.style?.align,
        hasComment: Boolean(cell.comment),
        isError: errored,
        overrideBg,
        overrideColor,
        overrideBold,
      };
    },
    [activeSheet.data, evaluateKey, conditionalIndex]
  );

  // ---------------------------------------------------------------------
  // Editing
  // ---------------------------------------------------------------------
  const startEdit = useCallback(
    (key: string, initial?: string) => {
      setEditingKey(key);
      setEditValue(initial !== undefined ? initial : activeSheet.data[key]?.value ?? '');
    },
    [activeSheet.data]
  );

  const writeCell = useCallback(
    (key: string, value: string, label = 'Edit cell') => {
      mutateActiveData(label, (data) => {
        const existing = data[key];
        if (value === '' && !existing?.style && !existing?.comment) {
          delete data[key];
        } else {
          data[key] = { ...(existing || { value: '' }), value };
        }
      });
    },
    [mutateActiveData]
  );

  const moveSelection = useCallback(
    (deltaCol: number, deltaRow: number, extend = false) => {
      setSelection((prev) => {
        const focusCol = Math.max(0, Math.min(TOTAL_COLS - 1, prev.focusCol + deltaCol));
        const focusRow = Math.max(0, Math.min(TOTAL_ROWS - 1, prev.focusRow + deltaRow));
        return extend
          ? { ...prev, focusCol, focusRow }
          : { anchorCol: focusCol, anchorRow: focusRow, focusCol, focusRow };
      });
    },
    []
  );

  // Guards against a double commit: clicking another cell fires both the grid's
  // selection handler and the editor's blur handler in the same tick, and both
  // saw the same non-null `editingKey` from the render closure.
  const committingRef = useRef(false);

  const commitEdit = useCallback(
    (move: 'down' | 'right' | 'up' | 'left' | 'none') => {
      if (!editingKey || committingRef.current) return;
      committingRef.current = true;
      queueMicrotask(() => {
        committingRef.current = false;
      });
      const key = editingKey;
      const value = editValue;
      setEditingKey(null);
      setEditValue('');

      const previous = activeSheet.data[key]?.value ?? '';
      if (previous !== value) writeCell(key, value);

      if (move === 'down') moveSelection(0, 1);
      else if (move === 'up') moveSelection(0, -1);
      else if (move === 'right') moveSelection(1, 0);
      else if (move === 'left') moveSelection(-1, 0);
    },
    [editingKey, editValue, activeSheet.data, writeCell, moveSelection]
  );

  const cancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditValue('');
  }, []);

  // ---------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------
  const [clipboard, setClipboard] = useState<{
    cells: CellData[][];
    cut: boolean;
    sourceRange: ReturnType<typeof normalizeSelection>;
  } | null>(null);

  const copySelection = useCallback(
    (cut: boolean) => {
      const range = selectedRange;
      const cells: CellData[][] = [];
      for (let r = range.minRow; r <= range.maxRow; r++) {
        const row: CellData[] = [];
        for (let c = range.minCol; c <= range.maxCol; c++) {
          const cell = activeSheet.data[coordsToCellKey(c, r)];
          row.push(cell ? { ...cell, style: cell.style ? { ...cell.style } : undefined } : { value: '' });
        }
        cells.push(row);
      }
      setClipboard({ cells, cut, sourceRange: range });

      // Also publish plain text so other applications can receive it.
      const tsv = rangeToTSV(activeSheet.data, range, (key) => {
        const value = evaluateKey(key);
        return isFormulaError(value) ? value.code : cellValueToText(value);
      });
      navigator.clipboard?.writeText(tsv).catch(() => {});
      setLastAction(cut ? `Cut ${selectedRangeStr}` : `Copied ${selectedRangeStr}`);
    },
    [selectedRange, activeSheet.data, evaluateKey, selectedRangeStr]
  );

  /** Shifts A1-style references in a formula by a row/column offset. */
  const offsetFormula = useCallback((formula: string, deltaCol: number, deltaRow: number): string => {
    return formula.replace(/(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})/g, (match, colAbs, colLetters, rowAbs, rowDigits) => {
      const coords = cellKeyToCoords(`${colLetters}${rowDigits}`);
      if (!coords) return match;
      const col = colAbs ? coords.col : coords.col + deltaCol;
      const row = rowAbs ? coords.row : coords.row + deltaRow;
      if (col < 0 || row < 0 || col >= TOTAL_COLS || row >= TOTAL_ROWS) return '#REF!';
      return `${colAbs}${colIndexToLetter(col)}${rowAbs}${row + 1}`;
    });
  }, []);

  const pasteAt = useCallback(
    (targetCol: number, targetRow: number) => {
      if (!clipboard) return;
      const { cells, cut, sourceRange } = clipboard;
      const deltaCol = targetCol - sourceRange.minCol;
      const deltaRow = targetRow - sourceRange.minRow;

      mutateActiveData(cut ? 'Cut and paste' : 'Paste', (data) => {
        if (cut) {
          for (const key of rangeCellKeys(sourceRange)) delete data[key];
        }
        cells.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            const col = targetCol + colIndex;
            const rowPos = targetRow + rowIndex;
            if (col >= TOTAL_COLS || rowPos >= TOTAL_ROWS) return;
            const key = coordsToCellKey(col, rowPos);
            const raw = cell.value ?? '';
            // Relative references follow the paste, as they do in Excel;
            // a cut keeps them pointing at the original cells.
            const value = !cut && raw.startsWith('=') ? offsetFormula(raw, deltaCol, deltaRow) : raw;
            if (value === '' && !cell.style && !cell.comment) delete data[key];
            else data[key] = { ...cell, value };
          });
        });
      });

      setSelection({
        anchorCol: targetCol,
        anchorRow: targetRow,
        focusCol: Math.min(TOTAL_COLS - 1, targetCol + (cells[0]?.length ?? 1) - 1),
        focusRow: Math.min(TOTAL_ROWS - 1, targetRow + cells.length - 1),
      });
      if (cut) setClipboard(null);
    },
    [clipboard, mutateActiveData, offsetFormula]
  );

  /** Paste from the system clipboard when it holds text we did not put there. */
  const pasteFromSystem = useCallback(
    async (targetCol: number, targetRow: number) => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        const rows = parseTSV(text);
        if (rows.length === 0) return;
        mutateActiveData('Paste', (data) => {
          rows.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
              const col = targetCol + colIndex;
              const rowPos = targetRow + rowIndex;
              if (col >= TOTAL_COLS || rowPos >= TOTAL_ROWS) return;
              const key = coordsToCellKey(col, rowPos);
              if (value === '') delete data[key];
              else data[key] = { ...(data[key] || { value: '' }), value };
            });
          });
        });
        setSelection({
          anchorCol: targetCol,
          anchorRow: targetRow,
          focusCol: Math.min(TOTAL_COLS - 1, targetCol + (rows[0]?.length ?? 1) - 1),
          focusRow: Math.min(TOTAL_ROWS - 1, targetRow + rows.length - 1),
        });
      } catch {
        // Clipboard read denied; the in-app clipboard still works.
      }
    },
    [mutateActiveData]
  );

  const clearSelection = useCallback(
    (mode: 'content' | 'format' | 'all') => {
      mutateActiveData(mode === 'format' ? 'Clear formatting' : 'Clear cells', (data) => {
        for (const key of rangeCellKeys(selectedRange)) {
          const cell = data[key];
          if (!cell) continue;
          if (mode === 'all') delete data[key];
          else if (mode === 'content') {
            if (cell.style || cell.comment) data[key] = { ...cell, value: '' };
            else delete data[key];
          } else {
            const { style, ...rest } = cell;
            if (!rest.value && !rest.comment) delete data[key];
            else data[key] = rest;
          }
        }
      });
    },
    [mutateActiveData, selectedRange]
  );

  // ---------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------
  const activeCellStyle = activeSheet.data[activeCellKey]?.style;

  const applyStyle = useCallback(
    (patch: Partial<CellStyle>, label = 'Format cells') => {
      mutateActiveData(label, (data) => {
        for (const key of rangeCellKeys(selectedRange)) {
          const existing = data[key] || { value: '' };
          data[key] = { ...existing, style: { ...existing.style, ...patch } };
        }
      });
    },
    [mutateActiveData, selectedRange]
  );

  const toggleStyle = useCallback(
    (property: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'wrapText') => {
      const next = !activeCellStyle?.[property];
      applyStyle({ [property]: next }, next ? `Apply ${property}` : `Remove ${property}`);
    },
    [activeCellStyle, applyStyle]
  );

  const applyBorder = useCallback(
    (kind: 'all' | 'outer' | 'none' | 'bottom' | 'top') => {
      const range = selectedRange;
      mutateActiveData('Apply borders', (data) => {
        for (let r = range.minRow; r <= range.maxRow; r++) {
          for (let c = range.minCol; c <= range.maxCol; c++) {
            const key = coordsToCellKey(c, r);
            const existing = data[key] || { value: '' };
            let border: CellStyle['border'];
            if (kind === 'none') border = undefined;
            else if (kind === 'all') border = { top: true, bottom: true, left: true, right: true, color: '#94a3b8' };
            else if (kind === 'bottom') border = { ...existing.style?.border, bottom: true, color: '#334155' };
            else if (kind === 'top') border = { ...existing.style?.border, top: true, color: '#334155' };
            else {
              // Outer: only edges of the selection get a line.
              border = {
                top: r === range.minRow,
                bottom: r === range.maxRow,
                left: c === range.minCol,
                right: c === range.maxCol,
                color: '#334155',
              };
            }
            data[key] = { ...existing, style: { ...existing.style, border } };
          }
        }
      });
    },
    [mutateActiveData, selectedRange]
  );

  // ---------------------------------------------------------------------
  // Column and row sizing
  // ---------------------------------------------------------------------
  const resizeColumn = useCallback(
    (col: number, width: number) => {
      // Sizing during a drag must not push an entry onto the undo stack per
      // pixel, so it writes state directly; the drag start records history.
      setSheets((prev) =>
        prev.map((sheet) =>
          sheet.id === activeSheetId
            ? { ...sheet, colWidths: { ...sheet.colWidths, [col]: width } }
            : sheet
        )
      );
    },
    [activeSheetId]
  );

  const resizeRow = useCallback(
    (row: number, height: number) => {
      setSheets((prev) =>
        prev.map((sheet) =>
          sheet.id === activeSheetId
            ? { ...sheet, rowHeights: { ...sheet.rowHeights, [row]: height } }
            : sheet
        )
      );
    },
    [activeSheetId]
  );

  /** Widens a column to its longest rendered value. */
  const autoFitColumn = useCallback(
    (col: number) => {
      let widest = 60;
      const used = getUsedRange(activeSheet.data);
      for (let row = used.minRow; row <= used.maxRow; row++) {
        const cell = getCell(col, row);
        if (!cell.text) continue;
        const fontSize = cell.style?.fontSize || 11;
        const estimate = cell.text.length * fontSize * 0.62 + 18;
        widest = Math.max(widest, estimate);
      }
      mutateActiveSheet('Auto-fit column', (sheet) => ({
        ...sheet,
        colWidths: { ...sheet.colWidths, [col]: Math.min(420, Math.round(widest)) },
      }));
    },
    [activeSheet.data, getCell, mutateActiveSheet]
  );

  const insertRows = useCallback(
    (at: number, count = 1) => {
      mutateActiveData(`Insert ${count} row${count > 1 ? 's' : ''}`, (data) => {
        const entries = Object.entries(data).sort((a, b) => {
          const rowA = cellKeyToCoords(a[0])?.row ?? 0;
          const rowB = cellKeyToCoords(b[0])?.row ?? 0;
          return rowB - rowA;
        });
        for (const [key, cell] of entries) {
          const coords = cellKeyToCoords(key);
          if (!coords || coords.row < at) continue;
          delete data[key];
          if (coords.row + count < TOTAL_ROWS) {
            data[coordsToCellKey(coords.col, coords.row + count)] = cell;
          }
        }
      });
    },
    [mutateActiveData]
  );

  const deleteRows = useCallback(
    (at: number, count = 1) => {
      mutateActiveData(`Delete ${count} row${count > 1 ? 's' : ''}`, (data) => {
        const entries = Object.entries(data).sort((a, b) => {
          const rowA = cellKeyToCoords(a[0])?.row ?? 0;
          const rowB = cellKeyToCoords(b[0])?.row ?? 0;
          return rowA - rowB;
        });
        for (const [key, cell] of entries) {
          const coords = cellKeyToCoords(key);
          if (!coords || coords.row < at) continue;
          delete data[key];
          if (coords.row >= at + count) {
            data[coordsToCellKey(coords.col, coords.row - count)] = cell;
          }
        }
      });
    },
    [mutateActiveData]
  );

  const insertColumns = useCallback(
    (at: number, count = 1) => {
      mutateActiveData(`Insert ${count} column${count > 1 ? 's' : ''}`, (data) => {
        const entries = Object.entries(data).sort((a, b) => {
          const colA = cellKeyToCoords(a[0])?.col ?? 0;
          const colB = cellKeyToCoords(b[0])?.col ?? 0;
          return colB - colA;
        });
        for (const [key, cell] of entries) {
          const coords = cellKeyToCoords(key);
          if (!coords || coords.col < at) continue;
          delete data[key];
          if (coords.col + count < TOTAL_COLS) {
            data[coordsToCellKey(coords.col + count, coords.row)] = cell;
          }
        }
      });
    },
    [mutateActiveData]
  );

  const deleteColumns = useCallback(
    (at: number, count = 1) => {
      mutateActiveData(`Delete ${count} column${count > 1 ? 's' : ''}`, (data) => {
        const entries = Object.entries(data).sort((a, b) => {
          const colA = cellKeyToCoords(a[0])?.col ?? 0;
          const colB = cellKeyToCoords(b[0])?.col ?? 0;
          return colA - colB;
        });
        for (const [key, cell] of entries) {
          const coords = cellKeyToCoords(key);
          if (!coords || coords.col < at) continue;
          delete data[key];
          if (coords.col >= at + count) {
            data[coordsToCellKey(coords.col - count, coords.row)] = cell;
          }
        }
      });
    },
    [mutateActiveData]
  );

  // ---------------------------------------------------------------------
  // Sort and filter
  // ---------------------------------------------------------------------
  const [hasHeaderRow, setHasHeaderRow] = useState(true);

  const sortRange = useCallback(
    (direction: 'asc' | 'desc') => {
      const range = selectedRange;
      // A single cell means "sort the block this cell sits in".
      const target =
        range.minRow === range.maxRow && range.minCol === range.maxCol
          ? getUsedRange(activeSheet.data)
          : range;
      const sortCol = range.minCol;
      const firstDataRow = hasHeaderRow && target.minRow === getUsedRange(activeSheet.data).minRow
        ? target.minRow + 1
        : target.minRow;

      if (firstDataRow >= target.maxRow) return;

      mutateActiveData(`Sort ${direction === 'asc' ? 'A→Z' : 'Z→A'}`, (data) => {
        const rows: { cells: (CellData | undefined)[]; sortValue: CellValue }[] = [];
        for (let r = firstDataRow; r <= target.maxRow; r++) {
          const cells: (CellData | undefined)[] = [];
          for (let c = target.minCol; c <= target.maxCol; c++) {
            cells.push(data[coordsToCellKey(c, r)]);
          }
          rows.push({ cells, sortValue: evaluateKey(coordsToCellKey(sortCol, r)) });
        }

        rows.sort((a, b) => {
          const left = a.sortValue;
          const right = b.sortValue;
          const leftEmpty = left === '' || left === undefined;
          const rightEmpty = right === '' || right === undefined;
          // Blanks always sink, regardless of direction, as in Excel.
          if (leftEmpty && rightEmpty) return 0;
          if (leftEmpty) return 1;
          if (rightEmpty) return -1;

          let result: number;
          if (typeof left === 'number' && typeof right === 'number') result = left - right;
          else {
            result = cellValueToText(left).localeCompare(cellValueToText(right), undefined, {
              numeric: true,
              sensitivity: 'base',
            });
          }
          return direction === 'asc' ? result : -result;
        });

        rows.forEach((row, rowIndex) => {
          row.cells.forEach((cell, colIndex) => {
            const key = coordsToCellKey(target.minCol + colIndex, firstDataRow + rowIndex);
            if (cell) data[key] = cell;
            else delete data[key];
          });
        });
      });
    },
    [selectedRange, activeSheet.data, hasHeaderRow, mutateActiveData, evaluateKey]
  );

  const [filterQuery, setFilterQuery] = useState('');
  const [filterColumn, setFilterColumn] = useState<number | null>(null);

  const hiddenRows = useMemo(() => {
    if (filterColumn === null || !filterQuery.trim()) return undefined;
    const used = getUsedRange(activeSheet.data);
    const query = filterQuery.trim().toLowerCase();
    const hidden = new Set<number>();
    const firstDataRow = hasHeaderRow ? used.minRow + 1 : used.minRow;
    for (let row = firstDataRow; row <= used.maxRow; row++) {
      const value = evaluateKey(coordsToCellKey(filterColumn, row));
      if (!cellValueToText(value).toLowerCase().includes(query)) hidden.add(row);
    }
    return hidden;
  }, [filterColumn, filterQuery, activeSheet.data, evaluateKey, hasHeaderRow]);

  // ---------------------------------------------------------------------
  // Find and replace
  // ---------------------------------------------------------------------
  const [showFindPanel, setShowFindPanel] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [findIndex, setFindIndex] = useState(0);

  const findMatches = useMemo(() => {
    const query = findQuery.trim();
    if (!query) return [];
    const needle = matchCase ? query : query.toLowerCase();
    const used = getUsedRange(activeSheet.data);
    const matches: string[] = [];
    for (let row = used.minRow; row <= used.maxRow; row++) {
      for (let col = used.minCol; col <= used.maxCol; col++) {
        const key = coordsToCellKey(col, row);
        const cell = activeSheet.data[key];
        if (!cell?.value) continue;
        const displayed = cellValueToText(evaluateKey(key));
        const haystackRaw = matchCase ? cell.value : cell.value.toLowerCase();
        const haystackShown = matchCase ? displayed : displayed.toLowerCase();
        if (haystackRaw.includes(needle) || haystackShown.includes(needle)) matches.push(key);
      }
    }
    return matches;
  }, [findQuery, matchCase, activeSheet.data, evaluateKey]);

  const highlightKeys = useMemo(() => new Set(findMatches), [findMatches]);
  const activeHighlightKey = findMatches.length ? findMatches[findIndex % findMatches.length] : null;

  useEffect(() => setFindIndex(0), [findQuery, matchCase]);

  // Move the selection onto the current match.
  useEffect(() => {
    if (!showFindPanel || !activeHighlightKey) return;
    const coords = cellKeyToCoords(activeHighlightKey);
    if (!coords) return;
    setSelection({
      anchorCol: coords.col, anchorRow: coords.row,
      focusCol: coords.col, focusRow: coords.row,
    });
  }, [activeHighlightKey, showFindPanel]);

  const replaceCurrent = useCallback(() => {
    if (!activeHighlightKey || !findQuery) return;
    const cell = activeSheet.data[activeHighlightKey];
    if (!cell) return;
    const pattern = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? '' : 'i');
    writeCell(activeHighlightKey, cell.value.replace(pattern, replaceValue), 'Replace');
    setFindIndex((prev) => prev + 1);
  }, [activeHighlightKey, findQuery, replaceValue, matchCase, activeSheet.data, writeCell]);

  const replaceAll = useCallback(() => {
    if (!findQuery || findMatches.length === 0) return;
    const pattern = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
    const keys = [...findMatches];
    mutateActiveData(`Replace all (${keys.length})`, (data) => {
      for (const key of keys) {
        const cell = data[key];
        if (!cell) continue;
        data[key] = { ...cell, value: cell.value.replace(pattern, replaceValue) };
      }
    });
  }, [findQuery, findMatches, replaceValue, matchCase, mutateActiveData]);

  // ---------------------------------------------------------------------
  // Frozen panes
  // ---------------------------------------------------------------------
  const [frozenCols, setFrozenCols] = useState(0);
  const [frozenRows, setFrozenRows] = useState(0);

  const freezeAtSelection = useCallback(() => {
    if (frozenRows > 0 || frozenCols > 0) {
      setFrozenRows(0);
      setFrozenCols(0);
      setLastAction('Unfroze panes');
    } else {
      setFrozenRows(selection.focusRow);
      setFrozenCols(selection.focusCol);
      setLastAction(`Froze ${selection.focusRow} rows, ${selection.focusCol} columns`);
    }
  }, [frozenRows, frozenCols, selection.focusRow, selection.focusCol]);

  // ---------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typingElsewhere =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const mod = event.ctrlKey || event.metaKey;

      // Shortcuts that work even while a field has focus.
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setShowFindPanel(true);
        return;
      }
      if (mod && event.key.toLowerCase() === 'z' && !typingElsewhere) {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
      }
      if (mod && event.key.toLowerCase() === 'y' && !typingElsewhere) {
        event.preventDefault();
        redo();
        return;
      }

      if (typingElsewhere) return;

      if (mod) {
        switch (event.key.toLowerCase()) {
          case 'c': event.preventDefault(); copySelection(false); return;
          case 'x': event.preventDefault(); copySelection(true); return;
          case 'v':
            event.preventDefault();
            if (clipboard) pasteAt(selectedRange.minCol, selectedRange.minRow);
            else pasteFromSystem(selectedRange.minCol, selectedRange.minRow);
            return;
          case 'b': event.preventDefault(); toggleStyle('bold'); return;
          case 'i': event.preventDefault(); toggleStyle('italic'); return;
          case 'u': event.preventDefault(); toggleStyle('underline'); return;
          case 'a':
            event.preventDefault();
            setSelection({ anchorCol: 0, anchorRow: 0, focusCol: TOTAL_COLS - 1, focusRow: TOTAL_ROWS - 1 });
            return;
          case 'arrowdown':
          case 'arrowup':
          case 'arrowleft':
          case 'arrowright': {
            // Jump to the edge of the data block, as Ctrl+Arrow does in Excel.
            event.preventDefault();
            const used = getUsedRange(activeSheet.data);
            const map = {
              arrowdown: { col: selection.focusCol, row: used.maxRow },
              arrowup: { col: selection.focusCol, row: used.minRow },
              arrowleft: { col: used.minCol, row: selection.focusRow },
              arrowright: { col: used.maxCol, row: selection.focusRow },
            } as const;
            const destination = map[event.key.toLowerCase() as keyof typeof map];
            setSelection((prev) =>
              event.shiftKey
                ? { ...prev, focusCol: destination.col, focusRow: destination.row }
                : {
                    anchorCol: destination.col, anchorRow: destination.row,
                    focusCol: destination.col, focusRow: destination.row,
                  }
            );
            return;
          }
        }
        return;
      }

      switch (event.key) {
        case 'ArrowUp': event.preventDefault(); moveSelection(0, -1, event.shiftKey); return;
        case 'ArrowDown': event.preventDefault(); moveSelection(0, 1, event.shiftKey); return;
        case 'ArrowLeft': event.preventDefault(); moveSelection(-1, 0, event.shiftKey); return;
        case 'ArrowRight': event.preventDefault(); moveSelection(1, 0, event.shiftKey); return;
        case 'Tab': event.preventDefault(); moveSelection(event.shiftKey ? -1 : 1, 0); return;
        case 'Enter': event.preventDefault(); moveSelection(0, event.shiftKey ? -1 : 1); return;
        case 'PageDown': event.preventDefault(); moveSelection(0, 20, event.shiftKey); return;
        case 'PageUp': event.preventDefault(); moveSelection(0, -20, event.shiftKey); return;
        case 'Home':
          event.preventDefault();
          setSelection((prev) => ({ ...prev, anchorCol: 0, focusCol: 0 }));
          return;
        case 'F2':
          event.preventDefault();
          startEdit(activeCellKey);
          return;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          clearSelection('content');
          return;
        case 'Escape':
          setShowFindPanel(false);
          return;
      }

      // Any printable character starts an edit, replacing the cell.
      if (event.key.length === 1 && !event.altKey) {
        event.preventDefault();
        startEdit(activeCellKey, event.key);
      }
    };

    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [
    undo, redo, copySelection, pasteAt, pasteFromSystem, clipboard, selectedRange,
    toggleStyle, moveSelection, startEdit, activeCellKey, clearSelection,
    activeSheet.data, selection.focusCol, selection.focusRow,
  ]);

  // ---------------------------------------------------------------------
  // Sheets
  // ---------------------------------------------------------------------
  const [editingSheetTabId, setEditingSheetTabId] = useState<string | null>(null);
  const [sheetTabNameInput, setSheetTabNameInput] = useState('');

  const addSheet = () => {
    const id = `sheet_${Date.now()}`;
    commit('Add sheet', (prev) => [...prev, { id, name: `Sheet ${prev.length + 1}`, data: {} }]);
    setActiveSheetId(id);
  };

  const duplicateSheet = (sheetId: string) => {
    const target = sheets.find((s) => s.id === sheetId);
    if (!target) return;
    const id = `sheet_${Date.now()}`;
    commit('Duplicate sheet', (prev) => [
      ...prev,
      { ...cloneSheets([target])[0], id, name: `${target.name} (Copy)` },
    ]);
    setActiveSheetId(id);
  };

  const deleteSheet = (sheetId: string) => {
    if (sheets.length <= 1) {
      window.alert('A workbook must keep at least one sheet.');
      return;
    }
    if (!window.confirm('Delete this sheet? This can be undone with Ctrl+Z.')) return;
    const remaining = sheets.filter((s) => s.id !== sheetId);
    commit('Delete sheet', () => remaining);
    if (activeSheetId === sheetId) setActiveSheetId(remaining[0].id);
  };

  // ---------------------------------------------------------------------
  // Import / export
  // ---------------------------------------------------------------------
  const setFiles = useSystemStore((state) => state.setFiles);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);

  /** Exports the real data extent instead of a fixed 30x15 window. */
  const sheetToRows = useCallback((sheet: Sheet): string[][] => {
    const used = getUsedRange(sheet.data);
    const rows: string[][] = [];
    for (let r = used.minRow; r <= used.maxRow; r++) {
      const row: string[] = [];
      for (let c = used.minCol; c <= used.maxCol; c++) {
        const key = coordsToCellKey(c, r);
        const cell = sheet.data[key];
        if (!cell?.value) {
          row.push('');
          continue;
        }
        row.push(
          cell.value.startsWith('=') ? evaluateFormula(cell.value, sheet.data) : cell.value
        );
      }
      rows.push(row);
    }
    return rows;
  }, []);

  const exportXLSX = () => {
    const workbook = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheetToRows(sheet));
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    });
    XLSX.writeFile(workbook, workbookTitle.endsWith('.xlsx') ? workbookTitle : `${workbookTitle}.xlsx`);
    setLastAction('Exported .xlsx');
  };

  const exportCSV = () => {
    const csv = sheetToRows(activeSheet)
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSheet.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setLastAction('Exported .csv');
  };

  const exportPDF = () => {
    const pdf = new jsPDF('landscape', 'pt', 'a4');
    pdf.setFontSize(15);
    pdf.text(workbookTitle, 40, 40);
    pdf.setFontSize(10);
    pdf.text(`Sheet: ${activeSheet.name}`, 40, 58);

    const rows = sheetToRows(activeSheet);
    let y = 84;
    pdf.setFontSize(8);
    for (const row of rows) {
      pdf.text(row.map((cell) => cell.padEnd(15, ' ').slice(0, 15)).join(' | '), 40, y);
      y += 14;
      if (y > 540) {
        pdf.addPage();
        y = 50;
      }
    }
    pdf.save(`${activeSheet.name}.pdf`);
    setLastAction('Exported .pdf');
  };

  const saveToDisk = () => {
    setFiles((prev) => [
      ...prev,
      {
        id: `file_sheet_${Date.now()}`,
        name: workbookTitle,
        type: 'file',
        content: JSON.stringify(sheets, null, 2),
        parentId: resolveDefaultFolderId('Documents') || null,
        createdAt: new Date().toLocaleDateString(),
      },
    ]);
    setLastAction(`Saved ${workbookTitle} to Documents`);
  };

  const importFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loaded) => {
      try {
        const workbook = XLSX.read(loaded.target?.result, { type: 'binary' });
        const imported: Sheet[] = workbook.SheetNames.map((name, index) => {
          const worksheet = workbook.Sheets[name];
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false });
          const data: Record<string, CellData> = {};
          rows.forEach((row, rowIndex) => {
            row?.forEach((value, colIndex) => {
              if (value === undefined || value === null || value === '') return;
              data[coordsToCellKey(colIndex, rowIndex)] = { value: String(value) };
            });
          });
          return { id: `sheet_imp_${index}_${Date.now()}`, name, data };
        });
        if (imported.length) {
          commit('Import workbook', () => imported);
          setActiveSheetId(imported[0].id);
          setWorkbookTitle(file.name);
        }
      } catch {
        window.alert('That file could not be read as a spreadsheet.');
      }
    };
    reader.readAsBinaryString(file);
    event.target.value = '';
  };

  // ---------------------------------------------------------------------
  // Status bar statistics
  // ---------------------------------------------------------------------
  const selectionStats = useMemo(() => {
    const keys = rangeCellKeys(selectedRange);
    // Guard against a whole-column selection turning the status bar into a
    // full-sheet scan on every render.
    if (keys.length > 20000) return { count: 0, numeric: 0, sum: 0, average: 0, truncated: true };
    let sum = 0;
    let numeric = 0;
    let filled = 0;
    for (const key of keys) {
      const cell = activeSheet.data[key];
      if (!cell?.value) continue;
      filled++;
      const value = evaluateKey(key);
      if (typeof value === 'number') {
        sum += value;
        numeric++;
      }
    }
    return {
      count: filled,
      numeric,
      sum,
      average: numeric ? sum / numeric : 0,
      truncated: false,
    };
  }, [selectedRange, activeSheet.data, evaluateKey]);

  // ---------------------------------------------------------------------
  // Responsive chrome
  // ---------------------------------------------------------------------
  const [containerWidth, setContainerWidth] = useState(1000);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const isCompact = containerWidth < 900;
  const isTight = containerWidth < 640;
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [openPicker, setOpenPicker] = useState<'text' | 'fill' | 'border' | 'function' | null>(null);

  const insertFunction = (name: string) => {
    // Pre-fill a range only when one is actually selected, otherwise the
    // formula would reference its own cell and report a circular error.
    const multiCell =
      selectedRange.minCol !== selectedRange.maxCol || selectedRange.minRow !== selectedRange.maxRow;
    const argument = multiCell && RANGE_FUNCTIONS.has(name) ? selectedRangeStr : '';
    const formula = `=${name}(${argument})`;
    startEdit(activeCellKey, formula);
    setOpenPicker(null);
  };

  // ---------------------------------------------------------------------
  // Context menu
  // ---------------------------------------------------------------------
  const [contextMenu, setContextMenu] = useState<
    { x: number; y: number; type: 'cell' | 'col' | 'row'; index: number } | null
  >(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const addComment = () => {
    if (!commentInput.trim()) return;
    const comment: CellComment = {
      id: `comment_${Date.now()}`,
      author: 'You',
      text: commentInput.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    mutateActiveData('Add comment', (data) => {
      const existing = data[activeCellKey] || { value: '' };
      data[activeCellKey] = { ...existing, comment };
    });
    setCommentInput('');
  };

  const commentedCells = useMemo(
    () => Object.entries(activeSheet.data).filter(([, cell]) => cell.comment),
    [activeSheet.data]
  );

  // ---------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------
  const toolbarButton = (
    active: boolean,
    onClick: () => void,
    title: string,
    icon: React.ReactNode
  ) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
        active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-700 hover:bg-slate-200'
      }`}
    >
      {icon}
    </button>
  );

  const numberFormatButtons: { format: NumberFormat; icon: React.ReactNode; title: string }[] = [
    { format: 'currency', icon: <DollarSign size={14} />, title: 'Currency' },
    { format: 'percent', icon: <Percent size={14} />, title: 'Percent' },
    { format: 'number', icon: <HashIcon size={14} />, title: 'Number with separators' },
  ];

  useAppMenu('spreadsheet', [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'open', label: 'Open…', shortcut: 'Ctrl+O', onSelect: () => fileInputRef.current?.click() },
        { id: 'save', label: 'Save to Documents', shortcut: 'Ctrl+S', onSelect: saveToDisk },
        separator(),
        {
          kind: 'submenu', id: 'export', label: 'Export',
          items: [
            { id: 'exp-xlsx', label: 'Excel Workbook (.xlsx)', onSelect: exportXLSX },
            { id: 'exp-csv', label: 'Comma Separated (.csv)', onSelect: exportCSV },
            { id: 'exp-pdf', label: 'PDF Document', onSelect: exportPDF },
          ],
        },
        separator(),
        { id: 'version', label: 'Version History…', onSelect: () => setShowVersionHistoryModal(true) },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', disabled: past.length === 0, onSelect: undo },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', disabled: future.length === 0, onSelect: redo },
        separator(),
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', onSelect: () => copySelection(true) },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', onSelect: () => copySelection(false) },
        {
          kind: 'submenu', id: 'paste-menu', label: 'Paste',
          items: [
            { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', onSelect: () => (clipboard ? pasteAt(selectedRange.minCol, selectedRange.minRow) : pasteFromSystem(selectedRange.minCol, selectedRange.minRow)) },
            { id: 'paste-sys', label: 'Paste from System Clipboard', onSelect: () => pasteFromSystem(selectedRange.minCol, selectedRange.minRow) },
          ],
        },
        separator(),
        {
          kind: 'submenu', id: 'clear', label: 'Clear',
          items: [
            { id: 'clear-content', label: 'Contents', shortcut: 'Delete', onSelect: () => clearSelection('content') },
            { id: 'clear-format', label: 'Formatting', onSelect: () => clearSelection('format') },
            { id: 'clear-all', label: 'All', onSelect: () => clearSelection('all') },
          ],
        },
        separator(),
        { id: 'find', label: 'Find and Replace…', shortcut: 'Ctrl+F', onSelect: () => setShowFindPanel(true) },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'freeze',
          label: frozenRows > 0 || frozenCols > 0 ? 'Unfreeze Panes' : 'Freeze Panes at Selection',
          onSelect: freezeAtSelection,
        },
        separator(),
        { id: 'show-find', label: 'Find Bar', checked: showFindPanel, onSelect: () => setShowFindPanel((p) => !p) },
        { id: 'show-comments', label: 'Comments Panel', checked: commentsDrawerOpen, onSelect: () => setCommentsDrawerOpen((p) => !p) },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      items: [
        { id: 'ins-row-above', label: 'Row Above', onSelect: () => insertRows(selectedRange.minRow) },
        { id: 'ins-row-below', label: 'Row Below', onSelect: () => insertRows(selectedRange.maxRow + 1) },
        { id: 'ins-col-left', label: 'Column Left', onSelect: () => insertColumns(selectedRange.minCol) },
        { id: 'ins-col-right', label: 'Column Right', onSelect: () => insertColumns(selectedRange.maxCol + 1) },
        separator(),
        { id: 'del-row', label: 'Delete Row', danger: true, onSelect: () => deleteRows(selectedRange.minRow, selectedRange.maxRow - selectedRange.minRow + 1) },
        { id: 'del-col', label: 'Delete Column', danger: true, onSelect: () => deleteColumns(selectedRange.minCol, selectedRange.maxCol - selectedRange.minCol + 1) },
        separator(),
        { id: 'ins-chart', label: 'Chart…', onSelect: () => setShowChartStudio(true) },
        { id: 'ins-comment', label: 'Comment', onSelect: () => setCommentsDrawerOpen(true) },
        separator(),
        {
          kind: 'submenu', id: 'ins-function', label: 'Function',
          items: FUNCTION_CATALOG.slice(0, 12).map((fn) => ({
            id: `fn-${fn.name}`, label: `${fn.name} — ${fn.hint}`, onSelect: () => insertFunction(fn.name),
          })),
        },
      ],
    },
    {
      id: 'format',
      label: 'Format',
      items: [
        { id: 'bold', label: 'Bold', shortcut: 'Ctrl+B', checked: !!activeCellStyle?.bold, onSelect: () => toggleStyle('bold') },
        { id: 'italic', label: 'Italic', shortcut: 'Ctrl+I', checked: !!activeCellStyle?.italic, onSelect: () => toggleStyle('italic') },
        { id: 'underline', label: 'Underline', shortcut: 'Ctrl+U', checked: !!activeCellStyle?.underline, onSelect: () => toggleStyle('underline') },
        { id: 'wrap', label: 'Wrap Text', checked: !!activeCellStyle?.wrapText, onSelect: () => toggleStyle('wrapText') },
        separator(),
        {
          kind: 'submenu', id: 'number-format', label: 'Number',
          items: ([
            ['general', 'General'], ['number', 'Number'], ['currency', 'Currency'],
            ['accounting', 'Accounting'], ['percent', 'Percent'], ['scientific', 'Scientific'],
            ['date', 'Date'], ['time', 'Time'], ['text', 'Plain Text'],
          ] as const).map(([format, label]) => ({
            id: `fmt-${format}`, label,
            selected: (activeCellStyle?.format || 'general') === format,
            onSelect: () => applyStyle({ format: format as CellStyle['format'] }, `Format as ${label}`),
          })),
        },
        {
          kind: 'submenu', id: 'align-menu', label: 'Alignment',
          items: (['left', 'center', 'right'] as const).map((align) => ({
            id: `align-${align}`,
            label: align === 'center' ? 'Centre' : align === 'left' ? 'Left' : 'Right',
            selected: activeCellStyle?.align === align,
            onSelect: () => applyStyle({ align }, `Align ${align}`),
          })),
        },
        {
          kind: 'submenu', id: 'borders-menu', label: 'Borders',
          items: ([
            ['all', 'All Borders'], ['outer', 'Outside Border'],
            ['top', 'Top Border'], ['bottom', 'Bottom Border'], ['none', 'No Border'],
          ] as const).map(([kind, label]) => ({
            id: `border-${kind}`, label, onSelect: () => applyBorder(kind),
          })),
        },
        separator(),
        { id: 'conditional', label: 'Conditional Formatting…', onSelect: () => setShowConditionalModal(true) },
      ],
    },
    {
      id: 'data',
      label: 'Data',
      items: [
        { id: 'sort-asc', label: 'Sort A → Z', onSelect: () => sortRange('asc') },
        { id: 'sort-desc', label: 'Sort Z → A', onSelect: () => sortRange('desc') },
        separator(),
        {
          id: 'filter',
          label: filterColumn !== null ? 'Remove Filter' : 'Filter by Selected Column',
          checked: filterColumn !== null,
          onSelect: () => setFilterColumn((prev) => (prev === null ? selection.focusCol : null)),
        },
        { id: 'header-row', label: 'Data Has Header Row', checked: hasHeaderRow, onSelect: () => setHasHeaderRow((p) => !p) },
        separator(),
        { id: 'add-sheet', label: 'New Sheet', onSelect: addSheet },
        { id: 'dup-sheet', label: 'Duplicate Sheet', onSelect: () => duplicateSheet(activeSheetId) },
        { id: 'del-sheet', label: 'Delete Sheet', danger: true, disabled: sheets.length <= 1, onSelect: () => deleteSheet(activeSheetId) },
      ],
    },
  ]);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className="h-full flex flex-col bg-slate-100 font-sans text-slate-800 select-none overflow-hidden outline-none"
    >
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={importFile} className="hidden" />

      {/* ============ 1. TITLE BAR ============ */}
      <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
            <FileSpreadsheet size={16} />
          </div>
          <input
            type="text"
            value={workbookTitle}
            onChange={(e) => setWorkbookTitle(e.target.value)}
            className="bg-transparent text-xs font-bold tracking-wide text-white focus:bg-slate-800 focus:outline-none px-1.5 py-0.5 rounded border border-transparent focus:border-slate-700 min-w-0 flex-1"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {toolbarButton(false, undo, 'Undo (Ctrl+Z)',
            <RotateCcw size={14} className={past.length ? 'text-white' : 'text-slate-600'} />)}
          {toolbarButton(false, redo, 'Redo (Ctrl+Y)',
            <RotateCw size={14} className={future.length ? 'text-white' : 'text-slate-600'} />)}

          {!isTight && (
            <>
              <button onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 rounded text-[11px] font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-1">
                <Upload size={13} /> Open
              </button>
              <button onClick={saveToDisk}
                className="px-2 py-1 rounded text-[11px] font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-1">
                <Download size={13} /> Save
              </button>
            </>
          )}

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowOverflowMenu((p) => !p); }}
              className="p-1.5 rounded hover:bg-slate-800 cursor-pointer"
              title="More"
            >
              <MoreHorizontal size={15} />
            </button>
            {showOverflowMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOverflowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white text-slate-800 rounded-xl border border-slate-200 shadow-2xl z-50 p-1.5 flex flex-col gap-0.5">
                  {[
                    { label: 'Open file…', icon: <Upload size={13} />, action: () => fileInputRef.current?.click() },
                    { label: 'Save to Documents', icon: <Download size={13} />, action: saveToDisk },
                    { label: 'Export .xlsx', icon: <FileSpreadsheet size={13} />, action: exportXLSX },
                    { label: 'Export .csv', icon: <Table size={13} />, action: exportCSV },
                    { label: 'Export .pdf', icon: <Download size={13} />, action: exportPDF },
                    { label: 'Version history', icon: <History size={13} />, action: () => setShowVersionHistoryModal(true) },
                    { label: 'Conditional formatting', icon: <Sparkles size={13} />, action: () => setShowConditionalModal(true) },
                    { label: 'Insert chart', icon: <BarChart2 size={13} />, action: () => setShowChartStudio(true) },
                    { label: commentsDrawerOpen ? 'Hide comments' : 'Show comments', icon: <MessageCircle size={13} />, action: () => setCommentsDrawerOpen((p) => !p) },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { item.action(); setShowOverflowMenu(false); }}
                      className="px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold hover:bg-slate-100 cursor-pointer flex items-center gap-2"
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============ 2. TOOLBAR ============ */}
      <div className="bg-white border-b border-slate-200 px-2 py-1 flex flex-wrap items-center gap-1 shrink-0">
        {/* Font */}
        {!isCompact && (
          <>
            <select
              value={activeCellStyle?.fontFamily || 'Inter'}
              onChange={(e) => applyStyle({ fontFamily: e.target.value }, 'Change font')}
              className="h-7 bg-white border border-slate-300 rounded px-1 text-[11px] font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer w-24"
            >
              {FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
            <select
              value={activeCellStyle?.fontSize || 11}
              onChange={(e) => applyStyle({ fontSize: Number(e.target.value) }, 'Change font size')}
              className="h-7 bg-white border border-slate-300 rounded px-1 text-[11px] font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer w-14"
            >
              {FONT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
          </>
        )}

        {toolbarButton(!!activeCellStyle?.bold, () => toggleStyle('bold'), 'Bold (Ctrl+B)', <Bold size={14} />)}
        {toolbarButton(!!activeCellStyle?.italic, () => toggleStyle('italic'), 'Italic (Ctrl+I)', <Italic size={14} />)}
        {toolbarButton(!!activeCellStyle?.underline, () => toggleStyle('underline'), 'Underline (Ctrl+U)', <Underline size={14} />)}
        {!isTight && toolbarButton(!!activeCellStyle?.strikethrough, () => toggleStyle('strikethrough'), 'Strikethrough', <Strikethrough size={14} />)}

        {/* Colours */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenPicker((p) => (p === 'text' ? null : 'text')); }}
            className="p-1.5 rounded hover:bg-slate-200 cursor-pointer flex flex-col items-center gap-0.5"
            title="Text colour"
          >
            <Type size={13} />
            <span className="w-3.5 h-1 rounded-sm" style={{ backgroundColor: activeCellStyle?.color || '#0f172a' }} />
          </button>
          {openPicker === 'text' && (
            <ColorPicker
              onPick={(color) => { applyStyle({ color }, 'Text colour'); setOpenPicker(null); }}
              onClose={() => setOpenPicker(null)}
            />
          )}
        </div>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenPicker((p) => (p === 'fill' ? null : 'fill')); }}
            className="p-1.5 rounded hover:bg-slate-200 cursor-pointer flex flex-col items-center gap-0.5"
            title="Fill colour"
          >
            <Palette size={13} />
            <span className="w-3.5 h-1 rounded-sm border border-slate-300" style={{ backgroundColor: activeCellStyle?.bgColor || '#ffffff' }} />
          </button>
          {openPicker === 'fill' && (
            <ColorPicker
              includeNone
              onPick={(color) => { applyStyle({ bgColor: color || undefined }, 'Fill colour'); setOpenPicker(null); }}
              onClose={() => setOpenPicker(null)}
            />
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Alignment */}
        {(['left', 'center', 'right'] as const).map((align) =>
          toolbarButton(
            activeCellStyle?.align === align,
            () => applyStyle({ align }, `Align ${align}`),
            `Align ${align}`,
            align === 'left' ? <AlignLeft size={14} /> : align === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />
          )
        )}
        {toolbarButton(!!activeCellStyle?.wrapText, () => toggleStyle('wrapText'), 'Wrap text', <WrapText size={14} />)}

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Number formats */}
        {numberFormatButtons.map((entry) =>
          toolbarButton(
            activeCellStyle?.format === entry.format,
            () => applyStyle(
              { format: activeCellStyle?.format === entry.format ? 'general' : (entry.format as CellStyle['format']) },
              `Format as ${entry.title}`
            ),
            entry.title,
            entry.icon
          )
        )}
        {!isCompact && (
          <select
            value={activeCellStyle?.format || 'general'}
            onChange={(e) => applyStyle({ format: e.target.value as CellStyle['format'] }, 'Number format')}
            className="h-7 bg-white border border-slate-300 rounded px-1 text-[11px] font-semibold focus:outline-none cursor-pointer"
          >
            <option value="general">General</option>
            <option value="number">Number</option>
            <option value="currency">Currency</option>
            <option value="accounting">Accounting</option>
            <option value="percent">Percent</option>
            <option value="scientific">Scientific</option>
            <option value="date">Date</option>
            <option value="time">Time</option>
            <option value="text">Text</option>
          </select>
        )}

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Borders */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenPicker((p) => (p === 'border' ? null : 'border')); }}
            className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"
            title="Borders"
          >
            <Table size={14} />
          </button>
          {openPicker === 'border' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenPicker(null)} />
              <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 p-1.5 flex flex-col gap-0.5">
                {([
                  { kind: 'all', label: 'All borders' },
                  { kind: 'outer', label: 'Outside border' },
                  { kind: 'top', label: 'Top border' },
                  { kind: 'bottom', label: 'Bottom border' },
                  { kind: 'none', label: 'No border' },
                ] as const).map((item) => (
                  <button
                    key={item.kind}
                    onClick={() => { applyBorder(item.kind); setOpenPicker(null); }}
                    className="px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort, filter, freeze */}
        {toolbarButton(false, () => sortRange('asc'), 'Sort A→Z by the selected column', <ArrowUpDown size={14} />)}
        {toolbarButton(
          filterColumn !== null,
          () => setFilterColumn((prev) => (prev === null ? selection.focusCol : null)),
          'Filter by the selected column',
          <Filter size={14} />
        )}
        {toolbarButton(frozenRows > 0 || frozenCols > 0, freezeAtSelection, 'Freeze panes at the selection', <Snowflake size={14} />)}
        {toolbarButton(showFindPanel, () => setShowFindPanel((p) => !p), 'Find and replace (Ctrl+F)', <Search size={14} />)}

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Functions */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenPicker((p) => (p === 'function' ? null : 'function')); }}
            className="h-7 px-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1 hover:bg-emerald-100"
          >
            <span className="font-serif italic">fx</span>
            {!isTight && <span>Function</span>}
            <ChevronDown size={11} />
          </button>
          {openPicker === 'function' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenPicker(null)} />
              <div className="absolute left-0 top-full mt-1 w-56 max-h-72 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xl z-50 p-1.5 custom-scrollbar">
                {FUNCTION_CATALOG.map((fn) => (
                  <button
                    key={fn.name}
                    onClick={() => insertFunction(fn.name)}
                    className="w-full px-2 py-1.5 rounded-lg text-left hover:bg-emerald-50 cursor-pointer flex flex-col"
                  >
                    <span className="text-[11px] font-bold text-slate-800">{fn.name}</span>
                    <span className="text-[10px] text-slate-500">{fn.hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!isCompact && (
          <>
            <button onClick={() => setShowConditionalModal(true)}
              className="h-7 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer">
              <Sparkles size={12} /> Conditional
            </button>
            <button onClick={() => setShowChartStudio(true)}
              className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer">
              <BarChart2 size={12} /> Chart
            </button>
          </>
        )}
      </div>

      {/* ============ 3. FORMULA BAR ============ */}
      <div className="bg-slate-50 border-b border-slate-200 px-2 py-1 flex items-center gap-2 shrink-0">
        <div className="w-20 shrink-0 px-2 py-1 bg-white border border-slate-300 rounded text-center text-[11px] font-extrabold text-slate-800">
          {selectedRangeStr}
        </div>
        <span className="font-serif italic font-bold text-slate-500 text-sm px-0.5 shrink-0">fx</span>
        <input
          ref={formulaInputRef}
          type="text"
          value={editingKey ? editValue : formulaDraft}
          onFocus={() => setFormulaFocused(true)}
          onChange={(e) => {
            if (editingKey) setEditValue(e.target.value);
            else setFormulaDraft(e.target.value);
          }}
          onBlur={() => {
            setFormulaFocused(false);
            if (editingKey) return;
            const current = activeSheet.data[activeCellKey]?.value ?? '';
            if (formulaDraft !== current) writeCell(activeCellKey, formulaDraft);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const value = editingKey ? editValue : formulaDraft;
              const key = editingKey || activeCellKey;
              setEditingKey(null);
              if ((activeSheet.data[key]?.value ?? '') !== value) writeCell(key, value);
              setFormulaFocused(false);
              formulaInputRef.current?.blur();
              moveSelection(0, 1);
              rootRef.current?.focus();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditingKey(null);
              setFormulaDraft(activeSheet.data[activeCellKey]?.value ?? '');
              setFormulaFocused(false);
              rootRef.current?.focus();
            }
          }}
          className="flex-1 min-w-0 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          placeholder="Value or formula, e.g. =SUM(B2:B10)*1.2"
        />
      </div>

      {/* ============ 4. FIND AND REPLACE ============ */}
      {showFindPanel && (
        <div className="bg-amber-50 border-b border-amber-200 px-2 py-1.5 flex flex-wrap items-center gap-1.5 shrink-0">
          <Search size={13} className="text-amber-700 shrink-0" />
          <input
            autoFocus
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setFindIndex((prev) => (e.shiftKey ? prev - 1 + findMatches.length : prev + 1));
              } else if (e.key === 'Escape') setShowFindPanel(false);
            }}
            placeholder="Find"
            className="h-7 px-2 min-w-0 flex-1 max-w-48 bg-white border border-amber-300 rounded text-[11px] focus:outline-none focus:border-amber-500"
          />
          <input
            value={replaceValue}
            onChange={(e) => setReplaceValue(e.target.value)}
            placeholder="Replace with"
            className="h-7 px-2 min-w-0 flex-1 max-w-48 bg-white border border-amber-300 rounded text-[11px] focus:outline-none focus:border-amber-500"
          />
          <span className="text-[10px] font-mono font-bold text-amber-800 shrink-0 tabular-nums">
            {findMatches.length ? `${(findIndex % findMatches.length) + 1}/${findMatches.length}` : '0/0'}
          </span>
          <button onClick={() => setFindIndex((p) => p + 1)} disabled={!findMatches.length}
            className="h-7 px-2 bg-white border border-amber-300 rounded text-[11px] font-bold hover:bg-amber-100 disabled:opacity-40 cursor-pointer shrink-0">
            Next
          </button>
          <button onClick={replaceCurrent} disabled={!findMatches.length}
            className="h-7 px-2 bg-white border border-amber-300 rounded text-[11px] font-bold hover:bg-amber-100 disabled:opacity-40 cursor-pointer shrink-0">
            Replace
          </button>
          <button onClick={replaceAll} disabled={!findMatches.length}
            className="h-7 px-2 bg-amber-600 text-white rounded text-[11px] font-bold hover:bg-amber-700 disabled:opacity-40 cursor-pointer shrink-0">
            All
          </button>
          <label className="flex items-center gap-1 text-[10px] font-semibold text-amber-800 cursor-pointer shrink-0">
            <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} className="accent-amber-600" />
            Aa
          </label>
          <button onClick={() => setShowFindPanel(false)} className="p-1 text-amber-700 hover:text-amber-900 cursor-pointer shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ============ 5. FILTER BAR ============ */}
      {filterColumn !== null && (
        <div className="bg-sky-50 border-b border-sky-200 px-2 py-1.5 flex items-center gap-2 shrink-0">
          <Filter size={13} className="text-sky-700 shrink-0" />
          <span className="text-[11px] font-bold text-sky-800 shrink-0">
            Column {colIndexToLetter(filterColumn)}
          </span>
          <input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Show rows containing…"
            className="h-7 px-2 flex-1 min-w-0 max-w-64 bg-white border border-sky-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
          />
          <label className="flex items-center gap-1 text-[10px] font-semibold text-sky-800 cursor-pointer shrink-0">
            <input type="checkbox" checked={hasHeaderRow} onChange={(e) => setHasHeaderRow(e.target.checked)} className="accent-sky-600" />
            Header row
          </label>
          {hiddenRows && (
            <span className="text-[10px] font-semibold text-sky-700 shrink-0">
              {hiddenRows.size} hidden
            </span>
          )}
          <button
            onClick={() => { setFilterColumn(null); setFilterQuery(''); }}
            className="p-1 text-sky-700 hover:text-sky-900 cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ============ 6. GRID + SIDE PANELS ============ */}
      <div className="flex-1 min-h-0 flex">
        <SheetGrid
          data={activeSheet.data}
          selection={selection}
          onSelectionChange={(next, extend) => {
            setSelection((prev) => (extend ? { ...prev, focusCol: next.focusCol, focusRow: next.focusRow } : next));
            if (editingKey) commitEdit('none');
            rootRef.current?.focus();
          }}
          editingKey={editingKey}
          editValue={editValue}
          onEditValueChange={setEditValue}
          onCommitEdit={commitEdit}
          onCancelEdit={cancelEdit}
          onStartEdit={(key) => startEdit(key)}
          getCell={getCell}
          colWidths={activeSheet.colWidths}
          rowHeights={activeSheet.rowHeights}
          onResizeColumn={resizeColumn}
          onResizeRow={resizeRow}
          onAutoFitColumn={autoFitColumn}
          frozenCols={frozenCols}
          frozenRows={frozenRows}
          highlightKeys={showFindPanel ? highlightKeys : undefined}
          activeHighlightKey={showFindPanel ? activeHighlightKey : null}
          hiddenRows={hiddenRows}
          onHeaderContextMenu={(event, type, index) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY, type, index });
          }}
          onCellContextMenu={(event, col, row) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY, type: 'cell', index: col + row * TOTAL_COLS });
          }}
        />

        {/* Comments drawer */}
        {commentsDrawerOpen && (
          <div className={`bg-white border-l border-slate-200 flex flex-col shrink-0 min-h-0 ${isTight ? 'w-full absolute inset-y-0 right-0 z-30 shadow-2xl' : 'w-72'}`}>
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <MessageCircle size={13} className="text-blue-600" /> Comments
              </span>
              <button onClick={() => setCommentsDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <div className="px-3 py-2 bg-blue-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-700 shrink-0">
              Active cell: <span className="font-mono font-bold text-blue-700">{activeCellKey}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
              {commentedCells.length === 0 && (
                <p className="text-[11px] text-slate-500 text-center py-6">No comments in this sheet yet.</p>
              )}
              {commentedCells.map(([key, cell]) => (
                <button
                  key={key}
                  onClick={() => {
                    const coords = cellKeyToCoords(key);
                    if (coords) setSelection({ anchorCol: coords.col, anchorRow: coords.row, focusCol: coords.col, focusRow: coords.row });
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                    key === activeCellKey ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-blue-700">{key}</span>
                    <span className="text-[9px] text-slate-400">{cell.comment?.createdAt}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug break-words">{cell.comment?.text}</p>
                </button>
              ))}
            </div>
            <div className="p-2.5 border-t border-slate-200 flex items-center gap-1.5 shrink-0">
              <input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }}
                placeholder={`Comment on ${activeCellKey}…`}
                className="flex-1 min-w-0 px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] focus:outline-none focus:border-blue-500"
              />
              <button onClick={addComment} className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer shrink-0">
                <Send size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============ 7. SHEET TABS ============ */}
      <div className="bg-slate-200 border-t border-slate-300 px-2 py-1 flex items-center gap-1 shrink-0 overflow-x-auto">
        <button onClick={addSheet} className="p-1.5 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer shrink-0" title="Add sheet">
          <Plus size={14} />
        </button>
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          return (
            <div
              key={sheet.id}
              onClick={() => setActiveSheetId(sheet.id)}
              className={`px-2.5 py-1 rounded-t-lg font-bold text-[11px] cursor-pointer flex items-center gap-1.5 border-t border-x shrink-0 transition-colors ${
                isActive ? 'bg-white text-emerald-800 border-slate-300' : 'bg-slate-300 text-slate-700 border-transparent hover:bg-slate-300/80'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sheet.color || '#10b981' }} />
              {editingSheetTabId === sheet.id ? (
                <input
                  autoFocus
                  value={sheetTabNameInput}
                  onChange={(e) => setSheetTabNameInput(e.target.value)}
                  onBlur={() => {
                    if (sheetTabNameInput.trim()) {
                      commit('Rename sheet', (prev) =>
                        prev.map((s) => (s.id === sheet.id ? { ...s, name: sheetTabNameInput.trim() } : s))
                      );
                    }
                    setEditingSheetTabId(null);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  className="bg-white border border-emerald-400 rounded px-1 py-0.5 text-[11px] font-bold w-24 focus:outline-none"
                />
              ) : (
                <span className="truncate max-w-32">{sheet.name}</span>
              )}
              {isActive && (
                <span className="flex items-center gap-0.5 ml-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingSheetTabId(sheet.id); setSheetTabNameInput(sheet.name); }}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-600 cursor-pointer" title="Rename"
                  ><Edit2 size={10} /></button>
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicateSheet(sheet.id); }}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-600 cursor-pointer" title="Duplicate"
                  ><Copy size={10} /></button>
                  {sheets.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSheet(sheet.id); }}
                      className="p-0.5 hover:bg-rose-100 text-rose-600 rounded cursor-pointer" title="Delete"
                    ><Trash2 size={10} /></button>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ============ 8. WINDOW STATUS BAR CONTENT ============ */}
      <WindowStatus
        left={
          <span className="flex items-center gap-2">
            <span>{selectedRangeStr}</span>
            {(frozenRows > 0 || frozenCols > 0) && (
              <span className="opacity-70">Frozen {frozenRows}R × {frozenCols}C</span>
            )}
          </span>
        }
        center={
          <span className="flex items-center justify-center gap-3">
            {selectionStats.truncated ? (
              <span className="opacity-70">Large selection</span>
            ) : (
              <>
                <span>Count: <strong>{selectionStats.count}</strong></span>
                {selectionStats.numeric > 0 && (
                  <>
                    <span>Sum: <strong>{formatCellValue(selectionStats.sum, 'number')}</strong></span>
                    <span>Avg: <strong>{formatCellValue(selectionStats.average, 'number')}</strong></span>
                  </>
                )}
              </>
            )}
          </span>
        }
        right={<span className="opacity-75 truncate max-w-40">{lastAction}</span>}
      />

      {/* ============ CONTEXT MENU ============ */}
      {contextMenu && (
        <div
          className="fixed z-[999] w-48 bg-white rounded-xl border border-slate-200 shadow-2xl p-1.5 flex flex-col gap-0.5"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 260) }}
          onClick={(e) => e.stopPropagation()}
        >
          {(contextMenu.type === 'cell'
            ? [
                { label: 'Cut', icon: <Scissors size={12} />, action: () => copySelection(true) },
                { label: 'Copy', icon: <Copy size={12} />, action: () => copySelection(false) },
                { label: 'Paste', icon: <Clipboard size={12} />, action: () => (clipboard ? pasteAt(selectedRange.minCol, selectedRange.minRow) : pasteFromSystem(selectedRange.minCol, selectedRange.minRow)) },
                { label: 'Clear contents', icon: <X size={12} />, action: () => clearSelection('content') },
                { label: 'Clear formatting', icon: <RotateCcw size={12} />, action: () => clearSelection('format') },
              ]
            : contextMenu.type === 'col'
            ? [
                { label: 'Insert column left', icon: <Plus size={12} />, action: () => insertColumns(contextMenu.index) },
                { label: 'Insert column right', icon: <Plus size={12} />, action: () => insertColumns(contextMenu.index + 1) },
                { label: 'Delete column', icon: <Trash2 size={12} />, action: () => deleteColumns(contextMenu.index) },
                { label: 'Auto-fit width', icon: <Check size={12} />, action: () => autoFitColumn(contextMenu.index) },
                { label: 'Sort A→Z', icon: <ArrowUpDown size={12} />, action: () => sortRange('asc') },
                { label: 'Sort Z→A', icon: <ArrowUpDown size={12} />, action: () => sortRange('desc') },
                { label: 'Filter this column', icon: <Filter size={12} />, action: () => setFilterColumn(contextMenu.index) },
              ]
            : [
                { label: 'Insert row above', icon: <Plus size={12} />, action: () => insertRows(contextMenu.index) },
                { label: 'Insert row below', icon: <Plus size={12} />, action: () => insertRows(contextMenu.index + 1) },
                { label: 'Delete row', icon: <Trash2 size={12} />, action: () => deleteRows(contextMenu.index) },
              ]
          ).map((item) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setContextMenu(null); }}
              className="px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold hover:bg-slate-100 cursor-pointer flex items-center gap-2"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ============ MODALS ============ */}
      {showConditionalModal && (
        <ConditionalFormatModal
          rules={conditionalRules}
          selectedRange={selectedRangeStr}
          onSaveRules={(rules) => {
            setConditionalRules(rules);
            setLastAction('Updated conditional formatting');
          }}
          onClose={() => setShowConditionalModal(false)}
        />
      )}

      {showChartStudio && (
        <ChartStudio
          sheet={activeSheet}
          selectedRange={selectedRangeStr}
          onClose={() => setShowChartStudio(false)}
          onInsertChartToSheet={(chart) => {
            setEmbeddedCharts((prev) => [...prev, chart]);
            setLastAction(`Inserted ${chart.type} chart`);
          }}
        />
      )}

      {showVersionHistoryModal && (
        <VersionHistoryModal
          snapshots={versionSnapshots}
          onRestoreSnapshot={(snapshot) => {
            commit('Restore version', () => cloneSheets(snapshot.sheets));
            setActiveSheetId(snapshot.sheets[0].id);
            setShowVersionHistoryModal(false);
          }}
          onClose={() => setShowVersionHistoryModal(false)}
        />
      )}
    </div>
  );
}

/** Shared swatch grid for the text and fill colour buttons. */
function ColorPicker({
  onPick,
  onClose,
  includeNone,
}: {
  onPick: (color: string) => void;
  onClose: () => void;
  includeNone?: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 p-2">
        <div className="grid grid-cols-6 gap-1">
          {SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => onPick(color)}
              className="w-5 h-5 rounded border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="color"
            onChange={(e) => onPick(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-slate-300"
            title="Custom colour"
          />
          {includeNone && (
            <button
              onClick={() => onPick('')}
              className="flex-1 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
            >
              No fill
            </button>
          )}
        </div>
      </div>
    </>
  );
}
