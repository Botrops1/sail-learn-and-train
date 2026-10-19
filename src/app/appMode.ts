/**
 * The app's mode (PHASE5_SPEC 4.1): which sections of the panel come first and which start open.
 * `learn` and `harbour` (M41, PHASE7_SPEC 4.4) are modes of their own that keep the ropes mode;
 * `easy` and `realistic` are the ropes modes (`settings.ropesMode`), so the invariant is:
 * `appMode` is `learn` or `harbour`, or equals `settings.ropesMode`.
 */
export const APP_MODES = ['learn', 'easy', 'realistic', 'harbour'] as const;
export type AppMode = (typeof APP_MODES)[number];

export function isAppMode(value: string): value is AppMode {
  return (APP_MODES as readonly string[]).includes(value);
}
