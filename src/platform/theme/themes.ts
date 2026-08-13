/**
 * The catalogue of desktop themes.
 *
 * A theme was previously three string literals repeated across roughly fifteen
 * files, each with its own `theme === 'modern-dark'` test and its own class
 * map. Adding a fourth meant finding every one of them, and missing one showed
 * up as a light menu inside a dark window rather than as a compile error.
 *
 * So a theme is data. Everything that renders chrome reads it from here, and
 * everything that only needs to know "light or dark?" asks `themeFamily`.
 */

/** What a theme is at heart. Surfaces that only branch three ways use this. */
export type ThemeFamily = 'light' | 'dark' | 'terminal';

/** The class names the window chrome needs. One set per theme. */
export interface ThemeChrome {
  window: string;
  windowFocused: string;
  header: string;
  controlBtn: string;
  controlMinimizeMax: string;
  controlClose: string;
  content: string;
  statusBar: string;
}

/**
 * Classes for the floating surfaces outside a window: the dock, the top bar,
 * popups, menus, the notification centre and the application menu.
 *
 * These used to be written inline at every call site — the dock was a flat
 * opaque violet, the application menu a near-black scrim, each popup its own
 * shade — which is why the shell never looked like one system. One vocabulary,
 * three family implementations.
 *
 * The visual language: translucent surfaces over heavy blur, a hairline border,
 * a top inset highlight for a lit edge, and a wide soft shadow for depth. Not
 * colour changes — the same physical treatment everywhere.
 *
 * The border colour is the one thing that inverts by family. On dark surfaces a
 * white hairline defines the edge; on light ones it has no contrast against a
 * pale wallpaper, so the edge is a dark hairline and the separation comes from
 * the shadow instead.
 */
export interface ThemeSurfaces {
  /** A floating surface: dock, popup panel, dropdown. */
  panel: string;
  /** An inset row or tile inside a panel. */
  card: string;
  cardHover: string;
  /** Hairline separator, as a border-colour class. */
  divider: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  /** Neutral wash for a control sitting on a panel. */
  hover: string;
  pressed: string;
  /** A raised input or segmented control. */
  control: string;
  controlFocus: string;
  /**
   * Placeholder colour, spelled out rather than composed from `textSubtle`.
   * Tailwind generates classes it finds as literal text; `placeholder:` + a
   * runtime-joined colour would never appear in the source and so would never
   * be built.
   */
  placeholder: string;
  /** Full-screen backdrop behind the application menu. */
  scrim: string;
  /** Tile inside the application menu — deliberately lighter than `card`. */
  tile: string;
  tileHover: string;
  /**
   * The accent as a raw colour. Tailwind cannot build a class from a runtime
   * value, so accent-coloured surfaces are applied as inline styles.
   */
  accent: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  family: ThemeFamily;
  /** One-line description, shown under the swatch. */
  description: string;
  /** Accent applied when the theme is chosen as a preset. */
  accent: string;
  /** Wallpaper applied alongside it as a preset. */
  wallpaper: string;
  /** Tailwind classes for the settings swatch. */
  swatch: string;
  chrome: ThemeChrome;
  /**
   * Per-theme tint for the shell surfaces, merged over the family defaults.
   *
   * The family decides the *physics* — how transparent, how blurred, how the
   * shadow falls. A theme with a strong identity can restate the colour of
   * those surfaces without restating the behaviour, so the dock and panels
   * carry its palette while still matching every other theme's depth.
   */
  surfaceTint?: Partial<Omit<ThemeSurfaces, 'accent'>>;
}

/**
 * Surface treatments, one per family.
 *
 * Held apart from the theme entries because these are *physics*, not palette:
 * how translucent a floating surface is, how it catches light at its top edge,
 * how far its shadow falls. A theme contributes the accent; the family decides
 * how surfaces behave. That is what makes twelve themes feel like one system.
 *
 * What makes these read as glass rather than as tinted plastic:
 *
 *  - **A gradient fill, not a flat one.** Real glass catches more light at its
 *    top edge, so the fill falls off downward. A flat wash at any opacity looks
 *    like a sheet of colour laid over the desktop.
 *  - **Saturation, not just blur.** Blurring alone averages the wallpaper
 *    towards grey and the panel goes dead and foggy. Pushing saturation back up
 *    is what keeps the colour behind it alive.
 *  - **Low fill, high blur.** The wallpaper has to come through — that is the
 *    whole point — but a 64px blur turns it into a soft colour wash rather than
 *    detail competing with the text on top.
 *  - **Restrained shadows and a faint inset highlight.** Enough to seat the
 *    surface above the desktop; not so much that it looks lacquered. Light
 *    surfaces lean harder on the shadow than dark ones, because they cannot
 *    lean on the border.
 *
 * Text weights are deliberately stronger than they would be on an opaque
 * surface, because the ground underneath is now partly the wallpaper.
 */
