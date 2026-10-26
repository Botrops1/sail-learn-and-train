/**
 * M56 (issue #111; PHASE8_SPEC 14): the setup file, as pure helpers. The file holds the link (the
 * boat, the wind, the place, every setting, the language) and what this device remembers (column
 * widths and folds, the folded time bar, the section layout). Nothing here touches `window` or
 * storage; `ui/deviceSettings.ts` does that.
 */
import { parseColumns, serializeColumns, type ColumnState } from '../ui/columnWidths';
import { HANSE_508 } from '../model/boat';
import { checkBoatProfile, type BoatProfile } from '../model/boatProfile';
import { linkBoatId } from './boatStore';
import {
  completeLayout,
  parseLayout,
  serializeLayout,
  type SectionLayout,
} from '../ui/sectionLayout';

export const SETUP_VERSION = 1;

/** The longest link a file may carry, characters. */
export const SETUP_LINK_MAX = 8000;

/** What this device remembers, in memory. */
export interface DeviceSettings {
  columns: ColumnState;
  timeBarFolded: boolean;
  layout: SectionLayout | null;
}

/** As written in the file (PHASE8_SPEC 14.2): the stored shapes. */
export interface SetupFile {
  app: 'sail-learn-and-train';
  kind: 'setup';
  version: number;
  savedAt: string;
  link: string;
  device: { columns: unknown; timeBarFolded: boolean; layout: unknown };
  /** M58: the imported boat in use (not the Hanse 508), so the file carries it to another device. */
  boatProfile?: BoatProfile;
}

export type SetupProblem = 'notJson' | 'notSetup' | 'newer' | 'badLink' | 'badBoat';

export function makeSetupFile(
  link: string,
  device: DeviceSettings,
  savedAtIso: string,
  boatProfile?: BoatProfile,
): SetupFile {
  return {
    app: 'sail-learn-and-train',
    kind: 'setup',
    version: SETUP_VERSION,
    savedAt: savedAtIso,
    link,
    device: {
      columns: JSON.parse(serializeColumns(device.columns)),
      timeBarFolded: device.timeBarFolded,
      layout: device.layout === null ? null : JSON.parse(serializeLayout(device.layout)),
    },
    ...(boatProfile ? { boatProfile } : {}),
  };
}

/** `sail-setup-YYYY-MM-DD.json`, with the device's local date. */
export function setupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `sail-setup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/**
 * Checks a file's text and returns the link and the device settings in memory. The device part
 * is cleaned with `parseColumns` / `parseLayout`: bad or missing parts become the defaults, never
 * an error (a file from outside is never trusted).
 */
export function readSetupFile(
  text: string,
):
  | { ok: true; link: string; device: DeviceSettings; boatProfile?: BoatProfile }
  | { ok: false; problem: SetupProblem } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'notJson' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, problem: 'notSetup' };
  }
  const file = data as Record<string, unknown>;
  if (file.app !== 'sail-learn-and-train' || file.kind !== 'setup') {
    return { ok: false, problem: 'notSetup' };
  }
  if (typeof file.version !== 'number' || !(file.version <= SETUP_VERSION)) {
    return { ok: false, problem: 'newer' };
  }
  const { link } = file;
  if (typeof link !== 'string' || !link.startsWith('?') || link.length > SETUP_LINK_MAX) {
    return { ok: false, problem: 'badLink' };
  }
  let boatProfile: BoatProfile | undefined;
  if (file.boatProfile !== undefined) {
    const check = checkBoatProfile(file.boatProfile);
    // The profile must be an imported one that the link names (a built-in id is never imported).
    if (
      !check.ok ||
      check.profile.id === HANSE_508.meta.id ||
      check.profile.id !== linkBoatId(link)
    ) {
      return { ok: false, problem: 'badBoat' };
    }
    boatProfile = check.profile;
  }
  const device =
    typeof file.device === 'object' && file.device !== null && !Array.isArray(file.device)
      ? (file.device as Record<string, unknown>)
      : {};
  const rawLayout =
    device.layout === undefined || device.layout === null
      ? null
      : parseLayout(JSON.stringify(device.layout));
  return {
    ok: true,
    link,
    ...(boatProfile ? { boatProfile } : {}),
    device: {
      columns: parseColumns(device.columns === undefined ? null : JSON.stringify(device.columns)),
      timeBarFolded: device.timeBarFolded === true,
      layout: rawLayout === null ? null : completeLayout(rawLayout),
    },
  };
}
