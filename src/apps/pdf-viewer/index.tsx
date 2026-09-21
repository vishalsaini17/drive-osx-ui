import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnnotationType,
  Bookmark,
  DrawingPath,
  PDFDocMeta,
  StickyNote,
  TextAnnotation,
} from './types';
import { Toolbar } from './components/Toolbar';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { PDFPageView } from './components/PDFPageView';
import { PasswordModal } from './components/PasswordModal';
import ShareModal from '../file-explorer/components/ShareModal';
import { usePdfDocument } from './hooks/usePdfDocument';
import { usePdfTextIndex } from './hooks/usePdfTextIndex';
import { useSystemStore } from '../../shell/state/systemStore';
import { FileService } from '../../platform/files/FileService';
import { FileItem } from '../../platform/types';
import { FileText, Check, AlertCircle, UploadCloud, FolderOpen, HardDrive } from 'lucide-react';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';
import { useViewportWidth } from '../../platform/layout/useViewportWidth';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function PDFViewerApp({ windowId = 'pdf-viewer' }: { windowId?: string }) {
  const { status, pdfDoc, error, passwordAttemptFailed, load, submitPassword, cancelPassword } = usePdfDocument();
  const { indexedCount, ensurePageText, search } = usePdfTextIndex(pdfDoc);

  const [docMeta, setDocMeta] = useState<PDFDocMeta | null>(null);
  // Set only for a failure fetching bytes from Drive — distinct from
  // `usePdfDocument`'s own `error`, which covers pdf.js failing to parse
  // bytes it already has. Both render the same error card.
  const [fetchError, setFetchError] = useState<string | null>(null);
  const lastBytesRef = useRef<ArrayBuffer | null>(null);

  // Viewer display state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [fitMode, setFitMode] = useState<'custom' | 'fit-width' | 'fit-page'>('fit-width');
  const [rotation, setRotation] = useState<number>(0);
  // Phone/tablet viewports get an overlay drawer that starts closed; on the
  // desktop the sidebar is an inline pane that starts open. Real viewport
  // width (not the window's) — a tablet window is narrower than the default
  // desktop one, and the desktop layout must not change.
  const viewportWidth = useViewportWidth();
  const compact = viewportWidth < 1024;
  const phone = viewportWidth < 640;
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));
  useEffect(() => {
    setSidebarOpen(!compact);
  }, [compact]);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('thumbnails');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<AnnotationType | 'select' | null>('select');

  // Per-document user data (reset whenever a new document is opened)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchResults = useMemo(() => search(searchQuery), [search, searchQuery, indexedCount]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null); // outer app shell, for fullscreen
  const viewportRef = useRef<HTMLDivElement>(null); // scrollable center pane, for fit-width/fit-page sizing
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resetDocumentState = () => {
    setCurrentPage(1);
    setZoomLevel(100);
    setFitMode('fit-width');
    setRotation(0);
    setBookmarks([]);
    setStickyNotes([]);
    setTextAnnotations([]);
    setDrawingPaths([]);
    setSearchQuery('');
    setActiveAnnotationTool('select');
    setIsReadOnly(false);
  };

  const loadBytes = (buf: ArrayBuffer, meta: PDFDocMeta) => {
    resetDocumentState();
    setFetchError(null);
    lastBytesRef.current = buf;
    setDocMeta(meta);
    // pdf.js transfers (detaches) whatever ArrayBuffer it's handed to its
    // worker, so `buf` itself would come back zero-length — pass a copy and
    // keep the original intact for Download/Print.
    load(buf.slice(0));
  };

  const loadFromDrive = async (fileId: string, name: string, folderId: string | null) => {
    setFetchError(null);
    setDocMeta({ source: 'drive', fileId, folderId, name, sizeLabel: '—', numPages: 0 });
    try {
      const url = await FileService.downloadUrl(fileId);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
      const buf = await res.arrayBuffer();
      loadBytes(buf, { source: 'drive', fileId, folderId, name, sizeLabel: formatBytes(buf.byteLength), numPages: 0 });
    } catch (err) {
      setDocMeta(null);
      setFetchError(err instanceof Error ? err.message : 'Failed to download this PDF from Drive.');
    }
  };

  const loadFromLocalFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    loadBytes(buf, { source: 'local', name: file.name, sizeLabel: formatBytes(buf.byteLength), numPages: 0 });
  };

  // Reflect the real page count once pdf.js finishes loading.
  useEffect(() => {
    if (pdfDoc) setDocMeta((m) => (m ? { ...m, numPages: pdfDoc.numPages } : m));
  }, [pdfDoc]);

  // --- Receiving a file opened from File Explorer -------------------------
  const isPrimaryWindow = windowId === 'pdf-viewer';
  const pdfViewerFileId = useSystemStore((s) => s.pdfViewerFileId);
  const pdfViewerFileName = useSystemStore((s) => s.pdfViewerFileName);
  const pdfViewerCurrentFolderId = useSystemStore((s) => s.pdfViewerCurrentFolderId);
  const consumePendingPdfViewerFile = useSystemStore((s) => s.consumePendingPdfViewerFile);
  const handleCloseWindow = useSystemStore((s) => s.handleCloseWindow);
  const requestFilePick = useSystemStore((s) => s.requestFilePick);
  const filePickerResult = useSystemStore((s) => s.filePickerResults[windowId]);
  const consumeFilePickerResult = useSystemStore((s) => s.consumeFilePickerResult);
  const focusWindow = useSystemStore((s) => s.focusWindow);

  const lastOpenedSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isPrimaryWindow || !pdfViewerFileId) return;
    const signature = `${pdfViewerFileId}:${pdfViewerFileName}`;
    if (lastOpenedSignatureRef.current === signature) return;
    lastOpenedSignatureRef.current = signature;
    loadFromDrive(pdfViewerFileId, pdfViewerFileName ?? 'Document.pdf', pdfViewerCurrentFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrimaryWindow, pdfViewerFileId, pdfViewerFileName, pdfViewerCurrentFolderId]);

  const hasSeededRef = useRef(false);
  useEffect(() => {
    if (hasSeededRef.current) return;
    hasSeededRef.current = true;
    const pending = consumePendingPdfViewerFile(windowId);
    if (pending) loadFromDrive(pending.fileId, pending.name, pending.folderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Local "Open PDF" (native file picker, no Drive round-trip needed) --
  const handleOpenFromComputer = () => fileInputRef.current?.click();

  const handleLocalFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) loadFromLocalFile(file);
  };

  // --- "Open PDF" from Drive OSX's own File Explorer, as a picker ---------
  const handleOpenFromDrive = () => requestFilePick(windowId, 'file');

  useEffect(() => {
    if (!filePickerResult) return;
    const result = consumeFilePickerResult(windowId);
    if (!result) return;
    focusWindow(windowId);
    if (result.mode === 'file') {
      if (!result.file.name.toLowerCase().endsWith('.pdf')) {
        triggerToast(`"${result.file.name}" isn't a PDF file.`);
        return;
      }
      loadFromDrive(result.file.id, result.file.name, result.file.parentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePickerResult, windowId, consumeFilePickerResult, focusWindow]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (file) loadFromLocalFile(file);
    else triggerToast('Only PDF files can be opened here.');
  };

  // --- Bookmarks ------------------------------------------------------------
  const handleAddBookmark = (pageIndex: number) => {
    const title = prompt('Enter Bookmark Label:', `Page ${pageIndex + 1}`);
    if (!title) return;
    setBookmarks((prev) => [...prev, { id: 'bm_' + Date.now(), title, pageIndex }]);
    triggerToast(`Bookmarked Page ${pageIndex + 1}`);
  };
  const handleDeleteBookmark = (id: string) => setBookmarks((prev) => prev.filter((b) => b.id !== id));

  // --- Sticky notes / markup / drawing --------------------------------------
  const handleAddStickyNote = (notePartial: Omit<StickyNote, 'id' | 'createdAt'>) => {
    const newNote: StickyNote = {
      ...notePartial,
      id: 'sn_' + Date.now(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setStickyNotes((prev) => [...prev, newNote]);
    triggerToast('Sticky note added to page');
  };
  const handleDeleteStickyNote = (id: string) => setStickyNotes((prev) => prev.filter((n) => n.id !== id));

  const handleAddTextAnnotation = (annPartial: Omit<TextAnnotation, 'id'>) => {
    const newAnn: TextAnnotation = { ...annPartial, id: 'ann_' + Date.now() };
    setTextAnnotations((prev) => [...prev, newAnn]);
    triggerToast(`Added ${newAnn.type} annotation`);
  };
  const handleDeleteTextAnnotation = (id: string) => setTextAnnotations((prev) => prev.filter((a) => a.id !== id));

  const handleAddDrawingPath = (pathPartial: Omit<DrawingPath, 'id'>) => {
    setDrawingPaths((prev) => [...prev, { ...pathPartial, id: 'dp_' + Date.now() }]);
  };

  // --- Copy / download / print ----------------------------------------------
  const handleCopyPageText = async () => {
    const indexed = await ensurePageText(currentPage);
    const text = indexed?.fullText.trim();
    if (!text) {
      triggerToast('No selectable text on this page.');
      return;
    }
    await navigator.clipboard.writeText(text);
    triggerToast('Page text copied to clipboard!');
  };

  const handleDownloadPdf = () => {
    const buf = lastBytesRef.current;
    if (!buf || !docMeta) return;
    const blob = new Blob([buf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docMeta.name.toLowerCase().endsWith('.pdf') ? docMeta.name : `${docMeta.name}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast(`Downloaded "${docMeta.name}"`);
  };

  const handlePrintPdf = () => {
    const buf = lastBytesRef.current;
    if (!buf) return;
    const blob = new Blob([buf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    triggerToast('Opened the PDF in a new tab — use its Print button');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // --- Share ------------------------------------------------------------------
  const shareFileItem: FileItem | null =
    docMeta?.source === 'drive' && docMeta.fileId
      ? { id: docMeta.fileId, name: docMeta.name, type: 'file', parentId: docMeta.folderId ?? null, createdAt: new Date().toISOString() }
      : null;

  const handleShare = () => {
    if (shareFileItem) setShowShareModal(true);
    else triggerToast('Save this PDF to Drive first to share it.');
  };

  useAppMenu(windowId, [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'open', label: 'Open from Computer…', shortcut: 'Ctrl+O', onSelect: handleOpenFromComputer },
        { id: 'open-drive', label: 'Open from Drive OSX…', onSelect: handleOpenFromDrive },
        { id: 'download', label: 'Download', disabled: status !== 'ready', onSelect: handleDownloadPdf },
        { id: 'print', label: 'Print…', shortcut: 'Ctrl+P', disabled: status !== 'ready', onSelect: handlePrintPdf },
        separator(),
        { id: 'close-window', label: 'Close Window', onSelect: () => handleCloseWindow(windowId) },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'sidebar', label: 'Sidebar', checked: sidebarOpen, onSelect: () => setSidebarOpen((v) => !v) },
        separator(),
        { id: 'zoom-in', label: 'Zoom In', disabled: status !== 'ready', onSelect: () => { setZoomLevel((z) => Math.min(300, z + 25)); setFitMode('custom'); } },
        { id: 'zoom-out', label: 'Zoom Out', disabled: status !== 'ready', onSelect: () => { setZoomLevel((z) => Math.max(25, z - 25)); setFitMode('custom'); } },
        { id: 'fit-width', label: 'Fit Width', selected: fitMode === 'fit-width', disabled: status !== 'ready', onSelect: () => setFitMode('fit-width') },
        { id: 'fit-page', label: 'Fit Page', selected: fitMode === 'fit-page', disabled: status !== 'ready', onSelect: () => setFitMode('fit-page') },
        separator(),
        { id: 'rotate', label: 'Rotate Clockwise', disabled: status !== 'ready', onSelect: () => setRotation((r) => (r + 90) % 360) },
      ],
    },
  ]);

  const controlsDisabled = status !== 'ready';

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-slate-950 font-sans text-slate-100 select-none overflow-hidden relative"
    >
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleLocalFileSelected} />

      {toastMessage && (
        <div className={`fixed z-50 bg-blue-600 ${compact ? 'top-12 left-4 right-4 justify-center' : 'top-12 right-6'} text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-blue-400 text-xs font-bold flex items-center gap-2`}>
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <Toolbar
        documentTitle={docMeta?.name ?? 'No document open'}
        currentPage={currentPage}
        totalPages={docMeta?.numPages ?? 0}
        zoomLevel={zoomLevel}
        fitMode={fitMode}
        rotation={rotation}
        activeAnnotationTool={activeAnnotationTool}
        isReadOnly={isReadOnly}
        isLocked={status === 'password'}
        controlsDisabled={controlsDisabled}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenFromComputer={handleOpenFromComputer}
        onOpenFromDrive={handleOpenFromDrive}
        onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(docMeta?.numPages ?? 1, page)))}
        onZoomChange={(zoom, fit) => {
          setZoomLevel(zoom);
          setFitMode(fit || 'custom');
        }}
        onRotate={() => setRotation((r) => (r + 90) % 360)}
        onSetAnnotationTool={(tool) => setActiveAnnotationTool(tool)}
        onToggleReadOnly={() => setIsReadOnly(!isReadOnly)}
        onOpenSearch={() => {
          setSidebarOpen(true);
          setSidebarTab('search');
        }}
        onCopyText={handleCopyPageText}
        onDownload={handleDownloadPdf}
        onPrint={handlePrintPdf}
        onShare={handleShare}
        onToggleFullscreen={handleToggleFullscreen}
        onUnlockPasswordPrompt={() => {
          /* Password modal is already shown automatically while status === 'password'. */
        }}
        compact={compact}
        phone={phone}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {compact && status === 'ready' && pdfDoc && sidebarOpen && (
          <div className="absolute inset-0 z-20 bg-black/50" onClick={() => setSidebarOpen(false)} />
        )}
        {status === 'ready' && pdfDoc && sidebarOpen && (
          <Sidebar
            overlay={compact}
            pdfDoc={pdfDoc}
            numPages={pdfDoc.numPages}
            currentPage={currentPage}
            bookmarks={bookmarks}
            stickyNotes={stickyNotes}
            textAnnotations={textAnnotations}
            searchQuery={searchQuery}
            searchResults={searchResults}
            indexedCount={indexedCount}
            activeTab={sidebarTab}
            onActiveTabChange={setSidebarTab}
            onPageSelect={(pIdx) => {
              setCurrentPage(pIdx + 1);
              if (compact) setSidebarOpen(false);
            }}
            onAddBookmark={handleAddBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onSearchChange={setSearchQuery}
            onDeleteStickyNote={handleDeleteStickyNote}
            onDeleteTextAnnotation={handleDeleteTextAnnotation}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <div
          ref={viewportRef}
          onDragOver={(e) => {
            if (status !== 'ready') {
              e.preventDefault();
              setIsDragOver(true);
            }
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={status !== 'ready' ? handleDrop : undefined}
          className={`flex-1 min-w-0 bg-slate-900 overflow-y-auto flex flex-col items-center relative ${compact ? 'p-2' : 'p-6'}`}
        >
          {status === 'idle' && !docMeta && !fetchError && (
            <div
              className={`m-auto text-center space-y-4 max-w-md p-6 sm:p-10 rounded-3xl border-2 border-dashed transition-colors ${
                isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'
              }`}
            >
              <div className="w-16 h-16 bg-rose-500/15 text-rose-400 rounded-3xl border border-rose-500/30 flex items-center justify-center mx-auto shadow-md">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-black text-white">No PDF Open</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Open a PDF from your computer or from Drive OSX, or drag &amp; drop a file here. PDFs also open here
                automatically when double-clicked in File Explorer.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleOpenFromComputer}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-2xl shadow-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <FolderOpen size={14} /> From Computer
                </button>
                <button
                  onClick={(e) => {
                    // See Toolbar.tsx's identical guard: the window
                    // container's own onClick refocuses this window on
                    // every click inside it, which would run after this
                    // handler opens and focuses the picker window and steal
                    // focus straight back.
                    e.stopPropagation();
                    handleOpenFromDrive();
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-2xl border border-slate-700 shadow-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <HardDrive size={14} /> From Drive OSX
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold pt-1">
                <UploadCloud size={12} /> or drop a .pdf file anywhere in this window
              </div>
            </div>
          )}

          {(status === 'loading' || (status === 'idle' && docMeta)) && (
            <div className="m-auto text-center space-y-3">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">Loading {docMeta?.name ?? 'document'}…</p>
            </div>
          )}

          {(status === 'error' || fetchError) && (
            <div className="m-auto text-center space-y-4 max-w-md p-6 sm:p-8 bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl">
              <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-3xl border border-rose-500/30 flex items-center justify-center mx-auto shadow-md">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-black text-white">Couldn't Open This PDF</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">{fetchError || error}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleOpenFromComputer}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-2xl shadow-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <FolderOpen size={14} /> From Computer
                </button>
                <button
                  onClick={(e) => {
                    // See Toolbar.tsx's identical guard: the window
                    // container's own onClick refocuses this window on
                    // every click inside it, which would run after this
                    // handler opens and focuses the picker window and steal
                    // focus straight back.
                    e.stopPropagation();
                    handleOpenFromDrive();
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-2xl border border-slate-700 shadow-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <HardDrive size={14} /> From Drive OSX
                </button>
              </div>
            </div>
          )}

          {status === 'password' && (
            <div className="m-auto text-center space-y-4 max-w-md p-6 sm:p-8 bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl">
              <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-3xl border border-amber-500/30 flex items-center justify-center mx-auto shadow-md">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-black text-white">This PDF is Password Protected</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Enter the document's password in the dialog to view its contents.
              </p>
            </div>
          )}

          {status === 'ready' && pdfDoc && (
            <PDFPageView
              pdfDoc={pdfDoc}
              pageNumber={currentPage}
              zoomLevel={zoomLevel}
              fitMode={fitMode}
              rotation={rotation}
              containerRef={viewportRef}
              fitPadding={compact ? 32 : 48}
              activeAnnotationTool={activeAnnotationTool}
              isReadOnly={isReadOnly}
              stickyNotes={stickyNotes}
              textAnnotations={textAnnotations}
              drawingPaths={drawingPaths}
              searchQuery={searchQuery}
              ensurePageText={ensurePageText}
              onAddStickyNote={handleAddStickyNote}
              onAddTextAnnotation={handleAddTextAnnotation}
              onAddDrawingPath={handleAddDrawingPath}
              onDeleteStickyNote={handleDeleteStickyNote}
              onDeleteTextAnnotation={handleDeleteTextAnnotation}
              onSelectTextToCopy={(sel) => triggerToast(`Selected: "${sel.substring(0, 30)}${sel.length > 30 ? '…' : ''}"`)}
            />
          )}
        </div>
      </div>

      {status === 'password' && (
        <PasswordModal
          documentTitle={docMeta?.name ?? 'Document'}
          attemptFailed={passwordAttemptFailed}
          onSubmit={submitPassword}
          onCancel={() => {
            cancelPassword();
            setDocMeta(null);
          }}
        />
      )}

      {showShareModal && shareFileItem && (
        <ShareModal fileItem={shareFileItem} isOpen={showShareModal} onClose={() => setShowShareModal(false)} onSharedChanged={() => {}} />
      )}
    </div>
  );
}
