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
import type { WinchWrap } from './ropePaths';
import type { RigState } from './sim';
import {
  easesSmoothly,
  gearboxLinePerTurnM,
  gearboxPowerRatio,
  handleForceN,
  handlePowerRatio,
  handleStalls,
  handleTurnsPerS,
  holdingForceN,
  motorCutOut,
  ropePerHandleTurnM,
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
 *
 * M4c adds the one winch handle: it lies at one station at a time, is carried by the user, and
 * fits the socket on top of a winch (a manual backup with two gears, PT-19) or the in-mast
 * furling gearbox at the Mast station (rolls the main in or out by hand). Every winch reports
 * its strain (the load against the motor's cut-out, or the handle force against what a person
 * can push).
 */

export const STATION_IDS = ['port', 'starboard', 'helm', 'mast'] as const;
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
  gearbox?: string;
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
  /**
   * Strain while the winch works (button held or handle cranked): the load as a fraction of the
   * limit (1 = at the limit, can be more); null while it is not working (M4c strain bar).
   */
  strain: number | null;
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
  | 'fullyEased'
  /** Cranked with the handle (M4c): too heavy in 1st gear, or even in 2nd. */
  | 'stallFirst'
  | 'stallSecond'
  /** Cranked with the handle against a hard stop: fighting rope, rope fully in, furl blocked. */
  | 'stuckFighting'
  | 'stuckEnd'
  | 'stuckBlocked';

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
  /** Keys of the clutches that block a furl (cutOutBlocked, stuckBlocked). */
  blockers: string[];
}

/** Where the winch handle is: lying at a station, carried by the user, or in a socket there. */
export type HandlePlace = 'stowed' | 'carried' | 'socket';

export interface HandleState {
  /** The station it is at (when carried: where the user stands). */
  station: StationId;
  place: HandlePlace;
  /** How fast the user is cranking it, handle turns per second (+ clockwise, − anticlockwise). */
  crank: number;
  /** Handle rotation, degrees clockwise seen from above; drawing only. */
  angle: number;
}

/** The IN/OUT switch of the mast furling gearbox. */
export type GearboxSwitch = 'in' | 'out';

/** Why the handle does not turn (shown in the handle's line). */
export type HandleNote =
  | 'stallFirst'
  | 'stallSecond'
  | 'stallGearbox'
  | 'stuckFighting'
  | 'stuckEnd'
  | 'stuckBlocked'
  | 'gearboxIn'
  | 'gearboxOut'
  | 'noRope'
  | 'noTurns'
  | 'wrongWay'
  | 'slipping';

/** What cranking the handle does now (M4c), while the user cranks it. */
export interface HandleReport {
  at: 'winch' | 'gearbox';
  /** Winch gear: 1 (clockwise, fast) or 2 (anticlockwise, strong); null at the gearbox. */
  gear: 1 | 2 | null;
  /** Push needed on the handle, newtons. */
  forceN: number;
  /** Most a person can push (the handle stalls there). */
  stallN: number;
  /** Handle turns per second actually made (+ clockwise). */
  turnsPerS: number;
  /** Rope or furling line brought in, m/s (at the gearbox: furling-line equivalent). */
  speedMps: number;
  note: HandleNote | null;
  /** Clutch keys that block the furl (stuckBlocked). */
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
  | 'onWinch'
  | 'turnsOn'
  | 'handleElsewhere'
  | 'handleNotIn'
  | 'noSocket'
  | 'gearboxNotHere'
  /** A carried handle fills the hand: no line end can be worked until it is laid down (M4c). */
  | 'handleInHand'
  /** A rope wrapped the wrong way does not feed into the self-tailer (M4b review). */
  | 'wrongWayJaw'
  /** The clutch was shut on a rope running out under load: it stops, but can be damaged. */
  | 'closedOnRunning';

export interface Notice {
  key: NoticeKey;
  /** The tail it is about. */
  tail: string | null;
  /** The station it is about, when not the tail's (e.g. where the handle is). */
  station?: StationId;
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
  /** The one winch handle (M4c). */
  handle: HandleState;
  /** The mast furling gearbox's IN/OUT switch (M4c). */
  gearbox: GearboxSwitch;
  /** Latest step's report on the cranked handle, or null while nobody cranks it. */
  handleReport: HandleReport | null;
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
    strain: null,
  };
}

