import { describe, expect, it } from 'vitest';
import { pointOfSailArcs } from '../src/model/pointsOfSail';

const current = (windFrom: number, twa: number) =>
  pointOfSailArcs(windFrom, twa).filter((arc) => arc.current);

describe('pointOfSailArcs', () => {
  it('M102 close-hauled on starboard: 12 arcs, one current, 305 to 320', () => {
    const arcs = pointOfSailArcs(0, 45);
    expect(arcs).toHaveLength(12);
    const now = arcs.filter((arc) => arc.current);
    expect(now).toHaveLength(1);
    expect(now[0]).toMatchObject({
      id: 'close_hauled',
      side: 'starboard',
      fromBearingDeg: 305,
      toBearingDeg: 320,
    });
  });

  it('M102 broad reach on port: 190 to 240', () => {
    const now = current(90, -120);
    expect(now).toHaveLength(1);
    expect(now[0]).toMatchObject({
      id: 'broad_reach',
      side: 'port',
      fromBearingDeg: 190,
      toBearingDeg: 240,
    });
  });

  it('M102 head to wind: no-go, starboard, 320 to 0', () => {
    const now = current(0, 0);
    expect(now).toHaveLength(1);
    expect(now[0]).toMatchObject({
      id: 'no_go',
      side: 'starboard',
      fromBearingDeg: 320,
      toBearingDeg: 0,
    });
  });

  it('M102 dead run: run, starboard, 180 to 210', () => {
    const now = current(0, 180);
    expect(now).toHaveLength(1);
    expect(now[0]).toMatchObject({
      id: 'run',
      side: 'starboard',
      fromBearingDeg: 180,
      toBearingDeg: 210,
    });
  });

  it('M102 the heading bearing lies on the current arc', () => {
    const wrap = (x: number) => ((x % 360) + 360) % 360;
    for (const windFrom of [0, 137, 300]) {
      for (const twa of [1, 45, 90, 135, 179, -1, -45, -90, -179]) {
        const now = current(windFrom, twa);
        expect(now).toHaveLength(1);
        const arc = now[0] as NonNullable<(typeof now)[number]>;
        const heading = wrap(windFrom - twa);
        const length = wrap(arc.toBearingDeg - arc.fromBearingDeg);
        const offset = wrap(heading - arc.fromBearingDeg);
        expect(offset).toBeLessThanOrEqual(length);
      }
    }
  });

  it('M102 the 12 arcs cover the full circle once', () => {
    for (const windFrom of [0, 137, 300]) {
      const total = pointOfSailArcs(windFrom, 45).reduce(
        (sum, arc) => sum + ((((arc.toBearingDeg - arc.fromBearingDeg) % 360) + 360) % 360),
        0,
      );
      expect(total).toBeCloseTo(360, 9);
    }
  });
});
