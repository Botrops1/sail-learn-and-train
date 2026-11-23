import hanse508 from '../../content/boat/hanse508.json';
import dinghyJson from '../../content/boat/dinghy.json';
import { mergeBoat } from './boatMerge';
import type { DinghyData } from './dinghy';
import type { ControlId } from './controls';

/** What a boat can have (PHASE_DINGHY_SPEC 7.5): a missing feature hides its sections and parts. */
export type FeatureId =
  | 'jib'
  | 'mainFurling'
  | 'gennaker'
  | 'winches'
  | 'wheel'
  | 'engine'
  | 'autopilot'
  | 'anchor'
  | 'harbour'
  | 'cabin'
  | 'standingRigging'
  | 'toppingLift';

/** The boat data's shape (content/boat/hanse508.json). Units: metres and degrees. */
export type BoatData = typeof hanse508 & { dinghy?: DinghyData };

/** The built-in reference boat (content/boat/hanse508.json). */
export const HANSE_508: BoatData = hanse508;

export interface BuiltInBoat {
  id: string;
  name: string;
  data: BoatData;
}

const HANSE_508_ENTRY: BuiltInBoat = { id: 'hanse508', name: hanse508.meta.name, data: HANSE_508 };

/** The Training dinghy: an overlay on the Hanse 508's file (content/boat/dinghy.json). */
export const DINGHY: BuiltInBoat = {
  id: 'dinghy',
  name: dinghyJson.meta.name,
  data: mergeBoat(hanse508, dinghyJson),
};

/** The boats the app ships with: the Hanse 508, then the Training dinghy. */
export const BUILT_IN_BOATS: readonly BuiltInBoat[] = [HANSE_508_ENTRY, DINGHY];

export function builtInBoat(id: string): BuiltInBoat | undefined {
  return BUILT_IN_BOATS.find((b) => b.id === id);
}

/**
 * The boat in use: the Hanse 508 unless `useBoat()` ran before the app was loaded (PHASE8_SPEC
 * 15.3). Read it at call time, never copy it into a module constant.
 */
export let boat: BoatData = HANSE_508;
export let boatId: string = HANSE_508.meta.id;
export let boatName: string = HANSE_508.meta.name;

/** Whether the boat in use (or `data`) has a feature. Reads `boat` at call time. */
export function hasFeature(f: FeatureId, data: BoatData = boat): boolean {
  return data.features[f];
}

/** Whether the boat in use (or `data`) is the Training dinghy. */
export function isDinghy(data: BoatData = boat): boolean {
  return data.dinghy !== undefined;
}

/** Controls every boat has, whatever its ropes. */
const ALWAYS_CONTROLS: ReadonlySet<string> = new Set([
  'ctl_rudder',
  'ctl_wind_dir',
  'ctl_wind_speed',
]);

/** Whether the boat shows and links a control: the steering and wind, and each control a rope names. */
export function boatHasControl(id: ControlId, data: BoatData = boat): boolean {
  if (ALWAYS_CONTROLS.has(id)) return true;
  return data.ropes.list.some((rope) => rope.controlId === id);
}

/**
 * Puts another boat in place of the Hanse 508. Called once, before the app's modules are loaded
 * (`src/main.ts`), and by tests, which put the Hanse 508 back when they are done.
 */
export function useBoat(id: string, name: string, data: BoatData): void {
  boat = data;
  boatId = id;
  boatName = name;
}
