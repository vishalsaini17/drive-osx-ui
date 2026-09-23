import React, { useEffect, useState } from 'react';
import WordBookModal from './WordBookModal';

interface DictionaryDefinition {
  partOfSpeech: string;
  definitions: string[];
  synonyms: string[];
}

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTerm: string;
}

/** Looks up real definitions via the free, key-less dictionaryapi.dev — no local wordlist bundled with the app, so this needs internet access to work, same as the platform's other external calls (image uploads, etc.). */
export default function DictionaryModal({ isOpen, onClose, initialTerm }: DictionaryModalProps) {
  const [term, setTerm] = useState(initialTerm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<DictionaryDefinition[]>([]);

  const lookup = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setEntries([]);
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(trimmed)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'No definition found for that word.' : 'The dictionary lookup failed.');
        return res.json();
      })
      .then((data: any[]) => {
        const meanings: DictionaryDefinition[] = [];
        for (const entry of data) {
          for (const meaning of entry.meanings ?? []) {
            meanings.push({
              partOfSpeech: meaning.partOfSpeech,
              definitions: (meaning.definitions ?? []).slice(0, 3).map((d: any) => d.definition),
              synonyms: (meaning.synonyms ?? []).slice(0, 6),
            });
          }
        }
        setEntries(meanings);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not reach the dictionary service.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && initialTerm.trim()) {
      setTerm(initialTerm);
      lookup(initialTerm);
    } else if (isOpen) {
      setTerm('');
      setEntries([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTerm]);

  return (
    <WordBookModal isOpen={isOpen} onClose={onClose} title="Dictionary" maxWidthClass="max-w-md">
      <div className="flex gap-1.5 mb-3">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') lookup(term);
          }}
          placeholder="Look up a word…"
          className="flex-1 border border-zinc-300 rounded px-2 py-1.5 text-sm"
          autoFocus
        />
        <button
          onClick={() => lookup(term)}
          disabled={!term.trim() || loading}
          className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Look up
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {loading && <div className="text-xs text-zinc-400 px-1 py-2">Looking up "{term}"…</div>}
        {!loading && error && <div className="text-xs text-red-500 px-1 py-2">{error}</div>}
        {!loading &&
          entries.map((entry, i) => (
            <div key={i} className="mb-3">
              <div className="text-xs italic text-zinc-500 mb-1">{entry.partOfSpeech}</div>
              <ol className="list-decimal list-inside space-y-0.5">
                {entry.definitions.map((def, j) => (
                  <li key={j} className="text-sm text-zinc-800">
                    {def}
                  </li>
                ))}
              </ol>
              {entry.synonyms.length > 0 && (
                <div className="text-[11px] text-zinc-400 mt-1">Synonyms: {entry.synonyms.join(', ')}</div>
              )}
            </div>
          ))}
      </div>
    </WordBookModal>
  );
}
