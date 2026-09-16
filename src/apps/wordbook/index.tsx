import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import { useSystemStore } from '../../shell/state/systemStore';
import { FileService } from '../../platform/files/FileService';
import { FileItem } from '../../platform/types';
import ShareModal from '../file-explorer/components/ShareModal';
import PropertiesModal from '../file-explorer/components/PropertiesModal';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';

import { wordBookExtensions } from './editor/schema';
import { createPaginationExtension } from './editor/paginationExtension';
import { repaginateNow, getPaginationPlan, PaginationMode, PaginationPluginOptions } from './editor/paginationPlugin';
import { createFindReplaceExtension } from './editor/findReplacePlugin';
import { PageBreakPlan } from '../../platform/documents/pagination/types';
import { a4PageSetup, PageSetup } from '../../platform/documents/book/pageSetup';
import {
  BookDocument,
  BOOK_EXTENSION,
  BOOK_MIME_TYPE,
} from '../../platform/documents/book/bookFormat';
import { toBookDocument } from './format/toBookDocument';
import {
  blankBookDocument,
  editorContentFromBookDocument,
  parseBookFile,
  serializeBookFile,
} from './format/fromBookDocument';

import WordBookShell from './components/WordBookShell';
import OpenBookModal from './components/OpenBookModal';
import FindReplaceBar from './components/FindReplaceBar';
import PageSetupModal from './components/PageSetupModal';
import VersionHistoryModal from './components/VersionHistoryModal';
import CharacterGridModal from './components/CharacterGridModal';
import EquationModal from './components/EquationModal';
import { SPECIAL_CHARACTER_GROUPS, EMOJI_GROUPS } from './editor/characterData';
import TableGridPicker from './components/TableGridPicker';
import DrawingModal from './components/DrawingModal';
import ChartModal, { ChartType, DataRow } from './components/ChartModal';
import { extractChartRowsFromSheet, parseWorkbookContent } from './editor/chartFromSheet';
import { downloadAsTxt, downloadAsHtml, downloadAsMarkdown, downloadAsDocx, downloadAsPdf } from './export/exportDocument';
import { uploadAndInsertImage } from './editor/insertImage';
import { promptForLink } from './editor/linkActions';
import { BUILDING_BLOCKS, SIGNATURE_LINE_CONTENT } from './editor/buildingBlocks';
import DateChipModal from './components/DateChipModal';
import PeopleChipModal from './components/PeopleChipModal';
import CalendarEventChipModal from './components/CalendarEventChipModal';
import DropdownChipModal from './components/DropdownChipModal';
import { MessagingService, DirectoryUser } from '../../platform/messaging/MessagingService';
import { CalendarEvent } from '../../platform/types';
import { getAppForFile } from '../../platform/registry/EditorRegistry';
import { MenuPanel, placePanel, Placement } from '../../shell/window-manager/WindowMenu';
import { MenuItem } from '../../platform/menus/types';
import mammoth from 'mammoth';

const LIGHT_THEME_ID = 'nova-light';

type BookMetaState = Pick<BookDocument, 'metadata' | 'defaultPageSetup' | 'headers' | 'footers' | 'assets'>;

