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

/**
 * How the Ropes tab works the ropes. `easy`: each rope is a slider (M4a). A later `realistic`
 * mode (clutches and winches worked by hand, M4b) is added to this list.
 */
export const ROPES_MODES = ['easy'] as const;
export type RopesMode = (typeof ROPES_MODES)[number];

/**
 * Render detail (M3b): `high` = soft shadows, reflections, finer shapes; `low` = cheaper
 * lighting and shapes for phones. Stored in the URL like the step size.
 */
export const DETAIL_LEVELS = ['high', 'low'] as const;
export type Detail = (typeof DETAIL_LEVELS)[number];

/** Screens whose shorter side is below this (CSS px) count as phones: they start at low detail. */
export const PHONE_SCREEN_SHORT_SIDE_PX = 600;

/** The starting detail when the URL does not say: high on desktops and tablets, low on phones. */
export function defaultDetail(screenWidth: number, screenHeight: number): Detail {
  return Math.min(screenWidth, screenHeight) < PHONE_SCREEN_SHORT_SIDE_PX ? 'low' : 'high';
}

export function isDetail(value: string): value is Detail {
  return (DETAIL_LEVELS as readonly string[]).includes(value);
}

export interface Settings {
  step: StepSize;
  debug: boolean;
  ropesMode: RopesMode;
  /** Rope colour legend shown in the Ropes tab (PHASE1_SPEC 5.2, 7.3). */
  legend: boolean;
  detail: Detail;
}

export interface CameraState {
  preset: CameraPreset;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  step: 5,
  debug: false,
  detail: 'high',
  ropesMode: 'easy',
  legend: true,
};
export const DEFAULT_CAMERA: Readonly<CameraState> = { preset: 'side-port' };

export function isCameraPreset(value: string): value is CameraPreset {
  return (CAMERA_PRESETS as readonly string[]).includes(value);
}

export function isStepSize(value: number): value is StepSize {
  return (STEP_SIZES as readonly number[]).includes(value);
}

export function isRopesMode(value: string): value is RopesMode {
  return (ROPES_MODES as readonly string[]).includes(value);
}
