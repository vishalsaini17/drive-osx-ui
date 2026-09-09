import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { PDFDocumentProxy } from '../lib/pdfjs';

interface PageThumbnailProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  width?: number;
}

/** Small lazily-rendered page thumbnail for the sidebar's Pages tab. */
export const PageThumbnail: React.FC<PageThumbnailProps> = ({ pdfDoc, pageNumber, width = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    (async () => {
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;
      const nativeViewport = page.getViewport({ scale: 1 });
      const scale = width / nativeViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      try {
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') return;
        throw err;
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, width]);

  return (
    <div className="w-full aspect-[1/1.3] bg-white rounded-lg border border-slate-700 shadow-inner flex items-center justify-center overflow-hidden">
      {!ready && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
      <canvas ref={canvasRef} className={ready ? 'w-full h-auto' : 'hidden'} />
    </div>
  );
};
