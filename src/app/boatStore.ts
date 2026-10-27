/**
 * M58 (issue #112; PHASE8_SPEC 16.2): the boats imported on this device, and which boat to start
 * with. `main.ts` reads this before the app's modules are loaded, so this file imports only
 * `model/boat` and `model/boatProfile` (a test reads the import lines): nothing here may reach a
 * module that copies a boat value into a constant at load. Every storage access is in
 * `try/catch` through `globalThis.localStorage`, so tests can put a stand-in there.
 */
import { HANSE_508 } from '../model/boat';
import { BOAT_ID_PATTERN, checkBoatProfile, type BoatProfile } from '../model/boatProfile';

export const BOATS_KEY = 'sail-learn.boats';
export const BOAT_KEY = 'sail-learn.boat';
export const MAX_BOATS = 10;

const BUILT_IN_ID = HANSE_508.meta.id;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readRaw(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** The imported profiles, each checked again; bad ones, repeats and the built-in id are dropped. */
export function storedBoats(): BoatProfile[] {
  const text = readRaw(BOATS_KEY);
  if (text === null) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const boats: BoatProfile[] = [];
  for (const entry of raw) {
    const check = checkBoatProfile(entry);
    if (!check.ok) continue;
    const { profile } = check;
    if (profile.id === BUILT_IN_ID || boats.some((b) => b.id === profile.id)) continue;
    boats.push(profile);
    if (boats.length >= MAX_BOATS) break;
  }
  return boats;
}

function writeBoats(boats: BoatProfile[]): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(BOATS_KEY, JSON.stringify(boats));
    return true;
  } catch {
    return false;
  }
}

/** Adds or replaces (same id) a checked profile. */
export function saveBoat(profile: BoatProfile): 'ok' | 'builtIn' | 'full' | 'storage' {
  if (profile.id === BUILT_IN_ID) return 'builtIn';
  const boats = storedBoats();
  const at = boats.findIndex((b) => b.id === profile.id);
  if (at >= 0) boats[at] = profile;
  else if (boats.length >= MAX_BOATS) return 'full';
  else boats.push(profile);
  return writeBoats(boats) ? 'ok' : 'storage';
}

export function removeBoat(id: string): void {
  writeBoats(storedBoats().filter((b) => b.id !== id));
}

/** The id chosen last, if it matches `BOAT_ID_PATTERN`; else 'hanse508'. */
export function chosenBoat(): string {
  const id = readRaw(BOAT_KEY);
  return id !== null && BOAT_ID_PATTERN.test(id) ? id : BUILT_IN_ID;
}

export function setChosenBoat(id: string): void {
  try {
    storage()?.setItem(BOAT_KEY, id);
  } catch {
    // The choice just is not remembered.
  }
}

/** Pure: the boat a link names: a valid `boat=`, else 'hanse508'. */
export function linkBoatId(search: string): string {
  const id = new URLSearchParams(search).get('boat');
  return id !== null && BOAT_ID_PATTERN.test(id) ? id : BUILT_IN_ID;
}

/**
 * The boat to start with: the link's boat when the address has a query; with no query, the boat
 * chosen last if it is among the stored ones, else the Hanse 508.
 */
export function startBoatId(search: string): string {
  if (search.replace(/^\?/, '') !== '') return linkBoatId(search);
  const id = chosenBoat();
  return id !== BUILT_IN_ID && storedBoats().some((b) => b.id === id) ? id : BUILT_IN_ID;
}
