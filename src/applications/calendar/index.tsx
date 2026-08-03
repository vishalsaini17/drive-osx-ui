import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Sidebar as SidebarIcon,
  Bell,
  Clock,
  Video,
  Mail,
} from 'lucide-react';
import { useSystemStore } from '../../systemStore';
import { CalendarEvent } from '../../types';
import { CalendarViewMode } from './types';
import { HeaderToolbar } from './components/HeaderToolbar';
import { Sidebar } from './components/Sidebar';
import { DayView } from './components/DayView';
import { MonthView } from './components/MonthView';
import { YearView } from './components/YearView';
import { AgendaView } from './components/AgendaView';
import { EventModal } from './components/EventModal';
import { isEventOnDate } from './utils/recurrence';

export default function CalendarApp() {
  const theme = useSystemStore((state) => state.settings.theme);
  const isLight = theme === 'classic-light';

  // System Store state
  const calendarEvents = useSystemStore((state) => state.calendarEvents);
  const addCalendarEvent = useSystemStore((state) => state.addCalendarEvent);
  const updateCalendarEvent = useSystemStore((state) => state.updateCalendarEvent);
  const deleteCalendarEvent = useSystemStore((state) => state.deleteCalendarEvent);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);

  // Container width state for responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isCompact = containerWidth < 680;
  const isVeryCompact = containerWidth < 480;

  // Auto-hide sidebar on compact containers unless manually toggled
  useEffect(() => {
    if (isCompact) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  }, [isCompact]);

  // Date Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [miniNavDate, setMiniNavDate] = useState<Date>(new Date());

  // UI State
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Category filter state
  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>({
    Personal: true,
    Work: true,
    Family: true,
    Important: true,
  });

  const toggleCategory = (cat: string) => {
    setEnabledCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Modal / Editing state
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | undefined>(undefined);
  const [modalInitialTime, setModalInitialTime] = useState<string | undefined>('10:00 AM');

  // Reminders Toast Banner State
  const [reminderToast, setReminderToast] = useState<{ title: string; time: string } | null>(null);

  // Trigger sample reminder notification after 3 seconds to demonstrate functionality
  useEffect(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const dueEvents = calendarEvents.filter((e) => e.date === todayISO && e.reminder && e.reminder !== 'none');
    if (dueEvents.length > 0) {
      const timer = setTimeout(() => {
        const topEvt = dueEvents[0];
        setReminderToast({
          title: topEvt.title,
          time: topEvt.time || '10:00 AM',
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [calendarEvents]);

  // Open modal for creating or editing
  const handleOpenEventModal = (evt?: CalendarEvent, timeOrDate?: string | Date) => {
    setEventToEdit(evt);
    if (timeOrDate instanceof Date) {
      setSelectedDate(timeOrDate);
      setModalInitialTime('10:00 AM');
    } else if (typeof timeOrDate === 'string') {
      setModalInitialTime(timeOrDate);
    } else {
      setModalInitialTime('10:00 AM');
    }
    setShowEventModal(true);
  };

  // Save event action
  const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id'>, existingId?: string) => {
    if (existingId) {
      updateCalendarEvent(existingId, eventData);
    } else {
      addCalendarEvent(eventData);
    }
  };

  // Navigation handlers
  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    setMiniNavDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayNamesFull = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Calculate Month Grid
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const mainCalendarGrid: Array<{ dayNum: number; isCurrentMonth: boolean; dateObj: Date; labelMonth?: string }> = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(currentYear, currentMonth - 1, dayNum);
    const labelMonth = dayNum === 1 || i === firstDayOfWeek - 1 ? shortMonthNames[dateObj.getMonth()] : undefined;
    mainCalendarGrid.push({ dayNum, isCurrentMonth: false, dateObj, labelMonth });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(currentYear, currentMonth, i);
    const labelMonth = i === 1 ? shortMonthNames[currentMonth] : undefined;
    mainCalendarGrid.push({ dayNum: i, isCurrentMonth: true, dateObj, labelMonth });
  }

  const remainingCells = 42 - mainCalendarGrid.length;
  for (let i = 1; i <= remainingCells; i++) {
    const dateObj = new Date(currentYear, currentMonth + 1, i);
    const labelMonth = i === 1 ? shortMonthNames[dateObj.getMonth()] : undefined;
    mainCalendarGrid.push({ dayNum: i, isCurrentMonth: false, dateObj, labelMonth });
  }

  // Week View Calculations
  const getSundayOfWeek = (d: Date) => {
    const sun = new Date(d);
    sun.setDate(d.getDate() - d.getDay());
    sun.setHours(0, 0, 0, 0);
    return sun;
  };

  const currentWeekSunday = getSundayOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWeekSunday);
    day.setDate(currentWeekSunday.getDate() + i);
    return day;
  });

  const getWeekHeaderTitle = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getFullYear() !== end.getFullYear()) {
      return `${shortMonthNames[start.getMonth()]} ${start.getFullYear()} – ${shortMonthNames[end.getMonth()]} ${end.getFullYear()}`;
    }
    if (start.getMonth() !== end.getMonth()) {
      return `${shortMonthNames[start.getMonth()]} – ${shortMonthNames[end.getMonth()]} ${start.getFullYear()}`;
    }
    return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const getHeaderTitle = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (viewMode === 'week') {
      return getWeekHeaderTitle();
    }
    if (viewMode === 'year') {
      return `${currentYear}`;
    }
    if (viewMode === 'agenda') {
      return `Agenda Stream (${monthNames[currentMonth]} ${currentYear})`;
    }
    return `${monthNames[currentMonth]} ${currentYear}`;
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

  const categoryColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    Personal: { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400 font-semibold', dot: 'bg-blue-500', border: 'border-blue-500/30' },
    Work: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400 font-semibold', dot: 'bg-amber-500', border: 'border-amber-500/30' },
    Family: { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400 font-semibold', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
    Important: { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400 font-semibold', dot: 'bg-red-500', border: 'border-red-500/30' },
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col font-sans select-none overflow-hidden relative ${
        isLight ? 'bg-[#f6f6f8] text-slate-800' : 'bg-[#1e1d22] text-white'
      }`}
    >
      {/* Reminder Notification Toast Banner */}
      {reminderToast && (
        <div className="absolute top-14 right-4 z-[9990] bg-amber-500 text-slate-900 px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-300 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 max-w-sm">
          <Bell className="animate-bounce shrink-0" size={18} />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-xs block truncate">Reminder: {reminderToast.title}</span>
            <span className="text-[10px] opacity-90 block">Scheduled for {reminderToast.time}</span>
          </div>
          <button
            onClick={() => setReminderToast(null)}
            className="p-1 hover:bg-black/10 rounded-full cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header Toolbar */}
      <HeaderToolbar
        isLight={isLight}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedTimezone={selectedTimezone}
        setSelectedTimezone={setSelectedTimezone}
        enabledCategories={enabledCategories}
        toggleCategory={toggleCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSearchInput={showSearchInput}
        setShowSearchInput={setShowSearchInput}
        onJumpToToday={handleJumpToToday}
        onOpenNewEventModal={() => handleOpenEventModal()}
        activeRemindersCount={calendarEvents.filter((e) => e.reminder && e.reminder !== 'none').length}
        isCompact={isCompact}
        isVeryCompact={isVeryCompact}
      />

      {/* Main Calendar Body (Sidebar + Content View) */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left Sidebar */}
        {showSidebar && (
          <Sidebar
            isLight={isLight}
            isCompact={isCompact}
            miniNavDate={miniNavDate}
            setMiniNavDate={setMiniNavDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            setCurrentDate={setCurrentDate}
            enabledCategories={enabledCategories}
            toggleCategory={toggleCategory}
            calendarEvents={calendarEvents}
            onOpenEventModal={handleOpenEventModal}
            onDeleteEvent={deleteCalendarEvent}
            onCloseSidebar={() => setShowSidebar(false)}
          />
        )}

        {/* Content View Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#1e1d22]">
          {/* Section Navigation Header for Month & Week */}
          {(viewMode === 'month' || viewMode === 'week') && (
            <div
              className={`h-10 px-4 flex items-center justify-between border-b shrink-0 ${
                isLight ? 'border-slate-200/80 bg-white' : 'border-white/10 bg-[#232227]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                  {getHeaderTitle()}
                </span>
                <button
                  onClick={viewMode === 'week' ? handlePrevWeek : handlePrevMonth}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-white/70'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={viewMode === 'week' ? handleNextWeek : handleNextMonth}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-white/70'
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <span className={`text-sm font-semibold ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                {selectedTimezone.split('/')[1] || selectedTimezone}
              </span>
            </div>
          )}

          {/* VIEW: DAY VIEW */}
          {viewMode === 'day' && (
            <DayView
              isLight={isLight}
              currentDate={selectedDate}
              setCurrentDate={setSelectedDate}
              events={calendarEvents.filter((e) => {
                if (e.category && enabledCategories[e.category] === false) return false;
                return isEventOnDate(e, selectedDate.toISOString().split('T')[0]);
              })}
              onOpenEventModal={(evt, timeStr) => handleOpenEventModal(evt, timeStr)}
              onDeleteEvent={deleteCalendarEvent}
            />
          )}

          {/* VIEW: MONTH VIEW */}
          {viewMode === 'month' && (
            <MonthView
              isLight={isLight}
              isVeryCompact={isVeryCompact}
              mainCalendarGrid={mainCalendarGrid}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              calendarEvents={calendarEvents}
              enabledCategories={enabledCategories}
              onOpenEventModal={(evt, dateObj) => handleOpenEventModal(evt, dateObj)}
            />
          )}

          {/* VIEW: WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#1e1d22]">
              {/* Day Headers Row */}
              <div
                className={`flex border-b shrink-0 ${
                  isLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-[#28272c]'
                }`}
              >
                <div
                  className={`${isVeryCompact ? 'w-11' : 'w-14 sm:w-16'} shrink-0 p-1 sm:p-2 flex items-center justify-center border-r text-[9px] sm:text-[10px] font-semibold text-center ${
                    isLight ? 'border-slate-200 text-slate-400' : 'border-white/10 text-white/40'
                  }`}
                >
                  {isVeryCompact ? 'TZ' : selectedTimezone.split('/')[1] || 'UTC'}
                </div>

                <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200/70 dark:divide-white/10">
                  {weekDays.map((dayObj, idx) => {
                    const isToday =
                      dayObj.getDate() === new Date().getDate() &&
                      dayObj.getMonth() === new Date().getMonth() &&
                      dayObj.getFullYear() === new Date().getFullYear();

                    const isSelected =
                      dayObj.getDate() === selectedDate.getDate() &&
                      dayObj.getMonth() === selectedDate.getMonth() &&
                      dayObj.getFullYear() === selectedDate.getFullYear();

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(dayObj)}
                        className={`py-1.5 sm:py-2 px-0.5 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                          isSelected ? (isLight ? 'bg-blue-50/60' : 'bg-blue-500/10') : 'hover:bg-slate-100/50 dark:hover:bg-white/5'
                        }`}
                      >
                        <span
                          className={`text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider ${
                            isToday ? 'text-blue-600 dark:text-blue-400' : isLight ? 'text-slate-500' : 'text-white/60'
                          }`}
                        >
                          {isVeryCompact ? dayNamesShort[dayObj.getDay()] : dayNamesFull[dayObj.getDay()]}
                        </span>
                        <div
                          className={`mt-0.5 sm:mt-1 flex items-center justify-center transition-all ${
                            isToday
                              ? 'bg-blue-600 text-white font-bold w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-base shadow-xs'
                              : `text-xs sm:text-xl font-light ${isLight ? 'text-slate-800' : 'text-white'}`
                          }`}
                        >
                          {dayObj.getDate()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 24-Hour Scrollable Schedule Area */}
              <div className="flex-1 overflow-y-auto min-h-0 relative custom-scrollbar">
                <div className="flex relative min-h-[1344px]">
                  {/* Hours Labels */}
                  <div
                    className={`${isVeryCompact ? 'w-11' : 'w-14 sm:w-16'} shrink-0 border-r select-none ${
                      isLight ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-[#252429]'
                    }`}
                  >
                    {hoursArray.map((hour) => (
                      <div
                        key={hour}
                        className="h-14 relative flex items-start justify-end pr-1 sm:pr-2 pt-0.5"
                      >
                        <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 dark:text-white/40 -mt-2">
                          {formatHourLabel(hour)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 7 Columns */}
                  <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200/70 dark:divide-white/10 relative">
                    {weekDays.map((dayObj, dayIdx) => {
                      const dateISO = dayObj.toISOString().split('T')[0];

                      return (
                        <div key={dayIdx} className="flex flex-col relative">
                          {hoursArray.map((hour) => {
                            const hourEvts = calendarEvents.filter((e) => {
                              if (e.category && enabledCategories[e.category] === false) return false;
                              if (!isEventOnDate(e, dateISO)) return false;
                              return parseHourFromTime(e.time) === hour;
                            });

                            return (
                              <div
                                key={hour}
                                onClick={() => handleOpenEventModal(undefined, formatTimeForModal(hour))}
                                className={`h-14 border-b border-slate-200/60 dark:border-white/5 p-0.5 sm:p-1 transition-colors cursor-pointer relative group ${
                                  isLight ? 'hover:bg-blue-50/40' : 'hover:bg-white/5'
                                }`}
                              >
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 transition-opacity hidden sm:block">
                                  <Plus size={12} />
                                </div>

                                <div className="flex flex-col gap-1 h-full overflow-y-auto min-h-0">
                                  {hourEvts.map((evt) => {
                                    const colors = categoryColors[evt.category || 'Personal'];
                                    return (
                                      <div
                                        key={evt.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEventModal(evt);
                                        }}
                                        className={`p-1 sm:p-1.5 rounded-lg border flex flex-col justify-between text-xs shadow-2xs group/evt relative transition-transform hover:scale-[1.01] ${colors.bg} ${colors.border}`}
                                      >
                                        <div className="flex items-start justify-between gap-1">
                                          <span className={`font-bold text-[9px] sm:text-[11px] leading-tight truncate ${colors.text}`}>
                                            {evt.title}
                                          </span>
                                        </div>
                                        {evt.time && (
                                          <span className="text-[8px] sm:text-[9px] font-semibold opacity-70 mt-0.5 hidden sm:inline">
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
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: YEAR VIEW */}
          {viewMode === 'year' && (
            <YearView
              isLight={isLight}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              events={calendarEvents}
              enabledCategories={enabledCategories}
              onSelectDateAndSwitchView={(d, v) => {
                setSelectedDate(d);
                setCurrentDate(d);
                setViewMode(v);
              }}
            />
          )}

          {/* VIEW: AGENDA VIEW */}
          {viewMode === 'agenda' && (
            <AgendaView
              isLight={isLight}
              events={calendarEvents}
              searchQuery={searchQuery}
              enabledCategories={enabledCategories}
              onOpenEventModal={(evt) => handleOpenEventModal(evt)}
              onDeleteEvent={deleteCalendarEvent}
            />
          )}
        </div>
      </div>

      {/* Full Event Creator / Editor Dialog */}
      {showEventModal && (
        <EventModal
          isLight={isLight}
          eventToEdit={eventToEdit}
          initialDate={selectedDate}
          initialTime={modalInitialTime}
          onSave={handleSaveEvent}
          onDelete={deleteCalendarEvent}
          onClose={() => setShowEventModal(false)}
        />
      )}
    </div>
  );
}
