import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, Plus, Clock, Timer as TimerIcon, Trophy } from 'lucide-react';

export default function ClockApp() {
  const [activeTab, setActiveTab] = useState<'analog' | 'world' | 'stopwatch' | 'timer'>('analog');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Stopwatch state
  const [swRunning, setSwRunning] = useState(false);
  const [swTime, setSwTime] = useState(0); // milliseconds
  const [swLaps, setSwLaps] = useState<number[]>([]);
  const swRef = useRef<any>(null);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(60); // seconds default (1 min)
  const [timerRemaining, setTimerRemaining] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Sync general ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Stopwatch ticks
  useEffect(() => {
    if (swRunning) {
      const start = Date.now() - swTime;
      swRef.current = setInterval(() => {
        setSwTime(Date.now() - start);
      }, 10);
    } else {
      clearInterval(swRef.current);
    }
    return () => clearInterval(swRef.current);
  }, [swRunning]);

  // Sync Timer countdown
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            clearInterval(timerRef.current);
            alert('⏰ Countdown Timer Completed!');
            return timerDuration;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timerDuration]);

  // Format Stopwatch
  const formatStopwatch = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const s = String(totalSecs % 60).padStart(2, '0');
    const centi = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${m}:${s}.${centi}`;
  };

  // Format countdown Timer
  const formatTimer = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Analog Hands Degree calculations
  const secsDeg = (currentTime.getSeconds() / 60) * 360;
  const minsDeg = ((currentTime.getMinutes() + currentTime.getSeconds() / 60) / 60) * 360;
  const hoursDeg = (((currentTime.getHours() % 12) + currentTime.getMinutes() / 60) / 12) * 360;

  // World clocks timezone offsets
  const worldClocks = [
    { city: 'London', zone: 'Europe/London', desc: 'GMT/BST' },
    { city: 'New York', zone: 'America/New_York', desc: 'EDT' },
    { city: 'Tokyo', zone: 'Asia/Tokyo', desc: 'JST' },
    { city: 'Sydney', zone: 'Australia/Sydney', desc: 'AEST' },
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white font-sans select-none">
      {/* 1. CLOCK TAB SWITCHER HEADER */}
      <div className="h-11 bg-zinc-900 border-b border-zinc-800 flex items-center justify-around text-xs font-semibold">
        <button
          onClick={() => setActiveTab('analog')}
          className={`flex items-center gap-1.5 py-3 border-b-2 px-2 cursor-pointer transition-colors ${
            activeTab === 'analog' ? 'border-pink-500 text-pink-400' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          🕒 <span>Classic Clock</span>
        </button>
        <button
          onClick={() => setActiveTab('world')}
          className={`flex items-center gap-1.5 py-3 border-b-2 px-2 cursor-pointer transition-colors ${
            activeTab === 'world' ? 'border-pink-500 text-pink-400' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          🌍 <span>World Clocks</span>
        </button>
        <button
          onClick={() => setActiveTab('stopwatch')}
          className={`flex items-center gap-1.5 py-3 border-b-2 px-2 cursor-pointer transition-colors ${
            activeTab === 'stopwatch' ? 'border-pink-500 text-pink-400' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          ⏱️ <span>Stopwatch</span>
        </button>
        <button
          onClick={() => setActiveTab('timer')}
          className={`flex items-center gap-1.5 py-3 border-b-2 px-2 cursor-pointer transition-colors ${
            activeTab === 'timer' ? 'border-pink-500 text-pink-400' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          ⌛ <span>Timer</span>
        </button>
      </div>

      {/* 2. TAB VIEWS CONTENT */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-auto">
        
        {/* Tab: Analog Clock face */}
        {activeTab === 'analog' && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-44 h-44 rounded-full border-4 border-zinc-700 bg-zinc-900 flex items-center justify-center shadow-2xl">
              {/* Hands */}
              {/* Hour hand */}
              <div
                className="absolute w-1 bg-white rounded-full origin-bottom"
                style={{
                  height: '34px',
                  transform: `rotate(${hoursDeg}deg)`,
                  top: '54px',
                }}
              />
              {/* Minute hand */}
              <div
                className="absolute w-0.5 bg-zinc-300 rounded-full origin-bottom"
                style={{
                  height: '46px',
                  transform: `rotate(${minsDeg}deg)`,
                  top: '42px',
                }}
              />
              {/* Second hand */}
              <div
                className="absolute w-[1px] bg-pink-500 rounded-full origin-bottom"
                style={{
                  height: '52px',
                  transform: `rotate(${secsDeg}deg)`,
                  top: '36px',
                }}
              />
              {/* Central pin */}
              <div className="absolute w-2 h-2 rounded-full bg-pink-500 border border-zinc-900" />
              {/* Hour markers */}
              {[12, 3, 6, 9].map((hour, idx) => {
                const positions = [
                  'top-1.5 left-[82px]',
                  'right-2 top-[80px]',
                  'bottom-1.5 left-[84px]',
                  'left-2 top-[80px]',
                ];
                return (
                  <span key={hour} className={`absolute text-[10px] font-black text-zinc-500 ${positions[idx]}`}>
                    {hour}
                  </span>
                );
              })}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tight tabular-nums">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-semibold">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Tab: World Clocks list */}
        {activeTab === 'world' && (
          <div className="w-full max-w-sm space-y-3.5">
            {worldClocks.map(cl => {
              const timeStr = currentTime.toLocaleTimeString([], {
                timeZone: cl.zone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              return (
                <div key={cl.city} className="bg-zinc-900 border border-zinc-800/60 p-3.5 rounded-xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm">{cl.city}</h3>
                    <p className="text-[10px] text-zinc-500">{cl.desc} Timezone</p>
                  </div>
                  <span className="text-lg font-black tracking-wide font-mono text-pink-400">{timeStr}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Stopwatch counter */}
        {activeTab === 'stopwatch' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs text-center">
            <h1 className="text-4xl font-extrabold tracking-tight font-mono text-pink-400 tabular-nums">
              {formatStopwatch(swTime)}
            </h1>

            <div className="flex gap-3">
              <button
                onClick={() => setSwRunning(!swRunning)}
                className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                  swRunning ? 'bg-amber-600' : 'bg-emerald-600'
                }`}
              >
                {swRunning ? <Square className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
              </button>
              <button
                onClick={() => {
                  if (swRunning) {
                    // Record Lap
                    setSwLaps([swTime, ...swLaps]);
                  } else {
                    // Reset
                    setSwTime(0);
                    setSwLaps([]);
                  }
                }}
                className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center cursor-pointer shadow-lg hover:bg-zinc-700 transition-transform active:scale-95"
              >
                {swRunning ? <Plus className="w-4 h-4 text-white" /> : <RotateCcw className="w-4 h-4 text-white" />}
              </button>
            </div>

            {/* Laps List */}
            {swLaps.length > 0 && (
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 max-h-36 overflow-y-auto mt-2 text-xs text-left">
                <div className="font-semibold text-zinc-500 border-b border-zinc-800 pb-2 mb-2 flex justify-between uppercase text-[9px] tracking-wider">
                  <span>Lap Marker</span>
                  <span>Split Time</span>
                </div>
                {swLaps.map((lap, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-zinc-950 text-zinc-300 font-semibold font-mono">
                    <span>Lap {swLaps.length - i}</span>
                    <span className="text-pink-400">{formatStopwatch(lap)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Countdown Timer progress ring */}
        {activeTab === 'timer' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs text-center">
            {/* Visual Progress Svg Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="64" stroke="#1f2937" strokeWidth="6" fill="transparent" />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="#ec4899"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 64}`}
                  strokeDashoffset={`${2 * Math.PI * 64 * (1 - timerRemaining / timerDuration)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <h1 className="text-2xl font-black font-mono tracking-tight text-white tabular-nums z-10">
                {formatTimer(timerRemaining)}
              </h1>
            </div>

            {/* Preset selectors or adjustments */}
            {!timerRunning ? (
              <div className="flex gap-2">
                {[30, 60, 180, 300].map(secs => (
                  <button
                    key={secs}
                    onClick={() => {
                      setTimerDuration(secs);
                      setTimerRemaining(secs);
                    }}
                    className={`px-3 py-1 bg-zinc-900 hover:bg-zinc-800 rounded text-xs cursor-pointer ${
                      timerDuration === secs ? 'border border-pink-500/60 text-pink-400' : ''
                    }`}
                  >
                    {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Controls */}
            <div className="flex gap-3">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={`px-6 py-2 rounded-xl text-xs font-bold shadow-lg transition-transform active:scale-95 cursor-pointer ${
                  timerRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-pink-600 hover:bg-pink-500'
                }`}
              >
                {timerRunning ? 'Pause Countdown' : 'Start Countdown'}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setTimerRemaining(timerDuration);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
