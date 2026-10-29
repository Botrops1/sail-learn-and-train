import { boat, type BoatData } from './boat';
import { halfBeamAt, sheerAt } from './hullShape';
import { vec3, type Vec3 } from './vec3';

/**
 * Solid shapes on deck that ropes must not pass through (M3b): the coachroof, the sprayhood
 * and the covered line channels. Pure maths shared by the 3D builder and the tests.
 * Boat frame: x forward, y up, z starboard.
 */

/** +1 starboard, −1 port. */
export type Side = 1 | -1;

/** How far a part reaches into its neighbour so no gap shows at the joint, metres. */
export const DECK_OVERLAP = 0.1;
/** Small lift that keeps overlapping surfaces from flickering (z-fighting), metres. */
export const DECK_EPS = 0.01;

/** Points on each curved part of the coachroof outline (M60b). */
export const ROOF_CURVE_STEPS = 8;

/**
 * Starboard half of the coachroof outline at the given front x, aft to front, as [x, half-width],
 * 2·ROOF_CURVE_STEPS + 2 points (M60b): a cosine flare from the aft width (the coaming's outer
 * edge) to maxHalfWidth at the mast, straight to chamferStartX, then a quarter-ellipse round the
 * front corner. For the roof top (a smaller frontX) the same curve stops early.
 */
export function coachroofHalfOutline(frontX: number, data: BoatData = boat): [number, number][] {
  const r = data.deck.coachroof;
  const n = ROOF_CURVE_STEPS;
  const points: [number, number][] = [];
  for (let k = 0; k <= n; k += 1) {
    const t = k / n;
    points.push([
      r.aftX + (r.maxHalfWidthFromX - r.aftX) * t,
      r.halfWidth + (r.maxHalfWidth - r.halfWidth) * ((1 - Math.cos(Math.PI * t)) / 2),
    ]);
  }
  const run = r.frontX - r.chamferStartX;
  const end = Math.asin(Math.min(1, (frontX - r.chamferStartX) / run));
  for (let k = 0; k <= n; k += 1) {
    const theta = (end * k) / n;
    points.push([
      r.chamferStartX + run * Math.sin(theta),
      r.frontHalfWidth + (r.maxHalfWidth - r.frontHalfWidth) * Math.cos(theta),
    ]);
  }
  return points;
}

/** x where the coachroof's sloping front face meets the deck (M60b). */
export function roofFrontAtDeckX(data: BoatData = boat): number {
  const r = data.deck.coachroof;
  const base = coachroofBaseY(data);
  return r.frontX - ((r.frontX - r.topFrontX) * (sheerAt(r.frontX, data) - base)) / (r.topY - base);
}

/** Where the white non-slip bow begins: clamp(nonSlipAftX, topFrontX, stemX) (M60b). */
export function nonSlipAftX(data: BoatData = boat): number {
  return Math.min(
    data.hull.stemX,
    Math.max(data.deck.coachroof.topFrontX, data.deck.foredeck.nonSlipAftX),
  );
}

/**
 * The stations the deck is drawn on: the hull stations given, plus every outline x, topFrontX,
 * frontX, aftX, nonSlipAftX (when between topFrontX and stemX) and the extra station just ahead of
 * the cockpit front (it lets the inner edge step from the well's edge to the roof's within 2 cm,
 * so no teak lies over the open well); from transomX forward, sorted, no duplicates (M60b).
 */
export function deckStations(hullStations: readonly number[], data: BoatData = boat): number[] {
  const { cockpit, coachroof: roof, foredeck } = data.deck;
  const extra = [
    ...coachroofHalfOutline(roof.frontX, data).map(([x]) => x),
    roof.topFrontX,
    roof.frontX,
    roof.aftX,
    cockpit.frontX - 2 * DECK_EPS,
  ];
  if (foredeck.nonSlipAftX > roof.topFrontX && foredeck.nonSlipAftX < data.hull.stemX) {
    extra.push(foredeck.nonSlipAftX);
  }
  return [...new Set([...hullStations, ...extra])]
    .filter((x) => x >= data.hull.transomX)
    .sort((a, b) => a - b);
}

