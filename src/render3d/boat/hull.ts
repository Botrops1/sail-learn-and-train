import type * as THREE from 'three';
import type { Detail } from '../../model/settings';
import { boat } from '../../model/boat';
import {
  coachroofBaseY,
  coachroofHalfOutline,
  roofAftLip,
  DECK_EPS,
  DECK_OVERLAP,
  deckStations,
  nonSlipAftX,
  sideDeckInnerHalfWidth,
  toerailSection,
} from '../../model/deckVolumes';
import { halfBeamAt, sectionPoint, sheerAt } from '../../model/hullShape';
import { ropeBinBox } from '../../model/ropeBin';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { boxAt, partMesh, pushQuad, roundedBoxAt, triangles } from './parts';

/** Points per half-section from the keel line to the deck edge. */
const SECTION_SAMPLES = 16;
/** Longest gap between hull stations, metres (smoothness of the loft). */
const MAX_STATION_GAP = 0.25;
const EPS = DECK_EPS;
const OVERLAP = DECK_OVERLAP;
/** Thickness of thin panels (companionway door and hatch), metres. */
const PANEL = 0.04;

/**
 * Hull, deck, coachroof, cockpit, companionway, stern platform and bow fitting
 * (PHASE1_SPEC 6.1), lofted from the plan outline, sheer and keel line in hanse508.json.
 */
