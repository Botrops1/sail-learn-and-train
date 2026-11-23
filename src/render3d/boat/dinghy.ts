import * as THREE from 'three';
import { boat } from '../../model/boat';
import { halfBeamAt, keelLineAt, sheerAt } from '../../model/hullShape';
import { vec3, type Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import {
  blockGeometry,
  blockMeshes,
  boxAt,
  cylinderBetween,
  partMesh,
  pushQuad,
  smallPartMesh,
  triangles,
} from './parts';

/**
 * M113 (PHASE_DINGHY_SPEC 7.6): what only the Training dinghy has, all from `boat.dinghy` and
 * `boat.hull`: the deck and the open cockpit, the centreboard and its case, the tiller with its
 * extension, the toe straps and the ratchet block.
 */
export interface DinghyParts {
  /** Meshes added to the boat's root. */
  objects: THREE.Object3D[];
  /** The tiller and its extension, in the rudder pivot's frame: add them to `rudderPivot`. */
  tiller: THREE.Group;
  /** Puts the centreboard `pct` % of the way down (0 = fully up, 100 = fully down). */
  setBoard(pct: number): void;
}

/** Positions of the centre line's stations between two x values, each at most `GAP` apart. */
const GAP = 0.25;

function stationsBetween(a: number, b: number): number[] {
  const steps = Math.max(1, Math.ceil((b - a) / GAP));
  return Array.from({ length: steps + 1 }, (_, i) => a + ((b - a) * i) / steps);
}

/** The foredeck: full width at sheer height from `cockpit.fwdX` to the bow. */
function foredeck(): THREE.BufferGeometry {
  const { fwdX } = boat.dinghy?.cockpit ?? { fwdX: 0 };
  const xs = stationsBetween(fwdX, boat.hull.stemX);
  const positions: number[] = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i] ?? 0;
    const x1 = xs[i + 1] ?? 0;
    const [y0, y1] = [sheerAt(x0), sheerAt(x1)];
    const [b0, b1] = [halfBeamAt(x0), halfBeamAt(x1)];
    pushQuad(positions, [x0, y0, -b0], [x0, y0, b0], [x1, y1, b1], [x1, y1, -b1]);
  }
  return triangles(positions);
}

/** The side decks: a strip `sideDeckWidthM` wide inside the sheer, from the transom to the foredeck. */
function sideDecks(): THREE.BufferGeometry {
  const d = boat.dinghy;
  if (!d) return triangles([]);
  const xs = stationsBetween(boat.hull.transomX, d.cockpit.fwdX);
  const positions: number[] = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i] ?? 0;
    const x1 = xs[i + 1] ?? 0;
    const [y0, y1] = [sheerAt(x0), sheerAt(x1)];
    const [b0, b1] = [halfBeamAt(x0), halfBeamAt(x1)];
    const [w0, w1] = [Math.max(0, b0 - d.sideDeckWidthM), Math.max(0, b1 - d.sideDeckWidthM)];
    for (const side of [1, -1]) {
      pushQuad(
        positions,
        [x0, y0, side * w0],
        [x0, y0, side * b0],
        [x1, y1, side * b1],
        [x1, y1, side * w1],
      );
    }
  }
  return triangles(positions);
}

/** The cockpit floor between `aftX` and `fwdX`, `±halfWidth` wide, at `floorY`. */
function cockpitFloor(): THREE.BufferGeometry {
  const c = boat.dinghy?.cockpit;
  if (!c) return triangles([]);
  const positions: number[] = [];
  pushQuad(
    positions,
    [c.aftX, c.floorY, -c.halfWidth],
    [c.aftX, c.floorY, c.halfWidth],
    [c.fwdX, c.floorY, c.halfWidth],
    [c.fwdX, c.floorY, -c.halfWidth],
  );
  return triangles(positions);
}

