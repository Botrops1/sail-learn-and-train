import { describe, expect, it } from 'vitest';
import { marinaGeometry } from '../src/model/marina';
import { solidAround } from '../src/model/places';

/** M73 (PHASE10_SPEC 15.3, 15.7 test 4): which surroundings act on the boat. */
describe('solidAround', () => {
  const g = marinaGeometry('medium', 'half');

  it('open water far from both: nothing acts', () => {
    expect(solidAround('open', 0, 0, g)).toEqual({ marina: false, bay: false });
  });
  it('near the marina from open water: the marina acts', () => {
    expect(solidAround('open', 0, 1405, g).marina).toBe(true);
  });
  it('near the bay from open water: the bay acts, 60 m past the coast it does not', () => {
    expect(solidAround('open', -1300, 0, g).bay).toBe(true);
    expect(solidAround('open', -1280, 0, g).bay).toBe(false);
  });
  it('a place always acts', () => {
    expect(solidAround('marina', 0, 0, g).marina).toBe(true);
    expect(solidAround('bay', 0, 0, g).bay).toBe(true);
  });
});
