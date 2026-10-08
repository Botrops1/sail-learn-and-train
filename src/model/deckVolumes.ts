import { boat, type BoatData } from './boat';
import { sheerAt } from './hullShape';
import { vec3, type Vec3 } from './vec3';

/**
 * Solid shapes on deck that ropes must not pass through (M3b): the coachroof, the sprayhood
 * and the covered line channels. Pure maths shared by the 3D builder and the tests.
 * Boat frame: x forward, y up, z starboard.
 */

type Side = 1 | -1;

/**
 * Starboard half of the coachroof outline at the given front x, aft to front, as [x, half-width]:
 * the drawing's width at the aft end, widening to maxHalfWidth at the mast, front corners cut.
 */
export function coachroofHalfOutline(frontX: number, data: BoatData = boat): [number, number][] {
  const r = data.deck.coachroof;
  const chamferAt = (x: number) =>
    r.maxHalfWidth +
    ((r.frontHalfWidth - r.maxHalfWidth) * (x - r.chamferStartX)) / (r.frontX - r.chamferStartX);
  return [
    [r.aftX, r.halfWidth],
    [r.maxHalfWidthFromX, r.maxHalfWidth],
    [r.chamferStartX, r.maxHalfWidth],
    [frontX, chamferAt(frontX)],
  ];
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
  const half = halfWidthAt(coachroofHalfOutline(frontX, data), x);
  if (half < 0) {
    // Fore or aft of the outline: only the rope's radius can reach it.
    const nearest = Math.min(Math.abs(x - r.aftX), Math.abs(x - frontX));
    return nearest < radius && Math.abs(z) < r.halfWidth;
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

/**
 * The centre line of one rope's lane through the channel: on the floor plus the rope's radius.
 * The lane moves from `frontLane` (mast end) to `lane` (clutch end) along the first stretch
 * of the channel, under its cover.
 */
export function channelLane(
  side: Side,
  lane: number,
  frontLane: number,
  ropeRadius: number,
  data: BoatData = boat,
): Vec3[] {
  return channelPath(side, data).map((p, i) => {
    const offset = laneOffset(i === 0 ? frontLane : lane, data);
    return [p[0], p[1] + ropeRadius, p[2] + offset];
  });
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