function isGearboxSwitch(value: string): value is GearboxSwitch {
  return value === 'in' || value === 'out';
}

/** Where the handle starts: lying at its station (a pocket), the gearbox switch as in the data. */
export function initialHandle(data: BoatData = boat): HandleState {
  const start = data.realisticMode.winchHandle.startStation;
  return { station: isStationId(start) ? start : 'port', place: 'stowed', crank: 0, angle: 0 };
}

export function initialGearbox(data: BoatData = boat): GearboxSwitch {
  const start = data.realisticMode.mastGearbox.switchStart;
  return isGearboxSwitch(start) ? start : 'out';
}

/** Everything held: clutches closed, winches empty (a link always opens like this, then setup). */
export function initialRealistic(data: BoatData = boat): RealisticState {
  const winches: Record<string, WinchState> = {};
  for (const id of winchIds(data)) winches[id] = emptyWinch();
  return {
    station: 'port',
    open: {},
    winches,
    ease: {},
    pull: null,
    reports: {},
    notice: null,
    handle: initialHandle(data),
    gearbox: initialGearbox(data),
    handleReport: null,
  };
}

/** The socket the handle fits at a station: its winch, the mast gearbox, or none (helm). */
export function socketAt(station: StationId, data: BoatData = boat): string | null {
  const entry = stationsOf(data).find((s) => s.id === station);
  return entry?.winch ?? entry?.gearbox ?? null;
}

