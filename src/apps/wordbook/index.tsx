import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import { useSystemStore } from '../../shell/state/systemStore';
import { FileService } from '../../platform/files/FileService';
import { FileItem } from '../../platform/types';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';

import { wordBookExtensions } from './editor/schema';
import { createPaginationExtension } from './editor/paginationExtension';
import { repaginateNow, PaginationMode, PaginationPluginOptions } from './editor/paginationPlugin';
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

type BookMetaState = Pick<BookDocument, 'metadata' | 'defaultPageSetup' | 'headers' | 'footers' | 'assets'>;

export default function WordBook({ windowId = 'wordbook' }: { windowId?: string }) {
  const files = useSystemStore((state) => state.files);
  const setFiles = useSystemStore((state) => state.setFiles);
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);

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

  // Phase 1 ships a single, fixed A4-portrait page setup; per-document
  // orientation/margins UI is Phase 2 (the schema/format already carry it).
  const pageSetup: PageSetup = useMemo(() => a4PageSetup('portrait'), []);
  const pageSetupRef = useRef(pageSetup);

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
    () => [...wordBookExtensions(), createPaginationExtension(paginationOptions)],
    [paginationOptions]
  );

  const editor = useEditor(
    {
      extensions,
      content: blankBookDocument('Untitled Document').sections[0].content as never,
      onUpdate: () => setIsDirty(true),
      editorProps: {
        attributes: { class: 'wb-prosemirror', spellcheck: 'true' },
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

  const handleSave = useCallback(
    async (overrides?: { forceNew?: boolean; nameOverride?: string }) => {
      if (!editor) return;
      // Save always reflects the precise, fully-repaginated layout, even if
      // Manual mode had left the live view deferred.
      repaginateNow(editor.view, paginationOptions);

      const book = toBookDocument(editor.getJSON(), bookMeta);
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
          const parentId = currentFolderId ?? resolveDefaultFolderId('Documents');
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
    [bookMeta, currentFileId, currentFolderId, docTitle, editor, paginationOptions, resolveDefaultFolderId, setFiles]
  );

  const handleSaveAs = useCallback(() => {
    const name = prompt('Save as:', docTitle);
    if (!name) return;
    void handleSave({ forceNew: true, nameOverride: name });
  }, [docTitle, handleSave]);

  const handleRepaginateNow = useCallback(() => {
    if (!editor) return;
    repaginateNow(editor.view, paginationOptions);
  }, [editor, paginationOptions]);

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
        if (event.shiftKey) handleSaveAs();
        else void handleSave();
      } else if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        setIsOpenModalOpen(true);
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleNew();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, handleSaveAs, handleNew]);

  useAppMenu(windowId, [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new', label: 'New', shortcut: 'Ctrl+N', onSelect: handleNew },
        { id: 'open', label: 'Open…', shortcut: 'Ctrl+O', onSelect: () => setIsOpenModalOpen(true) },
        separator(),
        { id: 'save', label: 'Save', shortcut: 'Ctrl+S', onSelect: () => void handleSave() },
        { id: 'save-as', label: 'Save As…', shortcut: 'Ctrl+Shift+S', onSelect: handleSaveAs },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', disabled: !editor?.can().undo(), onSelect: () => editor?.chain().focus().undo().run() },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', disabled: !editor?.can().redo(), onSelect: () => editor?.chain().focus().redo().run() },
        separator(),
        { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', onSelect: () => editor?.chain().focus().selectAll().run() },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      items: [
        { id: 'page-break', label: 'Page Break', shortcut: 'Ctrl+Enter', onSelect: () => editor?.chain().focus().insertPageBreak().run() },
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
  ]);

  return (
    <>
      <WordBookShell
        editor={editor}
        docTitle={docTitle}
        isDirty={isDirty}
        plan={plan}
        pageSetup={pageSetup}
        onSave={() => void handleSave()}
        zoom={zoom}
        onZoomChange={setZoom}
        currentFolderId={currentFolderId}
        resolveDefaultFolderId={resolveDefaultFolderId}
      />
      <OpenBookModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        allFiles={files}
        onSelectFile={handleSelectFile}
        onNewBlank={handleNew}
      />
    </>
  );
}
