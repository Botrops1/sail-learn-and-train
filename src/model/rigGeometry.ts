import { boat, type BoatData } from './boat';
import { add, cross, normalize, rotateAroundAxis, scale, sub, vec3, type Vec3 } from './vec3';

/**
 * Static rig geometry derived from hanse508.json (PHASE1_SPEC 6.1, 8.5, 8.6).
 * M1 shows the boom at θ = 0, ψ = 0 and the sails as flat triangles; the solver comes in M2/M3.
 */

const DEG = Math.PI / 180;

export interface SailCorners {
  tack: Vec3;
  head: Vec3;
  clew: Vec3;
}

/** Boom pose: swing θ (+ = boom to starboard) and pitch ψ (+ = boom end up), degrees. */
export interface BoomPose {
  thetaDeg: number;
  psiDeg: number;
}

export const CENTRED_BOOM: Readonly<BoomPose> = { thetaDeg: 0, psiDeg: 0 };

/**
 * Point on the boom `distance` metres from the gooseneck (PHASE1_SPEC 8.2):
 * B(θ, ψ) = gooseneck + d · (−cos ψ · cos θ, sin ψ, cos ψ · sin θ).
 */
export function boomPoint(
  distance: number,
  pose: BoomPose = CENTRED_BOOM,
  data: BoatData = boat,
): Vec3 {
  const theta = pose.thetaDeg * DEG;
  const psi = pose.psiDeg * DEG;
  const direction: Vec3 = [
    -Math.cos(psi) * Math.cos(theta),
    Math.sin(psi),
    Math.cos(psi) * Math.sin(theta),
  ];
  return add(vec3(data.rig.boom.gooseneck), scale(direction, distance));
}

/**
 * Mainsail corners (PHASE1_SPEC 8.6): the luff runs up the mast from the tack
 * (gooseneck + tackHeightAboveBoom) to headY; the clew sits on the boom at f · footLength.
 */
export function mainSailCorners(
  unfurled = 1,
  pose: BoomPose = CENTRED_BOOM,
  data: BoatData = boat,
): SailCorners {
  const sail = data.sails.main;
  const gooseneck = vec3(data.rig.boom.gooseneck);
  const lift: Vec3 = [0, sail.tackHeightAboveBoom, 0];
  return {
    tack: add(gooseneck, lift),
    head: [gooseneck[0], sail.headY, gooseneck[2]],
    clew: add(boomPoint(unfurled * sail.footLength, pose, data), lift),
  };
}

/**
 * The jib clew with the jib on the centreline (φ = 0, PHASE1_SPEC 8.5): `clewTrimmedRef`
 * rotated around the luff axis (tack → head) until z = 0. Of the two solutions, the one with
 * the smaller rotation keeps the clew aft of the luff.
 */
export function jibCentrelineClew(data: BoatData = boat): Vec3 {
  const jib = data.sails.jib;
  const tack = vec3(jib.tack);
  const axis = normalize(sub(vec3(jib.head), tack));
  const v = sub(vec3(jib.clewTrimmedRef), tack);
  // z(φ) = v.z · cos φ + (k × v).z · sin φ + k.z · (k · v) · (1 − cos φ). The forestay lies in
  // the centre plane (k.z = 0), so z(φ) = 0 where tan φ = −v.z / (k × v).z.
  const w = cross(axis, v)[2];
  const angle = Math.atan2(-v[2], w);
  const clewOffset = rotateAroundAxis(v, axis, normalizeAngle(angle));
  return add(tack, clewOffset);
}

/** Jib corners at φ = 0. Furling moves the clew along the foot towards the tack. */
export function jibCorners(unfurled = 1, data: BoatData = boat): SailCorners {
  const tack = vec3(data.sails.jib.tack);
  const clew = jibCentrelineClew(data);
  return {
    tack,
    head: vec3(data.sails.jib.head),
    clew: add(tack, scale(sub(clew, tack), unfurled)),
  };
}

/** Wraps an angle to (−π/2, π/2]: the smaller of the two rotations that reach z = 0. */
function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI / 2) a -= Math.PI;
  while (a <= -Math.PI / 2) a += Math.PI;
  return a;
}

/** The boom end (outer end of the boom) for a pose. */
export function boomEnd(pose: BoomPose = CENTRED_BOOM, data: BoatData = boat): Vec3 {
  return boomPoint(data.rig.boom.length, pose, data);
}

/**
 * Self-tacking track (PHASE1_SPEC 6.1): a circular arc in plan view, centred on the jib tack,
 * passing through x = centreX on the centreline, ending at z = ±halfSpan.
 * Returns points from the port end to the starboard end.
 */
export function selfTackingTrackPoints(segments = 24, data: BoatData = boat): Vec3[] {
  const track = data.rig.selfTackingTrack;
  const tack = vec3(data.sails.jib.tack);
  const radius = tack[0] - track.centreX;
  const maxAngle = Math.asin(track.halfSpan / radius);
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = -maxAngle + (2 * maxAngle * i) / segments;
    points.push([tack[0] - radius * Math.cos(a), track.y, radius * Math.sin(a)]);
  }
  return points;
}
