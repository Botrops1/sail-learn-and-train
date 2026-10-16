import * as THREE from 'three';
import { boat } from '../../model/boat';
import { anchorFluke, chainLinks, windlassBaseY } from '../../model/bowGear';
import { DECK_EPS } from '../../model/deckVolumes';
import type { Detail } from '../../model/settings';
import { vec3, type Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { asThin, boxAt, cylinderBetween, partMesh, smallPartMesh, triangles, v3 } from './parts';

/**
 * Anchor, bow roller, chain and windlass (M31, PHASE6_SPEC 7.3). Static: nothing moves.
 * Every position comes from `deckFittings` through src/model/bowGear.ts.
 */
export function buildBowGear(materials: BoatMaterials, detail: Detail = 'high'): THREE.Object3D[] {
  return [
    buildBowRoller(materials),
    buildAnchor(materials, detail),
    buildChain(materials, detail),
    ...buildWindlass(materials, detail),
  ];
}

function buildBowRoller(materials: BoatMaterials): THREE.Object3D {
  const r = boat.deckFittings.bowRoller;
  const length = r.tipX - r.aftX;
  const midX = (r.aftX + r.tipX) / 2;
  const plateTop = r.plateY + r.plateThickness;
  const cheekOffset = r.halfWidth - r.cheekThickness / 2;
  const cheekY = plateTop + r.cheekHeight / 2;
  const innerHalf = r.halfWidth - r.cheekThickness;
  const geometries = [
    boxAt(
      [midX, r.plateY + r.plateThickness / 2, r.centreZ],
      [length, r.plateThickness, 2 * r.halfWidth],
    ),
    boxAt([midX, cheekY, r.centreZ + cheekOffset], [length, r.cheekHeight, r.cheekThickness]),
    boxAt([midX, cheekY, r.centreZ - cheekOffset], [length, r.cheekHeight, r.cheekThickness]),
    cylinderBetween(
      [r.rollerX, plateTop + r.rollerRadius, r.centreZ - innerHalf],
      [r.rollerX, plateTop + r.rollerRadius, r.centreZ + innerHalf],
      r.rollerRadius,
      10,
    ),
  ];
  return smallPartMesh('fit_bow_roller', geometries, materials.fitting, [
    [r.rollerX, plateTop + r.cheekHeight, r.centreZ],
  ]);
}

/** A closed slab: the triangle moved ±half along its normal, joined by three side quads. */
function flukeSlab(tri: readonly [Vec3, Vec3, Vec3], thickness: number): THREE.BufferGeometry {
  const [a, b, c] = tri.map(v3) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  const normal = b
    .clone()
    .sub(a)
    .cross(c.clone().sub(a))
    .normalize()
    .multiplyScalar(thickness / 2);
  const lift = (p: THREE.Vector3, sign: number) => p.clone().addScaledVector(normal, sign);
  const top: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [lift(a, 1), lift(b, 1), lift(c, 1)];
  const bottom: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
    lift(a, -1),
    lift(b, -1),
    lift(c, -1),
  ];
  const positions: number[] = [];
  const push = (...points: THREE.Vector3[]) => points.forEach((p) => positions.push(p.x, p.y, p.z));
  push(...top);
  push(bottom[0], bottom[2], bottom[1]);
  const corners = [0, 1, 2] as const;
  for (const i of corners) {
    const j = corners[(i + 1) % 3] as 0 | 1 | 2;
    // counter-clockwise seen from outside: along the lower edge, then back along the upper
    push(bottom[i], bottom[j], top[j], bottom[i], top[j], top[i]);
  }
  return triangles(positions);
}

function buildAnchor(materials: BoatMaterials, detail: Detail): THREE.Object3D {
  const { anchor, chain } = boat.deckFittings;
  const shackle = vec3(anchor.shackle);
  const crown = vec3(anchor.crown);
  const radial = detail === 'high' ? 10 : 6;
  const [tube, around] = detail === 'high' ? [4, 10] : [3, 6];
  const ring = new THREE.TorusGeometry(0.03, chain.wireRadius, tube, around);
  ring.translate(...shackle);
  const geometries = [
    cylinderBetween(shackle, crown, anchor.shankWidth / 2, radial),
    ...anchorFluke().map((tri) => flukeSlab(tri, anchor.flukeThickness)),
    ring,
  ];
  return smallPartMesh('fit_anchor', geometries, materials.chrome, [crown]);
}

function buildChain(materials: BoatMaterials, detail: Detail): THREE.Object3D {
  const c = boat.deckFittings.chain;
  const [tube, around] = detail === 'high' ? [4, 10] : [3, 6];
  const ringRadius = (c.linkWidth - 2 * c.wireRadius) / 2;
  const geometries = chainLinks().map((link) => {
    const geometry = new THREE.TorusGeometry(ringRadius, c.wireRadius, tube, around);
    geometry.scale(c.linkLength / c.linkWidth, 1, 1);
    geometry.rotateX(link.turn);
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), v3(link.along)),
    );
    geometry.translate(...link.centre);
    return geometry;
  });
  return asThin(
    partMesh('fit_anchor_chain', geometries, materials.dark, [[vec3(c.from), vec3(c.to)]]),
  );
}

function buildWindlass(materials: BoatMaterials, detail: Detail): THREE.Object3D[] {
  const w = boat.deckFittings.windlass;
  const base: Vec3 = [w.x, windlassBaseY() + DECK_EPS, w.z];
  const around = detail === 'high' ? 24 : 12;
  const disc = new THREE.CircleGeometry(w.recessRadius, around);
  disc.rotateX(-Math.PI / 2);
  disc.translate(...base);
  const lathe = new THREE.LatheGeometry(
    w.profile.map(([radius, height]) => new THREE.Vector2(radius, height)),
    around,
  );
  lathe.translate(...base);
  const top = Math.max(...w.profile.map(([, height]) => height as number));
  return [
    partMesh('fit_anchor_windlass', [disc], materials.dark),
    smallPartMesh('fit_anchor_windlass', [lathe], materials.chrome, [
      [base[0], base[1] + top, base[2]],
    ]),
  ];
}
