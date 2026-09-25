import React, { useState, useCallback, useEffect } from 'react';
import pptxgen from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import {
  PresentationDeck,
  Slide,
  SlideElement,
  LayoutType,
  AnimationType,
  PeerCollaborator,
  SlideComment,
} from './types';
import { DEFAULT_PRESENTATION_DECK } from './data/defaultDeck';
import { SlideCanvas } from './components/SlideCanvas';
import { PresentationMode } from './components/PresentationMode';
import { InsertElementModal } from './components/InsertElementModal';
import { ShareCollabModal } from './components/ShareCollabModal';
import { useSystemStore } from '../../shell/state/systemStore';
import { useContainerWidth } from '../../platform/layout/useContainerWidth';
import {
  Tv,
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layout,
  Type,
  Image as ImageIcon,
  Film,
  Table as TableIcon,
  BarChart2,
  Square,
  Sparkles,
  Download,
  Share2,
  MessageCircle,
  FileText,
  Palette,
  Play,
  RotateCcw,
  Check,
  Send,
  X,
  FileDown,
  Maximize2,
  Layers,
  Eye,
  Menu,
  MoreVertical,
} from 'lucide-react';

export default function PresentationApp() {
  // Deck State
  const [deck, setDeck] = useState<PresentationDeck>(DEFAULT_PRESENTATION_DECK);
  const [activeSlideId, setActiveSlideId] = useState<string>(DEFAULT_PRESENTATION_DECK.slides[0].id);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Modals & Mode States
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [showInsertModal, setShowInsertModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState<boolean>(false);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState<boolean>(false);

  // Layout follows the app window's own width, not the browser viewport —
  // below the shell's mobile breakpoint a window has no minimum width at all
  // (systemStore forces it to fill whatever real screen it's on), so this app
  // has to hold together well under its desktop `minW: 720`, not just at it.
  //
  // Two panes are fixed-width by design (the w-56 slide rail, the w-80
  // comments drawer) and don't have anywhere to shrink to, so below `isTablet`
  // the rail becomes a toggle drawer, and below `isMobile` the comments panel
  // becomes a full overlay instead of squeezing the canvas into a sliver.
  const { ref: rootRef, width } = useContainerWidth<HTMLDivElement>(0, 980);
  const isTablet = width < 760;
  const isMobile = width < 520;
  const [slidesNavOpen, setSlidesNavOpen] = useState<boolean>(false);
  // Once the rail is shown inline again there's no drawer to leave open.
  useEffect(() => {
    if (!isTablet) setSlidesNavOpen(false);
  }, [isTablet]);

  // Below `isTablet` the header no longer has room for five separate action
  // buttons on one line — Share/Comments/Export/Save fold into this menu,
  // leaving only the icon that opens it plus the primary Present button.
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);
  useEffect(() => {
    if (!isTablet) setShowActionsMenu(false);
  }, [isTablet]);

  // Presenter Notes Input State
  const [commentInput, setCommentInput] = useState<string>('');

  // Peer Collaborators Simulation
  const [peers] = useState<PeerCollaborator[]>([
    { id: 'p1', name: 'Alex M.', color: '#3b82f6', activeSlideId: activeSlideId },
    { id: 'p2', name: 'Maya S.', color: '#8b5cf6', activeSlideId: activeSlideId },
  ]);

  // System Store for saving to drive disk
  const setFiles = useSystemStore((state) => state.setFiles);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);

  // Active Slide Helper
  const activeSlideIndex = deck.slides.findIndex((s) => s.id === activeSlideId);
  const activeSlide = deck.slides[activeSlideIndex] || deck.slides[0];

  // Helper to update active slide
  const updateActiveSlide = useCallback(
    (updater: (slide: Slide) => Slide) => {
      setDeck((prev) => ({
        ...prev,
        slides: prev.slides.map((s) => (s.id === activeSlideId ? updater(s) : s)),
      }));
    },
    [activeSlideId]
  );

  // Create Slide
  const handleCreateSlide = (layout: LayoutType = 'content') => {
    const newSlideId = 'slide_' + Date.now();
    let newElements: SlideElement[] = [];

    if (layout === 'title') {
      newElements = [
        {
          id: 'el_t1_' + Date.now(),
          type: 'text',
          x: 10,
          y: 30,
          width: 80,
          height: 20,
          zIndex: 1,
          content: 'New Presentation Title',
          fontSize: 36,
          fontWeight: 'black',
          color: '#0f172a',
          align: 'center',
        },
        {
          id: 'el_sub1_' + Date.now(),
          type: 'text',
          x: 20,
          y: 52,
          width: 60,
          height: 10,
          zIndex: 2,
          content: 'Subtitle or Presenter Name',
          fontSize: 18,
          fontWeight: 'bold',
          color: '#64748b',
          align: 'center',
        },
      ];
    } else if (layout === 'content') {
      newElements = [
        {
          id: 'el_head_' + Date.now(),
          type: 'text',
          x: 6,
          y: 8,
          width: 88,
          height: 12,
          zIndex: 1,
          content: 'Slide Header Title',
          fontSize: 28,
          fontWeight: 'black',
          color: '#0f172a',
        },
        {
          id: 'el_body_' + Date.now(),
          type: 'text',
          x: 6,
          y: 25,
          width: 88,
          height: 60,
          zIndex: 2,
          content: '• Add key takeaway bullet points here\n• Emphasize core strategic pillars\n• Highlight metric data and team goals',
          fontSize: 16,
          fontWeight: 'normal',
          color: '#334155',
        },
      ];
    } else if (layout === 'two-column') {
      newElements = [
        {
          id: 'el_head_' + Date.now(),
          type: 'text',
          x: 6,
          y: 8,
          width: 88,
          height: 12,
          zIndex: 1,
          content: 'Comparative Analysis',
          fontSize: 28,
          fontWeight: 'black',
          color: '#0f172a',
        },
        {
          id: 'el_c1_' + Date.now(),
          type: 'text',
          x: 6,
          y: 25,
          width: 42,
          height: 60,
          zIndex: 2,
          content: 'Left Column Overview\n\n• Point 1\n• Point 2',
          fontSize: 15,
          color: '#334155',
        },
        {
          id: 'el_c2_' + Date.now(),
          type: 'text',
          x: 52,
          y: 25,
          width: 42,
          height: 60,
          zIndex: 3,
          content: 'Right Column Overview\n\n• Point A\n• Point B',
          fontSize: 15,
          color: '#334155',
        },
      ];
    }

    const newSlide: Slide = {
      id: newSlideId,
      title: `Slide ${deck.slides.length + 1}`,
      layout,
      bgColor: '#ffffff',
      transition: 'slide',
      notes: '',
      elements: newElements,
      comments: [],
    };

    setDeck((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
    }));
    setActiveSlideId(newSlideId);
    setShowLayoutMenu(false);
  };

  // Duplicate Slide
  const handleDuplicateSlide = (slideId: string) => {
    const target = deck.slides.find((s) => s.id === slideId);
    if (!target) return;
    const dupId = 'slide_' + Date.now();
    const dupSlide: Slide = {
      ...target,
      id: dupId,
      title: `${target.title} (Copy)`,
      elements: JSON.parse(JSON.stringify(target.elements)),
      comments: [],
    };

    setDeck((prev) => {
      const idx = prev.slides.findIndex((s) => s.id === slideId);
      const updated = [...prev.slides];
      updated.splice(idx + 1, 0, dupSlide);
      return { ...prev, slides: updated };
    });
    setActiveSlideId(dupId);
  };

  // Delete Slide
  const handleDeleteSlide = (slideId: string) => {
    if (deck.slides.length <= 1) {
      alert('Presentation must have at least one slide.');
      return;
    }
    const remaining = deck.slides.filter((s) => s.id !== slideId);
    setDeck((prev) => ({ ...prev, slides: remaining }));
    setActiveSlideId(remaining[0].id);
  };

  // Move Slide Up/Down
  const handleMoveSlide = (slideId: string, direction: 'up' | 'down') => {
    const idx = deck.slides.findIndex((s) => s.id === slideId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === deck.slides.length - 1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...deck.slides];
    const [moved] = updated.splice(idx, 1);
    updated.splice(newIdx, 0, moved);

    setDeck((prev) => ({ ...prev, slides: updated }));
  };

  // Insert Element to Active Slide
  const handleInsertElement = (elementPartial: Partial<SlideElement>) => {
    const newEl: SlideElement = {
      id: 'el_' + Date.now(),
      type: elementPartial.type || 'text',
      x: elementPartial.x || 20,
      y: elementPartial.y || 20,
      width: elementPartial.width || 40,
      height: elementPartial.height || 20,
      zIndex: activeSlide.elements.length + 1,
      ...elementPartial,
    };

    updateActiveSlide((s) => ({
      ...s,
      elements: [...s.elements, newEl],
    }));
    setSelectedElementId(newEl.id);
  };

  // Update Element
  const handleUpdateElement = (updatedEl: SlideElement) => {
    updateActiveSlide((s) => ({
      ...s,
      elements: s.elements.map((el) => (el.id === updatedEl.id ? updatedEl : el)),
    }));
  };

  // Delete Element
  const handleDeleteElement = (elId: string) => {
    updateActiveSlide((s) => ({
      ...s,
      elements: s.elements.filter((el) => el.id !== elId),
    }));
    if (selectedElementId === elId) setSelectedElementId(null);
  };

  // Comment Thread
  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    const newComment: SlideComment = {
      id: 'c_' + Date.now(),
      author: 'You',
      text: commentInput.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    updateActiveSlide((s) => ({
      ...s,
      comments: [...s.comments, newComment],
    }));
    setCommentInput('');
  };

  // Export to Native PPTX
  const handleExportPPTX = () => {
    const pptx = new pptxgen();
    pptx.title = deck.title;

    deck.slides.forEach((slide) => {
      const pptxSlide = pptx.addSlide();
      if (slide.bgColor) {
        pptxSlide.background = { fill: slide.bgColor.replace('#', '') };
      }

      slide.elements.forEach((el) => {
        if (el.type === 'text') {
          pptxSlide.addText(el.content || '', {
            x: `${el.x}%`,
            y: `${el.y}%`,
            w: `${el.width}%`,
            h: `${el.height}%`,
            fontSize: el.fontSize || 16,
            bold: el.fontWeight === 'bold' || el.fontWeight === 'black',
            color: el.color ? el.color.replace('#', '') : '000000',
            align: el.align || 'left',
          });
        } else if (el.type === 'table' && el.tableData) {
          const rows = el.tableData.map((row) => row.map((cell) => ({ text: cell })));
          pptxSlide.addTable(rows as any, {
            x: `${el.x}%`,
            y: `${el.y}%`,
            w: `${el.width}%`,
            h: `${el.height}%`,
            fontSize: 12,
          });
        }
      });

      if (slide.notes) {
        pptxSlide.addNotes(slide.notes);
      }
    });

    pptx.writeFile({ fileName: `${deck.title}.pptx` });
  };

  // Export to PDF
  const handleExportPDF = () => {
    const pdf = new jsPDF('landscape', 'pt', 'a4');
    deck.slides.forEach((slide, idx) => {
      if (idx > 0) pdf.addPage();
      pdf.setFontSize(22);
      pdf.text(slide.title, 40, 50);

      let y = 90;
      slide.elements.forEach((el) => {
        if (el.content) {
          pdf.setFontSize(el.fontSize || 12);
          pdf.text(el.content, 40, y);
          y += 30;
        }
      });
    });
    pdf.save(`${deck.title}.pdf`);
  };

  // Save Deck to Disk
  const handleSaveToDisk = () => {
    const content = JSON.stringify(deck, null, 2);
    setFiles((prev) => [
      ...prev,
      {
        id: 'file_deck_' + Date.now(),
        name: `${deck.title}.json`,
        type: 'file',
        content,
        parentId: resolveDefaultFolderId('Documents') || null,
        createdAt: new Date().toLocaleDateString(),
      },
    ]);
    alert(`💾 Presentation "${deck.title}" saved to Documents!`);
  };

  return (
    <div
      ref={rootRef}
      className="h-full flex flex-col bg-slate-900 font-sans text-slate-100 select-none overflow-hidden"
    >
      {/* ================= 1. TOP TITLEBAR & APP HEADER ================= */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Below `isTablet` the slide rail moves into a drawer, so this is
              its only remaining entry point. Its glyph (3 stacked lines) is
              deliberately different from the "more actions" glyph on the
              right (3 dots) — two identical hamburgers side by side is what
              read as "overlapping" before. */}
          {isTablet && (
            <button
              onClick={() => setSlidesNavOpen(true)}
              className="shrink-0 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer"
              title="Slides"
              aria-label="Open slides navigator"
            >
              <Menu size={16} />
            </button>
          )}

          <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md shrink-0">
            <Tv size={18} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <input
              type="text"
              value={deck.title}
              onChange={(e) => setDeck((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full min-w-0 bg-transparent text-xs font-black tracking-wide text-white focus:bg-slate-800/80 focus:outline-none px-1.5 py-0.5 rounded border border-transparent focus:border-slate-700"
            />
            {/* Decorative subtitle — the first thing to go once space is tight. */}
            {!isTablet && (
              <span className="text-[10px] text-slate-400 font-medium truncate">
                Drive OSX Presentation Studio • Live Sync
              </span>
            )}
          </div>
        </div>

        {/* Action Controls — on a wide window, every action is its own
            button. Below `isTablet` that row has nowhere to go (there is no
            wrap and nothing left to shrink), so everything except the
            primary Present action folds into a single overflow menu instead
            of quietly clipping off the edge of the window. */}
        <div className="flex items-center gap-2 shrink-0">
          {!isTablet ? (
            <>
              {/* Share Collab */}
              <button
                onClick={() => setShowShareModal(true)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 size={13} className="text-blue-400" /> Share (2)
              </button>

              {/* Comments Toggle */}
              <button
                onClick={() => setCommentsDrawerOpen(!commentsDrawerOpen)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border cursor-pointer ${
                  commentsDrawerOpen
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <MessageCircle size={13} />
                <span>Comments ({activeSlide.comments.length})</span>
              </button>

              {/* Export Group */}
              <div className="flex items-center gap-1 bg-blue-600 rounded-lg p-0.5 shadow-md">
                <button
                  onClick={handleExportPPTX}
                  className="px-2.5 py-1 text-white text-xs font-bold hover:bg-blue-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                  title="Export as Native PowerPoint .PPTX"
                >
                  <Download size={13} /> PPTX
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-2 py-1 text-white text-xs font-bold hover:bg-blue-700 rounded transition-colors cursor-pointer"
                  title="Export as PDF Document"
                >
                  PDF
                </button>
              </div>

              {/* Save to System Disk */}
              <button
                onClick={handleSaveToDisk}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer"
                title="Save to Drive System Disk"
              >
                <Download size={14} />
              </button>
            </>
          ) : (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowActionsMenu((v) => !v)}
                className={`p-1.5 rounded-lg border cursor-pointer flex items-center gap-1 ${
                  commentsDrawerOpen
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="More actions"
                aria-label="More actions"
              >
                <MoreVertical size={16} />
                {activeSlide.comments.length > 0 && (
                  <span className="text-[10px] font-bold leading-none">{activeSlide.comments.length}</span>
                )}
              </button>

              {showActionsMenu && (
                <div className="absolute top-10 right-0 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-40 space-y-0.5">
                  <button
                    onClick={() => {
                      setShowShareModal(true);
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer flex items-center gap-2"
                  >
                    <Share2 size={14} className="text-blue-400" /> Share (2)
                  </button>
                  <button
                    onClick={() => {
                      setCommentsDrawerOpen((v) => !v);
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer flex items-center gap-2"
                  >
                    <MessageCircle size={14} /> Comments ({activeSlide.comments.length})
                  </button>
                  <button
                    onClick={() => {
                      handleExportPPTX();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer flex items-center gap-2"
                  >
                    <Download size={14} /> Export PPTX
                  </button>
                  <button
                    onClick={() => {
                      handleExportPDF();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer flex items-center gap-2"
                  >
                    <FileDown size={14} /> Export PDF
                  </button>
                  <button
                    onClick={() => {
                      handleSaveToDisk();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer flex items-center gap-2"
                  >
                    <Download size={14} /> Save to Disk
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Presentation Mode Button — the primary action, so it's the one
              button that never folds into the overflow menu. */}
          <button
            onClick={() => setIsPresentationMode(true)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play size={13} /> {!isMobile && 'Present'}
          </button>
        </div>
      </div>

      {/* ================= 2. SECONDARY TOOLBAR RIBBON ================= */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between overflow-x-auto shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          {/* Create Slide & Layout Chooser */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} /> {isTablet ? 'Layouts' : 'Slide Layouts'}
            </button>

            {showLayoutMenu && (
              <div className="absolute top-10 left-0 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-40 space-y-1">
                {[
                  { id: 'title', label: 'Title Slide' },
                  { id: 'content', label: 'Title & Content' },
                  { id: 'two-column', label: 'Two Columns' },
                  { id: 'blank', label: 'Blank Canvas' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleCreateSlide(l.id as LayoutType)}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Insert Elements Buttons */}
          <div className="h-5 w-px bg-slate-800 mx-1 shrink-0" />

          <button
            onClick={() =>
              handleInsertElement({
                type: 'text',
                content: 'Editable Text Block',
                fontSize: 20,
                color: '#0f172a',
              })
            }
            className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Type size={13} className="text-sky-400" /> Text
          </button>

          <button
            onClick={() => setShowInsertModal(true)}
            className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Square size={13} className="text-amber-400" /> {isTablet ? 'Shapes' : 'Shapes & Charts...'}
          </button>

          {/* Slide Transition Selector */}
          <div className="h-5 w-px bg-slate-800 mx-1 shrink-0" />

          <div className="flex items-center gap-1.5 text-xs shrink-0 whitespace-nowrap">
            <span className="text-slate-400 font-bold">Transition:</span>
            <select
              value={activeSlide.transition}
              onChange={(e) => {
                const tr = e.target.value as AnimationType;
                updateActiveSlide((s) => ({ ...s, transition: tr }));
              }}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="none">None</option>
              <option value="fade">Fade Transition</option>
              <option value="slide">Slide In</option>
              <option value="zoom">Zoom Scale</option>
              <option value="appear">Instant Appear</option>
            </select>
          </div>

          {/* Background Fill */}
          <div className="flex items-center gap-1.5 text-xs ml-2 shrink-0 whitespace-nowrap">
            <span className="text-slate-400 font-bold">Bg Fill:</span>
            <input
              type="color"
              value={activeSlide.bgColor || '#ffffff'}
              onChange={(e) => {
                const bg = e.target.value;
                updateActiveSlide((s) => ({ ...s, bgColor: bg }));
              }}
              className="w-6 h-6 rounded-md border border-slate-700 cursor-pointer p-0"
            />
          </div>
        </div>

        {/* Selected Element Quick Properties */}
        {selectedElementId && (
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 shrink-0 ml-2 whitespace-nowrap">
            {!isTablet && <span className="text-blue-400 font-bold">Element Selected</span>}
            <button
              onClick={() => handleDeleteElement(selectedElementId)}
              className="hover:text-rose-400 p-1 cursor-pointer"
              title="Delete element"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ================= 3. MAIN WORKSPACE VIEWPORT ================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Backdrop for the slide rail when it's a drawer, not an inline pane. */}
        {isTablet && slidesNavOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/40"
            onClick={() => setSlidesNavOpen(false)}
          />
        )}

        {/* LEFT SLIDES THUMBNAIL NAVIGATOR SIDEBAR — inline on wide windows;
            below `isTablet` there isn't 224px to spare, so it becomes an
            overlay drawer opened from the header's menu button instead. */}
        <div
          className={`w-56 bg-slate-950 border-r border-slate-800 flex-col p-3 overflow-y-auto space-y-3 shrink-0 custom-scrollbar ${
            isTablet
              ? slidesNavOpen
                ? 'flex absolute inset-y-0 left-0 z-30 shadow-2xl'
                : 'hidden'
              : 'flex'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Slides Navigator ({deck.slides.length})
            </span>
            {isTablet && (
              <button
                onClick={() => setSlidesNavOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
                aria-label="Close slides navigator"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {deck.slides.map((s, idx) => {
            const isActive = s.id === activeSlideId;
            return (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSlideId(s.id);
                  setSelectedElementId(null);
                  if (isTablet) setSlidesNavOpen(false);
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative group ${
                  isActive
                    ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                {/* Slide Number Header */}
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-400">
                  <span className={`truncate min-w-0 ${isActive ? 'text-blue-400 font-extrabold' : ''}`}>
                    {idx + 1}. {s.title}
                  </span>
                  {/* Hover-revealed on a wide window; drawer mode is opened by
                      a tap with no hover to reveal these, so they stay on. */}
                  <div
                    className={`flex items-center gap-0.5 transition-opacity shrink-0 ${
                      isTablet ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(s.id, 'up');
                      }}
                      className="p-0.5 hover:text-white"
                      title="Move Up"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(s.id, 'down');
                      }}
                      className="p-0.5 hover:text-white"
                      title="Move Down"
                    >
                      <ChevronDown size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateSlide(s.id);
                      }}
                      className="p-0.5 hover:text-blue-400"
                      title="Duplicate"
                    >
                      <Copy size={12} />
                    </button>
                    {deck.slides.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(s.id);
                        }}
                        className="p-0.5 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mini Preview Stage */}
                <div
                  className="w-full aspect-[16/9] rounded-lg border border-slate-800 overflow-hidden relative p-1 shadow-inner"
                  style={{ backgroundColor: s.bgColor || '#ffffff' }}
                >
                  {s.elements.map((el) => (
                    <div
                      key={el.id}
                      style={{
                        position: 'absolute',
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: `${el.width}%`,
                        height: `${el.height}%`,
                      }}
                      className="bg-slate-400/30 rounded-xs pointer-events-none"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER SLIDE CANVAS EDITOR — the p-8 breathing room is the first
            thing given back to the canvas once the window is tight. */}
        <div
          className={`flex-1 bg-slate-900/60 flex flex-col items-center justify-center relative overflow-auto custom-scrollbar ${
            isMobile ? 'p-3' : isTablet ? 'p-5' : 'p-8'
          }`}
        >
          <div className="w-full max-w-4xl">
            <SlideCanvas
              slide={activeSlide}
              selectedElementId={selectedElementId}
              onSelectElement={(id) => setSelectedElementId(id)}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
            />
          </div>

          {/* PRESENTER NOTES PANEL (BOTTOM OF EDITOR STAGE) */}
          <div className={`w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl ${isTablet ? 'mt-4' : 'mt-6'}`}>
            <div
              className={`flex mb-2 ${
                isMobile ? 'flex-col items-start gap-0.5' : 'items-center justify-between'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-extrabold text-blue-400">
                <FileText size={15} /> Speaker / Presenter Notes
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">
                Only visible in Presenter Mode
              </span>
            </div>
            <textarea
              value={activeSlide.notes || ''}
              onChange={(e) => {
                const val = e.target.value;
                updateActiveSlide((s) => ({ ...s, notes: val }));
              }}
              placeholder="Write talking points, timing cues, or key stats for this slide..."
              className="w-full h-16 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>
        </div>

        {/* RIGHT COMMENTS DRAWER — a side pane down to `isMobile`; below that
            there's no room to squeeze the canvas further, so it becomes a
            full overlay instead, same as the slide rail does above. */}
        {commentsDrawerOpen && (
          <>
            {isMobile && (
              <div
                className="absolute inset-0 z-20 bg-black/40"
                onClick={() => setCommentsDrawerOpen(false)}
              />
            )}
            <div
              className={`bg-slate-950 border-l border-slate-800 flex flex-col font-sans shrink-0 ${
                isMobile ? 'absolute inset-y-0 right-0 z-30 w-full max-w-xs shadow-2xl' : 'w-80'
              }`}
            >
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <MessageCircle size={15} className="text-blue-400" />
                  <span>Slide Comments & Feedback</span>
                </div>
                <button
                  onClick={() => setCommentsDrawerOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                {activeSlide.comments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-medium">
                    No comments on this slide yet.<br />Add a review note below!
                  </div>
                ) : (
                  activeSlide.comments.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-blue-400">{c.author}</span>
                        <span className="text-[10px] text-slate-500">{c.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                  placeholder="Write slide comment..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <button
                  onClick={handleAddComment}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= 4. MODALS & PRESENTATION OVERLAY ================= */}
      {isPresentationMode && (
        <PresentationMode
          slides={deck.slides}
          initialSlideIndex={activeSlideIndex}
          onClose={() => setIsPresentationMode(false)}
        />
      )}

      {showInsertModal && (
        <InsertElementModal
          onInsert={handleInsertElement}
          onClose={() => setShowInsertModal(false)}
        />
      )}

      {showShareModal && (
        <ShareCollabModal
          deckTitle={deck.title}
          peers={peers}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
