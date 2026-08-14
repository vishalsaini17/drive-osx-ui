import React from 'react';
import { X, FileText, Folder, Sparkles } from 'lucide-react';
import { FileItem } from '../../../platform/types';
import { isBookFileName } from '../../../platform/documents/book/bookFormat';

interface OpenBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  allFiles: FileItem[];
  onSelectFile: (file: FileItem) => void;
  onNewBlank: () => void;
}

export default function OpenBookModal({ isOpen, onClose, allFiles, onSelectFile, onNewBlank }: OpenBookModalProps) {
  if (!isOpen) return null;

  const bookFiles = allFiles.filter((f) => f.type === 'file' && isBookFileName(f.name));

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Open Word Book Document</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Choose a .book file, or start blank</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-5 text-xs">
          <button
            onClick={() => {
              onNewBlank();
              onClose();
            }}
            className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 hover:bg-purple-500/5 text-left transition-all cursor-pointer group flex items-center gap-2.5"
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <div className="font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400">Blank Document</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Start with a clean A4 page</div>
            </div>
          </button>

          <div>
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-blue-500" /> System File Storage ({bookFiles.length})
            </h4>
            {bookFiles.length === 0 ? (
              <p className="text-zinc-400 italic">No .book documents saved yet.</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {bookFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      onSelectFile(file);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="font-semibold truncate">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0">{file.createdAt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
