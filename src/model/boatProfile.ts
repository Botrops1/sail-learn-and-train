import { HANSE_508, type BoatData } from './boat';

/**
 * The boat profile file (PHASE8_SPEC 15): the boat file of the Hanse 508 with other numbers,
 * for a boat laid out like it. A profile comes from outside the app, so `checkBoatProfile()`
 * walks it against the reference boat before anything uses it. Pure.
 */
export const BOAT_PROFILE_VERSION = 1;

export interface BoatProfile {
  app: 'sail-learn-and-train';
  kind: 'boatProfile';
  version: number;
  id: string;
  name: string;
  boat: BoatData;
}

export type ProblemKind = 'header' | 'missing' | 'type' | 'ids' | 'length' | 'range' | 'thrusters';

export interface ProfileProblem {
  /** A path in the file, such as `boat.dimensions.loa` or `boat.ropes.list[3].id`. */
  path: string;
  kind: ProblemKind;
  /** A short English text for the guide and the PR (`expected a number`, `6 to 25`). */
  detail: string;
}

export type ProfileCheck =
  { ok: true; profile: BoatProfile } | { ok: false; problems: ProfileProblem[] };

/** A boat id: lower-case letters, digits and `-`, 1 to 40 characters. */
export const BOAT_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

const MAX_PROBLEMS = 20;
const MAX_NAME_LENGTH = 60;

/**
 * Keys whose string values name things the code looks up (a typo would stop the app): they must
 * equal the reference. Free text (`source`, `note`, labels) may change.
 */
const NAMING_KEYS: ReadonlySet<string> = new Set([
  'id',
  'key',
  'ropeId',
  'rope',
  'bank',
  'tail',
  'side',
  'end',
  'partId',
  'controlId',
]);

/** Lists of names: the members must equal the reference, in the same order. */
const NAMING_ARRAYS: ReadonlySet<string> = new Set([
  'clutches',
  'controls',
  'largeClutchRopes',
  'settings',
  'tails',
]);

/** The boat's own id and name may change (`makeBoatProfile` writes them). */
const FREE_NAMING_PATHS: ReadonlySet<string> = new Set(['boat.meta.id']);

interface Range {
  path: string;
  min: number;
  max: number;
}

const RANGES: readonly Range[] = [
  { path: 'dimensions.loa', min: 6, max: 25 },
  { path: 'dimensions.beam', min: 2, max: 7 },
  { path: 'dimensions.draft', min: 0.8, max: 4.5 },
  { path: 'dimensions.displacementTonnes', min: 1, max: 60 },
  { path: 'dimensions.massesKg.lightCraftStandardKeel', min: 500, max: 60000 },
  { path: 'dimensions.engineHp', min: 5, max: 400 },
  { path: 'rig.mast.topY', min: 6, max: 40 },
  { path: 'physics.thrusters.bowThrustN', min: 0, max: 10000 },
  { path: 'physics.thrusters.sternThrustN', min: 0, max: 10000 },
  { path: 'realisticMode.winchHandle.lengthM', min: 0.15, max: 0.4 },
  { path: 'physics.integration.maxStepS', min: 0.005, max: 0.1 },
  { path: 'physics.integration.solverAwaStepDeg', min: 0.01, max: 2 },
  { path: 'physics.integration.solverAwsStepKn', min: 0.01, max: 2 },
  { path: 'physics.mass.payloadKg', min: 0, max: 20000 },
  { path: 'physics.mass.addedMassFraction', min: 0, max: 2 },
];

