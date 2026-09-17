import React, { useEffect, useState } from 'react';
import WordBookModal from './WordBookModal';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DateChipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (isoDate: string, label: string) => void;
}

export default function DateChipModal({ isOpen, onClose, onInsert }: DateChipModalProps) {
  const [value, setValue] = useState(todayIso());

  useEffect(() => {
    if (isOpen) setValue(todayIso());
  }, [isOpen]);

  const handleInsert = () => {
    if (!value) return;
    const label = new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    onInsert(value, label);
    onClose();
  };

  return (
    <WordBookModal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert date"
      maxWidthClass="max-w-xs"
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 cursor-pointer">
            Cancel
          </button>
          <button onClick={handleInsert} className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
            Insert
          </button>
        </>
      }
    >
      <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="w-full border border-zinc-300 rounded px-2 py-1.5 text-sm" />
    </WordBookModal>
  );
}