export function buildHull(materials: BoatMaterials, detail: Detail = 'high'): THREE.Object3D[] {
  const stations = hullStations();
  return [
    partMesh('part_hull', [hullShell(stations), endCap(boat.hull.stemX, +1)], materials.hull),
    partMesh(
      'part_stern',
      [
        endCap(boat.hull.transomX, -1, {
          soleY: boat.deck.cockpit.soleY,
          wellHalfWidth: boat.deck.cockpit.wellHalfWidth,
        }),
      ],
      materials.hull,
    ),
    partMesh('part_deck', [deck(stations, 'foredeck')], materials.deck),
    partMesh('part_deck', [deck(stations, 'sideDecks')], materials.teak),
    partMesh('part_deck', [toerail(stations)], materials.gelcoat),
    ...coachroof(materials),
    ...cockpit(materials, detail),
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

/**
 * Closes the hull at the stem (direction +1) or the transom (−1). `open` (M34, owner on PR
 * #81: the yacht is open from the back): above `soleY` the cap is left out between the two
 * sides of the well (`|z| < wellHalfWidth`), so the cockpit opens to the stern; the sides
 * outboard of the well (under the rope boxes and the side decks) stay closed.
 */
function endCap(
  x: number,
  direction: number,
  open?: { soleY: number; wellHalfWidth: number },
): THREE.BufferGeometry {
  const positions: number[] = [];
  const at = x - direction * EPS;
  const strip = (ya: number, za: number, yb: number, zb: number) =>
    pushQuad(positions, [at, ya, -za], [at, ya, za], [at, yb, zb], [at, yb, -zb]);
  for (let j = 0; j < SECTION_SAMPLES; j += 1) {
    const [y0, z0] = sectionPoint(x, j / SECTION_SAMPLES);
    const [y1, z1] = sectionPoint(x, (j + 1) / SECTION_SAMPLES);
    if (!open || y1 <= open.soleY) {
      strip(y0, z0, y1, z1);
      continue;
    }
    const zAt = (y: number) => z0 + ((z1 - z0) * (y - y0)) / (y1 - y0);
    if (y0 < open.soleY) strip(y0, z0, open.soleY, zAt(open.soleY));
    const yLow = Math.max(y0, open.soleY);
    const zLow = zAt(yLow);
    const inner = open.wellHalfWidth;
    if (zLow <= inner || z1 <= inner) continue;
    pushQuad(positions, [at, yLow, inner], [at, yLow, zLow], [at, y1, z1], [at, y1, inner]);
    pushQuad(positions, [at, yLow, -zLow], [at, yLow, -inner], [at, y1, -inner], [at, y1, -z1]);
  }
  return triangles(positions);
}

/**
 * Flat deck at sheer height, in two materials (M3b, owner request; M34: no raised aft deck behind
 * the well; M60b, owner): white non-slip only in the bow triangle from `nonSlipAftX`, teak
 * everywhere else: full width from the roof's top front edge (so the deck runs under the sloping
 * front face and no gap shows) and two side strips beside the coachroof and the cockpit. The
 * cockpit well is left open.
 */
function deck(stations: number[], part: 'foredeck' | 'sideDecks'): THREE.BufferGeometry {
  const roof = boat.deck.coachroof;
  const whiteFrom = nonSlipAftX();
  const positions: number[] = [];
  const xs = deckStations(stations);
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i] ?? 0;
    const x1 = xs[i + 1] ?? 0;
    const mid = (x0 + x1) / 2;
    const y0 = sheerAt(x0);
    const y1 = sheerAt(x1);
    const b0 = halfBeamAt(x0);
    const b1 = halfBeamAt(x1);
    const white = mid >= whiteFrom;
    if (white !== (part === 'foredeck')) continue;
    if (mid >= roof.topFrontX) {
      pushQuad(positions, [x0, y0, -b0], [x0, y0, b0], [x1, y1, b1], [x1, y1, -b1]);
      continue;
    }
    // Beside the coachroof (under it there is nothing to draw) or beside the cockpit well.
    const w0 = Math.min(sideDeckInnerHalfWidth(x0), b0);
    const w1 = Math.min(sideDeckInnerHalfWidth(x1), b1);
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

/**
 * Toerail (Phase 6): the low raised rim along the deck edge, covering the joint of hull and
 * deck. `toerailSection` rings at every hull station between its two ends, four faces between
 * neighbouring rings and a flat cap at each end, on both sides.
 */
function toerail(stations: number[]): THREE.BufferGeometry {
  const { fwdX, aftX } = boat.deckFittings.toerail;
  const xs = [...new Set([aftX, ...stations.filter((x) => x > aftX && x < fwdX), fwdX])].sort(
    (a, b) => a - b,
  );
  const positions: number[] = [];
  for (const side of [1, -1]) {
    const ring = (x: number): Vec3[] => toerailSection(x).map(([y, z]): Vec3 => [x, y, side * z]);
    // Quads wind counter-clockwise seen from outside on the starboard side; reversed for port.
    const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) =>
      side > 0 ? pushQuad(positions, a, b, c, d) : pushQuad(positions, d, c, b, a);
    for (let i = 0; i < xs.length - 1; i += 1) {
      const a = ring(xs[i] ?? 0);
      const b = ring(xs[i + 1] ?? 0);
      for (let k = 0; k < 4; k += 1) {
        const next = (k + 1) % 4;
        quad(a[k] as Vec3, a[next] as Vec3, b[next] as Vec3, b[k] as Vec3);
      }
    }
    const first = ring(xs[0] ?? 0);
    const last = ring(xs[xs.length - 1] ?? 0);
    quad(first[0] as Vec3, first[3] as Vec3, first[2] as Vec3, first[1] as Vec3);
    quad(last[0] as Vec3, last[1] as Vec3, last[2] as Vec3, last[3] as Vec3);
  }
  return triangles(positions);
}

/**
 * Coachroof (M60b): flares from the coaming's outer edge at the aft end to maxHalfWidth at the
 * mast (photo: the self-tacking track ends at its edges), rounded front corners, front face
 * sloping back to topFrontX. Non-slip top, smooth gelcoat sides. Its base sits a little below the
 * deck so no gap shows.
 */
function coachroof(materials: BoatMaterials): THREE.Object3D[] {
  const r = boat.deck.coachroof;
  const baseY = coachroofBaseY();
  // Port side from aft to front, then starboard from front to aft.
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
  // Roof top: the outline is no longer convex, so a strip of quads between each mirrored pair of
  // points (port at i, starboard at the mirror index), aft to front.
  const roof: number[] = [];
  const half = top.length / 2;
  for (let i = 0; i < half - 1; i += 1) {
    const [px0, pz0] = top[i] ?? [0, 0];
    const [px1, pz1] = top[i + 1] ?? [0, 0];
    const [sx0, sz0] = top[top.length - 1 - i] ?? [0, 0];
    const [sx1, sz1] = top[top.length - 2 - i] ?? [0, 0];
    pushQuad(roof, [px0, r.topY, pz0], [sx0, r.topY, sz0], [sx1, r.topY, sz1], [px1, r.topY, pz1]);
  }
  // The aft lip (M60c): the roof top on over the cockpit's front wall to the sprayhood's front.
  const lip = roofAftLip();
  const lipTop: number[] = [];
  pushQuad(
    lipTop,
    [lip.frontX, lip.topY, -lip.halfWidth],
    [lip.frontX, lip.topY, lip.halfWidth],
    [lip.aftX, lip.topY, lip.halfWidth],
    [lip.aftX, lip.topY, -lip.halfWidth],
  );
  const lipBody = boxAt(
    [(lip.frontX + lip.aftX) / 2, (lip.topY + lip.bottomY) / 2 - EPS, 0],
    [lip.frontX - lip.aftX, lip.topY - lip.bottomY - 2 * EPS, 2 * lip.halfWidth],
  );
  return [
    partMesh('part_coachroof', [triangles(roof), triangles(lipTop)], materials.deck),
    partMesh('part_coachroof', [triangles(sides), lipBody], materials.gelcoat),
  ];
}

/**
 * Cockpit well (sole and walls) and the side coamings that carry winches and clutches. The sole
 * is flat back to the transom (M34, owner on PR #81); the coamings end behind the winches, and
 * the rope tail boxes (`cockpitHardware.ts`) stand behind them.
 */
function cockpit(materials: BoatMaterials, detail: Detail): THREE.Object3D[] {
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
  // Side walls up to the coaming top. M61: aft of the rope box's front face the box itself is
  // the wall (it stands on the sole), so the wall stops there and the box's rounded edges show.
  for (const side of [1, -1] as const) {
    const bin = ropeBinBox(side);
    // In the gap between the box and the coaming's end the wall only reaches the deck: a wall up
    // to the coaming top there would stand as a flat plate with nothing on either side of it.
    const gapTop = (x: number) => sheerAt(x) + EPS;
    pushQuad(
      positions,
      [bin.frontX, c.soleY, side * w],
      [bin.bodyEndX, c.soleY, side * w],
      [bin.bodyEndX, gapTop(bin.bodyEndX), side * w],
      [bin.frontX, gapTop(bin.frontX), side * w],
    );
    pushQuad(
      positions,
      [bin.bodyEndX, c.soleY, side * w],
      [c.frontX, c.soleY, side * w],
      [c.frontX, c.coamingTopY, side * w],
      [bin.bodyEndX, c.coamingTopY, side * w],
    );
  }
  // Front wall up to the deck (the transom closes the well at the back).
  const front = sheerAt(c.frontX) + EPS;
  pushQuad(
    positions,
    [c.frontX, c.soleY, -w],
    [c.frontX, c.soleY, w],
    [c.frontX, front, w],
    [c.frontX, front, -w],
  );
  const sole = triangles(positions.splice(0, 18));
  const well = triangles(positions);

  const coamingWidth = boat.modelDetail.coamingWidth;
  const coamings = ([1, -1] as const).map((side) => {
    const endX = ropeBinBox(side).bodyEndX;
    const height = c.coamingTopY - (Math.min(sheerAt(c.frontX), sheerAt(endX)) - OVERLAP);
    // M61: at High the forward end is 2 radii longer, so its rounded end hides inside the
    // coachroof; the aft end stays at `endX` (the ropes drop down it into the gap, so nothing may
    // stick out there); the rounded bottom edges are below the deck.
    const radius = boat.modelDetail.edgeRadius.coamingM;
    const extra = detail === 'high' ? 2 * radius : 0;
    const centre: Vec3 = [
      (c.frontX + endX) / 2 + extra / 2,
      c.coamingTopY - height / 2,
      side * (w + coamingWidth / 2),
    ];
    return roundedBoxAt(centre, [c.frontX - endX + extra, height, coamingWidth], radius, detail);
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
