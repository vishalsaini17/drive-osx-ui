import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Sidebar as SidebarIcon,
  CalendarDays,
  Search,
  X,
  Plus,
  Check,
  Globe,
  Bell,
  Clock,
} from 'lucide-react';
import { CalendarViewMode, EventCategory, TIMEZONES } from '../types';

interface HeaderToolbarProps {
  isLight: boolean;
  showSidebar: boolean;
  setShowSidebar: (val: boolean) => void;
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;
  selectedTimezone: string;
  setSelectedTimezone: (tz: string) => void;
  enabledCategories: Record<string, boolean>;
  toggleCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearchInput: boolean;
  setShowSearchInput: (show: boolean) => void;
  onJumpToToday: () => void;
  onOpenNewEventModal: () => void;
  activeRemindersCount?: number;
  isCompact?: boolean;
  isVeryCompact?: boolean;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  isLight,
  showSidebar,
  setShowSidebar,
  viewMode,
  setViewMode,
  selectedTimezone,
  setSelectedTimezone,
  enabledCategories,
  toggleCategory,
  searchQuery,
  setSearchQuery,
  showSearchInput,
  setShowSearchInput,
  onJumpToToday,
  onOpenNewEventModal,
  activeRemindersCount = 0,
  isCompact = false,
  isVeryCompact = false,
}) => {
  const [showCalendarsDropdown, setShowCalendarsDropdown] = useState(false);
  const [showTzDropdown, setShowTzDropdown] = useState(false);

  const categoryColors: Record<string, string> = {
    Personal: 'bg-blue-500',
    Work: 'bg-amber-500',
    Family: 'bg-emerald-500',
    Important: 'bg-red-500',
  };

  return (
    <div
      className={`h-12 px-2 sm:px-3 flex items-center justify-between border-b shrink-0 gap-1.5 z-20 ${
        isLight ? 'bg-[#ebebee] border-slate-300/80' : 'bg-[#2b2a2f] border-white/10'
      }`}
    >
      {/* Left Toolbar Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Calendars / Category Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowCalendarsDropdown(!showCalendarsDropdown)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border border-slate-300/70 text-slate-700 shadow-2xs'
                : 'bg-white/10 hover:bg-white/15 border border-white/10 text-white/90'
            }`}
            title="Filter Calendars"
          >
            <span className={isVeryCompact ? 'hidden' : 'inline'}>Calendars</span>
            <CalendarIcon size={13} className={isVeryCompact ? 'inline' : 'hidden'} />
            <ChevronDown size={12} className="opacity-60" />
          </button>

          {/* Calendars Dropdown Menu */}
          {showCalendarsDropdown && (
            <div
              className={`absolute top-full left-0 mt-1 w-48 rounded-xl p-2 z-50 shadow-xl border ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#323136] border-white/15 text-white'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-400 dark:text-white/40 px-2 py-1 uppercase tracking-wider">
                Calendars & Categories
              </div>
              {['Personal', 'Work', 'Family', 'Important'].map((cat) => {
                const isChecked = enabledCategories[cat] !== false;
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${categoryColors[cat]}`} />
                      <span className="font-medium">{cat}</span>
                    </div>
                    {isChecked && <Check size={13} className="text-blue-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Toggle Sidebar Icon */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            showSidebar
              ? isLight
                ? 'bg-slate-200/80 text-slate-800'
                : 'bg-white/20 text-white'
              : isLight
              ? 'hover:bg-slate-200 text-slate-600'
              : 'hover:bg-white/10 text-white/70'
          }`}
          title="Toggle Sidebar"
        >
          <SidebarIcon size={15} />
        </button>
      </div>

      {/* Center Toolbar Controls: Today & View Mode Pills */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Today Button */}
        <button
          onClick={onJumpToToday}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-slate-100 border border-slate-300/70 text-slate-800 shadow-2xs'
              : 'bg-white/10 hover:bg-white/15 border border-white/10 text-white'
          }`}
          title="Jump to Today"
        >
          <CalendarDays size={13} className="text-blue-500 shrink-0" />
          <span className={isVeryCompact ? 'hidden sm:inline' : 'inline'}>Today</span>
        </button>

        {/* View Switcher Pills */}
        <div
          className={`flex items-center p-0.5 rounded-lg border ${
            isLight ? 'bg-slate-200/70 border-slate-300/60' : 'bg-black/30 border-white/10'
          }`}
        >
          {(['day', 'week', 'month', 'year', 'agenda'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-1.5 sm:px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                viewMode === mode
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-white/20 dark:text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Right Toolbar Controls: Timezone, Search, Add Event */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Timezone Switcher Dropdown */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowTzDropdown(!showTzDropdown)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              isLight
                ? 'hover:bg-slate-200 text-slate-600'
                : 'hover:bg-white/10 text-white/70'
            }`}
            title="Select Time Zone"
          >
            <Globe size={13} className="text-blue-500 shrink-0" />
            <span className="max-w-[80px] truncate">{selectedTimezone.split('/')[1] || selectedTimezone}</span>
            <ChevronDown size={11} className="opacity-60" />
          </button>

          {showTzDropdown && (
            <div
              className={`absolute top-full right-0 mt-1 w-64 rounded-xl p-1.5 z-50 shadow-2xl border ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#323136] border-white/15 text-white'
              }`}
            >
              <div className="text-[10px] font-bold text-slate-400 dark:text-white/40 px-2 py-1 uppercase tracking-wider">
                Select Time Zone
              </div>
              {TIMEZONES.map((tz) => (
                <button
                  key={tz.id}
                  onClick={() => {
                    setSelectedTimezone(tz.id);
                    setShowTzDropdown(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                    selectedTimezone === tz.id
                      ? 'bg-blue-500/10 text-blue-500 font-bold'
                      : isLight
                      ? 'hover:bg-slate-100'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{tz.label}</span>
                  <span className="text-[10px] opacity-60 ml-1">{tz.offset}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search bar toggle */}
        {showSearchInput ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-28 sm:w-36 px-2 py-0.5 text-xs rounded-md border focus:outline-none focus:border-blue-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/20 text-white'
              }`}
              autoFocus
            />
            <button
              onClick={() => {
                setShowSearchInput(false);
                setSearchQuery('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSearchInput(true)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/70'
            }`}
            title="Search Events"
          >
            <Search size={15} />
          </button>
        )}

        {/* Reminders Indicator */}
        {activeRemindersCount > 0 && (
          <div
            className="relative p-1.5 rounded-md text-amber-500 flex items-center justify-center"
            title={`${activeRemindersCount} upcoming reminder(s)`}
          >
            <Bell size={15} />
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {activeRemindersCount}
            </span>
          </div>
        )}

        {/* Add Event Button */}
        <button
          onClick={onOpenNewEventModal}
          className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer font-bold shadow-2xs flex items-center justify-center shrink-0 gap-1 px-2.5 text-xs"
          title="Add New Event"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Event</span>
        </button>
      </div>
    </div>
  );
};
