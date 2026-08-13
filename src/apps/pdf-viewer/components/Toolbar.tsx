import React from 'react';
import { AnnotationType } from '../types';
import {
  FileText,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Highlighter,
  Underline as UnderlineIcon,
  Strikethrough,
  MessageSquarePlus,
  Pencil,
  MousePointer,
  Download,
  Printer,
  Share2,
  Copy,
  Lock,
  Unlock,
  Eye,
  Search,
  Check,
  Sidebar as SidebarIcon,
} from 'lucide-react';

interface ToolbarProps {
  documentTitle: string;
  currentPage: number;
  totalPages: number;
  zoomLevel: number; // e.g. 100 for 100%
  fitMode: 'custom' | 'fit-width' | 'fit-page';
  rotation: number;
  activeAnnotationTool: AnnotationType | 'select' | null;
  isReadOnly: boolean;
  isLocked: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenPdf: () => void;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number, fitMode?: 'custom' | 'fit-width' | 'fit-page') => void;
  onRotate: () => void;
  onSetAnnotationTool: (tool: AnnotationType | 'select' | null) => void;
  onToggleReadOnly: () => void;
  onOpenSearch: () => void;
  onCopyText: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onShare: () => void;
  onToggleFullscreen: () => void;
  onUnlockPasswordPrompt: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  documentTitle,
  currentPage,
  totalPages,
  zoomLevel,
  fitMode,
  rotation,
  activeAnnotationTool,
  isReadOnly,
  isLocked,
  sidebarOpen,
  onToggleSidebar,
  onOpenPdf,
  onPageChange,
  onZoomChange,
  onRotate,
  onSetAnnotationTool,
  onToggleReadOnly,
  onOpenSearch,
  onCopyText,
  onDownload,
  onPrint,
  onShare,
  onToggleFullscreen,
  onUnlockPasswordPrompt,
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-200 select-none shrink-0 font-sans">
      {/* Top Main Toolbar Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800/80 gap-2 overflow-x-auto custom-scrollbar">
        {/* Left Section: Sidebar Toggle, Doc Title, Open PDF */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              sidebarOpen
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle Thumbnails / Bookmarks / Search Panel"
          >
            <SidebarIcon size={16} />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-600 rounded-lg text-white shadow-sm">
              <FileText size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xs text-white truncate max-w-[220px] sm:max-w-[320px]">
                {documentTitle}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                <span>PDF Document</span>
                {isLocked ? (
                  <button
                    onClick={onUnlockPasswordPrompt}
                    className="text-amber-400 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                  >
                    <Lock size={10} /> Password Locked
                  </button>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <Unlock size={10} /> Unlocked
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onOpenPdf}
            className="ml-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FolderOpen size={14} className="text-amber-400" />
            <span>Open PDF</span>
          </button>
        </div>

        {/* Middle Section: Page Controls, Zoom, Rotate */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Page Navigator */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1 || isLocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-1 px-1">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                disabled={isLocked}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) onPageChange(Math.max(1, Math.min(totalPages, val)));
                }}
                className="w-10 bg-slate-900 border border-slate-700 rounded text-center text-xs text-white font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500 py-0.5"
              />
              <span className="text-slate-400 text-xs">/ {totalPages}</span>
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages || isLocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>

          {/* Zoom Level & Fit Controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => onZoomChange(Math.max(25, zoomLevel - 25), 'custom')}
              disabled={isLocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <select
              value={fitMode !== 'custom' ? fitMode : zoomLevel}
              disabled={isLocked}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'fit-width') onZoomChange(100, 'fit-width');
                else if (val === 'fit-page') onZoomChange(100, 'fit-page');
                else onZoomChange(parseInt(val, 10), 'custom');
              }}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-extrabold focus:outline-none cursor-pointer"
            >
              <option value={50}>50%</option>
              <option value={75}>75%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
              <option value="fit-width">Fit Width</option>
              <option value="fit-page">Fit Page</option>
            </select>
            <button
              onClick={() => onZoomChange(Math.min(300, zoomLevel + 25), 'custom')}
              disabled={isLocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Rotate Control */}
          <button
            onClick={onRotate}
            disabled={isLocked}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title={`Rotate Clockwise 90° (Current: ${rotation}°)`}
          >
            <RotateCw size={14} />
          </button>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Read Only Toggle Badge */}
          <button
            onClick={onToggleReadOnly}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
              isReadOnly
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle Read-Only Mode"
          >
            <Eye size={13} />
            <span>{isReadOnly ? 'Read-Only' : 'Edit Mode'}</span>
          </button>

          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            disabled={isLocked}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Search Text in PDF (Ctrl+F)"
          >
            <Search size={14} />
          </button>

          {/* Copy Text */}
          <button
            onClick={onCopyText}
            disabled={isLocked}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Copy Page Text to Clipboard"
          >
            <Copy size={14} />
          </button>

          {/* Download */}
          <button
            onClick={onDownload}
            disabled={isLocked}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Download PDF Document"
          >
            <Download size={14} />
          </button>

          {/* Print */}
          <button
            onClick={onPrint}
            disabled={isLocked}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Print PDF Document"
          >
            <Printer size={14} />
          </button>

          {/* Share */}
          <button
            onClick={onShare}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Share Document"
          >
            <Share2 size={14} />
          </button>

          {/* Full Screen */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Secondary Ribbon: Annotation Toolbar */}
      {!isReadOnly && !isLocked && (
        <div className="px-4 py-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
              Annotation Tools:
            </span>

            {/* Select Pointer */}
            <button
              onClick={() => onSetAnnotationTool('select')}
              className={`px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeAnnotationTool === 'select' || activeAnnotationTool === null
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <MousePointer size={13} /> Select
            </button>

            {/* Highlight */}
            <button
              onClick={() => onSetAnnotationTool('highlight')}
              className={`px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeAnnotationTool === 'highlight'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                  : 'bg-slate-900 text-amber-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Highlighter size={13} /> Highlight
            </button>

            {/* Underline */}
            <button
              onClick={() => onSetAnnotationTool('underline')}
              className={`px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeAnnotationTool === 'underline'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-slate-900 text-blue-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <UnderlineIcon size={13} /> Underline
            </button>

            {/* Strikeout */}
            <button
              onClick={() => onSetAnnotationTool('strikeout')}
              className={`px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeAnnotationTool === 'strikeout'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                  : 'bg-slate-900 text-rose-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Strikethrough size={13} /> Strikeout
            </button>

            {/* Sticky Notes */}
            <button
              onClick={() => onSetAnnotationTool('sticky-note')}
              className={`px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeAnnotationTool === 'sticky-note'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-slate-900 text-emerald-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <MessageSquarePlus size={13} /> Sticky Note
            </button>

            {/* Freehand Drawing */}
            <button
              onClick={() => onSetAnnotationTool('drawing')}
              className={`px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeAnnotationTool === 'drawing'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                  : 'bg-slate-900 text-purple-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Pencil size={13} /> Freehand Ink
            </button>
          </div>

          <span className="text-[10px] text-slate-500 font-bold hidden md:inline">
            Click & drag on page to add annotations
          </span>
        </div>
      )}
    </div>
  );
};