/**
 * The roof's aft lip (M60c): the roof top carried on aft over the cockpit's front wall to just
 * behind the sprayhood's front edge, so no slit shows between them. Box limits, boat frame.
 */
export function roofAftLip(data: BoatData = boat): {
  frontX: number;
  aftX: number;
  halfWidth: number;
  topY: number;
  bottomY: number;
} {
  const r = data.deck.coachroof;
  return {
    frontX: r.aftX + DECK_OVERLAP / 2,
    aftX: r.aftLip.aftX,
    halfWidth: r.halfWidth,
    topY: r.topY,
    bottomY: Math.min(sheerAt(r.aftX, data), sheerAt(r.aftLip.aftX, data)) - DECK_OVERLAP,
  };
}

/** Base of the coachroof (a little below the deck, so no gap shows). */
export function coachroofBaseY(data: BoatData = boat): number {
  const r = data.deck.coachroof;
  return Math.min(sheerAt(r.frontX, data), sheerAt(r.aftX, data)) - 0.1;
}

/** Half-width of a [x, half-width] outline at x, or −1 outside its length. */
function halfWidthAt(outline: [number, number][], x: number): number {
  const first = outline[0];
  const last = outline[outline.length - 1];
  if (!first || !last || x < first[0] || x > last[0]) return -1;
  for (let i = 1; i < outline.length; i += 1) {
    const [x0, w0] = outline[i - 1] as [number, number];
    const [x1, w1] = outline[i] as [number, number];
    if (x <= x1) return x1 > x0 ? w0 + ((w1 - w0) * (x - x0)) / (x1 - x0) : w1;
  }
  return last[1];
}

/**
 * True if a rope of radius `radius` centred at p would cut into the coachroof. The front face
 * slopes back from frontX at the base to topFrontX at the top.
 */
export function cutsCoachroof(p: Vec3, radius: number, data: BoatData = boat): boolean {
  const r = data.deck.coachroof;
  const base = coachroofBaseY(data);
  const [x, y, z] = p;
  if (y >= r.topY + radius - 1e-9 || y <= base - radius) return false;
  const height = Math.min(1, Math.max(0, (y - base) / (r.topY - base)));
  const frontX = r.frontX + (r.topFrontX - r.frontX) * height;
  const outline = coachroofHalfOutline(frontX, data);
  const half = halfWidthAt(outline, x);
  if (half < 0) {
    // Fore or aft of the outline: only the rope's radius can reach it, and the half-width is the
    // outline's own end value (the aft one is not the front one since M60b).
    const nearest = Math.min(Math.abs(x - r.aftX), Math.abs(x - frontX));
    const end = x < r.aftX ? outline[0] : outline[outline.length - 1];
    return nearest < radius && Math.abs(z) < (end?.[1] ?? 0);
  }
  return Math.abs(z) < half + radius - 1e-9;
}

/** The line channel's floor centre line on one side, mast end first (rig.lineLead.channel). */
export function channelPath(side: Side, data: BoatData = boat): Vec3[] {
  return data.rig.lineLead.channel.path.map((p) => {
    const v = vec3(p);
    return [v[0], v[1], side * v[2]];
  });
}

/** Point of a path (running aft, x decreasing) at station x, clamped to its ends. */
function pathAtX(path: Vec3[], x: number): Vec3 {
  const first = path[0] as Vec3;
  const last = path[path.length - 1] as Vec3;
  if (x >= first[0]) return first;
  if (x <= last[0]) return last;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1] as Vec3;
    const b = path[i] as Vec3;
    if (x >= b[0]) {
      const t = a[0] > b[0] ? (a[0] - x) / (a[0] - b[0]) : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
  }
  return last;
}

/** Sideways offset of a lane in the channel (+ = starboard), by clutch slot (1–5). */
export function laneOffset(lane: number, data: BoatData = boat): number {
  return (lane - 3) * data.rig.lineLead.laneSpacing;
}

