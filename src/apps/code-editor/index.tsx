import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { useSystemStore } from '../../shell/state/systemStore';
import { FileService, FileItemResponse } from '../../platform/files/FileService';
import { FileItem } from '../../platform/types';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';
import { useContextMenuStore } from '../../shell/context-menu/contextMenuStore';
import AppShell from '../../design-system/components/AppShell';
import { FolderOpen } from 'lucide-react';
import EditorTabBar from './components/EditorTabBar';
import MonacoPane from './components/MonacoPane';
import OpenFileModal from './components/OpenFileModal';
import OpenFolderModal from './components/OpenFolderModal';
import ExplorerSidebar from './components/ExplorerSidebar';
import SearchPanel from './components/SearchPanel';
import ActivityBar, { ActivityPanel } from './components/ActivityBar';
import SidebarPanel from './components/SidebarPanel';
import Breadcrumb from './components/Breadcrumb';
import StatusBar from './components/StatusBar';
import SettingsEditor from './components/SettingsEditor';
import { languageForFileName } from './editor/languages';
import { MONACO_THEME_IDS, EditorThemeName } from './editor/themes';
import { monaco } from './editor/monacoSetup';
import { formatWithPrettier, prettierSupportsLanguage } from './plugins/prettierFormat';
import { lintJavaScript, eslintSupportsLanguage } from './plugins/eslintLint';

interface EditorTab {
  id: string;
  fileId: string | null;
  fileName: string;
  folderId: string | null;
  language: string;
  isDirty: boolean;
}

const MAX_RECENT = 8;
let untitledCounter = 0;
const SETTINGS_TAB_ID = '__settings__';
const DEFAULT_FONT_FAMILY = 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace';

