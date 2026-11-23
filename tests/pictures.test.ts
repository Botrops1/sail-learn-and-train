import { describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import { PICTURE_ONLY } from '../src/model/glossary';
import { isPictureId, polePlanDeg, spinnakerPicture } from '../src/model/pictures';
import { pictureSailGrid } from '../src/model/sailShape';
import { distance, vec3 } from '../src/model/vec3';

describe('M109: pictures in the state and the link', () => {
  it('`pic` round-trips through the link', () => {
    for (const pic of ['spinnaker', 'code0'] as const) {
      const state = parseUrlState(`?pic=${pic}&wd=150&held=1`);
      expect(state.picture).toBe(pic);
      expect(serializeUrlState(state)).toContain(`pic=${pic}`);
    }
  });

  it('a bad or missing value is no picture, and none is written', () => {
    expect(parseUrlState('?pic=banana').picture).toBeNull();
    expect(parseUrlState('?pic=').picture).toBeNull();
    expect(parseUrlState('?wd=60').picture).toBeNull();
    expect(serializeUrlState(parseUrlState('?pic=banana'))).not.toContain('pic=');
    expect(isPictureId('spinnaker')).toBe(true);
    expect(isPictureId('traveller')).toBe(false);
  });

  it('setPicture sets and clears it; nothing else in the model changes', () => {
    const start = initialState();
    expect(start.picture).toBeNull();
    const shown = reduce(start, { type: 'setPicture', picture: 'code0' });
    expect(shown.picture).toBe('code0');
    expect({ ...shown, picture: null }).toEqual(start);
    expect(reduce(shown, { type: 'setPicture', picture: null }).picture).toBeNull();
    // The same picture again is the same state object.
    expect(reduce(shown, { type: 'setPicture', picture: 'code0' })).toBe(shown);
  });

  it('a link without `pic` clears the picture (load takes the parsed state whole), and Reset does too', () => {
    const shown = reduce(initialState(), { type: 'setPicture', picture: 'spinnaker' });
    expect(reduce(shown, { type: 'load', state: parseUrlState('?wd=60') }).picture).toBeNull();
    expect(reduce(shown, { type: 'reset' }).picture).toBeNull();
  });
});

describe('M109: the pictures', () => {
  it("the pole's length from heel to end is the manual's 5.85 m, whatever the wind", () => {
    expect(boat.dimensions.rigDimensionsMm.spinnakerPole).toBe(5850);
    for (const awa of [100, 130, 150, 180, -120]) {
      const picture = spinnakerPicture(awa);
      const heel = vec3(boat.pictures.spinnaker.poleHeel);
      expect(distance(heel, picture.poleEnd), `awa ${awa}`).toBeCloseTo(5.85, 9);
    }
    expect(polePlanDeg(0)).toBe(boat.pictures.spinnaker.poleMinDeg);
  });

  it('the picture sail is full: its middle row bulges to the side given', () => {
    const picture = spinnakerPicture(150);
    const corners = { tack: picture.poleEnd, head: picture.head, clew: picture.clew };
    const grid = pictureSailGrid(corners, -1, boat.pictures.spinnaker.camberRatio);
    const flat = pictureSailGrid(corners, -1, 0);
    const mid = Math.floor(grid.rows / 2) * (grid.columns + 1) + Math.floor(grid.columns / 2);
    expect(grid.points[mid]?.[2]).toBeLessThan((flat.points[mid]?.[2] ?? 0) - 0.05);
  });

  it('every id that is only drawn inside a picture is in the registry, drawn by the pictures', () => {
    const ids = new Set((registry.entries as { id: string }[]).map((entry) => entry.id));
    expect(PICTURE_ONLY.size).toBe(9);
    for (const id of PICTURE_ONLY) expect(ids.has(id), id).toBe(true);
  });
});
