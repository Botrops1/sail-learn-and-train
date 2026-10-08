import { boat, type BoatData } from './boat';

/**
 * Control values (PHASE1_SPEC 7.1): the targets the user sets. Pure data.
 * Rope controls run 0..100: 0 = fully hauled in (or furled), 100 = fully eased (or unfurled).
 * Ids, ranges and defaults come from hanse508.json → controls.list.
 */
export const CONTROL_IDS = [
  'ctl_mainsheet',
  'ctl_jib_sheet',
  'ctl_vang',
  'ctl_topping_lift',
  'ctl_main_furl',
  'ctl_jib_furl',
  'ctl_rudder',
  'ctl_wind_dir',
  'ctl_wind_speed',
] as const;
export type ControlId = (typeof CONTROL_IDS)[number];

export type Controls = Record<ControlId, number>;

export interface ControlSpec {
  id: ControlId;
  label: string;
  boatLabel?: string;
  unit: string;
  min: number;
  max: number;
  default: number;
}

export function controlSpec(id: ControlId, data: BoatData = boat): ControlSpec {
  const entry = data.controls.list.find((control) => control.id === id);
  if (!entry) throw new Error(`Control ${id} is missing from hanse508.json → controls.list.`);
  return { ...entry, id };
}

export function isControlId(value: string): value is ControlId {
  return (CONTROL_IDS as readonly string[]).includes(value);
}

export function defaultControls(data: BoatData = boat): Controls {
  const controls = {} as Controls;
  for (const id of CONTROL_IDS) controls[id] = controlSpec(id, data).default;
  return controls;
}

/**
 * Wraps a wind direction into (−180, 180]: 0 = from dead ahead, +90 = from the starboard beam,
 * 180 = from dead astern (PHASE1_SPEC 4).
 */
export function normalizeWindFrom(degrees: number): number {
  let a = degrees % 360;
  if (a <= -180) a += 360;
  if (a > 180) a -= 360;
  return a === 0 ? 0 : a;
}

/** Brings a value into the control's range (the wind direction wraps around instead). */
export function clampControl(id: ControlId, value: number, data: BoatData = boat): number {
  if (id === 'ctl_wind_dir') return normalizeWindFrom(value);
  const spec = controlSpec(id, data);
  return Math.min(spec.max, Math.max(spec.min, value));
}

/** Rounds to the nearest multiple of the step (PHASE1_SPEC 7.1), then clamps or wraps. */
export function snapControl(id: ControlId, value: number, step: number): number {
  const snapped = step > 0 ? Math.round(value / step) * step : value;
  return clampControl(id, snapped);
}
