import React, { useEffect, useState } from 'react';
import { X, Folder, ChevronRight, Home, Loader2 } from 'lucide-react';
import { FileService, FileItemResponse } from '../../../platform/files/FileService';

interface Crumb {
  id: string | null;
  name: string;
}

interface OpenFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFolder: (folder: { id: string | null; name: string }) => void;
}

/**
 * File > Open Folder... — a real navigable folder browser backed by
 * FileService.listChildren, the same API the sidebar tree and File Explorer
 * itself use. Root (parentId: null) is "Home" — same label File Explorer's
 * own sidebar uses for it. There is no separate root folder id in this
 * platform, so it's addressed as `null` throughout, same as everywhere else
 * that walks the tree.
 */
export default function OpenFolderModal({ isOpen, onClose, onOpenFolder }: OpenFolderModalProps) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: 'Home' }]);
  const [entries, setEntries] = useState<FileItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = crumbs[crumbs.length - 1];

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    FileService.listChildren(current.id)
      .then((files) => {
        if (cancelled) return;
        setEntries(files.filter((f) => f.type === 'folder').sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (!cancelled) setError('This folder could not be loaded. Check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, current.id]);

  useEffect(() => {
    if (isOpen) setCrumbs([{ id: null, name: 'Home' }]);
  }, [isOpen]);

  if (!isOpen) return null;

  const enterFolder = (folder: FileItemResponse) => {
    setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const jumpToCrumb = (index: number) => {
    setCrumbs((prev) => prev.slice(0, index + 1));
  };

  const confirmOpen = () => {
    onOpenFolder({ id: current.id, name: current.name });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[var(--wb-surface-raised)] text-[var(--wb-fg)] w-full max-w-lg rounded-xl shadow-2xl border border-[var(--wb-border-subtle)] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-[var(--wb-border-subtle)] flex items-center justify-between bg-[var(--wb-surface-overlay)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--wb-accent)]/15 text-[var(--wb-accent)] flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Open Folder</h3>
              <p className="text-[11px] text-[var(--wb-fg)]/50">Choose a folder to browse in the Explorer sidebar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--wb-fg)]/40 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-fg)]/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-[var(--wb-border-subtle)] flex items-center gap-1 text-[11px] text-[var(--wb-fg)]/60 overflow-x-auto">
          {crumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id ?? 'root'}>
              {index > 0 && <ChevronRight className="w-3 h-3 shrink-0 text-[var(--wb-fg)]/30" />}
              <button
                onClick={() => jumpToCrumb(index)}
                className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--wb-fg)]/10 cursor-pointer ${
                  index === crumbs.length - 1 ? 'text-[var(--wb-fg)] font-medium' : ''
                }`}
              >
                {index === 0 && <Home className="w-3 h-3" />}
                <span className="truncate max-w-[140px]">{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="p-3 flex-1 overflow-y-auto text-xs min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-[var(--wb-fg)]/40 py-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="text-red-400/80 italic px-2">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-[var(--wb-fg)]/40 italic px-2 py-4">No subfolders here.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {entries.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => enterFolder(folder)}
                  className="p-2.5 rounded-lg border border-[var(--wb-fg)]/5 hover:bg-[var(--wb-fg)]/10 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <Folder className="w-4 h-4 text-[var(--wb-folder)] shrink-0" />
                  <span className="font-medium truncate flex-1">{folder.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--wb-fg)]/30 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[var(--wb-border-subtle)] bg-[var(--wb-surface-overlay)] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--wb-fg)]/40 truncate">
            Open: <span className="text-[var(--wb-fg)]/70">{current.name}</span>
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--wb-fg)]/10 hover:bg-[var(--wb-fg)]/15 text-[var(--wb-fg)] font-medium rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmOpen}
              className="px-4 py-2 bg-[var(--wb-accent-soft)] hover:bg-[var(--wb-accent-hover)] text-[var(--wb-on-accent)] font-medium rounded-lg text-xs transition-colors cursor-pointer"
            >
              Open Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
