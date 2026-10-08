import { boat, type BoatData } from './boat';
import { fillFor, leewardSide, type RopeStatus, type Side } from './boomSolver';
import { jibCentrelineClew } from './rigGeometry';
import { capPaidOut } from './ropeLengths';
import { add, distance, normalize, rotateAroundAxis, scale, sub, vec3, type Vec3 } from './vec3';

/**
 * Self-tacking jib (PHASE1_SPEC 8.5): a quasi-static teaching approximation.
 *
 * The jib is a rigid triangle hinged on its luff (tack → head, along the forestay). The clew
 * only rotates around the luff by φ (+ = clew to starboard). Furling moves the clew along the
 * foot towards the tack (unfurled fraction f). The car slides on the straight track to the
 * point nearest the clew in plan, so it is always on the jib's side: that is what makes it
 * self-tacking. The sheet's working length is the distance clew → car block.
 */

const DEG = Math.PI / 180;

/** Bisection steps: 40 halvings of 90° is far below a millionth of a degree. */
const BISECTION_STEPS = 40;

interface JibFrame {
  tack: Vec3;
  head: Vec3;
  /** Unit vector along the luff, tack → head. */
  axis: Vec3;
  /** Clew relative to the tack with the jib on the centreline (φ = 0), fully unfurled. */
  foot: Vec3;
  /** Rotation at which the chord heading reaches the boom's maximum swing: the allowed range. */
  maxPhiDeg: number;
  /** ℓ_geoMin: shortest clew–car distance over the allowed rotation range, fully unfurled. */
  sheetMin: number;
}

const frames = new WeakMap<BoatData, JibFrame>();

function frameFor(data: BoatData): JibFrame {
  const cached = frames.get(data);
  if (cached) return cached;
  const jib = data.sails.jib;
  const tack = vec3(jib.tack);
  const head = vec3(jib.head);
  const axis = normalize(sub(head, tack));
  const foot = sub(jibCentrelineClew(data), tack);
  const clewAt = (phiDeg: number, f: number) =>
    add(tack, rotateAroundAxis(scale(foot, f), axis, phiDeg * DEG));
  const headingAt = (phiDeg: number) => Math.abs(headingOf(tack, clewAt(phiDeg, 1)));
  // The chord heading grows with φ (the clew swings out around the forestay).
  const maxPhiDeg = bisectLargest(0, 90, (phi) => headingAt(phi) <= data.rig.boom.maxSwingDeg);
  // ℓ_geoMin, computed once (PHASE1_SPEC 8.5): sample the whole allowed range, both sides.
  let sheetMin = distance(clewAt(0, 1), carPoint(clewAt(0, 1), data));
  const samples = Math.ceil(2 * maxPhiDeg * 4);
  for (let i = 0; i <= samples; i += 1) {
    const phi = -maxPhiDeg + (2 * maxPhiDeg * i) / samples;
    const clew = clewAt(phi, 1);
    sheetMin = Math.min(sheetMin, distance(clew, carPoint(clew, data)));
  }
  const frame = { tack, head, axis, foot, maxPhiDeg, sheetMin };
  frames.set(data, frame);
  return frame;
}

/** Largest x in [lo, hi] with ok(x), assuming ok holds from lo up to some point. */
function bisectLargest(lo: number, hi: number, ok: (x: number) => boolean): number {
  if (!ok(lo)) return lo;
  if (ok(hi)) return hi;
  let a = lo;
  let b = hi;
  for (let i = 0; i < BISECTION_STEPS; i += 1) {
    const mid = (a + b) / 2;
    if (ok(mid)) a = mid;
    else b = mid;
  }
  return a;
}

/** Horizontal angle of tack → clew from the aft centreline, degrees, + = to starboard. */
function headingOf(tack: Vec3, clew: Vec3): number {
  return Math.atan2(clew[2] - tack[2], -(clew[0] - tack[0])) / DEG;
}

/** The clew for a rotation φ (degrees, + = to starboard) and unfurled fraction f (0..1). */
export function jibClew(phiDeg: number, unfurled = 1, data: BoatData = boat): Vec3 {
  const frame = frameFor(data);
  return add(frame.tack, rotateAroundAxis(scale(frame.foot, unfurled), frame.axis, phiDeg * DEG));
}

/** Chord heading of the jib (tack → clew), degrees from the aft centreline, + = to starboard. */
export function jibHeadingDeg(clew: Vec3, data: BoatData = boat): number {
  return headingOf(frameFor(data).tack, clew);
}

/** The largest rotation the jib may have (chord heading at the boom's maximum swing). */
export function jibMaxPhiDeg(data: BoatData = boat): number {
  return frameFor(data).maxPhiDeg;
}

/**
 * The car's sheet block: on the straight track at the point nearest the clew in plan, clamped
 * to the track ends, `sheetBlockHeight` above the track.
 */
export function carPoint(clew: Vec3, data: BoatData = boat): Vec3 {
  const track = data.rig.selfTackingTrack;
  const z = Math.min(track.halfSpan, Math.max(-track.halfSpan, clew[2]));
  return [track.centreX, track.y + track.sheetBlockHeight, z];
}

