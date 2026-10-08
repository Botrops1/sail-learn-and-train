import { boat, type BoatData } from './boat';

/**
 * Total rope lengths from the owner's manual (hanse508.json → runningRigging). A rope cannot
 * pay out more than it has, so every "metres paid out" value is capped at its rope's length.
 */
export function ropeTotalLength(ropeId: string, data: BoatData = boat): number | undefined {
  const ropes: Record<string, { lengthM?: number } | undefined> = data.runningRigging.ropes;
  return ropes[ropeId]?.lengthM;
}

/** Caps a paid-out length at the rope's total length (no cap if the manual has none). */
export function capPaidOut(ropeId: string, metres: number, data: BoatData = boat): number {
  const total = ropeTotalLength(ropeId, data);
  return total === undefined ? metres : Math.min(metres, total);
}