/** The socket the handle is in (a winch id or the gearbox's part id), or null. */
export function handleSocket(state: RealisticState, data: BoatData = boat): string | null {
  return state.handle.place === 'socket' ? socketAt(state.handle.station, data) : null;
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
  /**
   * `needZeroTurns`: the gesture of dragging the rope back to its clutch. It works only when no
   * turn is left on the drum (take them off first); the button works at any time.
   */
  | { type: 'offWinch'; winch: string; needZeroTurns?: boolean }
  | { type: 'turn'; winch: string; delta: 1 | -1 }
  | { type: 'selfTailer'; winch: string; into: boolean }
  | { type: 'button'; winch: string; held: boolean }
  | { type: 'ease'; key: string; metres: number }
  | { type: 'pull'; key: string | null }
  /** The winch handle (M4c): pick it up and carry it, leave it here, or put it in the socket. */
  | { type: 'handle'; to: 'carry' | 'stow' | 'socket' }
  /** Crank the handle in its socket, turns per second (+ clockwise, − anticlockwise, 0 stop). */
  | { type: 'crank'; turnsPerS: number }
  /** The mast gearbox's IN/OUT switch. */
  | { type: 'gearbox'; to: GearboxSwitch }
  | { type: 'clearNotice' };

function withNotice(
  state: RealisticState,
  key: NoticeKey,
  tail: string | null,
  station?: StationId,
): RealisticState {
  return { ...state, notice: station ? { key, tail, station } : { key, tail } };
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

  // The hand that carries the winch handle cannot work a line end (owner, after M4c): clutches,
  // tails, turns, the self-tailer, the winch button, easing and pulling wait until the handle is
  // laid down. Letting go of a button always works.
  const lineEnd = ['clutch', 'onWinch', 'offWinch', 'turn', 'selfTailer', 'ease', 'pull'];
  const pressesButton = action.type === 'button' && action.held;
  const takesTail = action.type === 'pull' && action.key === null;
  if (
    state.handle.place === 'carried' &&
    (lineEnd.includes(action.type) || pressesButton) &&
    !takesTail
  ) {
    const key = 'key' in action ? action.key : null;
    return withNotice(state, 'handleInHand', key);
  }

  switch (action.type) {
    case 'station': {
      if (action.station === state.station) return state;
      // One person, one place: walking away lets go of the winch buttons and the tail in hand.
      const winches = Object.fromEntries(
        Object.entries(state.winches).map(([id, w]) => [
          id,
          w.button ? { ...w, button: false, cutOut: false } : w,
        ]),
      );
      // The handle goes along if carried; a handle being cranked is let go.
      const handle: HandleState = {
        ...state.handle,
        crank: 0,
        station: state.handle.place === 'carried' ? action.station : state.handle.station,
      };
      return {
        ...state,
        station: action.station,
        winches,
        notice: null,
        pull: null,
        ease: {},
        handle,
      };
    }
    case 'clutch': {
      const spec = here(action.key);
      if (typeof spec === 'string') return withNotice(state, spec, action.key);
      const open = Object.fromEntries(
        Object.entries(state.open).filter(([key]) => key !== action.key),
      );
      if (action.open) open[action.key] = true;
      // Shutting a clutch on a loaded rope that is running out stops it, but on a boat it can
      // strip the rope's cover (M4b review): it works, with a warning.
      const running = !action.open && state.reports[action.key]?.motion === 'running';
      return {
        ...state,
        open,
        notice: running ? { key: 'closedOnRunning', tail: action.key } : null,
      };
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
      if (action.needZeroTurns && winch.turns !== 0)
        return withNotice(state, 'turnsOn', winch.tail);
      const { drumAngle } = winch;
      return setWinch(state, action.winch, { ...emptyWinch(), drumAngle });
    }
    case 'turn': {
      const winch = winchHere(action.winch);
      if (!winch?.tail) return withNotice(state, 'winchEmpty', null);
      const turns = Math.max(-maxTurns, Math.min(maxTurns, winch.turns + action.delta));
      if (turns === winch.turns) return state;
      // Taking the last turn off (or wrapping it the wrong way) lets the tail out of the jaw.
      return setWinch(state, action.winch, { turns, selfTailer: winch.selfTailer && turns > 0 });
    }
    case 'selfTailer': {
      const winch = winchHere(action.winch);
      if (!winch?.tail) return withNotice(state, 'winchEmpty', null);
      if (action.into && winch.turns === 0) return withNotice(state, 'needTurns', winch.tail);
      // A rope wrapped the wrong way leaves the drum on the wrong side of the jaw.
      if (action.into && winch.turns < 0) return withNotice(state, 'wrongWayJaw', winch.tail);
      return setWinch(state, action.winch, { selfTailer: action.into });
    }
    case 'button': {
      // Letting go always works, wherever the user stands now.
      const winch = action.held ? winchHere(action.winch) : state.winches[action.winch];
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
      const ahead = Math.min(
        data.realisticMode.hand.easeAheadMaxM,
        (state.ease[action.key] ?? 0) + action.metres,
      );
      return { ...state, ease: { ...state.ease, [action.key]: ahead }, notice: null };
    }
    case 'pull': {
      if (action.key === null) return state.pull === null ? state : { ...state, pull: null };
      const spec = here(action.key);
      if (typeof spec === 'string') return withNotice(state, spec, action.key);
      if (winchOf(state, action.key)) return withNotice(state, 'onWinch', action.key);
      return { ...state, pull: action.key, notice: null };
    }
    case 'handle': {
      const handle = state.handle;
      // Only a handle here (or carried) can be picked up, left or put in.
      if (handle.place !== 'carried' && handle.station !== state.station) {
        return withNotice(state, 'handleElsewhere', null, handle.station);
      }
      if (action.to === 'socket' && !socketAt(state.station, data)) {
        return withNotice(state, 'noSocket', null, state.station);
      }
      const place: HandlePlace =
        action.to === 'carry' ? 'carried' : action.to === 'stow' ? 'stowed' : 'socket';
      if (place === handle.place && handle.station === state.station) return state;
      // Picking the handle up takes the hand off whatever it was doing: a winch button pressed,
      // rope being eased or pulled in.
      const winches = Object.fromEntries(
        Object.entries(state.winches).map(([id, w]) => [
          id,
          place === 'carried' && w.button ? { ...w, button: false, cutOut: false } : w,
        ]),
      );
      return {
        ...state,
        notice: null,
        winches,
        ease: place === 'carried' ? {} : state.ease,
        pull: place === 'carried' ? null : state.pull,
        handle: { ...handle, station: state.station, place, crank: 0 },
      };
    }
    case 'crank': {
      const turnsPerS = Number.isFinite(action.turnsPerS) ? action.turnsPerS : 0;
      // Stopping always works.
      if (turnsPerS === 0) {
        return state.handle.crank === 0
          ? state
          : { ...state, handle: { ...state.handle, crank: 0 } };
      }
      const handle = state.handle;
      if (handle.place !== 'carried' && handle.station !== state.station) {
        return withNotice(state, 'handleElsewhere', null, handle.station);
      }
      if (handle.place !== 'socket') return withNotice(state, 'handleNotIn', null, state.station);
      if (handle.crank === turnsPerS) return state;
      return { ...state, notice: null, handle: { ...handle, crank: turnsPerS } };
    }
    case 'gearbox': {
      if (!stationsOf(data).some((s) => s.id === state.station && s.gearbox)) {
        const mast = stationsOf(data).find((s) => s.gearbox)?.id;
        return withNotice(
          state,
          'gearboxNotHere',
          null,
          mast && isStationId(mast) ? mast : undefined,
        );
      }
      return state.gearbox === action.to ? state : { ...state, gearbox: action.to, notice: null };
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

/** The main's pull by the sheet-rule estimate (newtons at the clew; 0 when luffing or furled). */
function mainSailLoadN(controls: Controls, rig: RigState, data: BoatData): number {
  const area = data.sails.main.officialAreaM2 * (rig.applied.mainFurl / 100) * rig.solution.fill;
  return sheetLoadAtSailN(area, controls.ctl_wind_speed, data);
}

/**
 * What resists hauling a rope end in (newtons): its pull, or (out tail, outhaul) its own load.
 * The main's "in" furling tail also feels part of the main's load while it still pulls (M4c):
 * rolling a loaded main in is hard.
 */
function ropeResistN(
  spec: TailSpec,
  pull: number,
  controls: Controls,
  rig: RigState,
  data: BoatData,
): number {
  const loads = data.realisticMode.loads;
  if (spec.payOutSign > 0) {
    if (spec.ropeId !== 'rope_main_furling_line') return pull;
    return pull + loads.mainFurlSailLoadFraction * mainSailLoadN(controls, rig, data);
  }
  return (loads.fixedN as Record<string, number | undefined>)[spec.ropeId] ?? 0;
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
      resist: ropeResistN(spec, pull, controls, rig, data),
      hold,
      out: 0,
      haul: 0,
      motion: 'held',
      note: null,
      blockers: [],
      haulLoad: 0,
    });
  }

  // The handle, if someone cranks it in a socket here (M4c).
  const socket = handleSocket(state, data);
  const crank = state.handle.crank;
  const cranking = socket !== null && crank !== 0;
  const handleSpec = data.realisticMode.winchHandle;
  let handleReport: HandleReport | null = null;
  /** Handle turns per second actually made (drawing and reports). */
  let handleTurns = 0;

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
      // Cranking the winch with the handle (M4c, PT-19): both directions haul the rope in,
      // clockwise in 1st gear (fast, weak), anticlockwise in 2nd (slow, strong).
      if (w.winch && cranking && socket === w.winchId) {
        const gear = crank > 0 ? 1 : 2;
        const ratio = handlePowerRatio(crank, data);
        const stallN = handleSpec.stallForceN;
        const stuck =
          note === 'cutOutFighting'
            ? 'stuckFighting'
            : note === 'cutOutEnd'
              ? 'stuckEnd'
              : note === 'cutOutBlocked'
                ? 'stuckBlocked'
                : null;
        const force = stuck ? stallN : handleForceN(haulLoad, ratio);
        let handleNote: HandleNote | null = null;
        if (w.winch.turns <= 0) {
          handleNote = w.winch.turns < 0 ? 'wrongWay' : 'noTurns';
          w.note = handleNote;
        } else if (stuck) {
          handleNote = stuck;
          w.note = stuck;
        } else if (handleStalls(force, data)) {
          handleNote = gear === 1 ? 'stallFirst' : 'stallSecond';
          w.note = handleNote;
        } else if (w.hold < haulLoad) {
          handleNote = 'slipping';
          w.note = 'slipping';
        } else {
          const turns = Math.min(Math.abs(crank), handleTurnsPerS(force, data));
          handleTurns = Math.sign(crank) * turns;
          w.haul = turns * ropePerHandleTurnM(ratio, data);
          w.motion = 'hauling';
        }
        handleReport = {
          at: 'winch',
          gear,
          forceN: force,
          stallN,
          turnsPerS: handleTurns,
          speedMps: w.haul,
          note: handleNote,
          blockers: handleNote === 'stuckBlocked' ? w.blockers : [],
        };
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

  // The mast gearbox (M4c): the handle turns the furling mandrel the way the switch says. It
  // works like hauling the matching furling tail, so the ends that pay out must run free.
  const gearbox = rm.mastGearbox;
  /** Rate the gearbox drives its control at, % per second (0 when it does not move). */
  let gearboxRate = 0;
  if (cranking && socket === gearbox.partId) {
    const group = groups(data).find((g) => g.controlId === gearbox.controlId);
    const value = isControlId(gearbox.controlId) ? controls[gearbox.controlId] : 0;
    const rollIn = state.gearbox === 'in';
    // Rolling in hauls the +1 ends (the "in" tail); rolling out the −1 ends ("out" tail, outhaul).
    const drivers = (group?.tails ?? [])
      .filter((t) => (rollIn ? t.payOutSign > 0 : t.payOutSign < 0))
      .map((t) => work.get(t.key))
      .filter((w): w is TailWork => !!w);
    const mustRun = (group?.tails ?? []).filter((t) =>
      rollIn ? t.payOutSign < 0 : t.payOutSign > 0,
    );
    const blockers = mustRun.filter((t) => !work.get(t.key)?.free).map((t) => t.key);
    const load = Math.max(0, ...drivers.map((w) => w.resist));
    const stallN = handleSpec.stallForceN;
    const atEnd = rollIn ? value <= 0 : value >= 100;
    const force = blockers.length > 0 ? stallN : handleForceN(load, gearboxPowerRatio(data));
    let handleNote: HandleNote | null = null;
    let speed = 0;
    if (atEnd) handleNote = rollIn ? 'gearboxIn' : 'gearboxOut';
    else if (blockers.length > 0) handleNote = 'stuckBlocked';
    else if (handleStalls(force, data)) handleNote = 'stallGearbox';
    else {
      const turns = Math.min(Math.abs(crank), handleTurnsPerS(force, data));
      handleTurns = Math.sign(crank) * turns;
      speed = turns * gearboxLinePerTurnM(data);
      // handleTurnsFullFurl turns take the main from fully out (100 %) to fully in (0 %).
      gearboxRate = ((rollIn ? -1 : 1) * turns * 100) / gearbox.handleTurnsFullFurl;
    }
    handleReport = {
      at: 'gearbox',
      gear: null,
      forceN: atEnd ? 0 : force,
      stallN,
      turnsPerS: handleTurns,
      speedMps: speed,
      note: handleNote,
      blockers: handleNote === 'stuckBlocked' ? blockers : [],
    };
  }
  // A handle cranked on a winch with no rope on the drum: it turns freely.
  const socketWinch = socket ? state.winches[socket] : undefined;
  if (cranking && socketWinch && !socketWinch.tail) {
    const ratio = handlePowerRatio(crank, data);
    const turns = Math.min(Math.abs(crank), handleSpec.maxTurnsPerS);
    handleTurns = Math.sign(crank) * turns;
    handleReport = {
      at: 'winch',
      gear: crank > 0 ? 1 : 2,
      forceN: 0,
      stallN: handleSpec.stallForceN,
      turnsPerS: handleTurns,
      speedMps: turns * ropePerHandleTurnM(ratio, data),
      note: 'noRope',
      blockers: [],
    };
  }

  // 3. Combine the ends of each control into its new value.
  const values: Partial<Controls> = {};
  const moved = new Map<string, number>();
  for (const group of groups(data)) {
    const id = group.controlId;
    const value = controls[id];
    let next: number;
    const tails = group.tails.map((t) => work.get(t.key)).filter((w): w is TailWork => !!w);
    if (gearboxRate !== 0 && id === gearbox.controlId) {
      // The gearbox turns the mandrel: the furling tails and the outhaul follow it.
      next = value + gearboxRate * dt;
    } else if (group.kind === 'twoEnds') {
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
    const cranked = cranking && socket === id && !winch.button;
    // The drum: driven by the motor or the handle (both clockwise); a rope running out with the
    // wrong-way turns spins it.
    let target = winch.button && !cutOut ? winchSpeedMps(load, false, data) : 0;
    if (cranked && handleReport) target = handleReport.speedMps;
    if (w && w.motion === 'running' && winch.turns < 0) target = w.out;
    const drumSpeed =
      spin > 0 && dt > 0 ? target + (winch.drumSpeed - target) * Math.exp(-dt / spin) : target;
    const drumAngle = (winch.drumAngle + (((drumSpeed * dt) / radius) * 180) / Math.PI) % 360;
    // Strain (M4c): the motor's load against its cut-out, or the handle force against a push.
    const strain = winch.button
      ? load / rm.electricWinch.cutOutLoadN
      : cranked && handleReport
        ? handleReport.forceN / handleReport.stallN
        : null;
    winches[id] = { ...winch, cutOut, drumSpeed, drumAngle, strain };
  }
  const handle: HandleState =
    handleTurns !== 0 && dt > 0
      ? { ...state.handle, angle: (state.handle.angle + handleTurns * 360 * dt) % 360 }
      : state.handle;

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
    // While the gearbox turns the mandrel, the furling ends just follow it.
    const byGearbox = gearboxRate !== 0 && w.spec.controlId === gearbox.controlId;
    if (
      (!moving || byGearbox) &&
      (motion === 'running' || motion === 'easing' || motion === 'hauling')
    ) {
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

  return { state: { ...state, winches, ease, reports, handle, handleReport }, values };
}

/** Tail keys whose rope is running out now, per station (for the alerts strip). */
/**
 * The ropes on the winches, for the 3D view (M5): each winch's tail with its turns and where its
 * end is (self-tailer or hand).
 */
export function winchWraps(state: RealisticState, data: BoatData = boat): WinchWrap[] {
  const wraps: WinchWrap[] = [];
  for (const [winchId, winch] of Object.entries(state.winches)) {
    const spec = winch.tail ? tailSpec(winch.tail, data) : undefined;
    if (!spec) continue;
    wraps.push({
      winchId,
      ropeId: spec.ropeId,
      tail: spec.tail,
      turns: winch.turns,
      selfTailer: winch.selfTailer,
    });
  }
  return wraps;
}

export function runningTails(state: RealisticState, data: BoatData = boat): TailSpec[] {
  return tailSpecs(data).filter((spec) => state.reports[spec.key]?.motion === 'running');
}

/** Rope ids running out now (their 3D rope flashes). */
export function runningRopes(state: RealisticState, data: BoatData = boat): Set<string> {
  return new Set(runningTails(state, data).map((spec) => spec.ropeId));
}
