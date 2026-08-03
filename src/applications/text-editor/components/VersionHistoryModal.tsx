import React from 'react';
import { X, Clock, RotateCcw, Plus, FileText, Check } from 'lucide-react';
import { DocumentVersion } from '../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: DocumentVersion[];
  onRestoreVersion: (version: DocumentVersion) => void;
  onCreateSnapshot: () => void;
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  onRestoreVersion,
  onCreateSnapshot,
}: VersionHistoryModalProps) {
  if (!isOpen) return null;

  const [selectedVersion, setSelectedVersion] = React.useState<DocumentVersion | null>(
    versions[0] || null
  );

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Document Version History</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Inspect auto-saved snapshots and restore previous revisions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateSnapshot}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Save Snapshot
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Split */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
          {/* Version List Sidebar */}
          <div className="p-3 overflow-y-auto max-h-[360px] md:max-h-full flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
              Snapshots ({versions.length})
            </span>
            {versions.map((ver, idx) => {
              const isSelected = selectedVersion?.id === ver.id;
              return (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 font-bold'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>{ver.label || (idx === 0 ? 'Current State' : `Version ${versions.length - idx}`)}</span>
                    {idx === 0 && <span className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded">Latest</span>}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 flex items-center justify-between">
                    <span>{ver.timestamp}</span>
                    <span>{ver.wordCount} words</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Version Content Preview */}
          <div className="md:col-span-2 p-4 flex flex-col overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/40">
            {selectedVersion ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-xs">{selectedVersion.label || 'Snapshot Preview'}</span>
                    <span className="text-[10px] text-zinc-400 ml-2">{selectedVersion.timestamp}</span>
                  </div>
                  <button
                    onClick={() => {
                      onRestoreVersion(selectedVersion);
                      onClose();
                    }}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore This Version
                  </button>
                </div>
                <div className="flex-1 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-auto font-mono text-xs whitespace-pre-wrap leading-relaxed select-text">
                  {selectedVersion.content || '// Empty document snapshot'}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs">
                Select a version from the left panel to preview content
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
