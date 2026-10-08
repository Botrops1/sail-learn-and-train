/**
 * Test wind helpers (PHASE1_SPEC 6.3, 7.1). Pure data and maths.
 */

/** Wind presets for testing and screenshots (PHASE1_SPEC 6.3), not lessons. */
export const WIND_PRESETS = [
  { id: 'head', windFromDeg: 0, speedKn: 12 },
  { id: 'close', windFromDeg: 45, speedKn: 12 },
  { id: 'beam', windFromDeg: 90, speedKn: 12 },
  { id: 'broad', windFromDeg: 135, speedKn: 12 },
  { id: 'run', windFromDeg: 175, speedKn: 12 },
] as const;
export type WindPresetId = (typeof WIND_PRESETS)[number]['id'];

/**
 * Upper limits of Beaufort forces 0–11 in knots (force 12 above). Standard WMO table, as given
 * in Wikipedia, "Beaufort scale": 0 < 1 kn, 1: 1–3, 2: 4–6, 3: 7–10, 4: 11–16, 5: 17–21,
 * 6: 22–27, 7: 28–33, 8: 34–40, 9: 41–47, 10: 48–55, 11: 56–63, 12: ≥ 64.
 */
const BEAUFORT_UPPER_KN = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64];

/** Beaufort force for a wind speed in knots (rounded to whole knots first). */
export function beaufort(speedKn: number): number {
  const kn = Math.round(Math.max(0, speedKn));
  const force = BEAUFORT_UPPER_KN.findIndex((upper) => kn < upper);
  return force === -1 ? BEAUFORT_UPPER_KN.length : force;
}

export type WindSide = 'ahead' | 'astern' | 'starboard' | 'port';

/** Which side the wind comes from, for labels. */
export function windSide(windFromDeg: number): WindSide {
  if (windFromDeg === 0) return 'ahead';
  if (Math.abs(windFromDeg) === 180) return 'astern';
  return windFromDeg > 0 ? 'starboard' : 'port';
}
