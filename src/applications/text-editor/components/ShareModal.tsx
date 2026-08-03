import React, { useState } from 'react';
import { X, Share2, Copy, Check, Mail, Lock, Users, Globe } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  onSendViaMail: () => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  documentName,
  onSendViaMail,
}: ShareModalProps) {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const [accessLevel, setAccessLevel] = useState<'editor' | 'viewer'>('editor');
  const shareUrl = `${window.location.origin}/doc/share?file=${encodeURIComponent(documentName)}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Share Document</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[220px]">
                "{documentName}"
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

        {/* Body */}
        <div className="p-4 flex flex-col gap-4 text-xs">
          {/* Permission selector */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-500" />
              <div>
                <div className="font-bold">Access Rights</div>
                <div className="text-[10px] text-zinc-400">Control who can modify this draft</div>
              </div>
            </div>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="editor">Can Edit</option>
              <option value="viewer">Read Only (Viewer)</option>
            </select>
          </div>

          {/* Shareable Link Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-500" /> Document Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[11px] text-zinc-600 dark:text-zinc-300 outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Quick Share via Email */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold">Send via Mail Studio</span>
            </div>
            <button
              onClick={() => {
                onSendViaMail();
                onClose();
              }}
              className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Open Email App
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
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