const SURFACES: Record<ThemeFamily, Omit<ThemeSurfaces, 'accent'>> = {
  light: {
    // A light surface is separated from the desktop by its *shadow*, not by a
    // white outline. A white border on a pale, translucent panel has almost no
    // contrast against a light wallpaper — it either vanishes or reads as a
    // fringe. The edge is a dark hairline; the white stays as the inset top
    // highlight, which is where real glass actually catches light.
    panel:
      'bg-gradient-to-b from-white/62 to-white/44 backdrop-blur-3xl backdrop-saturate-150 ' +
      'border border-[#141020]/[0.12] ' +
      'shadow-[0_18px_44px_-14px_rgba(20,16,32,0.34),0_3px_8px_-3px_rgba(20,16,32,0.16),inset_0_1px_0_rgba(255,255,255,0.65)]',
    // Cards carry text, so they sit a step more solid than the panel around
    // them — the readable ground inside a transparent frame.
    card: 'bg-white/55 border border-[#141020]/[0.08]',
    cardHover: 'hover:bg-white/75 hover:border-[#141020]/[0.16]',
    divider: 'border-[#141020]/[0.09]',
    text: 'text-[#141020]',
    textMuted: 'text-[#141020]/72',
    textSubtle: 'text-[#141020]/55',
    hover: 'hover:bg-white/45',
    pressed: 'active:bg-white/65',
    control: 'bg-white/50 border border-[#141020]/[0.10]',
    controlFocus: 'focus:bg-white/80 focus:border-[#141020]/25',
    placeholder: 'placeholder:text-[#141020]/50',
    // Frosted glass over the desktop, not a modal blackout.
    scrim: 'bg-[#f0eef8]/45 backdrop-blur-3xl backdrop-saturate-150',
    tile: 'bg-white/45 border border-[#141020]/[0.08] shadow-[0_8px_18px_-10px_rgba(20,16,32,0.38)]',
    tileHover: 'group-hover:bg-white/72 group-hover:border-[#141020]/[0.16]',
  },
  dark: {
    panel:
      'bg-gradient-to-b from-[#1a1730]/60 to-[#0d0b16]/42 backdrop-blur-3xl backdrop-saturate-150 ' +
      'border border-white/[0.14] ' +
      'shadow-[0_16px_40px_-14px_rgba(0,0,0,0.55),0_1px_3px_-1px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.09)]',
    card: 'bg-white/[0.07] border border-white/[0.10]',
    cardHover: 'hover:bg-white/[0.13] hover:border-white/20',
    divider: 'border-white/[0.10]',
    text: 'text-[#f6f4fc]',
    textMuted: 'text-[#f6f4fc]/72',
    textSubtle: 'text-[#f6f4fc]/50',
    hover: 'hover:bg-white/[0.09]',
    pressed: 'active:bg-white/[0.15]',
    control: 'bg-white/[0.08] border border-white/[0.12]',
    controlFocus: 'focus:bg-white/[0.15] focus:border-white/30',
    placeholder: 'placeholder:text-[#f6f4fc]/50',
    scrim: 'bg-[#0b0913]/45 backdrop-blur-3xl backdrop-saturate-150',
    tile: 'bg-white/[0.08] border border-white/[0.12] shadow-[0_6px_16px_-10px_rgba(0,0,0,0.5)]',
    tileHover: 'group-hover:bg-white/[0.15] group-hover:border-white/25',
  },
  terminal: {
    // Kept the most solid of the three on purpose: a phosphor terminal reads as
    // a lit screen, and glass would undo that.
    panel:
      'bg-gradient-to-b from-[#061008]/88 to-[#020603]/78 backdrop-blur-xl backdrop-saturate-150 ' +
      'border border-emerald-500/25 ' +
      'shadow-[0_16px_40px_-14px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(34,197,94,0.14)] font-mono',
    card: 'bg-emerald-500/[0.07] border border-emerald-500/20',
    cardHover: 'hover:bg-emerald-500/[0.13] hover:border-emerald-500/35',
    divider: 'border-emerald-500/20',
    text: 'text-emerald-300',
    textMuted: 'text-emerald-400/75',
    textSubtle: 'text-emerald-500/55',
    hover: 'hover:bg-emerald-500/10',
    pressed: 'active:bg-emerald-500/20',
    control: 'bg-emerald-500/[0.08] border border-emerald-500/25',
    controlFocus: 'focus:bg-emerald-500/15 focus:border-emerald-400/50',
    placeholder: 'placeholder:text-emerald-500/55',
    scrim: 'bg-black/60 backdrop-blur-2xl backdrop-saturate-150',
    tile: 'bg-emerald-500/[0.08] border border-emerald-500/25',
    tileHover: 'group-hover:bg-emerald-500/15 group-hover:border-emerald-400/45',
  },
};

