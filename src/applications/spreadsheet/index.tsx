import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  letterToColIndex,
  cellKeyToCoords,
  coordsToCellKey,
  evaluateFormula,
  formatCellValue,
  getRangeCellKeys,
} from './utils/formula';
import { ChartStudio } from './components/ChartStudio';
import { ConditionalFormatModal } from './components/ConditionalFormatModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { useSystemStore } from '../../systemStore';
import {
  Grid,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Download,
  Upload,
  FileSpreadsheet,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Type,
  Maximize2,
  Table,
  BarChart2,
  Sparkles,
  History,
  Users,
  MessageCircle,
  FileDown,
  RotateCcw,
  Check,
  ChevronDown,
  Info,
  Layers,
  Search,
  X,
  Send,
} from 'lucide-react';

export default function SpreadsheetApp() {
  // Workbook & Sheet State
  const [workbookTitle, setWorkbookTitle] = useState('Quarterly Financial & Operations.xlsx');
  const [sheets, setSheets] = useState<Sheet[]>(DEFAULT_WORKBOOK_SHEETS);
  const [activeSheetId, setActiveSheetId] = useState<string>(DEFAULT_WORKBOOK_SHEETS[0].id);

  // Active Sheet Helper
  const activeSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  // Grid Selection State
  const [selectedCellKey, setSelectedCellKey] = useState<string>('A1');
  const [rangeStartKey, setRangeStartKey] = useState<string>('A1');
  const [rangeEndKey, setRangeEndKey] = useState<string>('A1');
  const [isMouseDownGrid, setIsMouseDownGrid] = useState<boolean>(false);

  // Cell Edit Mode State
  const [isEditingCell, setIsEditingCell] = useState<boolean>(false);
  const [cellInputText, setCellInputText] = useState<string>('');
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Formatting Toolbar States
  const [fontSize, setFontSize] = useState<number>(11);
  const [fontFamily, setFontFamily] = useState<string>('Inter');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [dataFormat, setDataFormat] = useState<'general' | 'number' | 'currency' | 'percent' | 'date'>('general');

  // Sheet Tab Rename Modal
  const [editingSheetTabId, setEditingSheetTabId] = useState<string | null>(null);
  const [sheetTabNameInput, setSheetTabNameInput] = useState<string>('');

  // Conditional Formatting Rules State
  const [conditionalRules, setConditionalRules] = useState<ConditionalRule[]>([
    {
      id: 'rule_1',
      type: 'greaterThan',
      value: '150000',
      range: 'E4:E8',
      style: { bgColor: '#dcfce7', color: '#15803d', bold: true },
    },
  ]);
  const [showConditionalModal, setShowConditionalModal] = useState<boolean>(false);

  // Chart Studio Modal State
  const [showChartStudio, setShowChartStudio] = useState<boolean>(false);
  const [embeddedCharts, setEmbeddedCharts] = useState<ChartConfig[]>([]);

  // Version History State
  const [versionSnapshots, setVersionSnapshots] = useState<VersionSnapshot[]>([
    {
      id: 'snap_now',
      title: 'Current Live Version',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'You',
      sheets: DEFAULT_WORKBOOK_SHEETS,
    },
    {
      id: 'snap_prev',
      title: 'Auto-saved Revision',
      timestamp: '10:15 AM',
      author: 'System AutoSave',
      sheets: DEFAULT_WORKBOOK_SHEETS,
    },
  ]);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState<boolean>(false);

  // Multi-User Collaboration Simulation
  const [isCollabActive, setIsCollabActive] = useState<boolean>(true);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([
    { id: 'peer_1', name: 'Alex M.', color: '#3b82f6', cellKey: 'B4', sheetId: activeSheetId },
    { id: 'peer_2', name: 'Maya S.', color: '#8b5cf6', cellKey: 'D5', sheetId: activeSheetId },
    { id: 'peer_3', name: 'Jordan T.', color: '#10b981', cellKey: 'E8', sheetId: activeSheetId },
  ]);

  // Comments State & Drawer
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>('');

  // Selected Range Computed String
  const selectedRangeStr =
    rangeStartKey === rangeEndKey ? selectedCellKey : `${rangeStartKey}:${rangeEndKey}`;

  // System Save helper
  const setFiles = useSystemStore((state) => state.setFiles);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);

  // Update active sheet data helper
  const updateActiveSheetData = useCallback(
    (updater: (data: Record<string, CellData>) => Record<string, CellData>) => {
      setSheets((prevSheets) =>
        prevSheets.map((s) => {
          if (s.id === activeSheetId) {
            return { ...s, data: updater({ ...s.data }) };
          }
          return s;
        })
      );
    },
    [activeSheetId]
  );

  // Synchronize Cell Input when active cell selection changes
  useEffect(() => {
    const rawVal = activeSheet.data[selectedCellKey]?.value || '';
    setCellInputText(rawVal);
    const style = activeSheet.data[selectedCellKey]?.style;
    if (style) {
      if (style.fontSize) setFontSize(style.fontSize);
      if (style.fontFamily) setFontFamily(style.fontFamily);
      if (style.color) setTextColor(style.color);
      if (style.bgColor) setBgColor(style.bgColor);
      if (style.format) setDataFormat(style.format);
    }
  }, [selectedCellKey, activeSheetId, activeSheet.data]);

  // Focus inline input when double clicked
  useEffect(() => {
    if (isEditingCell && cellInputRef.current) {
      cellInputRef.current.focus();
    }
  }, [isEditingCell]);

  // Peer Cursors Motion Simulation
  useEffect(() => {
    if (!isCollabActive) return;
    const interval = setInterval(() => {
      setPeerCursors((prev) =>
        prev.map((peer) => {
          const randomCol = Math.floor(Math.random() * 6);
          const randomRow = Math.floor(Math.random() * 8) + 3;
          return {
            ...peer,
            cellKey: coordsToCellKey(randomCol, randomRow),
          };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [isCollabActive]);

  // Save cell edit
  const handleSaveCell = useCallback(
    (key: string, newValue: string) => {
      updateActiveSheetData((data) => {
        const existing: CellData = data[key] || { value: '' };
        if (!newValue.trim() && !existing.style && !existing.comment) {
          delete data[key];
        } else {
          data[key] = { ...existing, value: newValue };
        }
        return data;
      });
      setIsEditingCell(false);
    },
    [updateActiveSheetData]
  );

  // Apply Cell Style across selected range
  const applyStyleToRange = useCallback(
    (stylePatch: Partial<CellStyle>) => {
      const keys = getRangeCellKeys(selectedRangeStr);
      updateActiveSheetData((data) => {
        keys.forEach((k) => {
          const existing = data[k] || { value: '' };
          data[k] = {
            ...existing,
            style: { ...existing.style, ...stylePatch },
          };
        });
        return data;
      });
    },
    [selectedRangeStr, updateActiveSheetData]
  );

  // Toggle Font Style
  const toggleFontStyle = (key: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    const currentStyle = activeSheet.data[selectedCellKey]?.style;
    const nextVal = !currentStyle?.[key];
    applyStyleToRange({ [key]: nextVal });
  };

  // Alignment
  const setAlignment = (align: 'left' | 'center' | 'right') => {
    applyStyleToRange({ align });
  };

  // Border formatting
  const applyBorderToRange = (borderType: 'all' | 'outer' | 'clear' | 'bottom' | 'top') => {
    const keys = getRangeCellKeys(selectedRangeStr);
    updateActiveSheetData((data) => {
      keys.forEach((k) => {
        const existing = data[k] || { value: '' };
        let b = existing.style?.border || {};
        if (borderType === 'all') b = { top: true, bottom: true, left: true, right: true, color: '#cbd5e1' };
        else if (borderType === 'clear') b = {};
        else if (borderType === 'bottom') b = { ...b, bottom: true, color: '#334155' };
        else if (borderType === 'top') b = { ...b, top: true, color: '#334155' };

        data[k] = {
          ...existing,
          style: { ...existing.style, border: b },
        };
      });
      return data;
    });
  };

  // Quick Function Insert
  const handleInsertFunction = (fnName: string) => {
    const fnFormula = `=${fnName}(${selectedRangeStr})`;
    handleSaveCell(selectedCellKey, fnFormula);
    setCellInputText(fnFormula);
  };

  // Sheet Management Actions
  const handleAddSheet = () => {
    const newId = 'sheet_' + Date.now();
    const newSheet: Sheet = {
      id: newId,
      name: `Sheet ${sheets.length + 1}`,
      data: {
        A1: { value: 'New Blank Sheet', style: { bold: true, fontSize: 13 } },
      },
    };
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newId);
  };

  const handleDuplicateSheet = (sheetId: string) => {
    const target = sheets.find((s) => s.id === sheetId);
    if (!target) return;
    const dupId = 'sheet_' + Date.now();
    const dupSheet: Sheet = {
      ...target,
      id: dupId,
      name: `${target.name} (Copy)`,
      data: JSON.parse(JSON.stringify(target.data)),
    };
    setSheets((prev) => [...prev, dupSheet]);
    setActiveSheetId(dupId);
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (sheets.length <= 1) {
      alert('Workbook must contain at least one sheet.');
      return;
    }
    if (confirm('Delete this sheet permanently?')) {
      const remaining = sheets.filter((s) => s.id !== sheetId);
      setSheets(remaining);
      setActiveSheetId(remaining[0].id);
    }
  };

  // Comment on Active Cell
  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    const newComment: CellComment = {
      id: 'comment_' + Date.now(),
      author: 'You',
      text: commentInput.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    updateActiveSheetData((data) => {
      const existing = data[selectedCellKey] || { value: '' };
      data[selectedCellKey] = { ...existing, comment: newComment };
      return data;
    });
    setCommentInput('');
  };

  // Export to XLSX File
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
      const rows: string[][] = [];
      for (let r = 0; r < 30; r++) {
        const rowVals: string[] = [];
        for (let c = 0; c < 15; c++) {
          const key = coordsToCellKey(c, r);
          const cell = sheet.data[key];
          let val = cell ? cell.value : '';
          if (val.startsWith('=')) {
            val = evaluateFormula(val, sheet.data);
          }
          rowVals.push(val);
        }
        rows.push(rowVals);
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });

    XLSX.writeFile(wb, workbookTitle.endsWith('.xlsx') ? workbookTitle : `${workbookTitle}.xlsx`);
  };

  // Export to CSV File
  const handleExportCSV = () => {
    const rows: string[][] = [];
    for (let r = 0; r < 40; r++) {
      const rowVals: string[] = [];
      for (let c = 0; c < 15; c++) {
        const key = coordsToCellKey(c, r);
        const cell = activeSheet.data[key];
        let val = cell ? cell.value : '';
        if (val.startsWith('=')) {
          val = evaluateFormula(val, activeSheet.data);
        }
        rowVals.push(val);
      }
      rows.push(rowVals);
    }
    const csvContent = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeSheet.name}.csv`);
    link.click();
  };

  // Export to PDF Document
  const handleExportPDF = () => {
    const pdf = new jsPDF('landscape', 'pt', 'a4');
    pdf.setFontSize(16);
    pdf.text(workbookTitle, 40, 40);
    pdf.setFontSize(12);
    pdf.text(`Sheet: ${activeSheet.name}`, 40, 60);

    let y = 90;
    pdf.setFontSize(9);

    for (let r = 0; r < 25; r++) {
      let line = '';
      for (let c = 0; c < 8; c++) {
        const key = coordsToCellKey(c, r);
        const cell = activeSheet.data[key];
        let val = cell ? cell.value : '';
        if (val.startsWith('=')) {
          val = evaluateFormula(val, activeSheet.data);
        }
        line += val.padEnd(16, ' ').slice(0, 16) + ' | ';
      }
      pdf.text(line, 40, y);
      y += 18;
      if (y > 540) break;
    }

    pdf.save(`${activeSheet.name}_report.pdf`);
  };

  // Save Workbook Snapshot to System Disk
  const handleSaveToDisk = () => {
    const snapshotContent = JSON.stringify(sheets, null, 2);
    setFiles((prev) => [
      ...prev,
      {
        id: 'file_sheet_' + Date.now(),
        name: workbookTitle,
        type: 'file',
        content: snapshotContent,
        parentId: resolveDefaultFolderId('Documents') || null,
        createdAt: new Date().toLocaleDateString(),
      },
    ]);
    alert(`💾 Saved "${workbookTitle}" to Documents folder!`);
  };

  // Import / Open XLSX File
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });

      const newSheets: Sheet[] = wb.SheetNames.map((name, i) => {
        const ws = wb.Sheets[name];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        const sheetData: Record<string, CellData> = {};

        jsonData.forEach((row, rIdx) => {
          row.forEach((val, cIdx) => {
            if (val !== undefined && val !== null) {
              const key = coordsToCellKey(cIdx, rIdx);
              sheetData[key] = { value: String(val) };
            }
          });
        });

        return {
          id: `sheet_imp_${i}_${Date.now()}`,
          name,
          data: sheetData,
        };
      });

      if (newSheets.length > 0) {
        setSheets(newSheets);
        setActiveSheetId(newSheets[0].id);
        setWorkbookTitle(file.name);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Compute Range Statistics (SUM, AVERAGE, COUNT) for bottom status bar
  const rangeKeys = getRangeCellKeys(selectedRangeStr);
  let rangeSum = 0;
  let rangeCount = 0;
  rangeKeys.forEach((k) => {
    const cell = activeSheet.data[k];
    if (cell && cell.value) {
      let val = cell.value;
      if (val.startsWith('=')) val = evaluateFormula(val, activeSheet.data);
      const num = parseFloat(val);
      if (!isNaN(num)) {
        rangeSum += num;
        rangeCount++;
      }
    }
  });
  const rangeAverage = rangeCount > 0 ? (rangeSum / rangeCount).toFixed(2) : '0';

  return (
    <div className="h-full flex flex-col bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* ================= 1. TOP TITLEBAR & APP HEADER ================= */}
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-600 rounded-lg text-white shadow-md">
            <FileSpreadsheet size={18} />
          </div>
          <div className="flex flex-col">
            <input
              type="text"
              value={workbookTitle}
              onChange={(e) => setWorkbookTitle(e.target.value)}
              className="bg-transparent text-xs font-black tracking-wide text-white focus:bg-slate-800/80 focus:outline-none px-1.5 py-0.5 rounded border border-transparent focus:border-slate-700"
            />
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
              <span>Drive OSX Sheet Studio</span>
              <span>• Auto-saved</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Collab Badges */}
        <div className="flex items-center gap-2">
          {/* Live Collab Toggle */}
          <button
            onClick={() => setIsCollabActive(!isCollabActive)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border ${
              isCollabActive
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Live Multiplayer Peer Presence"
          >
            <Users size={13} className={isCollabActive ? 'text-emerald-400' : 'text-slate-500'} />
            <span>Collab: {isCollabActive ? 'Live (3)' : 'Paused'}</span>
          </button>

          {/* Comments Toggle */}
          <button
            onClick={() => setCommentsDrawerOpen(!commentsDrawerOpen)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border ${
              commentsDrawerOpen
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <MessageCircle size={13} />
            <span>Comments</span>
          </button>

          {/* Version History */}
          <button
            onClick={() => setShowVersionHistoryModal(true)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <History size={13} /> History
          </button>

          {/* Export Dropdown Group */}
          <div className="flex items-center gap-1 bg-emerald-600 rounded-md p-0.5">
            <button
              onClick={handleExportXLSX}
              className="px-2.5 py-1 text-white text-[11px] font-bold hover:bg-emerald-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="Export Workbook as .XLSX Excel File"
            >
              <Download size={13} /> .XLSX
            </button>
            <button
              onClick={handleExportCSV}
              className="px-2 py-1 text-white text-[11px] font-bold hover:bg-emerald-700 rounded transition-colors cursor-pointer"
              title="Export Sheet as CSV"
            >
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="px-2 py-1 text-white text-[11px] font-bold hover:bg-emerald-700 rounded transition-colors cursor-pointer"
              title="Export Sheet as PDF"
            >
              <FileDown size={13} />
            </button>
          </div>

          {/* Import XLSX */}
          <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-md border border-slate-700 cursor-pointer flex items-center gap-1">
            <Upload size={13} /> Open
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* ================= 2. FORMATTING TOOLBAR ================= */}
      <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
        {/* Undo / Redo / Save */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
          <button
            onClick={handleSaveToDisk}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
            title="Save Workbook to Drive System Disk"
          >
            <Download size={14} />
          </button>
        </div>

        {/* Font Family & Size */}
        <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
          <select
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value);
              applyStyleToRange({ fontFamily: e.target.value });
            }}
            className="bg-slate-100 border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="Inter">Inter</option>
            <option value="Poppins">Poppins</option>
            <option value="monospace">Monospace</option>
            <option value="serif">Serif</option>
          </select>

          <select
            value={fontSize}
            onChange={(e) => {
              const sz = parseInt(e.target.value, 10);
              setFontSize(sz);
              applyStyleToRange({ fontSize: sz });
            }}
            className="bg-slate-100 border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:outline-none"
          >
            {[9, 10, 11, 12, 14, 16, 18, 20, 24].map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </div>

        {/* Typography Formatting */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
          <button
            onClick={() => toggleFontStyle('bold')}
            className={`p-1.5 rounded cursor-pointer ${
              activeSheet.data[selectedCellKey]?.style?.bold ? 'bg-slate-200 font-black text-blue-600' : 'hover:bg-slate-100'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => toggleFontStyle('italic')}
            className={`p-1.5 rounded cursor-pointer ${
              activeSheet.data[selectedCellKey]?.style?.italic ? 'bg-slate-200 text-blue-600' : 'hover:bg-slate-100'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => toggleFontStyle('underline')}
            className={`p-1.5 rounded cursor-pointer ${
              activeSheet.data[selectedCellKey]?.style?.underline ? 'bg-slate-200 text-blue-600' : 'hover:bg-slate-100'
            }`}
            title="Underline"
          >
            <Underline size={14} />
          </button>
          <button
            onClick={() => toggleFontStyle('strikethrough')}
            className={`p-1.5 rounded cursor-pointer ${
              activeSheet.data[selectedCellKey]?.style?.strikethrough ? 'bg-slate-200 text-blue-600' : 'hover:bg-slate-100'
            }`}
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>
        </div>

        {/* Colors & Fill */}
        <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
          <div className="flex items-center gap-1" title="Fill Color">
            <Palette size={14} className="text-slate-500" />
            <input
              type="color"
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value);
                applyStyleToRange({ bgColor: e.target.value });
              }}
              className="w-5 h-5 rounded border border-slate-300 cursor-pointer p-0"
            />
          </div>
          <div className="flex items-center gap-1" title="Text Color">
            <Type size={14} className="text-slate-500" />
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                applyStyleToRange({ color: e.target.value });
              }}
              className="w-5 h-5 rounded border border-slate-300 cursor-pointer p-0"
            />
          </div>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
          <button
            onClick={() => setAlignment('left')}
            className={`p-1.5 rounded cursor-pointer ${
              activeSheet.data[selectedCellKey]?.style?.align === 'left' ? 'bg-slate-200 text-blue-600' : 'hover:bg-slate-100'
            }`}
          >
            <AlignLeft size={14} />
          </button>
          <button
            onClick={() => setAlignment('center')}
            className={`p-1.5 rounded cursor-pointer ${
              activeSheet.data[selectedCellKey]?.style?.align === 'center' ? 'bg-slate-200 text-blue-600' : 'hover:bg-slate-100'
            }`}
          >
            <AlignCenter size={14} />
          </button>
          <button
            onClick={() => setAlignment('right')}
            className={`p-1.5 rounded cursor-pointer ${
              activeSheet.data[selectedCellKey]?.style?.align === 'right' ? 'bg-slate-200 text-blue-600' : 'hover:bg-slate-100'
            }`}
          >
            <AlignRight size={14} />
          </button>
        </div>

        {/* Borders */}
        <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
          <button
            onClick={() => applyBorderToRange('all')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="All Borders"
          >
            <Table size={14} /> Borders
          </button>
        </div>

        {/* Data Formatting */}
        <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
          <select
            value={dataFormat}
            onChange={(e) => {
              const fmt = e.target.value as any;
              setDataFormat(fmt);
              applyStyleToRange({ format: fmt });
            }}
            className="bg-slate-100 border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="general">General Format</option>
            <option value="currency">Currency ($)</option>
            <option value="number">Number (1,234.56)</option>
            <option value="percent">Percentage (%)</option>
            <option value="date">Date (YYYY-MM-DD)</option>
          </select>
        </div>

        {/* Functions Dropdown */}
        <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleInsertFunction(e.target.value);
                e.target.value = '';
              }
            }}
            className="bg-emerald-50 text-emerald-800 border border-emerald-300 rounded px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="">+ Function...</option>
            <option value="SUM">SUM (Sum Range)</option>
            <option value="AVERAGE">AVERAGE (Mean)</option>
            <option value="COUNT">COUNT (Numeric Cells)</option>
            <option value="MAX">MAX (Highest Value)</option>
            <option value="MIN">MIN (Lowest Value)</option>
            <option value="IF">IF (Conditional Test)</option>
            <option value="VLOOKUP">VLOOKUP (Table Lookup)</option>
          </select>
        </div>

        {/* Smart Modules: Conditional Format & Chart Studio */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowConditionalModal(true)}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded flex items-center gap-1 cursor-pointer"
          >
            <Sparkles size={13} /> Conditional
          </button>
          <button
            onClick={() => setShowChartStudio(true)}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <BarChart2 size={13} /> Insert Chart
          </button>
        </div>
      </div>

      {/* ================= 3. FORMULA BAR ROW ================= */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 shrink-0">
        {/* Active Cell Key Name Box */}
        <div className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-center text-xs font-extrabold text-slate-800 shadow-2xs">
          {selectedCellKey}
        </div>

        {/* Function symbol badge */}
        <div className="font-serif italic font-bold text-slate-500 text-sm px-1">fx</div>

        {/* Formula Input */}
        <input
          type="text"
          value={cellInputText}
          onChange={(e) => {
            setCellInputText(e.target.value);
            handleSaveCell(selectedCellKey, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setIsEditingCell(false);
            }
          }}
          className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          placeholder="Enter text, number, or formula starting with '=' (e.g. =SUM(B4:D4), =IF(E4>1000, 'High', 'Low'))"
        />
      </div>

      {/* ================= 4. MAIN SPREADSHEET GRID VIEWPORT ================= */}
      <div className="flex-1 relative overflow-auto bg-slate-200 custom-scrollbar">
        <div className="inline-block min-w-full">
          <table className="border-collapse bg-white table-fixed font-sans text-xs">
            {/* Table Column Headers (A, B, C... Z) */}
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-600 font-extrabold text-[11px] h-7">
                <th className="w-10 bg-slate-200 border-r border-slate-300 text-center sticky top-0 left-0 z-20"></th>
                {Array.from({ length: 15 }).map((_, cIdx) => {
                  const letter = colIndexToLetter(cIdx);
                  const customW = activeSheet.colWidths?.[cIdx] || 110;
                  return (
                    <th
                      key={letter}
                      style={{ width: `${customW}px` }}
                      className="border-r border-slate-300 text-center font-bold uppercase tracking-wider sticky top-0 bg-slate-100 z-10 select-none"
                    >
                      {letter}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Rows (1, 2, 3... 40) */}
            <tbody>
              {Array.from({ length: 40 }).map((_, rIdx) => {
                const rowNum = rIdx + 1;
                return (
                  <tr key={rowNum} className="h-7 border-b border-slate-200">
                    {/* Row Index Header */}
                    <td className="w-10 bg-slate-100 border-r border-slate-300 text-center font-bold text-slate-500 text-[10px] sticky left-0 z-10 select-none">
                      {rowNum}
                    </td>

                    {/* Columns Cells */}
                    {Array.from({ length: 15 }).map((_, cIdx) => {
                      const key = coordsToCellKey(cIdx, rIdx);
                      const cell = activeSheet.data[key];

                      const isSelected = key === selectedCellKey;
                      const isInRange = rangeKeys.includes(key);

                      // Evaluate formula if value starts with '='
                      let displayVal = cell ? cell.value : '';
                      if (displayVal.startsWith('=')) {
                        displayVal = evaluateFormula(displayVal, activeSheet.data);
                      }
                      if (cell?.style?.format) {
                        displayVal = formatCellValue(displayVal, cell.style.format);
                      }

                      // Check Conditional Formatting rules
                      let appliedBg = cell?.style?.bgColor || '#ffffff';
                      let appliedColor = cell?.style?.color || '#0f172a';

                      conditionalRules.forEach((rule) => {
                        const ruleKeys = getRangeCellKeys(rule.range);
                        if (ruleKeys.includes(key)) {
                          const numVal = parseFloat(displayVal);
                          const targetNum = parseFloat(String(rule.value));
                          let match = false;
                          if (rule.type === 'greaterThan' && !isNaN(numVal) && numVal > targetNum) match = true;
                          else if (rule.type === 'lessThan' && !isNaN(numVal) && numVal < targetNum) match = true;
                          else if (rule.type === 'equals' && displayVal === String(rule.value)) match = true;
                          else if (rule.type === 'contains' && displayVal.toLowerCase().includes(String(rule.value).toLowerCase())) match = true;

                          if (match && rule.style) {
                            if (rule.style.bgColor) appliedBg = rule.style.bgColor;
                            if (rule.style.color) appliedColor = rule.style.color;
                          }
                        }
                      });

                      // Peer Cursors on this cell
                      const peerOnCell = isCollabActive ? peerCursors.find((p) => p.cellKey === key) : null;

                      return (
                        <td
                          key={key}
                          onMouseDown={() => {
                            setSelectedCellKey(key);
                            setRangeStartKey(key);
                            setRangeEndKey(key);
                            setIsMouseDownGrid(true);
                          }}
                          onMouseEnter={() => {
                            if (isMouseDownGrid) {
                              setRangeEndKey(key);
                            }
                          }}
                          onMouseUp={() => setIsMouseDownGrid(false)}
                          onDoubleClick={() => {
                            setIsEditingCell(true);
                          }}
                          className={`border-r border-slate-200 px-2 py-0.5 relative text-xs cursor-cell transition-colors overflow-hidden truncate ${
                            isSelected
                              ? 'ring-2 ring-emerald-600 z-10 font-medium'
                              : isInRange
                              ? 'bg-emerald-50/80'
                              : ''
                          }`}
                          style={{
                            backgroundColor: isInRange ? '#ecfdf5' : appliedBg,
                            color: appliedColor,
                            fontWeight: cell?.style?.bold ? 'bold' : 'normal',
                            fontStyle: cell?.style?.italic ? 'italic' : 'normal',
                            textDecoration: `${cell?.style?.underline ? 'underline ' : ''}${
                              cell?.style?.strikethrough ? 'line-through' : ''
                            }`,
                            textAlign: cell?.style?.align || 'left',
                            fontSize: `${cell?.style?.fontSize || 11}px`,
                            borderTop: cell?.style?.border?.top ? '1.5px solid #334155' : undefined,
                            borderBottom: cell?.style?.border?.bottom ? '1.5px solid #334155' : undefined,
                          }}
                        >
                          {/* Cell Value or Inline Input */}
                          {isEditingCell && isSelected ? (
                            <input
                              ref={cellInputRef}
                              type="text"
                              value={cellInputText}
                              onChange={(e) => setCellInputText(e.target.value)}
                              onBlur={() => handleSaveCell(key, cellInputText)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(key, cellInputText);
                              }}
                              className="w-full h-full bg-white text-slate-900 border-none outline-none p-0 text-xs font-semibold"
                            />
                          ) : (
                            displayVal
                          )}

                          {/* Cell Comment Marker Indicator */}
                          {cell?.comment && (
                            <div className="absolute top-0 right-0 w-0 h-0 border-t-[7px] border-t-amber-500 border-l-[7px] border-l-transparent" />
                          )}

                          {/* Peer Cursor Flag */}
                          {peerOnCell && (
                            <div
                              className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none ring-2 z-20"
                              style={{ borderColor: peerOnCell.color }}
                            >
                              <span
                                className="absolute -top-4 left-0 px-1 py-0.2 rounded text-[8px] font-black text-white whitespace-nowrap shadow-md"
                                style={{ backgroundColor: peerOnCell.color }}
                              >
                                {peerOnCell.name}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 5. BOTTOM SHEET TABS BAR ================= */}
      <div className="bg-slate-200 border-t border-slate-300 px-3 py-1 flex items-center justify-between shrink-0 font-sans text-xs">
        {/* Sheet Tabs List */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {sheets.map((s) => {
            const isActive = s.id === activeSheetId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSheetId(s.id)}
                className={`px-3 py-1 rounded-t-lg font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
                  isActive
                    ? 'bg-white text-emerald-800 border-slate-300 shadow-2xs'
                    : 'bg-slate-300 text-slate-700 border-transparent hover:bg-slate-300/80'
                }`}
              >
                {/* Optional Tab Color Dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color || '#10b981' }}
                />

                {editingSheetTabId === s.id ? (
                  <input
                    type="text"
                    value={sheetTabNameInput}
                    onChange={(e) => setSheetTabNameInput(e.target.value)}
                    onBlur={() => {
                      if (sheetTabNameInput.trim()) {
                        setSheets((prev) =>
                          prev.map((item) => (item.id === s.id ? { ...item, name: sheetTabNameInput.trim() } : item))
                        );
                      }
                      setEditingSheetTabId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (sheetTabNameInput.trim()) {
                          setSheets((prev) =>
                            prev.map((item) => (item.id === s.id ? { ...item, name: sheetTabNameInput.trim() } : item))
                          );
                        }
                        setEditingSheetTabId(null);
                      }
                    }}
                    className="bg-white border border-emerald-400 rounded px-1 py-0.5 text-xs text-slate-900 font-bold focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span>{s.name}</span>
                )}

                {/* Tab Menu Options */}
                {isActive && (
                  <div className="flex items-center gap-1 opacity-80 hover:opacity-100 ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSheetTabId(s.id);
                        setSheetTabNameInput(s.name);
                      }}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-600"
                      title="Rename Sheet"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateSheet(s.id);
                      }}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-600"
                      title="Duplicate Sheet"
                    >
                      <Copy size={11} />
                    </button>
                    {sheets.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSheet(s.id);
                        }}
                        className="p-0.5 hover:bg-rose-100 text-rose-600 rounded"
                        title="Delete Sheet"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Sheet (+) Button */}
          <button
            onClick={handleAddSheet}
            className="p-1.5 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer ml-1"
            title="Add New Blank Sheet"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Selected Range Live Statistics */}
        <div className="flex items-center gap-4 text-slate-600 font-semibold text-[11px]">
          <span>
            Selected: <strong className="text-slate-900 font-mono">{selectedRangeStr}</strong>
          </span>
          <span>
            Count: <strong className="text-slate-900">{rangeCount}</strong>
          </span>
          <span>
            Average: <strong className="text-slate-900">${rangeAverage}</strong>
          </span>
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black">
            Sum: ${rangeSum.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ================= 6. COMMENTS SIDEBAR DRAWER ================= */}
      {commentsDrawerOpen && (
        <div className="absolute right-0 top-11 bottom-6 w-80 bg-white border-l border-slate-300 shadow-2xl flex flex-col z-30 font-sans">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-600" />
              <span className="font-extrabold text-xs text-slate-800">Cell Comments & Thread</span>
            </div>
            <button
              onClick={() => setCommentsDrawerOpen(false)}
              className="p-1 hover:bg-slate-200 rounded text-slate-500"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-3 bg-blue-50/60 border-b border-slate-200 text-xs font-semibold text-slate-700">
            Active Cell: <span className="font-mono font-bold text-blue-700">{selectedCellKey}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {activeSheet.data[selectedCellKey]?.comment ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                      Y
                    </div>
                    <span className="font-bold text-xs text-slate-800">
                      {activeSheet.data[selectedCellKey]?.comment?.author}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {activeSheet.data[selectedCellKey]?.comment?.createdAt}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {activeSheet.data[selectedCellKey]?.comment?.text}
                </p>
                <button
                  onClick={() => {
                    updateActiveSheetData((data) => {
                      if (data[selectedCellKey]) delete data[selectedCellKey].comment;
                      return data;
                    });
                  }}
                  className="text-[10px] text-rose-600 hover:underline font-bold"
                >
                  Delete Comment Thread
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                No comments on cell <span className="font-mono text-slate-700">{selectedCellKey}</span>.<br />Type a note below to leave feedback!
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddComment();
              }}
              placeholder="Leave comment on cell..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <button
              onClick={handleAddComment}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ================= 7. MODALS ================= */}
      {showChartStudio && (
        <ChartStudio
          sheet={activeSheet}
          selectedRange={selectedRangeStr}
          onClose={() => setShowChartStudio(false)}
          onInsertChartToSheet={(chart) => setEmbeddedCharts((prev) => [...prev, chart])}
        />
      )}

      {showConditionalModal && (
        <ConditionalFormatModal
          rules={conditionalRules}
          selectedRange={selectedRangeStr}
          onSaveRules={(rules) => setConditionalRules(rules)}
          onClose={() => setShowConditionalModal(false)}
        />
      )}

      {showVersionHistoryModal && (
        <VersionHistoryModal
          snapshots={versionSnapshots}
          onRestoreSnapshot={(snap) => {
            setSheets(snap.sheets);
            if (snap.sheets.length > 0) setActiveSheetId(snap.sheets[0].id);
          }}
          onClose={() => setShowVersionHistoryModal(false)}
        />
      )}
    </div>
  );
}
