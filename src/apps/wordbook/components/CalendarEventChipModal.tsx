import React from 'react';
import { CalendarEvent } from '../../../platform/types';
import WordBookModal from './WordBookModal';

interface CalendarEventChipModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onInsert: (event: CalendarEvent) => void;
}

/** Lists the real events from the OS's own Calendar app (`calendarEvents` in systemStore) — not a mock list. */
export default function CalendarEventChipModal({ isOpen, onClose, events, onInsert }: CalendarEventChipModalProps) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <WordBookModal isOpen={isOpen} onClose={onClose} title="Insert calendar event" maxWidthClass="max-w-sm">
      <div className="max-h-72 overflow-y-auto space-y-1">
        {sorted.length === 0 && <div className="text-xs text-zinc-400 px-1 py-2">No events on your calendar yet.</div>}
        {sorted.map((event) => (
          <button
            key={event.id}
            onClick={() => {
              onInsert(event);
              onClose();
            }}
            className="w-full flex flex-col items-start px-2 py-1.5 rounded hover:bg-zinc-100 text-left cursor-pointer"
          >
            <span className="text-xs font-medium text-zinc-800">{event.title}</span>
            <span className="text-[11px] text-zinc-400">
              {event.date}
              {event.time ? ` · ${event.time}` : ''}
            </span>
          </button>
        ))}
      </div>
    </WordBookModal>
  );
}