/**
 * Themes, grouped by family and ordered light → dark → terminal.
 *
 * `classic-light`, `modern-dark` and `retro-terminal` carry their original
 * class strings verbatim: this catalogue was introduced to hold new themes, not
 * to restyle the existing ones.
 *
 * `halo-light` and `halo-dark` are the defaults — an original abstract style
 * built on soft light, depth and restraint rather than on chrome effects.
 */
export const THEMES = [
  {
    id: 'nova-light',
    name: 'Nova Light',
    family: 'light',
    description: 'The default. Indigo-to-magenta spectrum on soft lilac glass.',
    // The spectrum's midpoint: vivid magenta, dark enough to stay legible as
    // text on a pale surface.
    accent: '#c81d8f',
    wallpaper: 'nova-day',
    swatch: 'bg-gradient-to-tr from-[#1b1466] via-[#a923d4] to-[#f0a8c8]',
    chrome: {
      // Lilac-tinted glass rather than neutral white: the window picks up the
      // violet end of the wallpaper and the pink end at its edges.
      window:
        'bg-gradient-to-b from-[#f6ecfa]/80 to-[#e8ddf7]/72 backdrop-blur-3xl backdrop-saturate-150 ' +
        'border-[#2a1435]/[0.13] text-[#2a1435] ' +
        'shadow-[0_24px_58px_-18px_rgba(42,20,53,0.38),0_3px_10px_-4px_rgba(42,20,53,0.18)]',
      windowFocused:
        'border-[#2a1435]/20 ring-1 ring-[#c81d8f]/25 ' +
        'shadow-[0_32px_70px_-18px_rgba(42,20,53,0.46),0_4px_12px_-4px_rgba(42,20,53,0.22)]',
      header: 'bg-gradient-to-b from-white/50 to-[#f0e4f8]/25 border-b border-[#2a1435]/[0.08] text-[#2a1435]',
      controlBtn: 'text-[#2a1435]/75 hover:bg-white/60 hover:text-[#2a1435] active:bg-white/80',
      controlMinimizeMax: 'text-[#2a1435]/75',
      controlClose: 'text-[#2a1435]/75 hover:bg-rose-500/15 hover:text-rose-600 active:bg-rose-500/25',
      content: 'text-[#2a1435] font-sans',
      statusBar: 'bg-[#f0e4f8]/35 border-t border-[#2a1435]/[0.08] text-[#2a1435]/70',
    },
    surfaceTint: {
      // Same rule as the light family: the edge is a dark plum hairline and the
      // separation comes from the shadow. Nova's wallpaper is bright and
      // saturated, so a white outline would disappear into it entirely.
      panel:
        'bg-gradient-to-b from-[#f8eefb]/62 to-[#e4d6f4]/44 backdrop-blur-3xl backdrop-saturate-150 ' +
        'border border-[#2a1435]/[0.13] ' +
        'shadow-[0_18px_44px_-14px_rgba(42,20,53,0.36),0_3px_8px_-3px_rgba(42,20,53,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]',
      card: 'bg-[#fdf8fe]/58 border border-[#2a1435]/[0.09]',
      cardHover: 'hover:bg-[#fdf8fe]/80 hover:border-[#2a1435]/[0.18]',
      divider: 'border-[#2a1435]/[0.10]',
      text: 'text-[#2a1435]',
      textMuted: 'text-[#2a1435]/72',
      textSubtle: 'text-[#2a1435]/55',
      control: 'bg-[#fdf8fe]/52 border border-[#2a1435]/[0.11]',
      controlFocus: 'focus:bg-white/85 focus:border-[#2a1435]/25',
      placeholder: 'placeholder:text-[#2a1435]/50',
      scrim: 'bg-[#efe2f7]/45 backdrop-blur-3xl backdrop-saturate-150',
      tile: 'bg-[#fdf8fe]/48 border border-[#2a1435]/[0.09] shadow-[0_8px_18px_-10px_rgba(42,20,53,0.40)]',
      tileHover: 'group-hover:bg-[#fdf8fe]/75 group-hover:border-[#2a1435]/[0.18]',
    },
  },
  {
    id: 'nova-dark',
    name: 'Nova Dark',
    family: 'dark',
    description: 'The default dark. Near-black plum with the spectrum burning through.',
    accent: '#f052b4',
    wallpaper: 'nova-night',
    swatch: 'bg-gradient-to-tr from-[#0a0630] via-[#3b1fd9] to-[#cc3390]',
    chrome: {
      // Near-black with a warm plum bleed, the way the wallpaper's magenta
      // shows through a dark surface rather than being neutralised by it.
      window:
        'bg-gradient-to-b from-[#1c0d22]/84 to-[#0c0510]/78 backdrop-blur-3xl backdrop-saturate-150 ' +
        'border-white/[0.13] text-[#f6eefa] ' +
        'shadow-[0_22px_55px_-18px_rgba(0,0,0,0.68),0_2px_8px_-4px_rgba(0,0,0,0.45)]',
      windowFocused:
        'border-white/25 ring-1 ring-[#f052b4]/28 ' +
        'shadow-[0_28px_65px_-18px_rgba(0,0,0,0.78),0_3px_10px_-4px_rgba(0,0,0,0.55)]',
      header: 'bg-gradient-to-b from-[#f052b4]/[0.07] to-white/[0.02] border-b border-white/[0.10] text-[#f6eefa]',
      controlBtn: 'text-[#f6eefa]/75 hover:bg-white/[0.10] hover:text-white active:bg-white/[0.16]',
      controlMinimizeMax: 'text-[#f6eefa]/75',
      controlClose: 'text-[#f6eefa]/75 hover:bg-rose-500/20 hover:text-rose-300 active:bg-rose-500/32',
      content: 'text-[#f6eefa] font-sans',
      statusBar: 'bg-black/25 border-t border-white/[0.10] text-[#f6eefa]/70',
    },
    surfaceTint: {
      panel:
        'bg-gradient-to-b from-[#241030]/62 to-[#0b0410]/44 backdrop-blur-3xl backdrop-saturate-150 ' +
        'border border-white/[0.14] ' +
        'shadow-[0_16px_40px_-14px_rgba(0,0,0,0.58),0_1px_3px_-1px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.09)]',
      card: 'bg-white/[0.07] border border-white/[0.10]',
      cardHover: 'hover:bg-white/[0.13] hover:border-white/20',
      text: 'text-[#f6eefa]',
      textMuted: 'text-[#f6eefa]/72',
      textSubtle: 'text-[#f6eefa]/50',
      placeholder: 'placeholder:text-[#f6eefa]/50',
      scrim: 'bg-[#100518]/45 backdrop-blur-3xl backdrop-saturate-150',
      tile: 'bg-white/[0.08] border border-white/[0.12] shadow-[0_6px_16px_-10px_rgba(0,0,0,0.55)]',
      tileHover: 'group-hover:bg-white/[0.15] group-hover:border-white/25',
    },
  },
  {
    id: 'halo-light',
    name: 'Halo Light',
    family: 'light',
    description: 'The default. Soft daylight, warm neutral surfaces, periwinkle accent.',
    accent: '#6d5efc',
    wallpaper: 'halo-day',
    swatch: 'bg-gradient-to-br from-[#fdfcff] via-[#ece9fb] to-[#cfd6f7]',
    chrome: {
      // Windows hold content, so they stay more solid than the dock — but the
      // header and status bar are chrome, and those go properly glassy.
      window:
        'bg-white/78 backdrop-blur-3xl backdrop-saturate-150 border-[#141020]/[0.12] text-[#141020] ' +
        'shadow-[0_24px_58px_-18px_rgba(20,16,32,0.34),0_3px_10px_-4px_rgba(20,16,32,0.16)]',
      windowFocused:
        'border-[#141020]/[0.18] ring-1 ring-[#6d5efc]/25 ' +
        'shadow-[0_32px_70px_-18px_rgba(20,16,32,0.42),0_4px_12px_-4px_rgba(20,16,32,0.20)]',
      header: 'bg-gradient-to-b from-white/55 to-white/25 border-b border-[#141020]/[0.08] text-[#141020]',
      controlBtn: 'text-[#141020]/75 hover:bg-white/60 hover:text-[#141020] active:bg-white/80',
      controlMinimizeMax: 'text-[#141020]/75',
      controlClose: 'text-[#141020]/75 hover:bg-rose-500/15 hover:text-rose-600 active:bg-rose-500/25',
      content: 'text-[#141020] font-sans',
      statusBar: 'bg-white/35 border-t border-[#141020]/[0.08] text-[#141020]/70',
    },
  },
  {
    id: 'halo-dark',
    name: 'Halo Dark',
    family: 'dark',
    description: 'The default dark. Deep indigo night, lit edges, periwinkle accent.',
    accent: '#8b7cff',
    wallpaper: 'halo-night',
    swatch: 'bg-gradient-to-br from-[#2b2450] via-[#171334] to-[#0a0818]',
    chrome: {
      window:
        'bg-[#15122a]/80 backdrop-blur-3xl backdrop-saturate-150 border-white/[0.14] text-[#f6f4fc] ' +
        'shadow-[0_22px_55px_-18px_rgba(0,0,0,0.6),0_2px_8px_-4px_rgba(0,0,0,0.4)]',
      windowFocused:
        'border-white/25 ring-1 ring-[#8b7cff]/28 ' +
        'shadow-[0_28px_65px_-18px_rgba(0,0,0,0.7),0_3px_10px_-4px_rgba(0,0,0,0.5)]',
      header: 'bg-gradient-to-b from-white/[0.07] to-white/[0.02] border-b border-white/[0.10] text-[#f6f4fc]',
      controlBtn: 'text-[#f6f4fc]/75 hover:bg-white/[0.10] hover:text-white active:bg-white/[0.16]',
      controlMinimizeMax: 'text-[#f6f4fc]/75',
      controlClose: 'text-[#f6f4fc]/75 hover:bg-rose-500/20 hover:text-rose-300 active:bg-rose-500/32',
      content: 'text-[#f6f4fc] font-sans',
      statusBar: 'bg-black/20 border-t border-white/[0.10] text-[#f6f4fc]/70',
    },
  },
  {
    id: 'classic-light',
    name: 'Classic Light',
    family: 'light',
    description: 'The original violet-tinted light desktop.',
    accent: '#8b5cf6',
    wallpaper: 'wave-default',
    swatch: 'bg-gradient-to-br from-[#f4ebfc] via-[#e9defa] to-[#d9c9f5]',
    chrome: {
      window: 'bg-[#f4ebfced] backdrop-blur-3xl border-white/55 text-[#211625] shadow-[#211625]/5',
      windowFocused: 'border-white/95 ring-2 ring-[#7c3aed]/15 shadow-[#211625]/15',
      header: 'bg-white/40 border-b border-[#211625]/10 text-[#211625]',
      controlBtn: 'text-[#211625] hover:bg-black/5 active:bg-black/10',
      controlMinimizeMax: 'text-[#211625]',
      controlClose: 'text-[#211625] hover:bg-rose-500/10 hover:text-rose-600 active:bg-rose-500/20',
      content: 'text-[#211625] font-sans',
      statusBar: 'bg-white/35 border-t border-[#211625]/10 text-[#211625]/80',
    },
  },
  {
    id: 'paper-light',
    name: 'Paper',
    family: 'light',
    description: 'Warm neutral, no colour cast — easy on the eyes for long reading.',
    accent: '#a16207',
    wallpaper: 'linen',
    swatch: 'bg-gradient-to-br from-[#faf7f2] via-[#f0e9dd] to-[#ddd2be]',
    chrome: {
      window: 'bg-[#faf7f2ed] backdrop-blur-3xl border-[#e7ddcc] text-[#2b2419] shadow-[#2b2419]/5',
      windowFocused: 'border-[#d6c8ad] ring-2 ring-[#a16207]/15 shadow-[#2b2419]/15',
      header: 'bg-[#f2ece0]/70 border-b border-[#2b2419]/10 text-[#2b2419]',
      controlBtn: 'text-[#2b2419] hover:bg-[#2b2419]/5 active:bg-[#2b2419]/10',
      controlMinimizeMax: 'text-[#2b2419]',
      controlClose: 'text-[#2b2419] hover:bg-rose-500/10 hover:text-rose-700 active:bg-rose-500/20',
      content: 'text-[#2b2419] font-sans',
      statusBar: 'bg-[#f2ece0]/60 border-t border-[#2b2419]/10 text-[#2b2419]/75',
    },
  },
  {
    id: 'ocean-light',
    name: 'Ocean',
    family: 'light',
    description: 'Cool blue light theme with a crisp, high-contrast frame.',
    accent: '#0284c7',
    swatch: 'bg-gradient-to-br from-[#eff8ff] via-[#dbeefe] to-[#bcdcf7]',
    wallpaper: 'mint-fog',
    chrome: {
      window: 'bg-[#f2f9ffed] backdrop-blur-3xl border-white/70 text-[#0f2233] shadow-[#0f2233]/5',
      windowFocused: 'border-[#bae0fd] ring-2 ring-[#0284c7]/20 shadow-[#0f2233]/15',
      header: 'bg-[#e3f2fd]/70 border-b border-[#0f2233]/10 text-[#0f2233]',
      controlBtn: 'text-[#0f2233] hover:bg-[#0284c7]/8 active:bg-[#0284c7]/15',
      controlMinimizeMax: 'text-[#0f2233]',
      controlClose: 'text-[#0f2233] hover:bg-rose-500/10 hover:text-rose-600 active:bg-rose-500/20',
      content: 'text-[#0f2233] font-sans',
      statusBar: 'bg-[#e3f2fd]/60 border-t border-[#0f2233]/10 text-[#0f2233]/75',
    },
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    family: 'dark',
    description: 'The original violet dark desktop.',
    accent: '#a855f7',
    wallpaper: 'deep-space',
    swatch: 'bg-gradient-to-br from-[#2a1f45] via-[#181030] to-[#0c0a15]',
    chrome: {
      window: 'bg-[#140f22ee] backdrop-blur-3xl border-white/10 text-[#f3eef8] shadow-black/40',
      windowFocused: 'border-white/30 ring-2 ring-[#a855f7]/25 shadow-black/60',
      header: 'bg-black/35 border-b border-white/10 text-[#f3eef8]',
      controlBtn: 'text-[#f3eef8] hover:bg-white/5 active:bg-white/10',
      controlMinimizeMax: 'text-[#f3eef8]',
      controlClose: 'text-[#f3eef8] hover:bg-rose-500/15 hover:text-rose-400 active:bg-rose-500/30',
      content: 'text-[#f3eef8] font-sans',
      statusBar: 'bg-black/35 border-t border-white/10 text-white/70',
    },
  },
  {
    id: 'midnight-dark',
    name: 'Midnight',
    family: 'dark',
    description: 'Deep navy with a cool blue cast.',
    accent: '#3b82f6',
    wallpaper: 'midnight-aurora',
    swatch: 'bg-gradient-to-br from-[#1e3a5f] via-[#12203a] to-[#060d1a]',
    chrome: {
      window: 'bg-[#0b162bee] backdrop-blur-3xl border-sky-300/12 text-[#e6eeff] shadow-black/50',
      windowFocused: 'border-sky-300/30 ring-2 ring-[#3b82f6]/25 shadow-black/70',
      header: 'bg-[#050b18]/55 border-b border-sky-300/10 text-[#e6eeff]',
      controlBtn: 'text-[#e6eeff] hover:bg-sky-300/8 active:bg-sky-300/15',
      controlMinimizeMax: 'text-[#e6eeff]',
      controlClose: 'text-[#e6eeff] hover:bg-rose-500/15 hover:text-rose-400 active:bg-rose-500/30',
      content: 'text-[#e6eeff] font-sans',
      statusBar: 'bg-[#050b18]/55 border-t border-sky-300/10 text-[#e6eeff]/70',
    },
  },
  {
    id: 'carbon-dark',
    name: 'Carbon',
    family: 'dark',
    description: 'Neutral graphite with no colour cast, so content keeps its own colours.',
    accent: '#71717a',
    wallpaper: 'carbon-weave',
    swatch: 'bg-gradient-to-br from-[#3f3f46] via-[#27272a] to-[#101014]',
    chrome: {
      window: 'bg-[#18181bee] backdrop-blur-3xl border-white/10 text-[#e4e4e7] shadow-black/50',
      windowFocused: 'border-white/25 ring-2 ring-white/10 shadow-black/70',
      header: 'bg-black/40 border-b border-white/10 text-[#e4e4e7]',
      controlBtn: 'text-[#e4e4e7] hover:bg-white/6 active:bg-white/12',
      controlMinimizeMax: 'text-[#e4e4e7]',
      controlClose: 'text-[#e4e4e7] hover:bg-rose-500/15 hover:text-rose-400 active:bg-rose-500/30',
      content: 'text-[#e4e4e7] font-sans',
      statusBar: 'bg-black/40 border-t border-white/10 text-[#e4e4e7]/70',
    },
  },
  {
    id: 'ember-dark',
    name: 'Ember',
    family: 'dark',
    description: 'Warm dark with amber highlights.',
    accent: '#f97316',
    wallpaper: 'ember-glow',
    swatch: 'bg-gradient-to-br from-[#4a2410] via-[#2a150b] to-[#140d0a]',
    chrome: {
      window: 'bg-[#1a110cee] backdrop-blur-3xl border-amber-200/12 text-[#f8ecdf] shadow-black/50',
      windowFocused: 'border-amber-200/30 ring-2 ring-[#f97316]/25 shadow-black/70',
      header: 'bg-[#0f0906]/55 border-b border-amber-200/10 text-[#f8ecdf]',
      controlBtn: 'text-[#f8ecdf] hover:bg-amber-300/8 active:bg-amber-300/15',
      controlMinimizeMax: 'text-[#f8ecdf]',
      controlClose: 'text-[#f8ecdf] hover:bg-rose-500/15 hover:text-rose-400 active:bg-rose-500/30',
      content: 'text-[#f8ecdf] font-sans',
      statusBar: 'bg-[#0f0906]/55 border-t border-amber-200/10 text-[#f8ecdf]/70',
    },
  },
  {
    id: 'oled-black',
    name: 'OLED Black',
    family: 'dark',
    description: 'True black with high contrast — the darkest option.',
    accent: '#22d3ee',
    wallpaper: 'abyss',
    swatch: 'bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-black',
    chrome: {
      window: 'bg-black/95 backdrop-blur-3xl border-white/15 text-white shadow-black/80',
      windowFocused: 'border-white/40 ring-2 ring-[#22d3ee]/25 shadow-black',
      header: 'bg-black/80 border-b border-white/15 text-white',
      controlBtn: 'text-white hover:bg-white/10 active:bg-white/20',
      controlMinimizeMax: 'text-white',
      controlClose: 'text-white hover:bg-rose-500/20 hover:text-rose-400 active:bg-rose-500/35',
      content: 'text-white font-sans',
      statusBar: 'bg-black/80 border-t border-white/15 text-white/70',
    },
  },
  {
    id: 'retro-terminal',
    name: 'Retro Terminal',
    family: 'terminal',
    description: 'Green phosphor, monospaced throughout.',
    accent: '#22c55e',
    wallpaper: 'matrix-green',
    swatch: 'bg-black border border-green-500/40',
    chrome: {
      window: 'bg-[#030704f5] backdrop-blur-2xl border-green-500/30 text-[#22c55e] shadow-green-900/10',
      windowFocused: 'border-green-400 ring-2 ring-green-500/20 shadow-green-900/25',
      header: 'bg-black/50 border-b border-green-500/25 text-[#22c55e] font-mono',
      controlBtn: 'text-[#22c55e] hover:bg-green-500/10 active:bg-green-500/20',
      controlMinimizeMax: 'text-[#22c55e]',
      controlClose: 'text-[#22c55e] hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30',
      content: 'text-[#22c55e] font-mono',
      statusBar: 'bg-black/45 border-t border-green-500/25 text-[#22c55e]/80 font-mono',
    },
  },
  {
    id: 'amber-terminal',
    name: 'Amber Terminal',
    family: 'terminal',
    description: 'The other classic phosphor: amber on black, monospaced.',
    accent: '#f59e0b',
    wallpaper: 'solar-flare',
    swatch: 'bg-black border border-amber-500/40',
    chrome: {
      window: 'bg-[#0a0603f5] backdrop-blur-2xl border-amber-500/30 text-[#fbbf24] shadow-amber-900/10',
      windowFocused: 'border-amber-400 ring-2 ring-amber-500/20 shadow-amber-900/25',
      header: 'bg-black/50 border-b border-amber-500/25 text-[#fbbf24] font-mono',
      controlBtn: 'text-[#fbbf24] hover:bg-amber-500/10 active:bg-amber-500/20',
      controlMinimizeMax: 'text-[#fbbf24]',
      controlClose: 'text-[#fbbf24] hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30',
      content: 'text-[#fbbf24] font-mono',
      statusBar: 'bg-black/45 border-t border-amber-500/25 text-[#fbbf24]/80 font-mono',
    },
  },
] as const satisfies readonly ThemeDefinition[];

