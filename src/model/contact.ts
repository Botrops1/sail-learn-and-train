import { boat as hanse508, type BoatData } from './boat';
import type { Side } from './deckVolumes';
import type { HarbourState } from './harbour';
import {
  forceAt,
  NO_FORCES,
  pointVelocity,
  vectorToBoat,
  type ContactHit,
  type ExternalForces,
  type HullPart,
} from './lowSpeed';
import { DEG } from './angles';
import { mapToBoat } from './mapFrame';
import { insidePolygon } from './marina';
import type { BoatState } from './motion';
import { ballFenderPlace, fenderPlaces } from './mooringFittings';

/**
 * Contact (M43, PHASE7_SPEC 9.3): the hull bumps off the quay, the pontoon and the moored yachts.
 * Every point of our hull that is inside an obstacle is pushed out by a stiff spring and damper,
 * softer where a fender hangs between (PT-50); a report says what was hit, where, how fast and
 * how bad. Fenders left out at speed are torn off (PT-34). Pure.
 */

/** An obstacle on the map: a convex polygon (east, north), counter-clockwise, no repeated vertex. */
export interface Obstacle {
  id: string;
  /** The registry id of what it is: 'env_quay', 'env_moored_yacht', … */
  partId: string;
  polygon: [number, number][];
}

/** The fenders now: out or in the locker, and which are lost (numbers in `fenderPlaces` order, 8 = the ball fender). */
export interface FenderSet {
  out: boolean;
  lost: readonly number[];
}

export type Severity = 'fender' | 'touch' | 'bump' | 'knock' | 'hit';

/** The deepest a point can count as inside an obstacle, metres (deeper would flip the nearest edge in a thin pontoon). */
const MAX_DEPTH_M = 1;

/** `1` → `'starboard'`, `-1` → `'port'`. */
export function sideName(side: Side): 'starboard' | 'port' {
  return side === 1 ? 'starboard' : 'port';
}

type HullPoint = { x: number; z: number; part: HullPart };

interface HullCache {
  points: HullPoint[];
  polygon: [number, number][];
  /** The polygon runs counter-clockwise in the (x, z) plane. */
  ccw: boolean;
}

const hullCache = new WeakMap<BoatData, HullCache>();

function partOf(x: number, z: number, data: BoatData): HullPart {
  if (x >= 4.0) return 'bow';
  if (x <= data.hull.transomX + 1.0) return 'stern';
  return z < 0 ? 'port' : 'starboard';
}

function signedArea(polygon: readonly [number, number][]): number {
  let sum = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] as [number, number];
    const [xj, yj] = polygon[j] as [number, number];
    sum += xj * yi - xi * yj;
  }
  return sum / 2;
}

function hullOf(data: BoatData): HullCache {
  const found = hullCache.get(data);
  if (found) return found;
  const edge = data.hull.deckEdgeHalfBeam.points as unknown as readonly [number, number][];
  const polygon: [number, number][] = [
    ...edge.map(([x, hb]): [number, number] => [x, hb]),
    ...[...edge].reverse().map(([x, hb]): [number, number] => [x, -hb]),
  ];
  const points: HullPoint[] = [
    ...edge.flatMap(([x, hb]) => [
      { x, z: -hb, part: partOf(x, -hb, data) },
      { x, z: hb, part: partOf(x, hb, data) },
    ]),
    { x: data.hull.bowFittingTipX, z: 0, part: partOf(data.hull.bowFittingTipX, 0, data) },
    { x: data.hull.transomX, z: 0, part: partOf(data.hull.transomX, 0, data) },
  ];
  const built = { points, polygon, ccw: signedArea(polygon) > 0 };
  hullCache.set(data, built);
  return built;
}

/** Our hull's contact points, boat frame, with the part each belongs to (86: both deck edges, the bow fitting's tip, the transom). */
export function hullContactPoints(data: BoatData = hanse508): HullPoint[] {
  return hullOf(data).points;
}

/** Our hull's outline for inside tests, boat frame (x, z): the deck edge, starboard bow to stern then port stern to bow. */
export function hullPolygon(data: BoatData = hanse508): [number, number][] {
  return hullOf(data).polygon;
}

