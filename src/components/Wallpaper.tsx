import React from 'react';
import { SystemSettings } from '../types';

interface WallpaperProps {
  settings: SystemSettings;
}

export default function Wallpaper({ settings }: WallpaperProps) {
  if (settings.wallpaper === 'custom' && settings.customWallpaperUrl) {
    return (
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${settings.customWallpaperUrl})` }}
      />
    );
  }

  if (settings.wallpaper === 'sunset') {
    return (
      <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-700 transition-all duration-700 ease-in-out overflow-hidden">
        {/* Decorative Sun */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-yellow-200 rounded-full blur-3xl opacity-50" />
        {/* Glowing wave overlays */}
        <svg className="absolute bottom-0 left-0 w-full h-1/2 opacity-30" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <path d="M0,120 C320,300 640,40 960,200 C1280,360 1440,80 1440,80 L1440,400 L0,400 Z" fill="url(#sunset-grad-1)" />
          <path d="M0,180 C360,60 720,240 1080,100 C1440,240 1440,200 1440,200 L1440,400 L0,400 Z" fill="url(#sunset-grad-2)" />
          <defs>
            <linearGradient id="sunset-grad-1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="sunset-grad-2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (settings.wallpaper === 'deep-space') {
    return (
      <div className="absolute inset-0 w-full h-full bg-[#050510] transition-all duration-700 ease-in-out overflow-hidden">
        {/* Subtle twinkling stars */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
        {/* Glowing Nebulas */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-10 left-10 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
      </div>
    );
  }

  if (settings.wallpaper === 'matrix-green') {
    return (
      <div className="absolute inset-0 w-full h-full bg-black transition-all duration-700 ease-in-out overflow-hidden font-mono text-[10px] text-green-500/30 select-none">
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/80 z-10" />
        <div className="absolute inset-0 flex flex-wrap gap-2 overflow-hidden p-4 justify-between leading-none break-all opacity-40">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1 w-6 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
              {Array.from({ length: 30 }).map((_, j) => (
                <span key={j}>{Math.random() > 0.5 ? '1' : '0'}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Wave Default (Exactly like user-attached image)
  return (
    <div className="absolute inset-0 w-full h-full bg-[#17143a] transition-all duration-700 ease-in-out overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Base Navy Gradients */}
          <linearGradient id="wave-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1345" />
            <stop offset="50%" stopColor="#170f37" />
            <stop offset="100%" stopColor="#0c0724" />
          </linearGradient>

          {/* Indigo/Violet Wave */}
          <linearGradient id="wave-indigo" x1="0%" y1="50%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#25187e" />
            <stop offset="60%" stopColor="#180e60" />
            <stop offset="100%" stopColor="#0d043d" />
          </linearGradient>

          {/* Deep Purple Wave */}
          <linearGradient id="wave-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b1ebd" />
            <stop offset="50%" stopColor="#481285" />
            <stop offset="100%" stopColor="#25084f" />
          </linearGradient>

          {/* Soft Violet Wave */}
          <linearGradient id="wave-violet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9b22cb" />
            <stop offset="50%" stopColor="#671191" />
            <stop offset="100%" stopColor="#370553" />
          </linearGradient>

          {/* Magenta wave */}
          <linearGradient id="wave-magenta" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d946ef" />
            <stop offset="50%" stopColor="#a21caf" />
            <stop offset="100%" stopColor="#4a044e" />
          </linearGradient>

          {/* Rose/Pink top layer */}
          <linearGradient id="wave-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="55%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          {/* Soft white accent glow under pink */}
          <linearGradient id="wave-white-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* 1. Base Layer */}
        <rect width="1440" height="900" fill="url(#wave-bg)" />

        {/* 2. Deep Violet/Blue bottom-left wave */}
        <path
          d="M 0,350
             C 400,600 800,750 1440,860
             L 1440,900
             L 0,900
             Z"
          fill="url(#wave-indigo)"
        />

        {/* 3. Deep Purple middle wave */}
        <path
          d="M 0,160
             C 450,420 850,580 1440,730
             L 1440,900
             L 0,900
             Z"
          fill="url(#wave-purple)"
        />

        {/* 4. Soft Violet wave */}
        <path
          d="M 0,30
             C 500,280 900,380 1440,550
             L 1440,900
             L 0,900
             Z"
          fill="url(#wave-violet)"
        />

        {/* 5. Pure White Accent S-Curve peeking right */}
        <path
          d="M 350,30
             C 700,200 1000,500 1440,620
             L 1440,680
             C 1200,600 1000,550 780,550
             C 550,550 400,500 350,30
             Z"
          fill="url(#wave-white-accent)"
          opacity="0.9"
        />

        {/* 6. Fuchsia/Magenta intermediate wave */}
        <path
          d="M 350,0
             C 550,150 900,350 1440,430
             L 1440,900
             L 0,900
             L 0,0
             Z"
          fill="url(#wave-magenta)"
          clipPath="url(#clip-left)"
          opacity="0.95"
        />

        {/* 7. Top Pink Wave */}
        <path
          d="M 350,0
             C 550,130 900,250 1440,280
             L 1440,0
             Z"
          fill="url(#wave-pink)"
        />
      </svg>
    </div>
  );
}
