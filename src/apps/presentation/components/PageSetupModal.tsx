import React from 'react';
import { FileText, X, Check } from 'lucide-react';
import { PageSize } from '../types';

interface PageSetupModalProps {
  isOpen: boolean;
  pageSize: PageSize;
  onApply: (pageSize: PageSize) => void;
  onClose: () => void;
}

const OPTIONS: { value: PageSize; label: string; ratio: string }[] = [
  { value: '4:3', label: 'Standard', ratio: '4:3' },
  { value: '16:9', label: 'Widescreen', ratio: '16:9' },
  { value: '16:10', label: 'Widescreen', ratio: '16:10' },
];

/**
 * File > Page setup… — picks the deck's aspect ratio (`SlideCanvas` reads
 * `deck.pageSize` and applies it via `aspectRatioFor`, so every slide, the
 * thumbnail rail, and Presentation Mode all follow one choice). Deliberately
 * only the three fixed presets Google Slides offers, not "Custom" — an
 * arbitrary ratio would need per-element repositioning logic this app
 * doesn't have (elements are percentages of the *current* box; changing its
 * proportions, not just its scale, would visibly distort every existing
 * slide rather than just resizing the canvas around them).
 */
export default function PageSetupModal({ isOpen, pageSize, onApply, onClose }: PageSetupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Page setup</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onApply(opt.value);
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                pageSize === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-sm font-semibold">
                {opt.label} <span className="text-slate-400 font-normal">{opt.ratio}</span>
              </span>
              {pageSize === opt.value && <Check size={16} className="text-blue-600" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
