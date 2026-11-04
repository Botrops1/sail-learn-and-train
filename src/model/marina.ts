import { area, type AreaData } from './area';
import { boat as hanse508, type BoatData } from './boat';
import type { Obstacle } from './contact';
import type { ContactHit } from './lowSpeed';
import { boatToMap } from './mapFrame';
import type { BoatState } from './motion';

/**
 * The marina as numbers (M42, PHASE7_SPEC 8.3): the quay, the pontoon, the fairway between the
 * two rows of berths, the rings on the quay and the moored yachts, from the area file. Every
 * point is in the map frame (metres east and north of the start). Pure.
 */
export type MarinaLayoutId = 'tight' | 'medium' | 'spacious';
export type TrafficId = 'busy' | 'half' | 'empty';

export const MARINA_LAYOUT_IDS: readonly MarinaLayoutId[] = ['tight', 'medium', 'spacious'];
export const TRAFFIC_IDS: readonly TrafficId[] = ['busy', 'half', 'empty'];

export function isMarinaLayout(value: string): value is MarinaLayoutId {
  return (MARINA_LAYOUT_IDS as readonly string[]).includes(value);
}

export function isTraffic(value: string): value is TrafficId {
  return (TRAFFIC_IDS as readonly string[]).includes(value);
}

/** A rectangle on the map, metres. */
export type Rect = { west: number; east: number; south: number; north: number };

export interface Berth {
  row: 'north' | 'south';
  index: number;
  centreEastM: number;
  /** North of the stern end of the berth: the quay face (less the gap) in the north row. */
  sternNorthM: number;
  /** Where the bow of a boat in the berth points: 180 in the north row, 0 in the south row. */
  headingDeg: number;
  widthM: number;
}

export interface MooredYacht {
  id: string;
  berth: Berth;
  lengthM: number;
  beamM: number;
  /** The hull as a closed polygon in map metres (east, north); the last point joins the first. */
  outline: [number, number][];
}

export interface MarinaGeometry {
  quay: Rect;
  pontoon: Rect;
  wall: Rect;
  /** The water between the rows' bow ends. */
  fairway: Rect;
  /** Both rows, north row first. */
  berths: Berth[];
  ourBerth: Berth;
  /** Quay rings (east, north): at every berth edge of the north row, on the quay face. */
  rings: [number, number][];
  /** M44: the two rings at the edges of our berth, on the quay face (east, north). */
  ourRings: { west: [number, number]; east: [number, number] };
  /** M44: the lazy line's weight on the bottom ahead of our berth: east, north, height (negative = depth). */
  ourSinker: [number, number, number];
  yachts: MooredYacht[];
  /** PHASE10_SPEC 15.3: the rock breakwater round the marina: a south mole, a west arm and the north mole. */
  breakwater: { south: Rect; west: Rect; north: Rect };
  /** The gap between the west arm's tip and the north mole; it faces west. */
  entrance: { eastM: number; southM: number; northM: number };
  /** The lights on the two heads: red on the north mole (port hand coming in from the sea), green on the arm. */
  lights: { red: [number, number]; green: [number, number] };
  /** The paved land behind the quay. */
  land: Rect;
  buildings: { eastM: number; northM: number; widthM: number; depthM: number; heightM: number }[];
}

/** A moored yacht's outline in its own frame (x from the stern centre towards the bow, z to its starboard). */
export function yachtOutline(lengthM: number, beamM: number): [number, number][] {
  const L = lengthM;
  const B = beamM;
  return [
    [0, -0.45 * B],
    [0.45 * L, -0.5 * B],
    [0.8 * L, -0.3 * B],
    [L, 0],
    [0.8 * L, 0.3 * B],
    [0.45 * L, 0.5 * B],
    [0, 0.45 * B],
  ];
}

const cache = new WeakMap<AreaData, Map<string, MarinaGeometry>>();

