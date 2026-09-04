import React, { useState } from 'react';
import { PeerCollaborator } from '../types';
import { Share2, Users, Copy, Check, X, ShieldCheck, Globe } from 'lucide-react';

interface ShareCollabModalProps {
  deckTitle: string;
  peers: PeerCollaborator[];
  onClose: () => void;
}

export const ShareCollabModal: React.FC<ShareCollabModalProps> = ({
  deckTitle,
  peers,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const shareUrl = `https://studio.workspace.app/slides/deck_${Date.now()}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Share & Live Collaboration</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Deck Link Sharing */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 mb-1">Presentation Web Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-700"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Access Control Permissions */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold text-slate-800 block">Anyone with link can edit</span>
              <span className="text-slate-500 font-medium">Real-time multiplayer synchronization active</span>
            </div>
          </div>

          {/* Active Peer Collaborators List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                Active Presenters & Editors ({peers.length + 1})
              </span>
            </div>
            <div className="space-y-2">
              {/* You */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">
                    You
                  </div>
                  <div className="text-xs font-bold text-slate-800">You (Owner)</div>
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Host
                </span>
              </div>

              {/* Peers */}
              {peers.map((peer) => (
                <div key={peer.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full text-white font-black text-xs flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: peer.color }}
                    >
                      {peer.name[0]}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{peer.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Active on live stage</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    Can Edit
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" /> End-to-end encrypted session
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
