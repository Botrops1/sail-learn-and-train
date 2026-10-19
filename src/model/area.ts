import adriatic from '../../content/areas/adriatic.json';
import type { MarinaLayoutId } from './marina';
import type { PlaceId } from './places';
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
  layouts: Record<MarinaLayoutId, { berthWidthM: number; fairwayM: number }>;
  yachts: { lengthM: number; beamM: number }[];
  /** `busy` takes every berth; the others list the taken berth indices of each row. */
  traffic: { busy: 'all'; half: number[]; empty: number[] };
}

/** A sailing area's data (content/areas/<id>.json; PHASE3_SPEC 6.2, PHASE7_SPEC 8.2). */
export type AreaData = Omit<typeof adriatic, 'places' | 'marina'> & {
  places: PlaceData[];
  marina: MarinaData;
};
export const AREAS: Readonly<Record<string, AreaData>> = { adriatic: adriatic as AreaData };
export const DEFAULT_AREA_ID = 'adriatic';
/** The area in use (the only one in Phase 3). */
export const area: AreaData = adriatic as AreaData;
