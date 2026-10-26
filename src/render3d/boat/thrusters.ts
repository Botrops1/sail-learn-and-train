import * as THREE from 'three';
import { thrusterEnds, thrusterTunnelPlace, type ThrusterState } from '../../model/thrusters';
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
 * The two thrusters (owner, PR #99): each is a tunnel through the hull, drawn as two flat dark
 * discs (a hole on each side) and the tunnel between them, plus the white water jets. A jet is a
 * cone from the opening on the side opposite to the push: pushing the bow to starboard blows
 * water out to port. Hidden jets are neither drawn nor found by a tap.
 */
export function buildThrusters(materials: BoatMaterials, detail: Detail = 'high'): Thrusters {
  const radial = detail === 'high' ? 16 : 8;
  const cfg = SCENE.thrusters;

  const tunnelMesh = (end: 'bow' | 'stern', partId: string) => {
    const place = thrusterTunnelPlace(end);
    const r = place.diameter / 2;
    const z0 = place.halfWidthM;
    const discs = [1, -1].map((side) =>
      new THREE.CircleGeometry(r, radial)
        .rotateY(side === 1 ? 0 : Math.PI)
        .translate(place.x, place.y, side * (z0 + DISC_OFFSET_M)),
    );
    const tunnel = cylinderBetween([place.x, place.y, -z0], [place.x, place.y, z0], r, radial);
    return { place, mesh: partMesh(partId, [...discs, tunnel], materials.thrusterTunnel) };
  };
  const ends = thrusterEnds();
  const tunnels = ends.map((end) => ({
    end,
    ...tunnelMesh(end, end === 'bow' ? 'part_bow_thruster' : 'part_stern_thruster'),
  }));

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
  const jets = new Map<'bow' | 'stern', { [-1]: THREE.Mesh; [1]: THREE.Mesh }>();
  for (const { end, place } of tunnels) {
    const partId = end === 'bow' ? 'part_bow_thruster' : 'part_stern_thruster';
    jets.set(end, {
      [-1]: jet(partId, place.x, place.y, place.halfWidthM, 1),
      [1]: jet(partId, place.x, place.y, -place.halfWidthM, -1),
    });
  }

  const setState = (t: ThrusterState) => {
    for (const [end, pair] of jets) {
      pair[-1].visible = t[end] === -1;
      pair[1].visible = t[end] === 1;
    }
  };
  setState({ bow: 0, stern: 0 });
  return {
    objects: [
      ...tunnels.map((tunnel) => tunnel.mesh),
      ...[...jets.values()].flatMap((pair) => [pair[-1], pair[1]]),
    ],
    setState,
  };
}