export type ThemeId = (typeof THEMES)[number]['id'];

/**
 * A catalogue entry with its literal types intact.
 *
 * Distinct from `ThemeDefinition`, which is the shape an entry must satisfy:
 * widening to that would turn `wallpaper` back into `string` and lose the
 * guarantee that every theme names a wallpaper that actually exists.
 */
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME_ID: ThemeId = 'nova-light';

/** The dark counterpart of the default, for the global Light/Dark control. */
export const DEFAULT_DARK_THEME_ID: ThemeId = 'nova-dark';

/**
 * The three themes that existed before this catalogue.
 *
 * Surfaces that still carry their own class map keyed by those ids render a new
 * theme using its family's original palette rather than silently falling back
 * to light. New themes therefore show their own character in the window chrome,
 * menus, accent and wallpaper, and inherit their family's look inside
 * applications that have not been given a full palette of their own.
 */
export const FAMILY_BASE_THEME: Record<ThemeFamily, ThemeId> = {
  light: 'classic-light',
  dark: 'modern-dark',
  terminal: 'retro-terminal',
};

/**
 * Which theme the global Light/Dark control selects.
 *
 * Switching sides keeps you within the same design where one exists — Halo
 * Light ↔ Halo Dark, Paper ↔ Ember — rather than dropping you into an
 * unrelated theme.
 */
