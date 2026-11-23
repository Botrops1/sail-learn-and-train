import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boat } from '../model/boat';
import {
  codeZeroPicture,
  spinnakerPicture,
  travellerPicture,
  type PictureId,
} from '../model/pictures';
import { pictureSailGrid } from '../model/sailShape';
import type { Detail } from '../model/settings';
import { vec3, type Vec3 } from '../model/vec3';
import type { BoatMaterials } from './boat/materials';
import { boxAt, partMesh, type PickSegment } from './boat/parts';
import { buildSailMesh } from './boat/sailMesh';
import { SCENE } from './sceneConfig';

/**
 * The pictures of things this boat does not carry (M109, PHASE_RIGGING_SPEC 11.5; M110, 12.3): a
 * symmetric spinnaker with its pole and lines, a code 0 on its furler and a mainsheet traveller
 * (track, car and sheet). Only the meshes of the picture shown are visible; the geometry is
 * rebuilt only when the picture, the wind angle (rounded to a degree) or the traveller's car
 * changes. The part ids are written out here: tests/glossary.test.ts checks that a drawn
 * id appears in the source.
 */
export interface PicturesModel {
  objects: THREE.Object3D[];
  update(picture: PictureId | null, awaDeg: number, travellerCarPct?: number): void;
}

const UP = new THREE.Vector3(0, 1, 0);

/** A rope as short cylinders between its points. */
function tubeGeometry(
  points: readonly Vec3[],
  radius: number,
  radial: number,
): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const from = new THREE.Vector3();
  const direction = new THREE.Vector3();
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Vec3;
    const b = points[i] as Vec3;
    from.set(a[0], a[1], a[2]);
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = direction.length();
    if (length < 1e-6) continue;
    const piece = new THREE.CylinderGeometry(radius, radius, length, radial, 1, true);
    piece.translate(0, length / 2, 0);
    piece.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
    piece.translate(from.x, from.y, from.z);
    pieces.push(piece);
  }
  const merged = mergeGeometries(pieces);
  return merged ?? new THREE.BufferGeometry();
}

function segmentsOf(points: readonly Vec3[]): PickSegment[] {
  const segments: PickSegment[] = [];
  for (let i = 1; i < points.length; i += 1)
    segments.push([points[i - 1] as Vec3, points[i] as Vec3]);
  return segments;
}

/** A rope of a picture: one mesh whose geometry is replaced when the picture moves. */
interface PictureRope {
  mesh: THREE.Mesh;
  set(points: readonly Vec3[]): void;
}

