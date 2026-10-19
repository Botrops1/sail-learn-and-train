import * as THREE from 'three';
import { bowTunnelPlace, sternPodPlace, type ThrusterState } from '../../model/thrusters';
import type { Detail } from '../../model/settings';
import { SCENE } from '../sceneConfig';
import type { BoatMaterials } from './materials';
import { requirePartId } from '../../model/registry';
import { cloneMaterial, cylinderBetween, partMesh, type PartUserData } from './parts';

/** How far the tunnel's discs stand off the hull, so they are not drawn inside it. */
const DISC_OFFSET_M = 0.02;

export interface Thrusters {
  objects: THREE.Object3D[];
  /** Shows the jets of the thrusters that run (PHASE7_SPEC 7.6). */
  setState(t: ThrusterState): void;
}

/**
 * The bow tunnel (two flat dark discs in the hull's sides and the tunnel between them) and the
 * stern pod (a cylinder under the hull on a strut), and the white water jets (M41). A jet is a
 * cone from the opening on the side opposite to the push: pushing the bow to starboard blows
 * water out to port. Hidden jets are neither drawn nor found by a tap.
 */
export function buildThrusters(materials: BoatMaterials, detail: Detail = 'high'): Thrusters {
  const high = detail === 'high';
  const radial = high ? 16 : 8;
  const cfg = SCENE.thrusters;

  const bow = bowTunnelPlace();
  const r = bow.diameter / 2;
  const z0 = bow.halfWidthM;
  const discs = [1, -1].map((side) =>
    new THREE.CircleGeometry(r, radial)
      .rotateY(side === 1 ? 0 : Math.PI)
      .translate(bow.x, bow.y, side * (z0 + DISC_OFFSET_M)),
  );
  const tunnel = cylinderBetween([bow.x, bow.y, -z0], [bow.x, bow.y, z0], r, radial);
  const bowMesh = partMesh('part_bow_thruster', [...discs, tunnel], materials.thrusterTunnel);

  const pod = sternPodPlace();
  const podBody = cylinderBetween(
    [pod.x, pod.y, -pod.lengthM / 2],
    [pod.x, pod.y, pod.lengthM / 2],
    pod.diameter / 2,
    radial,
  );
  const strutHeight = pod.hullY - pod.y;
  const strut = new THREE.BoxGeometry(0.05, strutHeight, 0.08).translate(
    pod.x,
    pod.y + strutHeight / 2,
    0,
  );
  const sternMesh = partMesh('part_stern_thruster', [podBody, strut], materials.thrusterPod);

  /** A cone with its point at (x, y, z) widening over `jetLengthM` towards `outward` (+1: starboard). */
  const jet = (partId: string, x: number, y: number, z: number, outward: 1 | -1): THREE.Mesh => {
    const geometry = new THREE.ConeGeometry(cfg.jetRadiusM, cfg.jetLengthM, radial, 1, true)
      .translate(0, -cfg.jetLengthM / 2, 0)
      .rotateX(outward === 1 ? -Math.PI / 2 : Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, cloneMaterial(materials.thrusterJet));
    mesh.position.set(x, y, z);
    mesh.visible = false;
    mesh.name = partId;
    // A jet is see-through: it shows which thruster runs and never hides a part from a tap.
    const userData: PartUserData = { partId: requirePartId(partId), thin: true };
    Object.assign(mesh.userData, userData);
    return mesh;
  };
  // Pushing to port (-1) blows the water out to starboard (+z), and the other way round.
  const jets = {
    bow: {
      [-1]: jet('part_bow_thruster', bow.x, bow.y, z0, 1),
      [1]: jet('part_bow_thruster', bow.x, bow.y, -z0, -1),
    },
    stern: {
      [-1]: jet('part_stern_thruster', pod.x, pod.y, pod.lengthM / 2, 1),
      [1]: jet('part_stern_thruster', pod.x, pod.y, -pod.lengthM / 2, -1),
    },
  };

  const setState = (t: ThrusterState) => {
    for (const end of ['bow', 'stern'] as const) {
      jets[end][-1].visible = t[end] === -1;
      jets[end][1].visible = t[end] === 1;
    }
  };
  setState({ bow: 0, stern: 0 });
  return {
    objects: [bowMesh, sternMesh, ...Object.values(jets).flatMap((pair) => [pair[-1], pair[1]])],
    setState,
  };
}
