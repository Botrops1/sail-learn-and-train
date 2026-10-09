import { boat, type BoatData } from './boat';
import type { RopeStatus } from './boomSolver';
import { isControlId, type ControlId, type Controls } from './controls';
import {
  availableJibSheet,
  jibFurlingLinePaidOut,
  jibSheetPaidOut,
  jibSheetReleased,
  minUnfurledFor,
} from './jib';
import { mainFurlLengths } from './mainFurl';
import { mainsheetPaidOut } from './mainsheet';
import { panelEntries } from './panelEntries';
import { toppingLiftPaidOut, vangPaidOut } from './pitchLimits';
import type { RigState } from './sim';
import {
  easesSmoothly,
  holdingForceN,
  motorCutOut,
  runningSpeedMps,
  runsOut,
  sheetLoadAtSailN,
  tailForceN,
  winchSpeedMps,
} from './winch';

/**
 * Realistic mode (PHASE1_SPEC 7.2.2, M4b): the ropes are worked the way the crew does it, with
 * clutches, the electric winches and a hand on the tail. The rig model is unchanged: this only
 * decides how each rope's length (its control value) changes. Pure: no DOM, no three.js.
 *
 * Every clutch holds one tail. A tail is held by its closed clutch; with the clutch open, by
 * what holds it: the winch (capstan rule, PT-16), a hand, or nothing. A rope whose pull is
 * more than what holds it runs out (PT-18). The electric winch hauls a rope in through a closed
 * clutch (PT-15), slowing with the load and cutting out above its safe load (PT-19a).
 */

export const STATION_IDS = ['port', 'starboard', 'helm'] as const;
export type StationId = (typeof STATION_IDS)[number];

export function isStationId(value: string): value is StationId {
  return (STATION_IDS as readonly string[]).includes(value);
}

/** One clutch and the rope end it holds. */
export interface TailSpec {
  /** Bank key + slot, e.g. "a5" (Genoa sheet), "r1" (JIB ROLL). Used in links. */
  key: string;
  bankId: string;
  slot: number;
  /** Label exactly as written on the boat. */
  label: string;
  ropeId: string;
  /** Which end of the rope (main sheet: port / starboard; furling line: furl / unfurl). */
  tail: string | null;
  station: StationId;
  /** The winch this tail can be put on (its side's winch). */
  winchId: string;
  /** The control whose value this rope end moves; null for a static rope (halyards). */
  controlId: ControlId | null;
  /** +1: paying this end out raises the control (eases, unfurls); −1: it lowers it. */
  payOutSign: 1 | -1;
  /** Metres of rope at the clutch per 1 % of the control. */
  metresPerPct: number;
}

/** How the clutches of one control work together (from panelEntries: shared kind). */
type GroupKind = 'twoEnds' | 'linked';

interface Group {
  controlId: ControlId;
  kind: GroupKind;
  tails: TailSpec[];
}

/** Metres of rope at the clutch from fully hauled (0 %) to fully eased (100 %), per tail. */
function ropeTravelM(ropeId: string, data: BoatData): number {
  switch (ropeId) {
    case 'rope_mainsheet':
      return mainsheetPaidOut(100, data);
    case 'rope_jib_sheet':
      return jibSheetPaidOut(100, data);
    case 'rope_vang':
      return vangPaidOut(100, data);
    case 'rope_topping_lift':
      return toppingLiftPaidOut(100, data);
    case 'rope_main_furling_line':
      return mainFurlLengths(0, data).outTailPaidOut;
    case 'rope_outhaul':
      return mainFurlLengths(0, data).outhaulPaidOut;
    case 'rope_jib_furling_line':
      return jibFurlingLinePaidOut(1, data);
    default:
      return 0;
  }
}

interface RopeEntry {
  id: string;
  controlId: string | null;
  coupled?: string;
}

interface StationEntry {
  id: string;
  winch?: string;
  clutches?: string[];
  controls?: string[];
}

