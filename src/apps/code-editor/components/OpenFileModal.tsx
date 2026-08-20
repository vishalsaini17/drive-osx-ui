import React from 'react';
import { X, FileCode, Folder } from 'lucide-react';
import { FileItem } from '../../../platform/types';

interface OpenFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  allFiles: FileItem[];
  onSelectFile: (file: FileItem) => void;
}

/** File > Open File... — matches VS Code's own picker in spirit: pick any file, not just ones of a specific type. */
export default function OpenFileModal({ isOpen, onClose, allFiles, onSelectFile }: OpenFileModalProps) {
  if (!isOpen) return null;

  const files = allFiles.filter((f) => f.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[var(--wb-surface-raised)] text-[var(--wb-fg)] w-full max-w-lg rounded-xl shadow-2xl border border-[var(--wb-border-subtle)] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-[var(--wb-border-subtle)] flex items-center justify-between bg-[var(--wb-surface-overlay)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--wb-accent)]/15 text-[var(--wb-accent)] flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Open File</h3>
              <p className="text-[11px] text-[var(--wb-fg)]/50">Choose a file from your storage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--wb-fg)]/40 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-fg)]/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto text-xs">
          {files.length === 0 ? (
            <p className="text-[var(--wb-fg)]/40 italic flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" /> No files found.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  className="p-2.5 rounded-lg border border-[var(--wb-fg)]/5 hover:bg-[var(--wb-fg)]/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileCode className="w-4 h-4 text-[var(--wb-accent)] shrink-0" />
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-[var(--wb-fg)]/30 shrink-0">{file.createdAt}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[var(--wb-border-subtle)] bg-[var(--wb-surface-overlay)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--wb-fg)]/10 hover:bg-[var(--wb-fg)]/15 text-[var(--wb-fg)] font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
