import React, { useEffect, useRef, useState } from 'react';
import { AnnotationType } from '../types';
import {
  FileText,
  FolderOpen,
  HardDrive,
  ChevronDown,
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
  MoreHorizontal,
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
  /** True whenever there's no page to act on yet (no document / loading / errored) — distinct from `isLocked`, which specifically means "password protected". */
  controlsDisabled: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenFromComputer: () => void;
  onOpenFromDrive: () => void;
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
  /** Phone/tablet viewport: two-row toolbar with an overflow menu. */
  compact?: boolean;
  /** Phone-sized viewport: the tightest variant of `compact`. */
  phone?: boolean;
}

const ZOOM_OPTIONS: { value: string; label: string }[] = [
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '100', label: '100%' },
  { value: '125', label: '125%' },
  { value: '150', label: '150%' },
  { value: '200', label: '200%' },
  { value: 'fit-width', label: 'Fit Width' },
  { value: 'fit-page', label: 'Fit Page' },
];

/** Zoom picker that opens its own list inside the window. A native <select>'s popup is placed by the browser and can land off-screen. */
const ZoomDropdown: React.FC<{
  value: string;
  disabled: boolean;
  onSelect: (value: string) => void;
}> = ({ value, disabled, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const PANEL_W = 144;

  useEffect(() => {
    if (!open) return;
    // Capture phase: the window shell stops propagation of pointer events that start inside it.
    const handler = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [open]);

  const toggle = () => {
    if (!open && rootRef.current) {
      const r = rootRef.current.getBoundingClientRect();
      setAlignRight(r.left + PANEL_W > window.innerWidth - 8);
    }
    setOpen((v) => !v);
  };

  const current = ZOOM_OPTIONS.find((o) => o.value === value)?.label ?? `${value}%`;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Zoom level"
        className="flex items-center gap-1 bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs font-extrabold disabled:opacity-30 cursor-pointer whitespace-nowrap"
      >
        <span>{current}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          style={{ width: PANEL_W }}
          className={`absolute top-full mt-1.5 z-50 max-h-[min(20rem,60vh)] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 ${
            alignRight ? 'right-0' : 'left-0'
          }`}
        >
          {ZOOM_OPTIONS.map((o) => (
            <button
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                setOpen(false);
                onSelect(o.value);
              }}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold flex items-center justify-between cursor-pointer hover:bg-slate-800 ${
                o.value === value ? 'text-blue-400' : 'text-slate-200'
              }`}
            >
              {o.label}
              {o.value === value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
  controlsDisabled,
  sidebarOpen,
  onToggleSidebar,
  onOpenFromComputer,
  onOpenFromDrive,
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
  compact = false,
  phone = false,
}) => {
  const blocked = isLocked || controlsDisabled;
  const [openMenuOpen, setOpenMenuOpen] = useState(false);
  const openMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (openMenuRef.current && !openMenuRef.current.contains(e.target as Node)) setOpenMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuOpen]);
  const renderOpenPdf = (className: string) => (
    <div className={className} ref={openMenuRef}>
      <button
        onClick={() => setOpenMenuOpen((v) => !v)}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
      >
        <FolderOpen size={14} className="text-amber-400" />
        <span>Open PDF</span>
        <ChevronDown size={12} className={`transition-transform ${openMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {openMenuOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          <button
            onClick={() => {
              setOpenMenuOpen(false);
              onOpenFromComputer();
            }}
            className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
          >
            <FolderOpen size={15} className="text-amber-400 shrink-0" /> From This Computer
          </button>
          <button
            onClick={(e) => {
              // The window container's own onClick refocuses this
              // window on every click inside it — harmless normally,
              // but it runs *after* this handler opens and focuses the
              // picker window, stealing focus straight back to us.
              e.stopPropagation();
              setOpenMenuOpen(false);
              onOpenFromDrive();
            }}
            className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
          >
            <HardDrive size={15} className="text-blue-400 shrink-0" /> From Drive OSX
          </button>
        </div>
      )}
    </div>
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    // Capture phase: the window shell stops propagation of pointer events that
    // start inside a window, so a bubbling listener never sees taps on the page.
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [moreOpen]);

  if (compact) {
    const iconBtn =
      'p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer';
    const menuItem =
      'w-full text-left px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40 flex items-center gap-2.5 cursor-pointer';
    const pick = (fn: () => void) => () => {
      setMoreOpen(false);
      fn();
    };
    const tools = [
      { id: 'select', label: 'Select', Icon: MousePointer, on: 'bg-blue-600 text-white border-blue-500', off: 'text-slate-400' },
      { id: 'highlight', label: 'Highlight', Icon: Highlighter, on: 'bg-amber-500 text-slate-950 border-amber-400', off: 'text-amber-400' },
      { id: 'underline', label: 'Underline', Icon: UnderlineIcon, on: 'bg-blue-600 text-white border-blue-500', off: 'text-blue-400' },
      { id: 'strikeout', label: 'Strikeout', Icon: Strikethrough, on: 'bg-rose-600 text-white border-rose-500', off: 'text-rose-400' },
      { id: 'sticky-note', label: 'Note', Icon: MessageSquarePlus, on: 'bg-emerald-600 text-white border-emerald-500', off: 'text-emerald-400' },
      { id: 'drawing', label: 'Ink', Icon: Pencil, on: 'bg-purple-600 text-white border-purple-500', off: 'text-purple-400' },
    ] as const;

    return (
      <div className="bg-slate-900 border-b border-slate-800 text-slate-200 select-none shrink-0 font-sans">
        <div className="px-2 py-2 flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className={`shrink-0 p-2 rounded-lg border transition-colors cursor-pointer ${
              sidebarOpen
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Pages, bookmarks and search"
            aria-label="Toggle pages panel"
          >
            <SidebarIcon size={16} />
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="shrink-0 p-1.5 bg-rose-600 rounded-lg text-white shadow-sm">
              <FileText size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs text-white truncate">{documentTitle}</span>
              <span className="text-[10px] text-slate-400 font-semibold truncate">
                {isLocked ? 'Password locked' : totalPages > 0 ? `${totalPages} page${totalPages === 1 ? '' : 's'}` : 'PDF Document'}
              </span>
            </div>
          </div>

          {!phone && renderOpenPdf('relative shrink-0')}

          <button onClick={onOpenSearch} disabled={blocked} className={`shrink-0 ${iconBtn}`} title="Search text in PDF" aria-label="Search">
            <Search size={15} />
          </button>

          <div className="relative shrink-0" ref={moreRef}>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={`${iconBtn} ${moreOpen ? 'bg-slate-700' : ''}`}
              title="More actions"
              aria-label="More actions"
            >
              <MoreHorizontal size={15} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                {phone && (
                  <>
                    <button className={menuItem} onClick={pick(onOpenFromComputer)}>
                      <FolderOpen size={15} className="text-amber-400 shrink-0" /> Open from this computer
                    </button>
                    <button
                      className={menuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreOpen(false);
                        onOpenFromDrive();
                      }}
                    >
                      <HardDrive size={15} className="text-blue-400 shrink-0" /> Open from Drive OSX
                    </button>
                    <div className="my-1 border-t border-slate-800" />
                    <button className={menuItem} disabled={blocked} onClick={pick(onRotate)}>
                      <RotateCw size={15} className="shrink-0" /> Rotate clockwise
                    </button>
                    <button className={menuItem} onClick={pick(onToggleReadOnly)}>
                      <Eye size={15} className="shrink-0" /> {isReadOnly ? 'Switch to edit mode' : 'Switch to read-only'}
                    </button>
                    <div className="my-1 border-t border-slate-800" />
                  </>
                )}
                <button className={menuItem} disabled={blocked} onClick={pick(onCopyText)}>
                  <Copy size={15} className="shrink-0" /> Copy page text
                </button>
                <button className={menuItem} disabled={blocked} onClick={pick(onDownload)}>
                  <Download size={15} className="shrink-0" /> Download
                </button>
                <button className={menuItem} disabled={blocked} onClick={pick(onPrint)}>
                  <Printer size={15} className="shrink-0" /> Print
                </button>
                <button className={menuItem} onClick={pick(onShare)}>
                  <Share2 size={15} className="shrink-0" /> Share
                </button>
                <button className={menuItem} onClick={pick(onToggleFullscreen)}>
                  <Maximize2 size={15} className="shrink-0" /> Fullscreen
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-2 pb-2 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || blocked}
              className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Previous Page"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1 px-0.5">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                disabled={blocked}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) onPageChange(Math.max(1, Math.min(totalPages, val)));
                }}
                className="w-9 bg-slate-900 border border-slate-700 rounded text-center text-xs text-white font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500 py-0.5"
              />
              <span className="text-slate-400 text-xs">/ {totalPages}</span>
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || blocked}
              className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Next Page"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => onZoomChange(Math.max(25, zoomLevel - 25), 'custom')}
              disabled={blocked}
              className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <ZoomDropdown
              value={fitMode !== 'custom' ? fitMode : String(zoomLevel)}
              disabled={blocked}
              onSelect={(val) => {
                if (val === 'fit-width') onZoomChange(100, 'fit-width');
                else if (val === 'fit-page') onZoomChange(100, 'fit-page');
                else onZoomChange(parseInt(val, 10), 'custom');
              }}
            />
            <button
              onClick={() => onZoomChange(Math.min(300, zoomLevel + 25), 'custom')}
              disabled={blocked}
              className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {!phone && (
            <>
              <button onClick={onRotate} disabled={blocked} className={iconBtn} title={`Rotate Clockwise 90° (Current: ${rotation}°)`} aria-label="Rotate">
                <RotateCw size={15} />
              </button>
              <button
                onClick={onToggleReadOnly}
                className={`ml-auto px-2.5 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                  isReadOnly
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Toggle Read-Only Mode"
              >
                <Eye size={13} />
                <span>{isReadOnly ? 'Read-Only' : 'Edit Mode'}</span>
              </button>
            </>
          )}
        </div>

        {!isReadOnly && !blocked && (
          <div className="px-2 py-1.5 bg-slate-950/80 border-t border-slate-800 flex items-center gap-1.5 text-xs">
            {tools.map(({ id, label, Icon, on, off }) => {
              const active = id === 'select' ? activeAnnotationTool === 'select' || activeAnnotationTool === null : activeAnnotationTool === id;
              return (
                <button
                  key={id}
                  onClick={() => onSetAnnotationTool(id)}
                  title={label}
                  aria-label={label}
                  className={`flex-1 min-w-0 justify-center ${phone ? 'px-1.5' : 'px-2.5'} py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    active ? on : `bg-slate-900 border-slate-800 hover:bg-slate-800 ${off}`
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {!phone && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

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

          {renderOpenPdf('relative ml-2')}
        </div>

        {/* Middle Section: Page Controls, Zoom, Rotate */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Page Navigator */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1 || blocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || blocked}
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
                disabled={blocked}
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
              disabled={currentPage >= totalPages || blocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages || blocked}
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
              disabled={blocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <select
              value={fitMode !== 'custom' ? fitMode : zoomLevel}
              disabled={blocked}
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
              disabled={blocked}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Rotate Control */}
          <button
            onClick={onRotate}
            disabled={blocked}
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
            disabled={blocked}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Search Text in PDF (Ctrl+F)"
          >
            <Search size={14} />
          </button>

          {/* Copy Text */}
          <button
            onClick={onCopyText}
            disabled={blocked}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Copy Page Text to Clipboard"
          >
            <Copy size={14} />
          </button>

          {/* Download */}
          <button
            onClick={onDownload}
            disabled={blocked}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Download PDF Document"
          >
            <Download size={14} />
          </button>

          {/* Print */}
          <button
            onClick={onPrint}
            disabled={blocked}
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
      {!isReadOnly && !blocked && (
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
