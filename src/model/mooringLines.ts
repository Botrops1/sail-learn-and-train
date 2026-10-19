import { area, type AreaData } from './area';
import { boat as hanse508, type BoatData } from './boat';
import type { EngineState } from './engine';
import type { HarbourState } from './harbour';
import {
  addForces,
  forceAt,
  NO_FORCES,
  pointToMap,
  pointVelocity,
  vectorToBoat,
  type ExternalForces,
} from './lowSpeed';
import { marinaGeometry, type MarinaGeometry } from './marina';
import { cleatPlaces } from './mooringFittings';
import type { BoatState } from './motion';

/**
 * Mooring lines (M44, M45, PHASE7_SPEC 10.3, 11.3). In the marina, Mediterranean stern-to: two
 * stern lines to the rings on the quay and the lazy line from the quay's weight on the bottom to
 * a bow cleat. In the bay: a bow line to a mooring buoy and a shore line from the stern to a ring
 * on the rocks. A line is a spring that pulls only when it is stretched. Marina lines go only to
 * our own berth, so their far ends are fixed by the marina's geometry. Pure.
 */
export type LineCode = 'sp' | 'ss' | 'll' | 'bl' | 'sl';

/** The codes in the order the link and the Harbour gear section list them. */
export const LINE_CODES: readonly LineCode[] = ['sp', 'ss', 'll', 'bl', 'sl'];

/** The lines of each place, in the order the Harbour gear section lists them. */
export const MARINA_LINE_CODES: readonly LineCode[] = ['sp', 'ss', 'll'];
export const BAY_LINE_CODES: readonly LineCode[] = ['bl', 'sl'];

export function isLineCode(value: string): value is LineCode {
  return (LINE_CODES as readonly string[]).includes(value);
}

/** Where a line's far end is: east, north, and the height above the water (negative = on the bottom). */
export interface FarEnd {
  eastM: number;
  northM: number;
  heightM: number;
}

export type CleatId = `cleat_${'bow' | 'mid' | 'stern'}_${'port' | 'starboard'}`;

export interface MooringLine {
  code: LineCode;
  cleatId: CleatId;
  far: FarEnd;
  /** Unstretched length, metres; the line pulls when the ends are further apart than this. */
  lengthM: number;
  /** The index of the buoy (`bl`) or the ring (`sl`) in the bay; −1 for the marina's lines. */
  farIndex: number;
}

export interface CrewTask {
  kind: 'walkLazy' | 'swimShore';
  code: LineCode;
  remainingS: number;
  /** `swimShore`: the ring and the stern cleat, fixed when the task starts. */
  ringIndex?: number;
  cleatId?: CleatId;
}

export interface LinesState {
  /** In the order sp, ss, ll. */
  lines: readonly MooringLine[];
  crew: CrewTask | null;
  /** A line is wound round the propeller and the engine has stopped. Not in the link. */
  fouled: boolean;
  /** Seconds the engine has run in gear with a line slack in the water. Not in the link. */
  foulS: number;
}

export const NO_LINES: Readonly<LinesState> = { lines: [], crew: null, fouled: false, foulS: 0 };

export interface LinesInputs {
  lines: LinesState;
  boat: BoatState;
  harbour: HarbourState;
  geometry: MarinaGeometry;
  engine: EngineState;
  /** The buoys and rings of the bay (M45). */
  area: AreaData;
}

const ROLES = ['bow', 'mid', 'stern'] as const;

/** Float noise allowed when a time or a tension is compared with its limit. */
const EPS = 1e-9;

/** A line this close to `crewPullN` counts as hand tight (the length that gives it is found with float noise). */
const HAND_TIGHT_TOLERANCE_N = 1e-3;

/** A cleat's point in the boat frame (x, y, z): `cleatPlaces()[index].base`, index as PHASE7_SPEC 4.1. */
export function cleatPoint(id: CleatId, data: BoatData = hanse508): [number, number, number] {
  let byId = cleatCache.get(data);
  if (!byId) cleatCache.set(data, (byId = new Map()));
  const found = byId.get(id);
  if (found) return found;
  const [, role, side] = id.split('_') as ['cleat', (typeof ROLES)[number], 'port' | 'starboard'];
  const place = cleatPlaces(data)[ROLES.indexOf(role) * 2 + (side === 'port' ? 1 : 0)];
  if (!place) throw new Error(`No cleat ${id}.`);
  const point: [number, number, number] = [place.base[0], place.base[1], place.base[2]];
  byId.set(id, point);
  return point;
}

