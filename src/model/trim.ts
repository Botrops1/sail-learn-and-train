import { boat, type BoatData } from './boat';
import { smoothstep } from './boomSolver';
import type { RigState } from './sim';
import { mainSailTwistDeg } from './sailShape';

/**
 * Trim quality (PHASE2_SPEC 9): what state a sail is in (luffing, good, stalled, ...), what its
 * telltales show, how the main takes the jib's wind on a run, and how long flogging wears a sail
 * out. Pure.
 */
export type SailName = 'main' | 'jib';

export type TrimState = 'furled' | 'luffing' | 'good' | 'stalled' | 'pushed' | 'blanketed';

export interface Telltale {
  /** Height up the sail, 0 = foot, 1 = head. */
  heightFraction: number;
  /** The ribbon on the windward face: lifts when the flow there separates (sail eased too far). */
  windward: 'streaming' | 'lifting';
  /** The ribbon on the leeward face: hangs when the flow there stalls (sail pulled in too far). */
  leeward: 'streaming' | 'stalled';
}

export interface SailTrim {
  state: TrimState;
  /** Empty when telltales do not apply (furled, pushed on a run, blanketed). */
  telltales: Telltale[];
}

/** Flogging damage of each sail, 0 (new) … 1 (torn). Not in the link. */
export interface SailDamage {
  main: number;
  jib: number;
}

export const NO_DAMAGE: Readonly<SailDamage> = { main: 0, jib: 0 };

/** How much of the jib's force is left with the main blanketing it: 1 below `fromAwaDeg`. */
export function blanketFactor(awaDeg: number, data: BoatData = boat): number {
  const { fromAwaDeg, fullAwaDeg, jibForceFactorAtFull } = data.physics.trim.blanket;
  const t = smoothstep(fromAwaDeg, fullAwaDeg, Math.abs(awaDeg));
  return 1 - (1 - jibForceFactorAtFull) * t;
}

/** True once a sail has flogged to destruction. */
export function isTorn(damage: SailDamage, sail: SailName): boolean {
  return damage[sail] >= 1;
}

/** The factor on a torn sail's forces; 1 for a whole sail. */
export function tornForceFactor(damage: SailDamage, sail: SailName, data: BoatData = boat): number {
  return isTorn(damage, sail) ? data.physics.trim.flogging.tornForceFactor : 1;
}

function sailSolution(sail: SailName, rig: RigState) {
  return sail === 'main' ? rig.solution : rig.jibSolution;
}

/** The state of a sail, checked in the order of PHASE2_SPEC 9.2. */
export function trimState(
  sail: SailName,
  rig: RigState,
  awaDeg: number,
  data: BoatData = boat,
): TrimState {
  const trim = data.physics.trim;
  const s = sailSolution(sail, rig);
  if (s.furled) return 'furled';
  if (sail === 'jib' && blanketFactor(awaDeg, data) < 0.5) return 'blanketed';
  if (Math.abs(awaDeg) >= trim.pushedFromAwaDeg || s.byTheLee) return 'pushed';
  if (s.fill < trim.luffingBelowFill) return 'luffing';
  if (s.aoaDeg > trim.stallAboveAoaDeg) return 'stalled';
  return 'good';
}

/** The state of a sail and its telltales for the apparent wind angle `awaDeg`. */
export function sailTrim(
  sail: SailName,
  rig: RigState,
  awaDeg: number,
  data: BoatData = boat,
): SailTrim {
  const state = trimState(sail, rig, awaDeg, data);
  if (state === 'furled' || state === 'pushed' || state === 'blanketed') {
    return { state, telltales: [] };
  }
  const trim = data.physics.trim;
  const s = sailSolution(sail, rig);
  // The sail twists open towards the head, so the angle of attack falls with height.
  const twistTop =
    sail === 'main' ? mainSailTwistDeg(rig.solution.psiDeg, data) : rig.jibSolution.twistDeg;
  const telltales = trim.telltaleHeights.map((h) => {
    const local = s.aoaDeg - twistTop * h;
    return {
      heightFraction: h,
      windward: local < trim.telltaleLuffAoaDeg ? ('lifting' as const) : ('streaming' as const),
      leeward: local > trim.stallAboveAoaDeg ? ('stalled' as const) : ('streaming' as const),
    };
  });
  return { state, telltales };
}

/**
 * Flogging wears a luffing sail out (PT-38): each second adds (AWS / reference)² / life while the
 * apparent wind is at least `minAwsKn`; a sail at 1 is torn. Damage never goes down by itself.
 */
export function floggingDamage(
  damage: SailDamage,
  rig: RigState,
  dt: number,
  data: BoatData = boat,
): SailDamage {
  if (dt <= 0) return damage;
  const flog = data.physics.trim.flogging;
  const { awaDeg, awsKn } = rig.wind;
  if (awsKn < flog.minAwsKn) return damage;
  const wear = (dt * (awsKn / flog.referenceAwsKn) ** 2) / flog.lifeS;
  const next = { ...damage };
  let changed = false;
  for (const sail of ['main', 'jib'] as const) {
    if (damage[sail] < 1 && trimState(sail, rig, awaDeg, data) === 'luffing') {
      next[sail] = Math.min(1, damage[sail] + wear);
      changed = true;
    }
  }
  return changed ? next : damage;
}
