/**
 * Layout mode rule from PHASE1_SPEC 5.1:
 * stacked when the viewport is narrower than 700 CSS px or width / height < 0.8,
 * otherwise side by side.
 */
export const SIDE_BY_SIDE_MIN_WIDTH_PX = 700;
export const SIDE_BY_SIDE_MIN_ASPECT = 0.8;

export type LayoutMode = 'stacked' | 'side';

export function layoutModeFor(width: number, height: number): LayoutMode {
  if (!(width > 0) || !(height > 0)) return 'stacked';
  if (width < SIDE_BY_SIDE_MIN_WIDTH_PX) return 'stacked';
  if (width / height < SIDE_BY_SIDE_MIN_ASPECT) return 'stacked';
  return 'side';
}
