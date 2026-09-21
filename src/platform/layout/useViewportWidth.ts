import { useEffect, useState } from 'react';

/** The real browser viewport width, kept live — for phone/tablet vs desktop decisions that a window's own width can't answer. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}