/**
 * The smallest distance from (px, py) to the polygon's edges and the outward unit normal of that
 * edge (`ccw`: the polygon runs counter-clockwise).
 */
function nearestEdge(
  polygon: readonly [number, number][],
  px: number,
  py: number,
  ccw: boolean,
): { d: number; nx: number; ny: number } {
  let best = { d: Infinity, nx: 0, ny: 0 };
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [ax, ay] = polygon[j] as [number, number];
    const [bx, by] = polygon[i] as [number, number];
    const ex = bx - ax;
    const ey = by - ay;
    const len2 = ex * ex + ey * ey;
    if (len2 === 0) continue;
    const u = Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / len2));
    const d = Math.hypot(px - (ax + u * ex), py - (ay + u * ey));
    if (d < best.d) {
      const len = Math.sqrt(len2);
      const s = ccw ? 1 : -1;
      best = { d, nx: (s * ey) / len, ny: (-s * ex) / len };
    }
  }
  return best;
}

interface Box {
  west: number;
  east: number;
  south: number;
  north: number;
}

const boxes = new WeakMap<Obstacle, Box>();

function boxOf(o: Obstacle): Box {
  let box = boxes.get(o);
  if (!box) {
    const xs = o.polygon.map((p) => p[0]);
    const ys = o.polygon.map((p) => p[1]);
    box = {
      west: Math.min(...xs),
      east: Math.max(...xs),
      south: Math.min(...ys),
      north: Math.max(...ys),
    };
    boxes.set(o, box);
  }
  return box;
}

function nearBox(box: Box, east: number, north: number, nearM: number): boolean {
  const dx = Math.max(box.west - east, 0, east - box.east);
  const dy = Math.max(box.south - north, 0, north - box.north);
  return dx <= nearM && dy <= nearM;
}

/** True if the vertex lies inside or on the edge of the polygon (1 mm). */
function insideOrOn(polygon: readonly [number, number][], x: number, y: number): boolean {
  return insidePolygon(polygon, x, y) || nearestEdge(polygon, x, y, true).d < 1e-3;
}

/** The fender that covers the hull point (x, side), if any: its number. */
function coveringFender(
  x: number,
  side: Side,
  fenders: FenderSet,
  data: BoatData,
): number | undefined {
  const reach = data.physics.contact.fenderReachM;
  const places = fenderPlaces(data);
  for (let i = 0; i < places.length; i += 1) {
    const place = places[i];
    if (!place || place.side !== side || fenders.lost.includes(i)) continue;
    if (Math.abs(place.top[0] - x) <= reach) return i;
  }
  return undefined;
}

/**
 * The forces of every contact now, and the hits (one per hull point in contact, or per obstacle
 * corner inside our hull). Called every substep.
 */
