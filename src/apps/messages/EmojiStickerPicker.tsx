import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { MessengerPalette } from './useMessengerTheme';

/**
 * Emoji and stickers, WhatsApp Web style.
 *
 * No GIF tab: that needs a real image provider (Giphy/Tenor) behind an API
 * key this project does not have configured, and a picker offering search
 * results that never load is worse than not offering it. Emoji are plain
 * Unicode — always available, no provider needed. Stickers are a curated set
 * of larger emoji rather than custom artwork, for the same reason.
 */

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys & People',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '😮', '😯', '😲', '😳', '🥺', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '😤', '😡',
      '😠', '🤬', '😈', '💀', '👻', '👽', '🤖', '👍', '👎', '👏', '🙌', '🙏', '👋', '🤝', '💪', '✌️',
    ],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    label: 'Animals & Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈',
      '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
      '🦋', '🐌', '🐞', '🐢', '🐍', '🦎', '🐙', '🦑', '🦀', '🐠', '🐬', '🐳', '🐘', '🦒', '🌵', '🌲',
      '🌳', '🌴', '🌻', '🌸', '🌹', '🌷', '🍀', '🍁',
    ],
  },
  {
    label: 'Food & Drink',
    emojis: [
      '🍏', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑',
      '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥦', '🍞', '🥐', '🥨', '🧀', '🍔', '🍟', '🍕', '🌭', '🥪',
      '🌮', '🌯', '🍜', '🍣', '🍩', '🍪', '🎂', '🍰', '🍫', '🍿', '🍺', '🍷', '☕', '🍵',
    ],
  },
  {
    label: 'Activities & Objects',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🎮', '🎲', '🎯', '🎨', '🎬', '🎤', '🎧', '🎸',
      '🎹', '📱', '💻', '⌚', '📷', '🔥', '⭐', '✨', '🎉', '🎊', '🎁', '🏆', '💡', '📌', '🔒', '💰',
      '⏰', '📅', '✅', '❌',
    ],
  },
];

const STICKERS: { emoji: string; label: string }[] = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laughing' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😢', label: 'Crying' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🙏', label: 'Thanks' },
  { emoji: '💯', label: '100' },
  { emoji: '😍', label: 'Love it' },
  { emoji: '🥳', label: 'Celebrate' },
  { emoji: '😴', label: 'Sleepy' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '😎', label: 'Cool' },
  { emoji: '🙌', label: 'Raised hands' },
  { emoji: '✨', label: 'Sparkles' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '🌟', label: 'Star' },
  { emoji: '🎂', label: 'Birthday' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🐶', label: 'Dog' },
  { emoji: '🐱', label: 'Cat' },
];

export interface EmojiStickerPickerProps {
  palette: MessengerPalette;
  /** Inserts into the draft; the picker stays open so several can be added. */
  onSelectEmoji: (emoji: string) => void;
  /** Sends immediately, like a WhatsApp sticker tap — not typed into the box. */
  onSelectSticker: (sticker: string) => void;
  onClose: () => void;
}

export default function EmojiStickerPicker({
  palette,
  onSelectEmoji,
  onSelectSticker,
  onClose,
}: EmojiStickerPickerProps) {
  const [tab, setTab] = useState<'emoji' | 'stickers'>('emoji');
  const [search, setSearch] = useState('');

  const visibleCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return EMOJI_CATEGORIES;
    // Emoji carry no text of their own here, so search can only jump between
    // category groups — still useful for a long list, not a full-text search.
    return EMOJI_CATEGORIES.filter((category) => category.label.toLowerCase().includes(term));
  }, [search]);

  return (
    <div
      className={`w-80 rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${palette.panelBg} ${palette.border}`}
      style={{ maxHeight: 360 }}
    >
      <div className={`flex items-center border-b shrink-0 ${palette.border}`}>
        <button
          onClick={() => setTab('emoji')}
          className={`flex-1 py-2 text-xs font-bold cursor-pointer border-b-2 ${
            tab === 'emoji' ? 'text-blue-600 border-blue-600' : `border-transparent ${palette.textMuted}`
          }`}
        >
          Emoji
        </button>
        <button
          onClick={() => setTab('stickers')}
          className={`flex-1 py-2 text-xs font-bold cursor-pointer border-b-2 ${
            tab === 'stickers' ? 'text-blue-600 border-blue-600' : `border-transparent ${palette.textMuted}`
          }`}
        >
          Stickers
        </button>
        <button onClick={onClose} className={`p-2 shrink-0 ${palette.hover} cursor-pointer`} aria-label="Close">
          <X size={14} className={palette.textMuted} />
        </button>
      </div>

      {tab === 'emoji' ? (
        <>
          <div className="p-2 shrink-0">
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories"
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${palette.inputBg} ${palette.text}`}
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 pb-2">
            {visibleCategories.length === 0 ? (
              <p className={`text-[11px] text-center py-6 ${palette.textMuted}`}>No categories match “{search}”.</p>
            ) : (
              visibleCategories.map((category) => (
                <div key={category.label} className="mb-2">
                  <div className={`text-[10px] font-bold uppercase tracking-wide px-1 mb-1 ${palette.textSubtle}`}>
                    {category.label}
                  </div>
                  <div className="grid grid-cols-8 gap-0.5">
                    {category.emojis.map((emoji, index) => (
                      <button
                        key={`${emoji}-${index}`}
                        onClick={() => onSelectEmoji(emoji)}
                        title={emoji}
                        className={`text-lg leading-none p-1.5 rounded-lg cursor-pointer ${palette.hover}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((sticker) => (
              <button
                key={sticker.emoji}
                onClick={() => onSelectSticker(sticker.emoji)}
                title={sticker.label}
                className={`aspect-square flex items-center justify-center text-3xl rounded-xl border cursor-pointer ${palette.border} ${palette.hover}`}
              >
                {sticker.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
