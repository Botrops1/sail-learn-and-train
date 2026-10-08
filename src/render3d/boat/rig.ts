import * as THREE from 'three';
import { boat } from '../../model/boat';
import { CENTRED_BOOM, selfTackingTrackPoints, type BoomPose } from '../../model/rigGeometry';
import { vec3, type Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { boxAt, cylinderBetween, partMesh, v3, type PickSegment } from './parts';

const DEG = Math.PI / 180;

export interface Rig {
  objects: THREE.Object3D[];
  /** Pivot at the gooseneck; rotate with setBoomPose(). */
  boomPivot: THREE.Group;
}

/** Mast, spreaders, standing rigging, boom and the rig fittings (PHASE1_SPEC 6.1). */
export function buildRig(materials: BoatMaterials): Rig {
  const boomPivot = buildBoom(materials);
  setBoomPose(boomPivot, CENTRED_BOOM);
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
      buildGooseneck(materials),
      buildDeckBlocks(materials),
      buildGearbox(materials),
      buildJibFurler(materials),
      ...buildSelfTackingTrack(materials),
    ],
    boomPivot,
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
    partMesh('part_spreader', spreaderGeometries, materials.spar, spreaderSegments),
    partMesh('part_shroud', shroudGeometries, materials.wire, shroudSegments),
  ];
}

function buildStay(id: string, a: Vec3, b: Vec3, materials: BoatMaterials): THREE.Object3D {
  return partMesh(
    id,
    [cylinderBetween(a, b, boat.modelDetail.wireRenderRadius, 6)],
    materials.wire,
    [[a, b]],
  );
}

/**
 * Boom in a pivot group at the gooseneck. In the group's frame the boom points aft (−x);
 * the mainsheet boom blocks hang under it at mainsheet.boomDistance.
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
  const blockCentre: Vec3 = [-mainsheet.boomDistance, -section.height / 2 - blockRadius, 0];
  pivot.add(
    partMesh(
      'fit_mainsheet_boom_blocks',
      [new THREE.SphereGeometry(blockRadius, 12, 8).translate(...blockCentre)],
      materials.block,
      [[blockCentre, blockCentre]],
    ),
  );
  return pivot;
}

function buildGooseneck(materials: BoatMaterials): THREE.Object3D {
  const g = vec3(boat.rig.boom.gooseneck);
  const size = boat.modelDetail.gooseneckSize;
  return partMesh('part_gooseneck', [boxAt(g, [size, size, size])], materials.fitting, [[g, g]]);
}

function buildDeckBlocks(materials: BoatMaterials): THREE.Object3D {
  const d = boat.rig.mainsheet.deckBlocks;
  const radius = boat.modelDetail.block.radius;
  const points: Vec3[] = [
    [d.x, d.y, -d.halfZ],
    [d.x, d.y, d.halfZ],
  ];
  return partMesh(
    'fit_mainsheet_deck_blocks',
    points.map((p) => new THREE.SphereGeometry(radius, 12, 8).translate(...p)),
    materials.block,
    points.map((p) => [p, p] as const),
  );
}

/** In-mast furling gearbox on the mast's aft face. */
function buildGearbox(materials: BoatMaterials): THREE.Object3D {
  const p = vec3(boat.rig.mainFurlingGearbox.position);
  const size = boat.modelDetail.mainFurlingGearbox;
  const centre: Vec3 = [p[0] - size.foreAft / 2, p[1], p[2]];
  return partMesh(
    'part_main_furling_gearbox',
    [boxAt(centre, [size.foreAft, size.height, size.athwart])],
    materials.dark,
    [[centre, centre]],
  );
}

function buildJibFurler(materials: BoatMaterials): THREE.Object3D {
  const f = boat.rig.jibFurler;
  const drum = vec3(f.drum);
  const top: Vec3 = [drum[0], drum[1] + f.drumHeight, drum[2]];
  const radius = boat.modelDetail.jibFurlerDrumDiameter / 2;
  return partMesh('part_jib_furler', [cylinderBetween(drum, top, radius, 16)], materials.dark, [
    [drum, top],
  ]);
}

/** Curved self-tacking track and its car (at the centre while the jib is on the centreline). */
function buildSelfTackingTrack(materials: BoatMaterials): THREE.Object3D[] {
  const points = selfTackingTrackPoints();
  const curve = new THREE.CatmullRomCurve3(points.map(v3));
  const radius = boat.modelDetail.selfTackingTrack.radius;
  const track = new THREE.TubeGeometry(curve, points.length * 2, radius, 6, false);
  const segments: PickSegment[] = points.slice(1).map((p, i) => [points[i] ?? p, p] as const);
  const car = boat.modelDetail.selfTackingCar;
  const centre = points[Math.floor(points.length / 2)] ?? points[0] ?? [0, 0, 0];
  const carCentre: Vec3 = [centre[0], centre[1] + radius + car.height / 2, centre[2]];
  return [
    partMesh('fit_self_tacking_track', [track], materials.fitting, segments),
    partMesh(
      'fit_self_tacking_car',
      // The car runs athwartships at the track centre, so its length lies along z.
      [boxAt(carCentre, [car.width, car.height, car.length])],
      materials.dark,
      [[carCentre, carCentre]],
    ),
  ];
}
