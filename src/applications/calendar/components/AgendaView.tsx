import React from 'react';
import { CalendarEvent } from '../../../types';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Video,
  Mail,
  Trash2,
  Edit2,
  Plus,
  Repeat,
  Bell,
  Globe,
  Tag,
} from 'lucide-react';
import { useSystemStore } from '../../../systemStore';

interface AgendaViewProps {
  isLight: boolean;
  events: CalendarEvent[];
  searchQuery: string;
  enabledCategories: Record<string, boolean>;
  onOpenEventModal: (event?: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  isLight,
  events,
  searchQuery,
  enabledCategories,
  onOpenEventModal,
  onDeleteEvent,
}) => {
  const openAppWindow = useSystemStore((state) => state.openAppWindow);

  // Filter events
  const filteredEvents = events.filter((evt) => {
    if (evt.category && enabledCategories[evt.category] === false) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      evt.title.toLowerCase().includes(q) ||
      evt.description?.toLowerCase().includes(q) ||
      evt.location?.toLowerCase().includes(q)
    );
  });

  // Sort events chronologically by date and time
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dA = new Date(a.date + 'T' + (a.time || '00:00'));
    const dB = new Date(b.date + 'T' + (b.time || '00:00'));
    return dA.getTime() - dB.getTime();
  });

  // Group events by Date string
  const groupedEvents: Record<string, CalendarEvent[]> = {};
  sortedEvents.forEach((evt) => {
    if (!groupedEvents[evt.date]) {
      groupedEvents[evt.date] = [];
    }
    groupedEvents[evt.date].push(evt);
  });

  const categoryColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    Personal: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500/30' },
    Work: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-500/30' },
    Family: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
    Important: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-500/30' },
  };

  const getRelativeDateLabel = (dateStr: string) => {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayISO) return 'Today';
    if (dateStr === tomorrowISO) return 'Tomorrow';

    const evtDate = new Date(dateStr + 'T00:00:00');
    return evtDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#1e1d22]">
      {/* Agenda Header */}
      <div
        className={`px-4 py-3 border-b shrink-0 flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#252429] border-white/10'
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="text-blue-500" size={20} />
          <span className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Agenda & Schedule Stream
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 text-xs font-bold ml-1">
            {sortedEvents.length} total
          </span>
        </div>

        <button
          onClick={() => onOpenEventModal(undefined)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Create Event
        </button>
      </div>

      {/* Agenda Events List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {Object.keys(groupedEvents).length > 0 ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {Object.entries(groupedEvents).map(([dateStr, dateEvts]) => (
              <div key={dateStr} className="flex flex-col gap-2">
                {/* Date Banner */}
                <div className="flex items-center gap-2 sticky top-0 z-10 py-1 bg-white/90 dark:bg-[#1e1d22]/90 backdrop-blur-xs">
                  <span className={`text-sm font-black uppercase tracking-wider ${
                    dateStr === new Date().toISOString().split('T')[0]
                      ? 'text-blue-600 dark:text-blue-400'
                      : isLight
                      ? 'text-slate-700'
                      : 'text-white/80'
                  }`}>
                    {getRelativeDateLabel(dateStr)}
                  </span>
                  <div className={`flex-1 h-[1px] ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
                </div>

                {/* Event Cards */}
                <div className="flex flex-col gap-2.5">
                  {dateEvts.map((evt) => {
                    const colors = categoryColors[evt.category || 'Personal'];
                    return (
                      <div
                        key={evt.id}
                        className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 shadow-2xs transition-all hover:shadow-md ${
                          isLight ? 'bg-white border-slate-200' : 'bg-[#252429] border-white/10'
                        }`}
                      >
                        {/* Title & Actions Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                            <div>
                              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {evt.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                                  {evt.category || 'Personal'}
                                </span>
                                {evt.time && (
                                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/60">
                                    <Clock size={12} />
                                    <span>{evt.time} {evt.endTime ? `- ${evt.endTime}` : ''}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onOpenEventModal(evt)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/70"
                              title="Edit Event"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteEvent(evt.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                              title="Delete Event"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        {evt.description && (
                          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                            {evt.description}
                          </p>
                        )}

                        {/* Metadata Tags Row: Location, Attendees, Recurrence, Reminder, Timezone */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-white/60 pt-1 border-t border-slate-100 dark:border-white/5">
                          {evt.location && (
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                              <MapPin size={12} className="text-blue-500" />
                              <span>{evt.location}</span>
                            </div>
                          )}

                          {evt.recurrence && evt.recurrence !== 'none' && (
                            <div className="flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-md capitalize font-medium">
                              <Repeat size={12} />
                              <span>{evt.recurrence}</span>
                            </div>
                          )}

                          {evt.reminder && evt.reminder !== 'none' && (
                            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md font-medium">
                              <Bell size={12} />
                              <span>Reminder: {evt.reminder}</span>
                            </div>
                          )}

                          {evt.timezone && (
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                              <Globe size={12} />
                              <span>{evt.timezone.split('/')[1] || evt.timezone}</span>
                            </div>
                          )}
                        </div>

                        {/* Attendees & Integration Buttons */}
                        {(evt.attendees?.length || evt.meetingLink) && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                            {/* Attendees Chips */}
                            {evt.attendees && evt.attendees.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Users size={13} className="text-amber-500 shrink-0" />
                                {evt.attendees.map((att, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                      att.status === 'accepted'
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                        : att.status === 'declined'
                                        ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                    }`}
                                  >
                                    {att.name || att.email} ({att.status || 'pending'})
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 ml-auto">
                              {evt.meetingLink && (
                                <button
                                  onClick={() => openAppWindow('meeting')}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                >
                                  <Video size={12} /> Join OSX Meet
                                </button>
                              )}

                              {evt.attendees && evt.attendees.length > 0 && (
                                <button
                                  onClick={() => openAppWindow('mail')}
                                  className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                >
                                  <Mail size={12} /> Email Invites
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <CalendarDays size={48} className="text-slate-300 dark:text-white/20 mb-3" />
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-700' : 'text-white/80'}`}>
              No matching events found
            </h3>
            <p className={`text-xs mt-1 max-w-sm ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
              Try clearing search filters or create a new event using the button above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
