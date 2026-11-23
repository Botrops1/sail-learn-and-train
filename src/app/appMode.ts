import { hasFeature, type BoatData } from '../model/boat';
import { exercisesForBoat } from '../model/exercises';

/**
 * The app's mode (PHASE5_SPEC 4.1): which sections of the panel come first and which start open.
 * `learn`, `harbour` (M41, PHASE7_SPEC 4.4) and `exercise` (M66) are modes of their own that keep the ropes mode;
 * `easy` and `realistic` are the ropes modes (`settings.ropesMode`), so the invariant is:
 * `appMode` is `learn`, `harbour` or `exercise`, or equals `settings.ropesMode`.
 */
export const APP_MODES = ['learn', 'easy', 'realistic', 'harbour', 'exercise'] as const;
export type AppMode = (typeof APP_MODES)[number];

/** Learn, Harbour and Exercises keep the ropes mode as it is (PHASE10_SPEC 4.1). */
export function keepsRopesMode(mode: AppMode): mode is 'learn' | 'harbour' | 'exercise' {
  return mode === 'learn' || mode === 'harbour' || mode === 'exercise';
}

export function isAppMode(value: string): value is AppMode {
  return (APP_MODES as readonly string[]).includes(value);
}

/**
 * M113 (PHASE_DINGHY_SPEC 7.4): the modes a boat offers. All five, minus Realistic without winches,
 * minus Harbour without a harbour, minus Exercises when no exercise is written for the boat.
 */
export function modesForBoat(data: BoatData, id: string): AppMode[] {
  return APP_MODES.filter((mode) => {
    if (mode === 'realistic') return hasFeature('winches', data);
    if (mode === 'harbour') return hasFeature('harbour', data);
    if (mode === 'exercise') return exercisesForBoat(id).length > 0;
    return true;
  });
}
