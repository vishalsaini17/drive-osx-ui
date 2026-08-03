import React from 'react';
import { Trash2, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FileItem } from '../../types';
import { useSystemStore } from '../../systemStore';
import WindowStatusBar from '../../components/WindowStatusBar';

export default function TrashApp() {
  const deletedFiles = useSystemStore((state) => state.deletedFiles);
  const handleRestoreFile = useSystemStore((state) => state.handleRestoreFile);
  const handleEmptyTrash = useSystemStore((state) => state.handleEmptyTrash);
  const settings = useSystemStore((state) => state.settings);

  const activeTheme = settings.theme || 'classic-light';

  // Approximate simulated storage weights of trashed caches
  const calculateTotalSizeKB = () => {
    return deletedFiles.length * 4.2; // 4.2KB average mock size
  };

  const themeStyles = {
    'classic-light': {
      container: 'text-[#211625] bg-transparent',
      header: 'h-12 bg-white/40 border-b border-[#211625]/10 px-4 flex items-center justify-between shrink-0 text-[#211625]',
      emptyBadge: 'bg-black/5 text-[#211625]/60',
      warnCard: 'bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl flex items-center gap-3 text-xs text-rose-700',
      tableWrapper: 'border border-[#211625]/10 rounded-xl overflow-hidden bg-white/20 shadow-sm',
      tableHeader: 'grid grid-cols-3 text-[10px] uppercase font-bold text-[#211625]/60 px-4 py-2 bg-black/5 border-b border-[#211625]/10',
      tableRow: 'grid grid-cols-3 items-center px-4 py-2.5 text-xs text-[#211625] font-semibold hover:bg-black/5 transition-colors',
      tableDivider: 'divide-y divide-[#211625]/10',
      btnRestore: 'px-2 py-1 bg-black/5 hover:bg-black/10 text-[10px] font-bold rounded flex items-center gap-1 inline-flex cursor-pointer transition-colors text-[#211625]',
      reclaimText: 'text-[11px] text-[#211625]/60 font-medium',
      reclaimSize: 'font-bold font-sans text-purple-600',
    },
    'modern-dark': {
      container: 'text-white bg-transparent',
      header: 'h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 text-white',
      emptyBadge: 'bg-zinc-800 text-zinc-400',
      warnCard: 'bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-3 text-xs text-rose-300',
      tableWrapper: 'border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40',
      tableHeader: 'grid grid-cols-3 text-[10px] uppercase font-bold text-zinc-500 px-4 py-2 bg-zinc-900 border-b border-zinc-800',
      tableRow: 'grid grid-cols-3 items-center px-4 py-2.5 text-xs text-zinc-300 font-semibold hover:bg-zinc-800/20 transition-colors',
      tableDivider: 'divide-y divide-zinc-800',
      btnRestore: 'px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold rounded flex items-center gap-1 inline-flex cursor-pointer transition-colors text-white',
      reclaimText: 'text-[11px] text-zinc-500',
      reclaimSize: 'font-bold font-mono text-pink-400',
    },
    'retro-terminal': {
      container: 'text-[#22c55e] bg-transparent font-mono',
      header: 'h-12 bg-black border-b border-green-500/25 px-4 flex items-center justify-between shrink-0 text-[#22c55e]',
      emptyBadge: 'bg-green-500/10 text-green-400 border border-green-500/20',
      warnCard: 'bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-3 text-xs text-rose-400',
      tableWrapper: 'border border-green-500/25 rounded-xl overflow-hidden bg-black/45',
      tableHeader: 'grid grid-cols-3 text-[10px] uppercase font-bold text-green-500/50 px-4 py-2 bg-black border-b border-green-500/25',
      tableRow: 'grid grid-cols-3 items-center px-4 py-2.5 text-xs text-[#22c55e] font-semibold hover:bg-green-500/10 transition-colors',
      tableDivider: 'divide-y divide-green-500/20',
      btnRestore: 'px-2 py-1 bg-black border border-green-500/30 hover:bg-green-500/20 text-[10px] font-bold rounded flex items-center gap-1 inline-flex cursor-pointer transition-colors text-[#22c55e]',
      reclaimText: 'text-[11px] text-green-500/60',
      reclaimSize: 'font-bold font-mono text-green-400',
    },
  };

  const ts = themeStyles[activeTheme] || themeStyles['classic-light'];

  return (
    <div className={`h-full flex flex-col select-none ${ts.container}`}>
      {/* 1. TRASH CONTROL HEADER */}
      <div className={ts.header}>
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 opacity-75" />
          <span className="text-xs font-bold uppercase tracking-wider">Trash Bin Storage</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ts.emptyBadge}`}>
            {deletedFiles.length} files
          </span>
        </div>

        {deletedFiles.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-white shadow-sm"
          >
            Empty Trash Bin
          </button>
        )}
      </div>

      {/* 2. BODY CONTENT FEED */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {deletedFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center border border-black/5 mb-3 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold opacity-80">Trash Bin is Empty</h3>
            <p className="text-xs opacity-50 max-w-xs mt-1 leading-relaxed">
              Your virtual operating system is optimized! No deleted files or junk registers are taking up storage space.
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            {/* Warnings card */}
            <div className={ts.warnCard}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Items emptied from the trash cannot be restored and are deleted permanently from LocalStorage.</span>
            </div>

            {/* List of elements */}
            <div className={ts.tableWrapper}>
              <div className={ts.tableHeader}>
                <span>File Name</span>
                <span>Type</span>
                <span className="text-right">Action</span>
              </div>

              <div className={ts.tableDivider}>
                {deletedFiles.map(file => (
                  <div key={file.id} className={ts.tableRow}>
                    <span className="truncate pr-4 flex items-center gap-2">
                      <span>{file.type === 'folder' ? '📁' : '📄'}</span>
                      <span className="truncate">{file.name}</span>
                    </span>
                    <span className="text-[10px] opacity-60 uppercase">{file.type === 'folder' ? 'Folder' : 'Text File'}</span>
                    <div className="text-right">
                      <button
                        onClick={() => handleRestoreFile(file)}
                        className={ts.btnRestore}
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* STATUS BAR */}
      <WindowStatusBar
        id="trash-status-bar"
        appId="trash"
        leftInfo={<span>{deletedFiles.length} item{deletedFiles.length === 1 ? '' : 's'} in Trash</span>}
        centerInfo={
          <span className="opacity-75">
            Total Space Reclaimed: <span className="font-semibold">{calculateTotalSizeKB().toFixed(1)} KB</span>
          </span>
        }
      />
    </div>
  );
}
