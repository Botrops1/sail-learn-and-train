import { boat, type BoatData } from './boat';
import { controlSpec } from './controls';

/**
 * Wheel and rudder (PHASE1_SPEC 6.1, 7.1). Visual only in Phase 1: the boat does not turn.
 *
 * Sign (PHASE1_SPEC 4): `ctl_rudder` > 0 = the rudder's back edge to starboard. The helmsman has
 * turned the wheel clockwise (as seen from behind it, facing forward) and the boat would turn to
 * starboard, as a car does.
 */

/** Wheel rotation for a rudder angle, degrees, + = clockwise as seen by the helmsman. */
export function wheelTurnDeg(rudderDeg: number, data: BoatData = boat): number {
  const spec = controlSpec('ctl_rudder', data);
  const lockToLockDeg = data.cockpitHardware.wheelTurnsLockToLock * 360;
  return (rudderDeg / (spec.max - spec.min)) * lockToLockDeg;
}

/** Wheel turns from the centre for a rudder angle (+ = clockwise). */
export function wheelTurns(rudderDeg: number, data: BoatData = boat): number {
  return wheelTurnDeg(rudderDeg, data) / 360;
}
