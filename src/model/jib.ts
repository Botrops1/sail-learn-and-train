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
  /**
   * ℓ_hauled: the clew–car distance with the jib fully out and the car just at the end of the
   * track (the jib about 14° out). Fully hauled, the sheet holds the jib there: the track's ends
   * set how far in a self-tacking jib can be pulled, and the car stays at the leeward end (PT-10).
   */
  sheetHauled: number;
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
  // ℓ_hauled, computed once (PHASE1_SPEC 8.5): the clew where the car reaches the track end.
  const halfSpan = data.rig.selfTackingTrack.halfSpan;
  const atTrackEnd = bisectLargest(0, maxPhiDeg, (phi) => clewAt(phi, 1)[2] <= halfSpan);
  const hauledClew = clewAt(atTrackEnd, 1);
  const sheetHauled = distance(hauledClew, carPoint(hauledClew, data));
  const frame = { tack, head, axis, foot, maxPhiDeg, sheetHauled };
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
  const aft = -(clew[0] - tack[0]);
  const across = clew[2] - tack[2];
  // A fully furled clew sits on the tack: no direction, call it centred.
  if (Math.hypot(aft, across) < 1e-9) return 0;
  return Math.atan2(across, aft) / DEG;
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

/** ℓ_hauled (PHASE1_SPEC 8.5): the working length fully hauled, computed once per boat. */
export function jibSheetHauled(data: BoatData = boat): number {
  return frameFor(data).sheetHauled;
}

/** ℓ_avail for sailing: ℓ_hauled + e/100 · maxEaseBeyondHauled. */
export function availableJibSheet(easedPct: number, data: BoatData = boat): number {
  return jibSheetHauled(data) + (easedPct / 100) * data.sails.jib.sheet.maxEaseBeyondHauled;
}

/**
 * Fully eased (`sheet.releasedAtPct`, 100 %), the sheet counts as released for furling: it runs
 * out as far as the furl needs (owner decision after M3), so the jib can be rolled away.
 */
export function jibSheetReleased(easedPct: number, data: BoatData = boat): boolean {
  return easedPct >= data.sails.jib.sheet.releasedAtPct;
}

/**
 * ℓ_avail while the sheet is released and the jib partly furled: the larger of the sailing
 * length and the length the furl needs to keep the jib at `keepPhiDeg` (the angle it has).
 * A fully unfurled jib uses the sailing length, so sailing (PT-11) does not change.
 */
export function releasedJibSheet(
  easedPct: number,
  unfurled: number,
  keepPhiDeg: number,
  data: BoatData = boat,
): number {
  return Math.max(availableJibSheet(easedPct, data), jibSheetSpan(keepPhiDeg, unfurled, data));
}

/** Rope paid out at the clutch for a working length ℓ: purchase · (ℓ − ℓ_hauled), capped. */
export function jibSheetPaidOutFor(available: number, data: BoatData = boat): number {
  const paid = data.sails.jib.sheet.purchase * (available - jibSheetHauled(data));
  return capPaidOut('rope_jib_sheet', paid, data);
}