/** Deep-clones `data` and writes `id` and `name` into its `meta.id` / `meta.name` too. */
export function makeBoatProfile(id: string, name: string, data: BoatData): BoatProfile {
  const boat = structuredClone(data);
  boat.meta.id = id;
  boat.meta.name = name;
  return {
    app: 'sail-learn-and-train',
    kind: 'boatProfile',
    version: BOAT_PROFILE_VERSION,
    id,
    name,
    boat,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Collects problems and stops at `MAX_PROBLEMS`. */
class Problems {
  readonly list: ProfileProblem[] = [];
  readonly paths = new Set<string>();

  get full(): boolean {
    return this.list.length >= MAX_PROBLEMS;
  }

  add(path: string, kind: ProblemKind, detail: string): void {
    if (this.full) return;
    this.list.push({ path, kind, detail });
    this.paths.add(path);
  }
}

function describe(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function checkHeader(raw: unknown, problems: Problems): void {
  if (!isPlainObject(raw)) {
    problems.add('(file)', 'header', 'expected an object');
    return;
  }
  if (raw.app !== 'sail-learn-and-train') {
    problems.add('app', 'header', 'expected "sail-learn-and-train"');
  }
  if (raw.kind !== 'boatProfile') problems.add('kind', 'header', 'expected "boatProfile"');
  if (
    !isFiniteNumber(raw.version) ||
    !Number.isInteger(raw.version) ||
    raw.version < 1 ||
    raw.version > BOAT_PROFILE_VERSION
  ) {
    problems.add('version', 'header', `expected a whole number from 1 to ${BOAT_PROFILE_VERSION}`);
  }
  if (typeof raw.id !== 'string' || !BOAT_ID_PATTERN.test(raw.id)) {
    problems.add('id', 'header', 'expected 1 to 40 small letters, digits or -');
  }
  if (
    typeof raw.name !== 'string' ||
    raw.name.trim().length < 1 ||
    raw.name.length > MAX_NAME_LENGTH
  ) {
    problems.add('name', 'header', `expected a name of 1 to ${MAX_NAME_LENGTH} characters`);
  }
  if (!isPlainObject(raw.boat)) problems.add('boat', 'header', 'expected an object');
}

/** Walks the reference and the profile together. `key` is the name of the value in its object. */
function walk(
  reference: unknown,
  value: unknown,
  path: string,
  key: string,
  problems: Problems,
): void {
  if (problems.full) return;

  if (reference === null) {
    if (NAMING_KEYS.has(key)) {
      if (value !== null) problems.add(path, 'ids', 'expected null');
    } else if (value !== null && typeof value !== 'string') {
      problems.add(path, 'type', 'expected null or a string');
    }
    return;
  }
  if (typeof reference === 'number') {
    if (!isFiniteNumber(value)) problems.add(path, 'type', 'expected a number');
    return;
  }
  if (typeof reference === 'boolean') {
    if (typeof value !== 'boolean') problems.add(path, 'type', 'expected true or false');
    return;
  }
  if (typeof reference === 'string') {
    if (typeof value !== 'string') {
      problems.add(path, 'type', 'expected a string');
    } else if (NAMING_KEYS.has(key) && !FREE_NAMING_PATHS.has(path) && value !== reference) {
      problems.add(path, 'ids', `expected ${describe(reference)}`);
    }
    return;
  }
  if (Array.isArray(reference)) {
    walkArray(reference, value, path, key, problems);
    return;
  }
  if (isPlainObject(reference)) {
    if (!isPlainObject(value)) {
      problems.add(path, 'type', 'expected an object');
      return;
    }
    for (const [name, child] of Object.entries(reference)) {
      if (!(name in value)) {
        problems.add(`${path}.${name}`, 'missing', `${name} missing`);
      } else {
        walk(child, value[name], `${path}.${name}`, name, problems);
      }
    }
  }
}

function walkArray(
  reference: readonly unknown[],
  value: unknown,
  path: string,
  key: string,
  problems: Problems,
): void {
  if (!Array.isArray(value)) {
    problems.add(path, 'type', 'expected a list');
    return;
  }
  if (path === 'boat.hull.thrusters') {
    walkThrusters(reference, value, path, problems);
    return;
  }
  const first = reference[0];
  if (first === undefined) return; // An empty reference list: any list.

  if (Array.isArray(first)) {
    // A table: at least two rows, each as long as the reference's first row, all numbers.
    if (value.length < 2) problems.add(path, 'length', 'expected at least 2 rows');
    value.forEach((row, index) => {
      const rowPath = `${path}[${index}]`;
      if (!Array.isArray(row)) {
        problems.add(rowPath, 'type', 'expected a row of numbers');
      } else if (row.length !== first.length) {
        problems.add(rowPath, 'length', `expected ${first.length} numbers`);
      } else if (!row.every(isFiniteNumber)) {
        problems.add(rowPath, 'type', 'expected numbers');
      }
    });
    return;
  }
  if (typeof first === 'number') {
    if (value.length !== reference.length) {
      problems.add(path, 'length', `expected ${reference.length} numbers`);
    } else {
      value.forEach((item, index) => {
        if (!isFiniteNumber(item)) problems.add(`${path}[${index}]`, 'type', 'expected a number');
      });
    }
    return;
  }
  if (typeof first === 'string') {
    value.forEach((item, index) => {
      if (typeof item !== 'string') problems.add(`${path}[${index}]`, 'type', 'expected a string');
    });
    if (NAMING_ARRAYS.has(key) && !problems.paths.has(path)) {
      const same =
        value.length === reference.length && value.every((item, i) => item === reference[i]);
      if (!same) problems.add(path, 'ids', `expected ${describe(reference)}`);
    }
    return;
  }
  if (isPlainObject(first)) {
    if (value.length !== reference.length) {
      const hasIds = 'id' in first;
      problems.add(
        path,
        hasIds ? 'ids' : 'length',
        hasIds
          ? `expected ${reference.length} entries: ${reference.map((item) => describe((item as { id: unknown }).id)).join(', ')}`
          : `expected ${reference.length} entries`,
      );
      return;
    }
    // Entries with an `id` keep the same ids in the same order: each entry's own `id` is compared.
    reference.forEach((item, index) => {
      walk(item, value[index], `${path}[${index}]`, '', problems);
    });
  }
}

/** `boat.hull.thrusters`: none, the bow one, the stern one or both, each as the reference's. */
function walkThrusters(
  reference: readonly unknown[],
  value: unknown[],
  path: string,
  problems: Problems,
): void {
  if (value.length > 2) {
    problems.add(path, 'thrusters', 'expected 0, 1 or 2 thrusters');
    return;
  }
  const seen = new Set<string>();
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    const end = isPlainObject(item) ? item.end : undefined;
    if (end !== 'bow' && end !== 'stern') {
      problems.add(`${itemPath}.end`, 'thrusters', 'expected "bow" or "stern"');
      return;
    }
    if (seen.has(end)) {
      problems.add(`${itemPath}.end`, 'thrusters', `${end} twice`);
      return;
    }
    seen.add(end);
    const match = reference.find((entry) => isPlainObject(entry) && entry.end === end);
    walk(match, item, itemPath, '', problems);
  });
}

function numberAt(root: unknown, dotted: string): number | undefined {
  let at: unknown = root;
  for (const part of dotted.split('.')) {
    if (!isPlainObject(at)) return undefined;
    at = at[part];
  }
  return isFiniteNumber(at) ? at : undefined;
}

function checkRanges(boat: unknown, problems: Problems): void {
  for (const range of RANGES) {
    const path = `boat.${range.path}`;
    if (problems.paths.has(path)) continue;
    const found = numberAt(boat, range.path);
    if (found === undefined) continue;
    if (found < range.min || found > range.max) {
      problems.add(path, 'range', `${range.min} to ${range.max}`);
    }
  }
  const stemX = numberAt(boat, 'hull.stemX');
  const transomX = numberAt(boat, 'hull.transomX');
  if (
    stemX !== undefined &&
    transomX !== undefined &&
    !problems.paths.has('boat.hull.stemX') &&
    !problems.paths.has('boat.hull.transomX')
  ) {
    const length = stemX - transomX;
    if (length < 5 || length > 25) {
      problems.add('boat.hull.stemX', 'range', '5 to 25 between stemX and transomX');
    }
  }
}

/**
 * Checks a parsed profile file (PHASE8_SPEC 15.3): the header, then the shape against the
 * reference boat (same keys, same names, tables as long as the reference's), then the ranges.
 * At most 20 problems are reported. Never throws.
 */
export function checkBoatProfile(raw: unknown, reference: BoatData = HANSE_508): ProfileCheck {
  const problems = new Problems();
  checkHeader(raw, problems);
  if (problems.list.length > 0 || !isPlainObject(raw)) {
    return { ok: false, problems: problems.list };
  }
  walk(reference, raw.boat, 'boat', 'boat', problems);
  checkRanges(raw.boat, problems);
  if (problems.list.length > 0) return { ok: false, problems: problems.list };
  return {
    ok: true,
    profile: {
      app: 'sail-learn-and-train',
      kind: 'boatProfile',
      version: raw.version as number,
      id: raw.id as string,
      name: raw.name as string,
      boat: raw.boat as BoatData,
    },
  };
}
