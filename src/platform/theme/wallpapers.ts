/**
 * The catalogue of desktop wallpapers.
 *
 * Most wallpapers are a base colour plus a few blurred or patterned layers, so
 * they are described as data and rendered by one generic component. Only the
 * three that predate this file need bespoke drawing code, and they say so.
 *
 * `tone` is not decoration. The desktop's icon labels sit directly on the
 * wallpaper, so a light wallpaper needs dark labels; before this file every
 * wallpaper was dark and the labels were hardcoded white.
 */

export type WallpaperTone = 'light' | 'dark';
export type WallpaperGroup = 'gradient' | 'ambient' | 'minimal' | 'effects';

export interface WallpaperLayer {
  className: string;
  style?: Record<string, string>;
}

export interface WallpaperDefinition {
  id: string;
  name: string;
  tone: WallpaperTone;
  group: WallpaperGroup;
  /** Tailwind classes for the settings swatch. */
  swatch: string;
  /** Full-screen base classes. Ignored when `bespoke` is set. */
  base?: string;
  layers?: WallpaperLayer[];
  /**
   * Drawn by a hand-written renderer in `shell/desktop/Wallpaper.tsx` rather
   * than from `base`/`layers` — these predate the catalogue and use SVG or
   * generated content that data cannot express.
   */
  bespoke?: boolean;
}