export function buildDinghyParts(materials: BoatMaterials): DinghyParts {
  const d = boat.dinghy;
  if (!d) throw new Error('buildDinghyParts needs the dinghy boat data.');
  const { centreboard, tiller, toeStraps, cockpit } = d;
  const objects: THREE.Object3D[] = [];

  // The deck and the open cockpit.
  objects.push(
    partMesh('part_deck', [foredeck()], materials.deck),
    partMesh('part_deck', [sideDecks()], materials.gelcoat),
    partMesh('part_cockpit', [cockpitFloor()], materials.deck),
  );

  // The centreboard case: a narrow box from the floor up, and the board that slides in it.
  const caseLength = centreboard.chordM + 0.04;
  const caseHeight = centreboard.caseTopY - cockpit.floorY;
  objects.push(
    partMesh(
      'part_centreboard',
      [boxAt([centreboard.x, cockpit.floorY + caseHeight / 2, 0], [caseLength, caseHeight, 0.06])],
      materials.gelcoat,
    ),
  );
  const hullDepth = -keelLineAt(centreboard.x);
  const boardHeight = hullDepth + centreboard.depthBelowHullM;
  const board = partMesh(
    'part_centreboard',
    [boxAt([0, boardHeight / 2, 0], [centreboard.chordM, boardHeight, centreboard.thicknessM])],
    materials.appendage,
    [
      [
        [0, 0, 0],
        [0, boardHeight, 0],
      ],
    ],
  );
  board.position.x = centreboard.x;
  objects.push(board);
  const setBoard = (pct: number) => {
    const down = Math.min(100, Math.max(0, pct)) / 100;
    board.position.y = -hullDepth - centreboard.depthBelowHullM * down;
    board.updateMatrixWorld();
  };
  setBoard(100);

  // The tiller and its extension: fixed to the rudder head, so they turn with the rudder about
  // the stock; the tiller's front end then swings to the side opposite the rudder's back edge.
  const stockX = boat.hull.rudder.stockX;
  const group = new THREE.Group();
  group.name = 'tillerGroup';
  group.position.set(tiller.pivot[0] - stockX, tiller.pivot[1], tiller.pivot[2]);
  const bar = partMesh(
    'part_tiller',
    [boxAt([tiller.lengthM / 2, 0, 0], [tiller.lengthM, 0.03, 0.035])],
    materials.teak,
    [
      [
        [0, 0, 0],
        [tiller.lengthM, 0, 0],
      ],
    ],
  );
  const extension = partMesh(
    'part_tiller_extension',
    [
      cylinderBetween(
        [tiller.lengthM, 0, 0],
        [tiller.lengthM + tiller.extensionM, 0, 0],
        0.008,
        10,
      ),
    ],
    materials.fitting,
    [
      [
        [tiller.lengthM, 0, 0],
        [tiller.lengthM + tiller.extensionM, 0, 0],
      ],
    ],
  );
  group.add(bar, extension);

  // The toe straps: a flat strap on each side, held up at both ends by a small block.
  const strapGeometries: THREE.BufferGeometry[] = [];
  const strapLength = Math.abs(toeStraps.toX - toeStraps.fromX);
  const strapMid = (toeStraps.toX + toeStraps.fromX) / 2;
  const lift = 0.035;
  for (const side of [1, -1]) {
    const z = side * toeStraps.halfZ;
    strapGeometries.push(boxAt([strapMid, toeStraps.y + lift, z], [strapLength, 0.008, 0.05]));
    for (const x of [toeStraps.fromX, toeStraps.toX]) {
      strapGeometries.push(boxAt([x, toeStraps.y + lift / 2, z], [0.03, lift, 0.05]));
    }
  }
  const strapPoints: Vec3[] = [-1, 1].map((side): Vec3 => [
    strapMid,
    toeStraps.y + lift,
    side * toeStraps.halfZ,
  ]);
  objects.push(smallPartMesh('fit_toe_straps', strapGeometries, materials.fabric, strapPoints));

  // The ratchet block on the floor: its axle across the boat, its shackle down to the floor.
  const ratchet = vec3(d.ratchetBlock);
  objects.push(
    ...blockMeshes(
      'fit_ratchet_block',
      [blockGeometry(ratchet, [0, 0, 1], boat.modelDetail.block.radius, [0, -1, 0])],
      materials,
      { hitPoints: [ratchet] },
    ),
  );

  return { objects, tiller: group, setBoard };
}
