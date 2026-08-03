import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  AlarmClock,
  Timer as StopwatchIcon,
  Hourglass,
  Plus,
  X,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Menu,
  ChevronUp,
  ChevronDown,
  Trash2,
  Check,
  Bell,
  Search,
  Loader2
} from 'lucide-react';
import { WorldCity } from '../../types';
import { useSystemStore } from '../../systemStore';

interface Alarm {
  id: string;
  timeStr: string; // "07:00 AM"
  hours: number;
  minutes: number;
  label: string;
  enabled: boolean;
  days: string[];
}

interface SearchCityResult {
  name: string;
  country: string;
  timezone: string;
  desc: string;
}

const FALLBACK_POPULAR_CITIES: SearchCityResult[] = [
  { name: 'Fukue', country: 'Japan', timezone: 'Asia/Tokyo', desc: '' },
  { name: 'Fukui', country: 'Japan', timezone: 'Asia/Tokyo', desc: '' },
  { name: 'Fukuoka', country: 'Japan', timezone: 'Asia/Tokyo', desc: '' },
  { name: 'Fukushima', country: 'Japan', timezone: 'Asia/Tokyo', desc: '' },
  { name: 'London', country: 'United Kingdom', timezone: 'Europe/London', desc: '' },
  { name: 'New York', country: 'United States', timezone: 'America/New_York', desc: '' },
  { name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', desc: '' },
  { name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', desc: '' },
  { name: 'Brisbane', country: 'Australia', timezone: 'Australia/Brisbane', desc: '' },
  { name: 'Paris', country: 'France', timezone: 'Europe/Paris', desc: '' },
  { name: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', desc: '' },
  { name: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', desc: '' },
  { name: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata', desc: '' },
  { name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', desc: '' },
  { name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', desc: '' },
  { name: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong', desc: '' },
  { name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', desc: '' },
  { name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', desc: '' },
  { name: 'Chicago', country: 'United States', timezone: 'America/Chicago', desc: '' },
  { name: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles', desc: '' },
  { name: 'Sao Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', desc: '' },
  { name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', desc: '' },
  { name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', desc: '' },
  { name: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', desc: '' },
  { name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo', desc: '' },
  { name: 'Johannesburg', country: 'South Africa', timezone: 'Africa/Johannesburg', desc: '' },
];

function calculateTimezoneDesc(timezone: string, baseTimezone = 'Asia/Kolkata') {
  try {
    const now = new Date();
    const baseDate = new Date(now.toLocaleString('en-US', { timeZone: baseTimezone }));
    const targetDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    const diffMs = targetDate.getTime() - baseDate.getTime();
    const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

    if (Math.abs(diffHours) < 0.1) {
      return 'Same time';
    } else if (diffHours > 0) {
      return `${diffHours} hours ahead`;
    } else {
      return `${Math.abs(diffHours)} hours behind`;
    }
  } catch {
    return 'Timezone reference';
  }
}

export default function ClockApp() {
  const [activeTab, setActiveTab] = useState<'world' | 'alarms' | 'stopwatch' | 'timer'>('world');
  const [now, setNow] = useState<Date>(new Date());

  // System Store World Clock Integration
  const settings = useSystemStore((state) => state.settings);
  const worldCities = useSystemStore((state) => state.worldCities);
  const addWorldCity = useSystemStore((state) => state.addWorldCity);
  const removeWorldCity = useSystemStore((state) => state.removeWorldCity);
  const clockAppShowAddCity = useSystemStore((state) => state.clockAppShowAddCity);
  const resetClockAppShowAddCity = useSystemStore((state) => state.resetClockAppShowAddCity);

  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchCityResult[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [selectedSearchCity, setSelectedSearchCity] = useState<SearchCityResult | null>(null);

  // Trigger add city modal if opened via Manage Clocks from dock popup
  useEffect(() => {
    if (clockAppShowAddCity) {
      setActiveTab('world');
      setShowAddCityModal(true);
      resetClockAppShowAddCity();
    }
  }, [clockAppShowAddCity, resetClockAppShowAddCity]);

  // Geocoding API Search effect
  useEffect(() => {
    if (!citySearchQuery.trim()) {
      setSearchResults([]);
      setIsSearchingCities(false);
      return;
    }

    const q = citySearchQuery.trim().toLowerCase();

    // Instant local filtering
    const localMatches = FALLBACK_POPULAR_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    ).map((c) => ({
      ...c,
      desc: calculateTimezoneDesc(c.timezone),
    }));

    setSearchResults(localMatches);
    setIsSearchingCities(true);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          citySearchQuery.trim()
        )}&count=15&language=en&format=json`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data.results && Array.isArray(data.results)) {
            const apiResults: SearchCityResult[] = data.results.map((r: any) => ({
              name: r.name,
              country: r.country || '',
              timezone: r.timezone || 'UTC',
              desc: calculateTimezoneDesc(r.timezone || 'UTC'),
            }));

            // Combine with local matches cleanly
            const combined = [...apiResults];
            localMatches.forEach((lm) => {
              if (
                !combined.some(
                  (c) =>
                    c.name.toLowerCase() === lm.name.toLowerCase() &&
                    c.country.toLowerCase() === lm.country.toLowerCase()
                )
              ) {
                combined.push(lm);
              }
            });

            setSearchResults(combined);
          }
        })
        .catch(() => {
          // keep local matches on error
        })
        .finally(() => {
          setIsSearchingCities(false);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [citySearchQuery]);

  const handleConfirmAddCity = () => {
    if (!selectedSearchCity) return;

    const newCityName = selectedSearchCity.name;
    const newCityObj: WorldCity = {
      id: `${newCityName}-${Date.now()}`.toLowerCase(),
      name: newCityName,
      timezone: selectedSearchCity.timezone,
      desc: selectedSearchCity.desc || calculateTimezoneDesc(selectedSearchCity.timezone),
      pillColor: 'amber',
    };

    addWorldCity(newCityObj);
    handleCloseCityModal();
  };

  const handleCloseCityModal = () => {
    setShowAddCityModal(false);
    setCitySearchQuery('');
    setSelectedSearchCity(null);
    setSearchResults([]);
  };

  // ==================== 2. ALARMS STATE ====================
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [showAddAlarmModal, setShowAddAlarmModal] = useState(false);
  const [newAlarmHours, setNewAlarmHours] = useState(7);
  const [newAlarmMinutes, setNewAlarmMinutes] = useState(0);
  const [newAlarmPeriod, setNewAlarmPeriod] = useState<'AM' | 'PM'>('AM');
  const [newAlarmLabel, setNewAlarmLabel] = useState('Morning Alarm');

  // ==================== 3. STOPWATCH STATE ====================
  const [swRunning, setSwRunning] = useState(false);
  const [swTime, setSwTime] = useState(0); // milliseconds
  const [swLaps, setSwLaps] = useState<number[]>([]);
  const swRef = useRef<any>(null);

  // ==================== 4. TIMER STATE ====================
  const [timerHours, setTimerHours] = useState(0);
  const [timerMins, setTimerMins] = useState(0);
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerTitle, setTimerTitle] = useState('');
  
  const [timerDurationSecs, setTimerDurationSecs] = useState(0);
  const [timerRemainingSecs, setTimerRemainingSecs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerRef = useRef<any>(null);

  // Live Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Stopwatch Logic
  useEffect(() => {
    if (swRunning) {
      const startTime = Date.now() - swTime;
      swRef.current = setInterval(() => {
        setSwTime(Date.now() - startTime);
      }, 10);
    } else {
      clearInterval(swRef.current);
    }
    return () => clearInterval(swRef.current);
  }, [swRunning]);

  // Timer Countdown Logic
  useEffect(() => {
    if (timerRunning && !timerPaused) {
      timerRef.current = setInterval(() => {
        setTimerRemainingSecs((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            setTimerPaused(false);
            clearInterval(timerRef.current);
            alert(`⌛ Timer Completed: ${timerTitle || 'Countdown Finished'}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timerPaused, timerTitle]);

  // Format Stopwatch Display: 00:00:00.0
  const getFormattedStopwatch = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    const tenth = Math.floor((ms % 1000) / 100);
    return { hrs, mins, secs, tenth };
  };

  // Format Timer Display: HH:MM:SS
  const formatTimerDigits = (totalSeconds: number) => {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return { h, m, s };
  };

  // Quick Start Timer Preset
  const handleQuickStartTimer = (mins: number) => {
    const total = mins * 60;
    setTimerDurationSecs(total);
    setTimerRemainingSecs(total);
    setTimerTitle(`${mins} Min Timer`);
    setTimerRunning(true);
    setTimerPaused(false);
  };

  // Start Manual Timer
  const handleStartCustomTimer = () => {
    const total = timerHours * 3600 + timerMins * 60 + timerSecs;
    if (total <= 0) return;
    setTimerDurationSecs(total);
    setTimerRemainingSecs(total);
    setTimerRunning(true);
    setTimerPaused(false);
  };

  const clockPrefs = settings.appPreferences?.clock;
  const is24Hour = clockPrefs?.clockFormat === '24-hour';
  const showSecs = clockPrefs?.showSeconds ?? false;

  // Format City Time based on app preferences (12h/24h, showSeconds)
  const getCityTimeStr = (timezone: string) => {
    try {
      return now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: showSecs ? '2-digit' : undefined,
        hour12: !is24Hour,
      });
    } catch {
      return now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: showSecs ? '2-digit' : undefined,
        hour12: !is24Hour,
      });
    }
  };

  // Add City
  const handleAddCity = (cityObj: { name: string; timezone: string; desc: string }) => {
    addWorldCity({
      id: cityObj.name.toLowerCase(),
      name: cityObj.name,
      timezone: cityObj.timezone,
      desc: cityObj.desc,
      pillColor: 'amber',
    });
    setShowAddCityModal(false);
  };

  // Remove City
  const handleRemoveCity = (id: string) => {
    removeWorldCity(id);
  };

  // Add Alarm
  const handleSaveAlarm = () => {
    const formattedHrs = String(newAlarmHours).padStart(2, '0');
    const formattedMins = String(newAlarmMinutes).padStart(2, '0');
    const timeStr = `${formattedHrs}:${formattedMins} ${newAlarmPeriod}`;

    const newAlarm: Alarm = {
      id: Date.now().toString(),
      timeStr,
      hours: newAlarmHours,
      minutes: newAlarmMinutes,
      label: newAlarmLabel || 'Alarm',
      enabled: true,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    };

    setAlarms([...alarms, newAlarm]);
    setShowAddAlarmModal(false);
    setNewAlarmLabel('Morning Alarm');
  };

  const toggleAlarmEnabled = (id: string) => {
    setAlarms(
      alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const deleteAlarm = (id: string) => {
    setAlarms(alarms.filter((a) => a.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-[#f8f9fa] text-slate-800 font-sans select-none relative overflow-hidden">
      {/* ================= HEADER / TOP BAR ================= */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur-md">
        {/* Left Action Button (+ for Add) */}
        <div>
          {activeTab === 'world' && (
            <button
              onClick={() => setShowAddCityModal(true)}
              className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors focus:outline-none cursor-pointer"
              title="Add Location"
            >
              <Plus size={20} strokeWidth={2.2} />
            </button>
          )}
          {activeTab === 'alarms' && (
            <button
              onClick={() => setShowAddAlarmModal(true)}
              className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-700 transition-colors focus:outline-none cursor-pointer"
              title="Add Alarm"
            >
              <Plus size={20} strokeWidth={2.2} />
            </button>
          )}
          {(activeTab === 'stopwatch' || activeTab === 'timer') && <div className="w-8" />}
        </div>

        {/* Center Tab Switcher Navigation */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner">
          <button
            onClick={() => setActiveTab('world')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'world'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe size={14} className={activeTab === 'world' ? 'text-blue-500' : ''} />
            <span>World</span>
          </button>

          <button
            onClick={() => setActiveTab('alarms')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'alarms'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlarmClock size={14} className={activeTab === 'alarms' ? 'text-blue-500' : ''} />
            <span>Alarms</span>
          </button>

          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stopwatch'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <StopwatchIcon size={14} className={activeTab === 'stopwatch' ? 'text-blue-500' : ''} />
            <span>Stopwatch</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'timer'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hourglass size={14} className={activeTab === 'timer' ? 'text-blue-500' : ''} />
            <span>Timer</span>
          </button>
        </div>

        {/* Right Menu Controls */}
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 transition-colors focus:outline-none cursor-pointer"
            title="Options"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* ================= TAB 1: WORLD CLOCKS ================= */}
      {activeTab === 'world' && (
        <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
            {worldCities
              .filter((city) => !city.isCurrentLocation && city.desc !== 'Current location')
              .map((city) => {
              const timeStr = getCityTimeStr(city.timezone);

              return (
                <div
                  key={city.id}
                  className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/60 transition-colors group"
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {city.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-400">
                      {city.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`px-4 py-1.5 rounded-full text-2xl font-mono font-semibold tracking-tight shadow-xs ${
                        city.pillColor === 'blue'
                          ? 'bg-blue-100/90 text-blue-700'
                          : 'bg-amber-100/90 text-amber-800'
                      }`}
                    >
                      {timeStr}
                    </div>

                    {!city.isCurrentLocation && (
                      <button
                        onClick={() => handleRemoveCity(city.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                        title="Remove City"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: ALARMS ================= */}
      {activeTab === 'alarms' && (
        <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar">
          {alarms.length === 0 ? (
            /* Empty State matching screenshot */
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-6 text-slate-400/80">
                <AlarmClock size={96} strokeWidth={1.2} />
              </div>

              <button
                onClick={() => setShowAddAlarmModal(true)}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm px-7 py-3 rounded-full shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Add Alarm...
              </button>
            </div>
          ) : (
            /* Alarms List */
            <div className="w-full max-w-lg space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  Your Alarms ({alarms.length})
                </span>
                <button
                  onClick={() => setShowAddAlarmModal(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  + Add New
                </button>
              </div>

              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    alarm.enabled
                      ? 'bg-white border-slate-200/90 shadow-sm'
                      : 'bg-slate-100/60 border-slate-200/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono font-bold text-slate-900">
                        {alarm.timeStr}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {alarm.label}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {alarm.days.join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleAlarmEnabled(alarm.id)}
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                        alarm.enabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                          alarm.enabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => deleteAlarm(alarm.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Delete Alarm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: STOPWATCH ================= */}
      {activeTab === 'stopwatch' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-between overflow-y-auto">
          {/* Centered Large Display matching screenshot */}
          <div className="flex-1 flex flex-col items-center justify-center my-auto">
            <div className="text-6xl sm:text-7xl font-extralight font-mono tracking-tight text-slate-800 select-none flex items-baseline">
              <span className="text-slate-300">00:00:</span>
              <span className="font-normal text-slate-900">
                {getFormattedStopwatch(swTime).secs}
              </span>
              <span className="text-slate-400 text-4xl sm:text-5xl">
                .{getFormattedStopwatch(swTime).tenth}
              </span>
            </div>

            {/* Lap List */}
            {swLaps.length > 0 && (
              <div className="w-full max-w-sm mt-8 max-h-40 overflow-y-auto border border-slate-200/80 bg-white rounded-2xl p-3 shadow-xs custom-scrollbar">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1.5 mb-2 flex justify-between px-1">
                  <span>Lap</span>
                  <span>Split Time</span>
                </div>
                {swLaps.map((lap, index) => {
                  const { mins, secs, tenth } = getFormattedStopwatch(lap);
                  return (
                    <div
                      key={index}
                      className="flex justify-between py-1 text-xs font-mono font-semibold text-slate-700 px-1 border-b border-slate-100 last:border-0"
                    >
                      <span>Lap {swLaps.length - index}</span>
                      <span>
                        {mins}:{secs}.{tenth}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Controls matching screenshot */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSwRunning(!swRunning)}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm px-9 py-2.5 rounded-full shadow-md shadow-blue-500/20 border border-blue-400/30 transition-all cursor-pointer"
            >
              {swRunning ? 'Stop' : 'Start'}
            </button>

            <button
              onClick={() => {
                if (swRunning) {
                  setSwLaps([swTime, ...swLaps]);
                } else {
                  setSwTime(0);
                  setSwLaps([]);
                }
              }}
              className="bg-slate-200/90 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold text-sm px-9 py-2.5 rounded-full shadow-xs transition-all cursor-pointer"
            >
              {swRunning ? 'Lap' : 'Reset'}
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 4: TIMER ================= */}
      {activeTab === 'timer' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar">
          {timerRunning || timerPaused ? (
            /* Active Running Timer View */
            <div className="flex flex-col items-center gap-6 my-auto">
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                {timerTitle || 'Countdown Timer'}
              </span>

              <div className="text-6xl sm:text-7xl font-mono font-light tracking-tight text-slate-800">
                {formatTimerDigits(timerRemainingSecs).h}:
                {formatTimerDigits(timerRemainingSecs).m}:
                {formatTimerDigits(timerRemainingSecs).s}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setTimerPaused(!timerPaused)}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm px-8 py-2.5 rounded-full shadow-md transition-all cursor-pointer"
                >
                  {timerPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerPaused(false);
                    setTimerRemainingSecs(0);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold text-sm px-8 py-2.5 rounded-full shadow-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Setup Timer View matching screenshot */
            <div className="w-full max-w-sm flex flex-col items-center gap-6 my-auto">
              {/* Quick Start Section */}
              <div className="w-full flex flex-col items-center gap-2.5">
                <span className="text-xs font-extrabold text-slate-800">
                  Quick Start
                </span>

                <div className="grid grid-cols-4 gap-2.5 w-full">
                  {[
                    { label: '1 m', val: 1 },
                    { label: '2 m', val: 2 },
                    { label: '3 m', val: 3 },
                    { label: '5 m', val: 5 },
                    { label: '30 m', val: 30 },
                    { label: '15 m', val: 15 },
                    { label: '45 m', val: 45 },
                    { label: '1 h', val: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleQuickStartTimer(preset.val)}
                      className="bg-slate-200/80 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Set Timer Section */}
              <div className="w-full flex flex-col items-center gap-3 mt-2">
                <span className="text-xs font-extrabold text-slate-800">
                  Set Timer
                </span>

                {/* 3 Column Stepper Wheel: Hours : Minutes : Seconds */}
                <div className="flex items-center gap-3">
                  {/* Hours */}
                  <div className="flex flex-col items-center bg-slate-200/70 rounded-2xl overflow-hidden w-18 shadow-2xs">
                    <button
                      onClick={() => setTimerHours((prev) => Math.min(23, prev + 1))}
                      className="w-full py-1.5 hover:bg-slate-300/60 text-slate-600 flex justify-center cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-3xl font-mono font-bold text-slate-900 py-1">
                      {String(timerHours).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => setTimerHours((prev) => Math.max(0, prev - 1))}
                      className="w-full py-1.5 hover:bg-slate-300/60 text-slate-600 flex justify-center cursor-pointer"
                    >
                      <span className="text-base leading-none font-bold">−</span>
                    </button>
                  </div>

                  <span className="text-2xl font-bold text-slate-800">:</span>

                  {/* Minutes */}
                  <div className="flex flex-col items-center bg-slate-200/70 rounded-2xl overflow-hidden w-18 shadow-2xs">
                    <button
                      onClick={() => setTimerMins((prev) => Math.min(59, prev + 1))}
                      className="w-full py-1.5 hover:bg-slate-300/60 text-slate-600 flex justify-center cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-3xl font-mono font-bold text-slate-900 py-1">
                      {String(timerMins).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => setTimerMins((prev) => Math.max(0, prev - 1))}
                      className="w-full py-1.5 hover:bg-slate-300/60 text-slate-600 flex justify-center cursor-pointer"
                    >
                      <span className="text-base leading-none font-bold">−</span>
                    </button>
                  </div>

                  <span className="text-2xl font-bold text-slate-800">:</span>

                  {/* Seconds */}
                  <div className="flex flex-col items-center bg-slate-200/70 rounded-2xl overflow-hidden w-18 shadow-2xs">
                    <button
                      onClick={() => setTimerSecs((prev) => Math.min(59, prev + 1))}
                      className="w-full py-1.5 hover:bg-slate-300/60 text-slate-600 flex justify-center cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-3xl font-mono font-bold text-slate-900 py-1">
                      {String(timerSecs).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => setTimerSecs((prev) => Math.max(0, prev - 1))}
                      className="w-full py-1.5 hover:bg-slate-300/60 text-slate-600 flex justify-center cursor-pointer"
                    >
                      <span className="text-base leading-none font-bold">−</span>
                    </button>
                  </div>
                </div>

                {/* Title Input */}
                <input
                  type="text"
                  placeholder="Title"
                  value={timerTitle}
                  onChange={(e) => setTimerTitle(e.target.value)}
                  className="w-full max-w-xs bg-slate-200/60 border border-slate-300/50 rounded-xl py-2 px-4 text-xs font-semibold text-center text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-all shadow-inner mt-1"
                />

                {/* Start Button */}
                <button
                  onClick={handleStartCustomTimer}
                  className="bg-blue-400 hover:bg-blue-500 active:scale-95 text-white font-bold text-sm px-9 py-2.5 rounded-full shadow-md shadow-blue-400/30 transition-all cursor-pointer mt-2"
                >
                  Start
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: ADD CITY ================= */}
      {showAddCityModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-5 w-full max-w-sm h-[480px] flex flex-col relative select-none">
            {/* Header: Cancel - Title - Add */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleCloseCityModal}
                className="px-4 py-1.5 rounded-xl bg-slate-200/90 hover:bg-slate-300 active:scale-95 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Add World Clock
              </h3>

              <button
                onClick={handleConfirmAddCity}
                disabled={!selectedSearchCity}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSearchCity
                    ? 'bg-blue-400 hover:bg-blue-500 active:scale-95 text-white shadow-xs'
                    : 'bg-blue-300 text-white/90 opacity-70 cursor-not-allowed'
                }`}
              >
                Add
              </button>
            </div>

            {/* Search Input Field with Ring & Clear Button */}
            <div className="relative w-full mt-3">
              <Search size={16} className="absolute left-3.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder="Search cities"
                className="w-full bg-slate-100/80 border border-blue-400/80 focus:border-blue-500 rounded-xl py-2 pl-9 pr-8 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
              />
              {citySearchQuery && (
                <button
                  onClick={() => {
                    setCitySearchQuery('');
                    setSelectedSearchCity(null);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <XCircle size={15} fill="currentColor" className="text-slate-400 fill-slate-200" />
                </button>
              )}
            </div>

            {/* Body: Empty State OR Search Results */}
            {!citySearchQuery.trim() ? (
              /* Empty State matching Screenshot 1 */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="mb-4 text-slate-400">
                  <Search size={96} strokeWidth={1.2} />
                </div>
                <h4 className="text-xl sm:text-2xl font-extrabold text-slate-800 mb-1.5">
                  Perform a Search
                </h4>
                <p className="text-xs font-medium text-slate-500">
                  The search results will appear here
                </p>
              </div>
            ) : (
              /* Results List matching Screenshot 2 */
              <div className="mt-3 flex-1 overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200/90 divide-y divide-slate-100 bg-white shadow-2xs">
                {searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
                    {isSearchingCities ? (
                      <Loader2 size={20} className="animate-spin text-blue-500" />
                    ) : (
                      <span>No cities found matching "{citySearchQuery}"</span>
                    )}
                  </div>
                ) : (
                  searchResults.map((item, idx) => {
                    const isSelected =
                      selectedSearchCity?.name === item.name &&
                      selectedSearchCity?.country === item.country;

                    return (
                      <button
                        key={`${item.name}-${item.country}-${idx}`}
                        onClick={() => setSelectedSearchCity(item)}
                        className={`w-full p-3 px-4 text-left cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50/90'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-normal text-slate-800">
                            {item.name}{' '}
                            {item.country && (
                              <span className="font-bold text-slate-900">{item.country}</span>
                            )}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                            {item.timezone} • {item.desc}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD ALARM ================= */}
      {showAddAlarmModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-full max-w-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">New Alarm</h3>
              <button
                onClick={() => setShowAddAlarmModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Time Pickers */}
            <div className="flex items-center justify-center gap-2 my-1">
              <select
                value={newAlarmHours}
                onChange={(e) => setNewAlarmHours(Number(e.target.value))}
                className="bg-slate-100 border border-slate-300 rounded-xl p-2 text-base font-mono font-bold text-slate-800"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>

              <span className="text-xl font-bold text-slate-800">:</span>

              <select
                value={newAlarmMinutes}
                onChange={(e) => setNewAlarmMinutes(Number(e.target.value))}
                className="bg-slate-100 border border-slate-300 rounded-xl p-2 text-base font-mono font-bold text-slate-800"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}
                  </option>
                ))}
              </select>

              <div className="flex bg-slate-100 border border-slate-300 rounded-xl p-0.5 ml-2">
                <button
                  onClick={() => setNewAlarmPeriod('AM')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                    newAlarmPeriod === 'AM' ? 'bg-blue-600 text-white' : 'text-slate-600'
                  }`}
                >
                  AM
                </button>
                <button
                  onClick={() => setNewAlarmPeriod('PM')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                    newAlarmPeriod === 'PM' ? 'bg-blue-600 text-white' : 'text-slate-600'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Label Input */}
            <input
              type="text"
              placeholder="Alarm Label"
              value={newAlarmLabel}
              onChange={(e) => setNewAlarmLabel(e.target.value)}
              className="w-full bg-slate-100 border border-slate-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
            />

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowAddAlarmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAlarm}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
              >
                Save Alarm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