/** Rope paid out at the clutch from fully hauled, while sailing (jib fully out). */
export function jibSheetPaidOut(easedPct: number, data: BoatData = boat): number {
  return jibSheetPaidOutFor(availableJibSheet(easedPct, data), data);
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

/**
 * Jib out (0..1) once the ropes have arrived at the controls, starting from `reached`, the
 * fraction it has now (the same rule as in solveJib). A link without history starts fully out
 * (`reached` = 1): there, a furl the sheet does not allow is blocked. A jib already furled
 * further (sheet released, then hauled) stays furled: the sheet fights the furling line.
 */
export function settledJibUnfurled(
  sheetPct: number,
  unfurledPct: number,
  reached: number,
  data: BoatData = boat,
): number {
  const asked = Math.min(1, Math.max(0, unfurledPct / 100));
  const reachable = jibSheetReleased(sheetPct, data)
    ? 0
    : minUnfurledFor(availableJibSheet(sheetPct, data), data);
  return Math.max(asked, Math.min(reachable, reached));
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
  /**
   * The sheet is set to its release point (`jibSheetReleased` of the control's target, so the
   * release does not wait for the rope's lag to arrive exactly at 100 %).
   */
  sheetReleased: boolean;
  /** The side the boom is on: near dead astern the jib stays with it (PHASE1_SPEC 8.1). */
  boomSide: Side;
}

/** What the jib solver carries over from the previous frame. */
export interface JibMemory {
  side: Side;
  /** Current rotation, used when there is no wind to push the jib. */
  phiDeg: number;
  /**
   * Unfurled fraction reached so far. Hauling the sheet does not pull a jib that was furled
   * with the sheet released back out of its furl: the sheet fights the furling line instead.
   */
  unfurled: number;
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
  /** The furl asked for is further than the sheet allows: "Ease the jib sheet fully …". */
  furlBlocked: boolean;
  /** Sheet fully eased (`releasedAtPct`): it runs out as far as the furl needs. */
  sheetReleased: boolean;
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

  // Furling needs sheet: the clew moves forward, away from the car (PT-13). Below the release
  // point the furl stops where the sheet is too short. A jib already furled further (with the
  // sheet released) stays furled when the sheet is hauled: the furling line holds it, and the
  // sheet pulls against it (fighting). Released, the sheet runs out as far as the furl needs.
  const asked = Math.min(1, Math.max(0, input.unfurledPct / 100));
  const released = input.sheetReleased;
  const sailing = availableJibSheet(input.sheetPct, data);
  const reachable = released ? 0 : minUnfurledFor(sailing, data);
  const unfurled = Math.max(asked, Math.min(reachable, memory.unfurled));
  const furlBlocked = asked < unfurled - 1e-9;
  // Compared as lengths, with the same tolerance as the main sheet, so the chip clears as soon
  // as the jib is (visibly) out far enough for the sheet.
  const sheetFights =
    !released && jibSheetSpan(0, unfurled, data) > sailing + solver.tautToleranceM;
  const releasedFurling = released && unfurled < 1;
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
    : Math.abs(jibHeadingDeg(jibClew(memory.phiDeg, 1, data), data));
  const phiFree = phiForHeading(freeHeading, data);
  // Released while furling: the sheet runs out just as far as the furl needs to keep the jib at
  // the angle it already has (at least what the sailing length allows). Nothing pulls it in to
  // the centreline, it just flaps (decided after the M3 review). Releasing changes nothing at
  // that moment, so the jib does not jump.
  const available = releasedFurling
    ? releasedJibSheet(
        input.sheetPct,
        unfurled,
        Math.min(
          phiFree,
          Math.max(maxPhiForSheet(sailing, unfurled, data), Math.abs(memory.phiDeg)),
        ),
        data,
      )
    : sailing;
  const phiSheet = maxPhiForSheet(available, unfurled, data);
  const phi = Math.min(phiFree, phiSheet);
  const phiDeg = side * phi;
  const clew = jibClew(phiDeg, unfurled, data);
  // The chord's direction does not depend on the furl: measure it on the full foot.
  const heading = Math.abs(jibHeadingDeg(jibClew(phiDeg, 1, data), data));
  const sheetUsed = distance(clew, carPoint(clew, data));

  const leeward = leewardSide(input.windFromDeg);
  const inGybeBand = 180 - Math.abs(input.windFromDeg) < data.visual.gybeHysteresisDeg;
  const byTheLee = windy && inGybeBand && leeward !== null && leeward !== side;
  const aoaDeg = Math.max(0, Math.abs(input.windFromDeg) - heading);
  // A released sheet holds no shape: while it runs out for the furl, the jib flaps.
  const fill = !windy || releasedFurling ? 0 : byTheLee ? 1 : fillFor(aoaDeg, data);

  // Taut when the sheet holds the jib in (or holds the clew out against the furl) and has no
  // spare rope; otherwise slack, with its spare rope at the clutch. Fighting when it is hauled
  // shorter than a furled jib's clew needs.
  const spare = Math.max(0, available - sheetUsed);
  const constrains = freeHeading - heading > solver.tautToleranceDeg || furlBlocked;
  const sheet: RopeStatus = sheetFights
    ? { state: 'fighting', slack: 0 }
    : constrains && spare < solver.tautToleranceM && !releasedFurling
      ? { state: 'taut', slack: 0 }
      : { state: 'slack', slack: data.sails.jib.sheet.purchase * spare };

  return {
    side,
    phiDeg,
    headingDeg: side * heading,
    freeHeadingDeg: side * freeHeading,
    unfurled,
    furlBlocked,
    sheetReleased: released,
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
