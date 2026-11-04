import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import { twaSignedDeg } from '../src/model/exercises';
import { mpsToKn } from '../src/model/angles';
import { buoyPilot } from './harbourPilot';
import { MARINA_LAYOUT_IDS, marinaGeometry } from '../src/model/marina';
import { gybeArrived, gybeStep, windTorqueNm, type GybeSwing } from '../src/model/gybe';
import type { RealisticAction } from '../src/model/realistic';

function run(state: AppState, seconds: number): AppState {
  let next = state;
  for (let i = 0; i < Math.round(seconds / 0.05); i += 1) {
    next = reduce(next, { type: 'step', dt: 0.05 });
  }
  return next;
}

function gybeFrom(mainsheet: number): AppState {
  const start = parseUrlState(
    `?wd=0&ws=12&hdg=195&ms=${mainsheet}&js=50&ap=wind&apt=165&sea=flat`,
    initialState().settings.detail,
  );
  const settled = run(start, 15);
  return run(reduce(settled, { type: 'autopilot', command: 'tack' }), 30);
}

describe('Phase 10 rules (PHASE10_SPEC 9.6)', () => {
  it('PT-58 a controlled gybe starts with the main hauled in: hauled in the boom moves a short way and the load is small, left out it swings across with a large load', () => {
    const hauled = gybeFrom(5).rig.lastGybe;
    expect(hauled).not.toBeNull();
    expect(hauled?.accidental).toBe(false);
    expect(hauled?.peakRopeN).toBeLessThan(1000);

    const left = gybeFrom(100).rig.lastGybe;
    expect(left).not.toBeNull();
    expect(left?.accidental).toBe(true);
    expect(left?.peakRopeN).toBeGreaterThan(2000);
  });

  it('PT-59 roll the main out head to wind: rolling it out 60° off the wind is reported', () => {
    const W = 'winch_primary_starboard';
    const real = (state: AppState, action: RealisticAction): AppState =>
      reduce(state, { type: 'realistic', action });
    const setup = parseUrlState(exerciseStartLink('set-sails', initialState(), 'realistic'));
    let s = reduce(
      reduce(setup, { type: 'exercise', command: { options: { pauseOnMistake: false } } }),
      { type: 'exercise', command: 'start' },
    );
    // Step 1 passes by itself, head to wind; then she is turned 60° away before the main comes out.
    while (s.exercise?.step === 0) s = reduce(s, { type: 'step', dt: 0.05 });
    s = reduce(s, { type: 'autopilot', command: { turnDeg: -60 } });
    s = run(s, 20);
    const before = s.exercise?.log.length ?? 0;
    s = real(s, { type: 'station', station: 'starboard' });
    s = real(s, { type: 'clutch', key: 'a2', open: true });
    s = real(s, { type: 'onWinch', key: 'a3' });
    for (let i = 0; i < 3; i += 1) s = real(s, { type: 'turn', winch: W, delta: 1 });
    s = real(s, { type: 'selfTailer', winch: W, into: true });
    s = real(s, { type: 'button', winch: W, held: true });
    const from = s.exercise?.elapsedS ?? 0;
    let found = -1;
    for (let i = 0; i < 200 && found < 0; i += 1) {
      s = reduce(s, { type: 'step', dt: 0.05 });
      const log = s.exercise?.log ?? [];
      if (log.slice(before).some((e) => e.kind === 'mistake' && e.mistakeId === 'main-off-wind')) {
        found = (s.exercise?.elapsedS ?? 0) - from;
      }
    }
    expect(found).toBeGreaterThan(0);
    expect(found).toBeLessThan(10);
  });
});

describe('PT-60 what pushes the boom across in a gybe (PHASE10_SPEC 14.6)', () => {
  it('PT-60 by the lee with the boom let out, the steady wind holds the boom out', () => {
    expect(windTorqueNm(165, 72, 15, 1, 0)).toBeGreaterThan(0);
    expect(windTorqueNm(-165, -72, 15, 1, 0)).toBeLessThan(0);
  });

  it('PT-60 without a start, a boom let out is not thrown across', () => {
    const noStart = {
      ...boat,
      physics: {
        ...boat.physics,
        gybe: { ...boat.physics.gybe, startPushFactor: 0 },
      },
    };
    let s: GybeSwing = { thetaDeg: 72, omegaDegS: 0, startDeg: 72, stopDeg: -72 };
    for (let i = 0; i < 8000; i += 1) {
      s = gybeStep(s, 165, 15, 1, 0, 0.001, noStart);
      expect(gybeArrived(s)).toBe(false);
    }
    expect(s.thetaDeg).toBeGreaterThanOrEqual(72);
  });

  it('PT-60 once past the line of the wind, the wind throws the boom across', () => {
    expect(windTorqueNm(165, 10, 15, 1, 0)).toBeLessThan(0);
    expect(windTorqueNm(165, -40, 15, 1, 0)).toBeLessThan(0);
  });

  it('PT-60 the start is the slow part', () => {
    let s: GybeSwing = { thetaDeg: 72, omegaDegS: 0, startDeg: 72, stopDeg: -72 };
    let t = 0;
    let tLine = -1;
    let omegaLine = 0;
    while (!gybeArrived(s) && t < 30) {
      s = gybeStep(s, 165, 15, 1, 0, 0.001);
      t += 0.001;
      if (tLine < 0 && s.thetaDeg <= 15) {
        tLine = t;
        omegaLine = s.omegaDegS;
      }
    }
    const timeShare = tLine / t;
    expect(timeShare).toBeGreaterThan(0.62);
    expect(timeShare).toBeLessThan(0.76);
    const rateShare = omegaLine / s.omegaDegS;
    expect(rateShare).toBeGreaterThan(0.6);
    expect(rateShare).toBeLessThan(0.78);
  });
});

describe('PT-61', () => {
  it('PT-61 coming in from the sea the red light is on the left', () => {
    for (const layout of MARINA_LAYOUT_IDS) {
      const g = marinaGeometry(layout, 'half');
      // The entrance faces west, so a boat coming in heads east (090): north is on her left.
      const middle = (g.entrance.southM + g.entrance.northM) / 2;
      expect(g.lights.red[1]).toBeGreaterThan(middle);
      expect(g.lights.green[1]).toBeLessThan(middle);
      expect(Math.abs(g.lights.red[0] - g.entrance.eastM)).toBeLessThanOrEqual(12);
      expect(Math.abs(g.lights.green[0] - g.entrance.eastM)).toBeLessThanOrEqual(12);
    }
  });
});

describe('PT-62', () => {
  it('PT-62 the buoy is picked up into the wind', () => {
    let s = parseUrlState(exerciseStartLink('mooring-buoy', initialState(), 'easy'));
    s = reduce(s, { type: 'exercise', command: 'start' });
    const pilot = buoyPilot();
    let t = 0;
    let passed: AppState | null = null;
    while (t < 400 && s.exercise?.status === 'running' && passed === null) {
      s = pilot(s, t);
      s = reduce(s, { type: 'step', dt: 0.05 });
      t += 0.05;
      if (s.exercise !== null && s.exercise.step > 0) passed = s;
    }
    expect(passed).not.toBeNull();
    const at = passed as AppState;
    expect(Math.abs(twaSignedDeg(at))).toBeLessThanOrEqual(30);
    expect(mpsToKn(Math.abs(at.boat.speedMps))).toBeLessThanOrEqual(0.5);
    // The next frame's `line bl take` is accepted: the bow line is on.
    const next = reduce(pilot(at, t), { type: 'step', dt: 0.05 });
    expect(next.lines.lines.some((l) => l.code === 'bl')).toBe(true);
  });
});
