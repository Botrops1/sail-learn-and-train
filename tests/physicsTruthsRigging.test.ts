import { describe, expect, it } from 'vitest';
import { mpsToKn } from '../src/model/angles';
import { defaultControls, type Controls } from '../src/model/controls';
import {
  gennakerTrimState,
  leewardSide,
  solveGennaker,
  type GennakerSetup,
} from '../src/model/gennaker';
import { steadyState } from '../src/model/motion';
import { initialRig } from '../src/model/sim';
import { bestSpeedKn, best } from './motionHelpers';

/**
 * PHASE_RIGGING_SPEC 8.4: the gennaker's bands, run against the real `steadyState`.
 * PT-67 (a gennaker pays), PT-68 (trim to the curl), PT-70 (the sock).
 */
const MAINSHEETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const GENNAKER_SHEETS = Array.from({ length: 21 }, (_, i) => i * 5);

function setupFor(twaDeg: number): GennakerSetup {
  return { stage: 4, side: leewardSide(twaDeg), crossS: 0, crossFromDeg: 0 };
}

function controlsFor(tws: number, twa: number, ms: number, gs: number, gu = 100): Controls {
  return {
    ...defaultControls(),
    ctl_wind_dir: twa,
    ctl_wind_speed: tws,
    ctl_mainsheet: ms,
    ctl_jib_furl: 0,
    ctl_gennaker_sheet: gs,
    ctl_gennaker_sock: gu,
  };
}

function run(tws: number, twa: number, ms: number, gs: number, gu = 100) {
  const controls = controlsFor(tws, twa, ms, gs, gu);
  const setup = setupFor(twa);
  const steady = steadyState(controls, 0, undefined, { heel: true, gennaker: setup });
  const rig = initialRig(
    controls,
    undefined,
    {},
    { velocity: [steady.speedMps, 0, 0], headingDeg: 0, heelDeg: steady.heelDeg },
    undefined,
    setup,
  );
  return {
    speedKn: mpsToKn(steady.speedMps),
    heelDeg: Math.abs(steady.heelDeg),
    rig,
    state: gennakerTrimState(setup, rig.gennaker),
  };
}

function bestWith(tws: number, twa: number) {
  let result = { speedKn: -Infinity, ms: 0, gs: 0 };
  for (const ms of MAINSHEETS) {
    for (const gs of GENNAKER_SHEETS) {
      const r = run(tws, twa, ms, gs);
      if (r.speedKn > result.speedKn) result = { speedKn: r.speedKn, ms, gs };
    }
  }
  return result;
}

describe('PT-67 a gennaker pays on a broad reach', () => {
  it('PT-67 a gennaker pays on a broad reach', () => {
    const with120 = bestWith(12, 120);
    expect(with120.speedKn).toBeGreaterThanOrEqual(8.9);
    expect(with120.speedKn).toBeLessThanOrEqual(9.5);
    const without = bestSpeedKn(12, 120, true);
    expect(without).toBeGreaterThanOrEqual(6.8);
    expect(without).toBeLessThanOrEqual(7.35);
    const gain150 = bestWith(12, 150).speedKn - bestSpeedKn(12, 150, true);
    expect(gain150).toBeGreaterThanOrEqual(1.6);
  });

  it('PT-67 too close to the wind the gennaker is slower and overpowers', () => {
    const base = best(12, 60, true);
    expect(bestWith(12, 60).speedKn).toBeLessThanOrEqual(base.speedKn - 1.2);
    const gennaker = run(18, 75, 40, 0);
    expect(gennaker.heelDeg).toBeGreaterThanOrEqual(40);
    expect(gennaker.heelDeg).toBeLessThanOrEqual(48);
    const baseHeel = steadyState(
      {
        ...defaultControls(),
        ctl_wind_dir: 75,
        ctl_wind_speed: 18,
        ctl_mainsheet: 40,
        ctl_jib_sheet: 100,
      },
      0,
      undefined,
      { heel: true },
    );
    expect(gennaker.heelDeg).toBeGreaterThanOrEqual(Math.abs(baseHeel.heelDeg) + 15);
  });

  it('PT-67 dead downwind the main hides it', () => {
    const r = run(12, 180, 100, 50);
    expect(r.rig.gennaker.fill).toBeGreaterThanOrEqual(0.09);
    expect(r.rig.gennaker.fill).toBeLessThanOrEqual(0.11);
    expect(r.state).toBe('blanketed');
    const gain = bestWith(12, 180).speedKn - bestSpeedKn(12, 180, true);
    expect(gain).toBeLessThanOrEqual(0.8);
  });
});

describe('PT-68 trim to the curl', () => {
  it('PT-68 trim to the curl', () => {
    const setup = setupFor(120);
    let curl = -1;
    for (let gs = 0; gs <= 100; gs += 1) {
      if (solveGennaker(setup, gs, 100, 74).fill < 0.5) {
        curl = gs;
        break;
      }
    }
    expect(curl).toBe(42);
    const best120 = run(12, 120, 60, 25);
    expect(best120.speedKn).toBeGreaterThanOrEqual(8.9);
    const nearCurl = run(12, 120, 60, curl - 15);
    expect(nearCurl.speedKn).toBeGreaterThanOrEqual(0.97 * best120.speedKn);
    const hard = run(12, 120, 60, 0);
    expect(hard.speedKn).toBeGreaterThanOrEqual(8.3);
    expect(hard.speedKn).toBeLessThanOrEqual(8.85);
    expect(hard.state).toBe('stalled');
    expect(hard.heelDeg).toBeGreaterThan(run(12, 120, 60, 30).heelDeg);
  });
});

describe('PT-70 the sock', () => {
  it('PT-70 the sock: down is no sail', () => {
    const down = run(12, 120, 60, 25, 0);
    expect(down.rig.forces.gennaker.areaM2).toBe(0);
    expect(down.rig.forces.gennaker.driveN).toBe(0);
    expect(down.state).toBe('snuffed');
    const half = run(12, 120, 60, 25, 50);
    expect(half.rig.forces.gennaker.areaM2).toBeCloseTo(100, 6);
  });
});
