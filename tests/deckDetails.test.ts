import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import {
  channelFairingRings,
  channelPath,
  sideDeckInnerHalfWidth,
  toerailSection,
} from '../src/model/deckVolumes';
import { halfBeamAt, sheerAt } from '../src/model/hullShape';
import { hullStations } from '../src/render3d/boat/hull';

const t = boat.deckFittings.toerail;

describe('Phase 6, M30: hull and deck closed', () => {
  it('the side deck reaches the well edge aft of the cockpit front and closes the notch', () => {
    expect(sideDeckInnerHalfWidth(-3.2)).toBeCloseTo(1.3, 3);
    // M60b: the roof's outline is 1.85 wide at its aft end, less the 0.1 overlap.
    expect(sideDeckInnerHalfWidth(-3.1)).toBeCloseTo(1.75, 3);
    expect(sideDeckInnerHalfWidth(-3.0)).toBeCloseTo(1.748, 3);
  });

  it('toerailSection at x = 0.5', () => {
    const expected = [
      [1.48, 1.957],
      [1.63, 1.957],
      [1.63, 1.903],
      [1.57, 1.903],
    ];
    const section = toerailSection(0.5);
    expect(section).toHaveLength(4);
    section.forEach(([y, z], i) => {
      expect(y).toBeCloseTo(expected[i]?.[0] ?? NaN, 3);
      expect(z).toBeCloseTo(expected[i]?.[1] ?? NaN, 3);
    });
  });

  it('the toerail never sinks into the hull and stands above the deck edge', () => {
    const xs = hullStations().filter((x) => x >= t.aftX && x <= t.fwdX);
    expect(xs.length).toBeGreaterThan(10);
    for (const x of [t.aftX, ...xs, t.fwdX]) {
      const [outerBottom, outerTop, innerTop] = toerailSection(x);
      expect(outerBottom?.[1] ?? 0).toBeGreaterThanOrEqual(halfBeamAt(x));
      expect(outerTop?.[1] ?? 0).toBeGreaterThanOrEqual(halfBeamAt(x));
      expect(outerTop?.[0] ?? 0).toBeGreaterThan(sheerAt(x));
      expect(innerTop?.[0] ?? 0).toBeGreaterThan(sheerAt(x));
    }
  });

  it('the channel fairing stations, rings and corners (starboard)', () => {
    const rings = channelFairingRings(1);
    const stationXs = rings.map((r) => r[0]?.[0] ?? NaN);
    expect(stationXs).toHaveLength(4);
    [-2.95, -3.12, -3.48, -3.8].forEach((x, i) => expect(stationXs[i]).toBeCloseTo(x, 9));
    const expected = [
      { inner: 0.839, outer: 1.85, top: 1.96, bottom: 1.418 },
      { inner: 0.87, outer: 1.85, top: 1.96, bottom: 1.0 },
      { inner: 1.35, outer: 1.85, top: 1.62, bottom: 1.409 },
      { inner: 1.44, outer: 1.85, top: 1.55, bottom: 1.404 },
    ];
    rings.forEach((ring, i) => {
      const e = expected[i];
      expect(ring[0]?.[2]).toBeCloseTo(e?.inner ?? NaN, 3);
      expect(ring[3]?.[2]).toBeCloseTo(e?.outer ?? NaN, 3);
      expect(ring[1]?.[1]).toBeCloseTo(e?.top ?? NaN, 3);
      expect(ring[2]?.[1]).toBeCloseTo(e?.top ?? NaN, 3);
      expect(ring[0]?.[1]).toBeCloseTo(e?.bottom ?? NaN, 3);
      expect(ring[3]?.[1]).toBeCloseTo(e?.bottom ?? NaN, 3);
    });
  });

  it('every fairing ring has its top above its bottom and the side’s sign; port mirrors starboard', () => {
    const star = channelFairingRings(1);
    const port = channelFairingRings(-1);
    expect(port).toHaveLength(star.length);
    star.forEach((ring, i) => {
      for (const [x, y, z] of ring) {
        expect(x).toBeLessThan(0);
        expect(y).toBeGreaterThan(0);
        expect(z).toBeGreaterThan(0);
      }
      expect((ring[1]?.[1] ?? 0) > (ring[0]?.[1] ?? 0)).toBe(true);
      expect((ring[2]?.[1] ?? 0) > (ring[3]?.[1] ?? 0)).toBe(true);
      port[i]?.forEach(([x, y, z], k) => {
        const [sx, sy, sz] = ring[k] as [number, number, number];
        expect(x).toBeCloseTo(sx, 9);
        expect(y).toBeCloseTo(sy, 9);
        expect(z).toBeCloseTo(-sz, 9);
        expect(z).toBeLessThan(0);
      });
    });
  });

  it('the fairing follows the channel path of its side', () => {
    const path = channelPath(1);
    const rings = channelFairingRings(1);
    // The inner corners lie half a channel width inside the path and the tops on its floor (the
    // first ring on the segment it was cut from). Since M60b the outer corners reach the roof's
    // side line instead of the path's outer edge.
    const half = boat.rig.lineLead.channel.width / 2;
    for (const ring of rings.slice(1)) {
      const x = ring[0]?.[0] ?? 0;
      const point = path.find((p) => Math.abs(p[0] - x) < 1e-9);
      expect(point).toBeDefined();
      expect(ring[0]?.[2] ?? NaN).toBeCloseTo((point?.[2] ?? NaN) - half, 9);
      expect(ring[1]?.[1] ?? NaN).toBeCloseTo(point?.[1] ?? NaN, 9);
    }
  });
});
