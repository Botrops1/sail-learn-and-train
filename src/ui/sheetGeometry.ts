/**
 * Sheet geometry (PHASE5_SPEC 3.3): the phone panel's three heights and the gestures that move it.
 * Pure: no DOM, so the tests import it.
 */
export const SHEET_HEIGHTS = ['peek', 'half', 'full'] as const;
export type SheetHeight = (typeof SHEET_HEIGHTS)[number];

/** Sheet sizes and gesture thresholds (PHASE5_SPEC 3.3). Presentation values, not boat data. */
export const SHEET = {
  /** The handle (44) and, from M27, the quick row (56). */
  peekPx: 100,
  /** Half height: this share of the view's height. */
  halfShare: 0.5,
  /** A full sheet stops this far below the top area, so the chip row (3.2) fits between them. */
  fullGapPx: 60,
  /** A pointer that moved less than this between down and up is a tap. */
  tapMaxMovePx: 8,
  /** Released faster than this (px per ms), the sheet moves one height in the drag's direction. */
  flingPxPerMs: 0.5,
  /** The release velocity is measured over the last this many ms of the drag. */
  velocityWindowMs: 100,
  /** Height animation after a release or a tap, ms (none while dragging). */
  transitionMs: 200,
  /** The chip row (3.2): 44 px chips with 8 px above and below. */
  chipRowPx: 60,
} as const;

/** The view's height and where the top area ends (the `--view-top-h` value), CSS px. */
export interface SheetSpace {
  viewHeightPx: number;
  topAreaPx: number;
}

/** The sheet's height in CSS px. */
export function sheetHeightPx(height: SheetHeight, space: SheetSpace): number {
  const half = Math.max(SHEET.peekPx, Math.round(space.viewHeightPx * SHEET.halfShare));
  if (height === 'peek') return SHEET.peekPx;
  if (height === 'half') return half;
  return Math.max(half, Math.round(space.viewHeightPx - space.topAreaPx - SHEET.fullGapPx));
}

/** One height up (+1) or down (−1), stopping at peek and full. */
export function stepSheet(height: SheetHeight, direction: 1 | -1): SheetHeight {
  const index = SHEET_HEIGHTS.indexOf(height) + direction;
  return SHEET_HEIGHTS[Math.min(SHEET_HEIGHTS.length - 1, Math.max(0, index))] ?? height;
}

/** A tap on the handle: peek → half → full → peek. */
export function tapSheet(height: SheetHeight): SheetHeight {
  const index = (SHEET_HEIGHTS.indexOf(height) + 1) % SHEET_HEIGHTS.length;
  return SHEET_HEIGHTS[index] ?? height;
}

/**
 * Where a drag that started at `start` ends: `endPx` is the sheet's height at release, `velocity`
 * its rate of growth (px per ms, + = growing). A fast release moves one height; a slow one goes
 * to the nearest height (the larger on an exact tie).
 */
export function snapSheet(
  start: SheetHeight,
  endPx: number,
  velocity: number,
  space: SheetSpace,
): SheetHeight {
  if (velocity >= SHEET.flingPxPerMs) return stepSheet(start, 1);
  if (velocity <= -SHEET.flingPxPerMs) return stepSheet(start, -1);
  let best: SheetHeight = 'peek';
  let bestDistance = Infinity;
  for (const height of SHEET_HEIGHTS) {
    const distance = Math.abs(sheetHeightPx(height, space) - endPx);
    // `<=`: later (larger) heights win a tie.
    if (distance <= bestDistance) {
      best = height;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * CSS px at the bottom of the view the camera must keep the boat above (sheet plus chip row). A
 * full sheet hides the boat anyway, so the camera keeps the half-height framing and does not jump.
 */
export function cameraInsetPx(height: SheetHeight, space: SheetSpace): number {
  return sheetHeightPx(height === 'full' ? 'half' : height, space) + SHEET.chipRowPx;
}
