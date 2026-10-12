import { wrap180 } from './angles';
import { boat, type BoatData } from './boat';
import { mulberry32 } from './random';

/**
 * Wind modes (PHASE2_SPEC 10, EXERCISES.md 4): the wind the boat feels is the mean the user sets
 * (the dial and the speed slider) plus a pattern. Every pattern is a pure function of the seed
 * and the time, so a link reproduces it and the frame rate does not matter. Pure.
 */
export type WindModeId = 'steady' | 'gusty' | 'shifty' | 'building' | 'dying';

export const WIND_MODE_IDS: readonly WindModeId[] = [
  'steady',
  'gusty',
  'shifty',
  'building',
  'dying',
];

export function isWindModeId(value: string): value is WindModeId {
  return (WIND_MODE_IDS as readonly string[]).includes(value);
}

/** The time speed-ups on offer (data: `windModes.timeScales`). */
export function isTimeScale(value: number, data: BoatData = boat): boolean {
  return data.windModes.timeScales.includes(value);
}

export interface WindModeState {
  mode: WindModeId;
  /** Which pattern: the same seed gives the same wind. 1 … 99,999. */
  seed: number;
  /** % of the mean (gusty), ° (shifty), kn (building and dying). Unused when steady. */
  size: number;
  /** The simulation time (rig clock) at which the pattern began. */
  startS: number;
}

/** The true wind at one moment: the compass direction it comes from, signed, and its speed. */
export interface WindNow {
  dirDeg: number;
  twsKn: number;
}

/** Seed range of "New pattern" and of a link. */
export const SEED_MIN = 1;
export const SEED_MAX = 99999;

export function isSeed(value: number): boolean {
  return Number.isInteger(value) && value >= SEED_MIN && value <= SEED_MAX;
}

/** The size of a mode's pattern with nothing asked for, and the range the slider allows. */
export interface SizeRange {
  min: number;
  max: number;
  default: number;
}

/** Smallest change of a building or dying wind the slider offers, knots (decided in the M10 PR). */
const CHANGE_MIN_KN = 1;

export function sizeRange(mode: WindModeId, data: BoatData = boat): SizeRange | null {
  const wm = data.windModes;
  switch (mode) {
    case 'steady':
      return null;
    case 'gusty':
      return {
        min: wm.gusty.strengthMinPct,
        max: wm.gusty.strengthMaxPct,
        default: wm.gusty.strengthDefaultPct,
      };
    case 'shifty':
      return {
        min: wm.shifty.sizeMinDeg,
        max: wm.shifty.sizeMaxDeg,
        default: wm.shifty.sizeDefaultDeg,
      };
    case 'building':
      return {
        min: CHANGE_MIN_KN,
        max: wm.building.changeMaxKn,
        default: wm.building.changeDefaultKn,
      };
    case 'dying':
      return { min: CHANGE_MIN_KN, max: wm.dying.changeMaxKn, default: wm.dying.changeDefaultKn };
  }
}

