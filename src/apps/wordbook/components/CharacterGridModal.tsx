import React from 'react';
import { Editor } from '@tiptap/react';
import WordBookModal from './WordBookModal';

export interface CharacterGroup {
  label: string;
  characters: string[];
}

interface CharacterGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  title: string;
  groups: CharacterGroup[];
}

/** The shared grid-of-characters UI behind both Insert > Symbols > Special characters and > Emoji — clicking inserts the character at the cursor. */
export default function CharacterGridModal({ isOpen, onClose, editor, title, groups }: CharacterGridModalProps) {
  return (
    <WordBookModal isOpen={isOpen} onClose={onClose} title={title} maxWidthClass="max-w-lg">
      <div className="max-h-96 overflow-y-auto space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-xs font-medium text-zinc-500 mb-1.5">{group.label}</div>
            <div className="flex flex-wrap gap-1">
              {group.characters.map((char, i) => (
                <button
                  key={`${char}-${i}`}
                  type="button"
                  title={char}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().insertContent(char).run()}
                  className="w-9 h-9 flex items-center justify-center rounded border border-transparent text-lg text-zinc-800 hover:bg-zinc-100 hover:border-zinc-200 cursor-pointer"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </WordBookModal>
  );
}
