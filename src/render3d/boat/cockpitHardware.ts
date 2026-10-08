import * as THREE from 'three';
import { boat } from '../../model/boat';
import { sheerAt } from '../../model/hullShape';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { boxAt, cylinderBetween, partMesh, smallPartMesh, type PickSegment } from './parts';

export interface CockpitHardware {
  objects: THREE.Object3D[];
  /** One pivot per wheel (rotate around x to turn the wheel). */
  wheelPivots: THREE.Group[];
}

/** Wheels on pedestals, winches and clutch banks (PHASE1_SPEC 6.1). */
export function buildCockpitHardware(materials: BoatMaterials): CockpitHardware {
  const wheels = boat.cockpitHardware.helms.map((helm) => buildWheel(helm, materials));
  return {
    objects: [
      ...wheels.flatMap((wheel) => [wheel.pivot, wheel.pedestal]),
      // Only the winches on the reference boat: the brochure's optional ones are `present: false`.
      ...boat.cockpitHardware.winches
        .filter((winch) => !('present' in winch) || winch.present !== false)
        .map((winch) => buildWinch(winch, materials)),
      ...boat.cockpitHardware.clutchBanks.map((bank) =>
        buildClutch(bank.id, [bank.x, bank.y, bank.z], boat.modelDetail.clutchBank, materials),
      ),
      buildClutch(
        boat.cockpitHardware.jibRollClutch.id,
        [
          boat.cockpitHardware.jibRollClutch.x,
          boat.cockpitHardware.jibRollClutch.y,
          boat.cockpitHardware.jibRollClutch.z,
        ],
        boat.modelDetail.jibRollClutch,
        materials,
      ),
    ],
    wheelPivots: wheels.map((wheel) => wheel.pivot),
  };
}

/**
 * A wheel: rim, hub and spokes in the y–z plane (the helmsman faces forward), turning around
 * the x axis, on a pedestal standing on the cockpit sole just forward of it.
 */
function buildWheel(
  helm: { id: string; x: number; z: number },
  materials: BoatMaterials,
): { pivot: THREE.Group; pedestal: THREE.Object3D } {
  const hw = boat.cockpitHardware;
  const detail = boat.modelDetail.wheel;
  const radius = hw.wheelDiameter / 2 - detail.rimTubeRadius;
  const rim = new THREE.TorusGeometry(radius, detail.rimTubeRadius, 8, 40).rotateY(Math.PI / 2);
  const spokes = Array.from({ length: detail.spokes }, (_, i) => {
    const angle = (2 * Math.PI * i) / detail.spokes;
    return cylinderBetween(
      [0, 0, 0],
      [0, radius * Math.cos(angle), radius * Math.sin(angle)],
      detail.rimTubeRadius * 0.6,
      5,
    );
  });
  const hub = cylinderBetween(
    [-detail.rimTubeRadius * 2, 0, 0],
    [detail.pedestalWidth / 2, 0, 0],
    detail.rimTubeRadius * 2,
    10,
  );
  const rimSegments: PickSegment[] = Array.from({ length: 8 }, (_, i) => {
    const a = (2 * Math.PI * i) / 8;
    const b = (2 * Math.PI * (i + 1)) / 8;
    return [
      [0, radius * Math.cos(a), radius * Math.sin(a)],
      [0, radius * Math.cos(b), radius * Math.sin(b)],
    ] as const;
  });
  const pivot = new THREE.Group();
  pivot.name = `${helm.id}Pivot`;
  pivot.position.set(helm.x, hw.wheelHubY, helm.z);
  pivot.add(partMesh(helm.id, [rim, ...spokes, hub], materials.dark, rimSegments));

  const soleY = boat.deck.cockpit.soleY;
  const pedestalX = helm.x + detail.pedestalWidth;
  const pedestalHeight = hw.wheelHubY - soleY;
  const pedestal = partMesh(
    helm.id,
    [
      boxAt(
        [pedestalX, soleY + pedestalHeight / 2, helm.z],
        [detail.pedestalWidth, pedestalHeight + detail.pedestalWidth / 2, detail.pedestalWidth],
      ),
    ],
    materials.dark,
    [
      [
        [pedestalX, soleY, helm.z],
        [pedestalX, hw.wheelHubY, helm.z],
      ],
    ],
  );
  return { pivot, pedestal };
}

/** Winch drum standing on the coaming. */
function buildWinch(
  winch: { id: string; x: number; y: number; z: number },
  materials: BoatMaterials,
): THREE.Object3D {
  const size = boat.modelDetail.winch;
  const drum = new THREE.CylinderGeometry(size.diameter / 2, size.diameter / 2, size.height, 16);
  drum.translate(winch.x, winch.y + size.height / 2, winch.z);
  return smallPartMesh(winch.id, [drum], materials.fitting, [
    [winch.x, winch.y + size.height / 2, winch.z],
  ]);
}

/**
 * A clutch bank (or the single JIB ROLL clutch). The data gives an approximate position; the
 * model stands the clutch on whatever is below it: the coaming top beside the cockpit, else the deck.
 */
function buildClutch(
  id: string,
  position: Vec3,
  size: { length: number; width: number; height: number },
  materials: BoatMaterials,
): THREE.Object3D {
  const { cockpit } = boat.deck;
  const coamingOuter = cockpit.wellHalfWidth + boat.modelDetail.coamingWidth;
  const onCoaming =
    position[0] <= cockpit.frontX &&
    position[0] >= cockpit.aftX &&
    Math.abs(position[2]) <= coamingOuter;
  const baseY = Math.max(position[1], onCoaming ? cockpit.coamingTopY : sheerAt(position[0]));
  const centre: Vec3 = [position[0], baseY + size.height / 2, position[2]];
  return smallPartMesh(
    id,
    [boxAt(centre, [size.length, size.height, size.width])],
    materials.dark,
    [centre],
  );
}
