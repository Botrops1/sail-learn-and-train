import hanse508 from '../../content/boat/hanse508.json';

/** The boat data's shape (content/boat/hanse508.json). Units: metres and degrees. */
export type BoatData = typeof hanse508;

/** The built-in reference boat (content/boat/hanse508.json). */
export const HANSE_508: BoatData = hanse508;

/**
 * The boat in use: the Hanse 508 unless `useBoat()` ran before the app was loaded (PHASE8_SPEC
 * 15.3). Read it at call time, never copy it into a module constant.
 */
export let boat: BoatData = HANSE_508;
export let boatId: string = HANSE_508.meta.id;
export let boatName: string = HANSE_508.meta.name;

/**
 * Puts another boat in place of the Hanse 508. Called once, before the app's modules are loaded
 * (`src/main.ts`), and by tests, which put the Hanse 508 back when they are done.
 */
export function useBoat(id: string, name: string, data: BoatData): void {
  boat = data;
  boatId = id;
  boatName = name;
}
