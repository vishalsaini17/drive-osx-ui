import { CharacterGroup } from '../components/CharacterGridModal';

/** A curated set — not the Unicode table Google Docs offers, but real, working insertion of the symbols people actually reach for. */
export const SPECIAL_CHARACTER_GROUPS: CharacterGroup[] = [
  { label: 'Punctuation', characters: ['©', '®', '™', '§', '¶', '•', '…', '–', '—', '‘', '’', '“', '”', '‽', '¡', '¿'] },
  { label: 'Math', characters: ['±', '×', '÷', '=', '≠', '≈', '≤', '≥', '∞', '√', '∑', '∆', '∏', '∫', '°', '‰'] },
  { label: 'Fractions', characters: ['½', '⅓', '⅔', '¼', '¾', '⅕', '⅛', '⅜', '⅝', '⅞'] },
  { label: 'Currency', characters: ['$', '€', '£', '¥', '¢', '₹', '₩', '₽', '₺', '฿'] },
  { label: 'Arrows', characters: ['←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '⇑', '⇓'] },
  { label: 'Greek', characters: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'σ', 'φ', 'ω', 'Σ', 'Δ', 'Ω'] },
  { label: 'Shapes & marks', characters: ['★', '☆', '♥', '♦', '♣', '♠', '✓', '✗', '⚑', '⬤', '▲', '▼'] },
];

/** Likewise curated, grouped the way Docs' own emoji picker groups them. */
export const EMOJI_GROUPS: CharacterGroup[] = [
  { label: 'Smileys & People', characters: ['😀', '😂', '🙂', '😉', '😊', '😍', '🤔', '😎', '😢', '😡', '😴', '🥳', '👍', '👎', '🙏', '👏', '💪', '🤝', '✌️', '👋'] },
  { label: 'Animals & Nature', characters: ['🐶', '🐱', '🐭', '🦁', '🐘', '🐢', '🐦', '🐝', '🌸', '🌳', '🌞', '🌙', '⭐', '🔥', '🌈', '❄️'] },
  { label: 'Food & Drink', characters: ['🍎', '🍌', '🍕', '🍔', '🍟', '🍩', '🍫', '☕', '🍺', '🍷', '🍰', '🍉'] },
  { label: 'Activities', characters: ['⚽', '🏀', '🎮', '🎸', '🎨', '🎬', '🎓', '🏆', '🎯', '🎲'] },
  { label: 'Travel & Places', characters: ['✈️', '🚗', '🚀', '🏠', '🏢', '🗺️', '🏖️', '⛰️', '🌍'] },
  { label: 'Objects', characters: ['💡', '📱', '💻', '📷', '📚', '✏️', '📌', '🔒', '⏰', '💰'] },
  { label: 'Symbols', characters: ['❤️', '✅', '❌', '⚠️', '⭐', '🔴', '🟢', '🔵', '➡️', '♻️'] },
  { label: 'Flags', characters: ['🏳️', '🏴', '🚩', '🏁'] },
];
