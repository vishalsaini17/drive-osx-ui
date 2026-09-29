import { PageSize, PresentationDeck, Slide } from './types';

const PAGE_SIZES: PageSize[] = ['4:3', '16:9', '16:10'];

/** Numeric width/height ratio for `SlideCanvas`'s `aspectRatio` style. */
export function aspectRatioFor(pageSize: PageSize): number {
  switch (pageSize) {
    case '4:3':
      return 4 / 3;
    case '16:10':
      return 16 / 10;
    case '16:9':
    default:
      return 16 / 9;
  }
}

/** The preset whose ratio is closest to an arbitrary width/height — used by
 * the `.pptx` importer, whose source file rarely matches one of these three
 * exactly (Google Slides' "Widescreen" is 10in x 5.63in, not exactly 16:9),
 * so the deck opens at the closest supported page size rather than always
 * defaulting to 16:9 regardless of the original. */
export function nearestPageSize(width: number, height: number): PageSize {
  if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) return '16:9';
  const ratio = width / height;
  return PAGE_SIZES.reduce((best, candidate) =>
    Math.abs(aspectRatioFor(candidate) - ratio) < Math.abs(aspectRatioFor(best) - ratio) ? candidate : best
  );
}

/**
 * The native `.deck` presentation format — a `PresentationDeck` serialized
 * directly as JSON. Saved through the existing `FileService` as a text file
 * (`PRESENTATION_MIME_TYPE`, `PRESENTATION_EXTENSION`), same mechanism as
 * Word Book's `.book` files — no new storage mechanism.
 *
 * Real PowerPoint (.ppt/.pptx) files can be exported to from a deck
 * (`pptxgenjs`, see index.tsx), but reading arbitrary binary .pptx content
 * back in is not supported — there is no .pptx parser in this codebase yet.
 */
export const PRESENTATION_MIME_TYPE = 'application/vnd.driveosx.presentation+json';
export const PRESENTATION_EXTENSION = '.deck';

export function serializePresentationFile(deck: PresentationDeck): string {
  return JSON.stringify(deck, null, 2);
}

// Mirrors `isBookFileName` (platform/documents/book/bookFormat.ts) — used by
// the Open Presentation modal to list every file worth offering: this app's
// own native format plus real PowerPoint files (which open with the same
// "not supported yet" message a `.deck` gets if it isn't actually one).
export function isPresentationFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(PRESENTATION_EXTENSION) || lower.endsWith('.ppt') || lower.endsWith('.pptx');
}

// Every place that renders a `Slide` (SlideCanvas, the thumbnail rail, the
// comments counter in the toolbar, PDF/PPTX export) indexes straight into
// `elements`/`comments`/`layout`/etc. without an existence check, and this
// app has no error boundary anywhere above it — so a deck saved by an older
// version of this format (e.g. from before slide comments existed) throws
// mid-render on import and takes the whole window down with it, silently,
// rather than showing the "couldn't open" banner. Backfilling safe defaults
// here, for both the deck and each slide, keeps opening an older or
// hand-edited `.deck` file safe even though its exact shape was never
// validated beyond "has a non-empty `slides` array".
function normalizeSlide(raw: unknown, index: number): Slide {
  const s = (raw ?? {}) as Partial<Slide>;
  return {
    id: typeof s.id === 'string' ? s.id : `slide_${Date.now()}_${index}`,
    title: typeof s.title === 'string' ? s.title : `Slide ${index + 1}`,
    layout: s.layout ?? 'blank',
    bgColor: typeof s.bgColor === 'string' ? s.bgColor : '#ffffff',
    transition: s.transition ?? 'fade',
    notes: typeof s.notes === 'string' ? s.notes : '',
    elements: Array.isArray(s.elements) ? s.elements : [],
    comments: Array.isArray(s.comments) ? s.comments : [],
  };
}

export function parsePresentationFile(content: string): PresentationDeck {
  const parsed = JSON.parse(content);
  if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error('Not a valid Drive OSX presentation file.');
  }
  return {
    id: typeof parsed.id === 'string' ? parsed.id : `deck_${Date.now()}`,
    title: typeof parsed.title === 'string' ? parsed.title : 'Untitled Presentation',
    theme: parsed.theme ?? 'clean-light',
    pageSize: PAGE_SIZES.includes(parsed.pageSize) ? parsed.pageSize : '16:9',
    slides: parsed.slides.map((slide: unknown, index: number) => normalizeSlide(slide, index)),
  };
}

export function blankPresentationDeck(title = 'Untitled Presentation'): PresentationDeck {
  const now = Date.now();
  return {
    id: 'deck_' + now,
    title,
    theme: 'clean-light',
    pageSize: '16:9',
    slides: [
      {
        id: 'slide_' + now,
        title: 'Slide 1',
        layout: 'title',
        bgColor: '#ffffff',
        transition: 'fade',
        notes: '',
        elements: [
          {
            id: 'el_title_' + now,
            type: 'text',
            x: 10,
            y: 38,
            width: 80,
            height: 18,
            zIndex: 1,
            content: title,
            fontSize: 36,
            fontWeight: 'black',
            color: '#0f172a',
            align: 'center',
          },
          {
            id: 'el_sub_' + now,
            type: 'text',
            x: 20,
            y: 58,
            width: 60,
            height: 10,
            zIndex: 2,
            content: 'Click to add a subtitle',
            fontSize: 18,
            fontWeight: 'normal',
            color: '#64748b',
            align: 'center',
          },
        ],
        comments: [],
      },
    ],
  };
}
