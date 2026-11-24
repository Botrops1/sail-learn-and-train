import { DEG } from './angles';
import { boat, type BoatData } from './boat';
import type { Sit } from './dinghy';
import { stationWinch, type RealisticState, type StationId } from './realistic';
import type { HelmWheel, RopesMode } from './settings';
import type { Vec3 } from './vec3';

/**
 * The captain on board (PHASE_PEOPLE_SPEC 7.3): the deck points where he can stand and where
 * he stands for the mode, the station and the wheel. Pure: no DOM, no three.js.
 */

export interface DeckPoint {
  id: string;
  at: Vec3;
  /** 1 starboard, −1 port, 0 a point on (or near) the centreline that has no side. */
  side: 1 | -1 | 0;
  /** Out of the cockpit, on the side deck, coachroof or foredeck: M112's windward rule applies. */
  deck: boolean;
  /** Only the spots where the captain stops have one. */
  faceDeg: number | null;
}

export type FigurePose = 'stand' | 'steer' | 'work' | 'walk' | 'sit' | 'hike';

export interface CaptainInput {
  ropesMode: RopesMode;
  realistic: RealisticState;
  helmWheel: HelmWheel;
}

export interface CaptainPlacement {
  /** Where the feet stand, boat frame. */
  feet: Vec3;
  faceDeg: number;
  pose: FigurePose;
  /** Metres walked in the current walk (0 when standing): the stride's phase. */
  walkedM: number;
  /** M115 (the dinghy sailor only): where the pelvis is; the Hanse never sets it. */
  hip?: Vec3;
  /** M115: how far the whole body leans outboard from upright (degrees, ≥ 0; outboard = away from the centreline). */
  leanDeg?: number;
}

interface PointData {
  at: readonly number[];
  sided?: boolean;
  deck?: boolean;
  faceDeg?: number;
}

const cache = new WeakMap<BoatData, Record<string, DeckPoint>>();

/** Every deck point by id, sided points expanded to `<id>_s` and `<id>_p`. */
export function deckPoints(data: BoatData = boat): Record<string, DeckPoint> {
  const cached = cache.get(data);
  if (cached) return cached;
  const result: Record<string, DeckPoint> = {};
  const points = data.people.points as Record<string, PointData>;
  for (const [id, p] of Object.entries(points)) {
    const x = p.at[0] ?? 0;
    const y = p.at[1] ?? 0;
    const z = p.at[2] ?? 0;
    const deck = p.deck === true;
    const faceDeg = typeof p.faceDeg === 'number' ? p.faceDeg : null;
    if (p.sided === true) {
      result[`${id}_s`] = { id: `${id}_s`, at: [x, y, z], side: 1, deck, faceDeg };
      result[`${id}_p`] = {
        id: `${id}_p`,
        at: [x, y, -z],
        side: -1,
        deck,
        faceDeg: faceDeg === null || faceDeg === 0 ? faceDeg : -faceDeg,
      };
    } else {
      result[id] = { id, at: [x, y, z], side: 0, deck, faceDeg };
    }
  }
  cache.set(data, result);
  return result;
}

/** The point id where the captain stands at a Realistic station. */
export function stationSpot(station: StationId, helmSide: 1 | -1, data: BoatData = boat): string {
  const spot = (data.people.stationSpots as Record<string, string>)[station] ?? 'helm';
  if (spot in deckPoints(data)) return spot;
  return `${spot}${helmSide === 1 ? '_s' : '_p'}`;
}

export function captainPlacement(input: CaptainInput, data: BoatData = boat): CaptainPlacement {
  // A walk in Realistic ropes (M112); in Easy ropes the captain stands at the helm.
  if (input.ropesMode === 'realistic' && input.realistic.walk !== null) {
    const walk = input.realistic.walk;
    const { feet, faceDeg } = walkPosition(walk, data);
    return { feet, faceDeg, pose: 'walk', walkedM: walk.doneM };
  }
  const helmSide = input.helmWheel === 'starboard' ? 1 : -1;
  const station: StationId = input.ropesMode === 'easy' ? 'helm' : input.realistic.station;
  const id = stationSpot(station, helmSide, data);
  const point = deckPoints(data)[id];
  if (!point) throw new Error(`captainPlacement: no deck point ${id}`);

  let pose: FigurePose = 'stand';
  if (input.ropesMode === 'easy' || id.startsWith('helm_')) {
    pose = 'steer';
  } else if (id.startsWith('winch_')) {
    const w = stationWinch(station, data);
    if (w !== null && input.realistic.winches[w]?.button === true) pose = 'work';
  }
  return { feet: point.at, faceDeg: point.faceDeg ?? 0, pose, walkedM: 0 };
}

