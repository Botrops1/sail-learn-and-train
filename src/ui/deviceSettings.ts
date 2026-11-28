/**
 * M56 (PHASE8_SPEC 14.3): what this device remembers (the folded time bar), read from and written
 * to `localStorage` in the stored format. Every access is in `try/catch`; a value that cannot be
 * read gives the default. M119: the column widths and the section layout of the old computer
 * layouts are gone; their keys are only removed (`OLD_DEVICE_KEYS`).
 */
import type { DeviceSettings } from '../app/setupFile';
import { FOLD_KEY } from './timeBar';

/** The keys the old column and section-layout settings were stored under (M39, M54). */
export const OLD_DEVICE_KEYS = ['sail-learn.columns', 'sail-learn.layout'] as const;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readDeviceSettings(): DeviceSettings {
  return { timeBarFolded: read(FOLD_KEY) === '1' };
}

export function writeDeviceSettings(device: DeviceSettings): void {
  try {
    window.localStorage.setItem(FOLD_KEY, device.timeBarFolded ? '1' : '0');
  } catch {
    // Private window or blocked storage: the device part is just not remembered.
  }
}

/** Removes the keys of the old settings, once at start. */
export function removeOldDeviceKeys(): void {
  try {
    for (const key of OLD_DEVICE_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Blocked storage: nothing to remove.
  }
}
