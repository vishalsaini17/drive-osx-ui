import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Check,
  Sun,
  Moon,
  CloudMoon,
  CloudSun,
  Trash2,
  X,
} from 'lucide-react';
import { useSystemStore } from '../systemStore';
import { DockPopupPanel, DockPopupCard } from './DockPopupPanel';

interface CalendarClockPopupProps {
  onClose: () => void;
  time: Date;
}

interface WorldClockItem {
  city: string;
  timezone: string;
  offsetHours: number;
  offsetDisplay: string;
}

interface HourlyWeather {
  timeStr: string;
  tempStr: string;
  iconType: 'moonCloud' | 'moon' | 'sun' | 'sunCloud';
}

interface WeatherLocation {
  city: string;
  hourly: HourlyWeather[];
}

const WEATHER_LOCATIONS: WeatherLocation[] = [
  {
    city: 'New Delhi',
    hourly: [
      { timeStr: '2:30', tempStr: '81°', iconType: 'moonCloud' },
      { timeStr: '3:30', tempStr: '81°', iconType: 'moon' },
      { timeStr: '4:30', tempStr: '81°', iconType: 'moon' },
      { timeStr: '5:30', tempStr: '80°', iconType: 'moonCloud' },
      { timeStr: '6:30', tempStr: '81°', iconType: 'sun' },
    ],
  },
  {
    city: 'San Francisco',
    hourly: [
      { timeStr: '2:30', tempStr: '58°', iconType: 'moon' },
      { timeStr: '3:30', tempStr: '57°', iconType: 'moonCloud' },
      { timeStr: '4:30', tempStr: '56°', iconType: 'moon' },
      { timeStr: '5:30', tempStr: '58°', iconType: 'sunCloud' },
      { timeStr: '6:30', tempStr: '62°', iconType: 'sun' },
    ],
  },
  {
    city: 'New York',
    hourly: [
      { timeStr: '2:30', tempStr: '74°', iconType: 'moonCloud' },
      { timeStr: '3:30', tempStr: '73°', iconType: 'moon' },
      { timeStr: '4:30', tempStr: '72°', iconType: 'moon' },
      { timeStr: '5:30', tempStr: '74°', iconType: 'sunCloud' },
      { timeStr: '6:30', tempStr: '78°', iconType: 'sun' },
    ],
  },
  {
    city: 'London',
    hourly: [
      { timeStr: '2:30', tempStr: '62°', iconType: 'moonCloud' },
      { timeStr: '3:30', tempStr: '61°', iconType: 'moon' },
      { timeStr: '4:30', tempStr: '60°', iconType: 'moon' },
      { timeStr: '5:30', tempStr: '62°', iconType: 'sunCloud' },
      { timeStr: '6:30', tempStr: '65°', iconType: 'sun' },
    ],
  },
];

const DEFAULT_WORLD_CLOCKS: WorldClockItem[] = [
  { city: 'New York', timezone: 'EST', offsetHours: -9.5, offsetDisplay: '-9:30' },
  { city: 'Brisbane', timezone: 'AEST', offsetHours: 4.5, offsetDisplay: '+4:30' },
];

const ALL_WORLD_CLOCKS: WorldClockItem[] = [
  { city: 'New York', timezone: 'EST', offsetHours: -9.5, offsetDisplay: '-9:30' },
  { city: 'Brisbane', timezone: 'AEST', offsetHours: 4.5, offsetDisplay: '+4:30' },
  { city: 'London', timezone: 'BST', offsetHours: -4.5, offsetDisplay: '-4:30' },
  { city: 'Tokyo', timezone: 'JST', offsetHours: 3.5, offsetDisplay: '+3:30' },
  { city: 'San Francisco', timezone: 'PST', offsetHours: -12.5, offsetDisplay: '-12:30' },
  { city: 'Sydney', timezone: 'AEST', offsetHours: 4.5, offsetDisplay: '+4:30' },
];