export default function WordBook({ windowId = 'wordbook' }: { windowId?: string }) {
  const files = useSystemStore((state) => state.files);
  const setFiles = useSystemStore((state) => state.setFiles);
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);
  const handleDeleteFile = useSystemStore((state) => state.handleDeleteFile);
  const syncFilesFromBackend = useSystemStore((state) => state.syncFilesFromBackend);
  const addNotification = useSystemStore((state) => state.addNotification);
  const requestFilePick = useSystemStore((state) => state.requestFilePick);
  const filePickerResult = useSystemStore((state) => state.filePickerResults[windowId]);
  const consumeFilePickerResult = useSystemStore((state) => state.consumeFilePickerResult);
  const focusWindow = useSystemStore((state) => state.focusWindow);
  const wordbookFileId = useSystemStore((state) => state.wordbookFileId);
  const wordbookFileName = useSystemStore((state) => state.wordbookFileName);
  const wordbookCurrentFolderId = useSystemStore((state) => state.wordbookCurrentFolderId);
  const consumePendingWordbookFile = useSystemStore((state) => state.consumePendingWordbookFile);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const openTextFileInNewEditorWindow = useSystemStore((state) => state.openTextFileInNewEditorWindow);
  const openPdfFileInNewViewerWindow = useSystemStore((state) => state.openPdfFileInNewViewerWindow);
  const openBookFileInNewWordbookWindow = useSystemStore((state) => state.openBookFileInNewWordbookWindow);
  const calendarEvents = useSystemStore((state) => state.calendarEvents);

  const wbPrefs = settings.appPreferences?.wordbook as { paginationMode?: string } | undefined;
  const paginationMode: PaginationMode = wbPrefs?.paginationMode === 'Manual' ? 'manual' : 'automatic';
  const modeRef = useRef(paginationMode);
  useEffect(() => {
    modeRef.current = paginationMode;
  }, [paginationMode]);

  const setPaginationMode = useCallback(
    (mode: PaginationMode) => {
      setSettings((prev) => ({
        ...prev,
        appPreferences: {
          ...prev.appPreferences,
          wordbook: { ...prev.appPreferences?.wordbook, paginationMode: mode === 'manual' ? 'Manual' : 'Automatic' },
        },
      }));
    },
    [setSettings]
  );

  // Per-document paper size/orientation/margins, editable via the Page
  // Setup dialog. `pageSetupRef` mirrors the state (the same pattern
  // `zoomRef`/`modeRef` already use below) so the pagination plugin's
  // `getPageSetup()` — a stable closure captured once in `paginationOptions`
  // — always reads the current value without needing to be rebuilt itself.
  const [pageSetup, setPageSetupState] = useState<PageSetup>(() => a4PageSetup('portrait'));
  const pageSetupRef = useRef(pageSetup);
  useEffect(() => {
    pageSetupRef.current = pageSetup;
  }, [pageSetup]);

  // Visual-only — the pagination plugin normalizes measurements by this
  // factor, so zooming in/out never moves where a page actually breaks.
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [bookMeta, setBookMeta] = useState<BookMetaState | null>(null);
  const [plan, setPlan] = useState<PageBreakPlan>({ pages: [] });
  const [isDirty, setIsDirty] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findShowReplace, setFindShowReplace] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);
  const [isSpecialCharsOpen, setIsSpecialCharsOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isEquationOpen, setIsEquationOpen] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [chartInitialType, setChartInitialType] = useState<ChartType | undefined>(undefined);
  const [chartInitialRows, setChartInitialRows] = useState<DataRow[] | undefined>(undefined);
  const [isDateChipOpen, setIsDateChipOpen] = useState(false);
  const [isPeopleChipOpen, setIsPeopleChipOpen] = useState(false);
  const [isEventChipOpen, setIsEventChipOpen] = useState(false);
  const [isDropdownChipOpen, setIsDropdownChipOpen] = useState(false);
  // The live option list shown when an already-inserted dropdown chip is
  // clicked — rendered with the same `MenuPanel` the app's own menus use
  // (see WindowMenu.tsx) rather than a second popover implementation.
  const [openDropdownPicker, setOpenDropdownPicker] = useState<{ items: MenuItem[]; placement: Placement } | null>(null);

  // Opens whatever a File smart chip points at, in a *new* window — never
  // reusing/replacing the current wordbook window's own open document, which
  // clicking a chip while editing something else should never silently
  // clobber. Dispatches by the same `getAppForFile` mapping every other
  // "open this file" entry point in the platform already uses.
  const openFileChip = useCallback(
    async (fileId: string) => {
      try {
        const full = await FileService.getFile(fileId);
        if (!full) {
          alert('That file could not be found — it may have been moved or deleted.');
          return;
        }
        const appId = getAppForFile(full.name, full.mimeType);
        if (appId === 'editor') {
          openTextFileInNewEditorWindow(full.id, full.name, full.content ?? '', full.parentId);
        } else if (appId === 'pdf-viewer') {
          openPdfFileInNewViewerWindow(full.id, full.name, full.parentId);
        } else if (appId === 'wordbook') {
          openBookFileInNewWordbookWindow(full.id, full.name, full.parentId);
        } else {
          // No cross-app "open" entry point for this file type yet — the
          // raw download URL still opens it (an image, video, or PDF opens
          // directly in the browser; anything else the browser downloads),
          // which beats a silent no-op.
          const url = await FileService.downloadUrl(full.id);
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        console.error('Failed to open file chip target:', error);
        alert('Could not open that file. Please try again.');
      }
    },
    [openTextFileInNewEditorWindow, openPdfFileInNewViewerWindow, openBookFileInNewWordbookWindow]
  );

  const paginationOptions = useMemo<PaginationPluginOptions>(
    () => ({
      getPageSetup: () => pageSetupRef.current,
      getMode: () => modeRef.current,
      getZoom: () => zoomRef.current,
      onPlanChange: (nextPlan) => setPlan(nextPlan),
    }),
    []
  );

  const extensions = useMemo(
    () => [...wordBookExtensions(), createPaginationExtension(paginationOptions), createFindReplaceExtension()],
    [paginationOptions]
  );

  const editor = useEditor(
    {
      extensions,
      content: blankBookDocument('Untitled Document').sections[0].content as never,
      onUpdate: () => setIsDirty(true),
      editorProps: {
        attributes: { class: 'wb-prosemirror', spellcheck: 'true' },
        // A single click handler covers both new navigable node types:
        // clicking a bookmark's flag copies a link to it (there's nothing
        // else useful a plain click on an atom marker could do), while
        // Ctrl/Cmd+click on a link follows it — matching `Link.configure({
        // openOnClick: false })` above, which deliberately keeps a *plain*
        // click free for cursor placement while editing.
        handleClick: (view, _pos, event) => {
          const target = event.target as HTMLElement;
          const bookmarkEl = target.closest('[data-bookmark]') as HTMLElement | null;
          if (bookmarkEl) {
            const id = bookmarkEl.getAttribute('data-bookmark-id');
            if (id) {
              void navigator.clipboard.writeText(`#bookmark:${id}`);
              addNotification({ sender: 'Word Book', text: 'Bookmark link copied — paste it as a Link URL to jump here.', type: 'success' });
            }
            return true;
          }
          const linkEl = target.closest('a[href]') as HTMLAnchorElement | null;
          if (linkEl && (event.ctrlKey || event.metaKey)) {
            const href = linkEl.getAttribute('href') || '';
            if (href.startsWith('#bookmark:')) {
              const bookmarkTarget = view.dom.querySelector(`[data-bookmark-id="${CSS.escape(href.slice('#bookmark:'.length))}"]`);
              bookmarkTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              window.open(href, '_blank', 'noopener,noreferrer');
            }
            return true;
          }

          const chipEl = target.closest('[data-chip]') as HTMLElement | null;
          if (chipEl) {
            const chipType = chipEl.getAttribute('data-chip-type');
            if (chipType === 'file') {
              const fileId = chipEl.getAttribute('data-file-id');
              if (fileId) void openFileChip(fileId);
            } else if (chipType === 'person') {
              openAppWindow('contacts');
            } else if (chipType === 'event') {
              openAppWindow('calendar');
            }
            // A date chip has nothing to open — swallowing the click still
            // keeps it from doing anything stranger than nothing (it's an
            // atom node either way).
            return true;
          }

          const dropdownEl = target.closest('[data-dropdown-chip]') as HTMLElement | null;
          if (dropdownEl) {
            let options: string[] = [];
            try {
              options = JSON.parse(dropdownEl.getAttribute('data-options') || '[]');
            } catch {
              options = [];
            }
            const selected = parseInt(dropdownEl.getAttribute('data-selected') || '0', 10);
            const chipPos = view.posAtDOM(dropdownEl, 0);
            const rect = dropdownEl.getBoundingClientRect();
            const items: MenuItem[] = options.map((opt, idx) => ({
              id: String(idx),
              label: opt,
              selected: idx === selected,
              onSelect: () => {
                const node = view.state.doc.nodeAt(chipPos);
                if (!node) return;
                view.dispatch(view.state.tr.setNodeMarkup(chipPos, undefined, { ...node.attrs, selected: idx }));
                setOpenDropdownPicker(null);
              },
            }));
            setOpenDropdownPicker({ items, placement: placePanel(rect, 'below') });
            return true;
          }

          return false;
        },
      },
    },
    [extensions]
  );

  const loadBook = useCallback(
    (book: BookDocument, fileId: string | null, name: string, folderId: string | null) => {
      setBookMeta({
        metadata: book.metadata,
        defaultPageSetup: book.defaultPageSetup,
        headers: book.headers,
        footers: book.footers,
        assets: book.assets,
      });
      setDocTitle(name.endsWith(BOOK_EXTENSION) ? name.slice(0, -BOOK_EXTENSION.length) : name);
      setCurrentFileId(fileId);
      setCurrentFolderId(folderId);
      setPageSetupState(book.defaultPageSetup ?? a4PageSetup('portrait'));
      setIsDirty(false);
      editor?.commands.setContent(editorContentFromBookDocument(book) as never);
      // A freshly-loaded document needs its own first layout pass; the
      // pagination plugin's own mount-time pass ran against the *previous*
      // content.
      requestAnimationFrame(() => {
        if (editor) repaginateNow(editor.view, paginationOptions);
      });
    },
    [editor, paginationOptions]
  );

  const handleNew = useCallback(() => {
    if (isDirty && !confirm('Discard unsaved changes and start a new document?')) return;
    loadBook(blankBookDocument('Untitled Document'), null, 'Untitled Document', null);
  }, [isDirty, loadBook]);

  // A .doc/.docx file's content lands here as HTML (via Mammoth), not a
  // BookDocument — never linked to the original file's id, since Save only
  // ever knows how to write the .book format back out, and doing that into
  // a slot that used to hold a real Word file would silently corrupt it.
  // Saving this always goes through the normal "no file yet" flow (the File
  // Manager picker), same as any other brand-new document.
  const loadDocxImport = useCallback(
    (html: string, name: string) => {
      const baseName = name.replace(/\.(docx|doc)$/i, '');
      setBookMeta(null);
      setDocTitle(baseName);
      setCurrentFileId(null);
      setCurrentFolderId(null);
      setPageSetupState(a4PageSetup('portrait'));
      setIsDirty(true);
      editor?.commands.setContent(html as never);
      requestAnimationFrame(() => {
        if (editor) repaginateNow(editor.view, paginationOptions);
      });
    },
    [editor, paginationOptions]
  );

  // Shared by "Open…", the File Manager double-click association, and the
  // refresh-restore effect below — figures out from the file's own name
  // whether it's a native .book file or a Word document to best-effort
  // import, and loads it either way.
  const loadFileById = useCallback(
    async (fileId: string, name: string) => {
      const lower = name.toLowerCase();
      if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
        try {
          const url = await FileService.downloadUrl(fileId);
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          loadDocxImport(result.value, name);
        } catch (error) {
          console.error('Failed to import Word document:', error);
          alert('This Word document could not be opened. It may be corrupted or in an unsupported format.');
        }
        return;
      }
      const full = await FileService.getFile(fileId);
      if (!full?.content) return;
      try {
        const book = parseBookFile(full.content);
        loadBook(book, full.id, full.name, full.parentId);
      } catch (error) {
        console.error('Failed to open .book file:', error);
        alert('This file could not be opened — it may not be a valid Word Book document.');
      }
    },
    [loadBook, loadDocxImport]
  );

  // --- Receiving a file opened from File Explorer (double-click, "Open With") ---
  const isPrimaryWordbookWindow = windowId === 'wordbook';
  const lastOpenedWordbookSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isPrimaryWordbookWindow || !wordbookFileId) return;
    const signature = `${wordbookFileId}:${wordbookFileName}`;
    if (lastOpenedWordbookSignatureRef.current === signature) return;
    lastOpenedWordbookSignatureRef.current = signature;
    void loadFileById(wordbookFileId, wordbookFileName ?? 'Untitled');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrimaryWordbookWindow, wordbookFileId, wordbookFileName, wordbookCurrentFolderId]);

  const hasSeededWordbookWindowRef = useRef(false);
  useEffect(() => {
    if (hasSeededWordbookWindowRef.current) return;
    hasSeededWordbookWindowRef.current = true;
    const pending = consumePendingWordbookFile(windowId);
    if (pending) void loadFileById(pending.fileId, pending.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectFile = useCallback(
    async (file: FileItem) => {
      const full = await FileService.getFile(file.id);
      if (!full?.content) return;
      try {
        const book = parseBookFile(full.content);
        loadBook(book, full.id, full.name, full.parentId);
      } catch (error) {
        console.error('Failed to open .book file:', error);
        alert('This file could not be opened — it may not be a valid Word Book document.');
      }
    },
    [loadBook]
  );

  // Remembers which file this window last had open, purely so a page
  // refresh reopens it instead of dropping back to a blank Untitled
  // Document — this only tracks *which file*, not in-flight unsaved edits
  // (those still rely on the 4-second autosave below to have landed).
  // Keyed by windowId so more than one wordbook window never clobbers
  // each other's pointer.
  const [restorationDone, setRestorationDone] = useState(false);
  const hasStartedRestoreRef = useRef(false);
  const openFileStorageKey = `wordbook-open-file:${windowId}`;

  useEffect(() => {
    if (hasStartedRestoreRef.current || !editor) return;
    hasStartedRestoreRef.current = true;
    const savedFileId = localStorage.getItem(openFileStorageKey);
    if (!savedFileId) {
      setRestorationDone(true);
      return;
    }
    FileService.getFile(savedFileId)
      .then((full) => {
        if (full?.content) {
          const book = parseBookFile(full.content);
          loadBook(book, full.id, full.name, full.parentId);
        } else {
          // The file no longer exists (deleted, or never actually
          // persisted) — nothing to reopen, so drop the stale pointer.
          localStorage.removeItem(openFileStorageKey);
        }
      })
      .catch((error) => {
        console.error('Failed to restore previously open document:', error);
        localStorage.removeItem(openFileStorageKey);
      })
      .finally(() => setRestorationDone(true));
  }, [editor, openFileStorageKey, loadBook]);

  // Gated on `restorationDone` so the very first render — before the effect
  // above has had a chance to read the saved pointer — never overwrites it
  // with the initial `currentFileId === null`.
  useEffect(() => {
    if (!restorationDone) return;
    if (currentFileId) localStorage.setItem(openFileStorageKey, currentFileId);
    else localStorage.removeItem(openFileStorageKey);
  }, [restorationDone, openFileStorageKey, currentFileId]);

  const handleSave = useCallback(
    async (overrides?: { forceNew?: boolean; nameOverride?: string; folderIdOverride?: string | null }) => {
      if (!editor) return;
      // Save always reflects the precise, fully-repaginated layout, even if
      // Manual mode had left the live view deferred.
      repaginateNow(editor.view, paginationOptions);

      const book = toBookDocument(editor.getJSON(), bookMeta, pageSetup);
      const content = serializeBookFile(book);
      const targetTitle = overrides?.nameOverride ?? docTitle;
      const name = targetTitle.endsWith(BOOK_EXTENSION) ? targetTitle : `${targetTitle}${BOOK_EXTENSION}`;
      const forceNew = overrides?.forceNew ?? false;

      try {
        if (currentFileId && !forceNew) {
          const updated = await FileService.updateFile(currentFileId, {
            name,
            content,
            mimeType: BOOK_MIME_TYPE,
          });
          setFiles((prev) => prev.map((f) => (f.id === currentFileId ? { ...f, name: updated.name, content } : f)));
        } else {
          const parentId =
            overrides && 'folderIdOverride' in overrides ? overrides.folderIdOverride ?? null : currentFolderId ?? resolveDefaultFolderId('Documents');
          const created = await FileService.createFile({
            name,
            type: 'file',
            parentId,
            content,
            mimeType: BOOK_MIME_TYPE,
          });
          setCurrentFileId(created._id);
          setCurrentFolderId(created.parentId);
          setDocTitle(targetTitle);
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

        setBookMeta({
          metadata: book.metadata,
          defaultPageSetup: book.defaultPageSetup,
          headers: book.headers,
          footers: book.footers,
          assets: book.assets,
        });
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save .book file:', error);
        alert('Failed to save the document. Please try again.');
      }
    },
    [bookMeta, currentFileId, currentFolderId, docTitle, editor, pageSetup, paginationOptions, resolveDefaultFolderId, setFiles]
  );

  // "Save"/"Save As…" both ask *where* to save through the real File
  // Manager, opened as a picker window (the same mechanism code-editor's
  // "Open Folder…" already uses) — not a bespoke in-app folder list — so the
  // destination is chosen from the actual DriveOS file tree. The picker
  // resolves asynchronously into `filePickerResults[windowId]`, watched
  // below; `pendingSaveAsRef` is what tells that watcher a pending result is
  // actually for this save flow — wordbook requests the same shared picker
  // for two more purposes too (Insert > Image > Drive and Insert > Chart >
  // From Sheets, below), so these flags exist to disambiguate which one a
  // given result is actually for, rather than assuming a single purpose
  // silently.
  const pendingSaveAsRef = useRef(false);
  const pendingInsertImageFromDriveRef = useRef(false);
  const pendingChartFromSheetsRef = useRef(false);
  const pendingFileChipRef = useRef(false);

  const beginSaveAs = useCallback(() => {
    pendingSaveAsRef.current = true;
    requestFilePick(windowId, 'folder');
  }, [requestFilePick, windowId]);

  const beginInsertImageFromDrive = useCallback(() => {
    pendingInsertImageFromDriveRef.current = true;
    requestFilePick(windowId, 'file');
  }, [requestFilePick, windowId]);

  const beginInsertChartFromSheets = useCallback(() => {
    pendingChartFromSheetsRef.current = true;
    requestFilePick(windowId, 'file');
  }, [requestFilePick, windowId]);

  const beginInsertFileChip = useCallback(() => {
    pendingFileChipRef.current = true;
    requestFilePick(windowId, 'file');
  }, [requestFilePick, windowId]);

  // The actual <input type="file"> this opens lives in the JSX below —
  // triggering a hidden input's click is still the only way to open the
  // OS's native file picker from a menu item.
  const insertImageFileInputRef = useRef<HTMLInputElement>(null);

  const insertImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = prompt('Image URL:', 'https://');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const insertDateChip = useCallback(
    (_isoDate: string, label: string) => {
      editor?.chain().focus().insertSmartChip({ chipType: 'date', label }).run();
    },
    [editor]
  );

  const insertPersonChip = useCallback(
    (user: DirectoryUser) => {
      editor?.chain().focus().insertSmartChip({ chipType: 'person', label: user.fullName, personId: user.id, personEmail: user.email }).run();
    },
    [editor]
  );

  const insertEventChip = useCallback(
    (event: CalendarEvent) => {
      const label = event.time ? `${event.title} · ${event.date} · ${event.time}` : `${event.title} · ${event.date}`;
      editor?.chain().focus().insertSmartChip({ chipType: 'event', label, eventId: event.id }).run();
    },
    [editor]
  );

  const insertDropdownChipOptions = useCallback(
    (options: string[]) => {
      editor?.chain().focus().insertDropdownChip(options).run();
    },
    [editor]
  );

  // Ctrl+S / the title bar's Save button: an already-saved document just
  // saves in place; a brand-new one has nowhere to go yet, so it's really a
  // Save As.
  const handleSaveClick = useCallback(() => {
    if (!currentFileId) {
      beginSaveAs();
      return;
    }
    void handleSave();
  }, [currentFileId, beginSaveAs, handleSave]);

  useEffect(() => {
    if (!filePickerResult) return;
    const result = consumeFilePickerResult(windowId);
    if (!result) return;
    focusWindow(windowId);
    if (pendingSaveAsRef.current) {
      pendingSaveAsRef.current = false;
      if (result.mode !== 'folder') return;
      const name = prompt('Save as:', docTitle);
      if (!name) return;
      void handleSave({ forceNew: true, nameOverride: name, folderIdOverride: result.folder.id });
      return;
    }
    if (pendingInsertImageFromDriveRef.current) {
      pendingInsertImageFromDriveRef.current = false;
      if (result.mode !== 'file' || !editor) return;
      // The file the user picked isn't necessarily an image — `downloadUrl`
      // still resolves for any file, but an <img> given a non-image src just
      // renders broken, which is a clear enough signal something else was
      // picked rather than a confusing silent failure.
      void FileService.downloadUrl(result.file.id)
        .then((url) => editor.chain().focus().setImage({ src: url, alt: result.file.name }).run())
        .catch((error) => {
          console.error('Failed to insert image from Drive:', error);
          alert('Could not insert that file as an image. Please try again.');
        });
      return;
    }
    if (pendingChartFromSheetsRef.current) {
      pendingChartFromSheetsRef.current = false;
      if (result.mode !== 'file') return;
      void FileService.getFile(result.file.id)
        .then((full) => {
          if (!full?.content) throw new Error('That file has no content.');
          const sheets = parseWorkbookContent(full.content);
          const sheetRows = extractChartRowsFromSheet(sheets[0]);
          if (sheetRows.length === 0) {
            alert('That sheet has no data in its first two columns to chart.');
            return;
          }
          setChartInitialRows(sheetRows);
          setIsChartOpen(true);
        })
        .catch((error) => {
          console.error('Failed to read spreadsheet for chart:', error);
          alert('Could not read that file as a spreadsheet. Pick a workbook saved from the Spreadsheet app.');
        });
      return;
    }
    if (pendingFileChipRef.current) {
      pendingFileChipRef.current = false;
      if (result.mode !== 'file' || !editor) return;
      editor.chain().focus().insertSmartChip({ chipType: 'file', label: result.file.name, fileId: result.file.id }).run();
      return;
    }
  }, [filePickerResult, windowId, consumeFilePickerResult, focusWindow, docTitle, handleSave, editor]);

  const handleRepaginateNow = useCallback(() => {
    if (!editor) return;
    repaginateNow(editor.view, paginationOptions);
  }, [editor, paginationOptions]);

  // Shared by the File-menu "Rename…" prompt and the title bar's
  // click-to-edit field. A document with no `currentFileId` yet (never
  // saved) still accepts a new title — it just isn't persisted anywhere
  // until the first Save, matching how `docTitle` already behaves for a
  // brand-new document today.
  const commitTitleChange = useCallback(
    (newTitle: string) => {
      const cleanName = newTitle.trim();
      if (!cleanName || cleanName === docTitle) return;
      const previousTitle = docTitle;
      setDocTitle(cleanName);
      if (!currentFileId) return;
      void FileService.updateFile(currentFileId, { name: `${cleanName}${BOOK_EXTENSION}` })
        .then((updated) => {
          setFiles((prev) => prev.map((f) => (f.id === currentFileId ? { ...f, name: updated.name } : f)));
        })
        .catch((error) => {
          console.error('Failed to rename document:', error);
          setDocTitle(previousTitle);
          alert('Could not rename the document. Please try again.');
        });
    },
    [currentFileId, docTitle, setFiles]
  );

  const handleRename = useCallback(() => {
    const name = prompt('Rename document:', docTitle);
    if (name === null) return;
    commitTitleChange(name);
  }, [docTitle, commitTitleChange]);

  const isStarred = currentFileId ? Boolean(files.find((f) => f.id === currentFileId)?.starred) : false;

  const handleToggleStar = useCallback(async () => {
    if (!currentFileId) {
      alert('Save the document at least once before starring it.');
      return;
    }
    try {
      const updated = await FileService.toggleStar(currentFileId);
      setFiles((prev) => prev.map((f) => (f.id === currentFileId ? { ...f, starred: updated.starred } : f)));
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }, [currentFileId, setFiles]);

  const handleMakeCopy = useCallback(async () => {
    if (!currentFileId) {
      alert('Save the document at least once before making a copy.');
      return;
    }
    try {
      const copy = await FileService.duplicateFile(currentFileId);
      await syncFilesFromBackend(currentFolderId);
      addNotification({ sender: 'Word Book', text: `Created a copy: "${copy.name}"`, type: 'success' });
    } catch (error) {
      console.error('Failed to duplicate document:', error);
      alert('Could not make a copy. Please try again.');
    }
  }, [currentFileId, currentFolderId, syncFilesFromBackend, addNotification]);

  const handleMoveToTrash = useCallback(async () => {
    if (!currentFileId) return;
    const file = files.find((f) => f.id === currentFileId);
    if (!file) return;
    if (!confirm(`Move "${docTitle}" to Trash?`)) return;
    await handleDeleteFile({ ...file, originalParentId: file.parentId });
    loadBook(blankBookDocument('Untitled Document'), null, 'Untitled Document', null);
  }, [currentFileId, files, docTitle, handleDeleteFile, loadBook]);

  // Cut/Copy go through the DOM's own `execCommand`, not a hand-rolled
  // clipboard write: focusing the editor first restores ProseMirror's
  // selection into the real browser selection, so the native command copies
  // (or removes-and-copies) exactly what's selected — formatting included —
  // the same way a right-click Copy/Cut already does. ProseMirror's own DOM
  // observer picks up the resulting mutation for `cut`, so no manual
  // `deleteSelection()` is needed alongside it.
  const handleCut = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().run();
    document.execCommand('cut');
  }, [editor]);

  const handleCopy = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().run();
    document.execCommand('copy');
  }, [editor]);

  // Unlike Cut/Copy, `execCommand('paste')` is blocked in ordinary web pages
  // without extension privileges, so Paste reads the clipboard directly —
  // preferring `text/html` (preserves formatting) and falling back to plain
  // text, unlike `pasteWithoutFormatting` below which always discards markup.
  const handlePaste = useCallback(async () => {
    if (!editor) return;
    try {
      if (navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const html = await (await item.getType('text/html')).text();
            editor.chain().focus().insertContent(html).run();
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) editor.chain().focus().insertContent(text).run();
    } catch (error) {
      console.error('Clipboard read failed:', error);
      alert('Could not read the clipboard. Your browser may require permission, or this page may need to be served over HTTPS.');
    }
  }, [editor]);

  const pasteWithoutFormatting = useCallback(async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      // Splits on line breaks into separate paragraphs rather than inserting
      // one string with embedded "\n"s — a plain-text insert would otherwise
      // render literal newline characters inside a single paragraph instead
      // of the line/paragraph breaks a "paste without formatting" implies.
      const content = text.split(/\r\n|\r|\n/).map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      }));
      editor.chain().focus().insertContent(content).run();
    } catch (error) {
      console.error('Clipboard read failed:', error);
      alert('Could not read the clipboard. Your browser may require permission, or this page may need to be served over HTTPS.');
    }
  }, [editor]);

  const handleApplyPageSetup = useCallback(
    (newSetup: PageSetup) => {
      // Written directly rather than left to the `useEffect` that mirrors
      // `pageSetup` into the ref: that effect only runs after this render
      // commits, and `repaginateNow` right below needs the ref already
      // correct *now*, in this same call, to reflow against the new page
      // size immediately instead of on whatever edit happens to come next.
      pageSetupRef.current = newSetup;
      setPageSetupState(newSetup);
      setIsDirty(true);
      if (editor) repaginateNow(editor.view, paginationOptions);
    },
    [editor, paginationOptions]
  );

  const currentFileItem = currentFileId ? files.find((f) => f.id === currentFileId) ?? null : null;

  const [folderPathString, setFolderPathString] = useState('My Drive');
  useEffect(() => {
    if (!isPropertiesOpen || !currentFileId) return;
    FileService.breadcrumbs(currentFileId)
      .then((path) => setFolderPathString(path.length > 0 ? path.map((p) => p.name).join(' / ') : 'My Drive'))
      .catch(() => setFolderPathString('My Drive'));
  }, [isPropertiesOpen, currentFileId]);

  const handleDownload = useCallback(async () => {
    if (!currentFileId || !currentFileItem) {
      alert('Save the document at least once before downloading it.');
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
      console.error('Failed to download document:', error);
      alert('Could not download the document. Please try again.');
    }
  }, [currentFileId, currentFileItem]);

  // Format exports work off the live editor content — unlike the raw
  // .book download above, they never need the document to have been saved
  // as a real file first.
  const handleDownloadTxt = useCallback(() => {
    if (!editor) return;
    downloadAsTxt(editor.getText(), docTitle);
  }, [editor, docTitle]);

  const handleDownloadHtml = useCallback(() => {
    if (!editor) return;
    downloadAsHtml(editor.getHTML(), docTitle);
  }, [editor, docTitle]);

  const handleDownloadMarkdown = useCallback(() => {
    if (!editor) return;
    downloadAsMarkdown(editor.getHTML(), docTitle);
  }, [editor, docTitle]);

  const handleDownloadDocx = useCallback(async () => {
    if (!editor) return;
    try {
      await downloadAsDocx(editor.getJSON(), docTitle);
    } catch (error) {
      console.error('Failed to export .docx:', error);
      alert('Could not create the Word document. Please try again.');
    }
  }, [editor, docTitle]);

  const handleDownloadPdf = useCallback(async () => {
    if (!editor) return;
    // Save always reflects the precise, fully-repaginated layout — a PDF
    // exported straight off whatever's currently on screen in Manual
    // pagination mode could be showing a deferred, stale page break.
    // `repaginateNow` dispatches synchronously, but the `plan` *state*
    // variable only catches up on React's next render — reading the plugin
    // directly via `getPaginationPlan` is what actually gets the fresh one
    // in this same call, not whatever `plan` closed over when this function
    // was created.
    repaginateNow(editor.view, paginationOptions);
    const freshPlan = getPaginationPlan(editor.view) ?? plan;
    // The ProseMirror-side spacer decorations above already updated
    // synchronously with `repaginateNow`, but the white page-background
    // rectangles are plain React state (`onPlanChange` → `setPlan`) that
    // only actually paints on React's next commit — waiting two frames is
    // the standard, cheap way to be sure that commit has actually happened
    // before html2canvas captures the DOM.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      await downloadAsPdf(freshPlan, docTitle);
    } catch (error) {
      console.error('Failed to export .pdf:', error);
      const detail = error instanceof Error ? error.message : String(error);
      alert(`Could not create the PDF: ${detail}`);
    }
  }, [editor, paginationOptions, plan, docTitle]);

  // After a version restore, the file's *stored* content has changed under
  // the currently-open editor — reload it the same way opening the file
  // fresh would, rather than trying to reconcile the live in-memory doc
  // against it.
  const handleVersionRestored = useCallback(() => {
    if (!currentFileId) return;
    void FileService.getFile(currentFileId).then((full) => {
      if (!full?.content) return;
      try {
        const book = parseBookFile(full.content);
        loadBook(book, full.id, full.name, full.parentId);
      } catch (error) {
        console.error('Failed to reload restored version:', error);
      }
    });
  }, [currentFileId, loadBook]);

  const showWordCount = useCallback(() => {
    if (!editor) return;
    const text = editor.getText();
    const trimmed = text.trim();
    const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
    alert(
      `Words: ${words}\nCharacters: ${text.length}\nCharacters (no spaces): ${text.replace(/\s/g, '').length}\nPages: ${plan.pages.length}`
    );
  }, [editor, plan]);

  // Autosave: only meaningful once the document is linked to a real file —
  // matches this platform's other document apps (text-editor).
  useEffect(() => {
    if (!isDirty || !currentFileId) return;
    const timer = setTimeout(() => void handleSave(), 4000);
    return () => clearTimeout(timer);
  }, [isDirty, currentFileId, handleSave]);

  // Keyboard shortcuts that don't already come for free from TipTap's own
  // keymap (bold/italic/undo/redo are handled by StarterKit's history/marks).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (event.shiftKey) beginSaveAs();
        else handleSaveClick();
      } else if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        setIsOpenModalOpen(true);
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleNew();
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFindShowReplace(false);
        setIsFindOpen(true);
      } else if (event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setFindShowReplace(true);
        setIsFindOpen(true);
      } else if (event.key.toLowerCase() === 'v' && event.shiftKey) {
        event.preventDefault();
        void pasteWithoutFormatting();
      } else if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (editor) promptForLink(editor);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveClick, beginSaveAs, handleNew, pasteWithoutFormatting, editor]);

  useAppMenu(windowId, [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new', label: 'New', shortcut: 'Ctrl+N', onSelect: handleNew },
        { id: 'open', label: 'Open…', shortcut: 'Ctrl+O', onSelect: () => setIsOpenModalOpen(true) },
        separator(),
        { id: 'save', label: 'Save', shortcut: 'Ctrl+S', onSelect: handleSaveClick },
        { id: 'save-as', label: 'Save As…', shortcut: 'Ctrl+Shift+S', onSelect: beginSaveAs },
        { id: 'make-copy', label: 'Make a Copy', disabled: !currentFileId, onSelect: () => void handleMakeCopy() },
        separator(),
        { id: 'share', label: 'Share…', disabled: !currentFileId, onSelect: () => setIsShareOpen(true) },
        {
          kind: 'submenu',
          id: 'download',
          label: 'Download',
          items: [
            { id: 'download-book', label: 'Word Book (.book)', disabled: !currentFileId, onSelect: () => void handleDownload() },
            { id: 'download-docx', label: 'Microsoft Word (.docx)', onSelect: () => void handleDownloadDocx() },
            { id: 'download-pdf', label: 'PDF Document (.pdf)', onSelect: () => void handleDownloadPdf() },
            { id: 'download-txt', label: 'Plain Text (.txt)', onSelect: handleDownloadTxt },
            { id: 'download-html', label: 'Web Page (.html)', onSelect: handleDownloadHtml },
            { id: 'download-md', label: 'Markdown (.md)', onSelect: handleDownloadMarkdown },
          ],
        },
        separator(),
        { id: 'rename', label: 'Rename…', disabled: !currentFileId, onSelect: handleRename },
        { id: 'move-to-trash', label: 'Move to Trash', disabled: !currentFileId, onSelect: () => void handleMoveToTrash() },
        separator(),
        { id: 'version-history', label: 'Version History…', disabled: !currentFileId, onSelect: () => setIsVersionHistoryOpen(true) },
        separator(),
        { id: 'details', label: 'Details…', disabled: !currentFileId, onSelect: () => setIsPropertiesOpen(true) },
        { id: 'page-setup', label: 'Page Setup…', onSelect: () => setIsPageSetupOpen(true) },
        { id: 'print', label: 'Print', shortcut: 'Ctrl+P', onSelect: () => window.print() },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', disabled: !editor?.can().undo(), onSelect: () => editor?.chain().focus().undo().run() },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', disabled: !editor?.can().redo(), onSelect: () => editor?.chain().focus().redo().run() },
        separator(),
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', disabled: editor?.state.selection.empty ?? true, onSelect: handleCut },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', disabled: editor?.state.selection.empty ?? true, onSelect: handleCopy },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', onSelect: () => void handlePaste() },
        { id: 'paste-plain', label: 'Paste without Formatting', shortcut: 'Ctrl+Shift+V', onSelect: () => void pasteWithoutFormatting() },
        separator(),
        { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', onSelect: () => editor?.chain().focus().selectAll().run() },
        { id: 'delete', label: 'Delete', disabled: editor?.state.selection.empty ?? true, onSelect: () => editor?.chain().focus().deleteSelection().run() },
        separator(),
        {
          id: 'find-replace',
          label: 'Find and Replace…',
          shortcut: 'Ctrl+H',
          onSelect: () => {
            setFindShowReplace(true);
            setIsFindOpen(true);
          },
        },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      items: [
        {
          kind: 'submenu',
          id: 'insert-image',
          label: 'Image',
          items: [
            { id: 'image-upload', label: 'Upload from computer', onSelect: () => insertImageFileInputRef.current?.click() },
            { id: 'image-url', label: 'By URL…', onSelect: insertImageByUrl },
            { id: 'image-drive', label: 'From Drive…', onSelect: beginInsertImageFromDrive },
          ],
        },
        {
          kind: 'submenu',
          id: 'insert-table',
          label: 'Table',
          items: [
            {
              kind: 'custom',
              id: 'table-grid',
              render: ({ onClose }) => (
                <TableGridPicker
                  onPick={(rows, cols) => {
                    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                    onClose();
                  }}
                />
              ),
            },
          ],
        },
        {
          kind: 'submenu',
          id: 'building-blocks',
          label: 'Building Blocks',
          items: BUILDING_BLOCKS.map((tpl) => ({
            id: `bb-${tpl.id}`,
            label: tpl.label,
            onSelect: () => editor?.chain().focus().insertContent(tpl.content).run(),
          })),
        },
        {
          kind: 'submenu',
          id: 'insert-smart-chips',
          label: 'Smart chips',
          items: [
            { id: 'chip-date', label: 'Date', onSelect: () => setIsDateChipOpen(true) },
            { id: 'chip-people', label: 'People', onSelect: () => setIsPeopleChipOpen(true) },
            { id: 'chip-file', label: 'File', onSelect: beginInsertFileChip },
            { id: 'chip-event', label: 'Calendar event', onSelect: () => setIsEventChipOpen(true) },
            separator(),
            { id: 'chip-dropdown', label: 'Dropdown', onSelect: () => setIsDropdownChipOpen(true) },
          ],
        },
        { id: 'link', label: 'Link…', shortcut: 'Ctrl+K', onSelect: () => editor && promptForLink(editor) },
        { id: 'drawing', label: 'Drawing…', onSelect: () => setIsDrawingOpen(true) },
        {
          kind: 'submenu',
          id: 'insert-chart',
          label: 'Chart',
          items: [
            {
              id: 'chart-bar',
              label: 'Bar',
              onSelect: () => {
                setChartInitialType('bar');
                setChartInitialRows(undefined);
                setIsChartOpen(true);
              },
            },
            {
              id: 'chart-column',
              label: 'Column',
              onSelect: () => {
                setChartInitialType('column');
                setChartInitialRows(undefined);
                setIsChartOpen(true);
              },
            },
            {
              id: 'chart-line',
              label: 'Line',
              onSelect: () => {
                setChartInitialType('line');
                setChartInitialRows(undefined);
                setIsChartOpen(true);
              },
            },
            {
              id: 'chart-pie',
              label: 'Pie',
              onSelect: () => {
                setChartInitialType('pie');
                setChartInitialRows(undefined);
                setIsChartOpen(true);
              },
            },
            separator(),
            { id: 'chart-from-sheets', label: 'From Sheets…', onSelect: beginInsertChartFromSheets },
          ],
        },
        {
          kind: 'submenu',
          id: 'insert-symbols',
          label: 'Symbols',
          items: [
            { id: 'symbols-emoji', label: 'Emoji', onSelect: () => setIsEmojiOpen(true) },
            { id: 'symbols-special', label: 'Special characters', onSelect: () => setIsSpecialCharsOpen(true) },
            { id: 'symbols-equation', label: 'Equation', onSelect: () => setIsEquationOpen(true) },
          ],
        },
        separator(),
        { id: 'horizontal-rule', label: 'Horizontal Line', onSelect: () => editor?.chain().focus().setHorizontalRule().run() },
        {
          kind: 'submenu',
          id: 'insert-break',
          label: 'Break',
          items: [{ id: 'page-break', label: 'Page Break', shortcut: 'Ctrl+Enter', onSelect: () => editor?.chain().focus().insertPageBreak().run() }],
        },
        { id: 'bookmark', label: 'Bookmark', onSelect: () => editor?.chain().focus().insertBookmark().run() },
        separator(),
        { id: 'signature-line', label: 'Signature Line', onSelect: () => editor?.chain().focus().insertContent(SIGNATURE_LINE_CONTENT).run() },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          kind: 'submenu',
          id: 'pagination-mode',
          label: 'Pagination',
          items: [
            {
              id: 'pagination-automatic',
              label: 'Automatic',
              selected: paginationMode === 'automatic',
              onSelect: () => setPaginationMode('automatic'),
            },
            {
              id: 'pagination-manual',
              label: 'Manual (on-demand)',
              selected: paginationMode === 'manual',
              onSelect: () => setPaginationMode('manual'),
            },
          ],
        },
        { id: 'repaginate', label: 'Repaginate Now', onSelect: handleRepaginateNow },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      // No keyboard shortcut bound — Ctrl+Shift+C is reserved by most
      // browsers for DevTools' element inspector, so claiming it here would
      // either silently lose to the browser or misleadingly label a
      // shortcut that doesn't actually work.
      items: [{ id: 'word-count', label: 'Word Count…', onSelect: showWordCount }],
    },
  ]);

  return (
    <>
      <WordBookShell
        windowId={windowId}
        editor={editor}
        docTitle={docTitle}
        isDirty={isDirty}
        plan={plan}
        pageSetup={pageSetup}
        onSave={handleSaveClick}
        zoom={zoom}
        onZoomChange={setZoom}
        currentFolderId={currentFolderId}
        resolveDefaultFolderId={resolveDefaultFolderId}
        isStarred={isStarred}
        onRenameTitle={commitTitleChange}
        onToggleStar={() => void handleToggleStar()}
        isOutlineOpen={isOutlineOpen}
        onToggleOutline={() => setIsOutlineOpen((v) => !v)}
      />
      <OpenBookModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        allFiles={files}
        onSelectFile={handleSelectFile}
        onNewBlank={handleNew}
      />
      {isFindOpen && editor && (
        <FindReplaceBar editor={editor} initialShowReplace={findShowReplace} onClose={() => setIsFindOpen(false)} />
      )}
      <ShareModal
        fileItem={currentFileItem}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        onSharedChanged={(fileId, shared) => setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, isShared: shared } : f)))}
      />
      <PropertiesModal
        item={currentFileItem}
        isOpen={isPropertiesOpen}
        onClose={() => setIsPropertiesOpen(false)}
        onToggleStar={() => void handleToggleStar()}
        onShare={() => setIsShareOpen(true)}
        onDownload={() => void handleDownload()}
        onDelete={() => void handleMoveToTrash()}
        folderPathString={folderPathString}
      />
      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        fileId={currentFileId}
        onRestored={handleVersionRestored}
      />
      <PageSetupModal
        isOpen={isPageSetupOpen}
        onClose={() => setIsPageSetupOpen(false)}
        pageSetup={pageSetup}
        onApply={handleApplyPageSetup}
      />
      <CharacterGridModal
        isOpen={isSpecialCharsOpen}
        onClose={() => setIsSpecialCharsOpen(false)}
        editor={editor}
        title="Insert special character"
        groups={SPECIAL_CHARACTER_GROUPS}
      />
      <CharacterGridModal isOpen={isEmojiOpen} onClose={() => setIsEmojiOpen(false)} editor={editor} title="Insert emoji" groups={EMOJI_GROUPS} />
      <EquationModal
        isOpen={isEquationOpen}
        onClose={() => setIsEquationOpen(false)}
        onInsert={(content) => editor?.chain().focus().insertContent(content).run()}
      />
      <DrawingModal
        isOpen={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
        onInsert={(dataUrl) => editor?.chain().focus().setImage({ src: dataUrl }).run()}
      />
      <ChartModal
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        onInsert={(dataUrl) => editor?.chain().focus().setImage({ src: dataUrl }).run()}
        initialType={chartInitialType}
        initialRows={chartInitialRows}
      />
      <DateChipModal isOpen={isDateChipOpen} onClose={() => setIsDateChipOpen(false)} onInsert={insertDateChip} />
      <PeopleChipModal isOpen={isPeopleChipOpen} onClose={() => setIsPeopleChipOpen(false)} onInsert={insertPersonChip} />
      <CalendarEventChipModal
        isOpen={isEventChipOpen}
        onClose={() => setIsEventChipOpen(false)}
        events={calendarEvents}
        onInsert={insertEventChip}
      />
      <DropdownChipModal isOpen={isDropdownChipOpen} onClose={() => setIsDropdownChipOpen(false)} onInsert={insertDropdownChipOptions} />
      {openDropdownPicker && (
        <MenuPanel
          items={openDropdownPicker.items}
          theme={LIGHT_THEME_ID}
          onClose={() => setOpenDropdownPicker(null)}
          placement={openDropdownPicker.placement}
        />
      )}
      <input
        ref={insertImageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && editor) {
            void uploadAndInsertImage(editor, file, currentFolderId, resolveDefaultFolderId).catch((error) => {
              console.error('Failed to insert image:', error);
              alert('Could not upload that image. Please try again.');
            });
          }
          e.target.value = '';
        }}
      />
    </>
  );
}
