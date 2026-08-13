import React from 'react';
import { Plus, X, Video, Mail, Trash2 } from 'lucide-react';
import { CalendarEvent } from '../../../platform/types';
import { isEventOnDate } from '../utils/recurrence';

interface MonthViewProps {
  isLight: boolean;
  isVeryCompact: boolean;
  mainCalendarGrid: Array<{ dayNum: number; isCurrentMonth: boolean; dateObj: Date; labelMonth?: string }>;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  calendarEvents: CalendarEvent[];
  enabledCategories: Record<string, boolean>;
  onOpenEventModal: (event?: CalendarEvent, dateObj?: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  isLight,
  isVeryCompact,
  mainCalendarGrid,
  selectedDate,
  setSelectedDate,
  calendarEvents,
  enabledCategories,
  onOpenEventModal,
}) => {
  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayNamesFull = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const categoryColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    Personal: { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400 font-semibold', dot: 'bg-blue-500', border: 'border-blue-500/30' },
    Work: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400 font-semibold', dot: 'bg-amber-500', border: 'border-amber-500/30' },
    Family: { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400 font-semibold', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
    Important: { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400 font-semibold', dot: 'bg-red-500', border: 'border-red-500/30' },
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const isTodayDate = (d: Date) => isSameDay(d, new Date());

  const getISODateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Day Names Row */}
      <div
        className={`grid grid-cols-7 border-b text-center text-[10px] sm:text-[11px] font-bold shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-white/10 bg-[#28272c] text-white/50'
        }`}
      >
        {(isVeryCompact ? dayNamesShort : dayNamesFull).map((day, idx) => (
          <div key={idx} className="py-1 sm:py-1.5 border-r last:border-r-0 border-slate-200/50 dark:border-white/5 truncate">
            {day}
          </div>
        ))}
      </div>

      {/* Month Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0 divide-x divide-y divide-slate-200/70 dark:divide-white/10 overflow-hidden">
        {mainCalendarGrid.map((cell, idx) => {
          const dateISO = getISODateString(cell.dateObj);
          const isToday = isTodayDate(cell.dateObj);
          const isSelected = isSameDay(cell.dateObj, selectedDate);

          // Filter cell events, including recurring rules
          const cellEvents = calendarEvents.filter((e) => {
            if (e.category && enabledCategories[e.category] === false) return false;
            return isEventOnDate(e, dateISO);
          });

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(cell.dateObj)}
              onDoubleClick={() => onOpenEventModal(undefined, cell.dateObj)}
              className={`relative p-0.5 sm:p-1 flex flex-col gap-0.5 sm:gap-1 min-h-0 overflow-hidden transition-colors cursor-pointer group ${
                isSelected
                  ? isLight
                    ? 'bg-blue-50/70'
                    : 'bg-blue-500/10'
                  : !cell.isCurrentMonth
                  ? isLight
                    ? 'bg-slate-50/60 text-slate-400'
                    : 'bg-black/20 text-white/30'
                  : isLight
                  ? 'hover:bg-slate-50/90 bg-white'
                  : 'hover:bg-white/5'
              }`}
            >
              {/* Top cell row: Date number */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <span
                    className={`text-[10px] sm:text-xs font-semibold px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full transition-all ${
                      isToday
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : isSelected
                        ? 'text-blue-600 font-bold'
                        : cell.isCurrentMonth
                        ? isLight
                          ? 'text-slate-800'
                          : 'text-white/90'
                        : isLight
                        ? 'text-slate-400'
                        : 'text-white/30'
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {cell.labelMonth && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-white/40 hidden sm:inline">
                      {cell.labelMonth}
                    </span>
                  )}
                </div>

                {/* Quick Add button on cell hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEventModal(undefined, cell.dateObj);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 hover:text-blue-600 transition-opacity hidden sm:block cursor-pointer"
                  title="Add Event"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Render Events inside cell */}
              <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 overflow-y-auto min-h-0 pr-0.5 custom-scrollbar">
                {cellEvents.map((evt) => {
                  const colors = categoryColors[evt.category || 'Personal'];
                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEventModal(evt, cell.dateObj);
                      }}
                      className={`text-[9px] sm:text-[11px] leading-tight px-1 sm:px-1.5 py-0.5 rounded-md border flex items-center justify-between gap-1 truncate ${colors.bg} ${colors.text} ${colors.border}`}
                      title={`${evt.title} (${evt.time || 'All day'})`}
                    >
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                        <span className="truncate">{evt.title}</span>
                      </div>
                      {evt.time && evt.time !== 'All day' && (
                        <span className="text-[8px] sm:text-[9px] opacity-75 shrink-0 hidden md:inline">
                          {evt.time}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