export default function CalendarClockPopup({ onClose, time }: CalendarClockPopupProps) {
  const theme = useSystemStore((state) => state.settings.theme);
  const isLight = theme === 'classic-light';

  // World Clocks & Calendar Events from System Store
  const worldCities = useSystemStore((state) => state.worldCities);
  const removeWorldCity = useSystemStore((state) => state.removeWorldCity);
  const openClockAppToAddCity = useSystemStore((state) => state.openClockAppToAddCity);

  const calendarEvents = useSystemStore((state) => state.calendarEvents);
  const addCalendarEvent = useSystemStore((state) => state.addCalendarEvent);
  const deleteCalendarEvent = useSystemStore((state) => state.deleteCalendarEvent);

  // Calendar Month/Year Navigation State
  const [navDate, setNavDate] = useState(() => new Date(time.getFullYear(), time.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(time);

  // Weather Location State
  const [selectedWeatherCity, setSelectedWeatherCity] = useState('New Delhi');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Quick Add Event State
  const [newEventText, setNewEventText] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);

  const getCityFormattedTime = (timezone: string) => {
    try {
      return time.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  };

  const currentYear = navDate.getFullYear();
  const currentMonth = navDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Navigate Months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Generate Calendar Days Grid (6 weeks x 7 days)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays: Array<{ dayNum: number; isCurrentMonth: boolean; dateObj: Date }> = [];

  // Previous month padding days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(currentYear, currentMonth - 1, dayNum);
    calendarDays.push({ dayNum, isCurrentMonth: false, dateObj });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(currentYear, currentMonth, i);
    calendarDays.push({ dayNum: i, isCurrentMonth: true, dateObj });
  }

  // Next month padding days
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const dateObj = new Date(currentYear, currentMonth + 1, i);
    calendarDays.push({ dayNum: i, isCurrentMonth: false, dateObj });
  }

  const getISODateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isToday = (d: Date) => {
    return (
      d.getDate() === time.getDate() &&
      d.getMonth() === time.getMonth() &&
      d.getFullYear() === time.getFullYear()
    );
  };

  const isSelected = (d: Date) => {
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  };

  const todayISO = getISODateString(time);
  const selectedDateISO = getISODateString(selectedDate);

  // Today's events filtered from systemStore
  const todayEvents = calendarEvents.filter((e) => e.date === todayISO);

  const handleAddEvent = () => {
    if (!newEventText.trim()) return;
    addCalendarEvent({
      title: newEventText.trim(),
      date: todayISO,
      time: '12:00 PM',
      category: 'Personal',
    });
    setNewEventText('');
    setShowAddEvent(false);
  };

  const currentWeatherObj =
    WEATHER_LOCATIONS.find((w) => w.city === selectedWeatherCity) || WEATHER_LOCATIONS[0];

  const currentDayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const currentFullDate = `${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()} ${selectedDate.getFullYear()}`;

  const renderWeatherIcon = (type: HourlyWeather['iconType']) => {
    switch (type) {
      case 'moonCloud':
        return <CloudMoon className={`w-4 h-4 sm:w-5 sm:h-5 ${isLight ? 'text-indigo-600' : 'text-white/80'} my-0.5 sm:my-1`} />;
      case 'moon':
        return <Moon className={`w-4 h-4 sm:w-5 sm:h-5 ${isLight ? 'text-indigo-600' : 'text-white/80'} my-0.5 sm:my-1`} />;
      case 'sunCloud':
        return <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 my-0.5 sm:my-1" />;
      case 'sun':
        return <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 my-0.5 sm:my-1" />;
      default:
        return <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 my-0.5 sm:my-1" />;
    }
  };

  return (
    <DockPopupPanel id="dock-calendar-clock-panel" position="left" onClose={onClose}>
      {/* =========================================================
          SECTION 1 (TOP OF POPUP): WEATHER CARD
         ========================================================= */}
      <DockPopupCard>
        {/* Header row: Weather title + Location Selector toggle + Close button */}
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white/90'}`}>Weather</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLocationPicker(!showLocationPicker)}
              className={`flex items-center gap-1 transition-colors cursor-pointer text-xs font-medium ${
                isLight ? 'text-slate-500 hover:text-slate-900' : 'text-white/60 hover:text-white'
              }`}
            >
              <span>{selectedWeatherCity}</span>
              <MapPin size={12} className="text-blue-500" />
            </button>
            <button
              onClick={onClose}
              className={`p-1 rounded-full transition-colors cursor-pointer opacity-60 hover:opacity-100 ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white'
              }`}
              title="Close panel"
            >
              <X size={14} />
            </button>
          </div>
        </div>

          {/* Location Picker Drawer */}
          <AnimatePresence>
            {showLocationPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-[14px] p-2 flex flex-col gap-1 border overflow-hidden ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#242327] border-white/10'
                }`}
              >
                <div
                  className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                    isLight ? 'text-slate-400' : 'text-white/40'
                  }`}
                >
                  Select Location
                </div>
                {WEATHER_LOCATIONS.map((loc) => (
                  <button
                    key={loc.city}
                    onClick={() => {
                      setSelectedWeatherCity(loc.city);
                      setShowLocationPicker(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      selectedWeatherCity === loc.city
                        ? isLight
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : 'bg-blue-600/30 text-blue-300 font-bold'
                        : isLight
                        ? 'hover:bg-slate-200 text-slate-800'
                        : 'hover:bg-white/10 text-white/80'
                    }`}
                  >
                    <span>{loc.city}</span>
                    {selectedWeatherCity === loc.city && <Check size={12} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hourly Weather Grid */}
          <div className="grid grid-cols-5 gap-1 text-center pt-0.5">
            {currentWeatherObj.hourly.map((h, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                  {h.timeStr}
                </span>
                {renderWeatherIcon(h.iconType)}
                <span className={`text-xs font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {h.tempStr}
                </span>
              </div>
            ))}
          </div>
        </DockPopupCard>

        {/* =========================================================
            SECTION 2: WORLD CLOCKS CARD
           ========================================================= */}
        <DockPopupCard>
          <div className="flex items-center justify-between text-sm">
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white/90'}`}>World Clocks</span>
            <button
              onClick={() => {
                openClockAppToAddCity();
                onClose();
              }}
              className={`text-xs transition-colors cursor-pointer flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md ${
                isLight ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
              }`}
              title="Open Clock App to add and manage world clocks"
            >
              <Plus size={13} />
              <span>Manage Clocks</span>
            </button>
          </div>

          {/* World Clock List Items */}
          <div className="flex flex-col gap-2 pt-1">
            {worldCities
              .filter((clock) => !clock.isCurrentLocation && clock.desc !== 'Current location')
              .map((clock) => (
              <div key={clock.id} className="flex items-center justify-between text-xs group">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${isLight ? 'text-slate-800' : 'text-white/80'}`}>
                    {clock.name}
                  </span>
                  {clock.isCurrentLocation && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                      Local
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {getCityFormattedTime(clock.timezone)}
                  </span>
                  <span className={`text-[11px] text-right ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                    {clock.desc || ''}
                  </span>
                  {!clock.isCurrentLocation && (
                    <button
                      onClick={() => removeWorldCity(clock.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity p-0.5 rounded hover:bg-red-500/10 ml-1"
                      title="Remove clock"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DockPopupCard>

        {/* =========================================================
            SECTION 3: TODAY'S EVENTS CARD
           ========================================================= */}
        <DockPopupCard className="gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white/90'}`}>
                Today's Events
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                todayEvents.length > 0 
                  ? 'bg-blue-500/10 text-blue-500' 
                  : isLight ? 'bg-slate-200 text-slate-500' : 'bg-white/10 text-white/50'
              }`}>
                {todayEvents.length}
              </span>
            </div>
            <button
              onClick={() => setShowAddEvent(!showAddEvent)}
              className={`text-xs transition-colors cursor-pointer flex items-center gap-1 font-medium ${
                isLight ? 'text-slate-500 hover:text-slate-900' : 'text-white/50 hover:text-white'
              }`}
            >
              <Plus size={13} />
              <span>Add</span>
            </button>
          </div>

          {showAddEvent && (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                placeholder="New event for today..."
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                className={`flex-1 border text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/40 border-white/20 text-white'
                }`}
                autoFocus
              />
              <button
                onClick={handleAddEvent}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs cursor-pointer font-bold"
              >
                Save
              </button>
            </div>
          )}

          {todayEvents.length > 0 ? (
            <div className="flex flex-col gap-1 mt-1 max-h-[100px] overflow-y-auto pr-1">
              {todayEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`text-xs flex items-center justify-between gap-2 px-2 py-1 rounded-md group ${
                    isLight ? 'bg-slate-100 text-slate-800' : 'bg-white/5 text-white/90'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        evt.category === 'Work'
                          ? 'bg-amber-500'
                          : evt.category === 'Family'
                          ? 'bg-emerald-500'
                          : evt.category === 'Important'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <span className="truncate font-medium">{evt.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {evt.time && (
                      <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                        {evt.time}
                      </span>
                    )}
                    <button
                      onClick={() => deleteCalendarEvent(evt.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer transition-opacity"
                      title="Delete event"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className={`text-xs italic font-normal mt-0.5 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              No events scheduled for today
            </span>
          )}
        </DockPopupCard>

        {/* =========================================================
            SECTION 4: CALENDAR GRID
           ========================================================= */}
        <div className="flex flex-col gap-2.5 px-1 my-1">
          {/* Calendar Month Header with Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={handlePrevMonth}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900' : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <span className={`text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {monthNames[currentMonth]}
            </span>

            <button
              onClick={handleNextMonth}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900' : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className={`grid grid-cols-7 text-center text-xs font-bold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
            {dayNamesShort.map((day, idx) => (
              <div key={idx} className="py-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Dates Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {calendarDays.map((cell, idx) => {
              const activeToday = isToday(cell.dateObj);
              const activeSelected = isSelected(cell.dateObj);

              return (
                <div key={idx} className="flex items-center justify-center">
                  <button
                    onClick={() => setSelectedDate(cell.dateObj)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-all cursor-pointer ${
                      activeToday || activeSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 scale-105'
                        : cell.isCurrentMonth
                        ? isLight
                          ? 'text-slate-800 hover:bg-slate-200/80 font-bold'
                          : 'text-white/90 hover:bg-white/15'
                        : isLight
                        ? 'text-slate-300 hover:bg-slate-100'
                        : 'text-white/20 hover:bg-white/5'
                    }`}
                  >
                    {String(cell.dayNum).padStart(2, '0')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            SECTION 5 (BOTTOM OF POPUP): DAY NAME & FULL DATE HEADER
           ========================================================= */}
        <div className={`pt-1.5 border-t flex flex-col px-1 ${isLight ? 'border-slate-300/80' : 'border-white/10'}`}>
          <span className={`text-sm font-bold leading-tight ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            {currentDayName}
          </span>
          <span className={`text-2xl font-black tracking-tight leading-tight mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {currentFullDate}
          </span>
        </div>
    </DockPopupPanel>
  );
}
