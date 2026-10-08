/**
 * App settings and camera state that live in the store and the URL.
 * Pure data: no DOM, no three.js (PHASE1_SPEC 9.1).
 */

/**
 * Camera presets from PHASE1_SPEC 6.2. Only the preset is stored (in the store and the URL);
 * `free` means the user has moved the camera by hand. The free position itself is not stored.
 */
export const CAMERA_PRESETS = [
  'side-port',
  'side-starboard',
  'top',
  'bow',
  'helm',
  'free',
] as const;
export type CameraPreset = (typeof CAMERA_PRESETS)[number];

/** Global control step in percent (PHASE1_SPEC 7.1). */
export const STEP_SIZES = [1, 5] as const;
export type StepSize = (typeof STEP_SIZES)[number];

export interface Settings {
  step: StepSize;
  debug: boolean;
}

export interface CameraState {
  preset: CameraPreset;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { step: 5, debug: false };
export const DEFAULT_CAMERA: Readonly<CameraState> = { preset: 'side-port' };

export function isCameraPreset(value: string): value is CameraPreset {
  return (CAMERA_PRESETS as readonly string[]).includes(value);
}

export function isStepSize(value: number): value is StepSize {
  return (STEP_SIZES as readonly number[]).includes(value);
}
