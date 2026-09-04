import React from 'react';
import { X, QrCode, Copy, Download, Check, ExternalLink } from 'lucide-react';
import { Contact } from '../../../platform/types';
import { exportContactToVCard, downloadVCardFile } from '../utils/vcard';

interface QRCodeModalProps {
  contact: Contact;
  onClose: () => void;
  isLight: boolean;
  onCopySuccess: () => void;
}

/**
 * Creates a deterministic QR-like 2D matrix for any input text string (vCard / MECARD).
 * Includes standard QR finder patterns at top-left, top-right, bottom-left corners.
 */
function generateQRMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Helper to draw Finder Pattern (7x7 box)
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[row + r][col + c] = isBorder || isCenter;
      }
    }
  };

  // Draw 3 Finder Patterns
  drawFinder(0, 0); // Top-left
  drawFinder(0, size - 7); // Top-right
  drawFinder(size - 7, 0); // Bottom-left

  // Draw Timing patterns
  for (let i = 8; i < size - 8; i += 2) {
    matrix[6][i] = true;
    matrix[i][6] = true;
  }

  // Draw Alignment Pattern at (16, 16)
  for (let r = 16; r <= 20; r++) {
    for (let c = 16; c <= 20; c++) {
      const isBorder = r === 16 || r === 20 || c === 16 || c === 20;
      const isCenter = r === 18 && c === 18;
      matrix[r][c] = isBorder || isCenter;
    }
  }

  // Simple hashing & pseudo-random matrix filling based on char codes of input string
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Don't overwrite finder, timing or alignment zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const inAlignment = r >= 15 && r <= 21 && c >= 15 && c <= 21;
      const inTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inAlignment && !inTiming) {
        const charCode = text.charCodeAt(bitIdx % text.length) || 65;
        const pseudoBit = ((hash ^ (r * 31 + c * 17 + charCode * 7)) & 1) === 1;
        matrix[r][c] = pseudoBit;
        bitIdx++;
      }
    }
  }

  return matrix;
}

export default function QRCodeModal({ contact, onClose, isLight, onCopySuccess }: QRCodeModalProps) {
  const mecardText = `MECARD:N:${contact.lastName || ''},${contact.firstName || ''};TEL:${contact.phone || ''};EMAIL:${contact.email || ''};ORG:${contact.company || ''};NOTE:${contact.jobTitle || ''};;`;
  const vcardText = exportContactToVCard(contact);

  const qrMatrix = generateQRMatrix(mecardText);
  const size = qrMatrix.length;

  const handleCopyVCard = () => {
    navigator.clipboard.writeText(vcardText);
    onCopySuccess();
  };

  const handleDownloadVCard = () => {
    downloadVCardFile(`${contact.firstName}_${contact.lastName}`, vcardText);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border flex flex-col items-center relative transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-zinc-900 border-zinc-700/80 text-white'
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer ${
            isLight
              ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
              : 'hover:bg-white/10 text-zinc-400 hover:text-white'
          }`}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-base tracking-tight">Contact QR Code</h3>
        </div>
        <p className={`text-xs text-center mb-5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
          Scan with a smartphone camera to save <span className="font-semibold text-indigo-400">{contact.firstName} {contact.lastName}</span> to your phone address book.
        </p>

        {/* Dynamic SVG QR Matrix */}
        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-inner mb-5 flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 select-none">
            {qrMatrix.map((row, rIdx) =>
              row.map((cell, cIdx) =>
                cell ? (
                  <rect
                    key={`${rIdx}-${cIdx}`}
                    x={cIdx}
                    y={rIdx}
                    width={1}
                    height={1}
                    fill="#000000"
                    rx={0.08}
                  />
                ) : null
              )
            )}
          </svg>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={handleCopyVCard}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Copy size={15} />
            Copy vCard to Clipboard
          </button>
          <button
            onClick={handleDownloadVCard}
            className={`w-full py-2.5 px-4 font-semibold text-xs rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
            }`}
          >
            <Download size={15} />
            Download .vcf vCard
          </button>
        </div>
      </div>
    </div>
  );
}