export const THEME_COUNTERPART: Partial<Record<string, ThemeId>> = {
  'nova-light': 'nova-dark',
  'nova-dark': 'nova-light',
  'halo-light': 'halo-dark',
  'halo-dark': 'halo-light',
  'classic-light': 'modern-dark',
  'modern-dark': 'classic-light',
  'paper-light': 'ember-dark',
  'ember-dark': 'paper-light',
  'ocean-light': 'midnight-dark',
  'midnight-dark': 'ocean-light',
  'carbon-dark': 'paper-light',
  'oled-black': 'nova-light',
  'retro-terminal': 'amber-terminal',
  'amber-terminal': 'retro-terminal',
};

/**
 * The theme to move to when the user picks Light or Dark globally.
 *
 * Staying put when already on the requested side matters: someone on Carbon who
 * clicks "Dark" should keep Carbon, not be thrown to the default.
 */
export function themeForMode(current: string | undefined, mode: 'light' | 'dark'): ThemeId {
  const family = themeFamily(current);
  const alreadyThere = mode === 'dark' ? family !== 'light' : family === 'light';
  if (alreadyThere) return themeById(current).id;

  const counterpart = THEME_COUNTERPART[themeById(current).id];
  if (counterpart && (themeFamily(counterpart) === 'light') === (mode === 'light')) {
    return counterpart;
  }
  return mode === 'dark' ? DEFAULT_DARK_THEME_ID : DEFAULT_THEME_ID;
}

