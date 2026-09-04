import { useCallback, useRef } from 'react';

/**
 * A right-click-only context menu has no touch equivalent — a touchscreen's
 * synthesized `contextmenu` event from a long-press is inconsistent across
 * mobile browsers (notably unreliable on iOS Safari for a plain `<div>`).
 * This gives any element already wired to `onContextMenu={handler}` the same
 * menu on a deliberate touch hold, by calling that exact handler — a
 * `React.PointerEvent` has the same `clientX`/`clientY`/`preventDefault`/
 * `stopPropagation` shape every context-menu handler in this codebase
 * already reads off a `React.MouseEvent`.
 *
 * React 19 does not pool synthetic events, so holding on to `e` past the
 * `setTimeout` boundary and reading it later is safe.
 *
 * Not for file/list rows, which already spend a long-press entering
 * multi-select (`file-explorer/index.tsx`) — the same gesture can't mean two
 * different things on the same element.
 */
export function useLongPressContextMenu<T extends Element>(
  handler: (e: React.PointerEvent<T>) => void,
  delay = 500
) {
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<T>) => {
      if (e.pointerType !== 'touch') return;
      firedRef.current = false;
      cancel();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        firedRef.current = true;
        navigator.vibrate?.(10);
        handler(e);
      }, delay);
    },
    [cancel, handler]
  );

  // Swallows the click/tap that follows a touch release after the long-press
  // already fired, so the tap doesn't also trigger the element's own onClick.
  const onClickCapture = useCallback((e: React.MouseEvent<T>) => {
    if (firedRef.current) {
      firedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    onPointerDown,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClickCapture,
  };
}

export default useLongPressContextMenu;
