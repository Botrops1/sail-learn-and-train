/**
 * App settings and camera state that live in the store and the URL.
 * Pure data: no DOM, no three.js (PHASE1_SPEC 9.1).
 */

/**
 * Camera presets from PHASE1_SPEC 6.2. Only the preset is stored (in the store and the URL);
 * `free` means the user has moved the camera by hand. The free position itself is not stored.
 * `map` (M7, PHASE2_SPEC 7.4) is not a 3D view: it shows the bird's-eye map instead of the
 * 3D scene and leaves the 3D camera where it was.
 */
export const CAMERA_PRESETS = [
  'side-port',
  'side-starboard',
  'top',
  'bow',
  'helm',
  'free',
  'map',
] as const;
export type CameraPreset = (typeof CAMERA_PRESETS)[number];

/** Global control step in percent (PHASE1_SPEC 7.1). */
export const STEP_SIZES = [1, 5] as const;
export type StepSize = (typeof STEP_SIZES)[number];

/**
 * How the Ropes tab works the ropes. `easy`: each rope is a slider (M4a). `realistic`: clutches,
 * winches and hands, one station at a time (M4b, PHASE1_SPEC 7.2.2).
 */
export const ROPES_MODES = ['easy', 'realistic'] as const;
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
  /** Names shown over the parts and ropes in the 3D view (Settings, M5). */
  labels: boolean;
  detail: Detail;
  /**
   * Time scale (M10, PHASE2_SPEC 10.2, issue #25): ¼ … 16, one of `windModes.timeScales`. Not
   * about the hands: only the world. Always 1 where the time bar has no speed part.
   */
  timeScale: number;
  /** The time bar's speed part over the 3D view (Settings); off = only the Pause button. */
  timeBar: boolean;
  /** The clock chip over the 3D view (Settings, M17). */
  clock: boolean;
  /**
   * The language of the whole app (a folder of content/lang; M23, PHASE4_SPEC 4.1). Changing it
   * reloads the page. In the link as `lang` when not 'en'.
   */
  language: string;
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
  /** On by default (owner, PR #19). */
  labels: true,
  timeScale: 1,
  timeBar: true,
  clock: true,
  language: 'en',
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