const BY_ID = new Map<string, Theme>(THEMES.map((theme) => [theme.id, theme]));

/** The definition for a theme id, falling back to the default for unknown ids. */
export function themeById(id: string | undefined): Theme {
  return BY_ID.get(id ?? '') ?? BY_ID.get(DEFAULT_THEME_ID)!;
}

export function themeFamily(id: string | undefined): ThemeFamily {
  return themeById(id).family;
}

/**
 * True when the desktop is showing a dark palette.
 *
 * Terminal themes count as dark: they are black backgrounds, and an application
 * following the desktop must not answer "light" and paint white panels inside
 * a black window.
 */
export function globalThemeIsDark(id: string | undefined): boolean {
  return themeFamily(id) !== 'light';
}

/** The chrome class set for a theme. */
export function themeChrome(id: string | undefined): ThemeChrome {
  return themeById(id).chrome;
}

/**
 * The surface treatment for a theme: dock, popups, menus, notification centre.
 *
 * Every shell surface goes through here, which is what keeps them consistent
 * with each other and with the window chrome.
 */
export function themeSurfaces(id: string | undefined): ThemeSurfaces {
  const theme = themeById(id);
  return {
    ...SURFACES[theme.family],
    // A theme may restate the colour of a surface, never its behaviour.
    ...('surfaceTint' in theme ? (theme.surfaceTint as Partial<ThemeSurfaces>) : {}),
    accent: theme.accent,
  };
}

/**
 * Maps any theme onto the original three ids, for surfaces still keyed by them.
 * Prefer reading `themeChrome` or `themeFamily` in new code.
 */
export function baseThemeFor(id: string | undefined): ThemeId {
  return FAMILY_BASE_THEME[themeFamily(id)];
}

/** Themes grouped for display, in catalogue order. */
export function themesByFamily(): { family: ThemeFamily; label: string; themes: Theme[] }[] {
  const labels: Record<ThemeFamily, string> = {
    light: 'Light',
    dark: 'Dark',
    terminal: 'Terminal',
  };
  return (['light', 'dark', 'terminal'] as const).map((family) => ({
    family,
    label: labels[family],
    themes: THEMES.filter((theme) => theme.family === family),
  }));
}
