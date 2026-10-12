import { describe, expect, it } from 'vitest';
import { compassDeg, interpTable, mpsToKn, knToMps, wrap180, wrap360 } from '../src/model/angles';
import { apparentWind } from '../src/model/apparentWind';
import { mapToBoat, modulo, waterShift } from '../src/model/mapFrame';

const V6 = knToMps(6);

describe('angles', () => {
  it('wraps to (−180, 180] and [0, 360)', () => {
    expect(wrap180(180)).toBe(180);
    expect(wrap180(-180)).toBe(180);
    expect(wrap180(190)).toBe(-170);
    expect(wrap180(-190)).toBe(170);
    expect(wrap180(720 + 45)).toBe(45);
    expect(wrap360(-90)).toBe(270);
    expect(wrap360(360)).toBe(0);
    expect(compassDeg(-60)).toBe(300);
  });

  it('converts knots and m/s', () => {
    expect(knToMps(1)).toBeCloseTo(0.514444, 6);
    expect(mpsToKn(knToMps(7.3))).toBeCloseTo(7.3, 9);
  });

  it('interpolates a table and clamps at both ends', () => {
    const table = [
      [0, 0],
      [10, 100],
      [20, 100],
    ] as const;
    expect(interpTable(table, -5)).toBe(0);
    expect(interpTable(table, 5)).toBe(50);
    expect(interpTable(table, 15)).toBe(100);
    expect(interpTable(table, 99)).toBe(100);
  });
});

describe('map frame', () => {
  it('puts a map offset in the boat frame (x forward, z starboard)', () => {
    const [x1, z1] = mapToBoat(1, 0, 90);
    expect(x1).toBeCloseTo(1, 12);
    expect(z1).toBeCloseTo(0, 12);
    const [x2, z2] = mapToBoat(1, 0, 0);
    expect(x2).toBeCloseTo(0, 12);
    expect(z2).toBeCloseTo(1, 12);
  });
});

describe('PT-20 apparent wind', () => {
  const cases: [string, number, number, number, number][] = [
    ['beam wind', 12, 90, 13.42, 63.43],
    ['wind from ahead', 12, 0, 18, 0],
    ['wind from astern', 12, 180, 6, 180],
    ['broad reach', 12, 135, 8.84, 106.3],
    ['wind from port', 12, -90, 13.42, -63.43],
  ];
  for (const [name, tws, twa, aws, awa] of cases) {
    it(`PT-20 ${name}: TWS ${tws}, TWA ${twa}, boat 6 kn → AWS ${aws}, AWA ${awa}`, () => {
      const result = apparentWind(tws, twa, V6);
      expect(Math.abs(result.awsKn - aws)).toBeLessThan(0.05);
      expect(Math.abs(result.awaDeg - awa)).toBeLessThan(0.1);
    });
  }

  it('PT-20 a boat that is not moving feels the true wind', () => {
    const result = apparentWind(12, 60, 0);
    expect(result.awsKn).toBeCloseTo(12, 9);
    expect(result.awaDeg).toBeCloseTo(60, 9);
  });

  it('PT-20 the apparent wind comes from further forward than the true wind', () => {
    for (const twa of [30, 60, 90, 120, 150]) {
      expect(apparentWind(12, twa, V6).awaDeg).toBeLessThan(twa);
      expect(apparentWind(12, -twa, V6).awaDeg).toBeGreaterThan(-twa);
    }
  });

  it('keeps the true angle when there is no wind at all', () => {
    expect(apparentWind(0, 70, 0).awaDeg).toBe(70);
  });
});

describe('world shift (water and grid)', () => {
  it('the grid steps back by the remainder of the position, so it streams past', () => {
    const shift = waterShift(5.5, -3, 2);
    expect(shift.x).toBeCloseTo(-1, 12); // north −3 → remainder 1
    expect(shift.z).toBeCloseTo(-1.5, 12); // east 5.5 → remainder 1.5
    expect(shift.centreNorthM).toBeCloseTo(-4, 12);
    expect(shift.centreEastM).toBeCloseTo(4, 12);
    expect(waterShift(0, 0, 2).x).toBeCloseTo(0, 12);
    expect(modulo(-0.5, 2)).toBeCloseTo(1.5, 12);
  });
});
