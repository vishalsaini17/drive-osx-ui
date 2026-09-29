import React, { useEffect, useState } from 'react';
import { History, X } from 'lucide-react';
import { FileService, FileVersion } from '../../../platform/files/FileService';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string | null;
  /** Called after a successful restore, so the caller can reload the deck from the now-current file. */
  onRestored: () => void;
}

/**
 * File > Version history… — same real `FileService.listVersions`/
 * `restoreVersion` backend Word Book's own version-history dialog already
 * uses (apps/wordbook/components/VersionHistoryModal.tsx); versioning is
 * generic to any file in this platform, not specific to `.book` files, so
 * this is the same feature with this app's own styling rather than a
 * separate mechanism.
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Version history</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto text-sm">
          {!fileId ? (
            <p className="text-slate-500">Save the presentation at least once to see its version history.</p>
          ) : loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : error ? (
            <p className="text-rose-600">{error}</p>
          ) : versions.length === 0 ? (
            <p className="text-slate-500">No earlier versions yet — a version is created each time the presentation is saved.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">Version {v.versionNo}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {new Date(v.createdAt).toLocaleString()} · {(v.size / 1024).toFixed(1)} KB
                      {v.comment ? ` · ${v.comment}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRestore(v.id)}
                    disabled={restoringId !== null}
                    className="shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    {restoringId === v.id ? 'Restoring…' : 'Restore'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
