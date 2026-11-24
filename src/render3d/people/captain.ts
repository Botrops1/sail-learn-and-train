import * as THREE from 'three';
import { DEG } from '../../model/angles';
import { figureJoints, mirrorJoints, REST_JOINTS, type JointAngles } from '../../model/figurePose';
import type { CaptainPlacement } from '../../model/people';
import type { Detail } from '../../model/settings';
import { SCENE } from '../sceneConfig';
import { buildFigureMesh, type BoneName } from './figureMesh';

/**
 * The captain on the boat (PHASE_PEOPLE_SPEC 7.6): the skinned figure, placed and posed each
 * frame from `captainPlacement`, plus an invisible tap area (the pick proxy) so a tap on him
 * opens his card.
 */

export interface CaptainModel {
  object: THREE.Group;
  /** Places and poses the figure; `t` and `dt` in seconds (the scene's frame time). */
  update(placement: CaptainPlacement, hidden: boolean, t: number, dt: number): void;
  triangles(): number;
}

/** The short way round from `from` to `to`, at most `maxStep`, all in radians. */
function turnToward(from: number, to: number, maxStep: number): number {
  let diff = (to - from) % (2 * Math.PI);
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return from + Math.max(-maxStep, Math.min(maxStep, diff));
}

const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

export function buildCaptain(detail: Detail): CaptainModel {
  const { mesh, bones } = buildFigureMesh(detail);
  mesh.userData = { partId: 'person_captain', noPick: true };

  const { radiusM, heightM, segments } = SCENE.people.pick;
  const proxy = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusM, radiusM, heightM, segments),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  proxy.name = 'captain_pick';
  proxy.position.y = heightM / 2;
  proxy.userData = { partId: 'person_captain' };

  const object = new THREE.Group();
  object.name = 'captain';
  object.add(mesh, proxy);

  const current: JointAngles = { ...REST_JOINTS };
  let placed = false;
  let yawNow = 0;
  /** Standing pelvis height above the feet: where the dinghy sailor's hip joint sits in the figure. */
  const pelvisM = SCENE.people.body.ankleY + SCENE.people.body.shin + SCENE.people.body.thigh;
  const qYaw = new THREE.Quaternion();
  const qLean = new THREE.Quaternion();
  const pelvis = new THREE.Vector3();

  const poseBones = (j: JointAngles) => {
    const b = (name: BoneName) => bones[name];
    b('root').position.y = j.rootY;
    b('torso').rotation.set(j.torsoX, j.torsoY, j.torsoZ);
    b('neck').rotation.set(j.headX, j.headY, j.headZ);
    for (const [side, sign] of [
      ['l', 1],
      ['r', -1],
    ] as const) {
      const brow = b(`brow_${side}`);
      brow.position.y = j.brow * 0.012;
      brow.rotation.z = -sign * (j.brow * 0.16) + j.browTilt * sign;
    }
    b('shoulder_l').rotation.set(j.lSx, 0, j.lSz);
    b('shoulder_r').rotation.set(j.rSx, 0, j.rSz);
    b('elbow_l').rotation.set(j.lEx, 0, j.lEz);
    b('elbow_r').rotation.set(j.rEx, 0, j.rEz);
    b('hip_l').rotation.x = j.lHx;
    b('hip_r').rotation.x = j.rHx;
    b('knee_l').rotation.x = j.lKx;
    b('knee_r').rotation.x = j.rKx;
    b('ankle_l').rotation.x = j.lAx;
    b('ankle_r').rotation.x = j.rAx;
  };

  return {
    object,
    update(placement, hidden, t, dt) {
      object.visible = !hidden;
      const yaw = (90 - placement.faceDeg) * DEG;
      const sailor = placement.hip !== undefined;
      // The dinghy sailor (M115) sits on the other side of the boat as a mirror image of himself.
      const side = placement.hip !== undefined && placement.hip[2] < 0 ? -1 : 1;
      let target = figureJoints(placement.pose, t, placement.walkedM);
      if (sailor && side === -1) target = mirrorJoints(target);
      if (!placed) {
        yawNow = yaw;
        Object.assign(current, target);
        placed = true;
      } else {
        yawNow = turnToward(yawNow, yaw, SCENE.people.turnDegPerS * DEG * dt);
        const a = 1 - Math.exp(-SCENE.people.smoothingPerS * dt);
        for (const key of Object.keys(target) as (keyof JointAngles)[]) {
          current[key] += (target[key] - current[key]) * a;
        }
      }
      if (placement.hip) {
        // The pelvis goes to `hip`, the whole figure leans outboard about the boat's x axis
        // through it (the sign of the hip's z is the side), after the turn about his own up axis.
        qYaw.setFromAxisAngle(UP, yawNow);
        qLean.setFromAxisAngle(RIGHT, side * (placement.leanDeg ?? 0) * DEG);
        object.quaternion.copy(qLean).multiply(qYaw);
        pelvis.set(0, pelvisM + current.rootY, 0).applyQuaternion(object.quaternion);
        object.position.set(
          placement.hip[0] - pelvis.x,
          placement.hip[1] - pelvis.y,
          placement.hip[2] - pelvis.z,
        );
      } else {
        object.position.set(...placement.feet);
        object.rotation.set(0, yawNow, 0);
      }
      poseBones(current);
    },
    triangles() {
      return (mesh.geometry.attributes.position?.count ?? 0) / 3;
    },
  };
}
