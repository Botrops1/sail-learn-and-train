import { boat, type BoatData } from './boat';
import { availableSheetLength, maxSwingFor, sheetLength } from './mainsheet';
import {
  lowerPitchLimit,
  toppingLiftLength,
  toppingLiftLimit,
  vangLimit,
  vangStrutLength,
} from './pitchLimits';

/**
 * Boom solver (PHASE1_SPEC 8.1–8.4): a quasi-static teaching approximation. The wind pushes
 * the boom towards where it wants to be; the ropes only limit it.
 * Angles in degrees: θ swing (+ = boom to starboard), ψ pitch (+ = boom end up).
 */

/** Side of the boat the boom is on: +1 starboard, −1 port. */
export type Side = 1 | -1;

export type RopeState = 'taut' | 'slack' | 'fighting';

export interface RopeStatus {
  state: RopeState;
  /**
   * Spare rope, metres at the clutch (0 when taut or fighting): the geometric spare times the
   * rope's parts, the same factor as "paid out" (main sheet: partsPerSide, vang: its tackle).
   */
  slack: number;
}

export interface BoomInput {
  /** Where the wind comes from, (−180, 180], + = from starboard. */
  windFromDeg: number;
  windSpeedKn: number;
  /** Rope controls, % eased (0 = hauled in). */
  mainsheetPct: number;
  vangPct: number;
  toppingLiftPct: number;
  /** Mainsail out, % unfurled. The wind's push and lift scale with it; 0 = no sail. */
  unfurledPct: number;
}

/** What the solver carries over from the previous frame. */
export interface BoomMemory {
  side: Side;
  /** Current swing, used when there is no wind to push the boom. */
  thetaDeg: number;
}