export default function CodeEditor() {
  const files = useSystemStore((s) => s.files);
  const setFiles = useSystemStore((s) => s.setFiles);
  const settings = useSystemStore((s) => s.settings);
  const setSettings = useSystemStore((s) => s.setSettings);
  const resolveDefaultFolderId = useSystemStore((s) => s.resolveDefaultFolderId);
  const handleCloseWindow = useSystemStore((s) => s.handleCloseWindow);
  const openAppWindow = useSystemStore((s) => s.openAppWindow);
  const syncFilesFromBackend = useSystemStore((s) => s.syncFilesFromBackend);
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu);
  const editorFileId = useSystemStore((s) => s.editorFileId);
  const editorFileName = useSystemStore((s) => s.editorFileName);
  const editorFileContent = useSystemStore((s) => s.editorFileContent);
  const editorCurrentFolderId = useSystemStore((s) => s.editorCurrentFolderId);

  const prefs = (settings.appPreferences?.editor ?? {}) as {
    wordWrap?: boolean;
    editorTheme?: EditorThemeName;
    tabSize?: string;
    autoSave?: boolean;
    openFolderId?: string | null;
    openFolderName?: string;
    breadcrumbsEnabled?: boolean;
    minimapEnabled?: boolean;
    lineNumbersEnabled?: boolean;
    renderWhitespace?: boolean;
    fontSize?: number;
    fontFamily?: string;
    formatOnSave?: boolean;
    prettierEnabled?: boolean;
    prettierSemi?: boolean;
    prettierSingleQuote?: boolean;
    prettierTrailingComma?: 'none' | 'es5' | 'all';
    prettierPrintWidth?: number;
    eslintEnabled?: boolean;
  };
  const wordWrap = prefs.wordWrap ?? true;
  const breadcrumbsEnabled = prefs.breadcrumbsEnabled ?? true;
  const themeName: EditorThemeName = prefs.editorTheme ?? 'Classic Light';
  const monacoTheme = MONACO_THEME_IDS[themeName] ?? 'vs';
  const tabSizeLabel = prefs.tabSize ?? '2 spaces';
  const tabSize = tabSizeLabel === '4 spaces' ? 4 : 2;
  const insertSpaces = tabSizeLabel !== 'Tabs';
  const autoSaveEnabled = prefs.autoSave ?? true;
  const minimapEnabled = prefs.minimapEnabled ?? true;
  const lineNumbersEnabled = prefs.lineNumbersEnabled ?? true;
  const renderWhitespace = prefs.renderWhitespace ?? false;
  const fontSize = prefs.fontSize ?? 13;
  const fontFamily = prefs.fontFamily ?? DEFAULT_FONT_FAMILY;
  const formatOnSave = prefs.formatOnSave ?? false;
  const prettierEnabled = prefs.prettierEnabled ?? true;
  const prettierSemi = prefs.prettierSemi ?? true;
  const prettierSingleQuote = prefs.prettierSingleQuote ?? false;
  const prettierTrailingComma = prefs.prettierTrailingComma ?? 'es5';
  const prettierPrintWidth = prefs.prettierPrintWidth ?? 80;
  const eslintEnabled = prefs.eslintEnabled ?? true;
  // Undefined = no folder open yet (distinct from `null`, which is the
  // real "Home" root folder — Open Folder can legitimately target either).
  const openFolder = prefs.openFolderName !== undefined ? { id: prefs.openFolderId ?? null, name: prefs.openFolderName } : null;

  const setEditorPref = useCallback(
    (patch: Record<string, unknown>) => {
      setSettings((prev) => ({
        ...prev,
        appPreferences: { ...prev.appPreferences, editor: { ...prev.appPreferences?.editor, ...patch } },
      }));
    },
    [setSettings]
  );

  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isOpenFolderModalOpen, setIsOpenFolderModalOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<{ id: string; name: string; folderId: string | null }[]>([]);
  const [activePanel, setActivePanel] = useState<ActivityPanel>('explorer');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [markerCounts, setMarkerCounts] = useState({ errors: 0, warnings: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const contentRef = useRef<Map<string, string>>(new Map());
  const originalContentRef = useRef<Map<string, string>>(new Map());
  const editorInstanceRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const lastOpenedSignatureRef = useRef<string | null>(null);

  // Mirrors `tabs` for reads inside callbacks without going stale — lets
  // `setTabs`'s own updater stay a pure `(prev) => next` with no side
  // effects. React's dev-mode StrictMode intentionally invokes state
  // updater functions twice to catch impure ones; an updater that mutates
  // `untitledCounter` or calls `setActiveTabId` as a side effect can commit
  // a different tab id than the one actually made active, leaving the
  // editor pane pointed at a tab that doesn't exist in the committed array.
  const tabsRef = useRef<EditorTab[]>([]);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  // Same reason as `tabsRef` — lets `handleSave` (defined once, called for
  // whichever tab id it's given) know whether that id is the one currently
  // mounted in the shared Monaco instance, without depending on `activeTabId`
  // and being torn down/recreated on every tab switch.
  const activeTabIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  // Breadcrumb's parent segment: only shown when the file's immediate folder
  // is already known (cached from a real fetch) and isn't just the open
  // workspace root — matches VS Code's own "path relative to workspace"
  // breadcrumb convention rather than showing a name we'd have to guess.
  const activeParentFolderName =
    activeTab?.folderId && activeTab.folderId !== (openFolder?.id ?? null)
      ? files.find((f) => f.id === activeTab.folderId)?.name ?? null
      : null;

  const pushRecent = useCallback((fileId: string, fileName: string, folderId: string | null) => {
    setRecentFiles((prev) => [{ id: fileId, name: fileName, folderId }, ...prev.filter((f) => f.id !== fileId)].slice(0, MAX_RECENT));
  }, []);

  const openTab = useCallback(
    (fileId: string | null, fileName: string, content: string, folderId: string | null) => {
      const existing = fileId ? tabsRef.current.find((t) => t.fileId === fileId) : undefined;
      if (existing) {
        setActiveTabId(existing.id);
        if (fileId) pushRecent(fileId, fileName, folderId);
        return;
      }
      const id = fileId ?? `untitled-${++untitledCounter}`;
      contentRef.current.set(id, content);
      originalContentRef.current.set(id, content);
      const tab: EditorTab = { id, fileId, fileName, folderId, language: languageForFileName(fileName), isDirty: false };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(id);
      if (fileId) pushRecent(fileId, fileName, folderId);
    },
    [pushRecent]
  );

  // File Explorer double-click / "Open With", and the terminal's `edit <file>`
  // alias, both request a file be opened by writing these same systemStore
  // fields and calling `openAppWindow('editor')` — unchanged from the old
  // text-editor app, so both integrations keep working with no changes on
  // their end.
  useEffect(() => {
    if (!editorFileId) return;
    const signature = `${editorFileId}:${editorFileName}`;
    if (lastOpenedSignatureRef.current === signature) return;
    lastOpenedSignatureRef.current = signature;
    openTab(editorFileId, editorFileName ?? 'Untitled', editorFileContent, editorCurrentFolderId);
  }, [editorFileId, editorFileName, editorFileContent, editorCurrentFolderId, openTab]);

  // Nothing requested via the store and no tabs yet: start blank, same as
  // opening any other document app fresh. Guarded against StrictMode's dev
  // double-invoke of mount effects — without the ref, two blank tabs get
  // created (module-level `untitledCounter` has no way to know the second
  // call is a re-run, not a second real mount).
  const hasSeededRef = useRef(false);
  useEffect(() => {
    if (hasSeededRef.current) return;
    hasSeededRef.current = true;
    if (tabs.length === 0 && !editorFileId) {
      untitledCounter += 1;
      openTab(null, `Untitled-${untitledCounter}`, '', null);
    }
    // Deliberately mount-only: this seeds the very first tab, not a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDirty = useCallback((tabId: string, dirty: boolean) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? (t.isDirty === dirty ? t : { ...t, isDirty: dirty }) : t)));
  }, []);

  // Formats whatever is currently mounted in the shared Monaco instance —
  // Prettier for the languages it genuinely supports (real formatting, not a
  // stub), falling back to Monaco's own built-in formatter (TS/JSON/CSS/HTML,
  // backed by the language workers registered in monacoSetup.ts) for
  // everything else, including when Prettier itself fails to parse the file.
  const formatActiveDocument = useCallback(async () => {
    const ed = editorInstanceRef.current;
    const model = ed?.getModel();
    if (!ed || !model) return;
    const language = model.getLanguageId();
    let usedPrettier = false;
    if (prettierEnabled && prettierSupportsLanguage(language)) {
      try {
        const formatted = await formatWithPrettier(model.getValue(), language, {
          tabWidth: tabSize,
          useTabs: !insertSpaces,
          semi: prettierSemi,
          singleQuote: prettierSingleQuote,
          trailingComma: prettierTrailingComma,
          printWidth: prettierPrintWidth,
        });
        if (formatted !== model.getValue()) {
          ed.executeEdits('prettier', [{ range: model.getFullModelRange(), text: formatted }]);
        }
        usedPrettier = true;
      } catch (error) {
        console.error('Prettier formatting failed, falling back to the built-in formatter:', error);
      }
    }
    if (!usedPrettier) {
      await ed.getAction('editor.action.formatDocument')?.run();
    }
    ed.focus();
  }, [prettierEnabled, tabSize, insertSpaces, prettierSemi, prettierSingleQuote, prettierTrailingComma, prettierPrintWidth]);

  // `onEditorMount` registers a Monaco action bound to Shift+Alt+F so the
  // editor's own native shortcut and right-click "Format Document" route
  // through Prettier too, not just the Edit menu item — that action is only
  // created once per editor mount, so it reads this through a ref to stay
  // current as prefs change.
  const formatActiveDocumentRef = useRef(formatActiveDocument);
  useEffect(() => {
    formatActiveDocumentRef.current = formatActiveDocument;
  }, [formatActiveDocument]);

  // Real-time ESLint diagnostics for the active tab, debounced from
  // `handleChange` below and re-run on tab switch. Scoped to JavaScript only
  // (see plugins/eslintLint.ts) and only the currently-mounted model — this
  // app shares one Monaco instance across tabs, so background tabs' content
  // isn't being edited and doesn't need re-linting until they're active again.
  const lintActiveModel = useCallback(() => {
    const model = editorInstanceRef.current?.getModel();
    if (!model) return;
    if (!eslintEnabled || !eslintSupportsLanguage(model.getLanguageId())) {
      monaco.editor.setModelMarkers(model, 'eslint', []);
      return;
    }
    try {
      const diagnostics = lintJavaScript(model.getValue());
      monaco.editor.setModelMarkers(
        model,
        'eslint',
        diagnostics.map((d) => ({
          startLineNumber: d.startLine,
          startColumn: d.startColumn,
          endLineNumber: d.endLine,
          endColumn: d.endColumn,
          message: d.ruleId ? `${d.message} (${d.ruleId})` : d.message,
          severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          source: 'ESLint',
        }))
      );
    } catch {
      // A genuine parse failure (unusual syntax espree can't handle) —
      // clear rather than leave stale/misleading markers on the model.
      monaco.editor.setModelMarkers(model, 'eslint', []);
    }
  }, [eslintEnabled]);
  const lintActiveModelRef = useRef(lintActiveModel);
  useEffect(() => {
    lintActiveModelRef.current = lintActiveModel;
  }, [lintActiveModel]);
  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-lint whenever the active tab (and therefore the mounted model)
  // changes, including when ESLint itself is toggled off — that needs an
  // immediate pass too, to clear whatever markers are already showing.
  useEffect(() => {
    const raf = requestAnimationFrame(() => lintActiveModel());
    return () => cancelAnimationFrame(raf);
  }, [activeTabId, lintActiveModel]);

  const handleChange = useCallback(
    (tabId: string, value: string) => {
      contentRef.current.set(tabId, value);
      markDirty(tabId, value !== originalContentRef.current.get(tabId));
      if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
      lintTimerRef.current = setTimeout(() => lintActiveModelRef.current(), 400);
    },
    [markDirty]
  );

  const handleSave = useCallback(
    async (tabId: string, overrides?: { nameOverride?: string }) => {
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab) return;
      // Format On Save only ever applies to the tab currently mounted in the
      // shared Monaco instance — background tabs kept from previous switches
      // don't have a live editor to run a formatter against here. That's the
      // overwhelming majority of real saves (Ctrl+S / File > Save on the
      // active file); Save All intentionally leaves other dirty tabs as-is
      // rather than silently skipping "format" for some of the files it saves.
      if (formatOnSave && tabId === activeTabIdRef.current) {
        await formatActiveDocument();
      }
      const content = contentRef.current.get(tabId) ?? '';

      try {
        if (tab.fileId && !overrides?.nameOverride) {
          const updated = await FileService.updateFile(tab.fileId, { content });
          setFiles((prev) => prev.map((f) => (f.id === tab.fileId ? { ...f, name: updated.name, content } : f)));
          originalContentRef.current.set(tabId, content);
          markDirty(tabId, false);
        } else {
          const targetName = overrides?.nameOverride ?? tab.fileName;
          const parentId = tab.folderId ?? resolveDefaultFolderId('Documents');
          // Explicit text/plain: the backend's mimetype inference doesn't
          // recognize most source-code extensions (.py/.go/.rs/...) and
          // would otherwise fall back to application/octet-stream, which
          // the API's content-inlining allowlist treats as binary and
          // withholds on read — the same failure mode fixed for .book files
          // earlier, avoided here by never depending on that inference.
          const created = await FileService.createFile({ name: targetName, type: 'file', parentId, content, mimeType: 'text/plain' });
          setFiles((prev) => [
            ...prev,
            { id: created._id, name: created.name, type: 'file' as const, content, parentId: created.parentId, createdAt: created.createdAt },
          ]);
          contentRef.current.delete(tabId);
          originalContentRef.current.delete(tabId);
          contentRef.current.set(created._id, content);
          originalContentRef.current.set(created._id, content);
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    id: created._id,
                    fileId: created._id,
                    fileName: created.name,
                    folderId: created.parentId,
                    language: languageForFileName(created.name),
                    isDirty: false,
                  }
                : t
            )
          );
          setActiveTabId((current) => (current === tabId ? created._id : current));
          pushRecent(created._id, created.name, created.parentId);
        }
      } catch (error) {
        console.error('Failed to save file:', error);
        alert(`Failed to save "${tab.fileName}". Your changes are still in the editor — please try again.`);
      }
    },
    [setFiles, resolveDefaultFolderId, markDirty, pushRecent, formatOnSave, formatActiveDocument]
  );

  const handleSaveAs = useCallback(
    (tabId: string) => {
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab) return;
      const name = prompt('Save as:', tab.fileName);
      if (!name) return;
      void handleSave(tabId, { nameOverride: name });
    },
    [handleSave]
  );

  const handleSaveAll = useCallback(() => {
    tabsRef.current.filter((t) => t.isDirty).forEach((t) => void handleSave(t.id));
  }, [handleSave]);

  const handleNewTab = useCallback(() => {
    untitledCounter += 1;
    openTab(null, `Untitled-${untitledCounter}`, '', null);
  }, [openTab]);

  const handleCloseTab = useCallback((tabId: string) => {
    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (tab?.isDirty && !confirm(`"${tab.fileName}" has unsaved changes. Close anyway?`)) return;
    const next = tabsRef.current.filter((t) => t.id !== tabId);
    setTabs(next);
    setActiveTabId((current) => (current === tabId ? (next.length > 0 ? next[next.length - 1].id : null) : current));
    contentRef.current.delete(tabId);
    originalContentRef.current.delete(tabId);
  }, []);

  const handleCloseAllTabs = useCallback(() => {
    const dirty = tabsRef.current.filter((t) => t.isDirty);
    if (dirty.length > 0 && !confirm(`${dirty.length} file${dirty.length === 1 ? '' : 's'} have unsaved changes. Close all anyway?`)) return;
    tabsRef.current.forEach((t) => {
      contentRef.current.delete(t.id);
      originalContentRef.current.delete(t.id);
    });
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const handleRevertFile = useCallback(async (tabId: string) => {
    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (!tab?.fileId) return;
    if (!confirm(`Discard changes to "${tab.fileName}" and reload the saved version?`)) return;
    const fresh = await FileService.getFile(tab.fileId);
    if (!fresh) return;
    const content = fresh.content ?? '';
    contentRef.current.set(tabId, content);
    originalContentRef.current.set(tabId, content);
    // Force the Monaco model to pick up the reverted content: a new model
    // per path is only created once, so simplest correct option is closing
    // and reopening the same tab id via a fresh model isn't available here —
    // instead push the value straight into the live editor model if this is
    // the active tab.
    if (activeTabId === tabId && editorInstanceRef.current) {
      editorInstanceRef.current.setValue(content);
    }
    markDirty(tabId, false);
  }, [activeTabId, markDirty]);

  const handleSelectOpenFile = useCallback(
    async (file: FileItem) => {
      const full = await FileService.getFile(file.id);
      openTab(file.id, file.name, full?.content ?? '', file.parentId);
    },
    [openTab]
  );

  const handleOpenRecent = useCallback(
    async (entry: { id: string; name: string; folderId: string | null }) => {
      const full = await FileService.getFile(entry.id);
      if (!full) return;
      openTab(entry.id, entry.name, full.content ?? '', entry.folderId);
    },
    [openTab]
  );

  const handleOpenFolder = useCallback(
    (folder: { id: string | null; name: string }) => {
      setEditorPref({ openFolderId: folder.id, openFolderName: folder.name });
    },
    [setEditorPref]
  );

  const handleCloseFolder = useCallback(() => {
    setEditorPref({ openFolderId: null, openFolderName: undefined });
  }, [setEditorPref]);

  const handleActivitySelect = useCallback((panel: ActivityPanel) => {
    setActivePanel((current) => {
      if (current === panel) {
        setSidebarVisible((v) => !v);
        return current;
      }
      setSidebarVisible(true);
      return panel;
    });
  }, []);

  // A file/folder was created, renamed, deleted, or moved from inside the
  // Explorer tree. Resync the platform's shared file list for the folder
  // that actually changed — not just root — so other apps reading it (File
  // Explorer, Desktop) see the change even if it happened in a nested
  // folder; and, on rename, keep any open tab's title in sync with the file
  // it actually points at.
  const handleExplorerMutated = useCallback(
    (kind: 'create' | 'rename' | 'delete' | 'move', item: FileItemResponse) => {
      void syncFilesFromBackend(item.parentId);
      if (kind === 'rename') {
        setTabs((prev) => prev.map((t) => (t.fileId === item.id ? { ...t, fileName: item.name, language: languageForFileName(item.name) } : t)));
      }
    },
    [syncFilesFromBackend]
  );

  // A workspace-wide Search & Replace touched a saved file's content on the
  // server. If that file happens to be open in a tab, the tab's buffer would
  // otherwise silently diverge from what's actually saved — sync it the same
  // way Revert File does.
  const handleFileContentReplaced = useCallback(
    (fileId: string, newContent: string) => {
      const tab = tabsRef.current.find((t) => t.fileId === fileId);
      if (!tab) return;
      contentRef.current.set(tab.id, newContent);
      originalContentRef.current.set(tab.id, newContent);
      if (activeTabId === tab.id && editorInstanceRef.current) {
        editorInstanceRef.current.setValue(newContent);
      }
      markDirty(tab.id, false);
    },
    [activeTabId, markDirty]
  );

  const getDirtyOpenFileIds = useCallback(() => {
    return new Set(tabsRef.current.filter((t) => t.isDirty && t.fileId).map((t) => t.fileId as string));
  }, []);

  // Jump to a Search result: open (or focus) the file's tab, then reveal and
  // select the matching line once Monaco has swapped to that tab's model —
  // the swap happens in `@monaco-editor/react`'s own effect a frame after
  // the tab state commits, so this waits a couple of frames rather than
  // racing it.
  const handleSearchOpenResult = useCallback(
    async (file: FileItem, lineNumber: number, column: number, length: number) => {
      await handleSelectOpenFile(file);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const ed = editorInstanceRef.current;
          if (!ed) return;
          ed.revealLineInCenter(lineNumber);
          ed.setSelection({ startLineNumber: lineNumber, startColumn: column, endLineNumber: lineNumber, endColumn: column + length });
          ed.focus();
        });
      });
    },
    [handleSelectOpenFile]
  );

  const cycleTab = useCallback((direction: 1 | -1) => {
    const list = tabsRef.current;
    if (list.length < 2) return;
    const idx = list.findIndex((t) => t.id === activeTabId);
    const next = list[(idx + direction + list.length) % list.length];
    setActiveTabId(next.id);
  }, [activeTabId]);

  // Debounced autosave for files already linked to storage — matches Word Book's precedent elsewhere in this platform.
  useEffect(() => {
    if (!autoSaveEnabled || !activeTab?.isDirty || !activeTab.fileId) return;
    const timer = setTimeout(() => void handleSave(activeTab.id), 4000);
    return () => clearTimeout(timer);
  }, [autoSaveEnabled, activeTab, handleSave]);

  // Status bar's problem counts — Monaco's marker service tracks diagnostics
  // for every open model (every open tab), which is the real, current set of
  // problems this editor actually knows about, not a placeholder count.
  useEffect(() => {
    const updateMarkerCounts = () => {
      const markers = monaco.editor.getModelMarkers({});
      let errors = 0;
      let warnings = 0;
      for (const m of markers) {
        if (m.severity === monaco.MarkerSeverity.Error) errors++;
        else if (m.severity === monaco.MarkerSeverity.Warning) warnings++;
      }
      setMarkerCounts({ errors, warnings });
    };
    updateMarkerCounts();
    const disposable = monaco.editor.onDidChangeMarkers(updateMarkerCounts);
    return () => disposable.dispose();
  }, []);

  // Shortcuts Monaco itself doesn't already own (it handles its own Ctrl+F/Z/Y internally while focused).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        if (!activeTabId) return;
        if (event.shiftKey) handleSaveAs(activeTabId);
        else void handleSave(activeTabId);
      } else if (key === 'n') {
        event.preventDefault();
        handleNewTab();
      } else if (key === 'o') {
        event.preventDefault();
        setIsOpenModalOpen(true);
      } else if (key === 'w') {
        event.preventDefault();
        if (activeTabId) handleCloseTab(activeTabId);
      } else if (key === 'tab') {
        event.preventDefault();
        cycleTab(event.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTabId, handleSave, handleSaveAs, handleNewTab, handleCloseTab, cycleTab]);

  // Running an action via `.run()`/`.trigger()` alone leaves DOM focus on
  // whatever was last focused (the menu button, after it closes) — the
  // action itself still applies correctly, but the next keystroke has
  // nowhere to land until focus is explicitly handed back to the editor,
  // the same way a real VS Code menu click does.
  const runEditorAction = (actionId: string) => () => {
    const ed = editorInstanceRef.current;
    void ed?.getAction(actionId)?.run();
    ed?.focus();
  };
  const runEditorCommand = (commandId: string) => () => {
    const ed = editorInstanceRef.current;
    ed?.trigger('menu', commandId, null);
    ed?.focus();
  };

  useAppMenu('editor', [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new', label: 'New Text File', shortcut: 'Ctrl+N', onSelect: handleNewTab },
        { id: 'open', label: 'Open File…', shortcut: 'Ctrl+O', onSelect: () => setIsOpenModalOpen(true) },
        { id: 'open-folder', label: 'Open Folder…', onSelect: () => setIsOpenFolderModalOpen(true) },
        recentFiles.length > 0
          ? {
              kind: 'submenu' as const,
              id: 'open-recent',
              label: 'Open Recent',
              items: recentFiles.map((f) => ({ id: `recent-${f.id}`, label: f.name, onSelect: () => void handleOpenRecent(f) })),
            }
          : { id: 'open-recent', label: 'Open Recent', disabled: true, onSelect: () => {} },
        separator(),
        { id: 'save', label: 'Save', shortcut: 'Ctrl+S', disabled: !activeTabId, onSelect: () => activeTabId && void handleSave(activeTabId) },
        {
          id: 'save-as',
          label: 'Save As…',
          shortcut: 'Ctrl+Shift+S',
          disabled: !activeTabId,
          onSelect: () => activeTabId && handleSaveAs(activeTabId),
        },
        { id: 'save-all', label: 'Save All', disabled: !tabs.some((t) => t.isDirty), onSelect: handleSaveAll },
        { id: 'revert', label: 'Revert File', disabled: !activeTab?.fileId, onSelect: () => activeTabId && void handleRevertFile(activeTabId) },
        separator(),
        { id: 'auto-save', label: 'Auto Save', checked: autoSaveEnabled, onSelect: () => setEditorPref({ autoSave: !autoSaveEnabled }) },
        {
          kind: 'submenu',
          id: 'preferences',
          label: 'Preferences',
          items: [
            { id: 'open-settings-file-menu', label: 'Settings', onSelect: () => setIsSettingsOpen(true) },
            {
              kind: 'submenu',
              id: 'color-theme',
              label: 'Color Theme',
              items: (Object.keys(MONACO_THEME_IDS) as EditorThemeName[]).map((name) => ({
                id: `theme-${name}`,
                label: name,
                selected: themeName === name,
                onSelect: () => setEditorPref({ editorTheme: name }),
              })),
            },
          ],
        },
        separator(),
        { id: 'close-editor', label: 'Close Editor', shortcut: 'Ctrl+W', disabled: !activeTabId, onSelect: () => activeTabId && handleCloseTab(activeTabId) },
        { id: 'close-all', label: 'Close All Editors', disabled: tabs.length === 0, onSelect: handleCloseAllTabs },
        { id: 'close-folder', label: 'Close Folder', disabled: !openFolder, onSelect: handleCloseFolder },
        { id: 'close-window', label: 'Close Window', onSelect: () => handleCloseWindow('editor') },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', onSelect: runEditorCommand('undo') },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', onSelect: runEditorCommand('redo') },
        separator(),
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', onSelect: runEditorAction('editor.action.clipboardCutAction') },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', onSelect: runEditorAction('editor.action.clipboardCopyAction') },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', onSelect: runEditorAction('editor.action.clipboardPasteAction') },
        separator(),
        { id: 'find', label: 'Find', shortcut: 'Ctrl+F', onSelect: () => editorInstanceRef.current?.getAction('actions.find')?.run() },
        { id: 'replace', label: 'Replace', shortcut: 'Ctrl+H', onSelect: runEditorAction('editor.action.startFindReplaceAction') },
        separator(),
        { id: 'comment-line', label: 'Toggle Line Comment', shortcut: 'Ctrl+/', onSelect: runEditorAction('editor.action.commentLine') },
        { id: 'comment-block', label: 'Toggle Block Comment', shortcut: 'Shift+Alt+A', onSelect: runEditorAction('editor.action.blockComment') },
        separator(),
        { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', onSelect: runEditorAction('editor.action.selectAll') },
        { id: 'format', label: 'Format Document', shortcut: 'Shift+Alt+F', onSelect: () => void formatActiveDocument() },
      ],
    },
    {
      id: 'selection',
      label: 'Selection',
      items: [
        { id: 'sel-all', label: 'Select All', shortcut: 'Ctrl+A', onSelect: runEditorAction('editor.action.selectAll') },
        { id: 'sel-expand', label: 'Expand Selection', shortcut: 'Shift+Alt+Right', onSelect: runEditorAction('editor.action.smartSelect.expand') },
        { id: 'sel-shrink', label: 'Shrink Selection', shortcut: 'Shift+Alt+Left', onSelect: runEditorAction('editor.action.smartSelect.shrink') },
        separator(),
        { id: 'copy-line-up', label: 'Copy Line Up', shortcut: 'Shift+Alt+Up', onSelect: runEditorAction('editor.action.copyLinesUpAction') },
        { id: 'copy-line-down', label: 'Copy Line Down', shortcut: 'Shift+Alt+Down', onSelect: runEditorAction('editor.action.copyLinesDownAction') },
        { id: 'move-line-up', label: 'Move Line Up', shortcut: 'Alt+Up', onSelect: runEditorAction('editor.action.moveLinesUpAction') },
        { id: 'move-line-down', label: 'Move Line Down', shortcut: 'Alt+Down', onSelect: runEditorAction('editor.action.moveLinesDownAction') },
        { id: 'dup-selection', label: 'Duplicate Selection', onSelect: runEditorAction('editor.action.duplicateSelection') },
        separator(),
        { id: 'cursor-above', label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+Up', onSelect: runEditorAction('editor.action.insertCursorAbove') },
        { id: 'cursor-below', label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+Down', onSelect: runEditorAction('editor.action.insertCursorBelow') },
        { id: 'add-next-occurrence', label: 'Add Next Occurrence', shortcut: 'Ctrl+D', onSelect: runEditorAction('editor.action.addSelectionToNextFindMatch') },
        { id: 'select-all-occurrences', label: 'Select All Occurrences', shortcut: 'Ctrl+Shift+L', onSelect: runEditorAction('editor.action.selectHighlights') },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'command-palette', label: 'Command Palette…', shortcut: 'F1', onSelect: runEditorAction('editor.action.quickCommand') },
        separator(),
        { id: 'word-wrap', label: 'Toggle Word Wrap', shortcut: 'Alt+Z', checked: wordWrap, onSelect: () => setEditorPref({ wordWrap: !wordWrap }) },
        { id: 'minimap', label: 'Toggle Minimap', checked: minimapEnabled, onSelect: () => setEditorPref({ minimapEnabled: !minimapEnabled }) },
        {
          id: 'line-numbers',
          label: 'Toggle Line Numbers',
          checked: lineNumbersEnabled,
          onSelect: () => setEditorPref({ lineNumbersEnabled: !lineNumbersEnabled }),
        },
        {
          id: 'render-whitespace',
          label: 'Toggle Render Whitespace',
          checked: renderWhitespace,
          onSelect: () => setEditorPref({ renderWhitespace: !renderWhitespace }),
        },
        { id: 'breadcrumbs', label: 'Toggle Breadcrumbs', checked: breadcrumbsEnabled, onSelect: () => setEditorPref({ breadcrumbsEnabled: !breadcrumbsEnabled }) },
        separator(),
        { id: 'zoom-in', label: 'Zoom In', shortcut: 'Ctrl+=', onSelect: () => setEditorPref({ fontSize: Math.min(32, fontSize + 1) }) },
        { id: 'zoom-out', label: 'Zoom Out', shortcut: 'Ctrl+-', onSelect: () => setEditorPref({ fontSize: Math.max(8, fontSize - 1) }) },
        { id: 'zoom-reset', label: 'Reset Zoom', onSelect: () => setEditorPref({ fontSize: 13 }) },
        separator(),
        { id: 'open-settings', label: 'Settings', onSelect: () => setIsSettingsOpen(true) },
      ],
    },
    {
      id: 'go',
      label: 'Go',
      items: [
        { id: 'goto-line', label: 'Go to Line/Column…', shortcut: 'Ctrl+G', onSelect: runEditorAction('editor.action.gotoLine') },
        { id: 'goto-symbol', label: 'Go to Symbol…', shortcut: 'Ctrl+Shift+O', onSelect: runEditorAction('editor.action.quickOutline') },
        { id: 'goto-bracket', label: 'Go to Bracket', shortcut: 'Ctrl+Shift+\\', onSelect: runEditorAction('editor.action.jumpToBracket') },
        separator(),
        { id: 'next-problem', label: 'Next Problem', shortcut: 'F8', onSelect: runEditorAction('editor.action.marker.next') },
        { id: 'prev-problem', label: 'Previous Problem', shortcut: 'Shift+F8', onSelect: runEditorAction('editor.action.marker.prev') },
        separator(),
        { id: 'next-editor', label: 'Next Editor', shortcut: 'Ctrl+Tab', disabled: tabs.length < 2, onSelect: () => cycleTab(1) },
        { id: 'prev-editor', label: 'Previous Editor', shortcut: 'Ctrl+Shift+Tab', disabled: tabs.length < 2, onSelect: () => cycleTab(-1) },
      ],
    },
    {
      id: 'terminal',
      label: 'Terminal',
      items: [{ id: 'new-terminal', label: 'New Terminal', onSelect: () => openAppWindow('terminal') }],
    },
    // No app-defined Help menu: every window already gets a real one from
    // the platform (Keyboard Shortcuts, "{app} Help", About), appended
    // automatically after these — see AppWindow.tsx's buildStandardMenus.
    // A second "Help" here would collide with it (same id) and its "Show
    // All Commands" would just duplicate View's Command Palette item above.
  ]);

  return (
    <>
      <AppShell className="bg-[#1e1e1e] text-white">
        <div id="editor-workbench" className="flex-1 min-h-0 flex">
          <ActivityBar
            active={sidebarVisible ? activePanel : null}
            onSelect={handleActivitySelect}
            settingsActive={isSettingsOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          {sidebarVisible && activePanel === 'explorer' && (
            <SidebarPanel id="editor-sidebar-explorer" title="EXPLORER">
              {openFolder ? (
                <ExplorerSidebar
                  rootId={openFolder.id}
                  rootName={openFolder.name}
                  activeFileId={activeTab?.fileId ?? null}
                  onOpenFile={(f) => void handleSelectOpenFile(f)}
                  onCloseFolder={handleCloseFolder}
                  onMutated={handleExplorerMutated}
                  onRootRenamed={(newName) => setEditorPref({ openFolderName: newName })}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 text-center">
                  <FolderOpen className="w-6 h-6 text-white/20" />
                  <p className="text-[12px] text-white/40">You have not yet opened a folder.</p>
                  <button
                    onClick={() => setIsOpenFolderModalOpen(true)}
                    className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[12px] font-medium rounded cursor-pointer"
                  >
                    Open Folder
                  </button>
                </div>
              )}
            </SidebarPanel>
          )}
          {sidebarVisible && activePanel === 'search' && (
            <SidebarPanel id="editor-sidebar-search" title="SEARCH">
              <SearchPanel
                rootId={openFolder?.id ?? null}
                rootName={openFolder?.name ?? 'Home'}
                getDirtyOpenFileIds={getDirtyOpenFileIds}
                onOpenResult={(f, line, col, len) => void handleSearchOpenResult(f, line, col, len)}
                onFileContentReplaced={handleFileContentReplaced}
              />
            </SidebarPanel>
          )}
          <div id="editor-group" className="flex-1 min-h-0 min-w-0 flex flex-col">
            <EditorTabBar
              tabs={
                isSettingsOpen
                  ? [...tabs.map((t) => ({ id: t.id, fileName: t.fileName, isDirty: t.isDirty })), { id: SETTINGS_TAB_ID, fileName: 'Settings', isDirty: false }]
                  : tabs.map((t) => ({ id: t.id, fileName: t.fileName, isDirty: t.isDirty }))
              }
              activeTabId={isSettingsOpen ? SETTINGS_TAB_ID : activeTabId}
              onSelect={(id) => {
                if (id === SETTINGS_TAB_ID) return;
                setIsSettingsOpen(false);
                setActiveTabId(id);
              }}
              onClose={(id) => {
                if (id === SETTINGS_TAB_ID) setIsSettingsOpen(false);
                else handleCloseTab(id);
              }}
              onNew={handleNewTab}
            />
            {!isSettingsOpen && activeTab && breadcrumbsEnabled && (
              <Breadcrumb
                fileName={activeTab.fileName}
                isDirty={activeTab.isDirty}
                parentFolderName={activeParentFolderName}
                onContextMenu={(e) =>
                  openContextMenu(e, [{ label: 'Hide Breadcrumbs', onClick: () => setEditorPref({ breadcrumbsEnabled: false }) }])
                }
              />
            )}
            <div id="editor-content-area" className="flex-1 min-h-0 min-w-0">
              {isSettingsOpen ? (
                <SettingsEditor
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  tabSizeLabel={tabSizeLabel}
                  wordWrap={wordWrap}
                  minimapEnabled={minimapEnabled}
                  lineNumbersEnabled={lineNumbersEnabled}
                  renderWhitespace={renderWhitespace}
                  breadcrumbsEnabled={breadcrumbsEnabled}
                  autoSaveEnabled={autoSaveEnabled}
                  themeName={themeName}
                  formatOnSave={formatOnSave}
                  prettierEnabled={prettierEnabled}
                  prettierSemi={prettierSemi}
                  prettierSingleQuote={prettierSingleQuote}
                  prettierTrailingComma={prettierTrailingComma}
                  prettierPrintWidth={prettierPrintWidth}
                  eslintEnabled={eslintEnabled}
                  onChange={setEditorPref}
                />
              ) : (
                activeTab && (
                  <MonacoPane
                    tabId={activeTab.id}
                    language={activeTab.language}
                    defaultValue={contentRef.current.get(activeTab.id) ?? ''}
                    theme={monacoTheme}
                    wordWrap={wordWrap}
                    tabSize={tabSize}
                    insertSpaces={insertSpaces}
                    minimapEnabled={minimapEnabled}
                    lineNumbersEnabled={lineNumbersEnabled}
                    renderWhitespace={renderWhitespace}
                    fontSize={fontSize}
                    fontFamily={fontFamily}
                    onChange={(value) => handleChange(activeTab.id, value)}
                    onEditorMount={(ed) => {
                      editorInstanceRef.current = ed;
                      // The shared editor unmounts while Settings is open
                      // (this pane isn't rendered at all then) and remounts
                      // fresh on return — the model itself persists (Monaco
                      // keeps models independent of the view), but nothing
                      // else re-triggers a lint pass on a plain remount, so
                      // it's run explicitly here on every mount.
                      ed.onDidDispose(() => {
                        if (editorInstanceRef.current === ed) editorInstanceRef.current = null;
                      });
                      lintActiveModelRef.current();
                      const pos = ed.getPosition();
                      if (pos) setCursorPosition({ lineNumber: pos.lineNumber, column: pos.column });
                      ed.onDidChangeCursorPosition((e) => setCursorPosition({ lineNumber: e.position.lineNumber, column: e.position.column }));
                      // Overrides Monaco's built-in Shift+Alt+F binding so the
                      // native shortcut (and the right-click "Format Document"
                      // entry Monaco shows once an action owns this id/keybinding)
                      // routes through Prettier the same way the Edit menu's
                      // "Format Document" item does — one behavior, not two.
                      ed.addAction({
                        id: 'app.formatDocument',
                        label: 'Format Document',
                        keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
                        run: () => void formatActiveDocumentRef.current(),
                      });
                    }}
                  />
                )
              )}
            </div>
          </div>
        </div>
        <StatusBar
          language={activeTab?.language ?? 'plaintext'}
          cursorLine={cursorPosition.lineNumber}
          cursorColumn={cursorPosition.column}
          tabSizeLabel={tabSizeLabel}
          errorCount={markerCounts.errors}
          warningCount={markerCounts.warnings}
        />
      </AppShell>
      <OpenFileModal isOpen={isOpenModalOpen} onClose={() => setIsOpenModalOpen(false)} allFiles={files} onSelectFile={(f) => void handleSelectOpenFile(f)} />
      <OpenFolderModal isOpen={isOpenFolderModalOpen} onClose={() => setIsOpenFolderModalOpen(false)} onOpenFolder={handleOpenFolder} />
    </>
  );
}