function stationsOf(data: BoatData): StationEntry[] {
  return data.realisticMode.stations as StationEntry[];
}

const specCache = new WeakMap<BoatData, TailSpec[]>();

/** Every clutch of the boat with the tail it holds (bank B, bank A, JIB ROLL). */
export function tailSpecs(data: BoatData = boat): TailSpec[] {
  const cached = specCache.get(data);
  if (cached) return cached;
  const hw = data.cockpitHardware;
  const stationOf = (bankId: string) => {
    const station = stationsOf(data).find((s) => s.clutches?.includes(bankId));
    if (!station?.winch || !isStationId(station.id)) {
      throw new Error(`No Realistic-mode station holds ${bankId} (realisticMode.stations).`);
    }
    return { station: station.id, winchId: station.winch };
  };
  const ropes = data.ropes.list as RopeEntry[];
  const make = (
    bank: { id: string; key: string },
    clutch: { slot: number; label: string; ropeId: string; tail?: string },
  ): TailSpec => {
    const rope = ropes.find((r) => r.id === clutch.ropeId);
    const controlId = rope?.controlId && isControlId(rope.controlId) ? rope.controlId : null;
    const tail = clutch.tail ?? null;
    return {
      key: `${bank.key}${clutch.slot}`,
      bankId: bank.id,
      slot: clutch.slot,
      label: clutch.label,
      ropeId: clutch.ropeId,
      tail,
      ...stationOf(bank.id),
      controlId,
      // The "out" furling tail and the outhaul (coupled to it) come in as the sail unrolls.
      payOutSign: tail === 'unfurl' || rope?.coupled ? -1 : 1,
      metresPerPct: ropeTravelM(clutch.ropeId, data) / 100,
    };
  };
  const specs: TailSpec[] = [];
  for (const bank of hw.clutchBanks) {
    for (const clutch of bank.clutches) specs.push(make(bank, clutch));
  }
  const roll = hw.jibRollClutch;
  specs.push(make(roll, { slot: 1, label: roll.label, ropeId: roll.ropeId }));
  specCache.set(data, specs);
  return specs;
}

export function tailSpec(key: string, data: BoatData = boat): TailSpec | undefined {
  return tailSpecs(data).find((spec) => spec.key === key);
}

const groupCache = new WeakMap<BoatData, Group[]>();

function groups(data: BoatData): Group[] {
  const cached = groupCache.get(data);
  if (cached) return cached;
  const result: Group[] = [];
  for (const entry of panelEntries(data)) {
    if (!entry.controlId) continue;
    const tails = tailSpecs(data).filter((spec) => spec.controlId === entry.controlId);
    if (tails.length === 0) continue;
    result.push({
      controlId: entry.controlId,
      kind: entry.shared === 'twoEnds' ? 'twoEnds' : 'linked',
      tails,
    });
  }
  groupCache.set(data, result);
  return result;
}

/** The stations that have a winch, and their winch ids. */
export function stationWinch(station: StationId, data: BoatData = boat): string | null {
  return stationsOf(data).find((s) => s.id === station)?.winch ?? null;
}

export function winchIds(data: BoatData = boat): string[] {
  return STATION_IDS.map((station) => stationWinch(station, data)).filter(
    (id): id is string => id !== null,
  );
}

export interface WinchState {
  /** Key of the tail on this winch, or null. One rope per winch. */
  tail: string | null;
  /** Turns on the drum: + clockwise (the right way), − anticlockwise (the wrong way). */
  turns: number;
  /** Tail in the self-tailer's jaw (else in the user's hand). */
  selfTailer: boolean;
  /** The electric button is held down. */
  button: boolean;
  /** The motor has cut out under too much load (PT-19a). */
  cutOut: boolean;
  /** Surface speed of the drum, m/s (+ = turning clockwise), smoothed; drawing only. */
  drumSpeed: number;
  /** Drum rotation, degrees clockwise seen from above; drawing only. */
  drumAngle: number;
}

