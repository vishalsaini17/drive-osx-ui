import React, { useState } from 'react';
import { X, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
import { Email } from '../types';

interface CalendarEventModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  email,
  isOpen,
  onClose,
  isLight,
}) => {
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('10:00');
  const [created, setCreated] = useState(false);

  React.useEffect(() => {
    if (email) {
      setEventTitle(`Meeting: ${email.subject.replace(/^(re|fwd):\s*/i, '')}`);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setEventDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [email]);

  if (!isOpen || !email) return null;

  const handleCreateEvent = () => {
    setCreated(true);
    setTimeout(() => {
      setCreated(false);
      onClose();
      alert(`Calendar event "${eventTitle}" added for ${eventDate} at ${eventTime}!`);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e1d22] border-white/10 text-white'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <Calendar size={18} className="text-blue-500" />
            <span>Convert Email to Calendar Event</span>
          </div>
          <button onClick={onClose} className={`p-1 rounded-lg text-slate-400 ${isLight ? 'hover:text-slate-700' : 'hover:text-white'} cursor-pointer`}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Event Title</label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className={`p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181b] border-white/10 text-white'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={`p-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181b] border-white/10 text-white'
                }`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Time</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className={`p-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181b] border-white/10 text-white'
                }`}
              />
            </div>
          </div>

          <div className={`p-2.5 rounded-xl ${isLight ? 'bg-slate-100' : 'bg-white/5'} border ${isLight ? '' : 'border-white/10'} text-xs flex flex-col gap-1`}>
            <span className={`font-bold ${isLight ? 'text-slate-600' : 'text-white/70'}`}>Participants:</span>
            <span className={`${isLight ? 'text-slate-500' : 'text-white/50'}`}>{email.senderName} ({email.senderEmail})</span>
          </div>
        </div>

        <div className={`p-3 border-t flex items-center justify-end gap-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <button onClick={onClose} className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold ${isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'} cursor-pointer`}>
            Cancel
          </button>
          <button
            onClick={handleCreateEvent}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {created ? <CheckCircle2 size={14} /> : <Calendar size={14} />}
            <span>{created ? 'Event Created!' : 'Add to Calendar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
