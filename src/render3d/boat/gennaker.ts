import * as THREE from 'three';
import { boat } from '../../model/boat';
import type { GennakerDrawing, GennakerSolution } from '../../model/gennaker';
import { gennakerSailGrid } from '../../model/sailShape';
import type { Detail } from '../../model/settings';
import { vec3, type Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { partMesh } from './parts';
import { buildSailMesh } from './sailMesh';

/**
 * The gennaker's solid parts (M105): the bag at the bow, the sock tube from the bow to the
 * masthead, and one sheet block on each side near the stern. Its lines come from `ropeDrawings`.
 * The part ids are written out here: tests/glossary.test.ts checks that a drawn id appears in
 * the source.
 */
export interface GennakerModel {
  objects: THREE.Object3D[];
  update(drawing: GennakerDrawing, sol: GennakerSolution, windSpeedKn: number, timeS: number): void;
}

const UP = new THREE.Vector3(0, 1, 0);

/** A sail not yet set: the grid the mesh is first built for. */
const FIRST: GennakerSolution = {
  set: false,
  sockUp: 0,
  thetaDeg: 15,
  phiDeg: 15,
  aoaDeg: 0,
  blanket: 1,
  backed: false,
  pressed: false,
  fill: 0,
  side: 1,
};

export function buildGennaker(materials: BoatMaterials, detail: Detail): GennakerModel {
  const g = boat.sails.gennaker;
  const segments = detail === 'high' ? 16 : 8;
  const bagCentre = vec3(g.bag.centre);

  // The bag: a cylinder with its axis along x, lying on the foredeck.
  const bagGeometry = new THREE.CylinderGeometry(
    g.bag.radiusM,
    g.bag.radiusM,
    g.bag.lengthM,
    segments,
  );
  bagGeometry.rotateZ(Math.PI / 2);
  bagGeometry.translate(bagCentre[0], bagCentre[1], bagCentre[2]);
  const bag = partMesh('part_gennaker_bag', [bagGeometry], materials.sail, [
    [
      [bagCentre[0] - g.bag.lengthM / 2, bagCentre[1], bagCentre[2]],
      [bagCentre[0] + g.bag.lengthM / 2, bagCentre[1], bagCentre[2]],
    ],
  ]);

  // The sock: a unit-length tube whose foot is at its origin, scaled and turned each update.
  const sockGeometry = new THREE.CylinderGeometry(g.sock.radiusM, g.sock.radiusM, 1, segments);
  sockGeometry.translate(0, 0.5, 0);
  const sock = partMesh('part_gennaker_sock', [sockGeometry], materials.sail, [
    [
      [0, 0, 0],
      [0, 1, 0],
    ],
  ]);

  // One block each side: the axle across the boat (z), its centre one radius above the point.
  const blockCentres: Vec3[] = [1, -1].map((side) => [
    g.sheetBlock.x,
    g.sheetBlock.y + g.sheetBlock.radiusM,
    side * g.sheetBlock.z,
  ]);
  const blockGeometries = blockCentres.map(([x, y, z]) => {
    const geometry = new THREE.CylinderGeometry(
      g.sheetBlock.radiusM,
      g.sheetBlock.radiusM,
      g.sheetBlock.widthM,
      segments,
    );
    geometry.rotateX(Math.PI / 2);
    geometry.translate(x, y, z);
    return geometry;
  });
  const blocks = partMesh(
    'fit_gennaker_block',
    blockGeometries,
    materials.block,
    blockCentres.map((c) => [c, c]),
  );

  bag.visible = false;
  sock.visible = false;
  blocks.visible = false;

  // The sail (M106): drawn while the sock has been pulled up at all; the part above the sock's
  // mouth is gathered onto the luff.
  const sailInput = (sol: GennakerSolution, windSpeedKn: number, timeS: number) => ({
    thetaDeg: sol.thetaDeg,
    fill: sol.fill,
    windSpeedKn,
    timeS,
    sockUp: sol.sockUp,
    fallbackSide: sol.side,
  });
  const sail = buildSailMesh(
    'sail_gennaker',
    materials,
    gennakerSailGrid({ ...sailInput(FIRST, 0, 0) }),
    false,
  );

  const direction = new THREE.Vector3();
  const update = (
    drawing: GennakerDrawing,
    sol: GennakerSolution,
    windSpeedKn: number,
    timeS: number,
  ) => {
    bag.visible = drawing.bag;
    blocks.visible = drawing.sheets !== null;
    sock.visible = drawing.sock !== null;
    if (drawing.sock) {
      const { from, to } = drawing.sock;
      direction.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
      const length = direction.length();
      sock.position.set(from[0], from[1], from[2]);
      sock.quaternion.setFromUnitVectors(UP, direction.normalize());
      sock.scale.set(1, length, 1);
      sock.updateMatrixWorld(true);
    }
    const drawn = drawing.sock !== null && sol.sockUp > 0.05;
    if (drawn) sail.update(gennakerSailGrid(sailInput(sol, windSpeedKn, timeS)), true);
    else if (sail.mesh.visible) sail.mesh.visible = false;
  };
  return { objects: [bag, sock, blocks, sail.mesh], update };
}
