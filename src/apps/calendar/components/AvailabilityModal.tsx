import React from 'react';
import { Users, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { DEFAULT_TEAMMATES } from '../types';

interface AvailabilityModalProps {
  isLight: boolean;
  selectedDate: Date;
  onSelectTimeSlot: (timeStr: string) => void;
  onClose: () => void;
}

export const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  isLight,
  selectedDate,
  onSelectTimeSlot,
  onClose,
}) => {
  const hoursToDisplay = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  const formatHour = (h: number) => {
    if (h === 12) return '12 PM';
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
  };

  // Find hours where all teammates are FREE
  const freeHours = hoursToDisplay.filter((h) =>
    DEFAULT_TEAMMATES.every((tm) => !tm.busyHours.includes(h))
  );

  return (
    <div className="flex flex-col gap-4 font-sans text-xs">
      {/* Header Banner */}
      <div className={`p-3 rounded-xl border flex items-center justify-between ${
        isLight ? 'bg-blue-50/80 border-blue-200 text-blue-900' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-500 shrink-0" />
          <div>
            <span className="font-bold">Teammate Schedule Assistant</span>
            <p className="text-[11px] opacity-80">
              Showing availability for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {freeHours.length > 0 && (
          <span className="px-2.5 py-1 bg-emerald-500 text-white font-bold text-[10px] rounded-full shadow-2xs">
            {freeHours.length} Optimal Slot(s) Free
          </span>
        )}
      </div>

      {/* Teammate Timelines */}
      <div className="flex flex-col gap-2.5 overflow-x-auto pb-1">
        {/* Hours Header Row */}
        <div className="flex items-center gap-2 min-w-[500px]">
          <div className="w-36 shrink-0 font-bold text-slate-400 dark:text-white/40">Teammate</div>
          <div className="flex-1 grid grid-cols-11 text-center font-bold text-[10px] text-slate-400 dark:text-white/40">
            {hoursToDisplay.map((h) => (
              <div key={h}>{formatHour(h)}</div>
            ))}
          </div>
        </div>

        {/* Teammate Rows */}
        {DEFAULT_TEAMMATES.map((tm) => (
          <div
            key={tm.id}
            className={`p-2 rounded-xl border flex items-center gap-2 min-w-[500px] ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#252429] border-white/10'
            }`}
          >
            <div className="w-36 shrink-0 flex items-center gap-2">
              <span className="text-base">{tm.avatar}</span>
              <div className="min-w-0">
                <div className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{tm.name}</div>
                <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{tm.role}</div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-11 gap-1">
              {hoursToDisplay.map((h) => {
                const isBusy = tm.busyHours.includes(h);
                return (
                  <div
                    key={h}
                    className={`h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                      isBusy
                        ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}
                    title={`${tm.name} is ${isBusy ? 'Busy' : 'Free'} at ${formatHour(h)}`}
                  >
                    {isBusy ? 'Busy' : 'Free'}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Recommended Open Time Slots */}
      <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
        <span className={`font-bold text-xs ${isLight ? 'text-slate-700' : 'text-white/80'}`}>
          Select an open slot to schedule:
        </span>
        <div className="flex flex-wrap gap-2">
          {hoursToDisplay.map((h) => {
            const isAllFree = DEFAULT_TEAMMATES.every((tm) => !tm.busyHours.includes(h));
            const timeStr = `${String(h > 12 ? h - 12 : h).padStart(2, '0')}:00 ${h >= 12 ? 'PM' : 'AM'}`;

            return (
              <button
                key={h}
                onClick={() => onSelectTimeSlot(timeStr)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isAllFree
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/30'
                }`}
              >
                {isAllFree ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                <span>{timeStr}</span>
                {isAllFree && <span className="text-[10px] opacity-80">(Best)</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