/** The marina for a layout and a traffic level. The result is shared: do not change it. */
export function marinaGeometry(
  layout: MarinaLayoutId,
  traffic: TrafficId,
  areaData: AreaData = area,
): MarinaGeometry {
  let byKey = cache.get(areaData);
  if (!byKey) cache.set(areaData, (byKey = new Map()));
  const key = `${layout}/${traffic}`;
  const found = byKey.get(key);
  if (found) return found;
  const built = buildMarina(layout, traffic, areaData);
  byKey.set(key, built);
  return built;
}

function buildMarina(
  layout: MarinaLayoutId,
  traffic: TrafficId,
  areaData: AreaData,
): MarinaGeometry {
  const m = areaData.marina;
  const F = m.quayFaceNorthM;
  const g = m.sternGapM;
  const Z = m.berthZoneM;
  const n = m.berthsPerRow;
  const { berthWidthM: w, fairwayM: f } = m.layouts[layout];
  const centreX = (i: number) => (i - (n - 1) / 2) * w;

  const northSternM = F - g;
  const southSternM = F - g - 2 * Z - f;
  const berths: Berth[] = [];
  for (const [row, sternNorthM, headingDeg] of [
    ['north', northSternM, 180],
    ['south', southSternM, 0],
  ] as const) {
    for (let i = 0; i < n; i += 1) {
      berths.push({ row, index: i, centreEastM: centreX(i), sternNorthM, headingDeg, widthM: w });
    }
  }
  const ourBerth = berths[m.ourBerth] as Berth;

  const pontoonNorth = F - 2 * g - 2 * Z - f;
  const pontoon: Rect = {
    west: m.westEndEastM,
    east: m.eastEndEastM,
    south: pontoonNorth - m.pontoonWidthM,
    north: pontoonNorth,
  };
  const quay: Rect = {
    west: m.westEndEastM,
    east: m.eastEndEastM + m.wallWidthM,
    south: F,
    north: F + m.quayWidthM,
  };
  const wall: Rect = {
    west: m.eastEndEastM,
    east: m.eastEndEastM + m.wallWidthM,
    south: pontoon.south,
    north: F,
  };
  const fairway: Rect = {
    west: m.westEndEastM,
    east: m.eastEndEastM,
    south: F - g - Z - f,
    north: F - g - Z,
  };

  const rings: [number, number][] = [];
  for (let i = 0; i < n; i += 1) rings.push([centreX(i) - w / 2, F]);
  rings.push([centreX(n - 1) + w / 2, F]);

  const taken = (index: number): boolean =>
    m.traffic[traffic] === 'all' || (m.traffic[traffic] as number[]).includes(index);
  const yachts: MooredYacht[] = [];
  for (const berth of berths) {
    if (!taken(berth.index)) continue;
    if (berth.row === 'north' && berth.index === m.ourBerth) continue;
    const rowNumber = berth.row === 'north' ? 0 : 1;
    const type = m.yachts[(berth.index + rowNumber) % m.yachts.length];
    if (!type) continue;
    const outline = yachtOutline(type.lengthM, type.beamM).map(([x, z]): [number, number] => {
      const [east, north] = boatToMap(x, z, berth.headingDeg);
      return [berth.centreEastM + east, berth.sternNorthM + north];
    });
    yachts.push({
      id: `yacht-${rowNumber}-${berth.index}`,
      berth,
      lengthM: type.lengthM,
      beamM: type.beamM,
      outline,
    });
  }

  const ourRings = {
    west: [ourBerth.centreEastM - w / 2, F] as [number, number],
    east: [ourBerth.centreEastM + w / 2, F] as [number, number],
  };
  const ourSinker: [number, number, number] = [
    ourBerth.centreEastM,
    F - m.lazyLineLengthM,
    -m.depthM,
  ];

  const b = m.breakwater;
  const southMole: Rect = {
    west: b.westM,
    east: m.eastEndEastM + m.wallWidthM,
    south: pontoon.south - b.moleWidthM,
    north: pontoon.south,
  };
  const breakwater = {
    south: southMole,
    west: {
      west: b.westM,
      east: b.westM + b.moleWidthM,
      south: southMole.south,
      north: fairway.south,
    },
    north: { west: b.westM, east: m.westEndEastM, south: F, north: F + m.quayWidthM },
  };
  const entrance = { eastM: b.westM, southM: fairway.south, northM: F };
  const lights: MarinaGeometry['lights'] = {
    red: [b.westM + b.lightInsetM, F + b.lightInsetM],
    green: [b.westM + b.moleWidthM / 2, fairway.south - b.lightInsetM],
  };
  const land: Rect = {
    west: b.westM,
    east: m.eastEndEastM + m.wallWidthM,
    south: F + m.quayWidthM,
    north: F + m.quayWidthM + b.landDepthM,
  };
  const buildings = m.buildings.map(([eastM, northM, widthM, depthM, heightM]) => ({
    eastM,
    northM,
    widthM,
    depthM,
    heightM,
  }));

  return {
    quay,
    pontoon,
    wall,
    fairway,
    berths,
    ourBerth,
    rings,
    ourRings,
    ourSinker,
    yachts,
    breakwater,
    entrance,
    lights,
    land,
    buildings,
  };
}

