import React, { useState } from 'react';
import { X, Search, FileText, Image as ImageIcon, Video, Download, HardDrive } from 'lucide-react';
import { ExtendedMessage } from '../types';

interface SharedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ExtendedMessage[];
}

export const SharedFilesModal: React.FC<SharedFilesModalProps> = ({
  isOpen,
  onClose,
  messages,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'file' | 'drive'>('all');

  if (!isOpen) return null;

  // Extract all media messages
  const sharedMedia = messages.filter(
    (m) => m.mediaUrl || m.mediaType || m.fileName
  );

  const filteredMedia = sharedMedia.filter((item) => {
    const matchesSearch =
      (item.fileName || item.text || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType !== 'all') {
      return item.mediaType === filterType;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl border border-slate-700 bg-[#1e293b] text-slate-100 flex flex-col overflow-hidden max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-700/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Shared Files & Attachments</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-3 border-b border-slate-700/80 bg-slate-900/40 space-y-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shared files by name or sender..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'all', label: 'All Files' },
              { id: 'image', label: 'Images' },
              { id: 'video', label: 'Videos' },
              { id: 'file', label: 'Documents' },
              { id: 'drive', label: 'Drive Links' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                  filterType === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Items Grid / List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-2 min-h-[260px]">
          {filteredMedia.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 opacity-40" />
              <span>No shared files found matching filters.</span>
            </div>
          ) : (
            filteredMedia.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-3 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-blue-400 shrink-0">
                    {item.mediaType === 'image' ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : item.mediaType === 'video' ? (
                      <Video className="w-4 h-4" />
                    ) : item.mediaType === 'drive' ? (
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex flex-col">
                    <span className="text-xs font-bold text-white truncate">
                      {item.fileName || item.text || 'Shared Attachment'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Shared by {item.senderName} • {item.timestamp}
                    </span>
                  </div>
                </div>

                <a
                  href={item.mediaUrl || '#'}
                  download={item.fileName || 'shared-file'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </a>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/80 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
