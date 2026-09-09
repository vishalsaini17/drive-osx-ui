/**
 * Sticky notes, highlight/underline/strikeout rects, and freehand drawing
 * points are stored as percentages of the page container — but that
 * container's own orientation changes when the page is rotated (pdf.js
 * re-renders the canvas itself rotated, it isn't a CSS transform we can ride
 * along with). So annotations are normalized to this page's unrotated (0°)
 * frame before being stored, and rotated back out to whatever the current
 * view rotation is when displayed — otherwise a highlight added at 90° would
 * drift to the wrong spot the moment you rotated back to 0°.
 */

type NormalizedRotation = 0 | 90 | 180 | 270;

function normalizeRotation(rotation: number): NormalizedRotation {
  const r = ((rotation % 360) + 360) % 360;
  return (r === 90 || r === 180 || r === 270 ? r : 0) as NormalizedRotation;
}

/** Rotates a single normalized (0–1) point by `rotation` degrees clockwise. */
function rotatePoint01(x: number, y: number, rotation: NormalizedRotation): [number, number] {
  switch (rotation) {
    case 90:
      return [1 - y, x];
    case 180:
      return [1 - x, 1 - y];
    case 270:
      return [y, 1 - x];
    default:
      return [x, y];
  }
}

/** Rotates a single {x,y} point (percentages) by `rotation` degrees clockwise. */
export function rotatePointPct(point: { x: number; y: number }, rotation: number): { x: number; y: number } {
  const [x, y] = rotatePoint01(point.x / 100, point.y / 100, normalizeRotation(rotation));
  return { x: x * 100, y: y * 100 };
}

/** Rotates an {x,y,width,height} rect (percentages) by `rotation` degrees clockwise. */
export function rotateRectPct(
  rect: { x: number; y: number; width: number; height: number },
  rotation: number
): { x: number; y: number; width: number; height: number } {
  const r = normalizeRotation(rotation);
  const x0 = rect.x / 100;
  const y0 = rect.y / 100;
  const x1 = (rect.x + rect.width) / 100;
  const y1 = (rect.y + rect.height) / 100;
  const corners = [rotatePoint01(x0, y0, r), rotatePoint01(x1, y0, r), rotatePoint01(x0, y1, r), rotatePoint01(x1, y1, r)];
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { x: left * 100, y: top * 100, width: (Math.max(...xs) - left) * 100, height: (Math.max(...ys) - top) * 100 };
}

/** The inverse rotation — rotating by this undoes a rotation by `rotation`. */
export function inverseRotation(rotation: number): number {
  return (360 - normalizeRotation(rotation)) % 360;
}