/** What a rope end is doing (shown in the panel, alerts and 3D). */
export type TailMotion = 'held' | 'running' | 'easing' | 'hauling' | 'slack' | 'loose';

/** Why something happened or did not (a hint in the panel). */
export type TailNote =
  | 'slipping'
  | 'wrongWay'
  | 'noTurns'
  | 'grabby'
  | 'noLoad'
  | 'tooHeavy'
  | 'cutOutFighting'
  | 'cutOutEnd'
  | 'cutOutBlocked'
  | 'cutOutLoad'
  | 'fullyEased';

export interface TailReport {
  /** Pull on the tail, newtons (what makes it run out). */
  loadN: number;
  /** What the winch must overcome to haul it in, newtons. */
  haulLoadN: number;
  /** What holds it, newtons (Infinity: the closed clutch). */
  holdN: number;
  motion: TailMotion;
  /** Rope speed at the clutch, m/s (+ = running or eased out, − = hauled in). */
  speedMps: number;
  note: TailNote | null;
  /** Keys of the clutches that block a furl (cutOutBlocked). */
  blockers: string[];
}

/** A message for the last action that could not be done (e.g. "open the clutch", PT-15). */
export type NoticeKey =
  | 'clutchClosed'
  | 'inSelfTailer'
  | 'winchBusy'
  | 'winchEmpty'
  | 'needTurns'
  | 'staticRope'
  | 'notHere'
  | 'onWinch';

export interface Notice {
  key: NoticeKey;
  /** The tail it is about. */
  tail: string | null;
}

export interface RealisticState {
  station: StationId;
  /** Open clutches by key (missing = closed). */
  open: Record<string, boolean>;
  winches: Record<string, WinchState>;
  /** Rope the hand is letting out, metres still to go, by tail key (PHASE1_SPEC: easing). */
  ease: Record<string, number>;
  /** Tail pulled in by hand (off the winch), or null. */
  pull: string | null;
  /** Latest step's report per tail (keys of controllable tails). */
  reports: Record<string, TailReport>;
  notice: Notice | null;
}

function emptyWinch(): WinchState {
  return {
    tail: null,
    turns: 0,
    selfTailer: false,
    button: false,
    cutOut: false,
    drumSpeed: 0,
    drumAngle: 0,
  };
}

/** Everything held: clutches closed, winches empty (a link always opens like this, then setup). */
export function initialRealistic(data: BoatData = boat): RealisticState {
  const winches: Record<string, WinchState> = {};
  for (const id of winchIds(data)) winches[id] = emptyWinch();
  return { station: 'port', open: {}, winches, ease: {}, pull: null, reports: {}, notice: null };
}

/** The winch a tail is on, if any. */
export function winchOf(state: RealisticState, key: string): string | null {
  for (const [id, winch] of Object.entries(state.winches)) if (winch.tail === key) return id;
  return null;
}

export type RealisticAction =
  | { type: 'station'; station: StationId }
  | { type: 'clutch'; key: string; open: boolean }
  | { type: 'onWinch'; key: string }
  | { type: 'offWinch'; winch: string }
  | { type: 'turn'; winch: string; delta: 1 | -1 }
  | { type: 'selfTailer'; winch: string; into: boolean }
  | { type: 'button'; winch: string; held: boolean }
  | { type: 'ease'; key: string; metres: number }
  | { type: 'pull'; key: string | null }
  | { type: 'clearNotice' };

/** Most rope the hand lets out ahead of the rope (a long drag does not store more). */
const MAX_EASE_AHEAD_M = 2;

function withNotice(state: RealisticState, key: NoticeKey, tail: string | null): RealisticState {
  return { ...state, notice: { key, tail } };
}

function setWinch(state: RealisticState, id: string, winch: Partial<WinchState>): RealisticState {
  const current = state.winches[id];
  if (!current) return state;
  return { ...state, notice: null, winches: { ...state.winches, [id]: { ...current, ...winch } } };
}

