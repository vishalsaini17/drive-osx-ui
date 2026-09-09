import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocument, PasswordResponses } from '../lib/pdfjs';
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from '../lib/pdfjs';

export type PdfLoadStatus = 'idle' | 'loading' | 'ready' | 'error' | 'password';

function describeLoadError(err: unknown): string {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
  if (name === 'InvalidPDFException') return 'This file isn’t a valid PDF document.';
  if (name === 'MissingPDFException') return 'The PDF file could not be found.';
  if (name === 'UnexpectedResponseException') return 'The server returned an unexpected response while fetching this file.';
  return err instanceof Error ? err.message : 'Failed to load this PDF document.';
}

/**
 * Loads a PDF document with pdf.js from raw bytes, surfacing pdf.js's own
 * password-retry flow (`loadingTask.onPassword`) instead of the fake
 * hardcoded-string check the viewer used to have.
 */
export function usePdfDocument() {
  const [status, setStatus] = useState<PdfLoadStatus>('idle');
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordAttemptFailed, setPasswordAttemptFailed] = useState(false);

  // `PDFDocumentProxy` itself has no public `destroy()` — only the loading
  // task that produced it does, and destroying that tears down the shared
  // transport/worker underneath the resolved document too.
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const passwordCallbackRef = useRef<((password: string) => void) | null>(null);

  const load = useCallback((data: ArrayBuffer) => {
    loadingTaskRef.current?.destroy().catch(() => {});
    passwordCallbackRef.current = null;

    setPdfDoc(null);
    setError(null);
    setPasswordAttemptFailed(false);
    setStatus('loading');

    const loadingTask = getDocument({ data });
    loadingTaskRef.current = loadingTask;

    loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
      if (loadingTaskRef.current !== loadingTask) return;
      passwordCallbackRef.current = updatePassword;
      setPasswordAttemptFailed(reason === PasswordResponses.INCORRECT_PASSWORD);
      setStatus('password');
    };

    loadingTask.promise.then(
      (doc) => {
        if (loadingTaskRef.current !== loadingTask) {
          loadingTask.destroy().catch(() => {});
          return;
        }
        passwordCallbackRef.current = null;
        setPdfDoc(doc);
        setStatus('ready');
      },
      (err) => {
        if (loadingTaskRef.current !== loadingTask) return;
        passwordCallbackRef.current = null;
        setStatus('error');
        setError(describeLoadError(err));
      }
    );
  }, []);

  const submitPassword = useCallback((password: string) => {
    passwordCallbackRef.current?.(password);
  }, []);

  const cancelPassword = useCallback(() => {
    loadingTaskRef.current?.destroy().catch(() => {});
    loadingTaskRef.current = null;
    passwordCallbackRef.current = null;
    setStatus('idle');
  }, []);

  useEffect(
    () => () => {
      loadingTaskRef.current?.destroy().catch(() => {});
    },
    []
  );

  return { status, pdfDoc, error, passwordAttemptFailed, load, submitPassword, cancelPassword };
}