export const WALLPAPERS = [
  // ---- Nova: the default pair -------------------------------------------
  // Layered paper-cut waves sweeping from a deep indigo lower-left up to pink
  // at the top right, with one pale sliver breaking the spectrum. Bespoke
  // because the look depends on hard-edged bands each casting a shadow on the
  // one below — data-driven blobs cannot express that.
  //
  // Day and night share the geometry exactly and differ only in the palette,
  // so the two are recognisably one place under different light.
  {
    id: 'nova-day',
    name: 'Nova Day',
    tone: 'dark',
    group: 'gradient',
    swatch: 'bg-gradient-to-tr from-[#1b1466] via-[#a923d4] to-[#f0a8c8]',
    bespoke: true,
  },
  {
    id: 'nova-night',
    name: 'Nova Night',
    tone: 'dark',
    group: 'gradient',
    swatch: 'bg-gradient-to-tr from-[#0a0630] via-[#3b1fd9] to-[#cc3390]',
    bespoke: true,
  },

  // ---- Halo -------------------------------------------------------------
  // Large overlapping haloes of light at very low opacity, a fine dot grain to
  // stop the gradients banding, and a vignette to seat the desktop. The two
  // versions share their geometry and accent hues so switching sides reads as
  // the same place at a different hour, rather than as two designs.
  {
    id: 'halo-day',
    name: 'Halo Day',
    tone: 'light',
    group: 'gradient',
    swatch: 'bg-gradient-to-br from-[#fdfcff] via-[#e6e6fb] to-[#c9d4f5]',
    base: 'bg-[#f4f3fb]',
    layers: [
      { className: 'absolute inset-0 bg-gradient-to-br from-[#fefdff] via-[#efedfb] to-[#dbe2f7]' },
      { className: 'absolute -top-[18%] -left-[8%] w-[62rem] h-[62rem] bg-[#6d5efc]/[0.16] rounded-full blur-[130px]' },
      { className: 'absolute top-[24%] -right-[14%] w-[54rem] h-[54rem] bg-[#22b8cf]/[0.16] rounded-full blur-[130px]' },
      { className: 'absolute -bottom-[22%] left-[24%] w-[52rem] h-[52rem] bg-[#ff8fa3]/[0.14] rounded-full blur-[130px]' },
      { className: 'absolute top-[8%] left-[42%] w-[28rem] h-[28rem] bg-white/55 rounded-full blur-[90px]' },
      { className: 'absolute inset-0 bg-[radial-gradient(#1b172508_1px,transparent_1px)] [background-size:4px_4px]' },
      { className: 'absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_35%,rgba(27,23,37,0.10)_100%)]' },
    ],
  },
  {
    id: 'halo-night',
    name: 'Halo Night',
    tone: 'dark',
    group: 'gradient',
    swatch: 'bg-gradient-to-br from-[#2b2450] via-[#171334] to-[#08060f]',
    base: 'bg-[#08060f]',
    layers: [
      { className: 'absolute inset-0 bg-gradient-to-br from-[#171334] via-[#0e0b20] to-[#08060f]' },
      { className: 'absolute -top-[18%] -left-[8%] w-[62rem] h-[62rem] bg-[#6d5efc]/25 rounded-full blur-[130px]' },
      { className: 'absolute top-[24%] -right-[14%] w-[54rem] h-[54rem] bg-[#22b8cf]/18 rounded-full blur-[130px]' },
      { className: 'absolute -bottom-[22%] left-[24%] w-[52rem] h-[52rem] bg-[#ff5d8f]/14 rounded-full blur-[130px]' },
      { className: 'absolute top-[8%] left-[42%] w-[28rem] h-[28rem] bg-[#c4b5fd]/12 rounded-full blur-[90px]' },
      { className: 'absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:46px_46px] opacity-[0.07]' },
      { className: 'absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_30%,rgba(0,0,0,0.55)_100%)]' },
    ],
  },

  // ---- Original four, drawn by their own renderers -----------------------
  {
    id: 'wave-default',
    name: 'Wave Gradient',
    tone: 'dark',
    group: 'gradient',
    swatch: 'bg-gradient-to-tr from-indigo-900 via-[#bd2c8e] to-[#ec4899]',
    bespoke: true,
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    tone: 'dark',
    group: 'gradient',
    swatch: 'bg-gradient-to-br from-amber-500 via-rose-500 to-purple-800',
    bespoke: true,
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    tone: 'dark',
    group: 'ambient',
    swatch: 'bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950',
    bespoke: true,
  },
  {
    id: 'matrix-green',
    name: 'Matrix Green',
    tone: 'dark',
    group: 'effects',
    swatch: 'bg-black border border-green-500/40',
    bespoke: true,
  },

  // ---- Light ------------------------------------------------------------
  {
    id: 'daybreak',
    name: 'Daybreak',
    tone: 'light',
    group: 'gradient',
    swatch: 'bg-gradient-to-br from-[#ffe9d6] via-[#ffd6e8] to-[#d9e4ff]',
    base: 'bg-gradient-to-br from-[#ffe9d6] via-[#ffd6e8] to-[#d9e4ff]',
    layers: [
      { className: 'absolute top-[15%] left-[22%] w-[28rem] h-[28rem] bg-amber-200/60 rounded-full blur-3xl' },
      { className: 'absolute bottom-[10%] right-[18%] w-[24rem] h-[24rem] bg-sky-200/50 rounded-full blur-3xl' },
    ],
  },
  {
    id: 'linen',
    name: 'Linen',
    tone: 'light',
    group: 'minimal',
    swatch: 'bg-[#f5f1ea]',
    base: 'bg-[#f5f1ea]',
    layers: [
      {
        className:
          'absolute inset-0 bg-[radial-gradient(#00000012_1px,transparent_1px)] [background-size:6px_6px]',
      },
      { className: 'absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#d8cdb8]/40' },
    ],
  },
  {
    id: 'mint-fog',
    name: 'Mint Fog',
    tone: 'light',
    group: 'gradient',
    swatch: 'bg-gradient-to-tr from-[#e6fffa] via-[#e9f7ff] to-[#f3e9ff]',
    base: 'bg-gradient-to-tr from-[#e6fffa] via-[#e9f7ff] to-[#f3e9ff]',
    layers: [
      { className: 'absolute top-[20%] right-[20%] w-[30rem] h-[30rem] bg-teal-200/45 rounded-full blur-3xl' },
      { className: 'absolute bottom-[15%] left-[15%] w-[26rem] h-[26rem] bg-violet-200/45 rounded-full blur-3xl' },
    ],
  },
  {
    id: 'blush',
    name: 'Blush',
    tone: 'light',
    group: 'gradient',
    swatch: 'bg-gradient-to-br from-[#ffe4ec] via-[#f7e0ff] to-[#e0e7ff]',
    base: 'bg-gradient-to-br from-[#ffe4ec] via-[#f7e0ff] to-[#e0e7ff]',
    layers: [
      { className: 'absolute top-[10%] left-[10%] w-[26rem] h-[26rem] bg-rose-200/50 rounded-full blur-3xl' },
      { className: 'absolute bottom-[12%] right-[12%] w-[28rem] h-[28rem] bg-indigo-200/45 rounded-full blur-3xl' },
    ],
  },
  {
    id: 'paper-grid',
    name: 'Paper Grid',
    tone: 'light',
    group: 'minimal',
    swatch: 'bg-[#fafafa] border border-slate-300',
    base: 'bg-[#fafafa]',
    layers: [
      {
        className:
          'absolute inset-0 bg-[linear-gradient(#00000010_1px,transparent_1px),linear-gradient(90deg,#00000010_1px,transparent_1px)] [background-size:32px_32px]',
      },
      { className: 'absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-slate-200/50' },
    ],
  },

  // ---- Dark -------------------------------------------------------------
  {
    id: 'midnight-aurora',
    name: 'Midnight Aurora',
    tone: 'dark',
    group: 'ambient',
    swatch: 'bg-gradient-to-tr from-[#050a1a] via-[#0d2b4a] to-[#0a3d3a]',
    base: 'bg-[#050a1a]',
    layers: [
      { className: 'absolute -top-[10%] left-[5%] w-[45rem] h-[22rem] bg-emerald-400/18 rounded-full blur-3xl rotate-[-18deg]' },
      { className: 'absolute top-[18%] right-[0%] w-[38rem] h-[18rem] bg-sky-400/18 rounded-full blur-3xl rotate-[12deg]' },
      { className: 'absolute bottom-[8%] left-[25%] w-[34rem] h-[16rem] bg-violet-500/15 rounded-full blur-3xl rotate-[-6deg]' },
      { className: 'absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:40px_40px] opacity-15' },
    ],
  },
  {
    id: 'nebula-rose',
    name: 'Nebula Rose',
    tone: 'dark',
    group: 'ambient',
    swatch: 'bg-gradient-to-tr from-[#12060f] via-[#3b0d3a] to-[#7a1246]',
    base: 'bg-[#12060f]',
    layers: [
      { className: 'absolute top-[22%] left-[20%] w-[32rem] h-[32rem] bg-rose-500/22 rounded-full blur-3xl' },
      { className: 'absolute bottom-[18%] right-[18%] w-[28rem] h-[28rem] bg-fuchsia-600/20 rounded-full blur-3xl' },
      { className: 'absolute top-[5%] right-[30%] w-[22rem] h-[22rem] bg-indigo-600/18 rounded-full blur-3xl' },
      { className: 'absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-15' },
    ],
  },
  {
    id: 'abyss',
    name: 'Abyss',
    tone: 'dark',
    group: 'ambient',
    swatch: 'bg-gradient-to-b from-[#04141a] via-[#052a33] to-black',
    base: 'bg-[#04141a]',
    layers: [
      { className: 'absolute top-[-15%] left-1/2 -translate-x-1/2 w-[55rem] h-[30rem] bg-cyan-500/15 rounded-full blur-3xl' },
      { className: 'absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent' },
    ],
  },
  {
    id: 'ember-glow',
    name: 'Ember Glow',
    tone: 'dark',
    group: 'ambient',
    swatch: 'bg-gradient-to-tr from-[#140d0a] via-[#4a2410] to-[#b45309]',
    base: 'bg-[#140d0a]',
    layers: [
      { className: 'absolute bottom-[-10%] left-1/4 w-[40rem] h-[26rem] bg-orange-600/25 rounded-full blur-3xl' },
      { className: 'absolute bottom-[5%] right-[15%] w-[26rem] h-[20rem] bg-amber-500/20 rounded-full blur-3xl' },
      { className: 'absolute top-[10%] left-[10%] w-[22rem] h-[22rem] bg-rose-700/15 rounded-full blur-3xl' },
    ],
  },
  {
    id: 'forest-night',
    name: 'Forest Night',
    tone: 'dark',
    group: 'ambient',
    swatch: 'bg-gradient-to-tr from-[#050f0a] via-[#0d2b1a] to-[#1a4d2e]',
    base: 'bg-[#050f0a]',
    layers: [
      { className: 'absolute top-[25%] left-[15%] w-[34rem] h-[34rem] bg-emerald-600/18 rounded-full blur-3xl' },
      { className: 'absolute bottom-[10%] right-[20%] w-[28rem] h-[28rem] bg-teal-500/15 rounded-full blur-3xl' },
      { className: 'absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40' },
    ],
  },
  {
    id: 'carbon-weave',
    name: 'Carbon Weave',
    tone: 'dark',
    group: 'minimal',
    swatch: 'bg-[#101014] border border-white/15',
    base: 'bg-[#101014]',
    layers: [
      {
        className:
          'absolute inset-0 bg-[repeating-linear-gradient(45deg,#ffffff08_0px,#ffffff08_1px,transparent_1px,transparent_8px)]',
      },
      { className: 'absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#000000cc_100%)]' },
    ],
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    tone: 'dark',
    group: 'effects',
    swatch: 'bg-gradient-to-tr from-black via-[#3d1c02] to-[#f59e0b]',
    base: 'bg-[#0a0704]',
    layers: [
      { className: 'absolute top-[-20%] right-[-10%] w-[45rem] h-[45rem] bg-amber-500/25 rounded-full blur-3xl' },
      { className: 'absolute top-[10%] right-[5%] w-[20rem] h-[20rem] bg-yellow-300/25 rounded-full blur-2xl' },
      { className: 'absolute inset-0 bg-gradient-to-bl from-transparent via-transparent to-black' },
    ],
  },
  {
    id: 'twilight-mesh',
    name: 'Twilight Mesh',
    tone: 'dark',
    group: 'gradient',
    swatch: 'bg-gradient-to-br from-[#1e1b4b] via-[#701a75] to-[#0f172a]',
    base: 'bg-[#0f0b26]',
    layers: [
      { className: 'absolute top-[-10%] left-[-5%] w-[38rem] h-[38rem] bg-indigo-600/30 rounded-full blur-3xl' },
      { className: 'absolute top-[30%] right-[-8%] w-[34rem] h-[34rem] bg-fuchsia-600/25 rounded-full blur-3xl' },
      { className: 'absolute bottom-[-12%] left-[30%] w-[36rem] h-[36rem] bg-cyan-500/20 rounded-full blur-3xl' },
    ],
  },
] as const satisfies readonly WallpaperDefinition[];