/** The rectangle round the quay, the wall, the pontoon and the breakwater: what the scene tests for "near". */
export function marinaBounds(geometry: MarinaGeometry): Rect {
  const { south, west, north } = geometry.breakwater;
  const parts = [geometry.quay, geometry.wall, geometry.pontoon, south, west, north];
  return {
    west: Math.min(...parts.map((r) => r.west)),
    east: Math.max(...parts.map((r) => r.east)),
    south: Math.min(...parts.map((r) => r.south)),
    north: Math.max(...parts.map((r) => r.north)),
  };
}

/** Distance from a map point to a rectangle, metres (0 inside it). */
export function distanceToRect(rect: Rect, eastM: number, northM: number): number {
  const dx = Math.max(rect.west - eastM, 0, eastM - rect.east);
  const dy = Math.max(rect.south - northM, 0, northM - rect.north);
  return Math.hypot(dx, dy);
}

export function insideRect(rect: Rect, eastM: number, northM: number): boolean {
  return eastM >= rect.west && eastM <= rect.east && northM >= rect.south && northM <= rect.north;
}

/** True if a map point is inside a polygon (even-odd rule). */
export function insidePolygon(polygon: readonly [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] as [number, number];
    const [xj, yj] = polygon[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const obstacleCache = new WeakMap<MarinaGeometry, Obstacle[]>();

export function rectPolygon(r: Rect): [number, number][] {
  return [
    [r.west, r.south],
    [r.east, r.south],
    [r.east, r.north],
    [r.west, r.north],
  ];
}

/** Counter-clockwise: a polygon with a negative signed area is reversed. */
function counterClockwise(polygon: [number, number][]): [number, number][] {
  let area2 = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] as [number, number];
    const [xj, yj] = polygon[j] as [number, number];
    area2 += xj * yi - xi * yj;
  }
  return area2 < 0 ? [...polygon].reverse() : polygon;
}

/**
 * What the hull can bump into in the marina (M43): the quay, the wall (both `env_quay`), the
 * pontoon and every moored yacht. The same list for the same geometry, so contact can cache.
 */
export function marinaObstacles(geometry: MarinaGeometry): Obstacle[] {
  const found = obstacleCache.get(geometry);
  if (found) return found;
  const built: Obstacle[] = [
    { id: 'quay', partId: 'env_quay', polygon: rectPolygon(geometry.quay) },
    { id: 'wall', partId: 'env_quay', polygon: rectPolygon(geometry.wall) },
    { id: 'pontoon', partId: 'env_quay', polygon: rectPolygon(geometry.pontoon) },
    {
      id: 'breakwater-south',
      partId: 'env_breakwater',
      polygon: rectPolygon(geometry.breakwater.south),
    },
    {
      id: 'breakwater-west',
      partId: 'env_breakwater',
      polygon: rectPolygon(geometry.breakwater.west),
    },
    {
      id: 'breakwater-north',
      partId: 'env_breakwater',
      polygon: rectPolygon(geometry.breakwater.north),
    },
    ...geometry.yachts.map((yacht): Obstacle => ({
      id: yacht.id,
      partId: 'env_moored_yacht',
      polygon: counterClockwise(yacht.outline),
    })),
  ];
  obstacleCache.set(geometry, built);
  return built;
}

