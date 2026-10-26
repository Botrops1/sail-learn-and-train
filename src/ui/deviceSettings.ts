/**
 * M56 (PHASE8_SPEC 14.3): what this device remembers (column widths and folds, the folded time
 * bar, the section layout), read from and written to `localStorage` in the stored formats. Every
 * access is in `try/catch`; a value that cannot be read gives the default.
 */
import type { DeviceSettings } from '../app/setupFile';
import { COLUMNS_KEY, parseColumns, serializeColumns } from './columnWidths';
import { completeLayout, LAYOUT_KEY, parseLayout, serializeLayout } from './sectionLayout';
import { FOLD_KEY } from './timeBar';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readDeviceSettings(): DeviceSettings {
  const rawLayout = parseLayout(read(LAYOUT_KEY));
  return {
    columns: parseColumns(read(COLUMNS_KEY)),
    timeBarFolded: read(FOLD_KEY) === '1',
    layout: rawLayout === null ? null : completeLayout(rawLayout),
  };
}

/** `layout: null` removes the saved layout, so a computer goes back to the default arrangement. */
export function writeDeviceSettings(device: DeviceSettings): void {
  try {
    window.localStorage.setItem(COLUMNS_KEY, serializeColumns(device.columns));
    window.localStorage.setItem(FOLD_KEY, device.timeBarFolded ? '1' : '0');
    if (device.layout === null) window.localStorage.removeItem(LAYOUT_KEY);
    else window.localStorage.setItem(LAYOUT_KEY, serializeLayout(device.layout));
  } catch {
    // Private window or blocked storage: the device part is just not remembered.
  }
}
