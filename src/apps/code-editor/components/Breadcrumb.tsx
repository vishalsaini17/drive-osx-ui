import React from 'react';
import { ChevronRight, FileCode } from 'lucide-react';

interface BreadcrumbProps {
  fileName: string;
  isDirty: boolean;
  /** Only set when the file's immediate parent folder's name is actually known (already cached from a real fetch) and differs from the open workspace root — never a guess. */
  parentFolderName: string | null;
  /** Right-click — wired to a real "Hide Breadcrumbs" action, matching VS Code's own bar. */
  onContextMenu?: (e: React.MouseEvent) => void;
}

/** VS Code's breadcrumb bar, shown below the tabs — path is relative to the open folder, matching VS Code's own convention of not repeating the workspace name in it. Toggleable via View > Toggle Breadcrumbs or this bar's own right-click menu, same as VS Code. */
export default function Breadcrumb({ fileName, isDirty, parentFolderName, onContextMenu }: BreadcrumbProps) {
  return (
    <div
      id="editor-breadcrumb-bar"
      onContextMenu={onContextMenu}
      className="h-6 shrink-0 px-3 flex items-center gap-1 text-[12px] text-white/50 bg-[#1e1e1e] border-b border-black/20 select-none overflow-x-auto"
    >
      {parentFolderName && (
        <>
          <span className="truncate shrink-0">{parentFolderName}</span>
          <ChevronRight className="w-3 h-3 shrink-0 text-white/30" />
        </>
      )}
      <FileCode className="w-3.5 h-3.5 shrink-0 text-[#4fc3f7]" />
      <span className="text-white/80 truncate shrink-0">
        {fileName}
        {isDirty ? ' •' : ''}
      </span>
    </div>
  );
}
