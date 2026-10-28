import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import {
  channelFairingRings,
  coachroofHalfOutline,
  DECK_EPS,
  deckStations,
  nonSlipAftX,
  ROOF_CURVE_STEPS,
  roofFrontAtDeckX,
  sideDeckInnerHalfWidth,
} from '../src/model/deckVolumes';
import { hullStations } from '../src/render3d/boat/hull';

const roof = boat.deck.coachroof;
const DEG = 180 / Math.PI;

/** The largest turn, degrees, between neighbouring segments of an outline. */
function largestTurn(outline: [number, number][]): number {
  let worst = 0;
  for (let i = 2; i < outline.length; i += 1) {
    const [x0, w0] = outline[i - 2] as [number, number];
    const [x1, w1] = outline[i - 1] as [number, number];
    const [x2, w2] = outline[i] as [number, number];
    const a = Math.atan2(w1 - w0, x1 - x0);
    const b = Math.atan2(w2 - w1, x2 - x1);
    worst = Math.max(worst, Math.abs(b - a) * DEG);
  }
  return worst;
}

/** A copy of the boat with `nonSlipAftX` changed. */
function withNonSlip(x: number): typeof boat {
  const copy = structuredClone(boat);
  copy.deck.foredeck.nonSlipAftX = x;
  return copy;
}

describe('M60b: coachroof outline (PHASE9_SPEC 6b.3, 6b.5)', () => {
  it('has 18 points, x increasing, the specified values; the top ends at (1.6, 1.379)', () => {
    const outline = coachroofHalfOutline(roof.frontX);
    expect(outline).toHaveLength(2 * ROOF_CURVE_STEPS + 2);
    for (let i = 1; i < outline.length; i += 1) {
      expect(outline[i]?.[0] ?? NaN).toBeGreaterThan(outline[i - 1]?.[0] ?? NaN);
    }
    const expected: [number, [number, number]][] = [
      [0, [-3.05, 1.85]],
      [4, [-1.525, 1.65]],
      [8, [0, 1.45]],
      [9, [1.2, 1.45]],
      [13, [1.766, 1.295]],
      [17, [2.0, 0.92]],
    ];
    for (const [i, [x, w]] of expected) {
      expect(outline[i]?.[0] ?? NaN).toBeCloseTo(x, 3);
      expect(outline[i]?.[1] ?? NaN).toBeCloseTo(w, 3);
    }
    const top = coachroofHalfOutline(roof.topFrontX);
    expect(top).toHaveLength(18);
    expect(top[17]?.[0] ?? NaN).toBeCloseTo(1.6, 3);
    expect(top[17]?.[1] ?? NaN).toBeCloseTo(1.379, 3);
  });

  it('is smooth: no turn over 17°, flat where it meets the coaming and the mast', () => {
    const outline = coachroofHalfOutline(roof.frontX);
    expect(largestTurn(outline)).toBeLessThan(17);
    const slope = (i: number) =>
      ((outline[i + 1]?.[1] ?? 0) - (outline[i]?.[1] ?? 0)) /
      ((outline[i + 1]?.[0] ?? 0) - (outline[i]?.[0] ?? 0));
    expect(Math.abs(slope(0))).toBeLessThan(0.05);
    expect(Math.abs(slope(7))).toBeLessThan(0.05);
  });

  it("the roof's aft half-width is the coaming's outer edge", () => {
    expect(roof.halfWidth).toBeCloseTo(
      boat.deck.cockpit.wellHalfWidth + boat.modelDetail.coamingWidth,
      9,
    );
  });
});

describe('M60b: no gaps on the deck', () => {
  it("the deck under the roof's front face starts aft of where the face meets it", () => {
    // The spec's formula gives 1.8576 here (its text said about 1.865).
    expect(roofFrontAtDeckX()).toBeCloseTo(1.858, 3);
    const stations = deckStations(hullStations());
    expect(stations).toContain(roof.topFrontX);
    expect(roof.topFrontX).toBeLessThan(roofFrontAtDeckX());
  });

  it("beside the roof the side deck's inner edge never lies outboard of the roof's edge", () => {
    const stations = deckStations(hullStations());
    const outline = coachroofHalfOutline(roof.frontX);
    const roofAt = (x: number): number => {
      for (let i = 1; i < outline.length; i += 1) {
        const [x0, w0] = outline[i - 1] as [number, number];
        const [x1, w1] = outline[i] as [number, number];
        if (x <= x1) return w0 + ((w1 - w0) * (x - x0)) / (x1 - x0);
      }
      return outline[outline.length - 1]?.[1] ?? 0;
    };
    for (let k = 0; k < 400; k += 1) {
      const x = roof.aftX + ((roof.topFrontX - roof.aftX) * k) / 399;
      const j = stations.findIndex((s, i) => s <= x && (stations[i + 1] ?? Infinity) >= x);
      const x0 = stations[j] as number;
      const x1 = stations[j + 1] as number;
      const w0 = sideDeckInnerHalfWidth(x0);
      const w1 = sideDeckInnerHalfWidth(x1);
      const inner = x1 > x0 ? w0 + ((w1 - w0) * (x - x0)) / (x1 - x0) : w1;
      // The cockpit front station steps from the well's edge to the roof's within 2 cm: skip it.
      if (x < boat.deck.cockpit.frontX + 0.05) continue;
      expect(inner).toBeLessThanOrEqual(roofAt(x) + 1e-9);
    }
  });

  it('deckStations has every key station; nonSlipAftX is clamped', () => {
    const stations = deckStations(hullStations());
    const outline = coachroofHalfOutline(roof.frontX);
    for (const [x] of outline) expect(stations.some((s) => Math.abs(s - x) < 1e-9)).toBe(true);
    for (const x of [1.6, 2.0, -3.05, 4.3, boat.deck.cockpit.frontX - 2 * DECK_EPS]) {
      expect(stations.some((s) => Math.abs(s - x) < 1e-9)).toBe(true);
    }
    expect(new Set(stations).size).toBe(stations.length);
    expect([...stations].sort((a, b) => a - b)).toEqual(stations);
    expect(nonSlipAftX()).toBeCloseTo(4.3, 9);
    expect(nonSlipAftX(withNonSlip(9))).toBeCloseTo(boat.hull.stemX, 9);
    expect(nonSlipAftX(withNonSlip(0))).toBeCloseTo(1.6, 9);
  });
});

describe('M60b: the channel moulding runs on into the roof side', () => {
  it('outer corners at 1.85, inner corners as before, the last top on the coaming', () => {
    const rings = channelFairingRings(1);
    for (const ring of rings) {
      expect(ring[2]?.[2] ?? NaN).toBeCloseTo(1.85, 9);
      expect(ring[3]?.[2] ?? NaN).toBeCloseTo(1.85, 9);
    }
    const half = boat.rig.lineLead.channel.width / 2;
    const path = boat.rig.lineLead.channel.path;
    for (const ring of rings.slice(1)) {
      const point = path.find((p) => Math.abs((p[0] ?? 0) - (ring[0]?.[0] ?? 0)) < 1e-9);
      expect(ring[0]?.[2] ?? NaN).toBeCloseTo((point?.[2] ?? NaN) - half, 9);
    }
    const last = rings[rings.length - 1];
    expect(last?.[1]?.[1] ?? NaN).toBeCloseTo(boat.deck.cockpit.coamingTopY, 9);
  });
});
