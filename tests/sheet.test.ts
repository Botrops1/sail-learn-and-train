import { describe, expect, it } from 'vitest';
import {
  cameraInsetPx,
  sheetHeightPx,
  snapSheet,
  stepSheet,
  tapSheet,
  type SheetSpace,
} from '../src/ui/sheetGeometry';

// PHASE5_SPEC 7.7
const A: SheetSpace = { viewHeightPx: 844, topAreaPx: 116 };
const B: SheetSpace = { viewHeightPx: 740, topAreaPx: 166 };
const C: SheetSpace = { viewHeightPx: 740, topAreaPx: 114 };

describe('sheet geometry (M26)', () => {
  it('sheetHeightPx', () => {
    expect(['peek', 'half', 'full'].map((h) => sheetHeightPx(h as 'peek', A))).toEqual([
      100, 422, 668,
    ]);
    expect(sheetHeightPx('half', B)).toBe(370);
    expect(sheetHeightPx('full', B)).toBe(514);
    expect(sheetHeightPx('full', C)).toBe(566);
    const tiny = { viewHeightPx: 300, topAreaPx: 200 };
    expect(sheetHeightPx('full', tiny)).toBe(150);
    expect(sheetHeightPx('half', tiny)).toBe(150);
    expect(sheetHeightPx('half', { viewHeightPx: 160, topAreaPx: 40 })).toBe(100);
  });

  it('cameraInsetPx keeps the half framing at full', () => {
    expect(cameraInsetPx('peek', A)).toBe(160);
    expect(cameraInsetPx('half', A)).toBe(482);
    expect(cameraInsetPx('full', A)).toBe(482);
  });

  it('snapSheet', () => {
    expect(snapSheet('half', 600, 0.1, A)).toBe('full');
    expect(snapSheet('half', 430, -0.6, A)).toBe('peek');
    expect(snapSheet('peek', 150, 0.7, A)).toBe('half');
    expect(snapSheet('full', 700, -0.5, A)).toBe('half');
    expect(snapSheet('peek', 261, 0, A)).toBe('half');
    expect(snapSheet('peek', 260, 0, A)).toBe('peek');
    expect(snapSheet('full', 800, 0.9, A)).toBe('full');
  });

  it('tapSheet and stepSheet', () => {
    expect(tapSheet('peek')).toBe('half');
    expect(tapSheet('half')).toBe('full');
    expect(tapSheet('full')).toBe('peek');
    expect(stepSheet('peek', -1)).toBe('peek');
    expect(stepSheet('full', 1)).toBe('full');
    expect(stepSheet('half', 1)).toBe('full');
  });
});
