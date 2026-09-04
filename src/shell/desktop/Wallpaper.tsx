import React from 'react';
import { SystemSettings } from '../../platform/types';
import { wallpaperById } from '../../platform/theme/wallpapers';

interface WallpaperProps {
  settings: SystemSettings;
}

const SURFACE = 'absolute inset-0 w-full h-full transition-all duration-700 ease-in-out overflow-hidden';

/**
 * Renders a catalogue wallpaper: a base plus blurred or patterned layers.
 *
 * Everything added after the original four is expressible this way, so a new
 * wallpaper is an entry in `platform/theme/wallpapers.ts` and nothing else.
 */
function LayeredWallpaper({ base, layers }: { base: string; layers?: readonly { className: string; style?: Record<string, string> }[] }) {
  return (
    <div className={`${SURFACE} ${base}`}>
      {layers?.map((layer, index) => (
        <div key={index} className={layer.className} style={layer.style} />
      ))}
    </div>
  );
}

/**
 * The Nova palette: eight stops running from the deep indigo at the bottom
 * left through violet and magenta to pink at the top right, plus one pale
 * sliver that breaks the spectrum, and the strength of the shadow each band
 * casts on the one below it.
 */
interface NovaPalette {
  base: [string, string];
  bands: [string, string][];
  sliver: [string, string];
  shadow: string;
  vignette: string;
}

const NOVA_DAY: NovaPalette = {
  // The pale corner the whole composition resolves towards.
  base: ['#f2b3d0', '#e493bd'],
  bands: [
    ['#f0a8c8', '#e08cb4'],
    ['#e5399a', '#cf2585'],
    ['#c126ab', '#9c1c88'],
    ['#7a2ff0', '#5a1eb8'],
    ['#241a7a', '#150f4e'],
  ],
  sliver: ['#f9f4f8', '#eadcea'],
  shadow: 'rgba(20, 8, 45, 0.34)',
  vignette: 'rgba(12, 6, 32, 0.16)',
};

/**
 * Same geometry, night palette.
 *
 * Not the day colours darkened: brightness peaks in the *middle* band and falls
 * away at both the top and the bottom, so the spectrum reads as burning through
 * near-black rather than as a lit sky.
 */
const NOVA_NIGHT: NovaPalette = {
  base: ['#1a1145', '#0e0930'],
  bands: [
    ['#2b1a72', '#170f4a'],
    ['#3b1fd9', '#211396'],
    ['#a3218a', '#6e1260'],
    ['#4a1272', '#2a0846'],
    ['#0a0524', '#04010e'],
  ],
  sliver: ['#efe8f4', '#cdbfd6'],
  shadow: 'rgba(0, 0, 0, 0.55)',
  vignette: 'rgba(0, 0, 0, 0.55)',
};

/**
 * Layered paper-cut waves.
 *
 * Each band is a filled path drawn over the one before it, offset upward and to
 * the right, so the composition sweeps from the deep corner to the bright one.
 * The drop shadow under every band is what makes them read as cut paper rather
 * than as a flat gradient — remove it and the whole effect collapses.
 */
function NovaWallpaper({ palette, id }: { palette: NovaPalette; id: string }) {
  const { base, bands, sliver, shadow, vignette } = palette;

  // Five bands, not seven, and spaced tight at the top and wide at the bottom:
  // the deep band ends up owning roughly half the canvas the way the reference
  // does. Evenly spaced edges read as a striped rainbow instead of a landscape.
  const paths = [
    'M -50,60 C 380,83 1020,178 1490,250 L 1490,950 L -50,950 Z',
    'M -50,150 C 400,182 1040,317 1490,420 L 1490,950 L -50,950 Z',
    'M -50,250 C 420,293 1060,473 1490,610 L 1490,950 L -50,950 Z',
    'M -50,350 C 440,405 1080,635 1490,810 L 1490,950 L -50,950 Z',
    'M -50,460 C 460,528 1100,813 1490,1030 L 1490,950 L -50,950 Z',
  ];

  return (
    // Colour is an inline style, not a class: Tailwind builds the classes it
    // finds as literal text, so one assembled from a runtime value never exists.
    <div className={SURFACE} style={{ backgroundColor: base[1] }}>
      <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-base`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={base[1]} />
            <stop offset="100%" stopColor={base[0]} />
          </linearGradient>
          {bands.map((band, i) => (
            <linearGradient key={i} id={`${id}-b${i}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={band[1]} />
              <stop offset="100%" stopColor={band[0]} />
            </linearGradient>
          ))}
          <linearGradient id={`${id}-sliver`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={sliver[1]} />
            <stop offset="100%" stopColor={sliver[0]} />
          </linearGradient>
          {/* The soft shadow each band casts on the one beneath it. */}
          <filter id={`${id}-lift`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="-14" stdDeviation="22" floodColor={shadow} floodOpacity="1" />
          </filter>
        </defs>

        <rect x="-50" y="-50" width="1540" height="1000" fill={`url(#${id}-base)`} />

        {paths.map((d, i) => (
          <path key={i} d={d} fill={`url(#${id}-b${i})`} filter={`url(#${id}-lift)`} />
        ))}

        {/* The pale sliver that interrupts the spectrum in the lower right. */}
        <path
          d="M 980,950 C 1120,790 1290,700 1490,672 L 1490,810 C 1320,845 1200,900 1130,950 Z"
          fill={`url(#${id}-sliver)`}
          filter={`url(#${id}-lift)`}
        />
      </svg>

      {/* Seats the desktop and keeps the bright corner from overwhelming it. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 62% 30%, transparent 30%, ${vignette} 100%)` }}
      />
    </div>
  );
}

export default function Wallpaper({ settings }: WallpaperProps) {
  if (settings.wallpaper === 'nova-day') {
    return <NovaWallpaper palette={NOVA_DAY} id="nova-day" />;
  }
  if (settings.wallpaper === 'nova-night') {
    return <NovaWallpaper palette={NOVA_NIGHT} id="nova-night" />;
  }

  if (settings.wallpaper === 'custom' && settings.customWallpaperUrl) {
    return (
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${settings.customWallpaperUrl})` }}
      />
    );
  }

  // Catalogue entries that are pure data. The four below this predate the
  // catalogue and need SVG or generated content, so they keep their renderers.
  const definition = wallpaperById(settings.wallpaper);
  if (definition && !definition.bespoke && definition.base) {
    return <LayeredWallpaper base={definition.base} layers={definition.layers} />;
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