/** Working length of the jib sheet: clew → car block, for φ and the unfurled fraction. */
export function jibSheetSpan(phiDeg: number, unfurled = 1, data: BoatData = boat): number {
  const clew = jibClew(phiDeg, unfurled, data);
  return distance(clew, carPoint(clew, data));
}

/** ℓ_geoMin (PHASE1_SPEC 8.5), computed once per boat. */
export function jibSheetMin(data: BoatData = boat): number {
  return frameFor(data).sheetMin;
}

/** ℓ_avail for the control value: ℓ_geoMin + e/100 · maxEaseBeyondMin. */
export function availableJibSheet(easedPct: number, data: BoatData = boat): number {
  return jibSheetMin(data) + (easedPct / 100) * data.sails.jib.sheet.maxEaseBeyondMin;
}

/** Rope paid out at the clutch from fully hauled: purchase · (ℓ_avail − ℓ_geoMin), capped. */
export function jibSheetPaidOut(easedPct: number, data: BoatData = boat): number {
  const paid =
    data.sails.jib.sheet.purchase * (availableJibSheet(easedPct, data) - jibSheetMin(data));
  return capPaidOut('rope_jib_sheet', paid, data);
}

/**
 * Jib furling line paid out from fully hauled (fully hauled = jib rolled away). Unfurling winds
 * the line back onto the drum, so it pays out at the clutch.
 */
export function jibFurlingLinePaidOut(unfurled: number, data: BoatData = boat): number {
  const f = Math.min(1, Math.max(0, unfurled));
  return capPaidOut('rope_jib_furling_line', f * data.rig.jibFurler.lineTravelM, data);
}

/**
 * The most the jib can be furled with this much sheet (PT-13): the smallest unfurled fraction
 * whose clew can still reach (with the jib on the centreline, where it needs the least sheet).
 * Furling moves the clew forward, away from the car.
 */
export function minUnfurledFor(available: number, data: BoatData = boat): number {
  // The span at φ = 0 shrinks as the clew comes back out along the foot (f grows).
  if (jibSheetSpan(0, 0, data) <= available) return 0;
  return 1 - bisectLargest(0, 1, (g) => jibSheetSpan(0, 1 - g, data) <= available);
}

/** Largest rotation (≥ 0) at which the sheet still reaches: span(φ, f) ≤ available. */
export function maxPhiForSheet(available: number, unfurled: number, data: BoatData = boat): number {
  return bisectLargest(
    0,
    jibMaxPhiDeg(data),
    (phi) => jibSheetSpan(phi, unfurled, data) <= available,
  );
}

/** Rotation (≥ 0) at which the chord heading reaches `headingDeg` (the same for any furl). */
export function phiForHeading(headingDeg: number, data: BoatData = boat): number {
  return bisectLargest(0, jibMaxPhiDeg(data), (phi) => {
    return Math.abs(jibHeadingDeg(jibClew(phi, 1, data), data)) <= headingDeg;
  });
}

/**
 * Degrees the chord has swung beyond the point where the car reaches the end of the track. The
 * jib's extra twist grows with it (visual.jibTwistPerDegEasedBeyondTrack, PT-11).
 */
export function degreesBeyondTrack(
  phiDeg: number,
  unfurled: number,
  data: BoatData = boat,
): number {
  const halfSpan = data.rig.selfTackingTrack.halfSpan;
  const phi = Math.abs(phiDeg);
  // The car follows the clew until the clew passes the end of the track.
  const carFollows = (p: number) => Math.abs(jibClew(p, unfurled, data)[2]) < halfSpan;
  const max = jibMaxPhiDeg(data);
  if (carFollows(max) || carFollows(phi)) return 0;
  const atEnd = bisectLargest(0, max, carFollows);
  const heading = (p: number) => Math.abs(jibHeadingDeg(jibClew(p, unfurled, data), data));
  return Math.max(0, heading(phi) - heading(atEnd));
}

/** Twist at the head of the jib, degrees: base twist plus the extra beyond the track end. */
export function jibTwistDeg(phiDeg: number, unfurled: number, data: BoatData = boat): number {
  const v = data.visual;
  return (
    v.baseTwistDeg + v.jibTwistPerDegEasedBeyondTrack * degreesBeyondTrack(phiDeg, unfurled, data)
  );
}

export interface JibInput {
  /** Where the wind comes from, (−180, 180], + = from starboard. */
  windFromDeg: number;
  windSpeedKn: number;
  /** Jib sheet, % eased (0 = hauled in). */
  sheetPct: number;
  /** Jib out as asked for, % unfurled. The sheet may stop the furl earlier (PT-13). */
  unfurledPct: number;
  /** The side the boom is on: near dead astern the jib stays with it (PHASE1_SPEC 8.1). */
  boomSide: Side;
}

/** What the jib solver carries over from the previous frame. */
export interface JibMemory {
  side: Side;
  /** Current rotation, used when there is no wind to push the jib. */
  phiDeg: number;
}

