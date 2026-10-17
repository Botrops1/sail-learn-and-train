import { describe, expect, it } from 'vitest';
import {
  clampColumnWidth,
  COLUMN_DEFAULT_PX,
  COLUMN_MAX_PX,
  COLUMN_MIN_PX,
  COLUMN_RAIL_PX,
  defaultColumns,
  effectiveWidths,
  maxColumnWidth,
  parseColumns,
  serializeColumns,
  VIEW_MIN_PX,
} from '../src/ui/columnWidths';

describe('panel columns (M39, issue #89)', () => {
  it('start at the 760 px of M29', () => {
    expect(COLUMN_DEFAULT_PX[0] + COLUMN_DEFAULT_PX[1]).toBe(760);
    expect(effectiveWidths(defaultColumns(), 1280)).toEqual([400, 360]);
  });

  it('a dragged width stays between the minimum and the maximum', () => {
    expect(clampColumnWidth(10, 1920, 360)).toBe(COLUMN_MIN_PX);
    expect(clampColumnWidth(5000, 1920, 360)).toBe(COLUMN_MAX_PX);
    expect(clampColumnWidth(433.4, 1920, 360)).toBe(433);
    expect(clampColumnWidth(Number.NaN, 1920, 360)).toBe(COLUMN_MIN_PX);
  });

  it('the 3D view keeps its minimum width', () => {
    expect(maxColumnWidth(1280, 360)).toBe(1280 - VIEW_MIN_PX - 360);
    expect(clampColumnWidth(560, 1280, 360)).toBe(440);
    // A window too narrow for two wide columns: the minimum still wins.
    expect(maxColumnWidth(900, 560)).toBe(COLUMN_MIN_PX);
  });

  it('a collapsed column leaves its rail', () => {
    const state = defaultColumns();
    state.collapsed = [false, true];
    expect(effectiveWidths(state, 1440)).toEqual([400, COLUMN_RAIL_PX]);
    state.collapsed = [true, true];
    expect(effectiveWidths(state, 1440)).toEqual([COLUMN_RAIL_PX, COLUMN_RAIL_PX]);
  });

  it('wide columns give way (the second first) when the window is too small', () => {
    const state = defaultColumns();
    state.widths = [560, 560];
    const [first, second] = effectiveWidths(state, 1280);
    expect(first + second).toBe(1280 - VIEW_MIN_PX);
    expect(second).toBe(COLUMN_MIN_PX);
    expect(first).toBe(500);
    // The saved widths are not changed by a small window.
    expect(state.widths).toEqual([560, 560]);
  });

  it('is saved and read back, and bad text gives the defaults', () => {
    const state = defaultColumns();
    state.widths = [450, 320];
    state.collapsed = [true, false];
    expect(parseColumns(serializeColumns(state))).toEqual(state);
    for (const raw of [null, '', 'x', '[]', '{"w":"a","c":3}', '{"w":[null,{}]}']) {
      expect(parseColumns(raw)).toEqual(defaultColumns());
    }
    expect(parseColumns('{"w":[9999,1],"c":[0,1]}')).toEqual({
      widths: [COLUMN_MAX_PX, COLUMN_MIN_PX],
      collapsed: [false, true],
    });
  });
});
