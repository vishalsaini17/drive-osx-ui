import React from 'react';
import { PageSetup, mmToPx } from '../../../platform/documents/book/pageSetup';

interface PageRulerProps {
  pageSetup: PageSetup;
  zoom: number;
}

const MM_PER_INCH = 25.4;

/**
 * A static (non-draggable) horizontal ruler shown above the page, matching
 * its width and margins — View > Show ruler. Google Docs' ruler also lets
 * you drag margin/indent markers directly; that needs a live link back into
 * the pagination engine's margin state (PageSetupModal already owns that
 * round-trip) which is a separate, larger feature — this one is read-only,
 * matching what a fresh "just show me the ruler" request needs.
 */
export default function PageRuler({ pageSetup, zoom }: PageRulerProps) {
  const pageWidthPx = mmToPx(pageSetup.widthMm) * zoom;
  const marginLeftPx = mmToPx(pageSetup.marginLeftMm) * zoom;
  const marginRightPx = mmToPx(pageSetup.marginRightMm) * zoom;
  const widthInches = pageSetup.widthMm / MM_PER_INCH;

  const halfInchCount = Math.floor(widthInches * 2);
  const ticks = Array.from({ length: halfInchCount + 1 }, (_, i) => {
    const inches = i / 2;
    return {
      leftPx: mmToPx(inches * MM_PER_INCH) * zoom,
      major: Number.isInteger(inches),
      label: Number.isInteger(inches) && inches > 0 ? String(inches) : null,
    };
  });

  return (
    <div
      className="relative h-5 mb-1 bg-white border border-black/10 shadow-[0_1px_3px_rgba(0,0,0,0.08)] select-none shrink-0"
      style={{ width: pageWidthPx }}
      aria-hidden="true"
    >
      {/* Non-printable margin area, shaded like Docs' ruler. */}
      <div className="absolute inset-y-0 left-0 bg-zinc-200/70" style={{ width: marginLeftPx }} />
      <div className="absolute inset-y-0 right-0 bg-zinc-200/70" style={{ width: marginRightPx }} />
      {ticks.map((t, i) => (
        <div key={i} className="absolute bottom-0 bg-zinc-400" style={{ left: t.leftPx, width: 1, height: t.major ? 10 : 5 }} />
      ))}
      {ticks.map(
        (t, i) =>
          t.label && (
            <span key={i} className="absolute top-0 leading-none text-[9px] text-zinc-500" style={{ left: t.leftPx + 2 }}>
              {t.label}
            </span>
          )
      )}
    </div>
  );
}