/** The cleats are found every substep, so each point is worked out once per boat file. */
const cleatCache = new WeakMap<BoatData, Map<CleatId, [number, number, number]>>();

/** Where the cleat is on the map and above the water: east, north, height. */
function cleatInMap(
  boat: BoatState,
  cleatId: CleatId,
  data: BoatData,
): { east: number; north: number; height: number; x: number; z: number } {
  const [x, y, z] = cleatPoint(cleatId, data);
  const [east, north] = pointToMap(boat, x, z);
  return { east, north, height: y, x, z };
}

/** How hard a line pulls now (N, ≥ 0) and the 3D distance between its ends (m). */
export function lineTension(
  line: MooringLine,
  boat: BoatState,
  data: BoatData = hanse508,
): { tensionN: number; distanceM: number } {
  const pull = linePull(line, boat, data);
  return { tensionN: pull.tensionN, distanceM: pull.distanceM };
}

interface LinePull {
  tensionN: number;
  distanceM: number;
  /** Elastic part only (no damping): what the Tighten button and the hand-tight check use. */
  elasticN: number;
  /** The horizontal pull on the cleat, map frame (east, north), N. */
  eastN: number;
  northN: number;
  cleat: { x: number; z: number };
}

function linePull(line: MooringLine, boat: BoatState, data: BoatData): LinePull {
  const c = cleatInMap(boat, line.cleatId, data);
  const dx = line.far.eastM - c.east;
  const dy = line.far.northM - c.north;
  const dz = line.far.heightM - c.height;
  const horizontalM = Math.hypot(dx, dy);
  const distanceM = Math.hypot(horizontalM, dz);
  const cleat = { x: c.x, z: c.z };
  if (distanceM <= line.lengthM) {
    return { tensionN: 0, distanceM, elasticN: 0, eastN: 0, northN: 0, cleat };
  }
  const lines = data.physics.lines;
  const elasticN = (lines.lineEAN / line.lengthM) * (distanceM - line.lengthM);
  let tensionN = elasticN;
  let eastN = 0;
  let northN = 0;
  if (horizontalM > 0) {
    const ux = dx / horizontalM;
    const uy = dy / horizontalM;
    // How fast the cleat moves away from the far end (horizontal).
    const [ve, vn] = pointVelocity(boat, c.x, c.z, data);
    const rate = -(ve * ux + vn * uy);
    tensionN += lines.lineDampingNsPerM * Math.max(0, rate);
    const horizontalN = (tensionN * horizontalM) / distanceM;
    eastN = horizontalN * ux;
    northN = horizontalN * uy;
  }
  return { tensionN, distanceM, elasticN, eastN, northN, cleat };
}

/** The pull of every line on the boat now. */
export function lineForces(
  lines: readonly MooringLine[],
  boat: BoatState,
  data: BoatData = hanse508,
): ExternalForces {
  if (lines.length === 0) return NO_FORCES;
  const parts: ExternalForces[] = [];
  for (const line of lines) {
    const pull = linePull(line, boat, data);
    if (pull.tensionN === 0) continue;
    const [fx, fz] = vectorToBoat(pull.eastN, pull.northN, boat.headingDeg);
    parts.push(forceAt(pull.cleat.x, pull.cleat.z, fx, fz, data));
  }
  return addForces(...parts);
}

/** The stern line (or lazy line) a code stands for: its stern cleat. */
function sternCleat(code: 'sp' | 'ss'): CleatId {
  return code === 'sp' ? 'cleat_stern_port' : 'cleat_stern_starboard';
}