// ---------------------------------------------------------------------------------------------
// Walking between the stations (M112, PHASE_PEOPLE_SPEC 8.3)
// ---------------------------------------------------------------------------------------------

export interface DeckRoute {
  nodes: string[];
  lengthM: number;
}

export interface WalkState {
  /** The station being walked to (also `RealisticState.station`). */
  to: StationId;
  /** Where the walk started (a deck point's `at`, or where a turned-back walk was). */
  start: Vec3;
  /**
   * The deck point at the other end of the first piece's walkway: the point the walk started
   * on, or, for a turned-back walk, the end of the walkway that was not chosen.
   */
  from: string;
  /** The deck points walked through after `start`, the last one the station's spot. */
  nodes: string[];
  /** Total length of start → nodes (m) and how much of it is walked. */
  lengthM: number;
  doneM: number;
}

interface Edge {
  to: string;
  lengthM: number;
}

const graphCache = new WeakMap<BoatData, Map<string, Edge[]>>();

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** The walkways as an adjacency list over the expanded deck points (23 walkways). */
function graph(data: BoatData): Map<string, Edge[]> {
  const cached = graphCache.get(data);
  if (cached) return cached;
  const points = deckPoints(data);
  const raw = data.people.points as Record<string, PointData>;
  const result = new Map<string, Edge[]>();
  const link = (a: string, b: string) => {
    const pa = points[a];
    const pb = points[b];
    if (!pa || !pb) throw new Error(`walkway ${a}–${b}: no such deck point`);
    const lengthM = distance(pa.at, pb.at);
    result.set(a, [...(result.get(a) ?? []), { to: b, lengthM }]);
    result.set(b, [...(result.get(b) ?? []), { to: a, lengthM }]);
  };
  const ids = (id: string): string[] => (raw[id]?.sided === true ? [`${id}_s`, `${id}_p`] : [id]);
  for (const [x, y] of data.people.walkways as readonly (readonly string[])[]) {
    const xs = ids(x ?? '');
    const ys = ids(y ?? '');
    if (xs.length === 2 && ys.length === 2) {
      link(xs[0] ?? '', ys[0] ?? '');
      link(xs[1] ?? '', ys[1] ?? '');
    } else if (xs.length === 2) {
      for (const a of xs) link(a, ys[0] ?? '');
    } else if (ys.length === 2) {
      for (const b of ys) link(xs[0] ?? '', b);
    } else {
      link(xs[0] ?? '', ys[0] ?? '');
    }
  }
  graphCache.set(data, result);
  return result;
}

function shortest(
  from: string,
  to: string,
  allowed: (id: string) => boolean,
  data: BoatData,
): DeckRoute | null {
  const edges = graph(data);
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  for (;;) {
    let current: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (!done.has(id) && d < best) {
        best = d;
        current = id;
      }
    }
    if (current === null) return null;
    if (current === to) break;
    done.add(current);
    for (const edge of edges.get(current) ?? []) {
      if (done.has(edge.to) || !allowed(edge.to)) continue;
      const d = best + edge.lengthM;
      if (d < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, d);
        prev.set(edge.to, current);
      }
    }
  }
  const nodes = [to];
  while (nodes[0] !== from) {
    const before = prev.get(nodes[0] ?? '');
    if (before === undefined) return null;
    nodes.unshift(before);
  }
  return { nodes, lengthM: dist.get(to) ?? 0 };
}

/**
 * The shortest way along the walkways from one deck point to another, using only the windward
 * side's deck points (PT-74). If a wind shift leaves no such route, every point is allowed.
 */
export function deckRoute(
  from: string,
  to: string,
  windward: 1 | -1,
  data: BoatData = boat,
): DeckRoute {
  if (from === to) return { nodes: [from], lengthM: 0 };
  const points = deckPoints(data);
  const allowed = (id: string) => {
    const p = points[id];
    return id === from || id === to || !p || !p.deck || p.side === windward;
  };
  const route = shortest(from, to, allowed, data) ?? shortest(from, to, () => true, data);
  if (!route) throw new Error(`deckRoute: no way from ${from} to ${to}`);
  return route;
}

/** `1` when the wind comes over starboard, `-1` over port; dead ahead or astern: where he is. */
export function windwardSide(awaDeg: number, startSide: 1 | -1 | 0): 1 | -1 {
  if (awaDeg > 0 && awaDeg < 180) return 1;
  if (awaDeg < 0 && awaDeg > -180) return -1;
  return startSide === 0 ? 1 : startSide;
}

function pointAt(id: string, data: BoatData): DeckPoint {
  const point = deckPoints(data)[id];
  if (!point) throw new Error(`no deck point ${id}`);
  return point;
}