/** Stations (per side) a lane swap is drawn on, beyond the channel's own points (M60c). */
const SWAP_STEPS = 5;
/** How far (in rope radii) the line passing over another rises at the crossing (M60c). */
const CROSS_LIFT = 0.8;

/**
 * The centre line of one rope's lane through the channel: on the floor plus the rope's radius.
 * A rope whose `frontLane` (mast end) is not its `lane` (clutch end) changes lanes in the short
 * stretch `rig.lineLead.channel.swap`, under the cover (M60c): everywhere else the lines run
 * side by side. The line that moves towards the lower lane number passes over the other, so the
 * two never share the same space.
 */
export function channelLane(
  side: Side,
  lane: number,
  frontLane: number,
  ropeRadius: number,
  data: BoatData = boat,
): Vec3[] {
  const path = channelPath(side, data);
  const { swap } = data.rig.lineLead.channel;
  const from = laneOffset(frontLane, data);
  const to = laneOffset(lane, data);
  if (frontLane === lane) {
    return path.map((p) => [p[0], p[1] + ropeRadius, p[2] + to]);
  }
  const stations = new Set<number>(path.map((p) => p[0]));
  for (let k = 0; k <= SWAP_STEPS; k += 1)
    stations.add(swap.startX - (swap.length * k) / SWAP_STEPS);
  const lift = frontLane > lane ? CROSS_LIFT * ropeRadius : 0;
  return [...stations]
    .filter((x) => x <= (path[0] as Vec3)[0] + 1e-9 && x >= (path[path.length - 1] as Vec3)[0])
    .sort((a, b) => b - a)
    .map((x) => {
      const p = pathAtX(path, x);
      const s = smoothstep((swap.startX - x) / swap.length);
      return [
        p[0],
        p[1] + ropeRadius + lift * Math.sin(Math.PI * s),
        p[2] + from + (to - from) * s,
      ];
    });
}

/**
 * Where the channel's centre line is at station x (m), also in front of its first point, where
 * it carries on along its first stretch (M60c: the guide blocks stand there).
 */
export function channelCentre(side: Side, x: number, data: BoatData = boat): Vec3 {
  const path = channelPath(side, data);
  const a = path[0] as Vec3;
  const b = path[1] as Vec3;
  if (x <= a[0]) return pathAtX(path, x);
  const t = (a[0] - x) / (a[0] - b[0]);
  return [x, a[1], a[2] + (b[2] - a[2]) * t];
}

/** Sprayhood: half-width at x (its side edge rests on the channel's centre line). */
export function sprayhoodHalfWidth(x: number, data: BoatData = boat): number {
  return Math.abs(pathAtX(channelPath(1, data), x)[2]);
}

/** Sprayhood: height of its side edges at x (on top of the channel cover). */
export function sprayhoodBaseY(x: number, data: BoatData = boat): number {
  return pathAtX(channelPath(1, data), x)[1] + data.rig.lineLead.channel.coverHeight;
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Sprayhood surface height at station x and across-fraction s (−1 = port edge, 0 = middle,
 * +1 = starboard edge): an arch across, rising from the front edge over the windscreen length.
 */
export function sprayhoodTopY(x: number, s: number, data: BoatData = boat): number {
  const hood = data.modelDetail.sprayhood;
  const base = sprayhoodBaseY(x, data);
  const rise = smoothstep((hood.frontX - x) / hood.windscreenLength);
  const p = hood.archExponent;
  const arch = Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(s)), p)), 1 / p);
  const crown = data.deck.coachroof.topY + hood.crownAboveCoachroof;
  return base + (crown - base) * rise * arch;
}

/** True if a rope of radius `radius` centred at p would cut into the sprayhood. */
export function cutsSprayhood(p: Vec3, radius: number, data: BoatData = boat): boolean {
  const hood = data.modelDetail.sprayhood;
  const [x, y, z] = p;
  if (x > hood.frontX + radius || x < hood.aftX - radius) return false;
  const cx = Math.min(hood.frontX, Math.max(hood.aftX, x));
  const half = sprayhoodHalfWidth(cx, data);
  if (Math.abs(z) > half + radius) return false;
  if (y < sprayhoodBaseY(cx, data) - radius) return false;
  const s = Math.max(-1, Math.min(1, z / half));
  return y < sprayhoodTopY(cx, s, data) + radius;
}

