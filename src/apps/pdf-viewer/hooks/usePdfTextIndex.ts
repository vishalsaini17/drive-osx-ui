import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, TextContent, TextItem } from '../lib/pdfjs';
import type { SearchMatch } from '../types';

export interface IndexedPage {
  content: TextContent;
  items: TextItem[];
  fullText: string;
}

const MAX_MATCHES_PER_PAGE = 25;

/**
 * Extracts each page's real text content in the background (needed for both
 * the selectable text layer and full-document search) and caches it, so a
 * page already visited doesn't get re-fetched from the pdf.js worker.
 */
export function usePdfTextIndex(pdfDoc: PDFDocumentProxy | null) {
  const [indexedCount, setIndexedCount] = useState(0);
  const cacheRef = useRef<Map<number, IndexedPage>>(new Map());
  const [, forceRerender] = useState(0);

  useEffect(() => {
    cacheRef.current = new Map();
    setIndexedCount(0);
    if (!pdfDoc) return;
    let cancelled = false;

    (async () => {
      for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
        if (cancelled) return;
        let indexed: IndexedPage;
        try {
          const page = await pdfDoc.getPage(pageNumber);
          if (cancelled) return;
          const content = await page.getTextContent();
          if (cancelled) return;
          const items = content.items.filter((it): it is TextItem => 'str' in it);
          const fullText = items.map((it) => it.str + (it.hasEOL ? '\n' : '')).join('');
          indexed = { content, items, fullText };
        } catch {
          // Skip a page pdf.js can't parse rather than aborting the whole index.
          indexed = { content: { items: [], styles: {}, lang: null }, items: [], fullText: '' };
        }
        cacheRef.current.set(pageNumber, indexed);
        setIndexedCount(pageNumber);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc]);

  /** Fetches (and caches) one page's text content on demand, for a page the background pass hasn't reached yet. */
  const ensurePageText = useCallback(
    async (pageNumber: number): Promise<IndexedPage | undefined> => {
      const cached = cacheRef.current.get(pageNumber);
      if (cached) return cached;
      if (!pdfDoc) return undefined;
      const page = await pdfDoc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter((it): it is TextItem => 'str' in it);
      const fullText = items.map((it) => it.str + (it.hasEOL ? '\n' : '')).join('');
      const indexed: IndexedPage = { content, items, fullText };
      cacheRef.current.set(pageNumber, indexed);
      forceRerender((n) => n + 1);
      return indexed;
    },
    [pdfDoc]
  );

  const getPageText = useCallback((pageNumber: number): IndexedPage | undefined => cacheRef.current.get(pageNumber), []);

  const search = useCallback((query: string): SearchMatch[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches: SearchMatch[] = [];
    cacheRef.current.forEach((page, pageNumber) => {
      const lower = page.fullText.toLowerCase();
      let fromIndex = 0;
      let matchCount = 0;
      while (matchCount < MAX_MATCHES_PER_PAGE) {
        const idx = lower.indexOf(q, fromIndex);
        if (idx === -1) break;
        const start = Math.max(0, idx - 30);
        const end = Math.min(page.fullText.length, idx + q.length + 30);
        matches.push({
          id: `sm_${pageNumber}_${idx}`,
          pageIndex: pageNumber - 1,
          snippet: page.fullText.slice(start, end).replace(/\s+/g, ' ').trim(),
          matchTerm: query,
        });
        fromIndex = idx + q.length;
        matchCount++;
      }
    });
    return matches;
  }, []);

  return {
    indexedCount,
    totalPages: pdfDoc?.numPages ?? 0,
    getPageText,
    ensurePageText,
    search,
  };
}