/** The quay ring a stern line goes to: `sp` the one nearer to the port stern cleat, `ss` the other. */
function ringFor(
  code: 'sp' | 'ss',
  boat: BoatState,
  geometry: MarinaGeometry,
  data: BoatData,
): [number, number] {
  const c = cleatInMap(boat, 'cleat_stern_port', data);
  const { west, east } = geometry.ourRings;
  const toWest = Math.hypot(west[0] - c.east, west[1] - c.north);
  const toEast = Math.hypot(east[0] - c.east, east[1] - c.north);
  const portIsWest = toWest < toEast;
  return (code === 'sp') === portIsWest ? west : east;
}

/** A quay ring as a line's far end: on the quay, `quayHeightM` above the water. */
function ringEnd(ring: [number, number]): FarEnd {
  return { eastM: ring[0], northM: ring[1], heightM: area.marina.quayHeightM };
}

function distanceToFar(boat: BoatState, cleatId: CleatId, far: FarEnd, data: BoatData): number {
  const c = cleatInMap(boat, cleatId, data);
  return Math.hypot(far.eastM - c.east, far.northM - c.north, far.heightM - c.height);
}

/** The stern line that `code` would make: its cleat, its far end and the distance now. */
function newSternLine(
  code: 'sp' | 'ss',
  inputs: LinesInputs,
  data: BoatData,
): { cleatId: CleatId; far: FarEnd; distanceM: number } {
  const cleatId = sternCleat(code);
  const far = ringEnd(ringFor(code, inputs.boat, inputs.geometry, data));
  return { cleatId, far, distanceM: distanceToFar(inputs.boat, cleatId, far, data) };
}

/** The cleat of a role (bow, stern) nearer to a point (horizontal distance; port on a tie, tolerance 1e-6). */
function nearerCleat(
  boat: BoatState,
  role: 'bow' | 'stern',
  far: { eastM: number; northM: number },
  data: BoatData,
): CleatId {
  const horizontal = (id: CleatId) => {
    const c = cleatInMap(boat, id, data);
    return Math.hypot(far.eastM - c.east, far.northM - c.north);
  };
  return horizontal(`cleat_${role}_starboard`) < horizontal(`cleat_${role}_port`) - 1e-6
    ? `cleat_${role}_starboard`
    : `cleat_${role}_port`;
}

/** The bow cleat nearer to the lazy line's weight. */
function bowCleatFor(boat: BoatState, sinker: FarEnd, data: BoatData): CleatId {
  return nearerCleat(boat, 'bow', sinker, data);
}

/** A mooring buoy of the bay as a line's far end: its ring, `buoyRingHeightM` above the water. */
function buoyEnd(areaData: AreaData, index: number): FarEnd | null {
  const buoy = areaData.bay.buoys[index];
  if (!buoy) return null;
  return { eastM: buoy[0], northM: buoy[1], heightM: areaData.bay.buoyRingHeightM };
}

/** A shore ring of the bay as a line's far end: `ringHeightM` above the water. */
function shoreRingEnd(areaData: AreaData, index: number): FarEnd | null {
  const ring = areaData.bay.rings[index];
  if (!ring) return null;
  return { eastM: ring[0], northM: ring[1], heightM: areaData.bay.ringHeightM };
}

/** The buoy nearest to the bow fitting's tip, and the horizontal distance to it. */
function nearestBuoy(
  boat: BoatState,
  areaData: AreaData,
  data: BoatData,
): { index: number; distanceM: number } | null {
  const [tipEast, tipNorth] = pointToMap(boat, data.hull.bowFittingTipX, 0);
  let best: { index: number; distanceM: number } | null = null;
  areaData.bay.buoys.forEach(([east, north], index) => {
    const distanceM = Math.hypot(east - tipEast, north - tipNorth);
    if (!best || distanceM < best.distanceM) best = { index, distanceM };
  });
  return best;
}

/** The ring nearest to a stern cleat, and the horizontal distance between them. */
function nearestRing(
  boat: BoatState,
  areaData: AreaData,
  data: BoatData,
): { index: number; distanceM: number } | null {
  const cleats = (['cleat_stern_port', 'cleat_stern_starboard'] as const).map((id) =>
    cleatInMap(boat, id, data),
  );
  let best: { index: number; distanceM: number } | null = null;
  areaData.bay.rings.forEach(([east, north], index) => {
    const distanceM = Math.min(...cleats.map((c) => Math.hypot(east - c.east, north - c.north)));
    if (!best || distanceM < best.distanceM) best = { index, distanceM };
  });
  return best;
}

