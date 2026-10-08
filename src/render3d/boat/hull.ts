import type * as THREE from 'three';
import { boat } from '../../model/boat';
import { coachroofBaseY, coachroofHalfOutline } from '../../model/deckVolumes';
import { halfBeamAt, sectionPoint, sheerAt } from '../../model/hullShape';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { boxAt, partMesh, pushQuad, triangles } from './parts';

/** Points per half-section from the keel line to the deck edge. */
const SECTION_SAMPLES = 16;
/** Longest gap between hull stations, metres (smoothness of the loft). */
const MAX_STATION_GAP = 0.25;
/** Small lift that keeps overlapping surfaces from flickering (z-fighting), metres. */
const EPS = 0.01;
/** How far a part reaches into its neighbour so no gap shows at the joint, metres. */
const OVERLAP = 0.1;
/** Thickness of thin panels (companionway door and hatch), metres. */
const PANEL = 0.04;

/**
 * Hull, deck, coachroof, cockpit, companionway, stern platform and bow fitting
 * (PHASE1_SPEC 6.1), lofted from the plan outline, sheer and keel line in hanse508.json.
 */
export function buildHull(materials: BoatMaterials): THREE.Object3D[] {
  const stations = hullStations();
  return [
    partMesh('part_hull', [hullShell(stations), endCap(boat.hull.stemX, +1)], materials.hull),
    partMesh('part_stern', [aftPlatform(stations)], materials.teak, [
      [
        [boat.hull.transomX, sheerAt(boat.hull.transomX), 0],
        [boat.deck.aftPlatform.frontX, sheerAt(boat.deck.aftPlatform.frontX), 0],
      ],
    ]),
    partMesh('part_stern', [endCap(boat.hull.transomX, -1)], materials.hull),
    partMesh('part_deck', [deck(stations, 'foredeck')], materials.deck),
    partMesh('part_deck', [deck(stations, 'sideDecks')], materials.teak),
    ...coachroof(materials),
    ...cockpit(materials),
    companionway(materials),
    bowFitting(materials),
  ];
}

/** Station x positions from transom to stem: data points plus the cockpit and waterline ends. */
export function hullStations(): number[] {
  const { hull, deck } = boat;
  const keys = [
    ...hull.deckEdgeHalfBeam.points.map((point) => point[0] ?? 0),
    hull.stemX,
    hull.transomX,
    hull.waterline.fwdX,
    hull.waterline.aftX,
    hull.canoeBody.deepestX,
    deck.cockpit.frontX,
    deck.cockpit.aftX,
  ];
  const sorted = [...new Set(keys.map((x) => Math.round(x * 1000) / 1000))]
    .filter((x) => x >= hull.transomX && x <= hull.stemX)
    .sort((a, b) => a - b);
  const stations: number[] = [];
  sorted.forEach((x, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined) {
      const steps = Math.ceil((x - previous) / MAX_STATION_GAP);
      for (let k = 1; k < steps; k += 1) stations.push(previous + ((x - previous) * k) / steps);
    }
    stations.push(x);
  });
  return stations;
}

