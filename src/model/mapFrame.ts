import { DEG } from './angles';

/**
 * A map offset (east, north) seen from the boat: x forward, z starboard (PHASE2_SPEC 3.2).
 * Heading 90 (bow east), a point 1 m east → [1, 0] (ahead). Heading 0, 1 m east → [0, 1].
 */
export function mapToBoat(
  eastM: number,
  northM: number,
  headingDeg: number,
): [x: number, z: number] {
  const h = headingDeg * DEG;
  return [northM * Math.cos(h) + eastM * Math.sin(h), eastM * Math.cos(h) - northM * Math.sin(h)];
}

/** `value` modulo `size`, always in [0, size) (also for negative values). */
export function modulo(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/**
 * Where the water and its grid sit in the world group (PHASE2_SPEC 6.6): the group's local x is
 * north and z is east, centred on the boat. The grid is moved against the boat's motion by the
 * remainder of her position over the grid spacing, so it streams past; `centreNorthM` and
 * `centreEastM` are the map position of the plane's centre (a multiple of the spacing).
 */
export function waterShift(
  eastM: number,
  northM: number,
  spacingM: number,
): { x: number; z: number; centreNorthM: number; centreEastM: number } {
  const x = -modulo(northM, spacingM);
  const z = -modulo(eastM, spacingM);
  return { x, z, centreNorthM: northM + x, centreEastM: eastM + z };
}
