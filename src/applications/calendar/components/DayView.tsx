import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Users, Video, Trash2, Edit2, Plus, Clock, Mail } from 'lucide-react';
import { CalendarEvent } from '../../../types';
import { useSystemStore } from '../../../systemStore';

interface DayViewProps {
  isLight: boolean;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  events: CalendarEvent[];
  onOpenEventModal: (event?: CalendarEvent, initialTime?: string) => void;
  onDeleteEvent: (id: string) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  isLight,
  currentDate,
  setCurrentDate,
  events,
  onOpenEventModal,
  onDeleteEvent,
}) => {
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8 AM on load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 448; // 8 * 56px
    }
  }, [currentDate]);

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 1);
    setCurrentDate(next);
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);

  const formatHourLabel = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const formatTimeForModal = (hour: number) => {
    const hStr = String(hour === 0 ? 12 : hour > 12 ? hour - 12 : hour).padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${hStr}:00 ${ampm}`;
  };

  const parseHourFromTime = (timeStr?: string): number | null => {
    if (!timeStr || timeStr === 'All day') return null;
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour;
  };

  const categoryColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    Personal: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500' },
    Work: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-500' },
    Family: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500' },
    Important: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-500' },
  };

  // Current time position indicator calculation
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const topMinuteOffset = (currentHour * 60 + currentMinute) * (56 / 60);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#1e1d22]">
      {/* Day Header Bar */}
      <div
        className={`px-4 py-3 border-b shrink-0 flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#252429] border-white/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevDay}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight ? 'bg-white hover:bg-slate-100 border-slate-300' : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              {isToday(currentDate) && (
                <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
              {events.length} event(s) scheduled for this day
            </p>
          </div>
          <button
            onClick={handleNextDay}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight ? 'bg-white hover:bg-slate-100 border-slate-300' : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={() => onOpenEventModal(undefined)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Add Event
        </button>
      </div>

      {/* 24-Hour Timeline Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="relative min-h-[1344px] flex">
          {/* Current Time Indicator Red Line (only if today) */}
          {isToday(currentDate) && (
            <div
              className="absolute left-16 right-0 border-t-2 border-red-500 z-20 flex items-center pointer-events-none"
              style={{ top: `${topMinuteOffset}px` }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-sm" />
              <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.2 rounded-full -mt-0.5 ml-1">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* Hour Labels Column */}
          <div
            className={`w-16 shrink-0 border-r select-none ${
              isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#252429] border-white/10'
            }`}
          >
            {hoursArray.map((hour) => (
              <div key={hour} className="h-14 relative flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-white/40 -mt-2">
                  {formatHourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Single Day Events Canvas */}
          <div className="flex-1 relative divide-y divide-slate-200/60 dark:divide-white/5">
            {hoursArray.map((hour) => {
              const hourEvts = events.filter((e) => parseHourFromTime(e.time) === hour);

              return (
                <div
                  key={hour}
                  onClick={() => onOpenEventModal(undefined, formatTimeForModal(hour))}
                  className={`h-14 p-1 transition-colors cursor-pointer relative group ${
                    isLight ? 'hover:bg-blue-50/30' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity flex items-center gap-1 text-xs font-medium">
                    <Plus size={12} /> Add event at {formatHourLabel(hour)}
                  </div>

                  <div className="flex flex-col gap-1.5 h-full overflow-y-auto z-10 relative">
                    {hourEvts.map((evt) => {
                      const colors = categoryColors[evt.category || 'Personal'];
                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEventModal(evt);
                          }}
                          className={`p-2.5 rounded-xl border-l-4 border flex flex-col gap-1.5 text-xs shadow-2xs transition-transform hover:scale-[1.005] group/item ${colors.bg} ${colors.border}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                              <span className={`font-bold text-sm ${colors.text}`}>{evt.title}</span>
                              {evt.time && (
                                <span className={`text-xs px-2 py-0.5 rounded-md ${isLight ? 'bg-white/80' : 'bg-black/30'} font-medium`}>
                                  {evt.time} {evt.endTime ? `- ${evt.endTime}` : ''}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenEventModal(evt);
                                }}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-white/70"
                                title="Edit Event"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteEvent(evt.id);
                                }}
                                className="p-1 rounded hover:bg-red-100 text-red-500"
                                title="Delete Event"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {evt.description && (
                            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                              {evt.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-0.5 text-[11px] opacity-80">
                            {evt.location && (
                              <div className="flex items-center gap-1">
                                <MapPin size={12} className="text-blue-500" />
                                <span>{evt.location}</span>
                              </div>
                            )}

                            {evt.attendees && evt.attendees.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Users size={12} className="text-amber-500" />
                                <span>{evt.attendees.length} attendee(s)</span>
                              </div>
                            )}

                            {evt.meetingLink && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAppWindow('meeting');
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-bold hover:bg-blue-500 cursor-pointer shadow-2xs"
                              >
                                <Video size={11} /> Join OSX Meet
                              </button>
                            )}

                            {evt.attendees && evt.attendees.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAppWindow('mail');
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-white rounded-md text-[10px] font-bold hover:bg-slate-600 cursor-pointer shadow-2xs ml-auto"
                              >
                                <Mail size={11} /> Email Invites
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
