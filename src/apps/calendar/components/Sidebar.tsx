import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Video,
  Mail,
  Sparkles,
  MapPin,
  Clock,
  X,
} from 'lucide-react';
import { CalendarEvent } from '../../../platform/types';
import { useSystemStore } from '../../../shell/state/systemStore';

interface SidebarProps {
  isLight: boolean;
  isCompact: boolean;
  miniNavDate: Date;
  setMiniNavDate: (d: Date) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  setCurrentDate: (d: Date) => void;
  enabledCategories: Record<string, boolean>;
  toggleCategory: (cat: string) => void;
  calendarEvents: CalendarEvent[];
  onOpenEventModal: (event?: CalendarEvent, time?: string) => void;
  onDeleteEvent: (id: string) => void;
  onCloseSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isLight,
  isCompact,
  miniNavDate,
  setMiniNavDate,
  selectedDate,
  setSelectedDate,
  setCurrentDate,
  enabledCategories,
  toggleCategory,
  calendarEvents,
  onOpenEventModal,
  onDeleteEvent,
  onCloseSidebar,
}) => {
  const openAppWindow = useSystemStore((state) => state.openAppWindow);

  const getISODateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const isTodayDate = (d: Date) => isSameDay(d, new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handleMiniPrevMonth = () => {
    setMiniNavDate(new Date(miniNavDate.getFullYear(), miniNavDate.getMonth() - 1, 1));
  };

  const handleMiniNextMonth = () => {
    setMiniNavDate(new Date(miniNavDate.getFullYear(), miniNavDate.getMonth() + 1, 1));
  };

  // Calculate Mini Calendar Grid (With Week Numbers)
  const miniYear = miniNavDate.getFullYear();
  const miniMonth = miniNavDate.getMonth();
  const miniFirstDay = new Date(miniYear, miniMonth, 1).getDay();
  const miniDaysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const miniDaysInPrevMonth = new Date(miniYear, miniMonth, 0).getDate();

  const miniCalendarGrid: Array<{ dayNum: number; isCurrentMonth: boolean; dateObj: Date }> = [];
  for (let i = miniFirstDay - 1; i >= 0; i--) {
    const dayNum = miniDaysInPrevMonth - i;
    miniCalendarGrid.push({ dayNum, isCurrentMonth: false, dateObj: new Date(miniYear, miniMonth - 1, dayNum) });
  }
  for (let i = 1; i <= miniDaysInMonth; i++) {
    miniCalendarGrid.push({ dayNum: i, isCurrentMonth: true, dateObj: new Date(miniYear, miniMonth, i) });
  }
  const miniRemaining = 42 - miniCalendarGrid.length;
  for (let i = 1; i <= miniRemaining; i++) {
    miniCalendarGrid.push({ dayNum: i, isCurrentMonth: false, dateObj: new Date(miniYear, miniMonth + 1, i) });
  }

  // Week numbers
  const getWeekNumber = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(
        ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      )
    );
  };

  const selectedDateISO = getISODateString(selectedDate);
  const eventsForSelectedDate = calendarEvents.filter(
    (e) => e.date === selectedDateISO && (e.category ? enabledCategories[e.category] !== false : true)
  );

  const categoryColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    Personal: { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400 font-semibold', dot: 'bg-blue-500', border: 'border-blue-500/30' },
    Work: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400 font-semibold', dot: 'bg-amber-500', border: 'border-amber-500/30' },
    Family: { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400 font-semibold', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
    Important: { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400 font-semibold', dot: 'bg-red-500', border: 'border-red-500/30' },
  };

  return (
    <div
      className={`${
        isCompact
          ? 'absolute inset-y-0 left-0 w-64 z-30 shadow-2xl animate-in slide-in-from-left duration-200'
          : 'w-60 relative z-10'
      } shrink-0 border-r flex flex-col p-3 gap-4 overflow-y-auto ${
        isLight ? 'bg-[#f0f0f3] border-slate-300/70' : 'bg-[#252429] border-white/10'
      }`}
    >
      {/* Mini Calendar Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {monthNames[miniNavDate.getMonth()]} {miniNavDate.getFullYear()}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleMiniPrevMonth}
              className={`p-0.5 rounded transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/70'
              }`}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleMiniNextMonth}
              className={`p-0.5 rounded transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/70'
              }`}
            >
              <ChevronRight size={14} />
            </button>
            {isCompact && onCloseSidebar && (
              <button
                onClick={onCloseSidebar}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white ml-1"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Mini Calendar Days of Week Header */}
        <div className="grid grid-cols-8 text-center text-[10px] font-bold text-slate-400 dark:text-white/40">
          <div className="py-0.5">#</div>
          {dayNamesShort.map((day, idx) => (
            <div key={idx} className="py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Mini Calendar Grid (With Week Numbers) */}
        <div className="grid grid-cols-8 text-center text-[11px] gap-y-0.5">
          {Array.from({ length: 6 }).map((_, weekIndex) => {
            const weekCells = miniCalendarGrid.slice(weekIndex * 7, weekIndex * 7 + 7);
            if (weekCells.length === 0) return null;
            const firstCellDate = weekCells[0]?.dateObj;
            const weekNum = firstCellDate ? getWeekNumber(firstCellDate) : '';

            return (
              <React.Fragment key={weekIndex}>
                {/* Week number label column */}
                <div className="flex items-center justify-center text-[9px] font-mono text-slate-400 dark:text-white/30">
                  {weekNum}
                </div>

                {/* 7 Days of the week */}
                {weekCells.map((cell, dayIdx) => {
                  const activeToday = isTodayDate(cell.dateObj);
                  const activeSelected = isSameDay(cell.dateObj, selectedDate);

                  return (
                    <div key={dayIdx} className="flex items-center justify-center">
                      <button
                        onClick={() => {
                          setSelectedDate(cell.dateObj);
                          setCurrentDate(new Date(cell.dateObj.getFullYear(), cell.dateObj.getMonth(), 1));
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-semibold text-[11px] transition-all cursor-pointer ${
                          activeToday
                            ? 'bg-blue-600 text-white font-bold'
                            : activeSelected
                            ? 'text-blue-500 font-bold bg-blue-500/15'
                            : cell.isCurrentMonth
                            ? isLight
                              ? 'text-slate-800 hover:bg-slate-200'
                              : 'text-white/90 hover:bg-white/10'
                            : isLight
                            ? 'text-slate-300'
                            : 'text-white/20'
                        }`}
                      >
                        {cell.dayNum}
                      </button>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className={`h-[1px] ${isLight ? 'bg-slate-300/60' : 'bg-white/10'}`} />

      {/* Categories Toggle List */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
          Calendars
        </span>
        {['Personal', 'Work', 'Family', 'Important'].map((cat) => {
          const colors = categoryColors[cat];
          const isChecked = enabledCategories[cat] !== false;
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
                isLight ? 'hover:bg-slate-200/70' : 'hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                <span className={`font-medium ${isChecked ? '' : 'line-through opacity-50'}`}>{cat}</span>
              </div>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className={`h-[1px] ${isLight ? 'bg-slate-300/60' : 'bg-white/10'}`} />

      {/* Selected Date Events List Section */}
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-white/80'}`}>
            {isTodayDate(selectedDate)
              ? 'Today'
              : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
          </span>
          <button
            onClick={() => onOpenEventModal(undefined)}
            className="text-blue-500 hover:text-blue-600 p-0.5 rounded cursor-pointer"
            title="Add Event for Selected Date"
          >
            <Plus size={14} />
          </button>
        </div>

        {eventsForSelectedDate.length > 0 ? (
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
            {eventsForSelectedDate.map((evt) => {
              const colors = categoryColors[evt.category || 'Personal'];
              return (
                <div
                  key={evt.id}
                  className={`p-2.5 rounded-xl border flex flex-col gap-1.5 text-xs group relative shadow-2xs ${
                    isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                      <span className="font-bold truncate">{evt.title}</span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onOpenEventModal(evt)}
                        className="text-slate-400 hover:text-blue-500 p-0.5 rounded cursor-pointer"
                        title="Edit Event"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteEvent(evt.id)}
                        className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {evt.time && (
                    <span className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                      {evt.time} {evt.endTime ? `- ${evt.endTime}` : ''}
                    </span>
                  )}

                  {evt.location && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-white/50">
                      <MapPin size={10} className="text-blue-500 shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-white/5">
                    {evt.meetingLink && (
                      <button
                        onClick={() => openAppWindow('meeting')}
                        className="flex-1 py-1 px-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Video size={10} /> Meet
                      </button>
                    )}

                    {evt.attendees && evt.attendees.length > 0 && (
                      <button
                        onClick={() => openAppWindow('mail')}
                        className="flex-1 py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Mail size={10} /> Mail
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs italic text-slate-400 dark:text-white/30">
            No events scheduled
          </div>
        )}
      </div>
    </div>
  );
};
