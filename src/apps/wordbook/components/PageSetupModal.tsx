import React, { useEffect, useState } from 'react';
import WordBookModal from './WordBookModal';
import {
  PageSetup,
  PageOrientation,
  PaperSize,
  paperSizeOf,
  pageSetupForPaperSize,
} from '../../../platform/documents/book/pageSetup';

interface PageSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageSetup: PageSetup;
  onApply: (setup: PageSetup) => void;
}

const MM_PER_INCH = 25.4;

const PAPER_SIZES: { value: PaperSize; label: string }[] = [
  { value: 'a4', label: 'A4 (210 × 297 mm)' },
  { value: 'letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'legal', label: 'Legal (8.5 × 14 in)' },
];

export default function PageSetupModal({ isOpen, onClose, pageSetup, onApply }: PageSetupModalProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [marginTop, setMarginTop] = useState('1');
  const [marginBottom, setMarginBottom] = useState('1');
  const [marginLeft, setMarginLeft] = useState('1');
  const [marginRight, setMarginRight] = useState('1');

  // Re-derive the form from whatever's actually applied every time the
  // dialog opens — it can be reopened after loading a different document,
  // or after Cancel discarded a previous edit.
  useEffect(() => {
    if (!isOpen) return;
    setPaperSize(paperSizeOf(pageSetup));
    setOrientation(pageSetup.orientation);
    setMarginTop((pageSetup.marginTopMm / MM_PER_INCH).toFixed(2));
    setMarginBottom((pageSetup.marginBottomMm / MM_PER_INCH).toFixed(2));
    setMarginLeft((pageSetup.marginLeftMm / MM_PER_INCH).toFixed(2));
    setMarginRight((pageSetup.marginRightMm / MM_PER_INCH).toFixed(2));
  }, [isOpen, pageSetup]);

  const handleApply = () => {
    const base = pageSetupForPaperSize(paperSize, orientation);
    const inchesToMm = (raw: string, fallbackMm: number) => {
      const n = parseFloat(raw);
      return Number.isFinite(n) && n >= 0 ? n * MM_PER_INCH : fallbackMm;
    };
    onApply({
      ...base,
      marginTopMm: inchesToMm(marginTop, base.marginTopMm),
      marginBottomMm: inchesToMm(marginBottom, base.marginBottomMm),
      marginLeftMm: inchesToMm(marginLeft, base.marginLeftMm),
      marginRightMm: inchesToMm(marginRight, base.marginRightMm),
    });
    onClose();
  };

  return (
    <WordBookModal
      isOpen={isOpen}
      onClose={onClose}
      title="Page setup"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-zinc-300 hover:bg-zinc-100 cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleApply} className="px-3 py-1.5 text-xs rounded bg-purple-600 text-white hover:bg-purple-500 cursor-pointer">
            Apply
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-zinc-600">Paper size</span>
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
            className="h-8 px-2 border border-zinc-300 rounded text-xs"
          >
            {PAPER_SIZES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="font-medium text-zinc-600">Orientation</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`flex-1 h-8 rounded border text-xs cursor-pointer ${
                orientation === 'portrait' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`flex-1 h-8 rounded border text-xs cursor-pointer ${
                orientation === 'landscape' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              Landscape
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-medium text-zinc-600">Margins (inches)</span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5">
              <span className="w-10 text-zinc-500">Top</span>
              <input type="number" step="0.1" min="0" value={marginTop} onChange={(e) => setMarginTop(e.target.value)} className="flex-1 h-8 px-2 border border-zinc-300 rounded text-xs" />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="w-10 text-zinc-500">Bottom</span>
              <input type="number" step="0.1" min="0" value={marginBottom} onChange={(e) => setMarginBottom(e.target.value)} className="flex-1 h-8 px-2 border border-zinc-300 rounded text-xs" />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="w-10 text-zinc-500">Left</span>
              <input type="number" step="0.1" min="0" value={marginLeft} onChange={(e) => setMarginLeft(e.target.value)} className="flex-1 h-8 px-2 border border-zinc-300 rounded text-xs" />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="w-10 text-zinc-500">Right</span>
              <input type="number" step="0.1" min="0" value={marginRight} onChange={(e) => setMarginRight(e.target.value)} className="flex-1 h-8 px-2 border border-zinc-300 rounded text-xs" />
            </label>
          </div>
        </div>
      </div>
    </WordBookModal>
  );
}