export interface BoomSolution {
  thetaDeg: number;
  psiDeg: number;
  side: Side;
  /** Where the wind wants the boom (signed, on the boom's side). */
  thetaFreeDeg: number;
  psiTargetDeg: number;
  /** The fill used for the wind's lift in ψ_t (see liftFill). */
  liftFill: number;
  /** Pitch limits: topping lift or vang strut stop (lower) and vang (upper). */
  lowerDeg: number;
  upperDeg: number;
  /** Wind on the same side as the boom, inside the gybe band (PHASE1_SPEC 8.4). */
  byTheLee: boolean;
  /** The boom changed sides with the wind from behind the beam: an accidental gybe. */
  gybe: boolean;
  /** The boom changed sides with the wind forward of the beam: a tack. */
  tack: boolean;
  /** The main is rolled away: nothing for the wind to push. */
  furled: boolean;
  /** Angle of attack of the main, degrees (≥ 0). */
  aoaDeg: number;
  /** 0 = luffing (flapping), 1 = filled. */
  fill: number;
  mainsheet: RopeStatus;
  vang: RopeStatus;
  toppingLift: RopeStatus;
  /** Rope available to the mainsheet: L_avail, and its geometric length at the solved pose. */
  sheetAvailable: number;
  sheetUsed: number;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** The side the wind pushes the boom (and the jib) to: wind from starboard → port. */
export function leewardSide(windFromDeg: number): Side | null {
  if (windFromDeg > 0 && windFromDeg < 180) return -1;
  if (windFromDeg < 0) return 1;
  return null;
}

/** A sensible starting side for a wind direction (dead ahead or astern: port). */
export function initialSide(windFromDeg: number): Side {
  return leewardSide(windFromDeg) ?? -1;
}

export interface SideDecision {
  side: Side;
  byTheLee: boolean;
  /** Changed sides with the wind from behind (|windFrom| > 90°): an accidental gybe. */
  gybe: boolean;
  /** Changed sides with the wind forward of the beam: a tack. */
  tack: boolean;
}

/**
 * The side the sail curves and twists to: away from the wind (leeward), whichever side the
 * boom is on at the moment (by the lee, or still swinging across in a gybe). Wind dead ahead or
 * astern: the boom's side.
 */
export function curveSide(windFromDeg: number, boomSide: Side): Side {
  return leewardSide(windFromDeg) ?? boomSide;
}

/**
 * Free side with gybe hysteresis (PHASE1_SPEC 8.1). Near dead astern the boom stays on its side
 * until the wind comes at least `gybeHysteresisDeg` from the other side (by the lee), then swings
 * across. Near the bow it changes sides as soon as the wind crosses (a tack). No wind: no change.
 */
export function decideSide(
  windFromDeg: number,
  windSpeedKn: number,
  current: Side,
  data: BoatData = boat,
): SideDecision {
  const wanted = leewardSide(windFromDeg);
  if (windSpeedKn < data.visual.solver.minWindKn || wanted === null || wanted === current) {
    return { side: current, byTheLee: false, gybe: false, tack: false };
  }
  const byTheLeeAngle = 180 - Math.abs(windFromDeg);
  if (byTheLeeAngle < data.visual.gybeHysteresisDeg) {
    return { side: current, byTheLee: true, gybe: false, tack: false };
  }
  const fromBehind = Math.abs(windFromDeg) > 90;
  return { side: wanted, byTheLee: false, gybe: fromBehind, tack: !fromBehind };
}

/** Main fill from the angle of attack (PHASE1_SPEC 8.4). */
export function fillFor(aoaDeg: number, data: BoatData = boat): number {
  const luff = data.visual.luffAoaDeg;
  return smoothstep(luff.fullyLuffing, luff.fullyFilled, aoaDeg);
}

/**
 * The fill that sets how much the wind lifts the boom (ψ_t): the fill the main would have with
 * the boom as low as the topping lift allows, where the sheet lets it swing furthest.
 *
 * PHASE1_SPEC 8.3 (decided in M2): the previous frame's fill made the loop fill → lift →
 * pitch → swing → fill bistable near close-hauled (gain about 2), so the boom jumped 8–10° on a
 * 1 % sheet change. This estimate breaks the loop: the answer is unique and smooth, and on a
 * reach or run (where the sail is clearly filled) nothing changes.
 */
export function liftFill(
  input: BoomInput,
  freeMagnitude: number,
  byTheLee: boolean,
  lower: number,
  available: number,
  data: BoatData = boat,
): number {
  if (input.windSpeedKn < data.visual.solver.minWindKn) return 0;
  if (byTheLee) return 1;
  const reach = maxSwingFor(available, lower, data);
  if (reach === null) return 0;
  return fillFor(Math.abs(input.windFromDeg) - Math.min(freeMagnitude, reach), data);
}

export function solveBoom(
  input: BoomInput,
  memory: BoomMemory,
  data: BoatData = boat,
): BoomSolution {
  const { solver } = data.visual;
  const pitch = data.rig.boom.pitch;
  const maxSwing = data.rig.boom.maxSwingDeg;
  // The wind's push and lift scale with the sail out (PT-14); no sail is like no wind.
  const furled = input.unfurledPct < solver.furledBelowPct;
  const sail = furled ? 0 : Math.min(1, input.unfurledPct / 100);
  const windy = input.windSpeedKn >= solver.minWindKn && !furled;
  const pushKn = windy ? input.windSpeedKn : 0;

  // 1. Targets.
  const decision = decideSide(input.windFromDeg, pushKn, memory.side, data);
  const side = decision.side;
  const freeMagnitude = windy
    ? Math.min(Math.abs(input.windFromDeg), maxSwing)
    : Math.min(Math.abs(memory.thetaDeg), maxSwing);

  // 2. Hard limits on pitch (needed for the lift estimate too).
  const liftLimit = toppingLiftLimit(input.toppingLiftPct, data);
  const lower = lowerPitchLimit(input.toppingLiftPct, data);
  const upper = vangLimit(input.vangPct, data);
  const available = availableSheetLength(input.mainsheetPct, data);

  const lift = windy
    ? liftFill(input, freeMagnitude, decision.byTheLee, lower, available, data)
    : 0;
  const psiTarget =
    pitch.gravityDropDeg +
    sail * lift * pitch.windLiftMaxDeg * Math.min(1, pushKn / pitch.windLiftReferenceKn);

  let theta: number;
  let psi: number;
  let fightingLimits = false;
  let fightingSheet = false;

  if (lower > upper) {
    // Vang and topping lift fight each other.
    fightingLimits = true;
    psi = (lower + upper) / 2;
    theta = Math.min(freeMagnitude, maxSwingFor(available, psi, data) ?? 0);
  } else {
    // 3. The pose closest to the targets that the mainsheet allows.
    const top = Math.min(upper, Math.max(lower, psiTarget));
    let best: { theta: number; psi: number; cost: number } | null = null;
    const steps = Math.ceil((top - lower) / solver.pitchSearchStepDeg - 1e-9);
    for (let i = 0; i <= steps; i += 1) {
      const candidate = Math.min(top, lower + i * solver.pitchSearchStepDeg);
      const thetaMax = maxSwingFor(available, candidate, data);
      if (thetaMax === null) continue;
      const swing = Math.min(freeMagnitude, thetaMax);
      // The wind's swing push weighs in proportion to the sail out (PT-14).
      const cost =
        sail * (freeMagnitude - swing) ** 2 + pitch.pitchStiffness * (psiTarget - candidate) ** 2;
      if (!best || cost < best.cost) best = { theta: swing, psi: candidate, cost };
    }
    if (best) {
      theta = best.theta;
      psi = best.psi;
    } else {
      // The sheet pulls the boom lower than the topping lift allows.
      fightingSheet = true;
      theta = 0;
      psi = lower;
    }
  }

  const thetaDeg = side * theta;
  const sheetUsed = sheetLength({ thetaDeg, psiDeg: psi }, data);

  // 4. Rope states.
  const sheetSlack = Math.max(0, available - sheetUsed);
  const sheetConstrains =
    freeMagnitude - theta > solver.tautToleranceDeg || psi < psiTarget - solver.tautToleranceDeg;
  const mainsheet: RopeStatus = fightingSheet
    ? { state: 'fighting', slack: 0 }
    : sheetConstrains && sheetSlack < solver.tautToleranceM
      ? { state: 'taut', slack: 0 }
      : { state: 'slack', slack: data.rig.mainsheet.partsPerSide * sheetSlack };

  const atUpper = Math.abs(psi - upper) < 1e-6;
  const atLower = Math.abs(psi - lower) < 1e-6;
  const vangSlack = Math.max(0, vangStrutLength(upper, data) - vangStrutLength(psi, data));
  // The lift's spare rope is measured to its own limit: eased below the strut stop, it hangs slack.
  const liftSlack = Math.max(0, toppingLiftLength(liftLimit, data) - toppingLiftLength(psi, data));
  const vang: RopeStatus = fightingLimits
    ? { state: 'fighting', slack: 0 }
    : atUpper && psiTarget > upper
      ? { state: 'taut', slack: 0 }
      : { state: 'slack', slack: data.rig.vang.tacklePurchase * vangSlack };
  const pulledDown = psiTarget < lower || mainsheet.state !== 'slack';
  // Eased to or below the rigid vang strut's stop, the strut carries the boom, not the lift.
  const liftCarries = liftLimit > data.rig.vang.strutStopDeg + 1e-6;
  const toppingLift: RopeStatus =
    fightingLimits || fightingSheet
      ? { state: 'fighting', slack: 0 }
      : atLower && pulledDown && liftCarries
        ? { state: 'taut', slack: 0 }
        : { state: 'slack', slack: liftSlack };

  // 5. Angle of attack and fill (8.4), from the unclamped wind angle.
  const aoaDeg = Math.max(0, Math.abs(input.windFromDeg) - theta);
  const fill = !windy ? 0 : decision.byTheLee ? 1 : fillFor(aoaDeg, data);

  return {
    thetaDeg,
    psiDeg: psi,
    side,
    thetaFreeDeg: side * freeMagnitude,
    psiTargetDeg: psiTarget,
    liftFill: lift,
    lowerDeg: lower,
    upperDeg: upper,
    byTheLee: decision.byTheLee,
    gybe: decision.gybe,
    tack: decision.tack,
    furled,
    aoaDeg,
    fill,
    mainsheet,
    vang,
    toppingLift,
    sheetAvailable: available,
    sheetUsed,
  };
}
