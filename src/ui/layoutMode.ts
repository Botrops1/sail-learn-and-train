/**
 * Layout rule (PHASE_CONSOLE_SPEC 7.3): the console layout (a computer, a tablet held sideways, an
 * unfolded foldable) needs a window of at least 800 × 560 CSS px that is not taller than 1.25 times
 * its width; every other window gets the phone layout (`stacked`).
 */
export const CONSOLE_MIN_WIDTH_PX = 800;
export const CONSOLE_MIN_HEIGHT_PX = 560;
export const CONSOLE_MIN_ASPECT = 0.8;
/** From this width the console is wide; below it narrow. */
export const CONSOLE_WIDE_MIN_PX = 1280;

export type LayoutMode = 'stacked' | 'console';

export function layoutModeFor(width: number, height: number): LayoutMode {
  if (!(width > 0) || !(height > 0)) return 'stacked';
  if (width < CONSOLE_MIN_WIDTH_PX || height < CONSOLE_MIN_HEIGHT_PX) return 'stacked';
  if (width / height < CONSOLE_MIN_ASPECT) return 'stacked';
  return 'console';
}

export function consoleWidthOf(width: number): 'narrow' | 'wide' {
  return width < CONSOLE_WIDE_MIN_PX ? 'narrow' : 'wide';
}
