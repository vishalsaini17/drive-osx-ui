import React from 'react';
import { X, HardDrive, FileText } from 'lucide-react';
import { useSystemStore } from '../../../shell/state/systemStore';
import { EmailAttachment } from '../types';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (attachment: EmailAttachment) => void;
  isLight: boolean;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  isLight,
}) => {
  const files = useSystemStore((state) => state.files);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden max-h-[80vh] ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e1d22] border-white/10 text-white'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <HardDrive size={18} className="text-blue-500" />
            <span>Select File from DriveOSX Disk</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* File List */}
        <div className="p-3 flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 min-h-[200px]">
          {files.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <HardDrive size={28} className="opacity-40" />
              <span>No files currently in DriveOSX Disk.</span>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                onClick={() => {
                  onSelectFile({
                    id: `drive-att-${Date.now()}-${file.id}`,
                    name: file.name,
                    size: '1.2 MB',
                    type: file.type || 'document',
                    content: file.content,
                  });
                  onClose();
                }}
                className={`p-3 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-blue-50/80' : 'hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-blue-500 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400">Created: {file.createdAt || '10.07.2023'}</span>
                  </div>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 cursor-pointer shrink-0">
                  Select
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-3 border-t flex justify-end ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
