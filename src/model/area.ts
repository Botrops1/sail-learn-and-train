import adriatic from '../../content/areas/adriatic.json';

/** A sailing area's data (content/areas/<id>.json; PHASE3_SPEC 6.2). */
export type AreaData = typeof adriatic;
export const AREAS: Readonly<Record<string, AreaData>> = { adriatic };
export const DEFAULT_AREA_ID = 'adriatic';
/** The area in use (the only one in Phase 3). */
export const area: AreaData = adriatic;
