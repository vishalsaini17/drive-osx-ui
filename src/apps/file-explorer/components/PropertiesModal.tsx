import React from 'react';
import {
  X,
  Info,
  Folder,
  FileText,
  Calendar,
  HardDrive,
  User,
  Shield,
  Clock,
  Star,
  Download,
  Share2,
  Trash2
} from 'lucide-react';
import { FileItem } from '../../../platform/types';

interface PropertiesModalProps {
  item: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStar: (item: FileItem) => void;
  onShare: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  folderPathString: string;
}

export default function PropertiesModal({
  item,
  isOpen,
  onClose,
  onToggleStar,
  onShare,
  onDownload,
  onDelete,
  folderPathString,
}: PropertiesModalProps) {
  if (!isOpen || !item) return null;

  const sizeString =
    item.type === 'folder'
      ? 'Folder Container'
      : item.content
      ? `${(item.content.length / 1024).toFixed(1)} KB (${item.content.length} bytes)`
      : '0 B';

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold truncate max-w-[240px]">{item.name}</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Item Properties & Metadata
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

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[420px] flex flex-col gap-4 text-xs">
          {/* Main Info Box */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              {item.type === 'folder' ? <Folder className="w-5 h-5 text-amber-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate">{item.name}</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 capitalize">
                {item.type === 'folder' ? 'File Folder' : `${item.name.split('.').pop()?.toUpperCase()} File`}
              </div>
            </div>
            <button
              onClick={() => onToggleStar(item)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                item.starred
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-amber-500'
              }`}
              title={item.starred ? 'Remove from Starred' : 'Add to Starred'}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-purple-500" /> Location
              </span>
              <span className="font-semibold truncate text-[11px]">{folderPathString}</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-500" /> Size
              </span>
              <span className="font-semibold text-[11px]">{sizeString}</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-500" /> Created
              </span>
              <span className="font-semibold text-[11px]">{item.createdAt}</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <User className="w-3 h-3 text-amber-500" /> Owner
              </span>
              <span className="font-semibold text-[11px]">Admin (Current User)</span>
            </div>
          </div>

          {/* Sharing & Permissions Summary */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-2">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-500" /> Shared Access
            </span>
            <div className="text-[11px]">
              {item.sharedWith && item.sharedWith.length > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Shared with {item.sharedWith.length} people
                </span>
              ) : (
                <span className="text-zinc-500">Private to you</span>
              )}
            </div>
          </div>

          {/* Activity Log Preview */}
          {item.activityHistory && item.activityHistory.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-2">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-500" /> Recent Activity
              </span>
              <div className="flex flex-col gap-1.5 text-[11px]">
                {item.activityHistory.slice(0, 3).map((act) => (
                  <div key={act.id} className="flex justify-between text-zinc-600 dark:text-zinc-300">
                    <span>{act.action}</span>
                    <span className="text-[10px] text-zinc-400">{act.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              onClick={() => onShare(item)}
              className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Share Item"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            {item.type === 'file' && (
              <button
                onClick={() => onDownload(item)}
                className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Download Item"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                onDelete(item);
                onClose();
              }}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Move to Trash"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
