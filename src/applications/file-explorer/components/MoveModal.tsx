import React, { useState } from 'react';
import { X, Folder, ChevronRight, HardDrive, Check } from 'lucide-react';
import { FileItem } from '../../../types';

interface MoveModalProps {
  itemToMove: FileItem | null;
  allFiles: FileItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmMove: (targetFolderId: string | null) => void;
}

export default function MoveModal({
  itemToMove,
  allFiles,
  isOpen,
  onClose,
  onConfirmMove,
}: MoveModalProps) {
  if (!isOpen || !itemToMove) return null;

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Get all folders only
  const folderList = allFiles.filter((f) => f.type === 'folder' && f.id !== itemToMove.id);

  // Filter out children folders of itemToMove if it is a folder (to prevent circular nesting)
  const isDescendant = (folderId: string, parentIdToCheck: string): boolean => {
    let current = allFiles.find((f) => f.id === folderId);
    while (current) {
      if (current.id === parentIdToCheck) return true;
      current = allFiles.find((f) => f.id === current?.parentId);
    }
    return false;
  };

  const validFolders = folderList.filter(
    (f) => itemToMove.type !== 'folder' || !isDescendant(f.id, itemToMove.id)
  );

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold truncate max-w-[240px]">
                Move "{itemToMove.name}"
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Select target folder destination
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Folder List Picker */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-1">
          {/* Root Directory Choice */}
          <button
            onClick={() => setSelectedTargetId(null)}
            className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
              selectedTargetId === null
                ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 font-bold'
                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-purple-500" />
              <span className="text-xs">This PC / Home (Root)</span>
            </div>
            {selectedTargetId === null && <Check className="w-4 h-4 text-purple-600" />}
          </button>

          {validFolders.map((folder) => {
            const isSelected = selectedTargetId === folder.id;
            const parent = allFiles.find((f) => f.id === folder.parentId);
            const parentName = parent ? parent.name : 'Root';

            return (
              <button
                key={folder.id}
                onClick={() => setSelectedTargetId(folder.id)}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 font-bold'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate">{folder.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      Location: /{parentName}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            Selected: {selectedTargetId ? allFiles.find((f) => f.id === selectedTargetId)?.name : 'Root'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirmMove(selectedTargetId);
                onClose();
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Move Here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
