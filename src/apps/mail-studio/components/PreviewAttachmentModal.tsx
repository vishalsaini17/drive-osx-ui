import React from 'react';
import { X, Download, HardDrive, FileText, CheckCircle2 } from 'lucide-react';
import { useSystemStore } from '../../../shell/state/systemStore';
import { EmailAttachment } from '../types';

interface PreviewAttachmentModalProps {
  attachment: EmailAttachment | null;
  onClose: () => void;
  isLight: boolean;
}

export const PreviewAttachmentModal: React.FC<PreviewAttachmentModalProps> = ({
  attachment,
  onClose,
  isLight,
}) => {
  const [savedToDrive, setSavedToDrive] = React.useState(false);
  const setFiles = useSystemStore((state) => state.setFiles);

  if (!attachment) return null;

  const handleSaveToDrive = () => {
    const newFile = {
      id: `saved-${Date.now()}`,
      name: attachment.name,
      type: 'file' as const,
      parentId: null,
      content: attachment.content || `Attachment file content for ${attachment.name}`,
      createdAt: new Date().toLocaleDateString(),
    };
    setFiles((prev) => [...prev, newFile]);
    setSavedToDrive(true);
    setTimeout(() => setSavedToDrive(false), 2500);
  };

  const handleDownloadLocal = () => {
    const element = document.createElement('a');
    const file = new Blob([attachment.content || `Sample binary attachment content for ${attachment.name}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = attachment.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden max-h-[85vh] ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e1d22] border-white/10 text-white'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm min-w-0">
            <FileText size={18} className="text-blue-500 shrink-0" />
            <span className="truncate">{attachment.name}</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg text-slate-400 ${isLight ? 'hover:text-slate-700' : 'hover:text-white'} cursor-pointer shrink-0 ml-2`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Preview */}
        <div className={`p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center gap-4 ${isLight ? 'bg-slate-900/5' : 'bg-black/20'} min-h-[240px]`}>
          {attachment.type.toUpperCase().includes('IMAGE') || attachment.name.endsWith('.png') || attachment.name.endsWith('.jpg') ? (
            <div className={`w-full h-48 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-white/10'} flex flex-col items-center justify-center gap-2 border border-dashed ${isLight ? 'border-slate-400' : 'border-white/20'}`}>
              <span className="text-3xl">🖼️</span>
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Image Attachment Preview</span>
            </div>
          ) : attachment.type.toUpperCase().includes('PDF') || attachment.name.endsWith('.pdf') ? (
            <div className={`w-full p-4 rounded-xl ${isLight ? 'bg-white' : 'bg-[#18181b]'} border text-left shadow-xs`}>
              <div className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1.5">
                <FileText size={14} />
                <span>PDF Specification Document</span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-white/70'} leading-relaxed font-mono ${isLight ? 'bg-slate-50' : 'bg-black/30'} p-3 rounded-lg border ${isLight ? '' : 'border-white/10'}`}>
                {attachment.content || `%PDF-1.4 Spec Preview\nDocument Title: ${attachment.name}\nSize: ${attachment.size}`}
              </p>
            </div>
          ) : (
            <div className={`w-full p-4 rounded-xl ${isLight ? 'bg-white' : 'bg-[#18181b]'} border text-left font-mono text-xs ${isLight ? 'text-slate-700' : 'text-white/80'} whitespace-pre-wrap`}>
              {attachment.content || `Content preview for file: ${attachment.name}\nFile size: ${attachment.size}\nStatus: Ready for download or save to DriveOSX.`}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className={`p-3.5 border-t flex items-center justify-between gap-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <button
            onClick={handleSaveToDrive}
            disabled={savedToDrive}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              savedToDrive
                ? 'bg-emerald-600 text-white'
                : isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {savedToDrive ? (
              <>
                <CheckCircle2 size={14} />
                <span>Saved to Drive!</span>
              </>
            ) : (
              <>
                <HardDrive size={14} className="text-blue-500" />
                <span>Save to DriveOSX</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadLocal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download size={14} />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