/**
 * Applies a user action. Clutches and winches can only be worked at the current station (one
 * person, one place); static ropes (halyards) are not worked. Works while paused too: the
 * changes happen when time runs again.
 */
export function reduceRealistic(
  state: RealisticState,
  action: RealisticAction,
  data: BoatData = boat,
): RealisticState {
  const maxTurns = data.realisticMode.capstan.maxTurns;
  const here = (key: string): TailSpec | NoticeKey => {
    const spec = tailSpec(key, data);
    if (!spec || spec.station !== state.station) return 'notHere';
    if (!spec.controlId) return 'staticRope';
    return spec;
  };
  const winchHere = (id: string) =>
    stationWinch(state.station, data) === id ? state.winches[id] : undefined;

  switch (action.type) {
    case 'station':
      return action.station === state.station
        ? state
        : { ...state, station: action.station, notice: null, pull: null };
    case 'clutch': {
      const spec = here(action.key);
      if (typeof spec === 'string') return withNotice(state, spec, action.key);
      const open = Object.fromEntries(
        Object.entries(state.open).filter(([key]) => key !== action.key),
      );
      if (action.open) open[action.key] = true;
      return { ...state, open, notice: null };
    }
    case 'onWinch': {
      const spec = here(action.key);
      if (typeof spec === 'string') return withNotice(state, spec, action.key);
      const id = spec.winchId;
      const winch = winchHere(id);
      if (!winch) return withNotice(state, 'notHere', action.key);
      if (winch.tail === action.key) return state;
      if (winch.tail) return withNotice(state, 'winchBusy', action.key);
      const next = setWinch(state, id, { ...emptyWinch(), tail: action.key });
      return { ...next, pull: next.pull === action.key ? null : next.pull };
    }
    case 'offWinch': {
      const winch = winchHere(action.winch);
      if (!winch?.tail) return withNotice(state, 'winchEmpty', null);
      const { drumAngle } = winch;
      return setWinch(state, action.winch, { ...emptyWinch(), drumAngle });
    }
    case 'turn': {
      const winch = winchHere(action.winch);
      if (!winch?.tail) return withNotice(state, 'winchEmpty', null);
      const turns = Math.max(-maxTurns, Math.min(maxTurns, winch.turns + action.delta));
      if (turns === winch.turns) return state;
      // Taking the last turn off lets the tail out of the jaw.
      return setWinch(state, action.winch, { turns, selfTailer: winch.selfTailer && turns !== 0 });
    }
    case 'selfTailer': {
      const winch = winchHere(action.winch);
      if (!winch?.tail) return withNotice(state, 'winchEmpty', null);
      if (action.into && winch.turns === 0) return withNotice(state, 'needTurns', winch.tail);
      return setWinch(state, action.winch, { selfTailer: action.into });
    }
    case 'button': {
      const winch = winchHere(action.winch);
      if (!winch) return action.held ? withNotice(state, 'notHere', null) : state;
      if (winch.button === action.held) return state;
      // Letting go resets the motor's cut-out.
      return setWinch(state, action.winch, {
        button: action.held,
        cutOut: action.held && winch.cutOut,
      });
    }
    case 'ease': {
      const spec = here(action.key);
      if (typeof spec === 'string') return withNotice(state, spec, action.key);
      // PT-15: a closed clutch holds; the rope cannot be let out through it.
      if (!state.open[action.key]) return withNotice(state, 'clutchClosed', action.key);
      const winch = winchOf(state, action.key);
      if (winch && state.winches[winch]?.selfTailer) {
        return withNotice(state, 'inSelfTailer', action.key);
      }
      const ahead = Math.min(MAX_EASE_AHEAD_M, (state.ease[action.key] ?? 0) + action.metres);
      return { ...state, ease: { ...state.ease, [action.key]: ahead }, notice: null };
    }
    case 'pull': {
      if (action.key === null) return state.pull === null ? state : { ...state, pull: null };
      const spec = here(action.key);
      if (typeof spec === 'string') return withNotice(state, spec, action.key);
      if (winchOf(state, action.key)) return withNotice(state, 'onWinch', action.key);
      return { ...state, pull: action.key, notice: null };
    }
    case 'clearNotice':
      return state.notice ? { ...state, notice: null } : state;
  }
}