/** `custom` is a real setting but has no catalogue entry — it is a user URL. */
export type WallpaperId = (typeof WALLPAPERS)[number]['id'] | 'custom';

/** A catalogue entry with its literal types intact. See `Theme` in `themes.ts`. */
export type Wallpaper = (typeof WALLPAPERS)[number];

export const DEFAULT_WALLPAPER_ID: WallpaperId = 'nova-day';

const BY_ID = new Map<string, WallpaperDefinition>(WALLPAPERS.map((w) => [w.id, w]));

export function wallpaperById(id: string | undefined): WallpaperDefinition | undefined {
  return BY_ID.get(id ?? '');
}

/**
 * Whether the desktop's own labels should be light or dark on this wallpaper.
 *
 * A custom image is unknowable, so it keeps the historical assumption of light
 * text over a shadow rather than guessing and getting it wrong half the time.
 */
export function wallpaperTone(id: string | undefined): WallpaperTone {
  return wallpaperById(id)?.tone ?? 'dark';
}

export function wallpapersByGroup(): { group: WallpaperGroup; label: string; wallpapers: Wallpaper[] }[] {
  const labels: Record<WallpaperGroup, string> = {
    gradient: 'Gradients',
    ambient: 'Ambient',
    minimal: 'Minimal',
    effects: 'Effects',
  };
  return (['gradient', 'ambient', 'minimal', 'effects'] as const).map((group) => ({
    group,
    label: labels[group],
    wallpapers: WALLPAPERS.filter((w) => w.group === group),
  }));
}
