import { boat, type BoatData } from './boat';

/**
 * Winch and rope physics for Realistic mode (PHASE1_SPEC 7.2.2, M4b): a teaching model, pure
 * functions only. Values come from hanse508.json → realisticMode; sources are in
 * docs/PHYSICS_TRUTHS.md (PT-15 … PT-19a).
 */

/** Square feet per square metre, miles per hour per knot, newtons per pound-force. */
const FT2_PER_M2 = 10.7639;
const MPH_PER_KN = 1.15078;
const N_PER_LBF = 4.44822;

/**
 * Capstan factor e^(μ·2π·n) for n turns wrapped the right way (clockwise seen from above).
 * Turns wrapped the wrong way (n < 0) hold nothing: the drum turns with the rope (PT-17), so
 * only the tail force itself holds; 0 turns likewise.
 */
export function capstanFactor(turns: number, data: BoatData = boat): number {
  if (turns <= 0) return 1;
  return Math.exp(data.realisticMode.capstan.frictionMu * 2 * Math.PI * turns);
}

/** Where the tail of a rope on a winch is: in the self-tailer's jaw, or in the user's hand. */
export type TailHold = 'selfTailer' | 'hand';

/** The force on the tail: the self-tailer's grip or a hand (newtons). */
export function tailForceN(hold: TailHold, data: BoatData = boat): number {
  const c = data.realisticMode.capstan;
  return hold === 'selfTailer' ? c.selfTailerGripN : c.handTailForceN;
}

/** The most a winch holds (newtons): tail force × capstan factor (PT-16). */
export function holdingForceN(turns: number, hold: TailHold, data: BoatData = boat): number {
  return tailForceN(hold, data) * capstanFactor(turns, data);
}

/**
 * Pull on a sheet at the sail (newtons) by the winch-selection rule (PHYSICS_TRUTHS [8]):
 * load (lb) = area (ft²) × wind speed² (mph) × 0.00431.
 */
export function sheetLoadAtSailN(areaM2: number, windKn: number, data: BoatData = boat): number {
  const k = data.realisticMode.loads.sheetLbPerFt2PerMph2;
  return areaM2 * FT2_PER_M2 * (windKn * MPH_PER_KN) ** 2 * k * N_PER_LBF;
}

/** How fast a rope runs out (m/s) when `excessN` more pulls it out than holds it (PT-18). */
export function runSpeedMps(excessN: number, data: BoatData = boat): number {
  if (excessN <= 0) return 0;
  const r = data.realisticMode.running;
  return r.maxSpeedMps * Math.min(1, (excessN / r.referenceN) ** 2);
}

/** Does a rope with this pull run out past this holding force (blocks and clutch add friction)? */
export function runsOut(loadN: number, holdN: number, data: BoatData = boat): boolean {
  return loadN > holdN + data.realisticMode.loads.ropeFrictionN;
}

/** Running speed (m/s) of a rope with pull `loadN` held with `holdN`, friction included. */
export function runningSpeedMps(loadN: number, holdN: number, data: BoatData = boat): number {
  return runSpeedMps(loadN - holdN - data.realisticMode.loads.ropeFrictionN, data);
}

/**
 * Electric winch (PT-19a, PHYSICS_TRUTHS [9]): it slows as the load grows and cuts out above
 * its safe load; once cut out it stays off until the load drops below the restart level.
 */
export function motorCutOut(loadN: number, wasCutOut: boolean, data: BoatData = boat): boolean {
  const w = data.realisticMode.electricWinch;
  return loadN > (wasCutOut ? w.cutOutLoadN * w.restartBelowFraction : w.cutOutLoadN);
}

/** Line speed of the electric winch (m/s) under `loadN`; 0 when it has cut out. */
export function winchSpeedMps(loadN: number, cutOut: boolean, data: BoatData = boat): number {
  const w = data.realisticMode.electricWinch;
  if (cutOut || loadN > w.cutOutLoadN) return 0;
  const fraction = Math.min(1, Math.max(0, loadN) / w.cutOutLoadN);
  return w.noLoadSpeedMps * (1 - (1 - w.slowestFraction) * fraction);
}

/**
 * Easing by hand is smooth while the hand still feels enough of the load (load / capstan
 * factor); with more turns the rope eases in jerks ("take a turn off", PHASE1_SPEC 7.2.2).
 */
export function easesSmoothly(loadN: number, turns: number, data: BoatData = boat): boolean {
  return loadN / capstanFactor(turns, data) >= data.realisticMode.capstan.smoothEaseMinTailN;
}
