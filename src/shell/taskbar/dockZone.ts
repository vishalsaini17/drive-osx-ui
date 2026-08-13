import { create } from 'zustand';

/**
 * The strip of screen along the bottom edge that the dock occupies.
 *
 * The dock hides itself whenever a window reaches into this strip — that is
 * what makes a maximized application appear to have the screen to itself — and
 * reveals itself again while the cursor is at the very bottom edge. Both the
 * dock and the window manager have to agree on where the strip starts, so the
 * measurement lives here rather than being restated at each call site.
 */
export function dockZoneHeight(dockSize: string | undefined): number {
  if (dockSize === 'sm') return 60;
  if (dockSize === 'lg') return 95;
  return 82;
}

/** Whether a window whose bottom edge is at `windowBottom` reaches the dock. */
export function coversDockZone(
  windowBottom: number,
  dockSize: string | undefined,
  viewportHeight: number
): boolean {
  return windowBottom > viewportHeight - dockZoneHeight(dockSize);
}

interface DockZoneState {
  /**
   * The window currently being dragged or resized, and whether it covers the
   * dock's strip as of the last frame.
   *
   * A gesture deliberately does not reach the system store until the pointer
   * is released, so nothing reading `windows` can tell where a window is
   * mid-drag. Rather than reintroduce a store write per frame, the window
   * manager publishes the one fact the dock needs about it. The id matters as
   * much as the flag: the dock must use this *instead of* the stored position
   * of that window, otherwise dragging a window up and out of the dock's strip
   * would leave the dock hidden until the pointer was released.
   */
  gestureWindowId: string | null;
  gestureCoversDock: boolean;
  reportGesture: (id: string, coversDock: boolean) => void;
  /** Hands control back to committed geometry once the gesture is over. */
  endGesture: (id: string) => void;
}

export const useDockZoneStore = create<DockZoneState>((set) => ({
  gestureWindowId: null,
  gestureCoversDock: false,

  // Returning the current state unchanged makes this a no-op in Zustand: no
  // listener is called. A drag can therefore report its position on every
  // frame and only cost a render on the frame it crosses the line.
  reportGesture: (id, coversDock) =>
    set((state) =>
      state.gestureWindowId === id && state.gestureCoversDock === coversDock
        ? state
        : { gestureWindowId: id, gestureCoversDock: coversDock }
    ),

  // Guarded by id so a window unmounting long after its own gesture ended
  // cannot cancel someone else's.
  endGesture: (id) =>
    set((state) =>
      state.gestureWindowId === id ? { gestureWindowId: null, gestureCoversDock: false } : state
    ),
}));
