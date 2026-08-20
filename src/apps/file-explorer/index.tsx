import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import {
  Folder,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Plus,
  Trash2,
  FolderPlus,
  Search,
  Grid,
  List,
  Copy,
  Scissors,
  Clipboard,
  Edit3,
  Info,
  ChevronRight,
  HardDrive,
  RefreshCw,
  X,
  Image as ImageIcon,
  FileText,
  FileCode,
  Check,
  Upload,
  FileUp,
  Home,
  Clock,
  Star,
  Download,
  Video,
  Music,
  Pin,
  PinOff,
  User,
  Users,
  Share2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Filter,
  CheckSquare,
  Square,
  FileArchive,
  Layers,
  FolderUp,
  ChevronDown,
  MoreHorizontal,
  FolderX,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { FileItem } from '../../platform/types';
import { useSystemStore } from '../../shell/state/systemStore';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import { useContextMenuStore, ContextMenuItem } from '../../shell/context-menu/contextMenuStore';
import { StorageService } from '../../platform/storage/StorageService';
import { FileService } from '../../platform/files/FileService';
import { getAppForFile } from '../../platform/registry/EditorRegistry';
import WindowStatus from '../../shell/window-manager/WindowStatusContext';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';

import ShareModal from './components/ShareModal';
import MoveModal from './components/MoveModal';
import FilePreviewModal from './components/FilePreviewModal';
import PropertiesModal from './components/PropertiesModal';
import OpenWithModal from './components/OpenWithModal';

/**
 * Marks a drag as an internal File Explorer item drag rather than an OS/browser
 * file drag. Set on every `dragstart` here and checked via `dataTransfer.types`
 * (readable during `dragover`, unlike `getData`) so the canvas can tell the two
 * apart before a drop even happens — including drags that started in a
 * different File Explorer window, since `dataTransfer` is native to the
 * browser drag gesture and isn't scoped to any one component instance.
 */
const INTERNAL_DRAG_TYPE = 'application/x-drive-osx-file-item';

/**
 * Sidebar destinations that aren't real backend folders — Trash, Recent,
 * Starred, and each "Shared with me" entry are all client-side views derived
 * by filtering the already-synced `files` array. `syncFilesFromBackend`
 * expects an actual folder id (or null for root); passing one of these
 * through to `GET /files/children/:id` gets rejected as an invalid folder id
 * and only produces a spurious error toast, never any usable data.
 */
const VIRTUAL_FOLDER_IDS = new Set(['trash', 'recent', 'starred', 'shared-with-me']);

function dragHasType(e: React.DragEvent, type: string): boolean {
  return Array.from(e.dataTransfer.types || []).includes(type);
}

export default function FileManager() {
  // Central store integration
  const files = useSystemStore((state) => state.files);
  const setFiles = useSystemStore((state) => state.setFiles);
  const syncFilesFromBackend = useSystemStore((state) => state.syncFilesFromBackend);
  const syncTrashFromBackend = useSystemStore((state) => state.syncTrashFromBackend);
  const deletedFiles = useSystemStore((state) => state.deletedFiles || []);
  const handleDeleteFile = useSystemStore((state) => state.handleDeleteFile);
  const handleRestoreFile = useSystemStore((state) => state.handleRestoreFile);
  const handleEmptyTrash = useSystemStore((state) => state.handleEmptyTrash);
  const openTextFileInEditor = useSystemStore((state) => state.openTextFileInEditor);
  const toggleWindow = useSystemStore((state) => state.toggleWindow);
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const currentUser = useSystemStore((state) => state.currentUser);
  const urlFolderId = useSystemStore((state) => state.fileManagerCurrentFolderId);
  const setUrlFolderId = useSystemStore((state) => state.setFileManagerCurrentFolderId);

  const activeTheme = useAppTheme('fileManager').chromeTheme;

  const fmPrefs = settings.appPreferences?.fileManager;
  const prefView = fmPrefs?.defaultView?.toLowerCase() === 'list' ? 'list' : 'grid';

  // State Management
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'documents' | 'images' | 'audio' | 'video' | 'code' | 'archives'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(prefView);

  const DEFAULT_FOLDER_NAMES = ['Documents', 'Downloads', 'Projects', 'Pictures', 'Videos', 'Music'];
  const [defaultFolderIdMap, setDefaultFolderIdMap] = useState<Record<string, string>>({});

  // Modals state
  const [activeShareItem, setActiveShareItem] = useState<FileItem | null>(null);
  const [activeMoveItem, setActiveMoveItem] = useState<FileItem | null>(null);
  const [activePreviewItem, setActivePreviewItem] = useState<FileItem | null>(null);
  const [activePropertiesItem, setActivePropertiesItem] = useState<FileItem | null>(null);
  const [activeOpenWithItem, setActiveOpenWithItem] = useState<FileItem | null>(null);

  // Details pane
  const [showDetailsPane, setShowDetailsPane] = useState<boolean>(false);

  // Upload progress, shown in the window's status bar while a batch (from
  // uploadFiles or uploadFolderFiles) is in flight.
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    completed: number;
    currentFileName: string;
    currentPercent: number;
  } | null>(null);
  const uploadOverallPercent = uploadProgress
    ? Math.min(100, Math.round(((uploadProgress.completed + uploadProgress.currentPercent / 100) / uploadProgress.total) * 100))
    : 0;

  // Drag and drop state
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  // Which folder tile an internal drag is currently hovering, so it can show
  // itself as the drop target the way a desktop file manager does.
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (fmPrefs?.defaultView) {
      setViewMode(fmPrefs.defaultView.toLowerCase() === 'list' ? 'list' : 'grid');
    }
  }, [fmPrefs?.defaultView]);

  // Fetches the CURRENT folder's own direct children on every navigation,
  // not just once at mount. `files` used to be filled exclusively by a
  // one-time root-only fetch here, so anything nested — created, renamed, or
  // moved from another app entirely (e.g. Code Editor's own Explorer tree)
  // — was invisible unless this component happened to have optimistically
  // spliced it in itself. `syncFilesFromBackend` fetches whichever folder id
  // it's given and merges the result into the shared `files` array without
  // discarding what's cached for every other folder, so this stays correct
  // no matter which app last touched the tree.
  useEffect(() => {
    if (!currentUser) return;
    if (currentFolderId && VIRTUAL_FOLDER_IDS.has(currentFolderId)) return;
    void syncFilesFromBackend(currentFolderId);
  }, [currentUser, currentFolderId, syncFilesFromBackend]);

  // --- URL sync (/folder and /folder/:folderId) --------------------------
  //
  // `App.tsx` reflects whichever folder this component is showing in the
  // browser URL, and seeds `fileManagerCurrentFolderId` from the URL on a
  // direct load or a Back/Forward navigation. The two effects below keep
  // `currentFolderId` (this component's own state, driving everything else
  // in the file — history, breadcrumbs, uploads, etc.) and that shared store
  // field in sync in both directions, without echoing a change either side
  // just made back at the other. `lastSyncedFolderIdRef` is what makes that
  // possible: it's the folder id both sides last agreed on, so each effect
  // only acts on a value it hasn't already seen.
  const lastSyncedFolderIdRef = useRef<string | null>(null);
  const [folderNotFoundId, setFolderNotFoundId] = useState<string | null>(null);

  // This component's own navigation (clicking a folder, breadcrumbs, the
  // in-app Back/Forward buttons) → tell the shell so it can update the URL.
  useEffect(() => {
    if (currentFolderId === lastSyncedFolderIdRef.current) return;
    lastSyncedFolderIdRef.current = currentFolderId;
    setUrlFolderId(currentFolderId);
  }, [currentFolderId, setUrlFolderId]);

  // A URL the shell didn't get from us — a direct link, a reload, or the
  // browser's actual Back/Forward buttons — → adopt that folder here. Real
  // (non-virtual) ids are verified against the backend first, so a bad id in
  // the URL lands on a clear "not found" state instead of silently opening
  // the wrong folder or an empty grid.
  useEffect(() => {
    if (urlFolderId === lastSyncedFolderIdRef.current) return;

    // The ref is only updated once we've actually committed to a folder
    // (below), not here at the top. Marking it "handled" before the async
    // check below resolves would mean StrictMode's dev-mode double-invoke —
    // which runs this effect's cleanup, cancelling the in-flight check,
    // before immediately running the effect again — leaves the ref already
    // matching `urlFolderId` on that second pass, so it short-circuits and
    // the folder never actually gets adopted. Every exit path below sets the
    // ref itself, right where it stops being redone.
    if (urlFolderId === null || VIRTUAL_FOLDER_IDS.has(urlFolderId)) {
      lastSyncedFolderIdRef.current = urlFolderId;
      setFolderNotFoundId(null);
      navigateToFolder(urlFolderId);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const file = await FileService.getFile(urlFolderId);
        if (cancelled) return;
        if (!file || file.type !== 'folder') {
          lastSyncedFolderIdRef.current = urlFolderId;
          setFolderNotFoundId(urlFolderId);
          return;
        }
        lastSyncedFolderIdRef.current = urlFolderId;
        setFolderNotFoundId(null);
        navigateToFolder(urlFolderId);
      } catch {
        if (!cancelled) {
          lastSyncedFolderIdRef.current = urlFolderId;
          setFolderNotFoundId(urlFolderId);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFolderId]);

  // Derived from `files` itself (rather than a one-off local variable) so it
  // stays correct as the shared file list changes, not just at mount.
  //
  // This used to also prune `pinnedFolderIds` down to whatever's currently in
  // `files` — but `files` is only ever a partial cache of the folders this
  // session has actually browsed into (see mergeFolderChildren above), never
  // the full tree. A pinned folder the user hasn't happened to navigate into
  // yet would get silently unpinned the moment any unrelated folder synced,
  // then reappear on refresh once loadPinned() re-fetched the real list from
  // the backend — which is already authoritative (files.repository.ts's
  // listPinned() filters out deleted/inaccessible folders server-side), so
  // there was never a need to re-validate it against this local cache.
  useEffect(() => {
    const folderMap: Record<string, string> = {};
    files.forEach((f) => {
      if (f.type === 'folder' && f.parentId === null && DEFAULT_FOLDER_NAMES.includes(f.name)) {
        folderMap[f.name.toLowerCase()] = f.id;
      }
    });
    setDefaultFolderIdMap(folderMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Pinned sidebar folders state
  const [pinnedFolderIds, setPinnedFolderIds] = useState<string[]>([]);

  // "Shared with me" virtual folder — items other people have shared with the
  // current user, loaded on demand since it isn't part of the user's own tree.
  const [sharedWithMeItems, setSharedWithMeItems] = useState<FileItem[]>([]);
  const [sharedWithMeLoading, setSharedWithMeLoading] = useState(false);
  const [sharedWithMeError, setSharedWithMeError] = useState<string | null>(null);

  const loadSharedWithMe = async (signal: { cancelled: boolean }) => {
    setSharedWithMeLoading(true);
    setSharedWithMeError(null);
    try {
      const items = await FileService.listSharedWithMe();
      if (signal.cancelled) return;
      setSharedWithMeItems(
        items.map((f: any) => ({
          id: f._id ?? f.id,
          name: f.name,
          type: f.type,
          content: f.content || '',
          parentId: 'shared-with-me',
          createdAt: f.createdAt,
          size: f.size,
          starred: f.starred || false,
          category: f.mimeType?.split('/')[0] as any,
          originalParentId: f.parentId,
          isShared: f.isShared || false,
          sharedRole: f.sharedRole,
        })),
      );
    } catch (error) {
      if (!signal.cancelled) {
        const message = error instanceof Error ? error.message : 'Please try again.';
        setSharedWithMeError(`Could not load items shared with you. ${message}`);
      }
    } finally {
      if (!signal.cancelled) setSharedWithMeLoading(false);
    }
  };

  useEffect(() => {
    if (currentFolderId !== 'shared-with-me' || !currentUser) return;
    const signal = { cancelled: false };
    void loadSharedWithMe(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [currentFolderId, currentUser]);

  /**
   * Trash and "Shared with me" are backed by their own endpoints, not
   * `/files/children/:id` — routing every virtual folder through
   * `syncFilesFromBackend` the way a real folder id does makes the request
   * 400 ("Invalid folder id") and silently fails, which is what the refresh
   * button and the canvas's "Refresh" context-menu item were both doing.
   */
  const handleRefresh = () => {
    setSearchQuery('');
    setSelectedFileIds([]);
    if (currentFolderId === 'trash') {
      void syncTrashFromBackend();
    } else if (currentFolderId === 'shared-with-me') {
      void loadSharedWithMe({ cancelled: false });
    } else if (!currentFolderId || !VIRTUAL_FOLDER_IDS.has(currentFolderId)) {
      void syncFilesFromBackend(currentFolderId);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const loadPinned = async () => {
      try {
        const pinned = await FileService.listPinned();
        if (cancelled) return;
        const ids = pinned.map((f: any) => f._id || f.id).filter(Boolean);
        setPinnedFolderIds(ids);
      } catch (error) {
        console.warn('Failed to load pinned folders from backend:', error);
      }
    };
    loadPinned();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const togglePinSidebarFolder = async (folderId: string) => {
    try {
      const result = await FileService.togglePin(folderId);
      if (result && result._id) {
        setPinnedFolderIds((prev) => {
          const isPinned = prev.includes(folderId);
          if (isPinned) {
            return prev.filter((id) => id !== folderId);
          }
          return [...prev, folderId];
        });
      }
    } catch (error) {
      console.warn('Failed to toggle pin on backend:', error);
    }
  };

  // Custom navigation history
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Sorting
  const [sortField, setSortField] = useState<'name' | 'type' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Address Bar path editing
  const [isPathEditing, setIsPathEditing] = useState<boolean>(false);
  const [pathInputText, setPathInputText] = useState<string>('');

  // Clipboard operations (Cut / Copy / Paste)
  const [clipboard, setClipboard] = useState<{ id: string; action: 'copy' | 'cut' } | null>(null);

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState<string>('');

  // Refs
  const renameInputRef = useRef<HTMLInputElement>(null);
  const pathInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const explorerAreaRef = useRef<HTMLDivElement>(null);
  const leftToolbarRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [explorerWidth, setExplorerWidth] = useState<number>(600);
  const [leftToolbarWidth, setLeftToolbarWidth] = useState<number>(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!explorerAreaRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setExplorerWidth(entry.contentRect.width);
      }
    });
    observer.observe(explorerAreaRef.current);
    return () => observer.disconnect();
  }, []);

  // Tracks the actual space available to the left action-button group (New
  // Folder / Cut / Copy / Paste / Rename / Delete / …) — not the whole
  // window, since that also has to share the row with the search box and the
  // right-hand filter/view controls. Flexbox reports this directly once the
  // group is a `min-w-0 flex-1` sibling instead of something that wraps.
  useEffect(() => {
    if (!leftToolbarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setLeftToolbarWidth(entry.contentRect.width);
      }
    });
    observer.observe(leftToolbarRef.current);
    return () => observer.disconnect();
  }, []);

  const isCompactSidebar = containerWidth < 480;
  const isCompactRibbon = containerWidth < 640;

  useEffect(() => {
    if (containerWidth < 600) {
      setShowDetailsPane(false);
    }
  }, [containerWidth]);

  // Selected item entities
  const isTrashFolder = currentFolderId === 'trash';
  const displaySource = isTrashFolder ? deletedFiles : files;
  const selectedItem = displaySource.find((f) => f.id === selectedFileIds[0]) || null;

  // Auto-focus renaming input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Keyboard navigation shortcuts (Ctrl+A, Del, F2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (renamingId || isPathEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedFileIds(sortedItems.map((f) => f.id));
      } else if (e.key === 'Delete' && selectedFileIds.length > 0) {
        if (isTrashFolder) {
          if (confirm(`Permanently erase selected ${selectedFileIds.length} item(s)?`)) {
            selectedFileIds.forEach((id) => {
              const item = deletedFiles.find((f) => f.id === id);
              if (item) {
                // Remove permanently
                const updatedTrash = deletedFiles.filter((f) => f.id !== id);
                StorageService.set('webos-trash', updatedTrash);
                useSystemStore.setState({ deletedFiles: updatedTrash });
              }
            });
            setSelectedFileIds([]);
          }
        } else {
          if (confirm(`Move selected ${selectedFileIds.length} item(s) to Recycle Bin?`)) {
            selectedFileIds.forEach((id) => {
              const item = files.find((f) => f.id === id);
              if (item) handleDeleteFile(item);
            });
            setSelectedFileIds([]);
          }
        }
      } else if (e.key === 'F2' && selectedItem) {
        handleStartRename(selectedItem);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFileIds, renamingId, isPathEditing, files, deletedFiles, isTrashFolder]);

  // Navigate to folder and record history
  const navigateToFolder = (folderId: string | null) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, folderId]);
    setHistoryIndex(newHistory.length);
    setCurrentFolderId(folderId);
    setSelectedFileIds([]);
    setIsPathEditing(false);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setCurrentFolderId(history[nextIndex]);
      setSelectedFileIds([]);
      setIsPathEditing(false);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentFolderId(history[nextIndex]);
      setSelectedFileIds([]);
      setIsPathEditing(false);
    }
  };

  const handleGoUp = () => {
    if (currentFolderId === null || currentFolderId === 'trash') {
      navigateToFolder(null);
      return;
    }
    const currentFolder = files.find((f) => f.id === currentFolderId);
    if (currentFolder) {
      navigateToFolder(currentFolder.parentId);
    } else {
      navigateToFolder(null);
    }
  };

  // Address Bar path submit
  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPathEditing(false);

    const cleanInput = pathInputText.trim().toLowerCase();
    if (!cleanInput || cleanInput === 'this pc' || cleanInput === '/' || cleanInput === 'my drive' || cleanInput === 'drive') {
      navigateToFolder(null);
      return;
    }

    if (cleanInput.includes('trash') || cleanInput.includes('recycle')) {
      navigateToFolder('trash');
      return;
    }

    const pathPart = cleanInput.startsWith('/') ? cleanInput.substring(1) : cleanInput;
    const parts = pathPart.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];

    if (!lastPart) {
      navigateToFolder(null);
      return;
    }

    const matchedFolder = files.find(
      (f) => f.type === 'folder' && f.name.toLowerCase() === lastPart
    );
    if (matchedFolder) {
      navigateToFolder(matchedFolder.id);
    } else {
      alert(`Could not find path: "${pathInputText}"`);
    }
  };

  const startPathEditing = () => {
    setIsPathEditing(true);
    setPathInputText(getCurrentFolderPathString());
    setTimeout(() => {
      pathInputRef.current?.focus();
      pathInputRef.current?.select();
    }, 50);
  };

  const getFolderLabel = (folderId: string): string => {
    const map: Record<string, string> = {
      'recent': 'Recent',
      'starred': 'Starred',
      'trash': 'Trash / Recycle Bin',
      'shared-with-me': 'Shared with me',
    };
    return map[folderId] || 'Folder';
  };

  const getFolderIcon = (folderId: string, name: string) => {
    const lower = (folderId + ' ' + name).toLowerCase();
    if (lower.includes('trash') || lower.includes('recycle')) return Trash2;
    if (lower.includes('document')) return FileText;
    if (lower.includes('download')) return Download;
    if (lower.includes('project')) return Folder;
    if (lower.includes('picture') || lower.includes('photo') || lower.includes('image')) return ImageIcon;
    if (lower.includes('video') || lower.includes('movie')) return Video;
    if (lower.includes('music') || lower.includes('audio') || lower.includes('song')) return Music;
    return Folder;
  };

  const getCurrentFolderPathString = () => {
    if (!currentFolderId) return '/';
    const specialLabels: Record<string, string> = {
      recent: 'Recent',
      starred: 'Starred',
      trash: 'Trash Bin',
      'shared-with-me': 'Shared with me',
    };
    if (specialLabels[currentFolderId]) {
      return `/${specialLabels[currentFolderId]}`;
    }
    const pathSegments: string[] = [];
    let current = files.find((f) => f.id === currentFolderId);
    while (current) {
      pathSegments.unshift(current.name);
      current = files.find((f) => f.id === current.parentId);
    }
    return pathSegments.length > 0 ? `/${pathSegments.join('/')}` : `/${getFolderLabel(currentFolderId)}`;
  };

  const getBreadcrumbs = () => {
    const breadcrumbs: { name: string; id: string | null }[] = [{ name: '/', id: null }];
    if (!currentFolderId) return breadcrumbs;

    const specialLabels: Record<string, string> = {
      recent: 'Recent',
      starred: 'Starred',
      trash: 'Trash Bin',
      'shared-with-me': 'Shared with me',
    };
    if (specialLabels[currentFolderId]) {
      return [...breadcrumbs, { name: specialLabels[currentFolderId], id: currentFolderId }];
    }

    const segments: { name: string; id: string }[] = [];
    let current = files.find((f) => f.id === currentFolderId);
    while (current) {
      segments.unshift({ name: current.name, id: current.id });
      current = files.find((f) => f.id === current.parentId);
    }
    return [...breadcrumbs, ...segments];
  };

  // Render Vector Icon for items
  const renderFileIcon = (item: FileItem, size: 'large' | 'small' | 'xl' = 'large') => {
    const lower = item.name.toLowerCase();
    const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp');
    const isCode = lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.py') || lower.endsWith('.html') || lower.endsWith('.css');
    const isAudio = lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg');
    const isVideo = lower.endsWith('.mp4') || lower.endsWith('.webm');
    
    const dim = size === 'xl' ? 'w-16 h-16' : size === 'large' ? 'w-10 h-10' : 'w-4 h-4';
    const rounded = size === 'xl' ? 'rounded-xl' : size === 'large' ? 'rounded-lg' : 'rounded';

    if (isImage && item.content && (item.content.startsWith('data:image/') || item.content.startsWith('http'))) {
      return (
        <img
          src={item.content}
          alt={item.name}
          className={`${dim} ${rounded} object-cover border border-black/10 shadow-sm`}
          referrerPolicy="no-referrer"
        />
      );
    }

    if (item.type === 'folder') {
      return <Folder className={`${dim} text-amber-500 fill-amber-500/20`} />;
    }

    if (isImage) {
      return <ImageIcon className={`${dim} text-sky-500`} />;
    }

    if (isCode) {
      return <FileCode className={`${dim} text-purple-500`} />;
    }

    if (isAudio) {
      return <Music className={`${dim} text-emerald-500`} />;
    }

    if (isVideo) {
      return <Video className={`${dim} text-indigo-500`} />;
    }

    return <FileText className={`${dim} text-blue-500`} />;
  };

  // Real Local File Download Execution
  const handleDownloadFile = (item: FileItem) => {
    if (item.type === 'folder') {
      alert('Downloading folders as zip is not supported in client preview mode.');
      return;
    }
    const content = item.content || '';
    const isDataUrl = content.startsWith('data:');
    const downloadUrl = isDataUrl
      ? content
      : URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!isDataUrl) URL.revokeObjectURL(downloadUrl);
  };

  // Toggle Star / Favorite
  //
  // Must round-trip through the backend, not just flip local state: this used
  // to only update `files` in memory, so the star was never actually saved.
  // The moment any real folder synced again — e.g. navigating away from
  // Starred to any other folder — `syncFilesFromBackend` merged in that
  // folder's fresh (still-unstarred) data from the server and silently wiped
  // the star back off, which is exactly the "unstars itself when I navigate
  // away" bug this fixes.
  const handleToggleStar = async (item: FileItem) => {
    try {
      const result = await FileService.toggleStar(item.id);
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, starred: result.starred } : f)));
    } catch (error) {
      console.error('Failed to toggle star:', error);
      alert(`Could not update the starred state of "${item.name}". Please try again.`);
    }
  };

  // Upload trigger & execution
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // A data URL for images, text otherwise — used only for the local list's
  // thumbnail/preview. The durable copy lives in object storage on the
  // backend, which never returns inline content for an uploaded file.
  //
  // Both branches are capped: reading a large upload's *entire* contents into
  // a JS string just for a placeholder preview (a 50MB text file becomes a
  // ~100MB UTF-16 string, held in component state for the rest of the
  // session) was enough to crash the tab on large uploads even though the
  // upload itself — a streamed XHR, not buffered as a JS string — succeeded
  // on the server. A truncated text preview mirrors the backend's own
  // contentText cap (files.service.ts slices to 100_000 chars); a large image
  // just skips the inline thumbnail rather than materializing a giant data URL.
  const MAX_TEXT_PREVIEW_BYTES = 100_000;
  const MAX_IMAGE_PREVIEW_BYTES = 5 * 1024 * 1024;
  const readFilePreview = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const isImage = file.type.startsWith('image/');
      if (isImage && file.size > MAX_IMAGE_PREVIEW_BYTES) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) || '');
      reader.onerror = () => resolve('');
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file.slice(0, MAX_TEXT_PREVIEW_BYTES));
      }
    });

  // Snapshot of every name already in use per parent, seeded from current
  // state and grown as this upload reserves names — so two files in the same
  // batch, or a file colliding with something already in the folder, both
  // get an "(1)" suffix instead of silently overwriting on the server.
  const initKnownNames = (): Map<string, Set<string>> => {
    const map = new Map<string, Set<string>>();
    for (const f of files) {
      const key = f.parentId ?? '__root__';
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(f.name);
    }
    return map;
  };

  const reserveName = (knownNames: Map<string, Set<string>>, parentId: string | null, desiredName: string): string => {
    const key = parentId ?? '__root__';
    let used = knownNames.get(key);
    if (!used) {
      used = new Set();
      knownNames.set(key, used);
    }
    let name = desiredName;
    let count = 1;
    while (used.has(name)) {
      const dotIndex = desiredName.lastIndexOf('.');
      name =
        dotIndex !== -1
          ? `${desiredName.substring(0, dotIndex)} (${count++})${desiredName.substring(dotIndex)}`
          : `${desiredName} (${count++})`;
    }
    used.add(name);
    return name;
  };

  /**
   * Uploads each file to the backend and adds the resulting record to local
   * state. Must go through FileService: a file that only lives in local
   * React state disappears the next time this folder (or Recents) re-syncs
   * from the server, which has no record of it — that was the bug here.
   */
  const uploadFiles = async (filesToUpload: File[], parentId: string | null) => {
    const knownNames = initKnownNames();
    setUploadProgress({ total: filesToUpload.length, completed: 0, currentFileName: '', currentPercent: 0 });

    for (const file of filesToUpload) {
      const fileName = reserveName(knownNames, parentId, file.name);
      const uploadFile = fileName === file.name ? file : new File([file], fileName, { type: file.type });
      setUploadProgress((prev) => (prev ? { ...prev, currentFileName: fileName, currentPercent: 0 } : prev));

      try {
        const localPreview = await readFilePreview(uploadFile);
        const created = await FileService.upload(uploadFile, {
          parentId: parentId ?? undefined,
          onProgress: (percent) => setUploadProgress((prev) => (prev ? { ...prev, currentPercent: percent } : prev)),
        });
        const uploadedFile: FileItem = {
          id: created.id || created._id,
          name: created.name,
          type: 'file',
          content: created.content || localPreview,
          parentId: created.parentId,
          createdAt: created.createdAt,
          size: created.size,
        };
        setFiles((prev) => [...prev, uploadedFile]);
      } catch (error) {
        console.error(`Failed to upload "${fileName}":`, error);
        alert(`Failed to upload "${fileName}". Please try again.`);
      } finally {
        setUploadProgress((prev) => (prev ? { ...prev, completed: prev.completed + 1 } : prev));
      }
    }

    setUploadProgress(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesSelected = e.target.files;
    if (!filesSelected || filesSelected.length === 0) return;
    const selected = Array.from(filesSelected);
    e.target.value = '';
    void uploadFiles(selected, isTrashFolder ? null : currentFolderId);
  };

  const handleUploadFolderClick = () => {
    folderInputRef.current?.click();
  };

  // Offers "Upload File" / "Upload Folder" from a single button, reusing the
  // global context menu as an anchored dropdown rather than a right-click.
  const handleUploadMenuClick = (e: React.MouseEvent) => {
    openContextMenu(
      e,
      [
        {
          id: 'upload-file',
          label: 'Upload File',
          icon: <FileUp size={15} className="text-emerald-400" />,
          onClick: handleUploadClick,
        },
        {
          id: 'upload-folder',
          label: 'Upload Folder',
          icon: <FolderUp size={15} className="text-emerald-400" />,
          onClick: handleUploadFolderClick,
        },
      ],
      'Upload'
    );
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesSelected = e.target.files;
    if (!filesSelected || filesSelected.length === 0) return;
    const selected = Array.from(filesSelected) as Array<File & { webkitRelativePath: string }>;
    e.target.value = '';
    void uploadFolderFiles(selected, isTrashFolder ? null : currentFolderId);
  };

  // Folder upload: the browser hands back every file inside the chosen
  // folder(s) flattened, each carrying `webkitRelativePath` (e.g.
  // "MyFolder/sub/notes.txt"). The directory structure it implies is rebuilt
  // by creating one real (backend-persisted) folder per unique path segment,
  // then uploading each file into the folder its path resolves to.
  const uploadFolderFiles = async (
    filesToUpload: Array<File & { webkitRelativePath: string }>,
    rootParentId: string | null
  ) => {
    const knownNames = initKnownNames();
    const folderIdByPath = new Map<string, string | null>();
    setUploadProgress({ total: filesToUpload.length, completed: 0, currentFileName: '', currentPercent: 0 });

    const ensureFolderPath = async (relativePath: string): Promise<string | null> => {
      const segments = relativePath.split('/');
      segments.pop(); // drop the filename itself, keep only folder segments
      let parentId = rootParentId;
      let pathSoFar = '';
      for (const segment of segments) {
        pathSoFar = pathSoFar ? `${pathSoFar}/${segment}` : segment;
        let folderId = folderIdByPath.get(pathSoFar);
        if (folderId === undefined) {
          const folderName = reserveName(knownNames, parentId, segment);
          const created = await FileService.createFile({ name: folderName, type: 'folder', parentId });
          folderId = created.id || created._id;
          setFiles((prev) => [
            ...prev,
            { id: folderId as string, name: created.name, type: 'folder', parentId: created.parentId, createdAt: created.createdAt },
          ]);
          folderIdByPath.set(pathSoFar, folderId);
        }
        parentId = folderId;
      }
      return parentId;
    };

    for (const file of filesToUpload) {
      setUploadProgress((prev) => (prev ? { ...prev, currentFileName: file.name, currentPercent: 0 } : prev));
      try {
        const targetFolderId = await ensureFolderPath(file.webkitRelativePath || file.name);
        const fileName = reserveName(knownNames, targetFolderId, file.name);
        const uploadFile = fileName === file.name ? file : new File([file], fileName, { type: file.type });
        const localPreview = await readFilePreview(uploadFile);
        const created = await FileService.upload(uploadFile, {
          parentId: targetFolderId ?? undefined,
          onProgress: (percent) => setUploadProgress((prev) => (prev ? { ...prev, currentPercent: percent } : prev)),
        });
        const uploadedFile: FileItem = {
          id: created.id || created._id,
          name: created.name,
          type: 'file',
          content: created.content || localPreview,
          parentId: created.parentId,
          createdAt: created.createdAt,
          size: created.size,
        };
        setFiles((prev) => [...prev, uploadedFile]);
      } catch (error) {
        console.error(`Failed to upload "${file.name}":`, error);
        alert(`Failed to upload "${file.name}". Please try again.`);
      } finally {
        setUploadProgress((prev) => (prev ? { ...prev, completed: prev.completed + 1 } : prev));
      }
    }

    setUploadProgress(null);
  };

  // Drag & Drop external file upload onto explorer area.
  // Gated on `Files` being among the drag's types, which is what the browser
  // reports for a real OS/desktop drag — an internal item drag (this window or
  // another File Explorer window) carries INTERNAL_DRAG_TYPE instead, so it
  // never lights up the upload overlay.
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragHasType(e, 'Files')) {
      setIsDragOverCanvas(true);
    }
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);

    // An internal item dropped on empty canvas space is a move into whatever
    // folder this window currently has open, not an upload.
    if (dragHasType(e, INTERNAL_DRAG_TYPE)) {
      const itemId = e.dataTransfer.getData(INTERNAL_DRAG_TYPE) || draggedItemId;
      if (itemId && !isTrashFolder) {
        void moveItemToFolder(itemId, currentFolderId);
      } else {
        setDraggedItemId(null);
      }
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void uploadFiles(Array.from(e.dataTransfer.files), isTrashFolder ? null : currentFolderId);
    }
  };

  // Drag internal item to move into target folder or sidebar.
  // Both the custom type (used to detect an internal drag before drop) and
  // `text/plain` (harmless, kept for anything reading the drag outside this
  // component) carry the item id, since either window involved is just a
  // handler attached somewhere in the same document as far as native
  // drag-and-drop is concerned.
  const handleItemDragStart = (e: React.DragEvent, item: FileItem) => {
    setDraggedItemId(item.id);
    e.dataTransfer.setData(INTERNAL_DRAG_TYPE, item.id);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragEnd = () => {
    setDraggedItemId(null);
    setDragOverFolderId(null);
  };

  /**
   * Moves one item into `targetFolderId`, used by every drop target (canvas,
   * folder tiles/rows, sidebar places and pinned folders) so they all share one
   * validation + persistence path.
   */
  const moveItemToFolder = async (itemId: string, targetFolderId: string | null) => {
    const sourceItem = files.find((f) => f.id === itemId);
    if (!sourceItem || sourceItem.id === targetFolderId || sourceItem.parentId === targetFolderId) {
      setDraggedItemId(null);
      return;
    }

    // Prevent moving folder inside itself
    if (sourceItem.type === 'folder' && targetFolderId !== null) {
      let current = files.find((f) => f.id === targetFolderId);
      while (current) {
        if (current.id === sourceItem.id) {
          alert('Cannot move a folder inside itself.');
          setDraggedItemId(null);
          return;
        }
        current = files.find((f) => f.id === current?.parentId);
      }
    }

    const updated = files.map((f) =>
      f.id === itemId ? { ...f, parentId: targetFolderId } : f
    );
    setFiles(updated);
    setDraggedItemId(null);

    if (currentUser) {
      try {
        await FileService.moveFile(itemId, targetFolderId);
      } catch (error) {
        console.warn('Failed to move file on backend:', error);
        setFiles(files);
      }
    }
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();

    // Read the id from the drag itself rather than local `draggedItemId` state:
    // when the drag started in a different File Explorer window, this
    // component's own state was never set, but `dataTransfer` is populated by
    // the browser and is readable here regardless of which window the drag
    // began in.
    const itemId = e.dataTransfer.getData(INTERNAL_DRAG_TYPE) || draggedItemId;
    setDragOverFolderId(null);
    if (!itemId) return;
    await moveItemToFolder(itemId, targetFolderId);
  };

  // Marks a folder tile as the active drop target while an internal item drags
  // over it. Only for internal drags — an external OS file dragged over a
  // folder tile isn't a supported "upload straight into this folder" gesture,
  // so it shouldn't light the tile up.
  const handleFolderDragEnter = (e: React.DragEvent, folderId: string) => {
    if (!dragHasType(e, INTERNAL_DRAG_TYPE)) return;
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleFolderDragLeave = (folderId: string) => {
    setDragOverFolderId((current) => (current === folderId ? null : current));
  };

  // Size and Type string formatters
  const getItemSizeString = (item: FileItem): string => {
    if (item.type === 'folder') {
      const childrenCount = files.filter((f) => f.parentId === item.id).length;
      return `${childrenCount} item${childrenCount === 1 ? '' : 's'}`;
    }
    // `size` is the server-reported byte count and must win whenever it's
    // known — `item.content` is only ever a possibly-truncated local preview
    // (see readFilePreview) or entirely absent (folder listings never
    // include content), so deriving "size" from its length silently produces
    // the wrong number for anything but a small file the client happened to
    // read in full.
    if (typeof item.size === 'number') {
      if (item.size < 1024) return `${item.size} B`;
      if (item.size < 1024 * 1024) return `${(item.size / 1024).toFixed(1)} KB`;
      return `${(item.size / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (item.content) {
      const bytes = item.content.length;
      if (bytes < 1024) return `${bytes} B`;
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return '0 B';
  };

  const getItemTypeString = (item: FileItem): string => {
    if (item.type === 'folder') return 'File Folder';
    const ext = item.name.split('.').pop()?.toLowerCase();
    if (ext === 'txt') return 'Text Document';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'Image File';
    if (ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'html' || ext === 'css') return 'Code Document';
    if (ext === 'mp3' || ext === 'wav') return 'Audio File';
    if (ext === 'mp4' || ext === 'webm') return 'Video File';
    return 'System File';
  };

  // Create folder
  const handleCreateFolder = async () => {
    const name = prompt('Enter name of new folder:', 'New Folder');
    if (!name) return;

    let folderName = name;
    let count = 1;
    while (files.some((f) => f.parentId === currentFolderId && f.name === folderName)) {
      folderName = `${name} (${count++})`;
    }

    try {
      const created = await FileService.createFile({
        name: folderName,
        type: 'folder',
        parentId: currentFolderId,
      });

      const newFolder: FileItem = {
        id: created._id,
        name: created.name,
        type: 'folder',
        parentId: created.parentId,
        createdAt: created.createdAt,
      };

      setFiles((prev) => [...prev, newFolder]);
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  };

  // Create file
  const handleCreateFile = async () => {
    const name = prompt('Enter name of new text file:', 'notes.txt');
    if (!name) return;

    const cleanName = name.endsWith('.txt') ? name : `${name}.txt`;
    let fileName = cleanName;
    let count = 1;
    while (files.some((f) => f.parentId === currentFolderId && f.name === fileName)) {
      const base = cleanName.substring(0, cleanName.lastIndexOf('.'));
      fileName = `${base} (${count++}).txt`;
    }

    try {
      const created = await FileService.createFile({
        name: fileName,
        type: 'file',
        parentId: currentFolderId,
        content: 'This is a newly created text document.',
        mimeType: 'text/plain',
      });

      const newFile: FileItem = {
        id: created._id,
        name: created.name,
        type: 'file',
        content: created.content || '',
        parentId: created.parentId,
        createdAt: created.createdAt,
      };

      setFiles((prev) => [...prev, newFile]);
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file. Please try again.');
    }
  };

  // Clipboard commands
  const handleCopy = (item: FileItem) => {
    setClipboard({ id: item.id, action: 'copy' });
    useContextMenuStore.getState().closeContextMenu();
  };

  const handleCut = (item: FileItem) => {
    setClipboard({ id: item.id, action: 'cut' });
    useContextMenuStore.getState().closeContextMenu();
  };

  // Paste logic
  const handlePaste = () => {
    if (!clipboard) return;
    const sourceItem = files.find((f) => f.id === clipboard.id);
    if (!sourceItem) {
      setClipboard(null);
      return;
    }

    if (clipboard.action === 'cut') {
      const updatedFiles = files.map((f) =>
        f.id === sourceItem.id ? { ...f, parentId: currentFolderId } : f
      );
      setFiles(updatedFiles);
      setClipboard(null);
    } else {
      if (sourceItem.type === 'file') {
        const baseName = sourceItem.name.substring(0, sourceItem.name.lastIndexOf('.'));
        const ext = sourceItem.name.substring(sourceItem.name.lastIndexOf('.'));
        let newName = `${baseName} - Copy${ext}`;
        let count = 1;
        while (files.some((f) => f.parentId === currentFolderId && f.name === newName)) {
          newName = `${baseName} - Copy (${count++})${ext}`;
        }

        const newFile: FileItem = {
          ...sourceItem,
          id: `file-${Date.now()}`,
          name: newName,
          parentId: currentFolderId,
          createdAt: new Date().toLocaleDateString(),
        };
        setFiles((prev) => [...prev, newFile]);
      } else {
        const itemsToInsert = duplicateFolderRecursive(sourceItem, currentFolderId);
        setFiles((prev) => [...prev, ...itemsToInsert]);
      }
    }
    useContextMenuStore.getState().closeContextMenu();
  };

  // Instant Duplicate
  const handleDuplicate = (item: FileItem) => {
    if (item.type === 'file') {
      const dotIndex = item.name.lastIndexOf('.');
      let base = dotIndex !== -1 ? item.name.substring(0, dotIndex) : item.name;
      let ext = dotIndex !== -1 ? item.name.substring(dotIndex) : '';
      let newName = `${base} - Copy${ext}`;
      let count = 1;
      while (files.some((f) => f.parentId === currentFolderId && f.name === newName)) {
        newName = `${base} - Copy (${count++})${ext}`;
      }

      const newItem: FileItem = {
        ...item,
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: newName,
        parentId: currentFolderId,
        createdAt: new Date().toLocaleDateString(),
      };
      setFiles((prev) => [...prev, newItem]);
    } else {
      const itemsToInsert = duplicateFolderRecursive(item, currentFolderId);
      setFiles((prev) => [...prev, ...itemsToInsert]);
    }
    useContextMenuStore.getState().closeContextMenu();
  };

  const duplicateFolderRecursive = (folderToCopy: FileItem, targetParentId: string | null): FileItem[] => {
    let baseName = `${folderToCopy.name} - Copy`;
    let count = 1;
    while (files.some((f) => f.parentId === targetParentId && f.name === baseName)) {
      baseName = `${folderToCopy.name} - Copy (${count++})`;
    }

    const newFolderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newFolder: FileItem = {
      ...folderToCopy,
      id: newFolderId,
      name: baseName,
      parentId: targetParentId,
      createdAt: new Date().toLocaleDateString(),
    };

    const accumulated: FileItem[] = [newFolder];

    const copyChildrenOf = (oldParentId: string, newParentId: string) => {
      const children = files.filter((f) => f.parentId === oldParentId);
      children.forEach((child) => {
        const newChildId = `${child.type}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const newChild: FileItem = {
          ...child,
          id: newChildId,
          parentId: newParentId,
          createdAt: new Date().toLocaleDateString(),
        };
        accumulated.push(newChild);
        if (child.type === 'folder') {
          copyChildrenOf(child.id, newChildId);
        }
      });
    };

    copyChildrenOf(folderToCopy.id, newFolderId);
    return accumulated;
  };

  // Rename
  const handleStartRename = (item: FileItem) => {
    setRenamingId(item.id);
    setRenameText(item.name);
    useContextMenuStore.getState().closeContextMenu();
  };

  const handleSaveRename = async () => {
    if (!renamingId) return;
    const cleanName = renameText.trim();
    const target = files.find((f) => f.id === renamingId);
    if (!cleanName || !target) {
      setRenamingId(null);
      return;
    }
    if (cleanName === target.name) {
      setRenamingId(null);
      return;
    }

    // Catch the common case immediately instead of round-tripping to the
    // server first — matches the backend's own check (case-insensitive,
    // scoped to the same folder, not type-specific: a file and a folder
    // can't share a name any more than two files can).
    const conflict = files.find(
      (f) => f.id !== renamingId && (f.parentId ?? null) === (target.parentId ?? null) && f.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (conflict) {
      alert(`"${cleanName}" already exists in this folder. Please choose a different name.`);
      setRenamingId(null);
      return;
    }

    const previousName = target.name;
    setFiles((prev) => prev.map((f) => (f.id === renamingId ? { ...f, name: cleanName } : f)));
    setRenamingId(null);

    if (!currentUser) return;
    try {
      await FileService.updateFile(renamingId, { name: cleanName });
    } catch (error) {
      // The optimistic rename above must not silently stick around if the
      // server rejected it — e.g. a conflict with a file another client
      // created that wasn't visible in this local list yet.
      setFiles((prev) => prev.map((f) => (f.id === renamingId ? { ...f, name: previousName } : f)));
      const message = error instanceof Error ? error.message : 'Please try again.';
      alert(`Could not rename to "${cleanName}": ${message}`);
    }
  };

  // Delete / Trash
  const handleDeleteItem = (item: FileItem) => {
    if (isTrashFolder) {
      if (!confirm(`Permanently erase "${item.name}"? This cannot be undone.`)) return;
      const updatedTrash = deletedFiles.filter((f) => f.id !== item.id);
      StorageService.set('webos-trash', updatedTrash);
      useSystemStore.setState({ deletedFiles: updatedTrash });
    } else {
      if (!confirm(`Move "${item.name}" to the Recycle Bin?`)) return;
      handleDeleteFile({ ...item, originalParentId: item.parentId });
    }
    setSelectedFileIds((prev) => prev.filter((id) => id !== item.id));
    useContextMenuStore.getState().closeContextMenu();
  };

  // Left toolbar overflow ---------------------------------------------------
  // Below a certain width the action buttons (New Folder, Cut, Copy, Paste,
  // Rename, Delete, …) no longer fit on one line. Rather than wrapping onto a
  // second row, trailing buttons that don't fit collapse into a "More
  // actions" overflow menu — the row itself stays a single line at every
  // width. `estimateActionWidth` is a deliberately rough per-character
  // estimate (there's no cheap way to get exact rendered widths without an
  // extra measurement pass) but only needs to be in the right ballpark: being
  // a little conservative just moves the cutoff a few px earlier than
  // strictly necessary, never causes actual clipping.
  interface LeftToolbarAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    menuIcon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    dividerBefore?: boolean;
    wide?: boolean;
    hasChevron?: boolean;
    submenu?: ContextMenuItem[];
  }

  const leftToolbarActions: LeftToolbarAction[] = [
    {
      id: 'new-folder',
      label: 'New Folder',
      icon: <FolderPlus className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
      menuIcon: <FolderPlus size={15} className="text-amber-500" />,
      onClick: handleCreateFolder,
      wide: true,
    },
    {
      id: 'new-text',
      label: 'New Text',
      icon: <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
      menuIcon: <Plus size={15} className="text-blue-500" />,
      onClick: handleCreateFile,
      wide: true,
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: <Upload className="w-3.5 h-3.5 shrink-0" />,
      menuIcon: <Upload size={15} className="text-emerald-500" />,
      onClick: handleUploadClick,
      dividerBefore: true,
      wide: true,
      hasChevron: true,
      submenu: [
        { id: 'upload-file', label: 'Upload File', icon: <FileUp size={15} className="text-emerald-400" />, onClick: handleUploadClick },
        { id: 'upload-folder', label: 'Upload Folder', icon: <FolderUp size={15} className="text-emerald-400" />, onClick: handleUploadFolderClick },
      ],
    },
    {
      id: 'cut',
      label: 'Cut',
      icon: <Scissors className="w-3.5 h-3.5 shrink-0" />,
      menuIcon: <Scissors size={15} className="text-slate-400" />,
      onClick: () => selectedItem && handleCut(selectedItem),
      disabled: !selectedItem,
      dividerBefore: true,
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: <Copy className="w-3.5 h-3.5 shrink-0" />,
      menuIcon: <Copy size={15} className="text-slate-400" />,
      onClick: () => selectedItem && handleCopy(selectedItem),
      disabled: !selectedItem,
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: <Clipboard className="w-3.5 h-3.5 shrink-0" />,
      menuIcon: <Clipboard size={15} className="text-slate-400" />,
      onClick: handlePaste,
      disabled: !clipboard,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="w-3.5 h-3.5 text-purple-500 shrink-0" />,
      menuIcon: <Copy size={15} className="text-purple-500" />,
      onClick: () => selectedItem && handleDuplicate(selectedItem),
      disabled: !selectedItem,
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: <Edit3 className="w-3.5 h-3.5 text-sky-500 shrink-0" />,
      menuIcon: <Edit3 size={15} className="text-sky-500" />,
      onClick: () => selectedItem && handleStartRename(selectedItem),
      disabled: !selectedItem,
      dividerBefore: true,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-3.5 h-3.5 shrink-0" />,
      menuIcon: <Trash2 size={15} className="text-rose-500" />,
      onClick: () => selectedItem && handleDeleteItem(selectedItem),
      disabled: !selectedItem,
      danger: true,
    },
  ];

  // Real measured widths, not guessed ones: a per-character estimate turned
  // out to be off by enough (accumulated over 9 buttons) to trigger the
  // overflow menu even at widths where everything actually fits. Every
  // button is always mounted with a ref; when hidden it's `display: none`
  // rather than unmounted, so — combined with the "show everything, measure,
  // then trim" cycle below — a button's width, once known for the current
  // label mode, never needs re-measuring just because it's not currently
  // visible.
  const leftButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [leftMeasuredWidths, setLeftMeasuredWidths] = useState<number[] | null>(null);

  // Label visibility (isCompactRibbon) changes every button's own width, so
  // previously-measured widths go stale — clear them to force a fresh
  // "show everything" measuring pass below.
  useEffect(() => {
    setLeftMeasuredWidths(null);
  }, [isCompactRibbon]);

  useLayoutEffect(() => {
    if (leftMeasuredWidths !== null) return;
    const widths = leftButtonRefs.current.map((el) => el?.offsetWidth ?? 0);
    if (widths.some((w) => w === 0)) return; // not all buttons mounted yet
    setLeftMeasuredWidths(widths);
  });

  const leftToolbarVisibleCount = useMemo(() => {
    const total = leftToolbarActions.length;
    // Still measuring (or about to): render every button so the layout
    // effect above has something to measure.
    if (!leftMeasuredWidths) return total;

    const ROW_GAP = 6; // gap-1.5 on the toolbar row
    const DIVIDER_W = 5; // the 1px separators (w-[1px] + mx-0.5 margin each side)
    const OVERFLOW_BTN_W = 32;

    const widthUpTo = (count: number): number => {
      let running = 0;
      for (let i = 0; i < count; i++) {
        let addition = leftMeasuredWidths[i] ?? 0;
        if (i > 0) addition += ROW_GAP;
        if (leftToolbarActions[i].dividerBefore) addition += DIVIDER_W + ROW_GAP;
        running += addition;
      }
      return running;
    };

    if (widthUpTo(total) <= leftToolbarWidth) return total;

    const overflowReserve = ROW_GAP + DIVIDER_W + ROW_GAP + OVERFLOW_BTN_W;
    let count = total;
    while (count > 0 && widthUpTo(count) + overflowReserve > leftToolbarWidth) {
      count -= 1;
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftMeasuredWidths, leftToolbarWidth]);

  const handleLeftToolbarOverflowClick = (e: React.MouseEvent) => {
    const hidden = leftToolbarActions.slice(leftToolbarVisibleCount);
    openContextMenu(
      e,
      hidden.map((action) => ({
        id: action.id,
        label: action.label,
        icon: action.menuIcon,
        disabled: action.disabled,
        danger: action.danger,
        onClick: action.onClick,
        submenu: action.submenu,
      })),
      'More Actions'
    );
  };

  // Restore item from Trash
  const handleRestoreItem = (item: FileItem) => {
    handleRestoreFile(item);
    setSelectedFileIds((prev) => prev.filter((id) => id !== item.id));
    useContextMenuStore.getState().closeContextMenu();
  };

  // Sidebar location clicks
  const handleSidebarClick = (locId: string | null) => {
    if (!locId || locId === 'drive' || locId === 'home') {
      navigateToFolder(null);
      return;
    }

    if (locId.startsWith('folder-')) {
      const actualId = defaultFolderIdMap[locId.replace('folder-', '')] || locId;
      const existing = files.find((f) => f.id === actualId);
      if (!existing) {
        const name = getFolderLabel(locId);
        const newFolder: FileItem = {
          id: actualId,
          name,
          type: 'folder',
          parentId: null,
          createdAt: new Date().toLocaleDateString(),
        };
        setFiles([...files, newFolder]);
      }
      navigateToFolder(actualId);
      return;
    }

    navigateToFolder(locId);
  };

  const handleSidebarItemContextMenu = (e: React.MouseEvent, folderId: string, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();

    const isPinned = pinnedFolderIds.includes(folderId);

    const items: ContextMenuItem[] = [
      {
        id: 'open-sidebar-folder',
        label: `Open ${folderName}`,
        icon: <Folder size={15} className="text-amber-400" />,
        onClick: () => navigateToFolder(folderId),
      },
      { divider: true },
      {
        id: 'toggle-pin',
        label: isPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar',
        icon: isPinned ? <PinOff size={15} className="text-amber-400" /> : <Pin size={15} className="text-purple-400" />,
        onClick: () => togglePinSidebarFolder(folderId),
      },
    ];

    openContextMenu(e, items, folderName);
  };

  // Double Click execution
  const handleItemDoubleClick = (item: FileItem) => {
    if (item.type === 'folder') {
      navigateToFolder(item.id);
    } else {
      const appId = getAppForFile(item.name, item.category === 'documents' ? 'text/plain' : 'application/octet-stream');
      if (appId) {
        handleOpenWithApp(appId, item);
      } else {
        setActivePreviewItem(item);
      }
    }
  };

  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);

  // Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, item: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (item) {
      if (!selectedFileIds.includes(item.id)) {
        setSelectedFileIds([item.id]);
      }

      if (isTrashFolder) {
        const trashItems: ContextMenuItem[] = [
          {
            id: 'restore-trash-item',
            label: 'Restore to Original Location',
            icon: <RotateCcw size={15} className="text-emerald-400" />,
            onClick: () => handleRestoreItem(item),
          },
          {
            id: 'delete-permanently',
            label: 'Delete Permanently',
            icon: <Trash2 size={15} className="text-red-400" />,
            danger: true,
            onClick: () => handleDeleteItem(item),
          },
        ];
        openContextMenu(e, trashItems, item.name);
        return;
      }

      const isPinned = pinnedFolderIds.includes(item.id);
      // Undefined effectiveRole means the backend didn't attach one (e.g. an
      // owned item outside a listChildren response) — default to permissive;
      // the server enforces the real rule regardless, this only hides buttons
      // that would fail anyway.
      const canWrite = !item.effectiveRole || item.effectiveRole === 'owner' || item.effectiveRole === 'editor';
      const canShare = !item.effectiveRole || item.effectiveRole === 'owner';

      const fileItems: ContextMenuItem[] = [
        {
          id: 'open',
          label: 'Open',
          icon: item.type === 'folder' ? <Folder size={15} className="text-amber-400" /> : <FileText size={15} className="text-blue-400" />,
          onClick: () => handleItemDoubleClick(item),
        },
        {
          id: 'open-with',
          label: 'Open With...',
          icon: <ExternalLink size={15} className="text-purple-400" />,
          onClick: () => setActiveOpenWithItem(item),
        },
        {
          id: 'preview',
          label: 'Preview',
          icon: <ImageIcon size={15} className="text-sky-400" />,
          onClick: () => setActivePreviewItem(item),
        },
        {
          id: 'download',
          label: 'Download',
          icon: <Download size={15} className="text-emerald-400" />,
          onClick: () => handleDownloadFile(item),
        },
        {
          id: 'share',
          label: 'Share...',
          icon: <Share2 size={15} className="text-indigo-400" />,
          disabled: !canShare,
          onClick: () => setActiveShareItem(item),
        },
      ];

      if (item.type === 'folder') {
        fileItems.push({
          id: 'pin-sidebar',
          label: isPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar',
          icon: isPinned ? <PinOff size={15} className="text-amber-400" /> : <Pin size={15} className="text-purple-400" />,
          onClick: () => togglePinSidebarFolder(item.id),
        });
      }

      fileItems.push(
        { divider: true },
        {
          id: 'toggle-star',
          label: item.starred ? 'Remove from Starred' : 'Add to Starred',
          icon: <Star size={15} className={item.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-400'} />,
          onClick: () => handleToggleStar(item),
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          icon: <Copy size={15} className="text-slate-400" />,
          onClick: () => handleDuplicate(item),
        },
        {
          id: 'move-to',
          label: 'Move To...',
          icon: <Scissors size={15} className="text-slate-400" />,
          disabled: !canWrite,
          onClick: () => setActiveMoveItem(item),
        },
        {
          id: 'cut',
          label: 'Cut',
          icon: <Scissors size={15} className="text-slate-400" />,
          shortcut: 'Ctrl+X',
          onClick: () => handleCut(item),
        },
        {
          id: 'copy',
          label: 'Copy',
          icon: <Copy size={15} className="text-slate-400" />,
          shortcut: 'Ctrl+C',
          onClick: () => handleCopy(item),
        },
        {
          id: 'rename',
          label: 'Rename',
          icon: <Edit3 size={15} className="text-slate-400" />,
          shortcut: 'F2',
          disabled: !canWrite,
          onClick: () => handleStartRename(item),
        },
        {
          id: 'delete',
          label: 'Move to Trash',
          icon: <Trash2 size={15} className="text-red-400" />,
          danger: true,
          shortcut: 'Del',
          disabled: !canWrite,
          onClick: () => handleDeleteItem(item),
        },
        { divider: true },
        {
          id: 'properties',
          label: 'Properties',
          icon: <Info size={15} className="text-slate-300" />,
          onClick: () => setActivePropertiesItem(item),
        }
      );

      openContextMenu(e, fileItems, item.name);
    } else {
      setSelectedFileIds([]);
      if (isTrashFolder) {
        openContextMenu(
          e,
          [
            {
              id: 'empty-trash',
              label: 'Empty Recycle Bin',
              icon: <Trash2 size={15} className="text-red-400" />,
              danger: true,
              onClick: handleEmptyTrash,
            },
          ],
          'Trash Bin Actions'
        );
        return;
      }

      const folderItems: ContextMenuItem[] = [
        {
          id: 'new-folder',
          label: 'New Folder',
          icon: <FolderPlus size={15} className="text-amber-400" />,
          onClick: handleCreateFolder,
        },
        {
          id: 'new-file',
          label: 'New Text File',
          icon: <Plus size={15} className="text-blue-400" />,
          onClick: handleCreateFile,
        },
        {
          id: 'upload',
          label: 'Upload',
          icon: <Upload size={15} className="text-emerald-400" />,
          submenu: [
            {
              id: 'upload-file',
              label: 'Upload File',
              icon: <FileUp size={15} className="text-emerald-400" />,
              onClick: handleUploadClick,
            },
            {
              id: 'upload-folder',
              label: 'Upload Folder',
              icon: <FolderUp size={15} className="text-emerald-400" />,
              onClick: handleUploadFolderClick,
            },
          ],
        },
        { divider: true },
        {
          id: 'paste',
          label: 'Paste Here',
          icon: <Clipboard size={15} className="text-slate-400" />,
          shortcut: 'Ctrl+V',
          disabled: !clipboard,
          onClick: handlePaste,
        },
        {
          id: 'select-all',
          label: 'Select All',
          icon: <CheckSquare size={15} className="text-purple-400" />,
          shortcut: 'Ctrl+A',
          onClick: () => setSelectedFileIds(sortedItems.map((f) => f.id)),
        },
        {
          id: 'refresh',
          label: 'Refresh',
          icon: <RefreshCw size={15} className="text-slate-400" />,
          shortcut: 'F5',
          onClick: handleRefresh,
        },
      ];
      openContextMenu(e, folderItems, 'Folder Actions');
    }
  };

  // Open Selected App via OpenWith Modal
  const handleOpenWithApp = async (appKey: string, item: FileItem) => {
    // 'text-editor' is OpenWithModal's own manual-pick key; 'editor' is the
    // real AppRegistry id that double-click (via getAppForFile/EDITOR_REGISTRY)
    // actually passes here — without this second check double-clicking a
    // text/code file silently did nothing, since neither branch below matched it.
    if (appKey === 'text-editor' || appKey === 'editor') {
      // `item.content` comes from the folder listing, which never includes
      // content (FileService.listChildren doesn't pass includeContent=true —
      // it would be wasteful to fetch every file's bytes just to render a
      // grid of names and icons). Any resync of this folder therefore blanks
      // it back to ''. Fetch the real content here so a file saved from the
      // editor still shows its text the next time it's opened from Explorer.
      const full = await FileService.getFile(item.id);
      openTextFileInEditor(item.id, item.name, full?.content ?? item.content ?? '', currentFolderId);
    } else if (appKey === 'image-viewer' || appKey === 'audio-player' || appKey === 'video-player' || appKey === 'code-viewer') {
      setActivePreviewItem(item);
    } else if (appKey === 'properties') {
      setActivePropertiesItem(item);
    }
  };

  // Read Current directory items
  let currentItems: FileItem[] = [];
  if (isTrashFolder) {
    currentItems = deletedFiles;
  } else if (currentFolderId === 'recent') {
    currentItems = files.filter((f) => f.type === 'file');
  } else if (currentFolderId === 'starred') {
    currentItems = files.filter((f) => f.starred);
  } else if (currentFolderId === 'shared-with-me') {
    currentItems = sharedWithMeItems;
  } else {
    currentItems = files.filter((f) => f.parentId === currentFolderId);
  }

  currentItems = currentItems.filter(
    (f) => f.id !== 'volume-511gb' && f.id !== 'data-disk' && !f.name.includes('511 GB') && !f.name.includes('Data Disk')
  );

  // Apply Type Filter
  if (typeFilter !== 'all') {
    currentItems = currentItems.filter((item) => {
      if (item.type === 'folder') return true;
      const ext = item.name.split('.').pop()?.toLowerCase();
      if (typeFilter === 'documents') return ext === 'txt' || ext === 'pdf' || ext === 'doc' || ext === 'docx';
      if (typeFilter === 'images') return ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'svg';
      if (typeFilter === 'audio') return ext === 'mp3' || ext === 'wav' || ext === 'ogg' || ext === 'm4a';
      if (typeFilter === 'video') return ext === 'mp4' || ext === 'webm' || ext === 'mov';
      if (typeFilter === 'code') return ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'html' || ext === 'css' || ext === 'py' || ext === 'json';
      if (typeFilter === 'archives') return ext === 'zip' || ext === 'tar' || ext === 'gz' || ext === 'rar';
      return true;
    });
  }

  // Apply Search Query
  const filteredItems = currentItems.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting calculation
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    let valA: any = a.name.toLowerCase();
    let valB: any = b.name.toLowerCase();

    if (sortField === 'type') {
      valA = getItemTypeString(a);
      valB = getItemTypeString(b);
    } else if (sortField === 'date') {
      valA = a.createdAt;
      valB = b.createdAt;
    } else if (sortField === 'size') {
      if (a.type === 'folder') {
        valA = files.filter((f) => f.parentId === a.id).length;
        valB = files.filter((f) => f.parentId === b.id).length;
      } else {
        valA = typeof a.size === 'number' ? a.size : a.content ? a.content.length : 0;
        valB = typeof b.size === 'number' ? b.size : b.content ? b.content.length : 0;
      }
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Theme styles
  const themeStyles = {
    'classic-light': {
      container: 'text-[#1F1F1F] bg-[#FAF8FC]',
      sidebar: 'bg-[#ECECEC] border-r border-[#D6D6D6]',
      sidebarBtn: 'text-[#2C2C2C] hover:bg-[#DDD]/60 hover:text-black font-normal',
      sidebarBtnActive: 'bg-[#DCDCDC] text-black font-medium',
      toolbar: 'bg-[#FAF8FC] border-b border-[#E2D9EB] select-none shrink-0',
      addressBar: 'bg-white border border-[#DDD3E8] rounded-md text-xs text-[#211625] shadow-inner',
      gridCard: 'bg-white border-[#E5DBEE] hover:bg-[#FDFBFE] hover:shadow-sm text-[#211625]',
      gridCardSelected: 'bg-[#F1E8F9] border-[#C2A3DF] text-[#6324A3] shadow-inner',
      listHeader: 'bg-[#FAF8FC] border-b border-[#E2D9EB] text-[#55475A] font-bold text-xs',
      listRow: 'border-b border-[#EDE8F3] hover:bg-[#F3EEF8]',
      listRowSelected: 'bg-[#FAF8FC] hover:bg-[#FAF8FC] border-l-4 border-l-purple-500',
      rightPane: 'bg-[#F4EDFA] border-l border-[#E2D9EB] text-[#211625]',
      rightPaneHeader: 'border-b border-[#E2D9EB] bg-[#FAF8FC]',
    },
    'modern-dark': {
      container: 'text-white bg-zinc-950/90',
      sidebar: 'bg-zinc-900/50 border-r border-white/5',
      sidebarBtn: 'text-white/70 hover:bg-white/5 hover:text-white',
      sidebarBtnActive: 'bg-white/10 text-[#EC4899] font-semibold border-l-2 border-l-[#EC4899]',
      toolbar: 'bg-zinc-900/60 border-b border-white/5 select-none shrink-0',
      addressBar: 'bg-zinc-950 border border-white/10 rounded-md text-xs text-white shadow-inner',
      gridCard: 'bg-white/5 border-white/5 hover:bg-white/10 hover:shadow-lg text-white',
      gridCardSelected: 'bg-[#EC4899]/10 border-[#EC4899]/40 text-[#EC4899] shadow-inner',
      listHeader: 'bg-zinc-900 border-b border-white/10 text-white/60 font-bold text-xs',
      listRow: 'border-b border-white/5 hover:bg-white/5',
      listRowSelected: 'bg-zinc-900 hover:bg-zinc-900 border-l-4 border-l-[#EC4899]',
      rightPane: 'bg-zinc-900/70 border-l border-white/5 text-white',
      rightPaneHeader: 'border-b border-white/5 bg-zinc-950',
    },
    'retro-terminal': {
      container: 'text-[#22c55e] bg-black font-mono',
      sidebar: 'bg-black border-r border-[#22c55e]/20',
      sidebarBtn: 'text-[#22c55e]/80 hover:bg-[#22c55e]/10 hover:text-white',
      sidebarBtnActive: 'bg-[#22c55e]/20 text-[#22c55e] font-semibold border-l-2 border-l-[#22c55e]',
      toolbar: 'bg-black border-b border-[#22c55e]/20 select-none shrink-0',
      addressBar: 'bg-black border border-[#22c55e]/40 rounded-md text-xs text-[#22c55e] shadow-inner',
      gridCard: 'bg-black border-[#22c55e]/20 hover:bg-[#22c55e]/5 text-[#22c55e]',
      gridCardSelected: 'bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-inner',
      listHeader: 'bg-black border-b border-[#22c55e]/40 text-[#22c55e]/70 font-bold text-xs',
      listRow: 'border-b border-[#22c55e]/10 hover:bg-[#22c55e]/5',
      listRowSelected: 'bg-[#22c55e]/10 hover:bg-[#22c55e]/15 border-l-4 border-l-[#22c55e]',
      rightPane: 'bg-black border-l border-[#22c55e]/20 text-[#22c55e]',
      rightPaneHeader: 'border-b border-[#22c55e]/20 bg-black',
    },
  };

  const ts = themeStyles[activeTheme] || themeStyles['classic-light'];


  // Menus mirror the toolbar and context menus, so every command is also
  // reachable from the menu bar.
  useAppMenu('fileManager', [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new-folder', label: 'New Folder', shortcut: 'Ctrl+Shift+N', onSelect: handleCreateFolder },
        { id: 'upload', label: 'Upload Files…', onSelect: handleUploadClick },
        separator(),
        { id: 'rename', label: 'Rename', shortcut: 'F2', disabled: !selectedItem, onSelect: () => selectedItem && handleStartRename(selectedItem) },
        { id: 'download', label: 'Download', disabled: !selectedItem || selectedItem.type !== 'file', onSelect: () => selectedItem && handleDownloadFile(selectedItem) },
        separator(),
        { id: 'delete', label: isTrashFolder ? 'Delete Permanently' : 'Move to Trash', shortcut: 'Delete', danger: true, disabled: !selectedItem, onSelect: () => selectedItem && handleDeleteItem(selectedItem) },
        { id: 'empty-trash', label: 'Empty Recycle Bin', danger: true, disabled: deletedFiles.length === 0, onSelect: () => handleEmptyTrash() },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', disabled: !selectedItem, onSelect: () => selectedItem && handleCut(selectedItem) },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', disabled: !selectedItem, onSelect: () => selectedItem && handleCopy(selectedItem) },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', disabled: !clipboard, onSelect: handlePaste },
        separator(),
        { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', onSelect: () => setSelectedFileIds(sortedItems.map((item) => item.id)) },
        { id: 'select-none', label: 'Deselect All', disabled: selectedFileIds.length === 0, onSelect: () => setSelectedFileIds([]) },
        separator(),
        { id: 'star', label: 'Toggle Star', disabled: !selectedItem, onSelect: () => selectedItem && handleToggleStar(selectedItem) },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'view-grid', label: 'Grid', selected: viewMode === 'grid', onSelect: () => setViewMode('grid') },
        { id: 'view-list', label: 'List', selected: viewMode === 'list', onSelect: () => setViewMode('list') },
        separator(),
        {
          kind: 'submenu', id: 'sort-by', label: 'Sort By',
          items: ([
            ['name', 'Name'], ['type', 'Type'], ['date', 'Date Modified'], ['size', 'Size'],
          ] as const).map(([field, label]) => ({
            id: `sort-${field}`, label, selected: sortField === field,
            onSelect: () => setSortField(field),
          })),
        },
        {
          kind: 'submenu', id: 'sort-order', label: 'Sort Order',
          items: [
            { id: 'sort-asc', label: 'Ascending', selected: sortOrder === 'asc', onSelect: () => setSortOrder('asc') },
            { id: 'sort-desc', label: 'Descending', selected: sortOrder === 'desc', onSelect: () => setSortOrder('desc') },
          ],
        },
        separator(),
        { id: 'details-pane', label: 'Details Pane', checked: showDetailsPane, onSelect: () => setShowDetailsPane((prev) => !prev) },
        separator(),
        {
          kind: 'submenu', id: 'filter-type', label: 'Filter',
          items: ([
            ['all', 'All Items'], ['documents', 'Documents'], ['images', 'Images'],
            ['audio', 'Audio'], ['video', 'Video'], ['code', 'Code'], ['archives', 'Archives'],
          ] as const).map(([value, label]) => ({
            id: `filter-${value}`, label, selected: typeFilter === value,
            onSelect: () => setTypeFilter(value),
          })),
        },
      ],
    },
    {
      id: 'go',
      label: 'Go',
      items: [
        { id: 'back', label: 'Back', shortcut: 'Alt+←', disabled: historyIndex <= 0, onSelect: handleGoBack },
        { id: 'forward', label: 'Forward', shortcut: 'Alt+→', disabled: historyIndex >= history.length - 1, onSelect: handleGoForward },
        { id: 'up', label: 'Up One Level', shortcut: 'Alt+↑', disabled: currentFolderId === null, onSelect: handleGoUp },
        separator(),
        { id: 'go-home', label: 'This PC', onSelect: () => handleSidebarClick(null) },
        { id: 'go-trash', label: 'Recycle Bin', onSelect: () => handleSidebarClick('trash') },
        separator(),
        { id: 'clear-search', label: 'Clear Search', disabled: !searchQuery, onSelect: () => setSearchQuery('') },
      ],
    },
  ]);

  return (
    <div ref={containerRef} className={`h-full flex flex-col text-sm select-none ${ts.container}`}>
      {/* ==================== 1. TOP NAV & TOOLBAR RIBBON ==================== */}
      <div className={`${ts.toolbar} flex flex-col shrink-0`}>
        {/* Navigation Row */}
        <div className="flex items-center gap-1.5 p-2 px-3">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleGoBack}
              disabled={historyIndex === 0}
              className="p-1.5 rounded-md hover:bg-black/5 disabled:opacity-35 cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={historyIndex === history.length - 1}
              className="p-1.5 rounded-md hover:bg-black/5 disabled:opacity-35 cursor-pointer"
              title="Go Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoUp}
              disabled={currentFolderId === null}
              className="p-1.5 rounded-md hover:bg-black/5 disabled:opacity-35 cursor-pointer"
              title="Go Up"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-md hover:bg-black/5 cursor-pointer"
              title="Refresh Folder"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Address Bar */}
          <div className="flex-1 min-w-[120px] relative">
            {isPathEditing ? (
              <form onSubmit={handlePathSubmit} className="w-full h-8">
                <input
                  ref={pathInputRef}
                  type="text"
                  value={pathInputText}
                  onChange={(e) => setPathInputText(e.target.value)}
                  onBlur={() => setTimeout(() => setIsPathEditing(false), 200)}
                  className={`w-full h-full px-3 outline-none focus:ring-1 focus:ring-purple-500/50 ${ts.addressBar}`}
                />
              </form>
            ) : (
              <div
                onClick={startPathEditing}
                className={`w-full h-8 flex items-center px-2 cursor-text overflow-hidden ${ts.addressBar}`}
              >
                <div className="flex items-center gap-1 text-[11px] font-medium truncate">
                  {getBreadcrumbs().map((bc, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToFolder(bc.id);
                        }}
                        className="hover:underline hover:text-purple-600 cursor-pointer px-1 shrink-0"
                      >
                        {bc.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className={`${containerWidth < 500 ? 'w-28' : 'w-48'} relative transition-all shrink-0`}>
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50 text-gray-500" />
            <input
              type="text"
              placeholder={containerWidth < 500 ? "Search..." : "Search current folder..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 outline-none text-xs rounded-md bg-black/5 hover:bg-black/10 focus:bg-white focus:ring-1 focus:ring-purple-500/50 border border-transparent focus:border-purple-300 placeholder:opacity-60 text-current"
            />
          </div>
        </div>

        {/* Toolbar Action Ribbon */}
        <div className="flex items-center justify-between border-t border-black/5 bg-black/5 py-1 px-3 flex-wrap gap-1">
          {/* `flex-nowrap` + `min-w-0 flex-1`: the group never wraps onto a
              second line — instead leftToolbarVisibleCount, computed against
              this container's actual measured width, decides how many
              buttons render inline before the rest fold into the "More
              Actions" overflow menu below. */}
          <div ref={leftToolbarRef} className="flex items-center gap-1.5 flex-nowrap min-w-0 flex-1 overflow-hidden">
            {leftToolbarVisibleCount > 0 && (
              <button
                ref={(el) => { leftButtonRefs.current[0] = el; }}
                onClick={handleCreateFolder}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded hover:bg-white/35 cursor-pointer shrink-0"
                title="New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {!isCompactRibbon && <span>New Folder</span>}
              </button>
            )}
            {leftToolbarVisibleCount > 1 && (
              <button
                ref={(el) => { leftButtonRefs.current[1] = el; }}
                onClick={handleCreateFile}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded hover:bg-white/35 cursor-pointer shrink-0"
                title="New Text File"
              >
                <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                {!isCompactRibbon && <span>New Text</span>}
              </button>
            )}

            {leftToolbarVisibleCount > 2 && (
              <>
                <span className="h-4 w-[1px] bg-black/10 mx-0.5 shrink-0" />
                <button
                  ref={(el) => { leftButtonRefs.current[2] = el; }}
                  onClick={handleUploadMenuClick}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded hover:bg-white/35 text-emerald-600 hover:text-emerald-700 cursor-pointer shrink-0"
                  title="Upload a file or folder"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  {!isCompactRibbon && <span>Upload</span>}
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>
              </>
            )}

            {leftToolbarVisibleCount > 3 && (
              <>
                <span className="h-4 w-[1px] bg-black/10 mx-0.5 shrink-0" />
                <button
                  ref={(el) => { leftButtonRefs.current[3] = el; }}
                  onClick={() => selectedItem && handleCut(selectedItem)}
                  disabled={!selectedItem}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 cursor-pointer shrink-0"
                >
                  <Scissors className="w-3.5 h-3.5 shrink-0" />
                  {!isCompactRibbon && <span>Cut</span>}
                </button>
              </>
            )}

            {leftToolbarVisibleCount > 4 && (
              <button
                ref={(el) => { leftButtonRefs.current[4] = el; }}
                onClick={() => selectedItem && handleCopy(selectedItem)}
                disabled={!selectedItem}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                {!isCompactRibbon && <span>Copy</span>}
              </button>
            )}

            {leftToolbarVisibleCount > 5 && (
              <button
                ref={(el) => { leftButtonRefs.current[5] = el; }}
                onClick={handlePaste}
                disabled={!clipboard}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 cursor-pointer shrink-0"
              >
                <Clipboard className="w-3.5 h-3.5 shrink-0" />
                {!isCompactRibbon && <span>Paste</span>}
              </button>
            )}

            {leftToolbarVisibleCount > 6 && (
              <button
                ref={(el) => { leftButtonRefs.current[6] = el; }}
                onClick={() => selectedItem && handleDuplicate(selectedItem)}
                disabled={!selectedItem}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 cursor-pointer shrink-0"
                title="Duplicate selection"
              >
                <Copy className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                {!isCompactRibbon && <span>Duplicate</span>}
              </button>
            )}

            {leftToolbarVisibleCount > 7 && (
              <>
                <span className="h-4 w-[1px] bg-black/10 mx-0.5 shrink-0" />
                <button
                  ref={(el) => { leftButtonRefs.current[7] = el; }}
                  onClick={() => selectedItem && handleStartRename(selectedItem)}
                  disabled={!selectedItem}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  {!isCompactRibbon && <span>Rename</span>}
                </button>
              </>
            )}

            {leftToolbarVisibleCount > 8 && (
              <button
                ref={(el) => { leftButtonRefs.current[8] = el; }}
                onClick={() => selectedItem && handleDeleteItem(selectedItem)}
                disabled={!selectedItem}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded hover:bg-white/35 text-rose-500 disabled:opacity-35 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                {!isCompactRibbon && <span>Delete</span>}
              </button>
            )}

            {leftToolbarVisibleCount < leftToolbarActions.length && (
              <>
                <span className="h-4 w-[1px] bg-black/10 mx-0.5 shrink-0" />
                <button
                  onClick={handleLeftToolbarOverflowClick}
                  className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-white/35 cursor-pointer shrink-0"
                  title="More Actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* VIEW MODE & TYPE FILTER TOGGLES */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Filter Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-7 px-2 text-[11px] font-semibold rounded bg-white/40 dark:bg-black/40 border border-black/10 focus:outline-none cursor-pointer"
            >
              <option value="all">Filter: All Types</option>
              <option value="documents">Documents</option>
              <option value="images">Images</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
              <option value="code">Code/Text</option>
              <option value="archives">Archives</option>
            </select>

            <span className="h-4 w-[1px] bg-black/10 mx-0.5" />

            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white/60 shadow-xs' : 'hover:bg-white/35'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white/60 shadow-xs' : 'hover:bg-white/35'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <span className="h-4 w-[1px] bg-black/10 mx-0.5" />
            <button
              onClick={() => setShowDetailsPane(!showDetailsPane)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                showDetailsPane ? 'bg-white/60 text-purple-600' : 'hover:bg-white/35'
              }`}
              title="Toggle Details Pane"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-Selection Banner */}
        {selectedFileIds.length > 1 && (
          <div className="bg-purple-600 text-white px-4 py-1.5 text-xs flex items-center justify-between font-semibold">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              <span>{selectedFileIds.length} items selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  selectedFileIds.forEach((id) => {
                    const item = files.find((f) => f.id === id);
                    if (item) handleDownloadFile(item);
                  });
                }}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download Selected
              </button>
              <button
                onClick={() => {
                  if (confirm(`Move selected ${selectedFileIds.length} items to Trash?`)) {
                    selectedFileIds.forEach((id) => {
                      const item = files.find((f) => f.id === id);
                      if (item) handleDeleteFile(item);
                    });
                    setSelectedFileIds([]);
                  }
                }}
                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 rounded text-[11px] cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete Selected
              </button>
              <button
                onClick={() => setSelectedFileIds([])}
                className="px-2 py-1 hover:bg-white/20 rounded text-[11px] cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Trash Banner when inside Trash Bin */}
        {isTrashFolder && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs flex items-center justify-between text-rose-600 dark:text-rose-400 font-semibold">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Recycle Bin ({deletedFiles.length} item{deletedFiles.length === 1 ? '' : 's'})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  deletedFiles.forEach((item) => handleRestoreFile(item));
                  alert('Restored all files from Trash!');
                }}
                className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 cursor-pointer text-[11px] font-bold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restore All Items
              </button>
              <button
                onClick={handleEmptyTrash}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-500 cursor-pointer text-[11px] font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Empty Trash
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 2. MAIN LAYOUT: SIDEBAR, STAGE, DETAILS ==================== */}
      <div className="flex-1 flex overflow-hidden relative" onContextMenu={(e) => handleContextMenu(e, null)}>
        {/* LEFT NAVIGATION TREE SIDEBAR */}
        <div className={`transition-all duration-150 ${isCompactSidebar ? 'w-12 p-1' : 'w-52 p-2.5'} flex flex-col gap-0.5 shrink-0 overflow-y-auto select-none ${ts.sidebar}`}>
          {/* CORE PLACES */}
          {[
            { id: 'home', label: 'Home', icon: Home, targetFolderId: null },
            { id: 'recent', label: 'Recent', icon: Clock, targetFolderId: 'recent' },
            { id: 'starred', label: 'Starred', icon: Star, targetFolderId: 'starred' },
            { id: 'shared-with-me', label: 'Shared with me', icon: Users, targetFolderId: 'shared-with-me' },
            { id: 'trash', label: 'Trash Bin', icon: Trash2, targetFolderId: 'trash' },
          ].map((item) => {
            const isActive =
              (item.id === 'home' && currentFolderId === null) ||
              currentFolderId === item.targetFolderId;
            const IconComponent = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleSidebarClick(item.targetFolderId)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFolderDrop(e, item.targetFolderId)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center gap-3 text-[13.5px] cursor-pointer ${
                  isActive ? ts.sidebarBtnActive : ts.sidebarBtn
                } ${isCompactSidebar ? 'justify-center px-0 py-2.5' : ''}`}
                title={isCompactSidebar ? item.label : undefined}
              >
                <IconComponent className="w-[18px] h-[18px] shrink-0 stroke-[1.8]" />
                {!isCompactSidebar && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          <div className="my-2 mx-1 border-t border-neutral-300/80 dark:border-white/10" />

          {/* PINNED FOLDERS */}
          {!isCompactSidebar && (
            <div className="px-3 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span>Pinned</span>
              <Pin className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          )}

          {pinnedFolderIds.map((folderId) => {
            const folderItem = files.find((f) => f.id === folderId);
            const folderName = folderItem ? folderItem.name : getFolderLabel(folderId);
            const IconComponent = getFolderIcon(folderId, folderName);
            const isActive = currentFolderId === folderId;

            return (
              <button
                key={folderId}
                onClick={() => handleSidebarClick(folderId)}
                onContextMenu={(e) => handleSidebarItemContextMenu(e, folderId, folderName)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFolderDrop(e, folderId)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center gap-3 text-[13.5px] cursor-pointer group ${
                  isActive ? ts.sidebarBtnActive : ts.sidebarBtn
                } ${isCompactSidebar ? 'justify-center px-0 py-2.5' : ''}`}
                title={isCompactSidebar ? folderName : undefined}
              >
                <IconComponent className="w-[18px] h-[18px] shrink-0 stroke-[1.8]" />
                {!isCompactSidebar && <span className="truncate flex-1">{folderName}</span>}
              </button>
            );
          })}

        </div>

        {/* MIDDLE EXPLORER CANVAS AREA */}
        <div
          ref={explorerAreaRef}
          id="file-explorer-canvas"
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
          className={`flex-1 flex flex-col overflow-hidden relative transition-all ${
            isDragOverCanvas ? 'ring-4 ring-purple-500/50 bg-purple-500/5' : ''
          }`}
        >
          {isDragOverCanvas && (
            <div className="absolute inset-0 z-[100] bg-purple-600/20 backdrop-blur-xs flex flex-col items-center justify-center text-purple-600 dark:text-purple-300 font-bold border-2 border-dashed border-purple-500 rounded-2xl m-4">
              <Upload className="w-12 h-12 mb-2 animate-bounce" />
              <span>Drop files here to upload to current folder</span>
            </div>
          )}

          {folderNotFoundId ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-60 text-xs select-none p-4 text-center gap-1">
              <FolderX className="w-12 h-12 stroke-[1.2] mb-2 text-current" />
              <span className="font-semibold text-sm">Folder not found</span>
              <span className="max-w-xs opacity-70">
                This folder doesn't exist, was deleted, or you don't have access to it.
              </span>
              <button
                onClick={() => navigateToFolder(null)}
                className="mt-3 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-500 transition-colors cursor-pointer"
              >
                Go to Home
              </button>
            </div>
          ) : currentFolderId === 'shared-with-me' && sharedWithMeLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-60 text-xs select-none p-4 text-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-current" />
              <span>Loading what's been shared with you...</span>
            </div>
          ) : currentFolderId === 'shared-with-me' && sharedWithMeError ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-70 text-xs select-none p-4 text-center gap-1">
              <AlertCircle className="w-10 h-10 mb-1 text-rose-500" />
              <span className="font-semibold text-sm text-rose-500">{sharedWithMeError}</span>
            </div>
          ) : sortedItems.length === 0 && currentFolderId === 'shared-with-me' ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-xs select-none p-4 text-center">
              <Users className="w-12 h-12 stroke-[1.2] mb-3 text-current" />
              <span>Nothing has been shared with you yet.</span>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-xs select-none p-4 text-center">
              <Folder className="w-12 h-12 stroke-[1.2] mb-3 text-current" />
              <span>This folder is empty.</span>
              {searchQuery && <span className="mt-1">Try clearing your search or filter options.</span>}
              <button
                onClick={handleUploadClick}
                className="mt-3 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-500 transition-colors cursor-pointer"
              >
                Upload Files
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div
              className="flex-1 p-4 overflow-y-auto custom-scrollbar select-none grid gap-3.5 content-start"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 120px))',
              }}
            >
              {sortedItems.map((item) => {
                const isSelected = selectedFileIds.includes(item.id);
                const isBeingRenamed = renamingId === item.id;
                const isClipboardCut = clipboard && clipboard.id === item.id && clipboard.action === 'cut';
                const isDropTarget = item.type === 'folder' && dragOverFolderId === item.id;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragEnd={handleItemDragEnd}
                    onDragEnter={(e) => item.type === 'folder' && handleFolderDragEnter(e, item.id)}
                    onDragLeave={() => item.type === 'folder' && handleFolderDragLeave(item.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => item.type === 'folder' && handleFolderDrop(e, item.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.ctrlKey || e.metaKey) {
                        setSelectedFileIds((prev) =>
                          prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id]
                        );
                      } else {
                        setSelectedFileIds([item.id]);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleItemDoubleClick(item);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer group transition-all relative ${
                      isSelected ? ts.gridCardSelected : ts.gridCard
                    } ${isClipboardCut ? 'opacity-40 border-dashed border-purple-500/50' : ''} ${
                      isDropTarget ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''
                    }`}
                  >
                    {/* Star badge */}
                    {item.starred && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 absolute top-2 right-2" />
                    )}

                    {/* Shared badge */}
                    {item.isShared && (
                      <span className="absolute top-2 left-2" title="Shared with others">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                      </span>
                    )}

                    <div className="mb-2.5 group-hover:scale-105 transition-transform select-none">
                      {renderFileIcon(item, 'large')}
                    </div>

                    {isBeingRenamed ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={handleSaveRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full text-center text-xs p-0.5 rounded bg-white text-black font-semibold border border-purple-500 focus:outline-none"
                      />
                    ) : (
                      <div className="text-xs font-semibold w-full truncate px-1" title={item.name}>
                        {item.name}
                      </div>
                    )}

                    <div className="text-[9px] opacity-60 mt-1 uppercase font-medium select-none">
                      {item.type === 'folder' ? 'Folder' : getItemSizeString(item)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DETAILS LIST VIEW */
            <div className="flex-1 flex flex-col overflow-y-auto select-none custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${ts.listHeader} sticky top-0 z-10`}>
                    <th
                      className="p-3 pl-4 cursor-pointer hover:bg-black/5"
                      onClick={() => {
                        setSortOrder(sortField === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                        setSortField('name');
                      }}
                    >
                      <span className="flex items-center gap-1">
                        Name {sortField === 'name' && (sortOrder === 'asc' ? '▴' : '▾')}
                      </span>
                    </th>
                    {containerWidth >= 380 && (
                      <th
                        className="p-3 cursor-pointer hover:bg-black/5"
                        onClick={() => {
                          setSortOrder(sortField === 'type' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setSortField('type');
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Type {sortField === 'type' && (sortOrder === 'asc' ? '▴' : '▾')}
                        </span>
                      </th>
                    )}
                    {containerWidth >= 500 && (
                      <th
                        className="p-3 cursor-pointer hover:bg-black/5"
                        onClick={() => {
                          setSortOrder(sortField === 'date' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setSortField('date');
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Date {sortField === 'date' && (sortOrder === 'asc' ? '▴' : '▾')}
                        </span>
                      </th>
                    )}
                    {containerWidth >= 500 && (
                      <th
                        className="p-3 cursor-pointer hover:bg-black/5"
                        onClick={() => {
                          setSortOrder(sortField === 'size' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setSortField('size');
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Size {sortField === 'size' && (sortOrder === 'asc' ? '▴' : '▾')}
                        </span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const isSelected = selectedFileIds.includes(item.id);
                    const isBeingRenamed = renamingId === item.id;
                const isClipboardCut = clipboard && clipboard.id === item.id && clipboard.action === 'cut';
                    const isDropTarget = item.type === 'folder' && dragOverFolderId === item.id;

                    return (
                      <tr
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleItemDragStart(e, item)}
                        onDragEnd={handleItemDragEnd}
                        onDragEnter={(e) => item.type === 'folder' && handleFolderDragEnter(e, item.id)}
                        onDragLeave={() => item.type === 'folder' && handleFolderDragLeave(item.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => item.type === 'folder' && handleFolderDrop(e, item.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.ctrlKey || e.metaKey) {
                            setSelectedFileIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((i) => i !== item.id)
                                : [...prev, item.id]
                            );
                          } else {
                            setSelectedFileIds([item.id]);
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleItemDoubleClick(item);
                        }}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        className={`text-xs ${ts.listRow} ${
                          isSelected ? ts.listRowSelected + ' ' + ts.gridCardSelected : ''
                        } ${isClipboardCut ? 'opacity-40 bg-purple-500/5' : ''} ${
                          isDropTarget ? 'ring-2 ring-inset ring-purple-500 bg-purple-500/10' : ''
                        }`}
                      >
                        <td className="p-2.5 pl-4 flex items-center gap-2 font-medium">
                          {renderFileIcon(item, 'small')}
                          {isBeingRenamed ? (
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onBlur={handleSaveRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename();
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="text-xs px-1 rounded bg-white text-black border border-purple-500 focus:outline-none font-semibold w-full max-w-[150px]"
                            />
                          ) : (
                            <span className="truncate w-full block max-w-[200px]" title={item.name}>
                              {item.name}
                            </span>
                          )}
                          {item.starred && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                          {item.isShared && (
                            <span title="Shared with others">
                              <Users className="w-3 h-3 text-blue-500 shrink-0" />
                            </span>
                          )}
                        </td>
                        {containerWidth >= 380 && <td className="p-2.5">{getItemTypeString(item)}</td>}
                        {containerWidth >= 500 && <td className="p-2.5">{item.createdAt}</td>}
                        {containerWidth >= 500 && <td className="p-2.5">{item.type === 'folder' ? '--' : getItemSizeString(item)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT SIDE DETAILS PROPERTIES PANEL */}
        {showDetailsPane && (
          <div className={`w-64 flex flex-col shrink-0 overflow-y-auto select-none ${ts.rightPane}`}>
            <div className={`p-4 ${ts.rightPaneHeader} flex items-center justify-between`}>
              <span className="text-xs font-extrabold uppercase tracking-wider text-current/60 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-purple-500" />
                Properties Pane
              </span>
              <button
                onClick={() => setShowDetailsPane(false)}
                className="p-1 hover:bg-black/5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedItem ? (
              <div className="p-4 flex flex-col items-center text-center gap-4">
                <div className="filter drop-shadow-md py-2 select-none flex items-center justify-center">
                  {renderFileIcon(selectedItem, 'xl')}
                </div>

                <div className="w-full">
                  <h4 className="font-bold text-sm truncate px-2 text-current w-full" title={selectedItem.name}>
                    {selectedItem.name}
                  </h4>
                  <p className="text-[10px] uppercase font-bold text-purple-600 mt-1">
                    {getItemTypeString(selectedItem)}
                  </p>
                </div>

                <div className="w-full border-t border-black/5 pt-3 text-xs text-left flex flex-col gap-2 bg-black/5 p-3 rounded-xl">
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase tracking-wide">Path:</span>
                    <span className="font-medium break-all text-[11px]">{getCurrentFolderPathString()}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase tracking-wide">Size on disk:</span>
                    <span className="font-semibold text-xs text-current">{getItemSizeString(selectedItem)}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase tracking-wide">Created:</span>
                    <span className="font-medium">{selectedItem.createdAt}</span>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-2 mt-1">
                  <button
                    onClick={() => handleItemDoubleClick(selectedItem)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    Open / Preview
                  </button>
                  <button
                    onClick={() => setActiveShareItem(selectedItem)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Item
                  </button>
                  {selectedItem.type === 'file' && (
                    <button
                      onClick={() => handleDownloadFile(selectedItem)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download File
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteItem(selectedItem)}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Move to Trash
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-40 text-xs">
                <Info className="w-7 h-7 mb-2 stroke-[1.2]" />
                Select a file or folder to view properties.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== 3. WINDOW STATUS BAR CONTENT ==================== */}
      <WindowStatus
        left={
          <div id="status-bar-items-count" className="flex items-center gap-1.5 shrink-0">
            <span>{currentItems.length} item{currentItems.length === 1 ? '' : 's'}</span>
            {searchQuery && (
              <span id="status-bar-filtered-count" className="opacity-60 bg-black/5 px-1.5 py-0.5 rounded text-[10px]">
                Filtered: {sortedItems.length}
              </span>
            )}
          </div>
        }
        center={
          <div id="status-bar-selection-info" className="truncate text-center">
            {selectedFileIds.length > 0 ? (
              <span className="text-purple-600 font-bold">
                {selectedFileIds.length} item{selectedFileIds.length === 1 ? '' : 's'} selected
              </span>
            ) : (
              <span className="opacity-50">Select an item to view properties</span>
            )}
          </div>
        }
        right={
          uploadProgress ? (
            <div id="status-bar-upload-progress" className="flex items-center gap-2 shrink-0">
              <span className="truncate max-w-[220px]">
                Uploading {Math.min(uploadProgress.completed + 1, uploadProgress.total)} of {uploadProgress.total}
                {uploadProgress.currentFileName ? ` — ${uploadProgress.currentFileName}` : ''}
              </span>
              <div className="w-24 h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div className="h-full bg-blue-500 transition-[width] duration-150" style={{ width: `${uploadOverallPercent}%` }} />
              </div>
              <span className="tabular-nums w-9 text-right">{uploadOverallPercent}%</span>
            </div>
          ) : undefined
        }
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />

      {/* Hidden Folder Input — webkitdirectory limits the native picker to
          directories; the browser still hands back every file inside it.
          Set via the DOM directly since it isn't part of React's JSX typings
          for <input>. */}
      <input
        ref={(el) => {
          folderInputRef.current = el;
          el?.setAttribute('webkitdirectory', '');
          el?.setAttribute('directory', '');
        }}
        type="file"
        onChange={handleFolderUpload}
        className="hidden"
        multiple
      />

      {/* Modals */}
      <ShareModal
        fileItem={activeShareItem}
        isOpen={!!activeShareItem}
        onClose={() => setActiveShareItem(null)}
        onSharedChanged={(fileId, isShared) => {
          setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, isShared } : f)));
          setActiveShareItem((prev) => (prev && prev.id === fileId ? { ...prev, isShared } : prev));
        }}
      />

      <MoveModal
        itemToMove={activeMoveItem}
        allFiles={files}
        isOpen={!!activeMoveItem}
        onClose={() => setActiveMoveItem(null)}
        onConfirmMove={async (targetFolderId) => {
          if (!activeMoveItem) return;
          const updated = files.map((f) =>
            f.id === activeMoveItem.id ? { ...f, parentId: targetFolderId } : f
          );
          setFiles(updated);
          setActiveMoveItem(null);

          if (currentUser) {
            try {
              await FileService.moveFile(activeMoveItem.id, targetFolderId);
            } catch (error) {
              console.warn('Failed to move file on backend:', error);
            }
          }
        }}
      />

      <FilePreviewModal
        item={activePreviewItem}
        isOpen={!!activePreviewItem}
        onClose={() => setActivePreviewItem(null)}
        onDownload={handleDownloadFile}
        onShare={(item) => setActiveShareItem(item)}
      />

      <PropertiesModal
        item={activePropertiesItem}
        isOpen={!!activePropertiesItem}
        onClose={() => setActivePropertiesItem(null)}
        onToggleStar={handleToggleStar}
        onShare={(item) => setActiveShareItem(item)}
        onDownload={handleDownloadFile}
        onDelete={handleDeleteItem}
        folderPathString={getCurrentFolderPathString()}
      />

      <OpenWithModal
        item={activeOpenWithItem}
        isOpen={!!activeOpenWithItem}
        onClose={() => setActiveOpenWithItem(null)}
        onSelectApp={handleOpenWithApp}
      />
    </div>
  );
}