export function contactForces(
  boat: BoatState,
  obstacles: readonly Obstacle[],
  fenders: FenderSet,
  data: BoatData = hanse508,
): ExternalForces {
  const c = data.physics.contact;
  const near = obstacles.filter((o) => nearBox(boxOf(o), boat.eastM, boat.northM, c.nearM));
  if (near.length === 0) return NO_FORCES;
  const fenderT = data.deckFittings.fenders.diameter;
  const hull = hullOf(data);
  const h = boat.headingDeg * DEG;
  const sinH = Math.sin(h);
  const cosH = Math.cos(h);
  let surgeN = 0;
  let sideN = 0;
  let momentNm = 0;
  const contacts: ContactHit[] = [];
  const apply = (x: number, z: number, fx: number, fz: number) => {
    const f = forceAt(x, z, fx, fz, data);
    surgeN += f.surgeN;
    sideN += f.sideN;
    momentNm += f.momentNm;
  };

  for (const o of near) {
    for (const p of hull.points) {
      const side: Side = p.z < 0 ? -1 : 1;
      const sideways = p.part === 'port' || p.part === 'starboard';
      const fendered = fenders.out && sideways && coveringFender(p.x, side, fenders, data) !== undefined;
      const z = fendered ? p.z + side * fenderT : p.z;
      const east = boat.eastM + p.x * sinH + z * cosH;
      const north = boat.northM + p.x * cosH - z * sinH;
      if (!insidePolygon(o.polygon, east, north)) continue;
      const edge = nearestEdge(o.polygon, east, north, true);
      const d = Math.min(edge.d, MAX_DEPTH_M);
      const [ve, vn] = pointVelocity(boat, p.x, p.z, data);
      const vDotN = ve * edge.nx + vn * edge.ny;
      const approach = Math.max(0, -vDotN);
      const force = fendered
        ? c.fenderStiffnessNPerM * Math.min(d, fenderT) +
          c.hullStiffnessNPerM * Math.max(0, d - fenderT) +
          c.fenderDampingNsPerM * approach
        : c.hullStiffnessNPerM * d + c.hullDampingNsPerM * approach;
      const te = ve - vDotN * edge.nx;
      const tn = vn - vDotN * edge.ny;
      const slide = Math.max(Math.hypot(te, tn), 0.05);
      const fe = force * edge.nx - (c.friction * force * te) / slide;
      const fn = force * edge.ny - (c.friction * force * tn) / slide;
      const [fx, fz] = vectorToBoat(fe, fn, boat.headingDeg);
      apply(p.x, p.z, fx, fz);
      contacts.push({
        key: `${o.id}:${p.part}`,
        obstacleId: o.id,
        partId: o.partId,
        part: p.part,
        approachMps: approach,
        fender: fendered,
      });
    }
    // A corner of the obstacle inside our hull (a neighbour's pointed bow between two of our points).
    for (const [vertexEast, vertexNorth] of o.polygon) {
      const [xv, zv] = mapToBoat(vertexEast - boat.eastM, vertexNorth - boat.northM, boat.headingDeg);
      if (!insidePolygon(hull.polygon, xv, zv)) continue;
      if (
        near.some((other) => other !== o && insideOrOn(other.polygon, vertexEast, vertexNorth))
      ) {
        continue;
      }
      const edge = nearestEdge(hull.polygon, xv, zv, hull.ccw);
      const d = Math.min(edge.d, MAX_DEPTH_M);
      const [ve, vn] = pointVelocity(boat, xv, zv, data);
      const [vx, vz] = vectorToBoat(ve, vn, boat.headingDeg);
      const approach = Math.max(0, vx * edge.nx + vz * edge.ny);
      const force = c.hullStiffnessNPerM * d + c.hullDampingNsPerM * approach;
      apply(xv, zv, -force * edge.nx, -force * edge.ny);
      const part = partOf(xv, zv, data);
      contacts.push({
        key: `${o.id}:${part}`,
        obstacleId: o.id,
        partId: o.partId,
        part,
        approachMps: approach,
        fender: false,
      });
    }
  }
  return contacts.length === 0 ? NO_FORCES : { surgeN, sideN, momentNm, contacts };
}

/** How bad a contact is, from how fast we moved into it (9.2: `severityMps`, `fenderMaxMps`). */
export function contactSeverity(
  approachMps: number,
  fender: boolean,
  data: BoatData = hanse508,
): Severity {
  const c = data.physics.contact;
  if (fender && approachMps <= c.fenderMaxMps) return 'fender';
  if (approachMps < c.severityMps.touch) return 'touch';
  if (approachMps < c.severityMps.bump) return 'bump';
  if (approachMps < c.severityMps.knock) return 'knock';
  return 'hit';
}

export interface ContactReport {
  /** Simulated time (rig.timeS) of the contact. */
  atS: number;
  obstacleId: string;
  partId: string;
  part: HullPart;
  impactMps: number;
  fender: boolean;
  severity: Severity;
}

export interface ContactState {
  /** Contacts going on now, by key, with the seconds since last seen. */
  touching: Readonly<Record<string, number>>;
  /** Newest first, at most `MAX_REPORTS`. */
  reports: readonly ContactReport[];
  /** Simulated time (rig.timeS) until which the alert shows the newest report. */
  noticeUntilS: number;
}