/** The longest a line may be made, metres. */
function maxLength(code: LineCode, data: BoatData): number {
  const max = data.physics.lines.maxLengthM;
  switch (code) {
    case 'll':
      return max.lazy;
    case 'bl':
      return max.bow;
    case 'sl':
      return max.shore;
    default:
      return max.stern;
  }
}

function sinkerEnd(geometry: MarinaGeometry): FarEnd {
  const [eastM, northM, heightM] = geometry.ourSinker;
  return { eastM, northM, heightM };
}

function lineOf(lines: LinesState, code: LineCode): MooringLine | undefined {
  return lines.lines.find((line) => line.code === code);
}

/** The horizontal distance from a stern cleat to the ring its line would go to. */
function reachM(code: 'sp' | 'ss' | 'll', inputs: LinesInputs, data: BoatData): number {
  const gap = (stern: 'sp' | 'ss') => {
    const c = cleatInMap(inputs.boat, sternCleat(stern), data);
    const ring = ringFor(stern, inputs.boat, inputs.geometry, data);
    return Math.hypot(ring[0] - c.east, ring[1] - c.north);
  };
  return code === 'll' ? Math.min(gap('sp'), gap('ss')) : gap(code);
}

type CanTake = { ok: true } | { ok: false; reason: string; params?: Record<string, number> };

/** The bay's lines (M45, PHASE7_SPEC 11.3): the bow line to a buoy and the shore line to a ring. */
function canTakeInBay(code: 'bl' | 'sl', inputs: LinesInputs, data: BoatData): CanTake {
  const l = data.physics.lines;
  if (inputs.harbour.place !== 'bay') return { ok: false, reason: 'lines.reason.bay' };
  const busy = lineOf(inputs.lines, code) || (code === 'sl' && inputs.lines.crew !== null);
  if (busy) return { ok: false, reason: 'lines.reason.busy' };
  if (code === 'bl') {
    const buoy = nearestBuoy(inputs.boat, inputs.area, data);
    if (!buoy || buoy.distanceM > l.buoyReachM)
      return { ok: false, reason: 'lines.reason.buoyFar' };
  } else {
    const ring = nearestRing(inputs.boat, inputs.area, data);
    if (!ring || ring.distanceM > l.shoreReachM)
      return { ok: false, reason: 'lines.reason.shoreFar' };
  }
  const { speedMps, swayMps } = inputs.boat;
  const limit = code === 'bl' ? l.buoyMaxSpeedMps : l.takeMaxSpeedMps;
  if (Math.hypot(speedMps, swayMps) > limit) return { ok: false, reason: 'lines.reason.fast' };
  return { ok: true };
}

/** Whether a line can be taken now, and if not, why (a UI string key). */
export function canTake(code: LineCode, inputs: LinesInputs, data: BoatData = hanse508): CanTake {
  if (code === 'bl' || code === 'sl') return canTakeInBay(code, inputs, data);
  const l = data.physics.lines;
  if (inputs.harbour.place !== 'marina') return { ok: false, reason: 'lines.reason.place' };
  if (lineOf(inputs.lines, code) || (code === 'll' && inputs.lines.crew !== null)) {
    return { ok: false, reason: 'lines.reason.busy' };
  }
  if (code === 'll' && !lineOf(inputs.lines, 'sp') && !lineOf(inputs.lines, 'ss')) {
    return { ok: false, reason: 'lines.reason.sternFirst' };
  }
  if (reachM(code, inputs, data) > l.throwReachM) {
    return { ok: false, reason: 'lines.reason.far', params: { m: l.throwReachM } };
  }
  const { speedMps, swayMps } = inputs.boat;
  if (Math.hypot(speedMps, swayMps) > l.takeMaxSpeedMps) {
    return { ok: false, reason: 'lines.reason.fast' };
  }
  return { ok: true };
}

/** Whether Tighten would do anything (false when the line is already hand tight). */
export function canTighten(
  code: LineCode,
  inputs: LinesInputs,
  data: BoatData = hanse508,
): boolean {
  const line = lineOf(inputs.lines, code);
  if (!line) return false;
  return (
    linePull(line, inputs.boat, data).elasticN <
    data.physics.lines.crewPullN - HAND_TIGHT_TOLERANCE_N
  );
}

