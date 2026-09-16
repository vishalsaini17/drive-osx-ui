import React from 'react';
import { X } from 'lucide-react';

interface WordBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

/**
 * A light-themed modal shell for wordbook's own dialogs (Page Setup,
 * Version History). The design-system's shared `Modal` is dark (matches the
 * OS-wide window-glass look every other app keeps), which would read as a
 * jarring mismatch popping up over wordbook's deliberately light,
 * paper-document chrome — the same reasoning `TitleBar` already follows.
 */
export default function WordBookModal({ isOpen, onClose, title, children, footer, maxWidthClass = 'max-w-md' }: WordBookModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className={`w-full ${maxWidthClass} bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 text-zinc-700 text-xs leading-relaxed">{children}</div>

        {footer && <div className="px-4 py-3 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">{footer}</div>}
      </div>
    </div>
  );
}
