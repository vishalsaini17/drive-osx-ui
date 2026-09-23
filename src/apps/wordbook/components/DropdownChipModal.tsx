import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import WordBookModal from './WordBookModal';

interface DropdownChipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (options: string[]) => void;
}

const DEFAULT_OPTIONS = ['To do', 'In progress', 'Done'];

export default function DropdownChipModal({ isOpen, onClose, onInsert }: DropdownChipModalProps) {
  const [options, setOptions] = useState<string[]>(DEFAULT_OPTIONS);

  const update = (i: number, v: string) => setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  const add = () => setOptions((prev) => [...prev, '']);
  const remove = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i));

  const cleaned = options.map((o) => o.trim()).filter(Boolean);

  const handleInsert = () => {
    if (cleaned.length === 0) return;
    onInsert(cleaned);
    onClose();
  };

  return (
    <WordBookModal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert dropdown"
      maxWidthClass="max-w-sm"
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={cleaned.length === 0}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Insert
          </button>
        </>
      }
    >
      <p className="text-[11px] text-zinc-500 mb-2">Define the options people can choose from — the first one is selected by default.</p>
      <div className="space-y-1 mb-2">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-1 items-center">
            <input
              value={opt}
              onChange={(e) => update(i, e.target.value)}
              className="flex-1 border border-zinc-300 rounded px-2 py-1 text-xs"
              placeholder={`Option ${i + 1}`}
            />
            <button onClick={() => remove(i)} className="text-zinc-400 hover:text-red-600 cursor-pointer">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
        <Plus size={12} /> Add option
      </button>
    </WordBookModal>
  );
}
