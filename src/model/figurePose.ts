import { boat, type BoatData } from './boat';
import type { FigurePose } from './people';

/**
 * The captain's poses (PHASE_PEOPLE_SPEC 7.3): the joint angles at time `t`, from the owner's
 * mockup (docs/mockups/sailor-draft.html). Angles in radians, `rootY` in metres. The walk's
 * phase comes from the distance walked, so the feet do not slide. Pure: no three.js.
 */

export interface JointAngles {
  rootY: number;
  torsoX: number;
  torsoY: number;
  torsoZ: number;
  headX: number;
  headY: number;
  headZ: number;
  brow: number;
  browTilt: number;
  lSx: number;
  lSz: number;
  lEx: number;
  lEz: number;
  rSx: number;
  rSz: number;
  rEx: number;
  rEz: number;
  lHx: number;
  lKx: number;
  lAx: number;
  rHx: number;
  rKx: number;
  rAx: number;
}

/** The mockup's REST, value for value. */
export const REST_JOINTS: JointAngles = {
  rootY: 0,
  torsoX: 0,
  torsoY: 0,
  torsoZ: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  brow: 0,
  browTilt: 0,
  lSx: 0,
  lSz: 0.08,
  lEx: -0.15,
  lEz: 0,
  rSx: 0,
  rSz: -0.08,
  rEx: -0.15,
  rEz: 0,
  lHx: 0,
  lKx: 0,
  lAx: 0,
  rHx: 0,
  rKx: 0,
  rAx: 0,
};

/** Leg length (thigh + shin) the walk keeps the feet on the ground with; tied to SCENE.people.body by a test. */
export const FIGURE_LEG_M = 0.85;

const WALK_SWING = 0.42;

function stand(t: number): Partial<JointAngles> {
  const k = Math.sin(t * 1.6);
  return {
    torsoX: k * 0.008,
    torsoZ: Math.sin(t * 0.5) * 0.012,
    headY: Math.sin(t * 0.7) * 0.35,
    headX: Math.sin(t * 0.45) * 0.05,
    brow: Math.max(0, Math.sin(t * 1.1)) * 0.6,
    browTilt: Math.sin(t * 0.9) * 0.04,
    lSx: Math.sin(t * 1.3) * 0.04,
    rSx: -Math.sin(t * 1.3) * 0.04,
    rootY: k * 0.002,
  };
}

function walk(phase: number): Partial<JointAngles> {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const A = WALK_SWING;
  return {
    rootY: -FIGURE_LEG_M * (1 - Math.cos(A * Math.abs(s))),
    lHx: -A * s,
    rHx: A * s,
    lKx: Math.max(0, c) * 0.75,
    rKx: Math.max(0, -c) * 0.75,
    lAx: -(-A * s + Math.max(0, c) * 0.75) * 0.7,
    rAx: -(A * s + Math.max(0, -c) * 0.75) * 0.7,
    lSx: s * 0.4,
    rSx: -s * 0.4,
    lEx: -0.25 - Math.max(0, s) * 0.3,
    rEx: -0.25 - Math.max(0, -s) * 0.3,
    torsoY: s * 0.1,
    torsoZ: s * 0.025,
    torsoX: 0.03,
    headY: -s * 0.08,
    headZ: -s * 0.02,
  };
}

/** The mockup's `pull`: the two hands take turns. */
function work(t: number): Partial<JointAngles> {
  const ph = t * 3.2;
  const u = (Math.sin(ph) + 1) / 2;
  const v = 1 - u;
  return {
    torsoX: 0.04 - 0.2 * (0.5 + 0.25 * Math.sin(ph)),
    headX: -0.18,
    brow: 0.5,
    lSx: -(1.05 - 0.3 * u),
    lEx: -(0.35 + 0.95 * u),
    rSx: -(1.05 - 0.3 * v),
    rEx: -(0.35 + 0.95 * v),
    lHx: -0.38,
    lKx: 0.3,
    rHx: 0.3,
    rKx: 0.2,
    lAx: 0.05,
    rAx: -0.05,
    rootY: -FIGURE_LEG_M * (1 - Math.cos(0.34)) * 0.8,
    torsoY: Math.sin(ph) * 0.05,
  };
}

/** Both hands on the wheel's rim, a slow look about, a little breathing. */
function steer(t: number): Partial<JointAngles> {
  return {
    lSx: -1.0,
    rSx: -1.0,
    lEx: -0.5,
    rEx: -0.5,
    lSz: 0.12,
    rSz: -0.12,
    torsoX: 0.03,
    headX: -0.05,
    headY: Math.sin(t * 0.4) * 0.15,
    brow: Math.max(0, Math.sin(t * 1.1)) * 0.4,
    rootY: Math.sin(t * 1.6) * 0.002,
  };
}

/**
 * The dinghy sailor (M115): the hips and knees bend, both arms reach forward and down (the left
 * one holds the tiller extension and the right one the mainsheet when he sits on the starboard
 * side: he faces across the boat), and the head looks ahead. The lean is not a joint:
 * the whole figure is rotated (captain.ts). `hike` stretches the legs out under the toe straps.
 */
function sit(t: number, hike: boolean): Partial<JointAngles> {
  return {
    lHx: hike ? -0.52 : -Math.PI / 2,
    rHx: hike ? -0.52 : -Math.PI / 2,
    lKx: hike ? 0.35 : Math.PI / 2,
    rKx: hike ? 0.35 : Math.PI / 2,
    // Seated: elbows by the sides, forearms forward at the belly. Hiking he leans far back, so
    // the arms reach further out in front of him to stay about level.
    lSx: hike ? -0.6 : -0.1,
    lEx: hike ? -1.0 : -1.9,
    lSz: 0.05,
    rSx: hike ? -0.7 : -0.35,
    rEx: hike ? -0.9 : -1.45,
    rSz: -0.3,
    torsoX: hike ? -0.05 : 0.02,
    headX: 0.05,
    headY: -0.6 + Math.sin(t * 0.5) * 0.05,
    brow: Math.max(0, Math.sin(t * 1.1)) * 0.3,
  };
}

/** The same pose seen in a mirror: left and right limbs swap, the turns about the up axis flip. */
export function mirrorJoints(j: JointAngles): JointAngles {
  return {
    ...j,
    torsoY: -j.torsoY,
    torsoZ: -j.torsoZ,
    headY: -j.headY,
    headZ: -j.headZ,
    browTilt: -j.browTilt,
    lSx: j.rSx,
    lSz: -j.rSz,
    lEx: j.rEx,
    lEz: -j.rEz,
    rSx: j.lSx,
    rSz: -j.lSz,
    rEx: j.lEx,
    rEz: -j.lEz,
    lHx: j.rHx,
    lKx: j.rKx,
    lAx: j.rAx,
    rHx: j.lHx,
    rKx: j.lKx,
    rAx: j.lAx,
  };
}

/** The joint angles of `pose` at time `t` (s); the walk's phase comes from `walkedM`. */
export function figureJoints(
  pose: FigurePose,
  t: number,
  walkedM: number,
  data: BoatData = boat,
): JointAngles {
  switch (pose) {
    case 'stand':
      return { ...REST_JOINTS, ...stand(t) };
    case 'work':
      return { ...REST_JOINTS, ...work(t) };
    case 'steer':
      return { ...REST_JOINTS, ...steer(t) };
    case 'sit':
      return { ...REST_JOINTS, ...sit(t, false) };
    case 'hike':
      return { ...REST_JOINTS, ...sit(t, true) };
    case 'walk':
      return { ...REST_JOINTS, ...walk((2 * Math.PI * walkedM) / data.people.strideM) };
  }
}
