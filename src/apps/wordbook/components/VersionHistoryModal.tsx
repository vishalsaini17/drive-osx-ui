import React, { useEffect, useState } from 'react';
import WordBookModal from './WordBookModal';
import { FileService, FileVersion } from '../../../platform/files/FileService';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string | null;
  /** Called after a successful restore, so the caller can reload the editor's content from the now-current file. */
  onRestored: () => void;
}

/**
 * The first real UI for `FileService.listVersions`/`restoreVersion` in this
 * codebase — an existing "Version History" dialog elsewhere renders
 * hardcoded local state rather than calling the real API, which this
 * deliberately doesn't copy.
 */
export default function VersionHistoryModal({ isOpen, onClose, fileId, onRestored }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !fileId) return;
    setLoading(true);
    setError(null);
    FileService.listVersions(fileId)
      .then(setVersions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load version history.'))
      .finally(() => setLoading(false));
  }, [isOpen, fileId]);

  const handleRestore = async (versionId: string) => {
    if (!fileId) return;
    if (!confirm('Restore this version? Your current content becomes its own version first, so nothing is lost.')) return;
    setRestoringId(versionId);
    try {
      await FileService.restoreVersion(fileId, versionId);
      onRestored();
      onClose();
    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('Could not restore this version. Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <WordBookModal isOpen={isOpen} onClose={onClose} title="Version history" maxWidthClass="max-w-lg">
      {!fileId ? (
        <p className="text-zinc-500">Save the document at least once to see its version history.</p>
      ) : loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : error ? (
        <p className="text-rose-600">{error}</p>
      ) : versions.length === 0 ? (
        <p className="text-zinc-500">No earlier versions yet — a version is created each time the document is saved.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-2 px-2 py-2 rounded border border-transparent hover:border-zinc-200 hover:bg-zinc-50"
            >
              <div className="min-w-0">
                <div className="font-medium text-zinc-800">Version {v.versionNo}</div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {new Date(v.createdAt).toLocaleString()} · {(v.size / 1024).toFixed(1)} KB
                  {v.comment ? ` · ${v.comment}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleRestore(v.id)}
                disabled={restoringId !== null}
                className="shrink-0 px-2 py-1 text-[11px] rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
              >
                {restoringId === v.id ? 'Restoring…' : 'Restore'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </WordBookModal>
  );
}
