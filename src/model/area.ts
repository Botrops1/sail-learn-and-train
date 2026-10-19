import adriatic from '../../content/areas/adriatic.json';
import type { MarinaLayoutId } from './marina';
import type { PlaceId } from './places';
import type { SeabedType } from './seabed';
import type { SeaSetting } from './waves';

/** One place the boat can be put in (M42, PHASE7_SPEC 8.2): open water has a position, the others a sea. */
export interface PlaceData {
  id: PlaceId;
  eastM?: number;
  northM?: number;
  headingDeg?: number;
  /** The Waves setting the place sets when the boat goes there (checked with `isSeaSetting`). */
  sea?: SeaSetting;
}

/** The marina block of the area file (M42, PHASE7_SPEC 8.2). */
export interface MarinaData {
  quayFaceNorthM: number;
  quayWidthM: number;
  quayHeightM: number;
  westEndEastM: number;
  eastEndEastM: number;
  wallWidthM: number;
  pontoonWidthM: number;
  pontoonHeightM: number;
  depthM: number;
  berthsPerRow: number;
  ourBerth: number;
  sternGapM: number;
  berthZoneM: number;
  startInsetM: number;
  /** M44: how far south of the quay face the lazy line's weight lies, on the bottom, on each north-row berth's centre line. */
  lazyLineLengthM: number;
  /** M45: the marina's water as a rectangle (the depth `depthM` inside it). */
  basin: { west: number; east: number; south: number; north: number };
  /** M45: what the marina's bottom is made of. */
  seabed: SeabedType;
  layouts: Record<MarinaLayoutId, { berthWidthM: number; fairwayM: number }>;
  yachts: { lengthM: number; beamM: number }[];
  /** `busy` takes every berth; the others list the taken berth indices of each row. */
  traffic: { busy: 'all'; half: number[]; empty: number[] };
}

/** A round patch on the map: a hidden rock or a patch of sea grass (M45, PHASE7_SPEC 11.2). */
export interface BayRock {
  eastM: number;
  northM: number;
  radiusM: number;
  /** Depth over the top of the rock, metres. */
  topDepthM: number;
}

/** The bay block of the area file (M45, PHASE7_SPEC 11.2): depths, seabed, shore rings and buoys. */
export interface BayData {
  /** The land as a polygon (east, north); outside it is water. */
  coast: [number, number][];
  /** Rectangles that make up the land, for contact (each lies inside the coast). */
  landObstacles: { west: number; east: number; south: number; north: number }[];
  /** Depth gained per metre away from the coast. */
  slope: number;
  /** Height gained per metre inland. */
  landSlope: number;
  landMaxHeightM: number;
  rocks: BayRock[];
  weed: { eastM: number; northM: number; radiusM: number }[];
  /** Water this close to the coast is rock. */
  rockShoreM: number;
  rings: [number, number][];
  ringHeightM: number;
  buoys: [number, number][];
  buoyRingHeightM: number;
}

/** A sailing area's data (content/areas/<id>.json; PHASE3_SPEC 6.2, PHASE7_SPEC 8.2). */
export type AreaData = Omit<typeof adriatic, 'places' | 'marina' | 'bay'> & {
  places: PlaceData[];
  marina: MarinaData;
  bay: BayData;
};
export const AREAS: Readonly<Record<string, AreaData>> = {
  adriatic: adriatic as unknown as AreaData,
};
export const DEFAULT_AREA_ID = 'adriatic';
/** The area in use (the only one in Phase 3). */
export const area: AreaData = adriatic as unknown as AreaData;