/** Lowest height a rope of `radius` centred at (x, z) must have to lie on top of the hood. */
export function sprayhoodClearY(
  x: number,
  z: number,
  radius: number,
  data: BoatData = boat,
): number {
  const hood = data.modelDetail.sprayhood;
  const cx = Math.min(hood.frontX, Math.max(hood.aftX, x));
  const half = sprayhoodHalfWidth(cx, data);
  return sprayhoodTopY(cx, Math.max(-1, Math.min(1, z / half)), data) + radius;
}

/** Half-width of the coachroof outline at x (linear between its points; the front value beyond). */
function roofHalfAt(x: number, data: BoatData): number {
  const outline = coachroofHalfOutline(data.deck.coachroof.frontX, data);
  for (let i = 1; i < outline.length; i += 1) {
    const [x0, w0] = outline[i - 1] as [number, number];
    const [x1, w1] = outline[i] as [number, number];
    if (x <= x1) return w0 + ((w1 - w0) * (x - x0)) / Math.max(1e-9, x1 - x0);
  }
  return data.deck.coachroof.frontHalfWidth;
}

/**
 * The side deck's inner edge (half-width, m) at station x, aft of the coachroof front: the
 * coachroof's edge (less the overlap) down to the cockpit front, the well's edge aft of it.
 */
export function sideDeckInnerHalfWidth(x: number, data: BoatData = boat): number {
  const { coachroof: roof, cockpit } = data.deck;
  return x >= cockpit.frontX - DECK_EPS
    ? roofHalfAt(Math.max(x, roof.aftX), data) - DECK_OVERLAP
    : cockpit.wellHalfWidth;
}

/**
 * The toerail's cross-section at station x, starboard, as [y, z]: outer-bottom, outer-top,
 * inner-top, inner-bottom. Its outer face lies `outset` outside the hull shell.
 */
export function toerailSection(x: number, data: BoatData = boat): [number, number][] {
  const t = data.deckFittings.toerail;
  const b = halfBeamAt(x, data);
  const s = sheerAt(x, data);
  return [
    [s - DECK_OVERLAP, b + t.outset],
    [s + t.height, b + t.outset],
    [s + t.height, b - t.width],
    [s - DECK_EPS, b - t.width],
  ];
}

/**
 * The solid moulding under one channel's slope, as rings of [inner-bottom, inner-top,
 * outer-top, outer-bottom] corners ([x, y, z]), forward ring first. It runs from just inside the
 * coachroof's aft end to the point where the channel lies on the coaming top. The channel cover
 * sits on it and closes its top.
 */
export function channelFairingRings(side: Side, data: BoatData = boat): Vec3[][] {
  const { coachroof: roof, cockpit } = data.deck;
  const channel = data.rig.lineLead.channel;
  const path = channelPath(side, data);
  const stations: Vec3[] = [pathAtX(path, roof.aftX + DECK_OVERLAP)];
  for (const p of path) {
    if (p[0] >= roof.aftX) continue;
    stations.push(p);
    if (p[1] <= cockpit.coamingTopY + DECK_EPS) break;
  }
  const h = channel.width / 2;
  return stations.map(([x, y, z]) => {
    // M60b: the outer face reaches the roof's side line; the bottoms stay where the channel's own
    // outer edge puts them.
    const roofSide = Math.max(Math.abs(z) + h, roof.halfWidth);
    const bottom = (cornerZ: number): number =>
      x < cockpit.frontX && Math.abs(cornerZ) < cockpit.wellHalfWidth
        ? cockpit.soleY
        : sheerAt(x, data) - DECK_OVERLAP;
    const inner = z - side * h;
    const outer = z + side * h;
    return [
      [x, bottom(inner), inner],
      [x, y, inner],
      [x, y, side * roofSide],
      [x, bottom(outer), side * roofSide],
    ];
  });
}