export interface JibSolution {
  side: Side;
  /** Rotation of the clew around the luff, degrees, + = to starboard. */
  phiDeg: number;
  /** Chord heading (tack → clew), degrees from aft, + = to starboard. */
  headingDeg: number;
  /** Where the wind wants the chord (signed, on the jib's side). */
  freeHeadingDeg: number;
  /** Unfurled fraction actually reached (0..1): the sheet may hold the clew out (PT-13). */
  unfurled: number;
  /** The furl asked for is further than the sheet allows: "Ease the jib sheet to furl further". */
  furlBlocked: boolean;
  /** The jib is rolled away: nothing for the wind to push. */
  furled: boolean;
  /** Wind on the same side as the jib, near dead astern. */
  byTheLee: boolean;
  /** The jib changed sides (the car slid across). */
  tack: boolean;
  /** Angle of attack, degrees (≥ 0). */
  aoaDeg: number;
  /** 0 = luffing (flapping), 1 = filled. */
  fill: number;
  sheet: RopeStatus;
  /** Where the car sits on the track, z (+ = starboard). */
  carZ: number;
  /** Twist at the head, degrees. */
  twistDeg: number;
  /** ℓ_avail and the working length used at the solved pose. */
  sheetAvailable: number;
  sheetUsed: number;
}

/**
 * The jib's side (PHASE1_SPEC 8.1): to leeward, so the car crosses when the wind crosses the
 * bow. Near dead astern (inside the gybe band) it stays on the boom's side. No wind, or wind
 * dead ahead: no change.
 */
export function decideJibSide(
  windFromDeg: number,
  windSpeedKn: number,
  current: Side,
  boomSide: Side,
  data: BoatData = boat,
): Side {
  if (windSpeedKn < data.visual.solver.minWindKn) return current;
  if (180 - Math.abs(windFromDeg) < data.visual.gybeHysteresisDeg) return boomSide;
  return leewardSide(windFromDeg) ?? current;
}

export function solveJib(input: JibInput, memory: JibMemory, data: BoatData = boat): JibSolution {
  const { solver } = data.visual;
  const available = availableJibSheet(input.sheetPct, data);

  // Furling needs sheet: the clew moves forward, away from the car (PT-13).
  const asked = Math.min(1, Math.max(0, input.unfurledPct / 100));
  const reachable = minUnfurledFor(available, data);
  const unfurled = Math.max(asked, reachable);
  const furlBlocked = asked < reachable - 1e-9;
  const furled = unfurled * 100 < solver.furledBelowPct;
  const windy = input.windSpeedKn >= solver.minWindKn && !furled;

  const side = windy
    ? decideJibSide(input.windFromDeg, input.windSpeedKn, memory.side, input.boomSide, data)
    : memory.side;
  const tack = side !== memory.side;

  // Where the wind wants the jib: its chord pointing downwind (like the boom). No wind or no
  // sail: it stays where it is, unless the sheet pulls it in.
  const freeHeading = windy
    ? Math.min(Math.abs(input.windFromDeg), data.rig.boom.maxSwingDeg)
    : Math.abs(jibHeadingDeg(jibClew(memory.phiDeg, unfurled, data), data));
  const phiFree = phiForHeading(freeHeading, data);
  const phiSheet = maxPhiForSheet(available, unfurled, data);
  const phi = Math.min(phiFree, phiSheet);
  const phiDeg = side * phi;
  const clew = jibClew(phiDeg, unfurled, data);
  const heading = Math.abs(jibHeadingDeg(clew, data));
  const sheetUsed = distance(clew, carPoint(clew, data));

  const leeward = leewardSide(input.windFromDeg);
  const inGybeBand = 180 - Math.abs(input.windFromDeg) < data.visual.gybeHysteresisDeg;
  const byTheLee = windy && inGybeBand && leeward !== null && leeward !== side;
  const aoaDeg = Math.max(0, Math.abs(input.windFromDeg) - heading);
  const fill = !windy ? 0 : byTheLee ? 1 : fillFor(aoaDeg, data);

  // Taut when the sheet holds the jib in (or holds the clew out against the furl) and has no
  // spare rope; otherwise slack, with its spare rope at the clutch.
  const spare = Math.max(0, available - sheetUsed);
  const constrains = freeHeading - heading > solver.tautToleranceDeg || furlBlocked;
  const sheet: RopeStatus =
    constrains && spare < solver.tautToleranceM
      ? { state: 'taut', slack: 0 }
      : { state: 'slack', slack: data.sails.jib.sheet.purchase * spare };

  return {
    side,
    phiDeg,
    headingDeg: side * heading,
    freeHeadingDeg: side * freeHeading,
    unfurled,
    furlBlocked,
    furled,
    byTheLee,
    tack,
    aoaDeg,
    fill,
    sheet,
    carZ: carPoint(clew, data)[2],
    twistDeg: jibTwistDeg(phiDeg, unfurled, data),
    sheetAvailable: available,
    sheetUsed,
  };
}
