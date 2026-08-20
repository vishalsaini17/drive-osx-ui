import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { X, Folder, ChevronRight, ChevronDown, FileCode, FilePlus, FolderPlus, RefreshCw, Loader2 } from 'lucide-react';
import { FileService, FileItemResponse } from '../../../platform/files/FileService';
import { FileItem } from '../../../platform/types';
import { useContextMenuStore, ContextMenuItem } from '../../../shell/context-menu/contextMenuStore';

// Same custom MIME type File Explorer's own internal drags use — an
// HTML5 drag's `dataTransfer` is readable by any drop target in the same
// document regardless of which app's window the drag started in, so this
// sidebar and File Explorer can drag files into each other for free.
const INTERNAL_DRAG_TYPE = 'application/x-drive-osx-file-item';

function toFileItem(f: FileItemResponse): FileItem {
  return { id: f.id, name: f.name, type: f.type, parentId: f.parentId, createdAt: f.createdAt };
}

function sortEntries(files: FileItemResponse[]): FileItemResponse[] {
  return [...files].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
}

type NodeState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; entries: FileItemResponse[] };

interface TreeContextValue {
  getNode: (folderId: string | null) => NodeState | undefined;
  ensureLoaded: (folderId: string | null) => void;
  refresh: (folderId: string | null) => void;
  createEntry: (parentId: string | null, type: 'file' | 'folder') => void;
  renameEntry: (item: FileItemResponse) => void;
  deleteEntry: (item: FileItemResponse) => void;
  moveEntry: (itemId: string, targetFolderId: string | null) => void;
  activeFileId: string | null;
  onOpenFile: (file: FileItem) => void;
  draggedId: string | null;
  setDraggedId: React.Dispatch<React.SetStateAction<string | null>>;
  dragOverId: string | null;
  setDragOverId: React.Dispatch<React.SetStateAction<string | null>>;
}

const TreeContext = createContext<TreeContextValue | null>(null);
function useTree(): TreeContextValue {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error('useTree must be used within ExplorerSidebar');
  return ctx;
}

function dragHasInternalType(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(INTERNAL_DRAG_TYPE);
}

interface RowProps {
  depth: number;
}

