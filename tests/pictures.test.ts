import { describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import { PICTURE_ONLY } from '../src/model/glossary';
import {
  isPictureId,
  polePlanDeg,
  spinnakerPicture,
  travellerPicture,
} from '../src/model/pictures';
import { pictureSailGrid } from '../src/model/sailShape';
import { distance, vec3, type Vec3 } from '../src/model/vec3';

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
    expect(isPictureId('traveller')).toBe(true);
    expect(isPictureId('gennaker')).toBe(false);
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

  it('the picture sail is full: its middle row bulges forward, to leeward of the sail', () => {
    const picture = spinnakerPicture(150);
    const corners = { tack: picture.poleEnd, head: picture.head, clew: picture.clew };
    const grid = pictureSailGrid(corners, -1, boat.pictures.spinnaker.camberRatio);
    const flat = pictureSailGrid(corners, -1, 0);
    const mid = Math.floor(grid.rows / 2) * (grid.columns + 1) + Math.floor(grid.columns / 2);
    // The clew is the tack's mirror image, so the sail stands across the boat and its belly
    // bulges forward (the wind comes from astern), not sideways (issue 269).
    expect(grid.points[mid]?.[0]).toBeGreaterThan((flat.points[mid]?.[0] ?? 0) + 0.05);
  });

  it('on a broad reach the picture sail flies in front of the forestay and its clew well forward of the main (issue 269)', () => {
    const picture = spinnakerPicture(150);
    const [topX = 0, topY = 1] = boat.rig.forestay.top;
    const [bottomX = 0, bottomY = 0] = boat.rig.forestay.bottom;
    const stayX = (y: number) => topX + ((bottomX - topX) * (topY - y)) / (topY - bottomY);
    const grid = pictureSailGrid(
      { tack: picture.poleEnd, head: picture.head, clew: picture.clew },
      picture.side === 1 ? -1 : 1,
      boat.pictures.spinnaker.camberRatio,
    );
    const stride = grid.columns + 1;
    let aft = 0;
    for (let row = 0; row <= grid.rows; row += 1) {
      // The point of this row where the sail crosses the middle of the boat (z nearest 0).
      let across = grid.points[row * stride] as Vec3;
      for (let col = 1; col < stride; col += 1) {
        const q = grid.points[row * stride + col] as Vec3;
        if (Math.abs(q[2]) < Math.abs(across[2])) across = q;
      }
      if (across[0] < stayX(across[1])) aft += 1;
    }
    // Before the fix 13 of the 17 rows lay behind the stay, by up to 1.2 m.
    expect(aft).toBeLessThanOrEqual(2);
    // The clew was abeam the mast (x 0.2, the end of the boom); now it is well forward of it.
    expect(picture.clew[0]).toBeGreaterThan(2);
  });

  it('every id that is only drawn inside a picture is in the registry, drawn by the pictures', () => {
    const ids = new Set((registry.entries as { id: string }[]).map((entry) => entry.id));
    expect(PICTURE_ONLY.size).toBe(12);
    for (const id of PICTURE_ONLY) expect(ids.has(id), id).toBe(true);
  });
});

describe('M110: the traveller picture in the state and the link', () => {
  it('`pic=traveller&tv=-60` round-trips', () => {
    const state = parseUrlState('?pic=traveller&tv=-60&wd=60&held=1');
    expect(state.picture).toBe('traveller');
    expect(state.travellerCarPct).toBe(-60);
    const link = serializeUrlState(state);
    expect(link).toContain('pic=traveller');
    expect(link).toContain('tv=-60');
    expect(parseUrlState(link).travellerCarPct).toBe(-60);
  });

  it('`tv` is read only with the traveller picture, and a car in the middle is not written', () => {
    const alone = parseUrlState('?tv=40');
    expect(alone.travellerCarPct).toBe(0);
    expect(serializeUrlState(alone)).not.toContain('tv=');
    expect(parseUrlState('?pic=spinnaker&tv=40').travellerCarPct).toBe(0);
    expect(serializeUrlState(parseUrlState('?pic=traveller'))).not.toContain('tv=');
    expect(serializeUrlState(parseUrlState('?pic=traveller&tv=0'))).not.toContain('tv=');
  });

  it('a `tv` that is not a whole number in range gives 0', () => {
    for (const bad of ['12.5', '200', '-101', 'abc', '', '1e1']) {
      expect(parseUrlState(`?pic=traveller&tv=${bad}`).travellerCarPct, bad).toBe(0);
    }
    expect(parseUrlState('?pic=traveller&tv=100').travellerCarPct).toBe(100);
    expect(parseUrlState('?pic=traveller&tv=-100').travellerCarPct).toBe(-100);
  });

  it('setTravellerCar rounds and clamps; closing or changing the picture puts the car back', () => {
    const shown = reduce(initialState(), { type: 'setPicture', picture: 'traveller' });
    expect(reduce(shown, { type: 'setTravellerCar', pct: 63.4 }).travellerCarPct).toBe(63);
    expect(reduce(shown, { type: 'setTravellerCar', pct: -300 }).travellerCarPct).toBe(-100);
    expect(reduce(shown, { type: 'setTravellerCar', pct: 0 })).toBe(shown);
    const moved = reduce(shown, { type: 'setTravellerCar', pct: 40 });
    expect(reduce(moved, { type: 'setPicture', picture: null }).travellerCarPct).toBe(0);
    expect(reduce(moved, { type: 'setPicture', picture: 'code0' }).travellerCarPct).toBe(0);
    expect(reduce(moved, { type: 'reset' }).travellerCarPct).toBe(0);
    expect(reduce(moved, { type: 'load', state: parseUrlState('?wd=60') }).travellerCarPct).toBe(0);
  });

  it("the track lies under the boom's sheet blocks, the car on the track", () => {
    const middle = travellerPicture(0);
    expect(middle.car[0]).toBeCloseTo(-3.125, 9);
    expect(middle.car[1]).toBe(boat.rig.mainsheet.deckBlocks.y);
    expect(travellerPicture(100).car[2]).toBeCloseTo(boat.pictures.traveller.halfLengthM, 9);
    // Out of range counts as the end of the track.
    expect(travellerPicture(250).car[2]).toBeCloseTo(boat.pictures.traveller.halfLengthM, 9);
  });
});
