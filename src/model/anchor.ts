import { interpTable } from './angles';
import { boat as hanse508, type BoatData } from './boat';
import { forceAt, NO_FORCES, pointToMap, vectorToBoat, type ExternalForces } from './lowSpeed';
import type { BoatState } from './motion';
import type { SeabedType } from './seabed';

/**
 * The anchor and its windlass (M46, PHASE7_SPEC 12.3): the chain hanging from the bow roller as
 * one catenary and lying on the seabed, the pull it puts on the boat, the holding of the anchor
 * (by scope and bottom), dragging, setting and the alarm. Pure.
 */
export type AnchorPhase = 'stowed' | 'hanging' | 'bottom' | 'set';
export type WindlassMotion = 'off' | 'down' | 'up';

export interface AnchorState {
  phase: AnchorPhase;
  chainOutM: number;
  /** On the bottom (phases 'bottom' and 'set'): where the anchor lies, map metres. */
  eastM: number;
  northM: number;
  windlass: WindlassMotion;
  /** The windlass stopped under load; cleared by the next press. */
  cutOut: boolean;
  /** Metres dragged since it reached the bottom (to set it) and seconds it has been dragging without a break. */
  draggedM: number;
  dragS: number;
  dragging: boolean;
  alarm: boolean;
}

export const ANCHOR_STOWED: AnchorState = {
  phase: 'stowed',
  chainOutM: 0,
  eastM: 0,
  northM: 0,
  windlass: 'off',
  cutOut: false,
  draggedM: 0,
  dragS: 0,
  dragging: false,
  alarm: false,
};

export interface SeabedEnv {
  depthAt(e: number, n: number): number;
  seabedAt(e: number, n: number): SeabedType;
}

export interface ChainPull {
  pullN: number;
  /** Lifted off the bottom all the way to the anchor. */
  lifted: boolean;
  /** The catenary parameter (m) of the suspended part. */
  a: number;
  /** The suspended length of chain (m). */
  s: number;
  /** The suspended part's horizontal length (m). */
  spanM: number;
}

/** Where the chain leaves the top of the bow roller, boat frame (PHASE7_SPEC 4.1). */
export function rollerPoint(data: BoatData = hanse508): { x: number; y: number; z: number } {
  const r = data.deckFittings.bowRoller;
  return { x: r.rollerX, y: r.plateY + r.plateThickness + 2 * r.rollerRadius, z: r.centreZ };
}

/** Chain weight in water per metre, N: chainKgPerM·g·(1 − waterDensity / steelDensity). */
export function chainWeightNPerM(data: BoatData = hanse508): number {
  const p = data.physics;
  return (
    p.anchor.chainKgPerM *
    p.constants.gravityMps2 *
    (1 - p.constants.waterDensityKgM3 / p.anchor.steelDensityKgM3)
  );
}

/** The horizontal length of a catenary part with parameter `a` and suspended length `s`. */
function spanOf(a: number, s: number): number {
  return a * Math.asinh(s / a);
}

/**
 * The chain's horizontal pull at the roller (N) for chain out `L`, effective depth `D` and
 * horizontal distance `X` from the roller to the anchor (PHASE7_SPEC 12.3).
 */
export function chainPull(L: number, D: number, X: number, data: BoatData = hanse508): ChainPull {
  if (L <= D) return { pullN: 0, lifted: true, a: 0, s: L, spanM: 0 };
  if (X <= L - D) return { pullN: 0, lifted: false, a: 0, s: D, spanM: 0 };
  const w = chainWeightNPerM(data);
  const aLift = (L * L - D * D) / (2 * D);
  const xLift = spanOf(aLift, L);
  if (X >= xLift) {
    const k = data.physics.anchor.snubStiffnessNPerM;
    return { pullN: w * aLift + k * (X - xLift), lifted: true, a: aLift, s: L, spanM: xLift };
  }
  const reach = (a: number) => {
    const s = Math.sqrt(D * D + 2 * a * D);
    return L - s + spanOf(a, s);
  };
  let low = 1e-6;
  let high = aLift;
  for (let i = 0; i < 50; i += 1) {
    const mid = (low + high) / 2;
    if (reach(mid) < X) low = mid;
    else high = mid;
  }
  const a = (low + high) / 2;
  const s = Math.sqrt(D * D + 2 * a * D);
  return { pullN: w * a, lifted: false, a, s, spanM: spanOf(a, s) };
}

/** The anchor's holding now (N). */
export function holdingN(
  state: AnchorState,
  D: number,
  lifted: boolean,
  seabed: SeabedType,
  data: BoatData = hanse508,
): number {
  const p = data.physics.anchor;
  return (
    p.massKg *
    data.physics.constants.gravityMps2 *
    p.holdingRatio[seabed] *
    interpTable(p.scopeHolding, state.chainOutM / D) *
    (lifted ? p.liftedHoldingShare : 1) *
    (state.phase === 'set' ? 1 : p.unsetHoldingShare)
  );
}

