import * as THREE from 'three';
import { boat } from '../../model/boat';
import {
  CENTRED_BOOM,
  selfTackingTrackEnds,
  vangStrutEnds,
  type BoomPose,
} from '../../model/rigGeometry';
import { mainsheetBlocks } from '../../model/mainsheet';
import { vec3, type Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import {
  asThin,
  boxAt,
  cylinderBetween,
  partMesh,
  smallPartMesh,
  v3,
  type PickSegment,
} from './parts';

const DEG = Math.PI / 180;

export interface Rig {
  objects: THREE.Object3D[];
  /** Pivot at the gooseneck. */
  boomPivot: THREE.Group;
  /** Swings and pitches the boom and lets the rigid vang strut follow it. */
  setBoomPose(pose: BoomPose): void;
  /** Slides the self-tacking car along its track (z, + = starboard). */
  setCarZ(z: number): void;
}

/** Mast, spreaders, standing rigging, boom and the rig fittings (PHASE1_SPEC 6.1). */
export function buildRig(materials: BoatMaterials): Rig {
  const boomPivot = buildBoom(materials);
  const vang = buildVangStrut(materials);
  const setPose = (pose: BoomPose) => {
    setBoomPose(boomPivot, pose);
    vang.follow(pose);
  };
  setPose(CENTRED_BOOM);
  const track = buildSelfTackingTrack(materials);
  return {
    objects: [
      buildMast(materials),
      ...buildSpreadersAndShrouds(materials),
      buildStay(
        'part_forestay',
        vec3(boat.rig.forestay.bottom),
        vec3(boat.rig.forestay.top),
        materials,
      ),
      buildStay(
        'part_backstay',
        vec3(boat.rig.backstay.top),
        vec3(boat.rig.backstay.bottom),
        materials,
      ),
      boomPivot,
      ...vang.tubes,
      buildGooseneck(materials),
      buildTurningBlocks(materials),
      buildDeckBlocks(materials),
      buildGearbox(materials),
      buildJibFurler(materials),
      track.track,
      track.car,
    ],
    boomPivot,
    setBoomPose: setPose,
    setCarZ(z) {
      track.car.position.z = z;
    },
  };
}

/**
 * Sets the boom's swing θ (+ = to starboard) and pitch ψ (+ = end up), PHASE1_SPEC 4.
 * Euler order YZX applies the pitch first (around z, negative = end up for an aft-pointing
 * boom), then the swing around y: direction = (−cos ψ cos θ, sin ψ, cos ψ sin θ), as in 8.2.
 */
export function setBoomPose(pivot: THREE.Object3D, pose: BoomPose): void {
  pivot.rotation.set(0, pose.thetaDeg * DEG, -pose.psiDeg * DEG, 'YZX');
}

function buildMast(materials: BoatMaterials): THREE.Object3D {
  const m = boat.rig.mast;
  const height = m.topY - m.footY;
  return partMesh(
    'part_mast',
    [boxAt([m.x, m.footY + height / 2, 0], [m.sectionForeAft, height, m.sectionAthwart])],
    materials.spar,
    [
      [
        [m.x, m.footY, 0],
        [m.x, m.topY, 0],
      ],
    ],
  );
}

/** Spreader tip on one side (side = +1 starboard, −1 port), swept back from the mast. */
function spreaderTip(
  set: { y: number; halfSpan: number; sweepBackDeg: number },
  side: number,
): Vec3 {
  const sweep = set.sweepBackDeg * DEG;
  return [
    boat.rig.mast.x - set.halfSpan * Math.sin(sweep),
    set.y,
    side * set.halfSpan * Math.cos(sweep),
  ];
}

function buildSpreadersAndShrouds(materials: BoatMaterials): THREE.Object3D[] {
  const { mast, spreaders, shrouds } = boat.rig;
  const detail = boat.modelDetail;
  const radius = detail.wireRenderRadius;
  const spreaderGeometries: THREE.BufferGeometry[] = [];
  const spreaderSegments: PickSegment[] = [];
  const shroudGeometries: THREE.BufferGeometry[] = [];
  const shroudSegments: PickSegment[] = [];
  const addWire = (a: Vec3, b: Vec3) => {
    shroudGeometries.push(cylinderBetween(a, b, radius, 6));
    shroudSegments.push([a, b]);
  };

  for (const side of [1, -1]) {
    const tips = spreaders.sets.map((set) => {
      const root: Vec3 = [mast.x, set.y, (side * mast.sectionAthwart) / 2];
      const tip = spreaderTip(set, side);
      const geometry = cylinderBetween(root, tip, detail.spreaderDiameter / 2, 8);
      spreaderGeometries.push(geometry);
      spreaderSegments.push([root, tip]);
      return tip;
    });
    const chainplate: Vec3 = [
      shrouds.chainplate.x,
      shrouds.chainplate.y,
      side * shrouds.chainplate.halfZ,
    ];
    // Cap shroud: chainplate → each spreader tip in turn → mast near the top.
    let previous = chainplate;
    for (const tip of tips) {
      addWire(previous, tip);
      previous = tip;
    }
    addWire(previous, [mast.x, shrouds.capShroudTopY, (side * mast.sectionAthwart) / 2]);
    // Lower shroud: chainplate → mast at the lower spreader root.
    addWire(chainplate, [mast.x, shrouds.lowerShroudTopY, (side * mast.sectionAthwart) / 2]);
  }
  return [
    asThin(partMesh('part_spreader', spreaderGeometries, materials.spar, spreaderSegments)),
    asThin(partMesh('part_shroud', shroudGeometries, materials.wire, shroudSegments)),
  ];
}

function buildStay(id: string, a: Vec3, b: Vec3, materials: BoatMaterials): THREE.Object3D {
  return asThin(
    partMesh(id, [cylinderBetween(a, b, boat.modelDetail.wireRenderRadius, 6)], materials.wire, [
      [a, b],
    ]),
  );
}

/**
 * Boom in a pivot group at the gooseneck. In the group's frame the boom points aft (−x);
 * the three mainsheet boom blocks hang under it, centred on mainsheet.boomDistance.
 */
function buildBoom(materials: BoatMaterials): THREE.Group {
  const { boom, mainsheet } = boat.rig;
  const section = boat.modelDetail.boomSection;
  const blockRadius = boat.modelDetail.block.radius;
  const pivot = new THREE.Group();
  pivot.name = 'boomPivot';
  pivot.position.copy(v3(vec3(boom.gooseneck)));
  pivot.add(
    partMesh(
      'part_boom',
      [boxAt([-boom.length / 2, 0, 0], [boom.length, section.height, section.width])],
      materials.spar,
      [
        [
          [0, 0, 0],
          [-boom.length, 0, 0],
        ],
      ],
    ),
  );
  const spacing = boat.modelDetail.mainsheetBoomBlockSpacing;
  const blocks: Vec3[] = mainsheetBlocks().offsets.map((k) => [
    -mainsheet.boomDistance + k * spacing,
    -section.height / 2 - blockRadius,
    0,
  ]);
  pivot.add(
    smallPartMesh(
      'fit_mainsheet_boom_blocks',
      blocks.map((p) => new THREE.SphereGeometry(blockRadius, 12, 8).translate(...p)),
      materials.block,
      blocks,
    ),
  );
  return pivot;
}

function buildGooseneck(materials: BoatMaterials): THREE.Object3D {
  const g = vec3(boat.rig.boom.gooseneck);
  const size = boat.modelDetail.gooseneckSize;
  return smallPartMesh('part_gooseneck', [boxAt(g, [size, size, size])], materials.fitting, [g]);
}

function buildDeckBlocks(materials: BoatMaterials): THREE.Object3D {
  const d = boat.rig.mainsheet.deckBlocks;
  const radius = boat.modelDetail.block.radius;
  const points: Vec3[] = [
    [d.x, d.y, -d.halfZ],
    [d.x, d.y, d.halfZ],
  ];
  return smallPartMesh(
    'fit_mainsheet_deck_blocks',
    points.map((p) => new THREE.SphereGeometry(radius, 12, 8).translate(...p)),
    materials.block,
    points,
  );
}

/** In-mast furling gearbox on the mast's aft face. */
function buildGearbox(materials: BoatMaterials): THREE.Object3D {
  const p = vec3(boat.rig.mainFurlingGearbox.position);
  const size = boat.modelDetail.mainFurlingGearbox;
  const centre: Vec3 = [p[0] - size.foreAft / 2, p[1], p[2]];
  return smallPartMesh(
    'part_main_furling_gearbox',
    [boxAt(centre, [size.foreAft, size.height, size.athwart])],
    materials.dark,
    [centre],
  );
}

function buildJibFurler(materials: BoatMaterials): THREE.Object3D {
  const f = boat.rig.jibFurler;
  const drum = vec3(f.drum);
  const top: Vec3 = [drum[0], drum[1] + f.drumHeight, drum[2]];
  const radius = boat.modelDetail.jibFurlerDrumDiameter / 2;
  const middle: Vec3 = [drum[0], drum[1] + f.drumHeight / 2, drum[2]];
  return smallPartMesh(
    'part_jib_furler',
    [cylinderBetween(drum, top, radius, 16)],
    materials.dark,
    [middle],
  );
}

/**
 * Straight self-tacking track and its car. The car is built around its own origin (on the
 * track's centre line) so sliding it only changes its z; its hit area moves with it.
 */
function buildSelfTackingTrack(materials: BoatMaterials): {
  track: THREE.Object3D;
  car: THREE.Object3D;
} {
  const [portEnd, starboardEnd] = selfTackingTrackEnds();
  const radius = boat.modelDetail.selfTackingTrack.radius;
  const size = boat.modelDetail.selfTackingCar;
  const carCentre: Vec3 = [0, radius + size.height / 2, 0];
  const car = smallPartMesh(
    'fit_self_tacking_car',
    // The car runs athwartships along the track, so its length lies along z.
    [boxAt(carCentre, [size.width, size.height, size.length])],
    materials.dark,
    [carCentre],
  );
  car.position.set(portEnd[0], portEnd[1], 0);
  return {
    track: partMesh(
      'fit_self_tacking_track',
      [cylinderBetween(portEnd, starboardEnd, radius, 8)],
      materials.fitting,
      [[portEnd, starboardEnd]],
    ),
    car,
  };
}

/**
 * Rigid vang (Selden Rodkicker): a thick tube fixed at the mast point and a thin tube fixed at
 * the boom point, sliding inside each other. Each tube is a unit cylinder along +y, so
 * following the boom only needs a new position, direction and length.
 */
function buildVangStrut(materials: BoatMaterials): {
  tubes: THREE.Object3D[];
  follow(pose: BoomPose): void;
} {
  const size = boat.modelDetail.vangStrut;
  const [restA, restB] = vangStrutEnds(CENTRED_BOOM);
  const tubeLength = size.tubeFraction * v3(restA).distanceTo(v3(restB));
  const unitTube = (diameter: number) => {
    const geometry = new THREE.CylinderGeometry(diameter / 2, diameter / 2, 1, 12);
    geometry.translate(0, 0.5, 0);
    return partMesh('part_vang_strut', [geometry], materials.spar, [
      [
        [0, 0, 0],
        [0, 1, 0],
      ],
    ]);
  };
  const lower = unitTube(size.lowerDiameter);
  const upper = unitTube(size.upperDiameter);
  const up = new THREE.Vector3(0, 1, 0);
  const place = (tube: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) => {
    tube.position.copy(from);
    tube.quaternion.setFromUnitVectors(up, to.clone().sub(from).normalize());
    tube.scale.set(1, tubeLength, 1);
    tube.updateMatrixWorld();
  };
  return {
    tubes: [lower, upper],
    follow(pose) {
      const [a, b] = vangStrutEnds(pose).map(v3) as [THREE.Vector3, THREE.Vector3];
      place(lower, a, b);
      place(upper, b, a);
    },
  };
}

/** Ring of turning blocks around the mast foot, where the lines turn aft. */
function buildTurningBlocks(materials: BoatMaterials): THREE.Object3D {
  const { count, ringRadius, blockDiameter } = boat.modelDetail.mastBaseTurningBlocks;
  const { mast } = boat.rig;
  const y = mast.footY + blockDiameter / 2;
  const points: Vec3[] = Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * (i + 0.5)) / count;
    return [mast.x + ringRadius * Math.cos(angle), y, ringRadius * Math.sin(angle)];
  });
  return smallPartMesh(
    'fit_mast_base_turning_blocks',
    points.map((p) => new THREE.SphereGeometry(blockDiameter / 2, 10, 6).translate(...p)),
    materials.block,
    points,
  );
}
