import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent } from '../../../types';
import { isEventOnDate } from '../utils/recurrence';

interface YearViewProps {
  isLight: boolean;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  events: CalendarEvent[];
  enabledCategories: Record<string, boolean>;
  onSelectDateAndSwitchView: (date: Date, view: 'day' | 'month') => void;
}

export const YearView: React.FC<YearViewProps> = ({
  isLight,
  currentDate,
  setCurrentDate,
  events,
  enabledCategories,
  onSelectDateAndSwitchView,
}) => {
  const currentYear = currentDate.getFullYear();

  const handlePrevYear = () => {
    setCurrentDate(new Date(currentYear - 1, currentDate.getMonth(), 1));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(currentYear + 1, currentDate.getMonth(), 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const isTodayDate = (d: Date) => {
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  // Helper to format ISO YYYY-MM-DD
  const getISODate = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#1e1d22]">
      {/* Year Header Toolbar */}
      <div
        className={`px-4 py-2.5 border-b shrink-0 flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#252429] border-white/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevYear}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight ? 'bg-white hover:bg-slate-100 border-slate-300' : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
            title="Previous Year"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
            {currentYear}
          </span>

          <button
            onClick={handleNextYear}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight ? 'bg-white hover:bg-slate-100 border-slate-300' : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
            title="Next Year"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
          Click any day or month to inspect schedule
        </div>
      </div>

      {/* 12 Months Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {monthNames.map((mName, monthIdx) => {
            const firstDay = new Date(currentYear, monthIdx, 1).getDay();
            const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();

            const monthGrid: Array<{ dayNum: number | null; dateObj: Date | null }> = [];
            // Leading empty slots
            for (let i = 0; i < firstDay; i++) {
              monthGrid.push({ dayNum: null, dateObj: null });
            }
            // Days of the month
            for (let i = 1; i <= daysInMonth; i++) {
              monthGrid.push({ dayNum: i, dateObj: new Date(currentYear, monthIdx, i) });
            }

            return (
              <div
                key={mName}
                className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all hover:shadow-md ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#252429] border-white/10'
                }`}
              >
                {/* Month Title */}
                <button
                  onClick={() => onSelectDateAndSwitchView(new Date(currentYear, monthIdx, 1), 'month')}
                  className="flex items-center justify-between text-left cursor-pointer group"
                >
                  <span className={`font-bold text-sm group-hover:text-blue-500 transition-colors ${
                    isLight ? 'text-slate-800' : 'text-white'
                  }`}>
                    {mName}
                  </span>
                  <CalendarIcon size={13} className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                </button>

                {/* Day Names Header */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 dark:text-white/40">
                  {dayNamesShort.map((d, idx) => (
                    <div key={idx}>{d}</div>
                  ))}
                </div>

                {/* Month Mini Grid */}
                <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
                  {monthGrid.map((cell, cellIdx) => {
                    if (!cell.dayNum || !cell.dateObj) {
                      return <div key={cellIdx} className="h-6" />;
                    }

                    const dateISO = getISODate(currentYear, monthIdx, cell.dayNum);
                    const activeToday = isTodayDate(cell.dateObj);

                    // Check if date has events
                    const dayEvents = events.filter((e) => {
                      if (e.category && enabledCategories[e.category] === false) return false;
                      return isEventOnDate(e, dateISO);
                    });

                    const hasEvents = dayEvents.length > 0;

                    return (
                      <button
                        key={cellIdx}
                        onClick={() => onSelectDateAndSwitchView(cell.dateObj!, 'day')}
                        className={`h-6 w-6 mx-auto rounded-full flex flex-col items-center justify-center relative font-semibold text-[10px] transition-all cursor-pointer ${
                          activeToday
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : hasEvents
                            ? isLight
                              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                              : 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30'
                            : isLight
                            ? 'hover:bg-slate-100 text-slate-700'
                            : 'hover:bg-white/10 text-white/80'
                        }`}
                        title={`${cell.dayNum} ${mName} ${currentYear}: ${dayEvents.length} event(s)`}
                      >
                        <span>{cell.dayNum}</span>
                        {hasEvents && !activeToday && (
                          <div className="w-1 h-1 rounded-full bg-blue-500 -mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
