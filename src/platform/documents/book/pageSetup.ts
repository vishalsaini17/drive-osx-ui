/**
 * Page geometry shared by the editor, the pagination engine, print, and
 * export. Millimetres are the source of truth (they match how paper sizes
 * and margins are actually specified); pixels are derived at render time
 * for whatever DPI the screen/print surface is using.
 */

export type PageOrientation = 'portrait' | 'landscape';

export interface PageSetup {
  widthMm: number;
  heightMm: number;
  orientation: PageOrientation;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  /** Vertical space reserved for the header, inside the top margin. */
  headerReserveMm: number;
  /** Vertical space reserved for the footer, inside the bottom margin. */
  footerReserveMm: number;
}

/** CSS px-per-mm at 96dpi (the standard the web platform assumes for `px`). */
export const PX_PER_MM = 96 / 25.4;

export function mmToPx(mm: number): number {
  return mm * PX_PER_MM;
}

export function pxToMm(px: number): number {
  return px / PX_PER_MM;
}

const A4_PORTRAIT: PageSetup = {
  widthMm: 210,
  heightMm: 297,
  orientation: 'portrait',
  marginTopMm: 25.4,
  marginBottomMm: 25.4,
  marginLeftMm: 25.4,
  marginRightMm: 25.4,
  headerReserveMm: 12.7,
  footerReserveMm: 12.7,
};

export function a4PageSetup(orientation: PageOrientation = 'portrait'): PageSetup {
  if (orientation === 'portrait') return { ...A4_PORTRAIT };
  return {
    ...A4_PORTRAIT,
    widthMm: A4_PORTRAIT.heightMm,
    heightMm: A4_PORTRAIT.widthMm,
    orientation: 'landscape',
  };
}

/** US Letter: 8.5in × 11in. Margins match A4's (25.4mm is exactly 1in — the standard default either way). */
const LETTER_PORTRAIT: PageSetup = { ...A4_PORTRAIT, widthMm: 215.9, heightMm: 279.4 };

export function letterPageSetup(orientation: PageOrientation = 'portrait'): PageSetup {
  if (orientation === 'portrait') return { ...LETTER_PORTRAIT };
  return { ...LETTER_PORTRAIT, widthMm: LETTER_PORTRAIT.heightMm, heightMm: LETTER_PORTRAIT.widthMm, orientation: 'landscape' };
}

/** US Legal: 8.5in × 14in. */
const LEGAL_PORTRAIT: PageSetup = { ...A4_PORTRAIT, widthMm: 215.9, heightMm: 355.6 };

export function legalPageSetup(orientation: PageOrientation = 'portrait'): PageSetup {
  if (orientation === 'portrait') return { ...LEGAL_PORTRAIT };
  return { ...LEGAL_PORTRAIT, widthMm: LEGAL_PORTRAIT.heightMm, heightMm: LEGAL_PORTRAIT.widthMm, orientation: 'landscape' };
}

export type PaperSize = 'a4' | 'letter' | 'legal';

/** Identifies which of the three presets a `PageSetup`'s own dimensions (in either orientation) match, ignoring margins the user may have since customized — falls back to 'a4' for anything else (e.g. custom-sized documents from a future margin editor). */
export function paperSizeOf(setup: PageSetup): PaperSize {
  const long = Math.max(setup.widthMm, setup.heightMm);
  const short = Math.min(setup.widthMm, setup.heightMm);
  const close = (a: number, b: number) => Math.abs(a - b) < 0.5;
  if (close(short, LETTER_PORTRAIT.widthMm) && close(long, LETTER_PORTRAIT.heightMm)) return 'letter';
  if (close(short, LEGAL_PORTRAIT.widthMm) && close(long, LEGAL_PORTRAIT.heightMm)) return 'legal';
  return 'a4';
}

export function pageSetupForPaperSize(size: PaperSize, orientation: PageOrientation): PageSetup {
  if (size === 'letter') return letterPageSetup(orientation);
  if (size === 'legal') return legalPageSetup(orientation);
  return a4PageSetup(orientation);
}

export function withOrientation(setup: PageSetup, orientation: PageOrientation): PageSetup {
  if (setup.orientation === orientation) return setup;
  return { ...setup, widthMm: setup.heightMm, heightMm: setup.widthMm, orientation };
}

/** The rectangle text/content is actually allowed to occupy, in mm. */
export function contentAreaMm(setup: PageSetup): { widthMm: number; heightMm: number } {
  return {
    widthMm: setup.widthMm - setup.marginLeftMm - setup.marginRightMm,
    heightMm:
      setup.heightMm -
      setup.marginTopMm -
      setup.marginBottomMm -
      setup.headerReserveMm -
      setup.footerReserveMm,
  };
}

export function contentAreaPx(setup: PageSetup): { widthPx: number; heightPx: number } {
  const mm = contentAreaMm(setup);
  return { widthPx: mmToPx(mm.widthMm), heightPx: mmToPx(mm.heightMm) };
}
