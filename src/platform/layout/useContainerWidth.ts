import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * The width of an application's own root element, kept live.
 *
 * **Applications must lay out against this, not against Tailwind's `sm:` /
 * `md:` prefixes.** Those prefixes respond to the *browser viewport*, which in
 * this platform is the whole desktop — an application in a 400px window on a
 * 1400px screen still matches `md:`, so it happily renders a two-column grid
 * into a pane too narrow to hold it and the columns overlap.
 *
 * A window can be resized to any width independently of the viewport, so the
 * only correct source is the element itself.
 *
 * ```tsx
 * const { ref, width, isCompact } = useContainerWidth(720);
 * return <div ref={ref}>{isCompact ? <Stacked /> : <SideBySide />}</div>;
 * ```
 *
 * The initial value is a guess made before the first measurement lands. It is
 * deliberately wide: a pane that starts wide and snaps narrow is a single
 * reflow, whereas starting narrow makes every window flash its compact layout
 * on open.
 */
export interface ContainerWidth<T extends HTMLElement = HTMLDivElement> {
  ref: RefObject<T | null>;
  width: number;
  /** True once the element is narrower than `compactBelow`. */
  isCompact: boolean;
  /** False until a real measurement has arrived. */
  measured: boolean;
}

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(
  compactBelow: number,
  initialWidth = 960
): ContainerWidth<T> {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(initialWidth);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
        setMeasured(true);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width, isCompact: width < compactBelow, measured };
}

export default useContainerWidth;