function withLines(lines: LinesState, next: readonly MooringLine[]): LinesState {
  const sorted = [...next].sort((a, b) => LINE_CODES.indexOf(a.code) - LINE_CODES.indexOf(b.code));
  return { ...lines, lines: sorted };
}

/** Applies one line command (a refused one returns the state unchanged). */
export function lineCommand(
  code: LineCode,
  command: 'take' | 'tighten' | 'ease' | 'letGo',
  inputs: LinesInputs,
  data: BoatData = hanse508,
): LinesState {
  const l = data.physics.lines;
  const state = inputs.lines;
  const line = lineOf(state, code);
  switch (command) {
    case 'take': {
      if (!canTake(code, inputs, data).ok) return state;
      if (code === 'll') {
        return { ...state, crew: { kind: 'walkLazy', code, remainingS: l.lazyWalkS } };
      }
      if (code === 'bl') {
        const buoy = nearestBuoy(inputs.boat, inputs.area, data);
        const far = buoy ? buoyEnd(inputs.area, buoy.index) : null;
        if (!buoy || !far) return state;
        const cleatId = nearerCleat(inputs.boat, 'bow', far, data);
        const d = distanceToFar(inputs.boat, cleatId, far, data);
        return withLines(state, [
          ...state.lines,
          { code, cleatId, far, lengthM: d + l.buoySlackM, farIndex: buoy.index },
        ]);
      }
      if (code === 'sl') {
        const ring = nearestRing(inputs.boat, inputs.area, data);
        const far = ring ? shoreRingEnd(inputs.area, ring.index) : null;
        if (!ring || !far) return state;
        const cleatId = nearerCleat(inputs.boat, 'stern', far, data);
        return {
          ...state,
          crew: {
            kind: 'swimShore',
            code,
            remainingS: l.shoreSwimS,
            ringIndex: ring.index,
            cleatId,
          },
        };
      }
      const made = newSternLine(code, inputs, data);
      return withLines(state, [
        ...state.lines,
        {
          code,
          cleatId: made.cleatId,
          far: made.far,
          lengthM: made.distanceM + l.takeSlackM,
          farIndex: -1,
        },
      ]);
    }
    case 'tighten': {
      if (!line || !canTighten(code, inputs, data)) return state;
      const d = distanceToFar(inputs.boat, line.cleatId, line.far, data);
      const hand = (d * l.lineEAN) / (l.lineEAN + l.crewPullN);
      const lengthM = Math.max(line.lengthM - l.tightenStepM, hand, 0.5);
      return lengthM === line.lengthM ? state : replace(state, line, { ...line, lengthM });
    }
    case 'ease': {
      if (!line) return state;
      const lengthM = Math.min(line.lengthM + l.tightenStepM, maxLength(code, data));
      return lengthM === line.lengthM ? state : replace(state, line, { ...line, lengthM });
    }
    case 'letGo': {
      if (line)
        return withLines(
          state,
          state.lines.filter((other) => other !== line),
        );
      if (state.crew?.code === code) return { ...state, crew: null };
      return state;
    }
  }
}

function replace(state: LinesState, old: MooringLine, next: MooringLine): LinesState {
  return withLines(
    state,
    state.lines.map((line) => (line === old ? next : line)),
  );
}

/** A line that lies slack in the water near the propeller (or a lazy line being walked). */
function slackInWater(line: MooringLine, boat: BoatState, data: BoatData): boolean {
  if (line.code === 'bl') return false;
  const d = distanceToFar(boat, line.cleatId, line.far, data);
  return d < line.lengthM - data.physics.lines.slackInWaterM;
}

