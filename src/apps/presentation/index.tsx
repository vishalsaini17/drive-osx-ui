import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import {
  PRESENTATION_EXTENSION,
  PRESENTATION_MIME_TYPE,
  blankPresentationDeck,
  parsePresentationFile,
  serializePresentationFile,
} from './format';
import { importPptxFile } from './pptxImport';
import { SlideCanvas } from './components/SlideCanvas';
import { PresentationMode } from './components/PresentationMode';
import { InsertElementModal } from './components/InsertElementModal';
import { PresentationErrorBoundary } from './ErrorBoundary';
import { ShareCollabModal } from './components/ShareCollabModal';
import OpenPresentationModal from './components/OpenPresentationModal';
import PageSetupModal from './components/PageSetupModal';
import VersionHistoryModal from './components/VersionHistoryModal';
import PropertiesModal from '../file-explorer/components/PropertiesModal';
import { useSystemStore } from '../../shell/state/systemStore';
import { FileService } from '../../platform/files/FileService';
import { ApiError } from '../../platform/api/http';
import { FileItem } from '../../platform/types';
import { useContainerWidth } from '../../platform/layout/useContainerWidth';
import { MenuPanel, placePanel, Placement } from '../../shell/window-manager/WindowMenu';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { MenuItem, separator } from '../../platform/menus/types';
import { DEFAULT_DARK_THEME_ID } from '../../platform/theme/themes';
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
  Loader2,
  AlertTriangle,
  Pencil,
  FilePlus,
  FolderOpen,
  Upload,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Move,
  Printer,
  History,
} from 'lucide-react';

/**
 * One "File / Edit / View / ..." label in the Slides-style menu bar.
 *
 * Deliberately controlled from a single shared `openId`/`placement` pair
 * in `PresentationApp` (passed down as props) rather than each button owning
 * its own open/closed state — otherwise opening one never closes another
 * (each was independently tracking "am I open?"), which is exactly the bug
 * this replaced: File and Edit could both be open on screen at once.
 * `data-menu-trigger` marks every trigger button so the shared
 * outside-click listener (below, in `PresentationApp`) can tell "clicked
 * another trigger" apart from "clicked outside everything" without needing
 * a ref per button — a plain `event.currentTarget.getBoundingClientRect()`
 * on click is enough to position the panel.
 */
function MenuBarButton({
  id,
  label,
  items,
  openId,
  placement,
  onOpen,
  onClose,
}: {
  id: string;
  label: string;
  items: MenuItem[];
  openId: string | null;
  placement: Placement | null;
  onOpen: (id: string, rect: DOMRect) => void;
  onClose: () => void;
}) {
  const isOpen = openId === id;
  return (
    <>
      <button
        data-menu-trigger
        onClick={(event) => (isOpen ? onClose() : onOpen(id, event.currentTarget.getBoundingClientRect()))}
        className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
          isOpen ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        {label}
      </button>
      {isOpen && placement && (
        <MenuPanel items={items} theme={DEFAULT_DARK_THEME_ID} onClose={onClose} placement={placement} />
      )}
    </>
  );
}

export default function PresentationApp(props: { windowId?: string }) {
  return (
    <PresentationErrorBoundary>
      <PresentationAppInner {...props} />
    </PresentationErrorBoundary>
  );
}

