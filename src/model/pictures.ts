import { DEG } from './angles';
import { boat, type BoatData } from './boat';
import { leewardSide, sheetLead } from './gennaker';
import { vec3, type Vec3 } from './vec3';

/**
 * Pictures of sails this boat does not carry (PHASE_RIGGING_SPEC 11): a symmetric spinnaker on
 * its pole and a code 0 on its furler, drawn only while Learn's "Show it working" shows one.
 * Pure: no DOM, no three.js. Boat frame: x forward, y up, z to starboard. Side: 1 = starboard.
 */
export type PictureId = 'spinnaker' | 'code0'; // M110 adds 'traveller'

/** The pictures a link can name, in the order Learn lists them. */
export const PICTURE_IDS: readonly PictureId[] = ['spinnaker', 'code0'];

/** True when `value` names a picture (a link's `pic`). */
export function isPictureId(value: unknown): value is PictureId {
  return typeof value === 'string' && (PICTURE_IDS as readonly string[]).includes(value);
}

/** The pole's angle from straight across the boat towards the bow: at right angles to the apparent wind, within its stops. */
export function polePlanDeg(awaDeg: number, data: BoatData = boat): number {
  const p = data.pictures.spinnaker;
  return Math.min(p.poleMaxDeg, Math.max(p.poleMinDeg, Math.abs(awaDeg) - 90));
}

export interface SpinnakerPicture {
  /** The pole's side, the windward one: 1 starboard, −1 port. */
  side: 1 | -1;
  poleEnd: Vec3;
  head: Vec3;
  clew: Vec3;
  /** From the clew to the leeward winch. */
  sheet: Vec3[];
  /** From the pole's outer end (the tack) to the windward winch. */
  guy: Vec3[];
  poleLift: Vec3[];
  downhaul: Vec3[];
}

/** The symmetric spinnaker for the apparent wind angle `awaDeg` (+ = wind over starboard). */
export function spinnakerPicture(awaDeg: number, data: BoatData = boat): SpinnakerPicture {
  const p = data.pictures.spinnaker;
  // The pole goes to windward: the side the sail's tack is on.
  const s = (leewardSide(awaDeg) === 1 ? -1 : 1) as 1 | -1;
  const psi = polePlanDeg(awaDeg, data);
  const heel = vec3(p.poleHeel);
  const L = p.poleLengthM;
  const poleEnd: Vec3 = [
    heel[0] + L * Math.cos(psi * DEG),
    heel[1],
    heel[2] + s * L * Math.sin(psi * DEG),
  ];
  const clewPsi = (psi + p.clewExtraDeg) * DEG;
  const clew: Vec3 = [heel[0] + L * Math.cos(clewPsi), p.clewY, -s * L * Math.sin(clewPsi)];
  return {
    side: s,
    poleEnd,
    head: vec3(p.head),
    clew,
    sheet: [clew, ...sheetLead(-s as 1 | -1, data)],
    guy: [poleEnd, ...sheetLead(s, data)],
    poleLift: [vec3(p.poleLiftFrom), poleEnd],
    downhaul: [poleEnd, vec3(p.downhaulTo)],
  };
}

export interface CodeZeroPicture {
  /** The clew's side, the leeward one: 1 starboard, −1 port. */
  side: 1 | -1;
  tack: Vec3;
  head: Vec3;
  clew: Vec3;
  sheet: Vec3[];
}

/** The code 0 for the apparent wind angle `awaDeg`: tacked at the bow, the clew to leeward. */
export function codeZeroPicture(awaDeg: number, data: BoatData = boat): CodeZeroPicture {
  const c = data.pictures.codeZero;
  const s = leewardSide(awaDeg);
  const tack = vec3(c.tack);
  const clew: Vec3 = [
    tack[0] - c.footM * Math.cos(c.phiDeg * DEG),
    c.clewY,
    tack[2] + s * c.footM * Math.sin(c.phiDeg * DEG),
  ];
  return { side: s, tack, head: vec3(c.head), clew, sheet: [clew, ...sheetLead(s, data)] };
}
