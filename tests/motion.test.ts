import { describe, expect, it } from 'vitest';
import { mpsToKn, knToMps } from '../src/model/angles';
import { hullResistance } from '../src/model/hullResistance';
import { best, bestSpeedKn } from './motionHelpers';

const R = (kn: number) => hullResistance(knToMps(kn), 0, 0, 0).totalN / 1000;

describe('resistance reference values (no side force, upright, rudder 0)', () => {
  const cases: [number, number][] = [
    [4, 0.56],
    [6, 1.36],
    [8, 3.27],
    [8.9, 5.04],
    [9, 5.32],
    [10, 9.52],
  ];
  for (const [kn, kilonewtons] of cases) {
    it(`${kn} kn is ${kilonewtons} kN (±3 %)`, () => {
      expect(Math.abs(R(kn) / kilonewtons - 1)).toBeLessThan(0.03);
    });
  }

  it('PT-36 hull speed wall: the resistance climbs steeply past 8.9 kn', () => {
    expect(R(10) / R(8.9)).toBeGreaterThan(1.6);
    expect(R(8.9) / R(6)).toBeGreaterThan(3);
  });
});

describe('calibration bands (no heel, best sheets)', () => {
  const cases: [number, number, number, number][] = [
    [12, 45, 6.3, 7.4],
    [12, 90, 7.7, 8.8],
    [12, 135, 5.6, 6.7],
    [12, 175, 4.8, 5.9],
    [6, 90, 4.9, 5.9],
  ];
  for (const [tws, twa, low, high] of cases) {
    it(`TWS ${tws}, TWA ${twa}: ${low}–${high} kn`, () => {
      const speed = bestSpeedKn(tws, twa);
      expect(speed).toBeGreaterThanOrEqual(low);
      expect(speed).toBeLessThanOrEqual(high);
    });
  }
});

describe('PT-21 no-go zone and PT-22 easing', () => {
  it('PT-21 she hardly moves 20° off the wind and sails well at 45°', () => {
    expect(bestSpeedKn(12, 20)).toBeLessThan(1.5);
    expect(bestSpeedKn(12, 45)).toBeGreaterThan(2 * bestSpeedKn(12, 25));
  });

  it('PT-22 the best main sheet does not decrease from close-hauled to a run', () => {
    const closeHauled = best(12, 45).main;
    const beam = best(12, 90).main;
    const broad = best(12, 135).main;
    expect(beam).toBeGreaterThanOrEqual(closeHauled);
    expect(broad).toBeGreaterThanOrEqual(beam);
    console.log('best main sheet', closeHauled, beam, broad, mpsToKn(0));
  });
});