/** The pull that tries to run a rope end out (newtons), from the solved rig (Phase 1 estimates). */
function ropePullN(spec: TailSpec, controls: Controls, rig: RigState, data: BoatData): number {
  const loads = data.realisticMode.loads;
  const fixed = (loads.fixedN as Record<string, number | undefined>)[spec.ropeId] ?? 0;
  const windy = controls.ctl_wind_speed >= data.visual.solver.minWindKn;
  const byState = (status: RopeStatus, taut: number) =>
    status.state === 'fighting' ? loads.fightingN : status.state === 'taut' ? taut : 0;
  const wind = controls.ctl_wind_speed;
  switch (spec.ropeId) {
    case 'rope_mainsheet': {
      const s = rig.solution;
      const area = data.sails.main.officialAreaM2 * (rig.applied.mainFurl / 100) * s.fill;
      const purchase = 2 * data.rig.mainsheet.partsPerSide;
      return byState(s.mainsheet, sheetLoadAtSailN(area, wind, data) / purchase);
    }
    case 'rope_jib_sheet': {
      const j = rig.jibSolution;
      const area = data.sails.jib.officialAreaM2 * j.unfurled * j.fill;
      return byState(j.sheet, sheetLoadAtSailN(area, wind, data) / data.sails.jib.sheet.purchase);
    }
    case 'rope_vang':
      return byState(rig.solution.vang, fixed);
    case 'rope_topping_lift':
      return byState(rig.solution.toppingLift, fixed);
    default:
      // Furling lines: the wind tries to unroll the sail, pulling the "in" end (and JIB ROLL)
      // out. The "out" end and the outhaul have nothing pulling them out.
      return spec.payOutSign > 0 && windy && spec.controlId && controls[spec.controlId] < 100
        ? fixed
        : 0;
  }
}

/** What resists hauling a rope end in (newtons): its pull, or (out tail, outhaul) its own load. */
function ropeResistN(spec: TailSpec, pull: number, data: BoatData): number {
  if (spec.payOutSign > 0) return pull;
  return (data.realisticMode.loads.fixedN as Record<string, number | undefined>)[spec.ropeId] ?? 0;
}

/** Is the control at the end hauling this tail moves it to (fully hauled, or fully unfurled)? */
function atHaulEnd(spec: TailSpec, value: number): boolean {
  return spec.payOutSign > 0 ? value <= 0 : value >= 100;
}

interface TailWork {
  spec: TailSpec;
  winchId: string | null;
  winch: WinchState | null;
  open: boolean;
  /** Free to run out: clutch open, not on a winch, not in a hand. */
  free: boolean;
  pull: number;
  resist: number;
  hold: number;
  /** Rope speed out (+) or in (−), m/s, before group rules. */
  out: number;
  haul: number;
  motion: TailMotion;
  note: TailNote | null;
  blockers: string[];
  haulLoad: number;
}

/** Jib out (%) the jib sheet lets the furl reach: 0 when released (PT-13). */
function jibFurlFloor(sheetPct: number, data: BoatData): number {
  if (jibSheetReleased(sheetPct, data)) return 0;
  return minUnfurledFor(availableJibSheet(sheetPct, data), data) * 100;
}

