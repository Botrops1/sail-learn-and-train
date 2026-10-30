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
