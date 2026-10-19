import { area, type AreaData } from './area';
import { isSeaSetting, type SeaSetting } from './waves';
import { marinaGeometry } from './marina';
import type { HarbourState } from './harbour';

/**
 * Places the boat can be put in (M42, PHASE7_SPEC 8.3): open water near the practice buoys, the
 * marina (and, from M45, the bay). Pure.
 */
export type PlaceId = 'open' | 'marina'; // M45 adds 'bay'

export const PLACE_IDS: readonly PlaceId[] = ['open', 'marina'];

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
  const open = areaData.places.find((place) => place.id === 'open');
  return {
    eastM: open?.eastM ?? 0,
    northM: open?.northM ?? 0,
    headingDeg: open?.headingDeg ?? 0,
    sea: null,
  };
}
