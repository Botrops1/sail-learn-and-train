import { area, type AreaData } from './area';
import { isSeaSetting, type SeaSetting } from './waves';
import { boat, type BoatData } from './boat';
import { distanceToRect, marinaBounds, marinaGeometry, type MarinaGeometry } from './marina';
import type { HarbourState } from './harbour';

/**
 * Places the boat can be put in (M42, M45, PHASE7_SPEC 8.3, 11.3): open water near the practice
 * buoys, the marina and the bay. Pure.
 */
export type PlaceId = 'open' | 'marina' | 'bay';

export const PLACE_IDS: readonly PlaceId[] = ['open', 'marina', 'bay'];

export function isPlace(value: string): value is PlaceId {
  return (PLACE_IDS as readonly string[]).includes(value);
}

export interface PlaceStart {
  eastM: number;
  northM: number;
  headingDeg: number;
  /** The Waves setting the place sets, or null when the sea is left as it is. */
  sea: SeaSetting | null;
}

/** Where the boat starts in the place of `h`, and the sea the place sets. */
export function placeStart(h: HarbourState, areaData: AreaData = area): PlaceStart {
  if (h.place === 'marina') {
    const { fairway } = marinaGeometry(h.layout, h.traffic, areaData);
    const entry = areaData.places.find((place) => place.id === 'marina');
    const sea = entry?.sea;
    return {
      eastM: areaData.marina.westEndEastM + areaData.marina.startInsetM,
      northM: (fairway.north + fairway.south) / 2,
      headingDeg: 90,
      sea: sea !== undefined && isSeaSetting(sea) ? sea : null,
    };
  }
  if (h.place === 'bay') {
    const entry = areaData.places.find((place) => place.id === 'bay');
    const sea = entry?.sea;
    return {
      eastM: entry?.eastM ?? 0,
      northM: entry?.northM ?? 0,
      headingDeg: entry?.headingDeg ?? 0,
      sea: sea !== undefined && isSeaSetting(sea) ? sea : null,
    };
  }
  const open = areaData.places.find((place) => place.id === 'open');
  return {
    eastM: open?.eastM ?? 0,
    northM: open?.northM ?? 0,
    headingDeg: open?.headingDeg ?? 0,
    sea: null,
  };
}

/**
 * Which solid surroundings act on the boat this frame (PHASE10_SPEC 15.3): the place's own, and
 * the marina or the bay when the boat is near them from any place.
 */
export function solidAround(
  place: PlaceId,
  eastM: number,
  northM: number,
  geometry: MarinaGeometry,
  areaData: AreaData = area,
  data: BoatData = boat,
): { marina: boolean; bay: boolean } {
  const nearM = data.physics.contact.nearM;
  const coastEast = Math.max(...areaData.bay.coast.map((p) => p[0]));
  return {
    marina: place === 'marina' || distanceToRect(marinaBounds(geometry), eastM, northM) <= nearM,
    bay: place === 'bay' || eastM <= coastEast + nearM,
  };
}
