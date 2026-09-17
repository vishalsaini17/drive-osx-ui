import React from 'react';
import WordBookModal from './WordBookModal';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  spellcheckOn: boolean;
  onToggleSpellcheck: () => void;
  showLineNumbers: boolean;
  onToggleLineNumbers: () => void;
}

function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-1 py-2 text-left cursor-pointer">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${checked ? 'bg-blue-600 justify-end' : 'bg-zinc-300 justify-start'}`}>
        <span className="w-4 h-4 rounded-full bg-white shadow" />
      </span>
    </button>
  );
}

/** Consolidates toggles that already exist elsewhere in the app (the ribbon's spellcheck button, the new line-numbers toggle) into one place — not new behavior, just discoverability, matching what Docs' own Preferences dialog is. */
export default function PreferencesModal({ isOpen, onClose, spellcheckOn, onToggleSpellcheck, showLineNumbers, onToggleLineNumbers }: PreferencesModalProps) {
  return (
    <WordBookModal isOpen={isOpen} onClose={onClose} title="Preferences" maxWidthClass="max-w-sm">
      <div className="divide-y divide-zinc-100">
        <ToggleRow label="Spelling and grammar check" checked={spellcheckOn} onToggle={onToggleSpellcheck} />
        <ToggleRow label="Show line numbers" checked={showLineNumbers} onToggle={onToggleLineNumbers} />
      </div>
    </WordBookModal>
  );
}
