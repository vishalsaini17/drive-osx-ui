import React, { useState, useMemo, useRef } from 'react';
import {
  PDFDocumentData,
  AnnotationType,
  StickyNote,
  TextAnnotation,
  DrawingPath,
  SearchMatch,
} from './types';
import { SAMPLE_PDFS } from './data/samplePdfs';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PDFCanvasPage } from './components/PDFCanvasPage';
import { PasswordModal } from './components/PasswordModal';
import { ShareModal } from './components/ShareModal';
import { useSystemStore } from '../../systemStore';
import { FileText, Check, AlertCircle, Sparkles } from 'lucide-react';

export default function PDFViewerApp() {
  // Document State
  const [documents, setDocuments] = useState<PDFDocumentData[]>(SAMPLE_PDFS);
  const [activeDocId, setActiveDocId] = useState<string>(SAMPLE_PDFS[0].id);

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) || documents[0],
    [documents, activeDocId]
  );

  // Viewer Display States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [fitMode, setFitMode] = useState<'custom' | 'fit-width' | 'fit-page'>('custom');
  const [rotation, setRotation] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Security States
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Annotation Tool State
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<AnnotationType | 'select' | null>('select');

  // Annotation Data per document
  const [stickyNotes, setStickyNotes] = useState<Record<string, StickyNote[]>>({});
  const [textAnnotations, setTextAnnotations] = useState<Record<string, TextAnnotation[]>>({});
  const [drawingPaths, setDrawingPaths] = useState<Record<string, DrawingPath[]>>({});

  // Search Engine State
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // System Store for saving to virtual drive disk
  const setFiles = useSystemStore((state) => state.setFiles);

  const containerRef = useRef<HTMLDivElement>(null);

  // Show Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Search matches computer
  const searchResults = useMemo<SearchMatch[]>(() => {
    if (!searchQuery.trim() || activeDoc.isLocked) return [];
    const queryLower = searchQuery.toLowerCase();
    const matches: SearchMatch[] = [];

    activeDoc.pages.forEach((page, pIdx) => {
      page.contentLines.forEach((line, lIdx) => {
        if (line.toLowerCase().includes(queryLower)) {
          matches.push({
            id: `sm_${pIdx}_${lIdx}`,
            pageIndex: pIdx,
            lineIndex: lIdx,
            textSnippet: line,
            matchTerm: searchQuery,
          });
        }
      });
    });

    return matches;
  }, [searchQuery, activeDoc]);

  // Open PDF File Picker / Sample Switcher
  const handleOpenPdf = () => {
    const docTitles = documents.map((d, i) => `${i + 1}. ${d.title}`).join('\n');
    const choice = prompt(
      `Select a preloaded PDF or enter custom document index:\n${docTitles}\n\nType 1, 2, or 3:`,
      '1'
    );

    if (choice) {
      const idx = parseInt(choice, 10) - 1;
      if (!isNaN(idx) && documents[idx]) {
        setActiveDocId(documents[idx].id);
        setCurrentPage(1);
        if (documents[idx].isLocked) {
          setShowPasswordModal(true);
        } else {
          triggerToast(`Opened "${documents[idx].title}"`);
        }
      }
    }
  };

  // Unlock Password
  const handleUnlockDocument = () => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? { ...d, isLocked: false } : d))
    );
    setShowPasswordModal(false);
    triggerToast(`Document "${activeDoc.title}" unlocked successfully!`);
  };

  // Add Bookmark
  const handleAddBookmark = (pageIndex: number) => {
    const bookmarkTitle = prompt(
      'Enter Bookmark Label:',
      `Page ${pageIndex + 1}: ${activeDoc.pages[pageIndex]?.title || 'Section'}`
    );
    if (!bookmarkTitle) return;

    const newBm = {
      id: 'bm_' + Date.now(),
      title: bookmarkTitle,
      pageIndex,
    };

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id ? { ...d, bookmarks: [...d.bookmarks, newBm] } : d
      )
    );
    triggerToast(`Bookmarked Page ${pageIndex + 1}`);
  };

  const handleDeleteBookmark = (id: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id
          ? { ...d, bookmarks: d.bookmarks.filter((bm) => bm.id !== id) }
          : d
      )
    );
  };

  // Sticky Note handlers
  const handleAddStickyNote = (notePartial: Omit<StickyNote, 'id' | 'createdAt'>) => {
    const newNote: StickyNote = {
      ...notePartial,
      id: 'sn_' + Date.now(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setStickyNotes((prev) => ({
      ...prev,
      [activeDoc.id]: [...(prev[activeDoc.id] || []), newNote],
    }));
    triggerToast('Sticky note added to page');
  };

  const handleDeleteStickyNote = (id: string) => {
    setStickyNotes((prev) => ({
      ...prev,
      [activeDoc.id]: (prev[activeDoc.id] || []).filter((n) => n.id !== id),
    }));
  };

  // Text Annotation handlers
  const handleAddTextAnnotation = (annPartial: Omit<TextAnnotation, 'id'>) => {
    const newAnn: TextAnnotation = {
      ...annPartial,
      id: 'ann_' + Date.now(),
    };

    setTextAnnotations((prev) => ({
      ...prev,
      [activeDoc.id]: [...(prev[activeDoc.id] || []), newAnn],
    }));
    triggerToast(`Added ${newAnn.type} annotation`);
  };

  const handleDeleteTextAnnotation = (id: string) => {
    setTextAnnotations((prev) => ({
      ...prev,
      [activeDoc.id]: (prev[activeDoc.id] || []).filter((a) => a.id !== id),
    }));
  };

  // Drawing Path handlers
  const handleAddDrawingPath = (pathPartial: Omit<DrawingPath, 'id'>) => {
    const newPath: DrawingPath = {
      ...pathPartial,
      id: 'dp_' + Date.now(),
    };

    setDrawingPaths((prev) => ({
      ...prev,
      [activeDoc.id]: [...(prev[activeDoc.id] || []), newPath],
    }));
  };

  // Copy Text
  const handleCopyPageText = (textOverride?: string) => {
    const pageObj = activeDoc.pages[currentPage - 1];
    const textToCopy = textOverride || pageObj?.contentLines.join('\n') || '';

    navigator.clipboard.writeText(textToCopy);
    triggerToast('Page text copied to clipboard!');
  };

  // Download PDF
  const handleDownloadPdf = () => {
    const content = JSON.stringify(activeDoc, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDoc.fileName;
    a.click();
    URL.revokeObjectURL(url);

    // Save to System Disk
    setFiles((prev) => [
      ...prev,
      {
        id: 'file_pdf_' + Date.now(),
        name: activeDoc.fileName,
        type: 'file',
        content,
        parentId: 'folder-documents',
        createdAt: new Date().toLocaleDateString(),
      },
    ]);

    triggerToast(`Downloaded "${activeDoc.fileName}" & saved to System Disk!`);
  };

  // Print PDF
  const handlePrintPdf = () => {
    window.print();
    triggerToast('Sent document to system print queue');
  };

  // Toggle Fullscreen
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

  const currentDocStickyNotes = stickyNotes[activeDoc.id] || [];
  const currentDocTextAnnotations = textAnnotations[activeDoc.id] || [];
  const currentDocDrawingPaths = drawingPaths[activeDoc.id] || [];

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-slate-950 font-sans text-slate-100 select-none overflow-hidden relative"
    >
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-blue-400 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Toolbar */}
      <Toolbar
        documentTitle={activeDoc.title}
        currentPage={currentPage}
        totalPages={activeDoc.totalPages}
        zoomLevel={zoomLevel}
        fitMode={fitMode}
        rotation={rotation}
        activeAnnotationTool={activeAnnotationTool}
        isReadOnly={isReadOnly}
        isLocked={!!activeDoc.isLocked}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenPdf={handleOpenPdf}
        onPageChange={(page) => setCurrentPage(page)}
        onZoomChange={(zoom, fit) => {
          setZoomLevel(zoom);
          setFitMode(fit || 'custom');
        }}
        onRotate={() => setRotation((r) => (r + 90) % 360)}
        onSetAnnotationTool={(tool) => setActiveAnnotationTool(tool)}
        onToggleReadOnly={() => setIsReadOnly(!isReadOnly)}
        onOpenSearch={() => setSidebarOpen(true)}
        onCopyText={() => handleCopyPageText()}
        onDownload={handleDownloadPdf}
        onPrint={handlePrintPdf}
        onShare={() => setShowShareModal(true)}
        onToggleFullscreen={handleToggleFullscreen}
        onUnlockPasswordPrompt={() => setShowPasswordModal(true)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        {sidebarOpen && (
          <Sidebar
            document={activeDoc}
            currentPage={currentPage}
            stickyNotes={currentDocStickyNotes}
            textAnnotations={currentDocTextAnnotations}
            searchQuery={searchQuery}
            searchResults={searchResults}
            onPageSelect={(pIdx) => setCurrentPage(pIdx + 1)}
            onAddBookmark={handleAddBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onSearchChange={(q) => setSearchQuery(q)}
            onDeleteStickyNote={handleDeleteStickyNote}
            onDeleteTextAnnotation={handleDeleteTextAnnotation}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Center Viewer Canvas Stage */}
        <div className="flex-1 bg-slate-900 overflow-y-auto p-6 md:p-10 flex flex-col items-center custom-scrollbar">
          {activeDoc.isLocked ? (
            /* Locked State Screen */
            <div className="my-auto text-center space-y-4 max-w-md p-8 bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl">
              <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-3xl border border-amber-500/30 flex items-center justify-center mx-auto shadow-md">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-black text-white">This PDF is Password Protected</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                To view page contents, bookmarks, and annotation overlays, please enter the document security password.
              </p>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-2xl shadow-lg transition-colors cursor-pointer"
              >
                Enter Password to Unlock
              </button>
            </div>
          ) : (
            /* Unlocked Canvas Viewer */
            <div className="w-full flex flex-col items-center">
              {activeDoc.pages[currentPage - 1] && (
                <PDFCanvasPage
                  page={activeDoc.pages[currentPage - 1]}
                  pageIndex={currentPage - 1}
                  zoomLevel={zoomLevel}
                  fitMode={fitMode}
                  rotation={rotation}
                  activeAnnotationTool={activeAnnotationTool}
                  isReadOnly={isReadOnly}
                  stickyNotes={currentDocStickyNotes}
                  textAnnotations={currentDocTextAnnotations}
                  drawingPaths={currentDocDrawingPaths}
                  searchMatches={searchResults}
                  onAddStickyNote={handleAddStickyNote}
                  onAddTextAnnotation={handleAddTextAnnotation}
                  onAddDrawingPath={handleAddDrawingPath}
                  onDeleteStickyNote={handleDeleteStickyNote}
                  onSelectTextToCopy={(sel) => triggerToast(`Selected text: "${sel.substring(0, 30)}..."`)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showPasswordModal && (
        <PasswordModal
          documentTitle={activeDoc.title}
          correctPassword={activeDoc.password}
          onUnlock={handleUnlockDocument}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}

      {showShareModal && (
        <ShareModal
          documentTitle={activeDoc.title}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
