import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { halfBeamAt, sectionPoint } from '../src/model/hullShape';
import {
  ballFenderPlace,
  cleatPlaces,
  fairleadPlaces,
  fenderPlaces,
} from '../src/model/mooringFittings';

const g = boat.deckFittings;
const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('missing');
  return value;
};
const near = (actual: readonly number[], expected: readonly number[]) => {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((e, i) => expect(Math.abs((actual[i] as number) - e)).toBeLessThan(0.001));
};
/** Starboard places are the even entries (starboard first for each station). */
const starboard = <T>(list: T[]) => list.filter((_, i) => i % 2 === 0);

describe('Phase 6, M32: cleats and fairleads', () => {
  it('the worked values of the spec; port is starboard with z negated', () => {
    expect(cleatPlaces()).toHaveLength(6);
    expect(fairleadPlaces()).toHaveLength(4);
    const cleats = starboard(cleatPlaces());
    near(must(cleats[0]).base, [5.0, 1.735, 0.579]);
    near(must(cleats[1]).base, [-1.2, 1.599, 2.2]);
    near(must(cleats[2]).base, [-7.5, 1.459, 2.085]);
    const fairleads = starboard(fairleadPlaces());
    near(must(fairleads[0]).base, [5.25, 1.741, 0.483]);
    near(must(fairleads[1]).base, [-7.95, 1.447, 2.037]);
    for (const list of [cleatPlaces(), fairleadPlaces()]) {
      for (let i = 0; i < list.length; i += 2) {
        const s = must(list[i]);
        const p = must(list[i + 1]);
        expect(s.side).toBe(1);
        expect(p.side).toBe(-1);
        near(p.base, [s.base[0], s.base[1], -s.base[2]]);
      }
    }
  });

  it('the long axes match the spec, have length 1 and follow the deck edge', () => {
    const cleats = starboard(cleatPlaces());
    near(must(cleats[0]).along, [0.935, 0, -0.354]);
    near(must(cleats[1]).along, [0.991, 0, -0.131]);
    near(must(cleats[2]).along, [0.994, 0, 0.107]);
    near(must(starboard(fairleadPlaces())[0]).along, [0.93, 0, -0.367]);
    for (const list of [cleatPlaces(), fairleadPlaces()]) {
      list.forEach((place, i) => {
        expect(Math.hypot(...place.along)).toBeCloseTo(1, 6);
        if (place.side === -1) {
          const s = must(list[i - 1]);
          near(place.along, [s.along[0], 0, -s.along[2]]);
        }
      });
    }
  });

  it('every base lies within the toerail', () => {
    const t = g.toerail;
    for (const place of [...cleatPlaces(), ...fairleadPlaces()]) {
      const [x, , z] = place.base;
      expect(Math.abs(z)).toBeGreaterThanOrEqual(halfBeamAt(x) - t.width - 1e-9);
      expect(Math.abs(z)).toBeLessThanOrEqual(halfBeamAt(x) + 1e-9);
      expect(x).toBeGreaterThanOrEqual(t.aftX);
      expect(x).toBeLessThanOrEqual(t.fwdX);
    }
  });

  it('no fairlead overlaps a cleat along x, and the bow fairlead is clear of the windlass recess', () => {
    for (const f of g.fairleads.stations) {
      for (const c of g.cleats.stations) {
        const apart = Math.abs(f - c) >= (g.fairleads.length + g.cleats.length) / 2;
        expect(apart, `fairlead ${f} / cleat ${c}`).toBe(true);
      }
    }
    const w = g.windlass;
    const bow = must(starboard(fairleadPlaces())[0]);
    const clearSideways = Math.abs(bow.base[2]) - g.fairleads.width / 2 > w.z + w.recessRadius;
    const clearForward = bow.base[0] - g.fairleads.length / 2 > w.x + w.recessRadius;
    expect(clearSideways || clearForward).toBe(true);
  });
});

describe('Phase 6, M33: fenders', () => {
  it('the worked values of the spec; port is starboard with z negated', () => {
    const places = fenderPlaces();
    expect(places).toHaveLength(8);
    const tops = starboard(places).map((p) => p.top);
    near(must(tops[0]), [3.0, 1.28, 1.431]);
    near(must(tops[1]), [0.5, 1.23, 2.083]);
    near(must(tops[2]), [-2.5, 1.176, 2.472]);
    near(must(tops[3]), [-5.5, 1.111, 2.431]);
    for (let i = 0; i < places.length; i += 2) {
      const s = must(places[i]);
      const p = must(places[i + 1]);
      expect(s.side).toBe(1);
      expect(p.side).toBe(-1);
      near(p.top, [s.top[0], s.top[1], -s.top[2]]);
      near(p.lineEnd, [s.lineEnd[0], s.lineEnd[1], -s.lineEnd[2]]);
    }
    const ball = ballFenderPlace();
    near(ball.centre, [-8.2, 0.765, -2.32]);
    expect(ball.side).toBe(-1);
  });

  it('the lowest fender hangs 0.311 m above the waterline; the lines end on the toerail', () => {
    const lowest = must(starboard(fenderPlaces())[3]);
    expect(lowest.top[1] - g.fenders.length).toBeCloseTo(0.311, 3);
    for (const p of fenderPlaces()) {
      const x = p.lineEnd[0];
      expect(Math.abs(p.lineEnd[2])).toBeLessThanOrEqual(halfBeamAt(x));
      expect(Math.abs(p.lineEnd[2])).toBeGreaterThanOrEqual(halfBeamAt(x) - g.toerail.width);
    }
  });

  it('every fender clears the hull', () => {
    for (const p of starboard(fenderPlaces())) {
      const x = p.top[0];
      const outer = Math.abs(p.top[2]) - g.fenders.diameter / 2;
      const bottom = p.top[1] - g.fenders.length;
      for (let y = bottom; y <= p.top[1]; y += 0.05) {
        let widest = 0;
        for (let i = 0; i <= 100; i++) {
          const [sy, sz] = sectionPoint(x, i / 100);
          if (Math.abs(sy - y) <= 0.02) widest = Math.max(widest, sz);
        }
        expect(outer, `x ${x}, y ${y.toFixed(2)}`).toBeGreaterThanOrEqual(widest);
      }
    }
  });
});