function hullShell(stations: number[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  // Per station: one shared keel-line vertex, then SECTION_SAMPLES vertices per side.
  const perStation = 1 + 2 * SECTION_SAMPLES;
  for (const x of stations) {
    const [keelY] = sectionPoint(x, 0);
    positions.push(x, keelY, 0);
    for (const side of [1, -1]) {
      for (let j = 1; j <= SECTION_SAMPLES; j += 1) {
        const [y, z] = sectionPoint(x, j / SECTION_SAMPLES);
        positions.push(x, y, side * z);
      }
    }
  }
  const index = (station: number, side: number, j: number) =>
    station * perStation + (j === 0 ? 0 : 1 + (side > 0 ? 0 : SECTION_SAMPLES) + (j - 1));
  for (let i = 0; i < stations.length - 1; i += 1) {
    for (const side of [1, -1]) {
      for (let j = 0; j < SECTION_SAMPLES; j += 1) {
        const a = index(i, side, j);
        const b = index(i + 1, side, j);
        const c = index(i + 1, side, j + 1);
        const d = index(i, side, j + 1);
        if (side > 0) indices.push(a, b, c, a, c, d);
        else indices.push(a, c, b, a, d, c);
      }
    }
  }
  return triangles(positions, indices);
}

/** Closes the hull at the stem (direction +1) or the transom (−1). */
function endCap(x: number, direction: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const offset = -direction * EPS;
  for (let j = 0; j < SECTION_SAMPLES; j += 1) {
    const [y0, z0] = sectionPoint(x, j / SECTION_SAMPLES);
    const [y1, z1] = sectionPoint(x, (j + 1) / SECTION_SAMPLES);
    pushQuad(
      positions,
      [x + offset, y0, -z0],
      [x + offset, y0, z0],
      [x + offset, y1, z1],
      [x + offset, y1, -z1],
    );
  }
  return triangles(positions);
}

/**
 * Flat deck at sheer height, in two parts: the non-slip foredeck forward of the coachroof, and
 * the teak side decks beside the coachroof and the cockpit (M3b, owner request). The cockpit
 * well is left open and the aft platform is drawn separately.
 */
function deck(stations: number[], part: 'foredeck' | 'sideDecks'): THREE.BufferGeometry {
  const { cockpit, aftPlatform, coachroof: roof } = boat.deck;
  const positions: number[] = [];
  const outline = coachroofHalfOutline(roof.frontX);
  const roofHalf = (x: number) => {
    for (let i = 1; i < outline.length; i += 1) {
      const [x0, w0] = outline[i - 1] as [number, number];
      const [x1, w1] = outline[i] as [number, number];
      if (x <= x1) return w0 + ((w1 - w0) * (x - x0)) / Math.max(1e-9, x1 - x0);
    }
    return roof.frontHalfWidth;
  };
  const deckStations = [...new Set([...stations, roof.frontX, roof.aftX])]
    .filter((x) => x >= aftPlatform.frontX)
    .sort((a, b) => a - b);
  for (let i = 0; i < deckStations.length - 1; i += 1) {
    const x0 = deckStations[i] ?? 0;
    const x1 = deckStations[i + 1] ?? 0;
    const mid = (x0 + x1) / 2;
    const y0 = sheerAt(x0);
    const y1 = sheerAt(x1);
    const b0 = halfBeamAt(x0);
    const b1 = halfBeamAt(x1);
    const forward = mid >= roof.frontX;
    if (forward !== (part === 'foredeck')) continue;
    if (forward) {
      pushQuad(positions, [x0, y0, -b0], [x0, y0, b0], [x1, y1, b1], [x1, y1, -b1]);
      continue;
    }
    // Beside the coachroof (under it there is nothing to draw) or beside the cockpit well.
    const inner = (x: number) =>
      x >= roof.aftX - EPS ? roofHalf(x) - OVERLAP : cockpit.wellHalfWidth;
    const w0 = Math.min(inner(x0), b0);
    const w1 = Math.min(inner(x1), b1);
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

/** Teak deck over the bathing platform, from the cockpit's aft end to the transom. */
function aftPlatform(stations: number[]): THREE.BufferGeometry {
  const { aftPlatform: platform } = boat.deck;
  const positions: number[] = [];
  const xs = stations.filter((x) => x <= platform.frontX + EPS);
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i] ?? 0;
    const x1 = xs[i + 1] ?? 0;
    const y0 = Math.max(sheerAt(x0), platform.y) + EPS;
    const y1 = Math.max(sheerAt(x1), platform.y) + EPS;
    const b0 = halfBeamAt(x0);
    const b1 = halfBeamAt(x1);
    pushQuad(positions, [x0, y0, -b0], [x0, y0, b0], [x1, y1, b1], [x1, y1, -b1]);
  }
  return triangles(positions);
}

/**
 * Coachroof: drawing width at the aft end, widening to maxHalfWidth at the mast (photo: the
 * self-tacking track ends at its edges), front corners cut, front face sloping back to
 * topFrontX. Non-slip top, smooth gelcoat sides. Its base sits a little below the deck so no
 * gap shows.
 */
function coachroof(materials: BoatMaterials): THREE.Object3D[] {
  const r = boat.deck.coachroof;
  const baseY = coachroofBaseY();
  // Port side from aft to front, then starboard from front to aft: a convex outline.
  const outline = (frontX: number): [number, number][] => [
    ...coachroofHalfOutline(frontX).map(([x, z]): [number, number] => [x, -z]),
    ...coachroofHalfOutline(frontX)
      .reverse()
      .map(([x, z]): [number, number] => [x, z]),
  ];
  const bottom = outline(r.frontX);
  const top = outline(r.topFrontX);
  const sides: number[] = [];
  for (let i = 0; i < bottom.length; i += 1) {
    const next = (i + 1) % bottom.length;
    const [bx0, bz0] = bottom[i] ?? [0, 0];
    const [bx1, bz1] = bottom[next] ?? [0, 0];
    const [tx0, tz0] = top[i] ?? [0, 0];
    const [tx1, tz1] = top[next] ?? [0, 0];
    pushQuad(sides, [bx0, baseY, bz0], [bx1, baseY, bz1], [tx1, r.topY, tz1], [tx0, r.topY, tz0]);
  }
  // Roof top: a fan over the convex outline.
  const roof: number[] = [];
  const [cx, cz] = top[0] ?? [0, 0];
  for (let i = 1; i < top.length - 1; i += 1) {
    const [x1, z1] = top[i] ?? [0, 0];
    const [x2, z2] = top[i + 1] ?? [0, 0];
    roof.push(cx, r.topY, cz, x1, r.topY, z1, x2, r.topY, z2);
  }
  return [
    partMesh('part_coachroof', [triangles(roof)], materials.deck),
    partMesh('part_coachroof', [triangles(sides)], materials.gelcoat),
  ];
}

/** Cockpit well (sole and walls) and the side coamings that carry winches and clutches. */
function cockpit(materials: BoatMaterials): THREE.Object3D[] {
  const c = boat.deck.cockpit;
  const w = c.wellHalfWidth;
  const positions: number[] = [];
  // Sole.
  pushQuad(
    positions,
    [c.aftX, c.soleY, -w],
    [c.aftX, c.soleY, w],
    [c.frontX, c.soleY, w],
    [c.frontX, c.soleY, -w],
  );
  // Side walls up to the coaming top.
  for (const side of [1, -1]) {
    pushQuad(
      positions,
      [c.aftX, c.soleY, side * w],
      [c.frontX, c.soleY, side * w],
      [c.frontX, c.coamingTopY, side * w],
      [c.aftX, c.coamingTopY, side * w],
    );
  }
  // Front and aft walls up to the deck.
  for (const x of [c.frontX, c.aftX]) {
    const top = sheerAt(x) + EPS;
    pushQuad(positions, [x, c.soleY, -w], [x, c.soleY, w], [x, top, w], [x, top, -w]);
  }
  const sole = triangles(positions.splice(0, 18));
  const well = triangles(positions);

  const coamingWidth = boat.modelDetail.coamingWidth;
  const lowestDeck = Math.min(sheerAt(c.frontX), sheerAt(c.aftX));
  const coamings = [1, -1].map((side) => {
    const height = c.coamingTopY - (lowestDeck - OVERLAP);
    const centre: Vec3 = [
      (c.frontX + c.aftX) / 2,
      c.coamingTopY - height / 2,
      side * (w + coamingWidth / 2),
    ];
    return boxAt(centre, [c.frontX - c.aftX, height, coamingWidth]);
  });
  return [
    partMesh('part_cockpit', [sole], materials.teak),
    partMesh('part_cockpit', [well, ...coamings], materials.gelcoat),
  ];
}

/** Companionway: the opening in the coachroof's aft face, with a sliding hatch on the roof. */
function companionway(materials: BoatMaterials): THREE.Object3D {
  const { companionway: cw, cockpit, coachroof } = boat.deck;
  const hatchLength = boat.modelDetail.companionwayHatchLength;
  const doorX = Math.min(cw.x, cockpit.frontX) - PANEL;
  const door = boxAt(
    [doorX, (cockpit.soleY + coachroof.topY) / 2, 0],
    [PANEL, coachroof.topY - cockpit.soleY, 2 * cw.halfWidth],
  );
  const hatch = boxAt(
    [cw.x + hatchLength / 2, coachroof.topY + PANEL / 2, 0],
    [hatchLength, PANEL, 2 * cw.halfWidth],
  );
  return partMesh('part_companionway', [door, hatch], materials.dark, [
    [
      [doorX, cockpit.soleY, 0],
      [doorX, coachroof.topY, 0],
    ],
  ]);
}

/** Bow fitting (anchor roller) from the stem to its tip, on deck. */
function bowFitting(materials: BoatMaterials): THREE.Object3D {
  const { stemX, bowFittingTipX, bowFittingHalfWidth } = boat.hull;
  const height = boat.modelDetail.bowFittingHeight;
  const top = sheerAt(stemX) + height / 2;
  const length = bowFittingTipX - stemX + OVERLAP;
  const centre: Vec3 = [bowFittingTipX - length / 2, top - height / 2, 0];
  return partMesh(
    'part_bow',
    [boxAt(centre, [length, height, 2 * bowFittingHalfWidth])],
    materials.fitting,
    [
      [
        [stemX, top, 0],
        [bowFittingTipX, top, 0],
      ],
    ],
  );
}