/** The roller in the map, and the effective depth where the anchor lies (or hangs). */
function geometry(
  state: AnchorState,
  boat: BoatState,
  env: SeabedEnv,
  data: BoatData,
): { roller: [number, number]; depthM: number; effectiveM: number; reachM: number } {
  const r = rollerPoint(data);
  const roller = pointToMap(boat, r.x, r.z);
  const onBottom = state.phase === 'bottom' || state.phase === 'set';
  const [e, n] = onBottom ? [state.eastM, state.northM] : roller;
  const depthM = env.depthAt(e, n);
  return {
    roller,
    depthM,
    effectiveM: depthM + r.y,
    reachM: Math.hypot(e - roller[0], n - roller[1]),
  };
}

interface PullNow extends ChainPull {
  effectiveM: number;
  roller: [number, number];
  reachM: number;
  /** The anchor lies in water of no depth: it pulls nothing and does not move. */
  dead: boolean;
}

/** The pull of the chain on the boat now, with what `holdingN` needs (phases 'bottom' and 'set'). */
function pullNow(
  state: AnchorState,
  boat: BoatState,
  env: SeabedEnv,
  data: BoatData,
): PullNow | null {
  if (state.phase !== 'bottom' && state.phase !== 'set') return null;
  const g = geometry(state, boat, env, data);
  // Water of no depth: the anchor lies on land and pulls nothing.
  const pull: ChainPull =
    g.depthM <= 0
      ? { pullN: 0, lifted: false, a: 0, s: 0, spanM: 0 }
      : chainPull(state.chainOutM, g.effectiveM, g.reachM, data);
  return {
    ...pull,
    effectiveM: g.effectiveM,
    roller: g.roller,
    reachM: g.reachM,
    dead: g.depthM <= 0,
  };
}

/** The chain's force on the boat now (boat frame, at the roller). */
export function chainForces(
  state: AnchorState,
  boat: BoatState,
  env: SeabedEnv,
  data: BoatData = hanse508,
): ExternalForces {
  const pull = pullNow(state, boat, env, data);
  if (pull === null || pull.dead || pull.pullN <= 0) return NO_FORCES;
  if (pull.reachM < 1e-6) return NO_FORCES;
  const [fx, fz] = vectorToBoat(
    (pull.pullN * (state.eastM - pull.roller[0])) / pull.reachM,
    (pull.pullN * (state.northM - pull.roller[1])) / pull.reachM,
    boat.headingDeg,
  );
  const r = rollerPoint(data);
  return forceAt(r.x, r.z, fx, fz, data);
}

/** The windlass: chain in or out, a hanging anchor landing or breaking out (before the boat moves). */
export function stepWindlass(
  state: AnchorState,
  boat: BoatState,
  env: SeabedEnv,
  dt: number,
  data: BoatData = hanse508,
): AnchorState {
  const p = data.physics.anchor;
  let next = state;
  const set = (change: Partial<AnchorState>) => {
    next = { ...next, ...change };
  };
  if (state.phase === 'stowed' && state.windlass !== 'down') return state;
  if (state.windlass === 'down' && dt > 0) {
    const chainOutM = Math.min(p.chainLengthM, state.chainOutM + p.windlassDownMps * dt);
    set({
      chainOutM,
      phase: state.phase === 'stowed' && chainOutM > 0 ? 'hanging' : state.phase,
      ...(chainOutM >= p.chainLengthM ? { windlass: 'off' as const } : {}),
    });
  } else if (state.windlass === 'up' && dt > 0) {
    const pull = pullNow(state, boat, env, data);
    const load = pull === null || pull.dead ? 0 : pull.pullN;
    if (load > p.windlassMaxPullN) {
      set({ windlass: 'off', cutOut: true });
    } else {
      const speed = p.windlassUpMps * Math.max(0.2, 1 - load / p.windlassMaxPullN);
      set({ chainOutM: Math.max(0, state.chainOutM - speed * dt) });
    }
  }
  if (next.chainOutM <= 0 && state.windlass === 'up') return ANCHOR_STOWED;
  if (next.phase === 'bottom' || next.phase === 'set') {
    const g = geometry(next, boat, env, data);
    if (next.windlass === 'up' && next.chainOutM <= g.effectiveM + p.breakOutMarginM) {
      return { ...next, phase: 'hanging', draggedM: 0, dragS: 0, dragging: false, alarm: false };
    }
    return next;
  }
  if (next.phase === 'hanging') {
    const g = geometry(next, boat, env, data);
    const lands =
      (next.windlass === 'down' && next.chainOutM >= g.effectiveM) ||
      next.chainOutM >= g.effectiveM + p.breakOutMarginM;
    if (lands) {
      return {
        ...next,
        phase: 'bottom',
        eastM: g.roller[0],
        northM: g.roller[1],
        draggedM: 0,
        dragS: 0,
        dragging: false,
      };
    }
  }
  return next;
}