/** Starts a walk from where he stands (a deck point id) or is (a walkway's two ends, 8.3). */
export function startWalk(
  fromFeet: Vec3,
  from: string | [string, string],
  to: StationId,
  toSpot: string,
  awaDeg: number,
  data: BoatData = boat,
): WalkState {
  if (typeof from === 'string') {
    const windward = windwardSide(awaDeg, pointAt(from, data).side);
    const route = deckRoute(from, toSpot, windward, data);
    return {
      to,
      start: fromFeet,
      from,
      nodes: route.nodes.slice(1),
      lengthM: route.lengthM,
      doneM: 0,
    };
  }
  const [a, b] = from;
  const windward = windwardSide(awaDeg, pointAt(b, data).side);
  const costA =
    distance(fromFeet, pointAt(a, data).at) + deckRoute(a, toSpot, windward, data).lengthM;
  const costB =
    distance(fromFeet, pointAt(b, data).at) + deckRoute(b, toSpot, windward, data).lengthM;
  const [end, other, cost] = costA < costB ? [a, b, costA] : [b, a, costB];
  return {
    to,
    start: fromFeet,
    from: other,
    nodes: deckRoute(end, toSpot, windward, data).nodes,
    lengthM: cost,
    doneM: 0,
  };
}

interface Piece {
  a: Vec3;
  b: Vec3;
  /** Distance walked at the piece's start and its length. */
  from: number;
  len: number;
  /** Facing along it, or null when it has no horizontal length. */
  face: number | null;
}

function pieces(walk: WalkState, data: BoatData): Piece[] {
  const result: Piece[] = [];
  let a = walk.start;
  let walked = 0;
  for (const id of walk.nodes) {
    const b = pointAt(id, data).at;
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    result.push({
      a,
      b,
      from: walked,
      len: distance(a, b),
      face: Math.hypot(dx, dz) > 1e-9 ? Math.atan2(dz, dx) / DEG : null,
    });
    walked += distance(a, b);
    a = b;
  }
  return result;
}

/** The index of the piece the captain is on: `c_i < doneM ≤ c_(i+1)`, the last one past the end. */
function pieceIndex(list: Piece[], doneM: number): number {
  for (let i = 0; i < list.length; i++) {
    const piece = list[i];
    if (piece && doneM > piece.from && doneM <= piece.from + piece.len) return i;
  }
  const last = list[list.length - 1];
  return last && doneM >= last.from + last.len ? list.length - 1 : 0;
}

/** The walkway he is on, as its two ends (the one he walks towards second), for turning back. */
export function walkWalkway(walk: WalkState, data: BoatData = boat): string | [string, string] {
  if (walk.nodes.length === 0) return walk.from;
  const i = pieceIndex(pieces(walk, data), walk.doneM);
  const a = i === 0 ? walk.from : walk.nodes[i - 1];
  const b = walk.nodes[i];
  return [a ?? walk.from, b ?? walk.from];
}

/** Where the feet are, and the facing, after `doneM` metres of the walk. */
export function walkPosition(
  walk: WalkState,
  data: BoatData = boat,
): { feet: Vec3; faceDeg: number } {
  const destination = pointAt(walk.nodes[walk.nodes.length - 1] ?? walk.from, data);
  const finalFace = destination.faceDeg ?? 0;
  const list = pieces(walk, data);
  const last = list[list.length - 1];
  if (!last) return { feet: walk.start, faceDeg: finalFace };
  if (walk.doneM >= walk.lengthM) return { feet: destination.at, faceDeg: finalFace };
  const i = pieceIndex(list, walk.doneM);
  const piece = list[i] ?? last;
  const f = piece.len > 0 ? Math.min(1, Math.max(0, (walk.doneM - piece.from) / piece.len)) : 1;
  const feet: Vec3 = [
    piece.a[0] + (piece.b[0] - piece.a[0]) * f,
    piece.a[1] + (piece.b[1] - piece.a[1]) * f,
    piece.a[2] + (piece.b[2] - piece.a[2]) * f,
  ];
  let face = piece.face;
  for (let k = i - 1; face === null && k >= 0; k--) face = list[k]?.face ?? null;
  for (let k = i + 1; face === null && k < list.length; k++) face = list[k]?.face ?? null;
  return { feet, faceDeg: face ?? finalFace };
}

/** Whole seconds left of the walk, for the panel. */
export function walkSecondsLeft(walk: WalkState, data: BoatData = boat): number {
  return Math.ceil((walk.lengthM - walk.doneM) / data.people.walkSpeedMps);
}

