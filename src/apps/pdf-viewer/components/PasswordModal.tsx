import React, { useState } from 'react';
import { Lock, Key, Check, X, ShieldAlert } from 'lucide-react';

interface PasswordModalProps {
  documentTitle: string;
  correctPassword?: string;
  onUnlock: () => void;
  onCancel: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  documentTitle,
  correctPassword = 'drive',
  onUnlock,
  onCancel,
}) => {
  const [inputPassword, setInputPassword] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === correctPassword) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Password Protected PDF</h3>
              <span className="text-xs text-slate-400 font-medium truncate max-w-[220px] block">
                {documentTitle}
              </span>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            This document is encrypted with password protection. Please enter the security key to view and annotate content.
          </p>

          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center gap-2 text-xs text-amber-300">
            <ShieldAlert size={16} className="shrink-0" />
            <span>
              Sample Password Hint: <strong className="font-mono text-white">drive</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-400 mb-1">Document Password</label>
            <div className="relative">
              <input
                type="password"
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Enter password..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 pl-9"
              />
              <Key size={16} className="absolute left-3 top-3 text-slate-500" />
            </div>
            {error && (
              <span className="text-xs font-bold text-rose-400 mt-1 block">
                Incorrect password. Please try again or use "drive".
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-md cursor-pointer transition-colors"
            >
              Unlock Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
