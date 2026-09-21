import React from 'react';
import { Trash2, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FileItem } from '../../platform/types';
import { useSystemStore } from '../../shell/state/systemStore';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import WindowStatus from '../../shell/window-manager/WindowStatusContext';

/** Bytes as a human-readable size. */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export default function TrashApp() {
  const deletedFiles = useSystemStore((state) => state.deletedFiles);
  const handleRestoreFile = useSystemStore((state) => state.handleRestoreFile);
  const handleEmptyTrash = useSystemStore((state) => state.handleEmptyTrash);
  const syncTrashFromBackend = useSystemStore((state) => state.syncTrashFromBackend);
  const currentUser = useSystemStore((state) => state.currentUser);

  const activeTheme = useAppTheme('trash').chromeTheme;

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // The real device viewport (phone/tablet), not this window's own width:
  // the default 600px window is what a tablet ends up with too, so window
  // width can't tell them apart from a small desktop window. Below 1024px
  // the three equal columns (name / type / action) give a file name only a
  // third of the row — `meeting-…`, `Quarterl…` — so the type folds into a
  // line under the name and the name takes everything the button leaves.
  const [viewportWidth, setViewportWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  React.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isCompact = viewportWidth < 1024;

  // The server owns the trash; the local list is only a cache for offline use.
  // Opening the window is the moment to reconcile the two.
  React.useEffect(() => {
    if (!currentUser) return;
    setIsRefreshing(true);
    void syncTrashFromBackend().finally(() => setIsRefreshing(false));
  }, [currentUser, syncTrashFromBackend]);

  // Real byte counts from file metadata, not an invented per-item average.
  const totalBytes = deletedFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  const knownSizes = deletedFiles.filter((file) => Number(file.size) > 0).length;

  const themeStyles = {
    'classic-light': {
      container: 'text-[#211625] bg-transparent',
      header: 'h-12 bg-white/40 border-b border-[#211625]/10 px-4 flex items-center justify-between shrink-0 text-[#211625]',
      emptyBadge: 'bg-black/5 text-[#211625]/60',
      warnCard: 'bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl flex items-center gap-3 text-xs text-rose-700',
      tableWrapper: 'border border-[#211625]/10 rounded-xl overflow-hidden bg-white/20 shadow-sm',
      tableHeader: 'text-[10px] uppercase font-bold text-[#211625]/60 px-4 py-2 bg-black/5 border-b border-[#211625]/10',
      tableRow: 'px-4 py-2.5 text-xs text-[#211625] font-semibold hover:bg-black/5 transition-colors',
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
      tableHeader: 'text-[10px] uppercase font-bold text-zinc-500 px-4 py-2 bg-zinc-900 border-b border-zinc-800',
      tableRow: 'px-4 py-2.5 text-xs text-zinc-300 font-semibold hover:bg-zinc-800/20 transition-colors',
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
      tableHeader: 'text-[10px] uppercase font-bold text-green-500/50 px-4 py-2 bg-black border-b border-green-500/25',
      tableRow: 'px-4 py-2.5 text-xs text-[#22c55e] font-semibold hover:bg-green-500/10 transition-colors',
      tableDivider: 'divide-y divide-green-500/20',
      btnRestore: 'px-2 py-1 bg-black border border-green-500/30 hover:bg-green-500/20 text-[10px] font-bold rounded flex items-center gap-1 inline-flex cursor-pointer transition-colors text-[#22c55e]',
      reclaimText: 'text-[11px] text-green-500/60',
      reclaimSize: 'font-bold font-mono text-green-400',
    },
  };

  const ts = themeStyles[activeTheme] || themeStyles['classic-light'];

  // Only claims a figure it can actually account for. When some items carry
  // no size, it says so instead of quietly under-reporting.
  const reclaimSummary = (
    <>
      Space to reclaim: <span className="font-semibold">{formatBytes(totalBytes)}</span>
      {deletedFiles.length > 0 && knownSizes < deletedFiles.length && (
        <span className="opacity-70"> (from {knownSizes} of {deletedFiles.length} items)</span>
      )}
    </>
  );

  return (
    <div className={`h-full flex flex-col select-none ${ts.container}`}>
      {/* 1. TRASH CONTROL HEADER */}
      <div className={`${ts.header} gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <Trash2 className="w-4 h-4 opacity-75 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider truncate">Trash Bin Storage</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 whitespace-nowrap ${ts.emptyBadge}`}>
            {deletedFiles.length} files
          </span>
        </div>

        {deletedFiles.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-white shadow-sm shrink-0 whitespace-nowrap"
          >
            {isCompact ? 'Empty Trash' : 'Empty Trash Bin'}
          </button>
        )}
      </div>

      {/* 2. BODY CONTENT FEED */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${isCompact ? 'p-3' : 'p-6'}`}>
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
              <span>Emptying the Trash erases these items permanently from your Drive storage. This cannot be undone.</span>
            </div>

            {/* Phone/tablet: the status bar's center section is the first thing
                its shared layout truncates, and there it shrank to "Space …" —
                so the figure is also stated here where it can be read. */}
            {isCompact && <p className={ts.reclaimText}>{reclaimSummary}</p>}

            {/* List of elements */}
            <div className={ts.tableWrapper}>
              {isCompact ? (
                <>
                  <div className={`${ts.tableHeader} flex items-center justify-between`}>
                    <span>File Name</span>
                    <span>Action</span>
                  </div>

                  <div className={ts.tableDivider}>
                    {deletedFiles.map(file => {
                      const bytes = Number(file.size) || 0;
                      return (
                        <div key={file.id} className={`${ts.tableRow} flex items-center gap-3`}>
                          <span className="min-w-0 flex-1 flex items-center gap-2.5">
                            <span className="text-base shrink-0">{file.type === 'folder' ? '📁' : '📄'}</span>
                            <span className="min-w-0">
                              {/* Wraps (to two lines) instead of truncating: on a
                                  phone the name is the one thing you're here to read. */}
                              <span className="block break-words line-clamp-2 leading-snug">{file.name}</span>
                              <span className="block text-[10px] opacity-60 uppercase font-medium mt-0.5">
                                {file.type === 'folder' ? 'Folder' : 'Text File'}
                                {bytes > 0 && ` · ${formatBytes(bytes)}`}
                              </span>
                            </span>
                          </span>
                          <button
                            onClick={() => handleRestoreFile(file)}
                            className={`${ts.btnRestore} shrink-0 min-h-8 px-3`}
                          >
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className={`${ts.tableHeader} grid grid-cols-3`}>
                    <span>File Name</span>
                    <span>Type</span>
                    <span className="text-right">Action</span>
                  </div>

                  <div className={ts.tableDivider}>
                    {deletedFiles.map(file => (
                      <div key={file.id} className={`${ts.tableRow} grid grid-cols-3 items-center`}>
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
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {/* WINDOW STATUS BAR CONTENT */}
      <WindowStatus
        left={
          <span>
            {isRefreshing
              ? 'Refreshing Trash…'
              : `${deletedFiles.length} item${deletedFiles.length === 1 ? '' : 's'} in Trash`}
          </span>
        }
        center={isCompact ? undefined : <span className="opacity-75">{reclaimSummary}</span>}
      />
    </div>
  );
}