function PresentationAppInner({ windowId = 'presentation' }: { windowId?: string }) {
  // Deck State — a brand-new window starts on a blank single-slide deck;
  // `initialDeckRef` keeps `deck` and `activeSlideId` in sync on first mount
  // without calling `blankPresentationDeck()` twice (which would mint two
  // different slide ids for what's meant to be the same initial slide).
  const initialDeckRef = useRef<PresentationDeck | null>(null);
  if (!initialDeckRef.current) initialDeckRef.current = blankPresentationDeck();
  const [deck, setDeck] = useState<PresentationDeck>(initialDeckRef.current);
  const [activeSlideId, setActiveSlideId] = useState<string>(initialDeckRef.current.slides[0].id);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Real backend persistence (CLAUDE.md §10/§38) — `currentFileId` is null
  // until the deck has been saved at least once, mirroring Word Book's
  // `currentFileId`/`docTitle` pattern (apps/wordbook/index.tsx).
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modals & Mode States
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [showInsertModal, setShowInsertModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState<boolean>(false);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState<boolean>(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState<boolean>(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState<boolean>(false);

  // Every dropdown in this app (the File/Edit/View/Insert/Slide menu bar,
  // the "Slide Layouts" button, and the tablet "More actions" overflow)
  // renders through the shell's own `MenuPanel` portal rather than a plain
  // `absolute` div — this app runs inside an `AppWindow`, whose frame and
  // content area both set `overflow: hidden`/`auto` (AppWindow.tsx), which
  // clips any in-flow absolutely-positioned dropdown that extends past the
  // window's visible bounds. `MenuPanel` exists in the shell specifically to
  // escape that clipping (see its own doc comment in WindowMenu.tsx).
  //
  // All of them share this one `openMenuId`/`openMenuPlacement` pair rather
  // than each owning its own — with independent state, opening one never
  // closed another (File and Edit could both be open on screen at once).
  // A single shared "which one is open" value makes them mutually exclusive
  // for free: opening a second one just overwrites which id/placement this
  // holds, which unmounts whichever panel was open before.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openMenuPlacement, setOpenMenuPlacement] = useState<Placement | null>(null);
  const openMenu = useCallback((id: string, rect: DOMRect) => {
    setOpenMenuId(id);
    setOpenMenuPlacement(placePanel(rect, 'below'));
  }, []);
  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  // Dismiss whichever menu is open on an outside click or Escape — mirrors
  // WindowMenu.tsx's own listener for the exact same reason: `MenuPanel` is
  // a portal, so a plain "is the click inside my own DOM subtree" check
  // can't work; every trigger button is marked `data-menu-trigger` instead,
  // and every panel already renders with `role="menu"`.
  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[role="menu"]') || target.closest('[data-menu-trigger]')) return;
      closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId, closeMenu]);

  // Slide rename — a plain double-click/pencil-icon inline edit, the same
  // affordance the title input above already gives the deck itself.
  const [renamingSlideId, setRenamingSlideId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

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
  useEffect(() => {
    if (!isTablet) closeMenu();
  }, [isTablet]);

  // Presenter Notes Input State
  const [commentInput, setCommentInput] = useState<string>('');

  // Peer Collaborators Simulation
  const [peers] = useState<PeerCollaborator[]>([
    { id: 'p1', name: 'Alex M.', color: '#3b82f6', activeSlideId: activeSlideId },
    { id: 'p2', name: 'Maya S.', color: '#8b5cf6', activeSlideId: activeSlideId },
  ]);

  // System Store for real Drive persistence
  const files = useSystemStore((state) => state.files);
  const setFiles = useSystemStore((state) => state.setFiles);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);
  const handleDeleteFile = useSystemStore((state) => state.handleDeleteFile);
  const syncFilesFromBackend = useSystemStore((state) => state.syncFilesFromBackend);
  const addNotification = useSystemStore((state) => state.addNotification);
  const presentationFileId = useSystemStore((state) => state.presentationFileId);
  const presentationFileName = useSystemStore((state) => state.presentationFileName);
  const presentationCurrentFolderId = useSystemStore((state) => state.presentationCurrentFolderId);
  const consumePendingPresentationFile = useSystemStore((state) => state.consumePendingPresentationFile);
  const requestFilePick = useSystemStore((state) => state.requestFilePick);
  const filePickerResult = useSystemStore((state) => state.filePickerResults[windowId]);
  const consumeFilePickerResult = useSystemStore((state) => state.consumeFilePickerResult);
  const focusWindow = useSystemStore((state) => state.focusWindow);

  // Active Slide Helper
  const activeSlideIndex = deck.slides.findIndex((s) => s.id === activeSlideId);
  const activeSlide = deck.slides[activeSlideIndex] || deck.slides[0];
  const selectedElement = selectedElementId ? activeSlide.elements.find((el) => el.id === selectedElementId) ?? null : null;

  // Every user edit goes through `mutateDeck` rather than `setDeck` directly
  // so dirty-tracking can't be forgotten at a call site — only `loadDeck`
  // (loading a file) and `handleSave` (clearing dirty after a successful
  // save) touch `setIsDirty` themselves.
  const mutateDeck = useCallback((updater: (prev: PresentationDeck) => PresentationDeck) => {
    setDeck(updater);
    setIsDirty(true);
  }, []);

  // Helper to update active slide
  const updateActiveSlide = useCallback(
    (updater: (slide: Slide) => Slide) => {
      mutateDeck((prev) => ({
        ...prev,
        slides: prev.slides.map((s) => (s.id === activeSlideId ? updater(s) : s)),
      }));
    },
    [activeSlideId, mutateDeck]
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

    mutateDeck((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
    }));
    setActiveSlideId(newSlideId);
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

    mutateDeck((prev) => {
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
    mutateDeck((prev) => ({ ...prev, slides: remaining }));
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

    mutateDeck((prev) => ({ ...prev, slides: updated }));
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

  // Save Deck — updates the linked file in place once one exists, otherwise
  // creates it in Documents. Mirrors Word Book's `handleSave`
  // (apps/wordbook/index.tsx) so this app persists through the same real
  // backend (FileService) rather than the old local-only `setFiles` hack.
  const handleSave = useCallback(async (overrides?: { forceNew?: boolean; nameOverride?: string; folderIdOverride?: string | null }) => {
    const targetTitle = overrides?.nameOverride ?? deck.title;
    const content = serializePresentationFile(overrides?.nameOverride ? { ...deck, title: overrides.nameOverride } : deck);
    const baseName = targetTitle.endsWith(PRESENTATION_EXTENSION)
      ? targetTitle.slice(0, -PRESENTATION_EXTENSION.length)
      : targetTitle;
    const forceNew = overrides?.forceNew ?? false;
    setIsSaving(true);
    try {
      if (currentFileId && !forceNew) {
        const name = `${baseName}${PRESENTATION_EXTENSION}`;
        const updated = await FileService.updateFile(currentFileId, {
          name,
          content,
          mimeType: PRESENTATION_MIME_TYPE,
        });
        setFiles((prev) => prev.map((f) => (f.id === currentFileId ? { ...f, name: updated.name, content } : f)));
      } else {
        const parentId =
          overrides && 'folderIdOverride' in overrides ? overrides.folderIdOverride ?? null : currentFolderId ?? resolveDefaultFolderId('Documents');
        // A brand-new deck's title always starts as the same default
        // ("Untitled Presentation"), so a first Save routinely collides with
        // an earlier untitled deck already sitting in the same folder — the
        // backend enforces unique names per folder and rejects that with a
        // 409. Rather than surface that as a dead end, resolve it the way
        // most file managers do: retry under an auto-numbered name. Any
        // *other* failure (or exhausting these attempts) still falls through
        // to the real error message below instead of retrying blindly.
        let created;
        for (let attempt = 1; ; attempt += 1) {
          const candidateName = attempt === 1 ? `${baseName}${PRESENTATION_EXTENSION}` : `${baseName} (${attempt})${PRESENTATION_EXTENSION}`;
          try {
            created = await FileService.createFile({
              name: candidateName,
              type: 'file',
              parentId,
              content,
              mimeType: PRESENTATION_MIME_TYPE,
            });
            break;
          } catch (error) {
            if (error instanceof ApiError && error.status === 409 && attempt < 20) continue;
            throw error;
          }
        }
        setCurrentFileId(created._id);
        setCurrentFolderId(created.parentId);
        const resolvedTitle = created.name.endsWith(PRESENTATION_EXTENSION)
          ? created.name.slice(0, -PRESENTATION_EXTENSION.length)
          : created.name;
        // Covers both a "Save As…" rename and an auto-resolved name conflict
        // — either way, the title on screen should match what Drive actually
        // has, rather than silently diverging.
        if (resolvedTitle !== deck.title) setDeck((prev) => ({ ...prev, title: resolvedTitle }));
        setFiles((prev) => [
          ...prev,
          {
            id: created._id,
            name: created.name,
            type: 'file' as const,
            content,
            parentId: created.parentId,
            createdAt: created.createdAt,
          },
        ]);
      }
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save presentation:', error);
      const detail = error instanceof ApiError ? error.message : 'Please check your connection and try again.';
      alert(`Could not save "${deck.title}".\n\n${detail}`);
    } finally {
      setIsSaving(false);
    }
  }, [deck, currentFileId, currentFolderId, resolveDefaultFolderId, setFiles]);

  // Renaming a saved file also patches the Drive filename directly (not
  // just the local `deck.title`), same split wordbook's `commitTitleChange`
  // makes — the embedded title inside `content` only catches up once the
  // next Save/autosave lands, same as any other edit.
  const commitTitleChange = useCallback(
    (newTitle: string) => {
      const cleanName = newTitle.trim();
      if (!cleanName || cleanName === deck.title) return;
      const previousTitle = deck.title;
      mutateDeck((prev) => ({ ...prev, title: cleanName }));
      if (!currentFileId) return;
      void FileService.updateFile(currentFileId, { name: `${cleanName}${PRESENTATION_EXTENSION}` })
        .then((updated) => {
          setFiles((prev) => prev.map((f) => (f.id === currentFileId ? { ...f, name: updated.name } : f)));
        })
        .catch((error) => {
          console.error('Failed to rename presentation:', error);
          mutateDeck((prev) => ({ ...prev, title: previousTitle }));
          const detail = error instanceof ApiError ? error.message : 'Please check your connection and try again.';
          alert(`Could not rename to "${cleanName}".\n\n${detail}`);
        });
    },
    [currentFileId, deck.title, mutateDeck, setFiles]
  );

  const handleRename = useCallback(() => {
    const name = prompt('Rename presentation:', deck.title);
    if (name === null) return;
    commitTitleChange(name);
  }, [deck.title, commitTitleChange]);

  const handleMakeCopy = useCallback(async () => {
    if (!currentFileId) {
      alert('Save the presentation at least once before making a copy.');
      return;
    }
    try {
      const copy = await FileService.duplicateFile(currentFileId);
      await syncFilesFromBackend(currentFolderId);
      addNotification({ sender: 'Presentation', text: `Created a copy: "${copy.name}"`, type: 'success' });
    } catch (error) {
      console.error('Failed to duplicate presentation:', error);
      alert('Could not make a copy. Please try again.');
    }
  }, [currentFileId, currentFolderId, syncFilesFromBackend, addNotification]);

  const handleToggleStar = useCallback(async () => {
    if (!currentFileId) {
      alert('Save the presentation at least once before starring it.');
      return;
    }
    try {
      const updated = await FileService.toggleStar(currentFileId);
      setFiles((prev) => prev.map((f) => (f.id === currentFileId ? { ...f, starred: updated.starred } : f)));
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }, [currentFileId, setFiles]);

  // `files` (the OS-wide list) may not yet contain a file this window just
  // created itself — a fallback keeps Details/rename/etc. working the first
  // moment after a brand-new Save, before anything ever re-lists the parent
  // folder, same reasoning as Word Book's identical fallback.
  const currentFileItem: FileItem | null = currentFileId
    ? files.find((f) => f.id === currentFileId) ?? {
        id: currentFileId,
        name: deck.title.endsWith(PRESENTATION_EXTENSION) ? deck.title : `${deck.title}${PRESENTATION_EXTENSION}`,
        type: 'file',
        parentId: currentFolderId,
        createdAt: new Date().toISOString(),
      }
    : null;

  const [folderPathString, setFolderPathString] = useState('My Drive');
  useEffect(() => {
    if (!isPropertiesOpen || !currentFileId) return;
    FileService.breadcrumbs(currentFileId)
      .then((path) => setFolderPathString(path.length > 0 ? path.map((p) => p.name).join(' / ') : 'My Drive'))
      .catch(() => setFolderPathString('My Drive'));
  }, [isPropertiesOpen, currentFileId]);

  const handleDownloadRaw = useCallback(async () => {
    if (!currentFileId || !currentFileItem) {
      alert('Save the presentation at least once before downloading it.');
      return;
    }
    try {
      const url = await FileService.downloadUrl(currentFileId);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFileItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download presentation:', error);
      alert('Could not download the presentation. Please try again.');
    }
  }, [currentFileId, currentFileItem]);

  // Autosave: only meaningful once the deck is linked to a real file —
  // matches this platform's other document apps (Word Book).
  useEffect(() => {
    if (!isDirty || !currentFileId) return;
    const timer = setTimeout(() => void handleSave(), 4000);
    return () => clearTimeout(timer);
  }, [isDirty, currentFileId, handleSave]);

  // Flush a save when this window closes or minimizes — both fully unmount
  // this component (AppWindow.tsx renders `null` once `!isOpen ||
  // isMinimized`), which would otherwise cancel the autosave timer above
  // mid-debounce and silently drop whatever was typed in the last ~4
  // seconds. Reading `isDirty`/`handleSave` through refs (rather than
  // closing over them directly) is what lets the cleanup below — captured
  // once, on mount — still see their latest values when it actually runs.
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) void handleSaveRef.current();
    };
  }, []);

  // Loading a deck from Drive — resets dirty tracking so the just-loaded
  // content is never mistaken for an unsaved edit.
  const loadDeck = useCallback((loadedDeck: PresentationDeck, fileId: string | null, folderId: string | null) => {
    setDeck(loadedDeck);
    setActiveSlideId(loadedDeck.slides[0]?.id ?? '');
    setSelectedElementId(null);
    setCurrentFileId(fileId);
    setCurrentFolderId(folderId);
    setIsDirty(false);
    setLoadError(null);
  }, []);

  const handleMoveToTrash = useCallback(async () => {
    if (!currentFileId) return;
    const file = files.find((f) => f.id === currentFileId);
    if (!file) return;
    if (!confirm(`Move "${deck.title}" to Trash?`)) return;
    await handleDeleteFile({ ...file, originalParentId: file.parentId });
    loadDeck(blankPresentationDeck(), null, null);
  }, [currentFileId, files, deck.title, handleDeleteFile, loadDeck]);

  const loadFileById = useCallback(
    async (fileId: string, folderIdHint: string | null) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const full = await FileService.getFile(fileId);
        if (!full) {
          setLoadError('This file could not be found — it may have been moved or deleted.');
          return;
        }
        if (!full.content) {
          // A real binary PowerPoint file never gets inlined content by the
          // backend (only text-like mimeTypes are) — fetch its actual bytes
          // and import it directly instead. Only `.pptx` (a zip of XML) can
          // be read this way; legacy `.ppt` is a different, OLE binary
          // format `importPptxFile` can't open, so that still gets a clear
          // message rather than a silent failure.
          const lower = full.name.toLowerCase();
          if (lower.endsWith('.pptx')) {
            try {
              const url = await FileService.downloadUrl(fileId);
              const response = await fetch(url);
              const arrayBuffer = await response.arrayBuffer();
              const baseName = full.name.replace(/\.pptx$/i, '');
              const importedDeck = await importPptxFile(arrayBuffer, baseName);
              // Never linked to the original file's id — same reasoning as
              // Word Book's docx import: Save only knows how to write this
              // app's own `.deck` format back out, and doing that into a
              // slot that used to hold a real .pptx would silently corrupt
              // it.
              loadDeck(importedDeck, null, null);
            } catch (error) {
              console.error('Failed to import PowerPoint file:', error);
              setLoadError('This PowerPoint file could not be opened — it may be corrupted or use unsupported features.');
            }
            return;
          }
          setLoadError(
            lower.endsWith('.ppt')
              ? "Legacy .ppt files aren't supported — re-save this presentation as .pptx (File > Save As > PowerPoint Presentation) and try again."
              : 'This file has no content to open.'
          );
          return;
        }
        const loadedDeck = parsePresentationFile(full.content);
        loadDeck(loadedDeck, full.id, full.parentId ?? folderIdHint);
      } catch (error) {
        console.error('Failed to open presentation:', error);
        setLoadError('This file could not be opened — it may not be a valid Drive OSX presentation.');
      } finally {
        setIsLoading(false);
      }
    },
    [loadDeck]
  );

  // File > New — starts a fresh blank deck, unlinked from any Drive file
  // until the next Save. Confirms first if there's unsaved work, same as
  // Word Book's handleNew.
  const handleNew = useCallback(() => {
    if (isDirty && !confirm('Discard unsaved changes and start a new presentation?')) return;
    loadDeck(blankPresentationDeck(), null, null);
  }, [isDirty, loadDeck]);

  // File > Open — a lightweight in-app modal listing every .deck/.ppt/.pptx
  // file already in Drive (`OpenPresentationModal`), same UX Word Book's own
  // "Open…" uses (`OpenBookModal`) — not the full File Manager picker window,
  // which is unnecessary ceremony for what's really just "pick one of my
  // existing presentations".
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const handleSelectFile = useCallback(
    (file: FileItem) => {
      void loadFileById(file.id, file.parentId);
    },
    [loadFileById]
  );

  // File > Save As… — asks the real File Manager (opened as a picker window)
  // for a destination *folder*, then prompts for a name, same two-step flow
  // Word Book's `beginSaveAs` uses. A brand-new, never-saved deck's plain
  // "Save" also lands here, since it has nowhere to go yet either.
  const pendingSaveAsRef = useRef(false);
  const beginSaveAs = useCallback(() => {
    pendingSaveAsRef.current = true;
    requestFilePick(windowId, 'folder');
  }, [requestFilePick, windowId]);

  const handleSaveClick = useCallback(() => {
    if (!currentFileId) {
      beginSaveAs();
      return;
    }
    void handleSave();
  }, [currentFileId, beginSaveAs, handleSave]);

  // File > Move… — same folder-picker window as Save As, but relocates the
  // *existing* file in place (`FileService.moveFile`) instead of writing a
  // new one under a new name.
  const pendingMoveRef = useRef(false);
  const beginMove = useCallback(() => {
    if (!currentFileId) return;
    pendingMoveRef.current = true;
    requestFilePick(windowId, 'folder');
  }, [currentFileId, requestFilePick, windowId]);

  useEffect(() => {
    if (!filePickerResult) return;
    const result = consumeFilePickerResult(windowId);
    if (!result) return;
    focusWindow(windowId);
    if (pendingSaveAsRef.current) {
      pendingSaveAsRef.current = false;
      if (result.mode !== 'folder') return;
      const baseName = deck.title.endsWith(PRESENTATION_EXTENSION) ? deck.title.slice(0, -PRESENTATION_EXTENSION.length) : deck.title;
      const name = prompt('Save as:', baseName);
      if (!name) return;
      void handleSave({ forceNew: true, nameOverride: name, folderIdOverride: result.folder.id });
      return;
    }
    if (pendingMoveRef.current) {
      pendingMoveRef.current = false;
      if (result.mode !== 'folder' || !currentFileId) return;
      FileService.moveFile(currentFileId, result.folder.id)
        .then((updated) => {
          setCurrentFolderId(updated.parentId);
          setFiles((prev) => prev.map((f) => (f.id === currentFileId ? { ...f, parentId: updated.parentId } : f)));
        })
        .catch((error) => {
          console.error('Failed to move presentation:', error);
          alert('Could not move this presentation. Please try again.');
        });
      return;
    }
  }, [filePickerResult, windowId, consumeFilePickerResult, focusWindow, deck.title, handleSave, currentFileId, setFiles]);

  // File > Import from PC — reads a local `.deck` or `.pptx` file directly
  // (no Drive round trip needed first). Legacy `.ppt` still gets the clear
  // "not supported" message, same as opening one from Drive does
  // (`loadFileById` above) — it's a different, non-zip binary format
  // `importPptxFile` can't read.
  const handleImportFromPC = useCallback(() => {
    if (isDirty && !confirm('Discard unsaved changes and import a presentation?')) return;
    importInputRef.current?.click();
  }, [isDirty]);

  const handleImportFileSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.pptx')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const baseName = file.name.replace(/\.pptx$/i, '');
          const importedDeck = await importPptxFile(arrayBuffer, baseName);
          loadDeck(importedDeck, null, null);
        } catch (error) {
          console.error('Failed to import PowerPoint file:', error);
          setLoadError('This PowerPoint file could not be imported — it may be corrupted or use unsupported features.');
        }
        return;
      }
      if (lower.endsWith('.ppt')) {
        setLoadError("Legacy .ppt files aren't supported — re-save this presentation as .pptx (File > Save As > PowerPoint Presentation) and try again.");
        return;
      }
      try {
        const text = await file.text();
        const loadedDeck = parsePresentationFile(text);
        loadDeck(loadedDeck, null, null);
      } catch (error) {
        console.error('Failed to import presentation file:', error);
        setLoadError('That file could not be imported — it must be a .deck presentation exported from this app.');
      }
    },
    [loadDeck]
  );

  // Slide rename — commit on blur/Enter, cancel on Escape.
  const startSlideRename = useCallback((slide: Slide) => {
    setRenamingSlideId(slide.id);
    setRenameDraft(slide.title);
  }, []);

  const commitSlideRename = useCallback(() => {
    const slideId = renamingSlideId;
    const trimmed = renameDraft.trim();
    setRenamingSlideId(null);
    if (!slideId || !trimmed) return;
    mutateDeck((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slideId ? { ...s, title: trimmed } : s)),
    }));
  }, [renamingSlideId, renameDraft, mutateDeck]);

  // --- Receiving a file opened from File Explorer (double-click, "Open With") ---
  // Set (synchronously, before either `loadFileById` call below resolves) by
  // whichever of the next two effects actually decides to load something —
  // it's what tells the *third* effect (session restore, further down) that
  // an explicit open already won this mount, so it must not race it. Without
  // this, closing the window right after viewing one file and then
  // double-clicking a *different* one reopens whichever of the two
  // `FileService.getFile` calls happens to resolve last: the freshly
  // requested file, or the stale one this window remembers from before it
  // was closed — a real, reproduced bug, not a hypothetical one.
  const explicitOpenRequestedRef = useRef(false);

  const isPrimaryPresentationWindow = windowId === 'presentation';
  const lastOpenedSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isPrimaryPresentationWindow || !presentationFileId) return;
    const signature = `${presentationFileId}:${presentationFileName}`;
    if (lastOpenedSignatureRef.current === signature) return;
    lastOpenedSignatureRef.current = signature;
    explicitOpenRequestedRef.current = true;
    void loadFileById(presentationFileId, presentationCurrentFolderId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrimaryPresentationWindow, presentationFileId, presentationFileName, presentationCurrentFolderId]);

  const hasSeededWindowRef = useRef(false);
  useEffect(() => {
    if (hasSeededWindowRef.current) return;
    hasSeededWindowRef.current = true;
    const pending = consumePendingPresentationFile(windowId);
    if (pending) {
      explicitOpenRequestedRef.current = true;
      void loadFileById(pending.fileId, pending.folderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remembers which file this window last had open, purely so a page
  // refresh reopens it instead of dropping back to a blank Untitled
  // Presentation — this only tracks *which file*, not in-flight unsaved
  // edits (those still rely on the 4-second autosave above to have landed).
  // Keyed by windowId so more than one presentation window never clobbers
  // each other's pointer. Skipped entirely whenever an explicit open already
  // claimed this mount (see `explicitOpenRequestedRef` above) — that request
  // is always what the user actually wants, never the last-remembered file.
  const [restorationDone, setRestorationDone] = useState(false);
  const hasStartedRestoreRef = useRef(false);
  const openFileStorageKey = `presentation-open-file:${windowId}`;

  useEffect(() => {
    if (hasStartedRestoreRef.current) return;
    hasStartedRestoreRef.current = true;
    if (explicitOpenRequestedRef.current) {
      setRestorationDone(true);
      return;
    }
    const savedFileId = localStorage.getItem(openFileStorageKey);
    if (!savedFileId) {
      setRestorationDone(true);
      return;
    }
    void loadFileById(savedFileId, null).finally(() => setRestorationDone(true));
  }, [openFileStorageKey, loadFileById]);

  useEffect(() => {
    if (!restorationDone) return;
    if (currentFileId) localStorage.setItem(openFileStorageKey, currentFileId);
    else localStorage.removeItem(openFileStorageKey);
  }, [restorationDone, openFileStorageKey, currentFileId]);

  const layoutMenuItems: MenuItem[] = [
    { id: 'title', label: 'Title Slide', onSelect: () => handleCreateSlide('title') },
    { id: 'content', label: 'Title & Content', onSelect: () => handleCreateSlide('content') },
    { id: 'two-column', label: 'Two Columns', onSelect: () => handleCreateSlide('two-column') },
    { id: 'blank', label: 'Blank Canvas', onSelect: () => handleCreateSlide('blank') },
  ];

  // Every entry below maps to a handler that already exists and works —
  // deliberately no Format/Arrange/Tools/Extensions/Help menus yet, since
  // there's no text-formatting or element-arranging functionality behind
  // them to put there. Add those menus alongside those features, not before.
  const fileMenuItems: MenuItem[] = [
    { id: 'new', label: 'New Presentation', icon: FilePlus, onSelect: handleNew },
    { id: 'open', label: 'Open…', icon: FolderOpen, onSelect: () => setIsOpenModalOpen(true) },
    { id: 'import', label: 'Import from this computer…', icon: Upload, onSelect: handleImportFromPC },
    { id: 'make-copy', label: 'Make a copy', icon: Copy, disabled: !currentFileId, onSelect: () => void handleMakeCopy() },
    separator(),
    { id: 'share', label: 'Share…', icon: Share2, onSelect: () => setShowShareModal(true) },
    separator(),
    { id: 'save', label: 'Save', icon: Download, onSelect: handleSaveClick },
    { id: 'save-as', label: 'Save As…', icon: FolderOpen, onSelect: beginSaveAs },
    {
      kind: 'submenu',
      id: 'download',
      label: 'Download',
      icon: FileDown,
      items: [
        { id: 'download-pptx', label: 'Microsoft PowerPoint (.pptx)', onSelect: handleExportPPTX },
        { id: 'download-pdf', label: 'PDF Document (.pdf)', onSelect: handleExportPDF },
        { id: 'download-deck', label: 'Drive OSX Presentation (.deck)', disabled: !currentFileId, onSelect: () => void handleDownloadRaw() },
      ],
    },
    separator(),
    { id: 'rename', label: 'Rename…', icon: Pencil, disabled: !currentFileId, onSelect: handleRename },
    { id: 'move', label: 'Move…', icon: Move, disabled: !currentFileId, onSelect: beginMove },
    { id: 'move-to-trash', label: 'Move to trash', icon: Trash2, disabled: !currentFileId, onSelect: () => void handleMoveToTrash() },
    separator(),
    { id: 'version-history', label: 'Version history…', icon: History, disabled: !currentFileId, onSelect: () => setIsVersionHistoryOpen(true) },
    separator(),
    { id: 'details', label: 'Details…', icon: FileText, disabled: !currentFileId, onSelect: () => setIsPropertiesOpen(true) },
    { id: 'page-setup', label: 'Page setup…', icon: Layout, onSelect: () => setIsPageSetupOpen(true) },
    { id: 'print', label: 'Print', icon: Printer, shortcut: 'Ctrl+P', onSelect: () => window.print() },
  ];

  const editMenuItems: MenuItem[] = [
    { id: 'duplicate-slide', label: 'Duplicate slide', icon: Copy, onSelect: () => handleDuplicateSlide(activeSlideId) },
    {
      id: 'delete-slide',
      label: 'Delete slide',
      icon: Trash2,
      disabled: deck.slides.length <= 1,
      onSelect: () => handleDeleteSlide(activeSlideId),
    },
    separator(),
    {
      id: 'delete-element',
      label: 'Delete selected element',
      icon: Trash2,
      disabled: !selectedElementId,
      onSelect: () => selectedElementId && handleDeleteElement(selectedElementId),
    },
  ];

  const viewMenuItems: MenuItem[] = [
    {
      id: 'comments',
      label: 'Comments',
      icon: MessageCircle,
      checked: commentsDrawerOpen,
      onSelect: () => setCommentsDrawerOpen((v) => !v),
    },
    separator(),
    { id: 'present', label: 'Present', icon: Play, onSelect: () => setIsPresentationMode(true) },
  ];

  const insertMenuItems: MenuItem[] = [
    { kind: 'submenu', id: 'new-slide', label: 'New slide', icon: Plus, items: layoutMenuItems },
    separator(),
    {
      id: 'text',
      label: 'Text box',
      icon: Type,
      onSelect: () => handleInsertElement({ type: 'text', content: 'Editable Text Block', fontSize: 20, color: '#0f172a' }),
    },
    { id: 'shapes', label: 'Shapes, charts, tables, image, video…', icon: Square, onSelect: () => setShowInsertModal(true) },
  ];

  const slideMenuItems: MenuItem[] = [
    { id: 'rename-slide', label: 'Rename slide', icon: Pencil, onSelect: () => startSlideRename(activeSlide) },
    { id: 'move-up', label: 'Move slide up', icon: ChevronUp, disabled: activeSlideIndex <= 0, onSelect: () => handleMoveSlide(activeSlideId, 'up') },
    {
      id: 'move-down',
      label: 'Move slide down',
      icon: ChevronDown,
      disabled: activeSlideIndex >= deck.slides.length - 1,
      onSelect: () => handleMoveSlide(activeSlideId, 'down'),
    },
    separator(),
    { id: 'duplicate', label: 'Duplicate slide', icon: Copy, onSelect: () => handleDuplicateSlide(activeSlideId) },
    {
      id: 'delete',
      label: 'Delete slide',
      icon: Trash2,
      disabled: deck.slides.length <= 1,
      onSelect: () => handleDeleteSlide(activeSlideId),
    },
  ];

  // Publishes the same File/Edit/View/Insert/Slide menus the in-app bar
  // above renders (`MenuBarButton`s further down) to the shared window
  // chrome's own hamburger — the "☰" next to this window's title, which
  // every app in this platform gets from `AppWindow.tsx` for free. Word
  // Book's whole menu bar works this way (`useAppMenu` call in
  // apps/wordbook/index.tsx) rather than a second, in-app bar; this app
  // keeps its own bar too since it fits comfortably below the title (unlike
  // Word Book's ribbon, which has no room to spare), but the hamburger
  // should offer the same options rather than showing nothing for this app.
  useAppMenu(windowId, [
    { id: 'file', label: 'File', items: fileMenuItems },
    { id: 'edit', label: 'Edit', items: editMenuItems },
    { id: 'view', label: 'View', items: viewMenuItems },
    { id: 'insert', label: 'Insert', items: insertMenuItems },
    { id: 'slide', label: 'Slide', items: slideMenuItems },
  ]);

  const actionsMenuItems: MenuItem[] = [
    { id: 'share', label: 'Share (2)', icon: Share2, onSelect: () => setShowShareModal(true) },
    {
      id: 'comments',
      label: `Comments (${activeSlide.comments.length})`,
      icon: MessageCircle,
      onSelect: () => setCommentsDrawerOpen((v) => !v),
    },
    { id: 'export-pptx', label: 'Export PPTX', icon: Download, onSelect: handleExportPPTX },
    { id: 'export-pdf', label: 'Export PDF', icon: FileDown, onSelect: handleExportPDF },
    { id: 'save', label: 'Save to Drive', icon: Download, onSelect: handleSaveClick },
    { id: 'save-as', label: 'Save As…', icon: FolderOpen, onSelect: beginSaveAs },
  ];

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
              onChange={(e) => mutateDeck((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full min-w-0 bg-transparent text-xs font-black tracking-wide text-white focus:bg-slate-800/80 focus:outline-none px-1.5 py-0.5 rounded border border-transparent focus:border-slate-700"
            />
            {/* Real save status — the first thing to go once space is tight. */}
            {!isTablet && (
              <span className="text-[10px] text-slate-400 font-medium truncate">
                {isSaving
                  ? 'Saving…'
                  : isDirty
                  ? 'Unsaved changes'
                  : currentFileId
                  ? 'All changes saved to Drive'
                  : 'Not saved yet'}
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

              {/* Save to Drive — always text-labeled, not icon-only: this is
                  the single most important button in the app and an unlabeled
                  icon among several other icon buttons was going unnoticed. */}
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Save to Drive"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Save
              </button>
            </>
          ) : (
            <div className="relative shrink-0">
              <button
                data-menu-trigger
                onClick={(event) =>
                  openMenuId === 'actions' ? closeMenu() : openMenu('actions', event.currentTarget.getBoundingClientRect())
                }
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

              {openMenuId === 'actions' && openMenuPlacement && (
                <MenuPanel
                  items={actionsMenuItems}
                  theme={DEFAULT_DARK_THEME_ID}
                  onClose={closeMenu}
                  placement={openMenuPlacement}
                />
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

      {/* ================= 2. MENU BAR (File/Edit/View/Insert/Slide) =================
          Scrolls horizontally rather than folding into a drawer at narrow
          widths — same "shrink the row, don't hide it" approach the ribbon
          below already uses, so File/Edit/... stay reachable on any window
          size without needing their own tablet breakpoint. */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 h-8 flex items-center gap-0.5 overflow-x-auto shrink-0">
        <MenuBarButton id="file" label="File" items={fileMenuItems} openId={openMenuId} placement={openMenuPlacement} onOpen={openMenu} onClose={closeMenu} />
        <MenuBarButton id="edit" label="Edit" items={editMenuItems} openId={openMenuId} placement={openMenuPlacement} onOpen={openMenu} onClose={closeMenu} />
        <MenuBarButton id="view" label="View" items={viewMenuItems} openId={openMenuId} placement={openMenuPlacement} onOpen={openMenu} onClose={closeMenu} />
        <MenuBarButton id="insert" label="Insert" items={insertMenuItems} openId={openMenuId} placement={openMenuPlacement} onOpen={openMenu} onClose={closeMenu} />
        <MenuBarButton id="slide" label="Slide" items={slideMenuItems} openId={openMenuId} placement={openMenuPlacement} onOpen={openMenu} onClose={closeMenu} />
      </div>

      {/* ================= 3. SECONDARY TOOLBAR RIBBON =================
          Two entirely different rows, swapped on whether an element is
          selected — same idea as Google Slides: nothing selected shows
          slide-level tools (add a slide, insert something, this slide's
          transition/background); a text element selected shows that
          element's own formatting instead, since slide-level tools don't
          apply to it and formatting tools only make sense once something is
          selected. Every control here is backed by a real field on
          `SlideElement`/`Slide` (`fontSize`, `fontWeight`, `align`, `color`,
          `bgColor`, `transition`, slide `bgColor`) — italic/underline/lists/
          indent/links/highlight-as-its-own-concept aren't in this app's text
          model yet, so they're deliberately not here as dead buttons; that's
          a separate, larger change (this app's text is a plain string, not
          rich text with per-run formatting) rather than part of this pass. */}
      {selectedElement ? (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex items-center gap-2 overflow-x-auto shrink-0">
          {selectedElement.type === 'text' ? (
            <>
              {/* Font size */}
              <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                <button
                  onClick={() =>
                    handleUpdateElement({ ...selectedElement, fontSize: Math.max(8, (selectedElement.fontSize || 16) - 2) })
                  }
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer"
                  title="Decrease font size"
                >
                  <Minus size={13} />
                </button>
                <span className="w-7 text-center text-xs font-bold text-slate-200">{selectedElement.fontSize || 16}</span>
                <button
                  onClick={() =>
                    handleUpdateElement({ ...selectedElement, fontSize: Math.min(96, (selectedElement.fontSize || 16) + 2) })
                  }
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer"
                  title="Increase font size"
                >
                  <Plus size={13} />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-800 shrink-0" />

              {/* Bold */}
              <button
                onClick={() =>
                  handleUpdateElement({
                    ...selectedElement,
                    fontWeight: selectedElement.fontWeight === 'normal' || !selectedElement.fontWeight ? 'bold' : 'normal',
                  })
                }
                className={`p-1.5 rounded-lg border cursor-pointer shrink-0 ${
                  selectedElement.fontWeight === 'bold' || selectedElement.fontWeight === 'black'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Bold"
              >
                <Bold size={13} />
              </button>

              <div className="h-5 w-px bg-slate-800 shrink-0" />

              {/* Alignment */}
              <div className="flex items-center gap-0.5 shrink-0">
                {([
                  { value: 'left' as const, Icon: AlignLeft },
                  { value: 'center' as const, Icon: AlignCenter },
                  { value: 'right' as const, Icon: AlignRight },
                ]).map(({ value, Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleUpdateElement({ ...selectedElement, align: value })}
                    className={`p-1.5 rounded-lg border cursor-pointer ${
                      (selectedElement.align || 'left') === value
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                    title={`Align ${value}`}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-slate-800 shrink-0" />

              {/* Text color */}
              <div className="flex items-center gap-1.5 text-xs shrink-0 whitespace-nowrap">
                <span className="text-slate-400 font-bold">Text:</span>
                <input
                  type="color"
                  value={selectedElement.color || '#0f172a'}
                  onChange={(e) => handleUpdateElement({ ...selectedElement, color: e.target.value })}
                  className="w-6 h-6 rounded-md border border-slate-700 cursor-pointer p-0"
                />
              </div>

              {/* Highlight / box fill */}
              <div className="flex items-center gap-1.5 text-xs shrink-0 whitespace-nowrap">
                <span className="text-slate-400 font-bold">Highlight:</span>
                <input
                  type="color"
                  value={selectedElement.bgColor || '#ffffff'}
                  onChange={(e) => handleUpdateElement({ ...selectedElement, bgColor: e.target.value })}
                  className="w-6 h-6 rounded-md border border-slate-700 cursor-pointer p-0"
                />
                {selectedElement.bgColor && (
                  <button
                    onClick={() => handleUpdateElement({ ...selectedElement, bgColor: undefined })}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Clear highlight"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs font-bold text-blue-400 capitalize shrink-0">{selectedElement.type} selected</span>
          )}

          <div className="flex-1" />

          <button
            onClick={() => handleDeleteElement(selectedElement.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
            title="Delete element"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex items-center gap-2 overflow-x-auto shrink-0">
          {/* Create Slide & Layout Chooser */}
          <button
            data-menu-trigger
            onClick={(event) =>
              openMenuId === 'layouts' ? closeMenu() : openMenu('layouts', event.currentTarget.getBoundingClientRect())
            }
            className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} /> {isTablet ? 'Layouts' : 'Slide Layouts'}
          </button>
          {openMenuId === 'layouts' && openMenuPlacement && (
            <MenuPanel
              items={layoutMenuItems}
              theme={DEFAULT_DARK_THEME_ID}
              onClose={closeMenu}
              placement={openMenuPlacement}
            />
          )}

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
      )}

      {/* ================= 4. MAIN WORKSPACE VIEWPORT ================= */}
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
                  {renamingSlideId === s.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={commitSlideRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitSlideRename(); }
                        if (e.key === 'Escape') { e.preventDefault(); setRenamingSlideId(null); }
                      }}
                      className="min-w-0 flex-1 bg-slate-950 border border-blue-500 rounded px-1 py-0.5 text-[11px] font-bold text-white focus:outline-none"
                    />
                  ) : (
                    <span className={`truncate min-w-0 ${isActive ? 'text-blue-400 font-extrabold' : ''}`}>
                      {idx + 1}. {s.title}
                    </span>
                  )}
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
                        startSlideRename(s);
                      }}
                      className="p-0.5 hover:text-white"
                      title="Rename slide"
                    >
                      <Pencil size={12} />
                    </button>
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

                {/* Mini Preview Stage — a real, read-only `SlideCanvas`
                    instance (not a hand-rolled re-render), so every edit
                    shows up here exactly as typed: same text, same
                    per-element styling, just proportionally scaled down
                    (`minFontScale={0}` lets it shrink past the editing
                    canvas's own readability floor). One gray box per element
                    used to stand in here instead, which is why typing never
                    appeared to change the thumbnail at all. */}
                <div className="pointer-events-none">
                  <SlideCanvas
                    slide={s}
                    selectedElementId={null}
                    onSelectElement={() => {}}
                    onUpdateElement={() => {}}
                    onDeleteElement={() => {}}
                    isReadOnly
                    minFontScale={0}
                    pageSize={deck.pageSize}
                  />
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
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-900/80 text-slate-300">
              <Loader2 size={22} className="animate-spin text-blue-400" />
              <span className="text-xs font-bold">Opening presentation…</span>
            </div>
          )}

          {loadError && (
            <div className="w-full max-w-4xl mb-4 bg-rose-950/60 border border-rose-800 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-rose-200">Couldn't open this presentation</p>
                <p className="text-xs text-rose-300/80 mt-0.5">{loadError}</p>
              </div>
              <button
                onClick={() => setLoadError(null)}
                className="text-rose-400 hover:text-rose-200 p-1 cursor-pointer shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="w-full max-w-4xl">
            <SlideCanvas
              slide={activeSlide}
              selectedElementId={selectedElementId}
              onSelectElement={(id) => setSelectedElementId(id)}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              pageSize={deck.pageSize}
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

      {/* Hidden native file picker backing File > Import from this computer. */}
      <input
        ref={importInputRef}
        type="file"
        accept=".deck,.json,application/json,.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
        onChange={(e) => void handleImportFileSelected(e)}
        className="hidden"
      />

      {/* ================= 5. MODALS & PRESENTATION OVERLAY ================= */}
      {isPresentationMode && (
        <PresentationMode
          slides={deck.slides}
          initialSlideIndex={activeSlideIndex}
          onClose={() => setIsPresentationMode(false)}
          pageSize={deck.pageSize}
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

      <OpenPresentationModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        allFiles={files}
        onSelectFile={handleSelectFile}
        onNewBlank={handleNew}
      />

      <PageSetupModal
        isOpen={isPageSetupOpen}
        pageSize={deck.pageSize}
        onApply={(pageSize) => mutateDeck((prev) => ({ ...prev, pageSize }))}
        onClose={() => setIsPageSetupOpen(false)}
      />

      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        fileId={currentFileId}
        onRestored={() => currentFileId && void loadFileById(currentFileId, currentFolderId)}
      />

      <PropertiesModal
        item={currentFileItem}
        isOpen={isPropertiesOpen}
        onClose={() => setIsPropertiesOpen(false)}
        onToggleStar={() => void handleToggleStar()}
        onShare={() => setShowShareModal(true)}
        onDownload={() => void handleDownloadRaw()}
        onDelete={() => void handleMoveToTrash()}
        folderPathString={folderPathString}
      />
    </div>
  );
}