export const NO_CONTACT: Readonly<ContactState> = { touching: {}, reports: [], noticeUntilS: 0 };

const MAX_REPORTS = 20;
/** The alert shows the newest report this long, simulated seconds. */
const NOTICE_S = 8;

/**
 * After the boat moved: every hit whose key was not touching makes a report; keys not hit this
 * step age by `dt` and are dropped after `separateS`.
 */
export function stepContact(
  contact: ContactState,
  hits: readonly ContactHit[],
  timeS: number,
  dt: number,
  data: BoatData = hanse508,
): ContactState {
  const touchingNow = Object.keys(contact.touching);
  if (hits.length === 0 && touchingNow.length === 0) return contact;
  const touching: Record<string, number> = {};
  let reports = contact.reports;
  let noticeUntilS = contact.noticeUntilS;
  const seen = new Set<string>();
  for (const hit of hits) {
    seen.add(hit.key);
    touching[hit.key] = 0;
    if (!(hit.key in contact.touching)) {
      const report: ContactReport = {
        atS: timeS,
        obstacleId: hit.obstacleId,
        partId: hit.partId,
        part: hit.part,
        impactMps: hit.approachMps,
        fender: hit.fender,
        severity: contactSeverity(hit.approachMps, hit.fender, data),
      };
      reports = [report, ...reports].slice(0, MAX_REPORTS);
      noticeUntilS = timeS + NOTICE_S;
    }
  }
  for (const key of touchingNow) {
    if (seen.has(key)) continue;
    const age = (contact.touching[key] ?? 0) + dt;
    if (age <= data.physics.contact.separateS) touching[key] = age;
  }
  return { touching, reports, noticeUntilS };
}

/** The ball fender's number: after the eight at the stations (4.1). */
export const BALL_FENDER = 8;

/**
 * Fenders left out at speed are torn off (PT-34): after `fenderLossAfterS` over
 * `fenderLossSpeedMps`, then one every `fenderLossEveryS`, the bow-most pair first and the ball
 * fender last. Slowing down restarts the count. Called after `stepContact`.
 */
export function stepFenders(
  harbour: HarbourState,
  contact: ContactState,
  speedMps: number,
  timeS: number,
  dt: number,
  data: BoatData = hanse508,
): { harbour: HarbourState; contact: ContactState } {
  const c = data.physics.contact;
  if (!harbour.fendersOut || Math.abs(speedMps) <= c.fenderLossSpeedMps) {
    if (harbour.fenderOverSpeedS === 0 && harbour.fendersLostSinceSlow === 0) {
      return { harbour, contact };
    }
    return { harbour: { ...harbour, fenderOverSpeedS: 0, fendersLostSinceSlow: 0 }, contact };
  }
  let over = harbour.fenderOverSpeedS + dt;
  let sinceSlow = harbour.fendersLostSinceSlow;
  let lost = harbour.fendersLost;
  let reports = contact.reports;
  let noticeUntilS = contact.noticeUntilS;
  const total = BALL_FENDER + 1;
  for (;;) {
    const threshold = sinceSlow === 0 ? c.fenderLossAfterS : c.fenderLossEveryS;
    if (over < threshold || lost.length >= total) break;
    let number = 0;
    while (lost.includes(number)) number += 1;
    const side: Side =
      number === BALL_FENDER ? ballFenderPlace(data).side : (fenderPlaces(data)[number]?.side ?? 1);
    lost = [...lost, number];
    over -= threshold;
    sinceSlow += 1;
    const report: ContactReport = {
      atS: timeS,
      obstacleId: 'fender',
      partId: number === BALL_FENDER ? 'fit_fender_ball' : 'fit_fender',
      part: sideName(side),
      impactMps: 0,
      fender: false,
      severity: 'hit',
    };
    reports = [report, ...reports].slice(0, MAX_REPORTS);
    noticeUntilS = timeS + NOTICE_S;
  }
  return {
    harbour: { ...harbour, fendersLost: lost, fenderOverSpeedS: over, fendersLostSinceSlow: sinceSlow },
    contact: reports === contact.reports ? contact : { ...contact, reports, noticeUntilS },
  };
}
