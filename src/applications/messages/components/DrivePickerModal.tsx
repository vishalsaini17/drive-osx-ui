import React from 'react';
import { X, HardDrive, FileText, Check } from 'lucide-react';
import { useSystemStore } from '../../../systemStore';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: { id: string; name: string; content?: string; size?: string }) => void;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const files = useSystemStore((state) => state.files);

  if (!isOpen) return null;

  const validFiles = files.filter((f) => f.type === 'file');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-700 bg-[#1e293b] text-slate-100 flex flex-col overflow-hidden max-h-[80vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-700/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Select File from DriveOSX Disk</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File List */}
        <div className="p-3 flex-1 overflow-y-auto divide-y divide-slate-800 min-h-[220px]">
          {validFiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <HardDrive className="w-8 h-8 opacity-40" />
              <span>No files found in DriveOSX Disk.</span>
            </div>
          ) : (
            validFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => {
                  onSelectFile({
                    id: file.id,
                    name: file.name,
                    content: file.content,
                    size: '1.4 MB',
                  });
                  onClose();
                }}
                className="p-3 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer hover:bg-slate-800/80"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate text-white">{file.name}</span>
                    <span className="text-[10px] text-slate-400">Drive File • {file.createdAt || 'Today'}</span>
                  </div>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer shrink-0 transition-colors">
                  Attach Link
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-700/80 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