// ---------------------------------------------------------------------------------------------
// The sailor in the dinghy (M115, PHASE_DINGHY_SPEC 9.3)
// ---------------------------------------------------------------------------------------------

/** The sailor's placement: the pelvis, the lean and where his two hands are (boat frame, lean applied). */
export type SailorPlacement = CaptainPlacement & {
  hip: Vec3;
  leanDeg: number;
  hand: { aft: Vec3; fwd: Vec3 };
};

function dinghyOf(data: BoatData) {
  if (!data.dinghy) throw new Error('The sailor needs the dinghy boat data.');
  return data.dinghy;
}

/** The seat's hip and feet on the starboard side, mirrored to `side` (z × side). */
function seatPoints(sit: Sit, side: 1 | -1, data: BoatData): { hip: Vec3; feet: Vec3 } {
  const seat = dinghyOf(data).seats[sit];
  return {
    hip: [seat.hip[0], seat.hip[1], seat.hip[2] * side],
    feet: [seat.feet[0], seat.feet[1], seat.feet[2] * side],
  };
}

/**
 * Both hands, from the hip: the offsets from `dinghy.sailorHands` (the z offset is `−zSide` times its third number; `zSide`, 1 starboard … −1 port, fractional while
 * crossing) rotated by the lean about the boat's x axis through the hip (`leanRad` > 0 leans to +z).
 */
function sailorHands(
  hip: Vec3,
  zSide: number,
  leanRad: number,
  data: BoatData,
): { aft: Vec3; fwd: Vec3 } {
  const { aft, fwd } = dinghyOf(data).sailorHands;
  const c = Math.cos(leanRad);
  const s = Math.sin(leanRad);
  const place = (o: Vec3): Vec3 => {
    const z = -zSide * o[2];
    return [hip[0] + o[0], hip[1] + o[1] * c - z * s, hip[2] + o[1] * s + z * c];
  };
  return { aft: place(aft), fwd: place(fwd) };
}

/**
 * Where the sailor sits for `sit` on `side` (1 starboard, −1 port): pelvis, feet, lean, facing
 * (his front points along `(0.5, 0, −side·0.866)`: across the boat, turned 30° towards the bow)
 * and the two hands, lean applied.
 */
export function sailorPlacement(sit: Sit, side: 1 | -1, data: BoatData = boat): SailorPlacement {
  const { hip, feet } = seatPoints(sit, side, data);
  const leanDeg = dinghyOf(data).seats[sit].leanDeg;
  return {
    feet,
    hip,
    leanDeg,
    // captain.ts turns the figure by yaw = (90 − faceDeg)·DEG: its front (+z) then points at
    // (cos faceDeg, 0, sin faceDeg), which is (0.5, 0, −side·0.866) for faceDeg = −side·60.
    faceDeg: -side * (90 - dinghyOf(data).faceTurnDeg),
    pose: sit === 'out' ? 'hike' : 'sit',
    walkedM: 0,
    hand: sailorHands(hip, side, side * leanDeg * DEG, data),
  };
}

/** The pelvis on the way from one seat to the other: a straight line that dips a little in the middle. */
export function crossingHip(from: Vec3, to: Vec3, u: number): Vec3 {
  return [
    from[0] + (to[0] - from[0]) * u,
    from[1] + (to[1] - from[1]) * u - 0.1 * Math.sin(Math.PI * u),
    from[2] + (to[2] - from[2]) * u,
  ];
}

/**
 * The sailor part-way across (drawing only): `u` 0…1 from the seat on `from` to the one on
 * `−from`. He sits (never hikes) while crossing; the lean is `leanDeg·|1 − 2u|`, upright in the
 * middle, and he turns through facing forward.
 */
export function crossingSailor(
  sit: Sit,
  from: 1 | -1,
  u: number,
  data: BoatData = boat,
): SailorPlacement {
  const a = seatPoints(sit, from, data);
  const b = seatPoints(sit, from === 1 ? -1 : 1, data);
  const hip = crossingHip(a.hip, b.hip, u);
  const k = 1 - 2 * u;
  const seatLean = dinghyOf(data).seats[sit].leanDeg;
  return {
    feet: [
      a.feet[0] + (b.feet[0] - a.feet[0]) * u,
      a.feet[1] + (b.feet[1] - a.feet[1]) * u,
      a.feet[2] + (b.feet[2] - a.feet[2]) * u,
    ],
    hip,
    leanDeg: seatLean * Math.abs(k),
    faceDeg: -from * (90 - dinghyOf(data).faceTurnDeg) * k,
    pose: 'sit',
    walkedM: 0,
    hand: sailorHands(hip, from * k, from * k * seatLean * DEG, data),
  };
}
