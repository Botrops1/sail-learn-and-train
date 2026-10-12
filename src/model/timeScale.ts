import { boat, type BoatData } from './boat';
import type { WindModeId } from './windModes';

/**
 * The time bar's scales (PHASE2_SPEC 10.3, issue #25): slow motion, normal speed and speed-up.
 * The list is data (`windModes.timeScales`); these helpers are pure.
 */

export function isTimeScale(value: number, data: BoatData = boat): boolean {
  return data.windModes.timeScales.includes(value);
}

/** The scale one step down (−1) or up (+1) the list; it stays at either end. */
export function stepTimeScale(current: number, direction: -1 | 1, data: BoatData = boat): number {
  const scales = data.windModes.timeScales;
  const index = scales.indexOf(current);
  // A value that is not on the list (it cannot be set) steps from the normal speed.
  const from = index === -1 ? scales.indexOf(1) : index;
  return scales[Math.min(scales.length - 1, Math.max(0, from + direction))] ?? 1;
}

/** The slowest (`<<`) and the fastest (`>>`) scale. */
export function slowestTimeScale(data: BoatData = boat): number {
  return data.windModes.timeScales[0] ?? 1;
}

export function fastestTimeScale(data: BoatData = boat): number {
  return data.windModes.timeScales[data.windModes.timeScales.length - 1] ?? 1;
}

const FRACTIONS: Readonly<Record<number, string>> = { 0.25: '¼', 0.5: '½' };

/** "¼", "½", "1", "4": the number after the × sign. */
export function timeScaleText(scale: number): string {
  return FRACTIONS[scale] ?? String(scale);
}

/**
 * Whether the speed part of the time bar shows (and a time scale other than ×1 can be set):
 * while Sailing, or in Held still when the wind mode is not Steady (nothing else changes with
 * time there), and only when the View tab's "Time bar" switch is on. Pause always shows.
 */
export function timeSpeedAvailable(
  boatMode: 'sailing' | 'held',
  windMode: WindModeId,
  timeBar: boolean,
): boolean {
  return timeBar && (boatMode === 'sailing' || windMode !== 'steady');
}
