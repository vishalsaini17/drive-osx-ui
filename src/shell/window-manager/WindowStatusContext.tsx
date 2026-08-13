import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Every window is framed by the same outer chrome: the title bar with the
 * window controls at the top, and a single status bar at the bottom.
 *
 * Applications must not render their own window footer. Instead they publish
 * status content into the window's status bar with <WindowStatus />, which
 * portals the content into the sections the shared status bar renders.
 */

export type StatusSection = 'left' | 'center' | 'right';

type SectionMap<T> = Record<StatusSection, T>;

interface WindowStatusContextValue {
  containers: SectionMap<HTMLElement | null>;
  setContainer: (section: StatusSection, el: HTMLElement | null) => void;
  /** True while an application publishes content into that section. */
  filled: SectionMap<boolean>;
  /** Registers a mounted slot; the returned function unregisters it. */
  registerSlot: (section: StatusSection) => () => void;
}

const WindowStatusContext = createContext<WindowStatusContextValue | null>(null);

export function useWindowStatusContext(): WindowStatusContextValue | null {
  return useContext(WindowStatusContext);
}

export function WindowStatusProvider({ children }: { children: React.ReactNode }) {
  const [containers, setContainers] = useState<SectionMap<HTMLElement | null>>({
    left: null,
    center: null,
    right: null,
  });
  const [slotCounts, setSlotCounts] = useState<SectionMap<number>>({ left: 0, center: 0, right: 0 });

  const setContainer = useCallback((section: StatusSection, el: HTMLElement | null) => {
    setContainers((prev) => (prev[section] === el ? prev : { ...prev, [section]: el }));
  }, []);

  const registerSlot = useCallback((section: StatusSection) => {
    setSlotCounts((prev) => ({ ...prev, [section]: prev[section] + 1 }));
    return () => setSlotCounts((prev) => ({ ...prev, [section]: Math.max(0, prev[section] - 1) }));
  }, []);

  const value = useMemo<WindowStatusContextValue>(
    () => ({
      containers,
      setContainer,
      registerSlot,
      filled: {
        left: slotCounts.left > 0,
        center: slotCounts.center > 0,
        right: slotCounts.right > 0,
      },
    }),
    [containers, setContainer, registerSlot, slotCounts]
  );

  return <WindowStatusContext.Provider value={value}>{children}</WindowStatusContext.Provider>;
}

function hasContent(node: React.ReactNode): boolean {
  return node !== null && node !== undefined && node !== false && node !== '';
}

interface WindowStatusSlotProps {
  section: StatusSection;
  children?: React.ReactNode;
}

/**
 * Renders its children inside one section of the window status bar.
 * Renders nothing when used outside a window.
 */
export function WindowStatusSlot({ section, children }: WindowStatusSlotProps) {
  const ctx = useWindowStatusContext();
  const registerSlot = ctx?.registerSlot;
  const isActive = hasContent(children);

  useEffect(() => {
    if (!registerSlot || !isActive) return;
    return registerSlot(section);
  }, [registerSlot, section, isActive]);

  const container = ctx?.containers[section];
  if (!container || !isActive) return null;

  return createPortal(children, container);
}

export interface WindowStatusProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/**
 * Application-supplied status content for the shared window status bar.
 * The frame size and position are always appended by the status bar itself.
 */
export default function WindowStatus({ left, center, right }: WindowStatusProps) {
  return (
    <>
      <WindowStatusSlot section="left">{left}</WindowStatusSlot>
      <WindowStatusSlot section="center">{center}</WindowStatusSlot>
      <WindowStatusSlot section="right">{right}</WindowStatusSlot>
    </>
  );
}