/** The least jib sheet (% eased) that lets the jib furl to `jibOutPct` (100 = released). */
function jibSheetForFurl(sheetPct: number, jibOutPct: number, data: BoatData): number {
  if (jibFurlFloor(sheetPct, data) <= jibOutPct) return sheetPct;
  const released = data.sails.jib.sheet.releasedAtPct;
  let lo = sheetPct;
  let hi = released;
  // Just below "released" the sheet may still be too short: then it runs out all the way.
  if (jibFurlFloor(released - 1e-6, data) > jibOutPct) return released;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (jibFurlFloor(mid, data) <= jibOutPct) hi = mid;
    else lo = mid;
  }
  return hi;
}

export interface RealisticStep {
  state: RealisticState;
  /** New control values for ropes that moved. */
  values: Partial<Controls>;
}

/**
 * Advances Realistic mode by `dt` seconds (0 while paused: reports only, nothing moves).
 * Loads come from the rig as solved for the current controls.
 */
export function stepRealistic(
  state: RealisticState,
  controls: Controls,
  rig: RigState,
  dt: number,
  data: BoatData = boat,
): RealisticStep {
  const rm = data.realisticMode;
  const friction = rm.loads.ropeFrictionN;
  const hand = rm.hand;

  // 1. Each rope end on its own: what pulls it, what holds it, what the user does with it.
  const work = new Map<string, TailWork>();
  for (const spec of tailSpecs(data)) {
    if (!spec.controlId) continue;
    const winchId = winchOf(state, spec.key);
    const winch = winchId ? (state.winches[winchId] ?? null) : null;
    const open = state.open[spec.key] === true;
    const easing = (state.ease[spec.key] ?? 0) > 0;
    const pulling = state.pull === spec.key;
    const pull = ropePullN(spec, controls, rig, data);
    const hold = winch
      ? holdingForceN(winch.turns, winch.selfTailer ? 'selfTailer' : 'hand', data)
      : easing || pulling
        ? tailForceN('hand', data)
        : 0;
    work.set(spec.key, {
      spec,
      winchId,
      winch,
      open,
      free: open && !winch && !pulling && !easing,
      pull,
      resist: ropeResistN(spec, pull, data),
      hold,
      out: 0,
      haul: 0,
      motion: 'held',
      note: null,
      blockers: [],
      haulLoad: 0,
    });
  }

  // 2. Furls that something blocks: the other ends must run out freely (PHASE1_SPEC 7.2.2).
  const blockersFor = (group: Group, hauled: TailWork): string[] => {
    // Hauling a +1 end (the "in" tail) furls: every −1 end must pay out. Hauling a −1 end
    // unfurls: every other +1 end must pay out.
    const mustRun = group.tails.filter((t) =>
      hauled.spec.payOutSign > 0 ? t.payOutSign < 0 : t.payOutSign > 0 && t.key !== hauled.spec.key,
    );
    return mustRun.filter((t) => !work.get(t.key)?.free).map((t) => t.key);
  };

  for (const group of groups(data)) {
    for (const spec of group.tails) {
      const w = work.get(spec.key);
      if (!w) continue;
      const value = controls[group.controlId];
      let haulLoad = w.resist;
      let note: TailNote | null = null;
      if (w.pull >= rm.loads.fightingN) {
        note = 'cutOutFighting';
      } else if (atHaulEnd(spec, value)) {
        haulLoad = rm.loads.fightingN;
        note = 'cutOutEnd';
      } else if (group.kind === 'linked') {
        const blockers = blockersFor(group, w);
        if (blockers.length > 0) {
          haulLoad = rm.loads.fightingN;
          note = 'cutOutBlocked';
          w.blockers = blockers;
        }
      }
      // The jib furl needs the jib sheet to run out (PT-13).
      if (group.controlId === 'ctl_jib_furl' && note === null) {
        const floor = jibFurlFloor(controls.ctl_jib_sheet, data);
        const sheet = tailSpecs(data).find((t) => t.controlId === 'ctl_jib_sheet');
        const sheetFree = sheet ? work.get(sheet.key)?.free === true : false;
        if (value <= floor + 1e-6 && !sheetFree && sheet) {
          haulLoad = rm.loads.fightingN;
          note = 'cutOutBlocked';
          w.blockers = [sheet.key];
        }
      }
      w.haulLoad = haulLoad;

      // Running: the pull beats what holds the tail (PT-16, PT-17, PT-18).
      if (w.open && runsOut(w.pull, w.hold, data) && value < 100) {
        w.out = runningSpeedMps(w.pull, w.hold, data);
        w.motion = 'running';
        w.note = w.winch ? (w.winch.turns < 0 ? 'wrongWay' : 'slipping') : null;
        continue;
      }
      // Easing by hand: the tail is let out (the hand on it, or on the winch out of the jaw).
      const easeM = state.ease[spec.key] ?? 0;
      if (easeM > 0 && w.open && !w.winch?.selfTailer) {
        if (value >= 100) {
          w.note = 'fullyEased';
        } else if (w.pull <= friction) {
          w.note = 'noLoad';
          w.motion = 'slack';
        } else {
          const smooth = easesSmoothly(w.pull, w.winch?.turns ?? 0, data);
          // Too many turns: the rope sticks, then surges (moves for part of each period).
          const phase = (rig.timeS % hand.grabbyPeriodS) / hand.grabbyPeriodS;
          const moving = smooth || phase < hand.grabbyMoveFraction;
          const speed = smooth
            ? hand.easeMaxSpeedMps
            : hand.easeMaxSpeedMps / hand.grabbyMoveFraction;
          w.out = moving ? Math.min(speed, dt > 0 ? easeM / dt : speed) : 0;
          w.motion = 'easing';
          w.note = smooth ? null : 'grabby';
        }
        continue;
      }
      // Hauling with the electric winch (button held).
      if (w.winch?.button) {
        if (w.winch.turns <= 0) {
          w.note = w.winch.turns < 0 ? 'wrongWay' : 'noTurns';
        } else if (motorCutOut(haulLoad, w.winch.cutOut, data)) {
          w.note = note ?? 'cutOutLoad';
        } else if (w.hold < haulLoad) {
          w.note = 'slipping';
        } else {
          w.haul = winchSpeedMps(haulLoad, false, data);
          w.motion = 'hauling';
        }
        continue;
      }
      // Pulling in by hand (off the winch): only a light rope.
      if (state.pull === spec.key) {
        if (note !== null && note !== 'cutOutFighting') w.note = note;
        else if (haulLoad > rm.capstan.handPullN) w.note = 'tooHeavy';
        else {
          w.haul = hand.pullSpeedMps;
          w.motion = 'hauling';
        }
        continue;
      }
      w.motion = w.winch || !w.open ? 'held' : w.pull > 0 ? 'held' : 'loose';
    }
  }

  // 3. Combine the ends of each control into its new value.
  const values: Partial<Controls> = {};
  const moved = new Map<string, number>();
  for (const group of groups(data)) {
    const id = group.controlId;
    const value = controls[id];
    let next: number;
    const tails = group.tails.map((t) => work.get(t.key)).filter((w): w is TailWork => !!w);
    if (group.kind === 'twoEnds') {
      // One rope, two ends: the rope out at either end adds up.
      const metres = tails.reduce((sum, w) => sum + (w.out - w.haul) * dt, 0);
      next = value + metres / (tails[0]?.spec.metresPerPct ?? 1);
    } else {
      // Linked ends (one rope, or ends that work against each other): the fastest driver wins
      // in each direction; a driver whose other ends cannot follow does not move.
      let up = 0;
      let down = 0;
      for (const w of tails) {
        const rate = (w.out - w.haul) * w.spec.payOutSign; // m/s in the control's direction
        const pct = rate / w.spec.metresPerPct;
        if (w.haul > 0 && w.blockers.length > 0) continue;
        if (pct > 0) {
          // Unfurling by hauling a −1 end needs the +1 ends free; by running, it is free.
          if (w.haul > 0 && blockersFor(group, w).length > 0) continue;
          up = Math.max(up, pct);
        } else if (pct < 0) down = Math.max(down, -pct);
      }
      next = value + (up - down) * dt;
    }
    next = Math.min(100, Math.max(0, next));
    if (id === 'ctl_jib_furl' && next < value) {
      // Furling the jib pulls the jib sheet out if it is free; otherwise the furl stops.
      const sheetSpec = tailSpecs(data).find((t) => t.controlId === 'ctl_jib_sheet');
      const sheetFree = sheetSpec ? work.get(sheetSpec.key)?.free === true : false;
      const sheet = values.ctl_jib_sheet ?? controls.ctl_jib_sheet;
      if (sheetFree) {
        const needed = jibSheetForFurl(sheet, next, data);
        if (needed > sheet) values.ctl_jib_sheet = needed;
      } else {
        next = Math.max(next, Math.min(value, jibFurlFloor(sheet, data)));
      }
    }
    if (next !== value) {
      values[id] = next;
      moved.set(id, next - value);
    }
  }

  // 4. Winches and hand state for the next step; reports for the panel.
  const winches: Record<string, WinchState> = {};
  const spin = rm.electricWinch.spinTimeS;
  const radius = data.modelDetail.winch.diameter / 2;
  for (const [id, winch] of Object.entries(state.winches)) {
    const w = winch.tail ? work.get(winch.tail) : undefined;
    // With no turns the right way the rope does not grip: the motor turns freely.
    const load = w && winch.turns > 0 ? w.haulLoad : 0;
    const cutOut = winch.button && motorCutOut(load, winch.cutOut, data);
    // The drum: driven by the motor; a rope running out with the wrong-way turns spins it.
    let target = winch.button && !cutOut ? winchSpeedMps(load, false, data) : 0;
    if (w && w.motion === 'running' && winch.turns < 0) target = w.out;
    const drumSpeed =
      spin > 0 && dt > 0 ? target + (winch.drumSpeed - target) * Math.exp(-dt / spin) : target;
    const drumAngle = (winch.drumAngle + (((drumSpeed * dt) / radius) * 180) / Math.PI) % 360;
    winches[id] = { ...winch, cutOut, drumSpeed, drumAngle };
  }

  const ease: Record<string, number> = {};
  for (const [key, metres] of Object.entries(state.ease)) {
    const w = work.get(key);
    if (!w || !w.open || w.note === 'noLoad' || w.note === 'fullyEased') continue;
    const left = metres - (w.motion === 'easing' || w.motion === 'running' ? w.out * dt : 0);
    if (left > 1e-6) ease[key] = left;
  }

  const reports: Record<string, TailReport> = {};
  for (const [key, w] of work) {
    const changed = w.spec.controlId ? (moved.get(w.spec.controlId) ?? 0) : 0;
    // A driver that the group rules stopped does not move: report it as held.
    const moving = changed !== 0 || dt === 0;
    let motion = w.motion;
    if (!moving && (motion === 'running' || motion === 'easing' || motion === 'hauling')) {
      motion = 'held';
    }
    reports[key] = {
      loadN: w.pull,
      haulLoadN: w.haulLoad,
      holdN: w.open ? w.hold : Infinity,
      motion,
      speedMps: moving ? w.out - w.haul : 0,
      note: w.note,
      blockers: w.blockers,
    };
  }

  return { state: { ...state, winches, ease, reports }, values };
}

/** Tail keys whose rope is running out now, per station (for the alerts strip). */
export function runningTails(state: RealisticState, data: BoatData = boat): TailSpec[] {
  return tailSpecs(data).filter((spec) => state.reports[spec.key]?.motion === 'running');
}

/** Rope ids running out now (their 3D rope flashes). */
export function runningRopes(state: RealisticState, data: BoatData = boat): Set<string> {
  return new Set(runningTails(state, data).map((spec) => spec.ropeId));
}