/** A moored yacht's bow line (PHASE10_SPEC 17.4): from her bow straight ahead and down. */
export interface BowLine {
  /** The yacht's id with `yacht` replaced by `lazy-line`: `lazy-line-0-11`. */
  id: string;
  bowEastM: number;
  bowNorthM: number;
  /** The yacht's heading (her berth's `headingDeg`): the line runs this way from her bow. */
  headingDeg: number;
}

const bowLineCache = new WeakMap<MarinaGeometry, BowLine[]>();

/** One per moored yacht, in `geometry.yachts` order; the same array for the same geometry. */
export function bowLines(geometry: MarinaGeometry): BowLine[] {
  const found = bowLineCache.get(geometry);
  if (found) return found;
  const built = geometry.yachts.map((yacht): BowLine => {
    const h = (yacht.berth.headingDeg * Math.PI) / 180;
    return {
      id: yacht.id.replace('yacht', 'lazy-line'),
      bowEastM: yacht.berth.centreEastM + yacht.lengthM * Math.sin(h),
      bowNorthM: yacht.berth.sternNorthM + yacht.lengthM * Math.cos(h),
      headingDeg: yacht.berth.headingDeg,
    };
  });
  bowLineCache.set(geometry, built);
  return built;
}

export type BowLinePart = 'saildrive' | 'keel' | 'rudder';
export interface BowLineCatch {
  lineId: string;
  part: BowLinePart;
}

/** Shared empty result. */
export const NO_CATCHES: readonly BowLineCatch[] = [];

/** The parts of our hull over a bow line where it is not deeper than they are. */
export function bowLinesUnder(
  boat: BoatState,
  lines: readonly BowLine[],
  areaData: AreaData = area,
  data: BoatData = hanse508,
): readonly BowLineCatch[] {
  const { deckAboveM, slope, catchM } = areaData.marina.bowLine;
  const hull = data.hull;
  const points: { part: BowLinePart; x: number; depthM: number }[] = [
    { part: 'saildrive', x: hull.saildrive.x, depthM: -hull.saildrive.bottomY },
    { part: 'keel', x: hull.keel.bulb.fwdX, depthM: -hull.keel.bulb.bottomY },
    { part: 'keel', x: hull.keel.bulb.aftX, depthM: -hull.keel.bulb.bottomY },
    { part: 'rudder', x: hull.rudder.stockX, depthM: -hull.rudder.bottomY },
  ];
  const mapPoints = points.map((p) => {
    const [de, dn] = boatToMap(p.x, 0, boat.headingDeg);
    return { ...p, east: boat.eastM + de, north: boat.northM + dn };
  });
  const found: BowLineCatch[] = [];
  for (const line of lines) {
    const H = (line.headingDeg * Math.PI) / 180;
    const fe = Math.sin(H);
    const fn = Math.cos(H);
    const parts = new Set<BowLinePart>();
    for (const p of mapPoints) {
      const de = p.east - line.bowEastM;
      const dn = p.north - line.bowNorthM;
      const along = de * fe + dn * fn;
      const side = Math.abs(de * fn - dn * fe);
      const reach = (p.depthM + deckAboveM) / slope;
      if (along >= 0 && along <= reach && side <= catchM) parts.add(p.part);
    }
    for (const part of ['saildrive', 'keel', 'rudder'] as const) {
      if (parts.has(part)) found.push({ lineId: line.id, part });
    }
  }
  return found.length === 0 ? NO_CATCHES : found;
}

/** The keel's and the rudder's catches as contact hits (the saildrive's make none). */
export function bowLineHits(catches: readonly BowLineCatch[]): ContactHit[] {
  const hits: ContactHit[] = [];
  for (const c of catches) {
    if (c.part === 'saildrive') continue;
    const part = c.part === 'keel' ? 'keel' : 'stern';
    hits.push({
      key: `${c.lineId}:${part}`,
      obstacleId: c.lineId,
      partId: 'rope_lazy_line',
      part,
      approachMps: 0,
      fender: false,
    });
  }
  return hits;
}