function FolderRow({ folder, depth }: RowProps & { folder: FileItemResponse }) {
  const tree = useTree();
  const node = tree.getNode(folder.id);
  const expanded = node !== undefined;
  const isDragOver = tree.dragOverId === folder.id;
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu);

  const toggle = () => tree.ensureLoaded(folder.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    const items: ContextMenuItem[] = [
      { label: 'New File…', icon: <FilePlus className="w-3.5 h-3.5" />, onClick: () => tree.createEntry(folder.id, 'file') },
      { label: 'New Folder…', icon: <FolderPlus className="w-3.5 h-3.5" />, onClick: () => tree.createEntry(folder.id, 'folder') },
      { divider: true },
      { label: 'Rename', shortcut: 'F2', onClick: () => tree.renameEntry(folder) },
      { label: 'Delete', danger: true, onClick: () => tree.deleteEntry(folder) },
      { divider: true },
      { label: 'Refresh', icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => tree.refresh(folder.id) },
    ];
    openContextMenu(e, items, folder.name);
  };

  return (
    <div
      onDragOver={(e) => {
        if (!dragHasInternalType(e)) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragEnter={(e) => {
        if (!dragHasInternalType(e)) return;
        e.preventDefault();
        tree.setDragOverId(folder.id);
      }}
      onDragLeave={() => tree.setDragOverId((current) => (current === folder.id ? null : current))}
      onDrop={(e) => {
        if (!dragHasInternalType(e)) return;
        e.preventDefault();
        e.stopPropagation();
        tree.setDragOverId(null);
        const itemId = e.dataTransfer.getData(INTERNAL_DRAG_TYPE);
        if (itemId) tree.moveEntry(itemId, folder.id);
      }}
    >
      <button
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(INTERNAL_DRAG_TYPE, folder.id);
          e.dataTransfer.setData('text/plain', folder.id);
          e.dataTransfer.effectAllowed = 'move';
          tree.setDraggedId(folder.id);
        }}
        onDragEnd={() => tree.setDraggedId(null)}
        onClick={toggle}
        onContextMenu={handleContextMenu}
        className={`w-full flex items-center gap-1 px-2 py-[3px] text-[13px] text-[var(--wb-fg)]/80 hover:bg-[var(--wb-fg)]/10 cursor-pointer ${
          isDragOver ? 'bg-[var(--wb-drag-over)] outline outline-1 outline-[var(--wb-accent)]' : ''
        } ${tree.draggedId === folder.id ? 'opacity-40' : ''}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        title={folder.name}
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--wb-fg)]/40" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--wb-fg)]/40" />}
        <Folder className="w-3.5 h-3.5 shrink-0 text-[var(--wb-folder)]" />
        <span className="truncate">{folder.name}</span>
      </button>
      {expanded && <NodeChildren folderId={folder.id} depth={depth + 1} />}
    </div>
  );
}

function FileRow({ file, depth }: RowProps & { file: FileItemResponse }) {
  const tree = useTree();
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu);
  const active = file.id === tree.activeFileId;

  const handleContextMenu = (e: React.MouseEvent) => {
    const items: ContextMenuItem[] = [
      { label: 'Open', onClick: () => tree.onOpenFile(toFileItem(file)) },
      { divider: true },
      { label: 'Rename', shortcut: 'F2', onClick: () => tree.renameEntry(file) },
      { label: 'Delete', danger: true, onClick: () => tree.deleteEntry(file) },
    ];
    openContextMenu(e, items, file.name);
  };

  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(INTERNAL_DRAG_TYPE, file.id);
        e.dataTransfer.setData('text/plain', file.id);
        e.dataTransfer.effectAllowed = 'move';
        tree.setDraggedId(file.id);
      }}
      onDragEnd={() => tree.setDraggedId(null)}
      onClick={() => tree.onOpenFile(toFileItem(file))}
      onContextMenu={handleContextMenu}
      className={`w-full flex items-center gap-1.5 py-[3px] text-[13px] cursor-pointer ${
        active ? 'bg-[var(--wb-selected)] text-[var(--wb-fg)]' : 'text-[var(--wb-fg)]/70 hover:bg-[var(--wb-fg)]/10 hover:text-[var(--wb-fg)]'
      } ${tree.draggedId === file.id ? 'opacity-40' : ''}`}
      style={{ paddingLeft: 8 + depth * 12 + 16 }}
      title={file.name}
    >
      <FileCode className="w-3.5 h-3.5 shrink-0 text-[var(--wb-accent)]" />
      <span className="truncate">{file.name}</span>
    </button>
  );
}

function NodeChildren({ folderId, depth }: { folderId: string | null; depth: number }) {
  const tree = useTree();
  const node = tree.getNode(folderId);

  if (!node || node.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[var(--wb-fg)]/30 py-1" style={{ paddingLeft: 8 + depth * 12 }}>
        <Loader2 className="w-3 h-3 animate-spin" /> Loading…
      </div>
    );
  }
  if (node.status === 'error') {
    return (
      <div className="text-[11px] text-red-400/70 py-1" style={{ paddingLeft: 8 + depth * 12 }}>
        Couldn't load this folder.
      </div>
    );
  }
  if (node.entries.length === 0) {
    return (
      <div className="text-[11px] text-[var(--wb-fg)]/25 italic py-1" style={{ paddingLeft: 8 + depth * 12 }}>
        This folder is empty
      </div>
    );
  }
  return (
    <>
      {node.entries.map((entry) =>
        entry.type === 'folder' ? (
          <FolderRow key={entry.id} folder={entry} depth={depth} />
        ) : (
          <FileRow key={entry.id} file={entry} depth={depth} />
        )
      )}
    </>
  );
}

interface ExplorerSidebarProps {
  rootId: string | null;
  rootName: string;
  activeFileId: string | null;
  onOpenFile: (file: FileItem) => void;
  onCloseFolder: () => void;
  /** A file/folder was created, renamed, deleted, or moved — lets the app resync anything outside this tree's own cache (e.g. the platform's root file list, or a tab whose file got renamed). */
  onMutated?: (kind: 'create' | 'rename' | 'delete' | 'move', item: FileItemResponse) => void;
  /** The open folder itself was renamed somewhere else (e.g. File Explorer) since it was opened here — lets the app update the persisted "open folder" name so the header stops showing the old one. */
  onRootRenamed?: (newName: string) => void;
}

/**
 * File > Open Folder's result: a real lazy-loaded, mutable tree rooted at the
 * chosen folder, backed by the same FileService the rest of the platform
 * uses. Every create/rename/delete/move here is a genuine API call — none of
 * this is optimistic-only decoration.
 */
export default function ExplorerSidebar({ rootId, rootName, activeFileId, onOpenFile, onCloseFolder, onMutated, onRootRenamed }: ExplorerSidebarProps) {
  const [nodes, setNodes] = useState<Map<string | null, NodeState>>(new Map());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu);

  // Opening a different folder starts with a clean cache.
  useEffect(() => {
    setNodes(new Map());
  }, [rootId]);

  // The open folder's own name is only known from whatever it was when File
  // > Open Folder was used — if it gets renamed from elsewhere (File
  // Explorer, another window) while still open here, nothing pushes that
  // change in. Checking on open and on every manual refresh keeps the
  // header from silently going stale without needing realtime sync
  // infrastructure this platform doesn't have.
  const checkRootName = useCallback(() => {
    if (rootId === null) return;
    void FileService.getFile(rootId).then((fresh) => {
      if (fresh && fresh.name !== rootName) onRootRenamed?.(fresh.name);
    });
  }, [rootId, rootName, onRootRenamed]);
  useEffect(() => {
    checkRootName();
    // Only when the folder identity changes — `rootName` itself changing is
    // the effect of this check, not a reason to re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId]);

  const load = useCallback((folderId: string | null) => {
    setNodes((prev) => {
      const next = new Map(prev);
      next.set(folderId, { status: 'loading' });
      return next;
    });
    FileService.listChildren(folderId)
      .then((entries) => {
        setNodes((prev) => {
          const next = new Map(prev);
          next.set(folderId, { status: 'ready', entries: sortEntries(entries) });
          return next;
        });
      })
      .catch(() => {
        setNodes((prev) => {
          const next = new Map(prev);
          next.set(folderId, { status: 'error' });
          return next;
        });
      });
  }, []);

  // React batches sequential setState updater calls within one handler, so a
  // second `setNodes` call here would see its own first call's result rather
  // than genuinely fresh state — this ref mirror is what lets the toggle
  // read "is it currently expanded" synchronously and correctly.
  const nodesRef = React.useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const ensureLoaded = useCallback(
    (folderId: string | null) => {
      if (nodesRef.current.has(folderId)) {
        setNodes((prev) => {
          const next = new Map(prev);
          next.delete(folderId);
          return next;
        });
      } else {
        load(folderId);
      }
    },
    [load]
  );

  const refresh = useCallback((folderId: string | null) => load(folderId), [load]);

  const patchParent = useCallback((parentId: string | null, updater: (entries: FileItemResponse[]) => FileItemResponse[]) => {
    setNodes((prev) => {
      const current = prev.get(parentId);
      if (!current || current.status !== 'ready') return prev;
      const next = new Map(prev);
      next.set(parentId, { status: 'ready', entries: sortEntries(updater(current.entries)) });
      return next;
    });
  }, []);

  const createEntry = useCallback(
    async (parentId: string | null, type: 'file' | 'folder') => {
      const defaultName = type === 'folder' ? 'New Folder' : 'untitled.txt';
      const name = prompt(type === 'folder' ? 'Name of new folder:' : 'Name of new file:', defaultName);
      if (!name) return;
      try {
        const created = await FileService.createFile(
          type === 'folder' ? { name, type, parentId } : { name, type, parentId, content: '', mimeType: 'text/plain' }
        );
        patchParent(parentId, (entries) => [...entries, created]);
        onMutated?.('create', created);
      } catch (error) {
        alert(`Couldn't create "${name}". Please try again.`);
      }
    },
    [patchParent, onMutated]
  );

  const renameEntry = useCallback(
    async (item: FileItemResponse) => {
      const name = prompt('New name:', item.name);
      if (!name || name === item.name) return;
      try {
        const updated = await FileService.updateFile(item.id, { name });
        patchParent(item.parentId, (entries) => entries.map((e) => (e.id === item.id ? updated : e)));
        onMutated?.('rename', updated);
      } catch (error) {
        alert(`Couldn't rename "${item.name}". Please try again.`);
      }
    },
    [patchParent, onMutated]
  );

  const deleteEntry = useCallback(
    async (item: FileItemResponse) => {
      if (!confirm(`Move "${item.name}" to Trash?`)) return;
      try {
        await FileService.deleteFile(item.id);
        patchParent(item.parentId, (entries) => entries.filter((e) => e.id !== item.id));
        onMutated?.('delete', item);
      } catch (error) {
        alert(`Couldn't delete "${item.name}". Please try again.`);
      }
    },
    [patchParent, onMutated]
  );

  const moveEntry = useCallback(
    async (itemId: string, targetFolderId: string | null) => {
      if (itemId === targetFolderId) return;
      const item = await FileService.getFile(itemId);
      if (!item) return;
      if (item.parentId === targetFolderId) return;
      if (item.type === 'folder' && targetFolderId !== null) {
        // A folder can't be dropped into itself or one of its own descendants.
        // (Root is never a descendant of anything, so this check only applies
        // when the drop target is itself a real folder.)
        if (targetFolderId === item.id) {
          alert('Cannot move a folder into itself.');
          return;
        }
        const path = await FileService.breadcrumbs(targetFolderId).catch(() => []);
        if (path.some((p) => p.id === item.id)) {
          alert('Cannot move a folder into one of its own subfolders.');
          return;
        }
      }
      try {
        const moved = await FileService.moveFile(itemId, targetFolderId);
        patchParent(item.parentId, (entries) => entries.filter((e) => e.id !== itemId));
        patchParent(targetFolderId, (entries) => [...entries, moved]);
        onMutated?.('move', moved);
      } catch (error) {
        alert(`Couldn't move "${item.name}". Please try again.`);
      }
    },
    [patchParent, onMutated]
  );

  const ctx = useMemo<TreeContextValue>(
    () => ({
      getNode: (folderId) => nodes.get(folderId),
      ensureLoaded,
      refresh,
      createEntry,
      renameEntry,
      deleteEntry,
      moveEntry,
      activeFileId,
      onOpenFile,
      draggedId,
      setDraggedId,
      dragOverId,
      setDragOverId,
    }),
    [nodes, ensureLoaded, refresh, createEntry, renameEntry, deleteEntry, moveEntry, activeFileId, onOpenFile, draggedId, dragOverId]
  );

  // First mount / new root: load the root's own children immediately (it has no toggle row of its own).
  useEffect(() => {
    load(rootId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId]);

  const refreshRoot = useCallback(() => {
    refresh(rootId);
    checkRootName();
  }, [refresh, rootId, checkRootName]);

  const handleRootContextMenu = (e: React.MouseEvent) => {
    const items: ContextMenuItem[] = [
      { label: 'New File…', icon: <FilePlus className="w-3.5 h-3.5" />, onClick: () => createEntry(rootId, 'file') },
      { label: 'New Folder…', icon: <FolderPlus className="w-3.5 h-3.5" />, onClick: () => createEntry(rootId, 'folder') },
      { divider: true },
      { label: 'Refresh', icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: refreshRoot },
    ];
    openContextMenu(e, items, rootName);
  };

  const [sectionExpanded, setSectionExpanded] = useState(true);

  return (
    <TreeContext.Provider value={ctx}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="group/section flex items-center justify-between shrink-0 px-2 py-[3px] hover:bg-[var(--wb-fg)]/5">
          <button
            onClick={() => setSectionExpanded((v) => !v)}
            className="flex items-center gap-1 min-w-0 flex-1 text-[11px] font-bold tracking-wide text-[var(--wb-fg)]/70 cursor-pointer"
            title={rootName}
          >
            {sectionExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--wb-fg)]/40" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--wb-fg)]/40" />}
            <span className="truncate uppercase">{rootName}</span>
          </button>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/section:opacity-100 focus-within:opacity-100">
            <button onClick={() => createEntry(rootId, 'file')} title="New File…" className="p-1 rounded text-[var(--wb-fg)]/50 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-fg)]/10 cursor-pointer">
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => createEntry(rootId, 'folder')} title="New Folder…" className="p-1 rounded text-[var(--wb-fg)]/50 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-fg)]/10 cursor-pointer">
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button onClick={refreshRoot} title="Refresh Explorer" className="p-1 rounded text-[var(--wb-fg)]/50 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-fg)]/10 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCloseFolder} title="Close Folder" className="p-1 rounded text-[var(--wb-fg)]/50 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-fg)]/10 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {sectionExpanded && (
          <div
            className="flex-1 overflow-y-auto py-1"
            onContextMenu={handleRootContextMenu}
            onDragOver={(e) => {
              if (!dragHasInternalType(e)) return;
              e.preventDefault();
            }}
            onDrop={(e) => {
              if (!dragHasInternalType(e)) return;
              e.preventDefault();
              const itemId = e.dataTransfer.getData(INTERNAL_DRAG_TYPE);
              if (itemId) moveEntry(itemId, rootId);
            }}
          >
            <NodeChildren folderId={rootId} depth={0} />
          </div>
        )}
      </div>
    </TreeContext.Provider>
  );
}