export function buildPictures(materials: BoatMaterials, detail: Detail): PicturesModel {
  const p = boat.pictures;
  const radial = detail === 'high' ? 8 : 5;
  const segments = detail === 'high' ? 16 : 8;
  const ropeMaterial = new THREE.MeshLambertMaterial({ color: SCENE.ropes.colors.gennaker });

  // The first points are a rope as drawn for a typical wind, so every mesh has a real geometry.
  const makeRope = (
    partId: string,
    points: readonly Vec3[],
    material: THREE.Material = ropeMaterial,
  ): PictureRope => {
    const radius = boat.visual.ropeRenderRadius;
    const mesh = partMesh(
      partId,
      [tubeGeometry(points, radius, radial)],
      material,
      segmentsOf(points),
    );
    mesh.visible = false;
    mesh.renderOrder = 2;
    return {
      mesh,
      set(next) {
        mesh.geometry.dispose();
        mesh.geometry = tubeGeometry(next, radius, radial);
        mesh.userData.pickSegments = segmentsOf(next);
      },
    };
  };

  // The symmetric spinnaker.
  const first = spinnakerPicture(150);
  const spinnakerSail = buildSailMesh(
    'sail_spinnaker',
    materials,
    pictureSailGrid(
      { tack: first.poleEnd, head: first.head, clew: first.clew },
      first.side === 1 ? -1 : 1,
      p.spinnaker.camberRatio,
    ),
    false,
  );
  // The pole: a unit tube whose heel is at its origin, scaled and turned on each rebuild.
  const poleGeometry = new THREE.CylinderGeometry(
    p.spinnaker.poleRadiusM,
    p.spinnaker.poleRadiusM,
    1,
    segments,
  );
  poleGeometry.translate(0, 0.5, 0);
  const pole = partMesh('part_spinnaker_pole', [poleGeometry], materials.spar, [
    [
      [0, 0, 0],
      [0, 1, 0],
    ],
  ]);
  pole.visible = false;
  const sheet = makeRope('rope_spinnaker_sheet', first.sheet);
  const guy = makeRope('rope_spinnaker_guy', first.guy);
  const poleLift = makeRope('rope_pole_lift', first.poleLift);
  const downhaul = makeRope('rope_pole_downhaul', first.downhaul);

  // The code 0 and its furler drum.
  const code = p.codeZero;
  const firstCode = codeZeroPicture(70);
  const codeSail = buildSailMesh(
    'sail_code_zero',
    materials,
    pictureSailGrid(
      { tack: firstCode.tack, head: firstCode.head, clew: firstCode.clew },
      firstCode.side,
      code.camberRatio,
    ),
    false,
  );
  const tack = vec3(code.tack);
  const drumGeometry = new THREE.CylinderGeometry(
    code.drumRadiusM,
    code.drumRadiusM,
    code.drumLengthM,
    segments,
  );
  drumGeometry.translate(tack[0], tack[1], tack[2]);
  const drum = partMesh('part_code_zero_furler', [drumGeometry], materials.spar, [[tack, tack]]);
  drum.visible = false;
  const codeSheet = makeRope('rope_code_zero_sheet', firstCode.sheet);

  // The traveller: a track across the boat, a car on it and the sheet from the car to the boom.
  const tr = p.traveller;
  const [sectionX, sectionY] = tr.trackSectionM as [number, number];
  const firstTraveller = travellerPicture(0);
  const track = partMesh(
    'part_traveller_track',
    [boxAt([0, 0, 0], [sectionX, sectionY, 2 * tr.halfLengthM])],
    materials.dark,
    [
      [
        [0, 0, -tr.halfLengthM],
        [0, 0, tr.halfLengthM],
      ],
    ],
  );
  track.position.set(firstTraveller.car[0], firstTraveller.car[1], 0);
  // The car and the sheet share the mainsheet's colour: the car is the sheet's lower block, and
  // from the phone's distance a dark track with an orange car is what can be told apart.
  const travellerRopeMaterial = new THREE.MeshLambertMaterial({
    color: SCENE.ropes.colors.mainsheet,
  });
  // A part (not a rope) follows the detail rule: lit with reflections at high detail.
  const carMaterial =
    detail === 'high'
      ? new THREE.MeshStandardMaterial({ color: SCENE.ropes.colors.mainsheet, roughness: 0.5 })
      : travellerRopeMaterial;
  const car = partMesh(
    'part_traveller_car',
    [boxAt([0, 0, 0], [tr.carSizeM, tr.carSizeM, tr.carSizeM])],
    carMaterial,
    [
      [
        [0, 0, 0],
        [0, 0, 0],
      ],
    ],
  );
  const carTop = (at: Vec3): Vec3 => [at[0], at[1] + tr.carSizeM / 2, at[2]];
  const travellerSheet = makeRope(
    'rope_traveller_mainsheet',
    [carTop(firstTraveller.car), firstTraveller.boomPoint],
    travellerRopeMaterial,
  );
  track.visible = false;
  car.visible = false;

  const spinnakerObjects: THREE.Object3D[] = [
    spinnakerSail.mesh,
    pole,
    sheet.mesh,
    guy.mesh,
    poleLift.mesh,
    downhaul.mesh,
  ];
  const codeObjects: THREE.Object3D[] = [codeSail.mesh, drum, codeSheet.mesh];
  const travellerObjects: THREE.Object3D[] = [track, car, travellerSheet.mesh];

  const direction = new THREE.Vector3();
  let shown: PictureId | null = null;
  let shownKey = Number.NaN;
  const update = (picture: PictureId | null, awaDeg: number, travellerCarPct = 0) => {
    const rounded = Math.round(awaDeg);
    // The traveller does not look at the wind: its picture changes with the car only.
    const key = picture === 'traveller' ? travellerCarPct : rounded;
    if (picture === shown && (picture === null || key === shownKey)) return;
    shown = picture;
    shownKey = key;
    const spinnaker = picture === 'spinnaker';
    const codeZero = picture === 'code0';
    const traveller = picture === 'traveller';
    for (const object of spinnakerObjects) object.visible = spinnaker;
    for (const object of codeObjects) object.visible = codeZero;
    for (const object of travellerObjects) object.visible = traveller;
    if (spinnaker) {
      const s = spinnakerPicture(rounded);
      spinnakerSail.update(
        pictureSailGrid(
          { tack: s.poleEnd, head: s.head, clew: s.clew },
          s.side === 1 ? -1 : 1,
          p.spinnaker.camberRatio,
        ),
        true,
      );
      const heel = vec3(p.spinnaker.poleHeel);
      direction.set(s.poleEnd[0] - heel[0], s.poleEnd[1] - heel[1], s.poleEnd[2] - heel[2]);
      const length = direction.length();
      pole.position.set(heel[0], heel[1], heel[2]);
      pole.quaternion.setFromUnitVectors(UP, direction.normalize());
      pole.scale.set(1, length, 1);
      pole.updateMatrixWorld(true);
      sheet.set(s.sheet);
      guy.set(s.guy);
      poleLift.set(s.poleLift);
      downhaul.set(s.downhaul);
    } else if (codeZero) {
      const c = codeZeroPicture(rounded);
      codeSail.update(
        pictureSailGrid({ tack: c.tack, head: c.head, clew: c.clew }, c.side, code.camberRatio),
        true,
      );
      codeSheet.set(c.sheet);
    } else if (traveller) {
      const picture = travellerPicture(travellerCarPct);
      car.position.set(picture.car[0], picture.car[1], picture.car[2]);
      travellerSheet.set([carTop(picture.car), picture.boomPoint]);
    }
  };
  return { objects: [...spinnakerObjects, ...codeObjects, ...travellerObjects], update };
}