/** After the boat moved: dragging, setting and the alarm. */
export function stepAnchor(
  state: AnchorState,
  boat: BoatState,
  env: SeabedEnv,
  dt: number,
  data: BoatData = hanse508,
): AnchorState {
  if (dt <= 0 || (state.phase !== 'bottom' && state.phase !== 'set')) return state;
  const p = data.physics.anchor;
  const pull = pullNow(state, boat, env, data);
  if (pull === null || pull.dead) return state;
  const seabed = env.seabedAt(state.eastM, state.northM);
  const holding = holdingN(state, pull.effectiveM, pull.lifted, seabed, data);
  if (pull.pullN > holding) {
    const reach = pull.reachM;
    const step = Math.min(p.maxDragMps, (pull.pullN - holding) / p.dragResistanceNsPerM) * dt;
    let eastM = state.eastM;
    let northM = state.northM;
    let moved = 0;
    if (reach > 1e-6) {
      const toE = (pull.roller[0] - state.eastM) / reach;
      const toN = (pull.roller[1] - state.northM) / reach;
      const nextE = state.eastM + toE * step;
      const nextN = state.northM + toN * step;
      // Not into water shallower than nothing: the anchor stops at the shore.
      if (env.depthAt(nextE, nextN) > 0) {
        eastM = nextE;
        northM = nextN;
        moved = step;
      }
    }
    const draggedM = state.draggedM + moved;
    const dragS = state.dragS + dt;
    const phase: AnchorPhase =
      state.phase === 'bottom' && seabed !== 'rock' && draggedM >= p.setDistanceM
        ? 'set'
        : state.phase;
    const alarm =
      state.alarm ||
      (dragS >= p.alarmAfterS &&
        (phase === 'set' || (phase === 'bottom' && draggedM >= 5 * p.setDistanceM)));
    return { ...state, phase, eastM, northM, draggedM, dragS, dragging: true, alarm };
  }
  if (!state.dragging && state.dragS === 0) return state;
  return { ...state, dragging: false, dragS: 0 };
}

/** PT-31: the chain the rules ask for here (m): 4 × the effective depth (+ 2 boat lengths in a strong wind), at least 3 boat lengths. */
export function scopeNeededM(depthM: number, twsKn: number, data: BoatData = hanse508): number {
  const p = data.physics.anchor;
  const loa = data.dimensions.loa;
  return Math.max(
    4 * (depthM + rollerPoint(data).y) + (twsKn >= p.strongWindKn ? 2 * loa : 0),
    3 * loa,
  );
}

type Point = [number, number, number];

/** `count` points spread evenly along a polyline. */
function resample(poly: Point[], count: number): Point[] {
  const lengths: number[] = [0];
  for (let i = 1; i < poly.length; i += 1) {
    const a = poly[i - 1] as Point;
    const b = poly[i] as Point;
    lengths.push((lengths[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  const total = lengths[lengths.length - 1] as number;
  const out: Point[] = [];
  let j = 1;
  for (let k = 0; k < count; k += 1) {
    const at = count === 1 ? 0 : (total * k) / (count - 1);
    while (j < poly.length - 1 && (lengths[j] as number) < at) j += 1;
    const a = poly[j - 1] as Point;
    const b = poly[j] as Point;
    const span = (lengths[j] as number) - (lengths[j - 1] as number);
    const u = span <= 0 ? 1 : Math.min(1, Math.max(0, (at - (lengths[j - 1] as number)) / span));
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]);
  }
  return out;
}

/** Points of the chain from the roller to the anchor, map (east, north, height), for drawing. */
export function chainPoints(
  state: AnchorState,
  boat: BoatState,
  env: SeabedEnv,
  count: number,
  data: BoatData = hanse508,
): [number, number, number][] {
  const r = rollerPoint(data);
  const g = geometry(state, boat, env, data);
  const [re, rn] = g.roller;
  if (state.phase === 'hanging' || state.phase === 'stowed') {
    const bottom = -g.depthM;
    const low = Math.max(r.y - state.chainOutM, bottom);
    return resample(
      [
        [re, rn, r.y],
        [re, rn, low],
      ],
      count,
    );
  }
  const ae = state.eastM;
  const an = state.northM;
  const bottomAt = (e: number, n: number) => -Math.max(0, env.depthAt(e, n));
  const reach = Math.hypot(ae - re, an - rn);
  if (g.depthM <= 0 || reach < 1e-6) {
    return resample(
      [
        [re, rn, r.y],
        [ae, an, bottomAt(ae, an)],
      ],
      count,
    );
  }
  const pull = chainPull(state.chainOutM, g.effectiveM, reach, data);
  if (pull.pullN <= 0) {
    const down = bottomAt(re, rn);
    return resample(
      [
        [re, rn, r.y],
        [re, rn, down],
        [ae, an, bottomAt(ae, an)],
      ],
      count,
    );
  }
  const ue = (ae - re) / reach;
  const un = (an - rn) / reach;
  const bottom = bottomAt(ae, an);
  const poly: Point[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i += 1) {
    const d = (pull.spanM * i) / steps;
    const x = pull.spanM - d;
    poly.push([re + ue * d, rn + un * d, bottom + pull.a * (Math.cosh(x / pull.a) - 1)]);
  }
  poly.push([ae, an, bottom]);
  return resample(poly, count);
}
