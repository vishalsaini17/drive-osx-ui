import React, { useState } from 'react';
import { Share2, Copy, Check, X, Globe, ShieldCheck } from 'lucide-react';

interface ShareModalProps {
  documentTitle: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ documentTitle, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const shareUrl = `https://studio.workspace.app/pdf/viewer_${Date.now()}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Share PDF Document</h3>
              <span className="text-xs text-slate-400 font-medium truncate max-w-[220px] block">
                {documentTitle}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-400 mb-1">Shareable Document Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold text-white block">Anyone with link can view & annotate</span>
              <span className="text-slate-400 font-medium">Real-time multiplayer collaboration active</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-400" /> Encrypted Web Transfer
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
