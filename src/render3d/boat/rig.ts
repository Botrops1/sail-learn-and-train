import * as THREE from 'three';
import { boat } from '../../model/boat';
import {
  CENTRED_BOOM,
  selfTackingTrackEnds,
  shroudSegments as rigShroudSegments,
  spreaderSegments as rigSpreaderSegments,
  vangStrutEnds,
  type BoomPose,
} from '../../model/rigGeometry';
import { mainsheetBlocks } from '../../model/mainsheet';
import { turningBlockPoint } from '../../model/ropePaths';
import type { Detail } from '../../model/settings';
import { vec3, type Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import {
  asThin,
  boxAt,
  cylinderBetween,
  partMesh,
  sheaveBlock,
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
export function buildRig(materials: BoatMaterials, detail: Detail = 'high'): Rig {
  const segments = detail === 'high' ? 24 : 12;
  const boomPivot = buildBoom(materials, segments);
  const vang = buildVangStrut(materials);
  const setPose = (pose: BoomPose) => {
    setBoomPose(boomPivot, pose);
    vang.follow(pose);
  };
  setPose(CENTRED_BOOM);
  const track = buildSelfTackingTrack(materials);
  return {
    objects: [
      buildMast(materials, segments),
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
      buildDeckBlocks(materials, segments),
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

/** An elliptical tube along y, `foreAft` × `athwart`, from y0 to y1 (in-mast furling section). */
function ellipticalTube(
  x: number,
  y0: number,
  y1: number,
  foreAft: number,
  athwart: number,
  segments: number,
): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, y1 - y0, segments, 1);
  geometry.scale(foreAft, 1, athwart);
  geometry.translate(x, (y0 + y1) / 2, 0);
  return geometry;
}

function buildMast(materials: BoatMaterials, segments: number): THREE.Object3D {
  const m = boat.rig.mast;
  return partMesh(
    'part_mast',
    [ellipticalTube(m.x, m.footY, m.topY, m.sectionForeAft, m.sectionAthwart, segments)],
    materials.spar,
    [
      [
        [m.x, m.footY, 0],
        [m.x, m.topY, 0],
      ],
    ],
  );
}

function buildSpreadersAndShrouds(materials: BoatMaterials): THREE.Object3D[] {
  const spreaderGeometries: THREE.BufferGeometry[] = [];
  const spreaderSegments: PickSegment[] = [];
  const shroudGeometries: THREE.BufferGeometry[] = [];
  const shroudSegments: PickSegment[] = [];
  for (const side of [1, -1] as const) {
    for (const { a, b, radius } of rigSpreaderSegments(side)) {
      spreaderGeometries.push(cylinderBetween(a, b, radius, 8));
      spreaderSegments.push([a, b]);
    }
    for (const { a, b, radius } of rigShroudSegments(side)) {
      shroudGeometries.push(cylinderBetween(a, b, radius, 6));
      shroudSegments.push([a, b]);
    }
  }
  return [
    asThin(partMesh('part_spreader', spreaderGeometries, materials.spreader, spreaderSegments)),
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
function buildBoom(materials: BoatMaterials, segments: number): THREE.Group {
  const { boom, mainsheet } = boat.rig;
  const section = boat.modelDetail.boomSection;
  const blockRadius = boat.modelDetail.block.radius;
  const pivot = new THREE.Group();
  pivot.name = 'boomPivot';
  pivot.position.copy(v3(vec3(boom.gooseneck)));
  pivot.add(
    partMesh(
      'part_boom',
      [
        new THREE.CylinderGeometry(0.5, 0.5, boom.length, segments, 1)
          .scale(section.height, 1, section.width)
          .rotateZ(Math.PI / 2)
          .translate(-boom.length / 2, 0, 0),
      ],
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
      blocks.flatMap((p) => sheaveBlock(p, [0, 0, 1], blockRadius, [0, 1, 0])),
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

/**
 * Spring-mounted mainsheet deck blocks: each block stands on a short spring that keeps it
 * upright when the sheet is slack (photo mainsheet-german.jpg).
 */
function buildDeckBlocks(materials: BoatMaterials, segments: number): THREE.Object3D {
  const d = boat.rig.mainsheet.deckBlocks;
  const radius = boat.modelDetail.block.radius;
  const roof = boat.deck.coachroof.topY;
  const points: Vec3[] = [
    [d.x, d.y, -d.halfZ],
    [d.x, d.y, d.halfZ],
  ];
  const geometries = points.flatMap((p) => [
    ...sheaveBlock(p, [0, 0, 1], radius, [0, -1, 0], segments),
    cylinderBetween([p[0], roof, p[2]], [p[0], p[1] - radius, p[2]], radius * 0.45, 8),
  ]);
  return smallPartMesh('fit_mainsheet_deck_blocks', geometries, materials.block, points);
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
  // The car reaches up to the jib sheet's block, where the jib solver measures the sheet.
  const height = boat.rig.selfTackingTrack.sheetBlockHeight - radius;
  const carCentre: Vec3 = [0, radius + height / 2, 0];
  const car = smallPartMesh(
    'fit_self_tacking_car',
    // The car runs athwartships along the track, so its length lies along z.
    [boxAt(carCentre, [size.width, height, size.length])],
    materials.dark,
    [carCentre],
  );
  car.position.set(portEnd[0], portEnd[1], 0);
  return {
    track: partMesh(
      'fit_self_tacking_track',
      [boxAt([portEnd[0], portEnd[1], 0], [3 * radius, 2 * radius, 2 * portEnd[2] * -1])],
      materials.dark,
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

/**
 * Turning blocks around the mast foot, one per line (rig.lineLead.lines): each sheave stands
 * upright in the plane from the mast towards its line's lead aft, the line coming down from
 * the mast and leaving flat along the deck.
 */
function buildTurningBlocks(materials: BoatMaterials): THREE.Object3D {
  const radius = boat.modelDetail.mastBaseTurningBlocks.blockDiameter / 2;
  const points: Vec3[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  for (const line of boat.rig.lineLead.lines) {
    const p = turningBlockPoint(line);
    const outward: Vec3 = [p[0] - boat.rig.mast.x, 0, p[2]];
    const axle: Vec3 = [-outward[2], 0, outward[0]];
    geometries.push(...sheaveBlock(p, axle, radius, [-outward[0], 0, -outward[2]], 12));
    points.push(p);
  }
  return smallPartMesh('fit_mast_base_turning_blocks', geometries, materials.block, points);
}