/** A wind mode with its default size, starting at `startS`. */
export function initialWindMode(
  overrides: Partial<WindModeState> = {},
  data: BoatData = boat,
): WindModeState {
  const mode = overrides.mode ?? 'steady';
  return {
    mode,
    seed: 1,
    size: sizeRange(mode, data)?.default ?? 0,
    startS: 0,
    ...overrides,
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return u * u * (3 - 2 * u);
}

/** One gust or lull of the gusty pattern: when it starts and how big it is. */
export interface WindEvent {
  /** `true` = a gust (more wind, veers), `false` = a lull (less wind). */
  gust: boolean;
  atS: number;
  holdS: number;
  amp: number;
  veerDeg: number;
}

/** The pattern's random start phases (radians) for the speed noise, then its events up to `t`. */
function gustyPattern(
  seed: number,
  t: number,
  data: BoatData,
): { p1: number; p2: number; events: WindEvent[] } {
  const g = data.windModes.gusty;
  const rnd = mulberry32(seed);
  const p1 = 2 * Math.PI * rnd();
  const p2 = 2 * Math.PI * rnd();
  const events: WindEvent[] = [];
  let at = 0;
  while (at < t) {
    at += -g.meanIntervalS * Math.log(1 - rnd());
    const holdS = g.holdMinS + rnd() * (g.holdMaxS - g.holdMinS);
    const amp = 0.7 + 0.6 * rnd();
    const veerDeg = rnd() * g.veerMaxDeg;
    events.push({ gust: events.length % 2 === 0, atS: at, holdS, amp, veerDeg });
  }
  return { p1, p2, events };
}

/** The gusts and lulls that have begun by `t` seconds into the pattern (for tests and display). */
export function gustyEvents(seed: number, t: number, data: BoatData = boat): WindEvent[] {
  return gustyPattern(seed, t, data).events.filter((event) => event.atS <= t);
}

/** An event's envelope: 0 → 1 over `riseS`, 1 for `holdS`, 1 → 0 over `fallS` (smooth ramps). */
function envelope(event: WindEvent, t: number, data: BoatData): number {
  const g = data.windModes.gusty;
  const tau = t - event.atS;
  if (tau <= 0) return 0;
  if (tau < g.riseS) return smoothstep(0, g.riseS, tau);
  if (tau < g.riseS + event.holdS) return 1;
  return 1 - smoothstep(g.riseS + event.holdS, g.riseS + event.holdS + g.fallS, tau);
}

/**
 * The true wind `timeS` seconds into the simulation for a mean direction and speed
 * (PHASE2_SPEC 10.2). A pure function of its arguments.
 */
export function windAt(
  meanDirDeg: number,
  meanKn: number,
  wm: WindModeState,
  timeS: number,
  data: BoatData = boat,
): WindNow {
  const t = Math.max(0, timeS - wm.startS);
  const limit = data.windModes.maxTwsKn;
  let dirDeg = meanDirDeg;
  let twsKn = meanKn;
  switch (wm.mode) {
    case 'steady':
      break;
    case 'gusty': {
      const g = data.windModes.gusty;
      const { p1, p2, events } = gustyPattern(wm.seed, t, data);
      const [period1 = 23, period2 = 37] = g.noisePeriodsS;
      const noise =
        (g.noisePct / 100) *
        (0.6 * Math.sin((2 * Math.PI * t) / period1 + p1) +
          0.4 * Math.sin((2 * Math.PI * t) / period2 + p2));
      let change = noise;
      let veer = 0;
      for (const event of events) {
        const e = envelope(event, t, data);
        if (e === 0) continue;
        if (event.gust) {
          change += e * (wm.size / 100) * event.amp;
          veer += e * event.veerDeg;
        } else {
          change -= e * g.lullFraction * (wm.size / 100) * event.amp;
        }
      }
      twsKn = meanKn * (1 + change);
      dirDeg = meanDirDeg + veer;
      break;
    }
    case 'shifty': {
      const s = data.windModes.shifty;
      const rnd = mulberry32(wm.seed);
      const p1 = 2 * Math.PI * rnd();
      const p2 = 2 * Math.PI * rnd();
      const p3 = 2 * Math.PI * rnd();
      const [period1 = 180, period2 = 67] = s.periodsS;
      const [weight1 = 0.6, weight2 = 0.4] = s.weights;
      dirDeg =
        meanDirDeg +
        wm.size *
          (weight1 * Math.sin((2 * Math.PI * t) / period1 + p1) +
            weight2 * Math.sin((2 * Math.PI * t) / period2 + p2));
      twsKn = meanKn * (1 + (s.speedNoisePct / 100) * Math.sin((2 * Math.PI * t) / 29 + p3));
      break;
    }
    case 'building':
      twsKn = meanKn + wm.size * smoothstep(0, data.windModes.building.rampS, t);
      break;
    case 'dying':
      twsKn = Math.max(0, meanKn - wm.size * smoothstep(0, data.windModes.dying.rampS, t));
      break;
  }
  return { dirDeg: wrap180(dirDeg), twsKn: Math.min(limit, Math.max(0, twsKn)) };
}
