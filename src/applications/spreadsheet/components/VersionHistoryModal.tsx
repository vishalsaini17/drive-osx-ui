import React from 'react';
import { VersionSnapshot, Sheet } from '../types';
import { History, X, RotateCcw, Clock, Check } from 'lucide-react';

interface VersionHistoryModalProps {
  snapshots: VersionSnapshot[];
  onRestoreSnapshot: (snapshot: VersionSnapshot) => void;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  snapshots,
  onRestoreSnapshot,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Workbook Version History</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Snapshots list */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {snapshots.map((snap, idx) => (
            <div
              key={snap.id}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                idx === 0
                  ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-800">{snap.title}</span>
                  {idx === 0 && (
                    <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      Current Version
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {snap.timestamp}
                  </span>
                  <span>• Author: {snap.author}</span>
                  <span>• {snap.sheets.length} Sheets</span>
                </div>
              </div>

              {idx !== 0 && (
                <button
                  onClick={() => {
                    onRestoreSnapshot(snap);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw size={13} /> Restore
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Automatic cloud state backups</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
