import * as THREE from 'three';
import { boat } from '../../model/boat';
import { sheerAt } from '../../model/hullShape';
import type { Detail } from '../../model/settings';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { boxAt, cylinderBetween, partMesh, smallPartMesh, type PickSegment } from './parts';

export interface CockpitHardware {
  objects: THREE.Object3D[];
  /** One pivot per wheel (rotate around x to turn the wheel). */
  wheelPivots: THREE.Group[];
}

/** Wheels on pedestals, winches and clutch banks (PHASE1_SPEC 6.1). */
export function buildCockpitHardware(
  materials: BoatMaterials,
  detail: Detail = 'high',
): CockpitHardware {
  const segments = detail === 'high' ? 32 : 14;
  const wheels = boat.cockpitHardware.helms.map((helm) => buildWheel(helm, materials));
  return {
    objects: [
      ...wheels.flatMap((wheel) => [wheel.pivot, wheel.pedestal]),
      // Only the winches on the reference boat: the brochure's optional ones are `present: false`.
      ...boat.cockpitHardware.winches
        .filter((winch) => !('present' in winch) || winch.present !== false)
        .flatMap((winch) => buildWinch(winch, materials, segments)),
      ...boat.cockpitHardware.clutchBanks.flatMap((bank) =>
        buildClutch(
          bank.id,
          [bank.x, bank.y, bank.z],
          boat.modelDetail.clutchBank,
          bank.clutches.length,
          materials,
        ),
      ),
      ...buildClutch(
        boat.cockpitHardware.jibRollClutch.id,
        [
          boat.cockpitHardware.jibRollClutch.x,
          boat.cockpitHardware.jibRollClutch.y,
          boat.cockpitHardware.jibRollClutch.z,
        ],
        boat.modelDetail.jibRollClutch,
        1,
        materials,
      ),
      ...buildRopeBins(materials),
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

/**
 * Self-tailing winch (Lewmar 55 ST style) standing on the coaming: a base flange and a
 * black drum, a chrome self-tailer on top with the stripper arm pointing outboard.
 */
function buildWinch(
  winch: { id: string; x: number; y: number; z: number },
  materials: BoatMaterials,
  segments: number,
): THREE.Object3D[] {
  const size = boat.modelDetail.winch;
  const r = size.diameter / 2;
  const h = size.height;
  // [radius, height] from the base up, as fractions of the drum radius and the winch height.
  const lathe = (profile: [number, number][]) =>
    new THREE.LatheGeometry(
      profile.map(([pr, ph]) => new THREE.Vector2(pr * r, ph * h)),
      segments,
    ).translate(winch.x, winch.y, winch.z);
  const drum = lathe([
    [0, 0],
    [1.2, 0],
    [1.2, 0.06],
    [1.0, 0.1],
    [0.93, 0.35],
    [0.95, 0.6],
    [1.02, 0.66],
  ]);
  // Self-tailer: jaws ring, then a nearly flat chrome cap.
  const top = lathe([
    [1.02, 0.66],
    [1.06, 0.74],
    [1.04, 0.86],
    [0.96, 0.92],
    [0.3, 0.95],
    [0, 0.95],
  ]);
  // Winch-handle socket in the middle of the cap.
  const socket = new THREE.CylinderGeometry(0.16 * r, 0.16 * r, 0.03 * h, 8).translate(
    winch.x,
    winch.y + 0.955 * h,
    winch.z,
  );
  const outboard = Math.sign(winch.z) || 1;
  const arm = boxAt(
    [winch.x, winch.y + 0.9 * h, winch.z + outboard * 0.9 * r],
    [0.03, 0.025, 0.6 * r],
  );
  const centre: Vec3 = [winch.x, winch.y + h / 2, winch.z];
  return [
    smallPartMesh(winch.id, [drum, socket], materials.dark, [centre]),
    smallPartMesh(winch.id, [top, arm], materials.chrome, [centre]),
  ];
}

/**
 * The rope tail boxes behind the winches (M5, owner, PR #19): a dark opening in the coaming top
 * with a low rim, where the ropes' ends go in.
 */
function buildRopeBins(materials: BoatMaterials): THREE.Object3D[] {
  const { ropeBins } = boat.cockpitHardware;
  const size = boat.modelDetail.ropeBin;
  const y = boat.deck.cockpit.coamingTopY;
  return ropeBins.boxes.flatMap((box) => {
    const { length: l, width: w, rimHeight: h, rimWidth: rim } = size;
    const opening = boxAt([box.x, y + 0.002, box.z], [l - 2 * rim, 0.004, w - 2 * rim]);
    const walls = [
      boxAt([box.x + l / 2 - rim / 2, y + h / 2, box.z], [rim, h, w]),
      boxAt([box.x - l / 2 + rim / 2, y + h / 2, box.z], [rim, h, w]),
      boxAt([box.x, y + h / 2, box.z + w / 2 - rim / 2], [l, h, rim]),
      boxAt([box.x, y + h / 2, box.z - w / 2 + rim / 2], [l, h, rim]),
    ];
    const centre: Vec3 = [box.x, y + h, box.z];
    return [
      smallPartMesh(ropeBins.id, [opening], materials.dark, [centre]),
      smallPartMesh(ropeBins.id, walls, materials.gelcoat, [centre]),
    ];
  });
}

/**
 * A clutch bank (or the single JIB ROLL clutch): a row of clutches, each a black body with a
 * lever on top carrying a white label, as in the photos. The data gives an approximate
 * position; the model stands the clutches on whatever is below: the coaming top beside the
 * cockpit, else the deck.
 */
function buildClutch(
  id: string,
  position: Vec3,
  size: { length: number; width: number; height: number },
  count: number,
  materials: BoatMaterials,
): THREE.Object3D[] {
  const { cockpit } = boat.deck;
  const coamingOuter = cockpit.wellHalfWidth + boat.modelDetail.coamingWidth;
  const onCoaming =
    position[0] <= cockpit.frontX &&
    position[0] >= cockpit.aftX &&
    Math.abs(position[2]) <= coamingOuter;
  const baseY = Math.max(position[1], onCoaming ? cockpit.coamingTopY : sheerAt(position[0]));
  const each = size.width / count;
  const bodies: THREE.BufferGeometry[] = [];
  const labels: THREE.BufferGeometry[] = [];
  for (let k = 0; k < count; k += 1) {
    const z = position[2] - size.width / 2 + each * (k + 0.5);
    const bodyHeight = size.height * 0.62;
    bodies.push(
      boxAt([position[0], baseY + bodyHeight / 2, z], [size.length, bodyHeight, each * 0.9]),
    );
    // Lever: the full length on top, its front end raised a little.
    const lever = boxAt([0, 0, 0], [size.length * 0.92, size.height * 0.3, each * 0.8]);
    lever.rotateZ(-0.06);
    lever.translate(position[0], baseY + bodyHeight + size.height * 0.15, z);
    bodies.push(lever);
    labels.push(
      boxAt(
        [position[0] + size.length * 0.08, baseY + size.height + 0.002, z],
        [size.length * 0.45, 0.004, each * 0.5],
      ),
    );
  }
  const centre: Vec3 = [position[0], baseY + size.height / 2, position[2]];
  return [
    smallPartMesh(id, bodies, materials.dark, [centre]),
    smallPartMesh(id, labels, materials.gelcoat, [centre]),
  ];
}