/** The crew task timer, the walk's end, and the line-in-the-propeller check. */
export function stepLines(inputs: LinesInputs, dt: number, data: BoatData = hanse508): LinesState {
  const l = data.physics.lines;
  let state = inputs.lines;
  const crew = state.crew;
  if (crew) {
    const remainingS = crew.remainingS - dt;
    if (remainingS <= EPS) {
      let made: MooringLine | null = null;
      if (crew.kind === 'swimShore') {
        // The swim is over: the shore line goes from its stern cleat to the ring chosen at the start.
        const far = shoreRingEnd(inputs.area, crew.ringIndex ?? -1);
        if (far && crew.cleatId) {
          const d = distanceToFar(inputs.boat, crew.cleatId, far, data);
          made = {
            code: crew.code,
            cleatId: crew.cleatId,
            far,
            lengthM: d + l.shoreSlackM,
            farIndex: crew.ringIndex ?? -1,
          };
        }
      } else {
        // The walk is over: the lazy line is made fast on the bow cleat nearer to its weight.
        const far = sinkerEnd(inputs.geometry);
        const cleatId = bowCleatFor(inputs.boat, far, data);
        const d = distanceToFar(inputs.boat, cleatId, far, data);
        made = { code: crew.code, cleatId, far, lengthM: d + l.takeSlackM, farIndex: -1 };
      }
      state = withLines({ ...state, crew: null }, [
        ...state.lines.filter((line) => line.code !== crew.code),
        ...(made ? [made] : []),
      ]);
    } else {
      state = { ...state, crew: { ...crew, remainingS } };
    }
  }

  const { engine, boat } = inputs;
  const inGear = engine.running && engine.gear !== 'neutral';
  const slack = crew !== null || state.lines.some((line) => slackInWater(line, boat, data));
  const fouling = inGear && slack && boat.mode === 'sailing' && !state.fouled;
  let foulS = fouling ? state.foulS + dt : 0;
  let fouled = state.fouled;
  if (foulS >= l.foulAfterS - EPS) {
    fouled = true;
    foulS = 0;
  }
  if (fouled === state.fouled && foulS === state.foulS) return state;
  return { ...state, fouled, foulS };
}

/** A diver has cut the propeller free; the lines stay as they were. */
export function clearPropeller(state: LinesState): LinesState {
  return state.fouled || state.foulS !== 0 ? { ...state, fouled: false, foulS: 0 } : state;
}

/**
 * The lines a link gives (M44, M45, PHASE7_SPEC 10.4, 11.4) for the boat as she lies: each valid
 * code with a length; the cleats and far ends come from the place (our berth, or the buoy or
 * ring `index` of the bay). A line that would be more than one metre short of her position (it
 * would yank the boat) is dropped.
 */
export function linesFromLink(
  entries: readonly { code: LineCode; index?: number | null; lengthM: number }[],
  boat: BoatState,
  harbour: HarbourState,
  data: BoatData = hanse508,
  areaData: AreaData = area,
): MooringLine[] {
  if (harbour.place === 'open') return [];
  const marina = harbour.place === 'marina';
  const geometry = marinaGeometry(harbour.layout, harbour.traffic, areaData);
  const inputs: LinesInputs = {
    lines: NO_LINES,
    boat,
    harbour,
    geometry,
    area: areaData,
    engine: { running: false, leverPct: 0, rpm: 0, gear: 'neutral', shiftS: 0 },
  };
  const made: MooringLine[] = [];
  for (const { code, index = null, lengthM } of entries) {
    if (MARINA_LINE_CODES.includes(code) !== marina) continue;
    if (!(lengthM >= 0.5 && lengthM <= maxLength(code, data))) continue;
    let cleatId: CleatId;
    let far: FarEnd;
    let farIndex = -1;
    if (marina) {
      if (index !== null) continue;
      if (code === 'll') {
        far = sinkerEnd(geometry);
        cleatId = bowCleatFor(boat, far, data);
      } else {
        ({ cleatId, far } = newSternLine(code as 'sp' | 'ss', inputs, data));
      }
    } else {
      if (index === null) continue;
      const end = code === 'bl' ? buoyEnd(areaData, index) : shoreRingEnd(areaData, index);
      if (!end) continue;
      far = end;
      farIndex = index;
      cleatId = nearerCleat(boat, code === 'bl' ? 'bow' : 'stern', far, data);
    }
    if (distanceToFar(boat, cleatId, far, data) > lengthM + 1.0) continue;
    made.push({ code, cleatId, far, lengthM, farIndex });
  }
  return withLines(NO_LINES, made).lines.slice();
}
