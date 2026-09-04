import { useEffect, useState } from 'react';

/**
 * Whether the current input can hover — a real mouse/trackpad, not a
 * touchscreen. A control revealed only via `group-hover` has no equivalent
 * gesture on a touch device: there is no persistent hover state to trigger
 * it, so gating a control purely on hover makes it permanently unreachable
 * by tap rather than merely less discoverable.
 *
 * Kept live via a `matchMedia` listener rather than read once, so a device
 * with both a touchscreen and a mouse still gets hover affordances back the
 * moment a mouse is actually used — browsers flip `(hover: hover)` live when
 * the active input device changes.
 */
export function useSupportsHover(): boolean {
  const [supportsHover, setSupportsHover] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
      : true
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onChange = () => setSupportsHover(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return supportsHover;
}

export default useSupportsHover;
