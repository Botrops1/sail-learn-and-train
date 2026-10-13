import { describe, expect, it } from 'vitest';
import { createStore, initialState as appInitialState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { mpsToKn } from '../src/model/angles';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import {
  engineThrustN,
  gearOf,
  initialEngine,
  stepEngine,
  targetRpm,
  type EngineState,
} from '../src/model/engine';
import { steadyState } from '../src/model/motion';
import { JIB_SHEETS, MAIN_SHEETS, act, initialState, run, trimmed } from './motionHelpers';

const E = boat.physics.engine;

/** Calm water, wheel centred (heading held), from rest, engine running with `lever`. 300 s: the speed has settled (idle is
 * still creeping up at 120 s: 3.01 kn, against 3.25 kn settled), as the spec asks for the steady speed. */
function motoring(leverPct: number, seconds = 300) {
  let s = initialState({
    controls: { ctl_wind_speed: 0 },
    boat: { speedMps: 0 },
    autopilot: { mode: 'off', targetDeg: 0, integralDeg: 0 },
    engine: { running: true, leverPct },
  });
  s = run(s, seconds, 20);
  return { speedKn: mpsToKn(s.boat.speedMps), state: s };
}

describe('engine model (PHASE2_SPEC 12.2)', () => {
  it('rpm target: idle in the neutral band, then linear to the maximum, both sides', () => {
    expect(targetRpm(0)).toBe(E.idleRpm);
    expect(targetRpm(E.neutralBandPct)).toBe(E.idleRpm);
    expect(targetRpm(-E.neutralBandPct)).toBe(E.idleRpm);
    expect(targetRpm(100)).toBe(E.maxRpm);
    expect(targetRpm(-100)).toBe(E.maxRpm);
    expect(targetRpm(66)).toBeCloseTo(1860, -1);
  });

  it('the gear follows the lever, with a neutral band', () => {
    expect(gearOf(11)).toBe('ahead');
    expect(gearOf(10)).toBe('neutral');
    expect(gearOf(-10)).toBe('neutral');
    expect(gearOf(-11)).toBe('astern');
  });

  it('rpm lags to the target while running and falls to 0 when stopped', () => {
    let e = initialEngine({ running: true, leverPct: 0 });
    e = { ...e, leverPct: 100 };
    e = stepEngine(e, 1);
    expect(e.rpm).toBeGreaterThan(E.idleRpm);
    expect(e.rpm).toBeLessThan(E.maxRpm);
    for (let i = 0; i < 100; i += 1) e = stepEngine(e, 0.1);
    expect(e.rpm).toBeCloseTo(E.maxRpm, 0);
    e = { ...e, running: false };
    for (let i = 0; i < 200; i += 1) e = stepEngine(e, 0.1);
    expect(e.rpm).toBeLessThan(1);
  });

  it('thrust: 0 when stopped or in neutral; ahead and astern follow the formula', () => {
    const full: EngineState = {
      running: true,
      leverPct: 100,
      rpm: E.maxRpm,
      gear: 'ahead',
      shiftS: 0,
    };
    expect(engineThrustN(full)).toBeCloseTo(E.maxThrustN, 6);
    expect(engineThrustN({ ...full, running: false })).toBe(0);
    expect(engineThrustN({ ...full, gear: 'neutral' })).toBe(0);
    expect(engineThrustN({ ...full, gear: 'astern' })).toBeCloseTo(
      -E.maxThrustN * E.asternThrustFactor,
      6,
    );
  });
});

describe('engine in calm water (PHASE2_SPEC 12.5)', () => {
  it('idle ahead gives 3.0–3.7 kn', () => {
    const { speedKn } = motoring(11);
    expect(speedKn).toBeGreaterThan(3.0);
    expect(speedKn).toBeLessThan(3.7);
  });

  it('about 1,860 rpm (lever 66) gives 7.6–8.4 kn', () => {
    const { speedKn, state } = motoring(66);
    expect(state.engine.rpm).toBeGreaterThan(1850);
    expect(state.engine.rpm).toBeLessThan(1870);
    expect(speedKn).toBeGreaterThan(7.6);
    expect(speedKn).toBeLessThan(8.4);
  });

  it('full ahead gives 9.0–9.8 kn', () => {
    const { speedKn } = motoring(100);
    expect(speedKn).toBeGreaterThan(9.0);
    expect(speedKn).toBeLessThan(9.8);
  });

  it('full astern gives 4.5–5.7 kn astern', () => {
    const { speedKn } = motoring(-100);
    expect(speedKn).toBeLessThan(-4.5);
    expect(speedKn).toBeGreaterThan(-5.7);
  });

  it('neutral, or stopped with the lever ahead: no thrust, she does not move', () => {
    expect(Math.abs(motoring(0, 30).speedKn)).toBeLessThan(0.05);
    const stopped = run(
      initialState({
        controls: { ctl_wind_speed: 0 },
        boat: { speedMps: 0 },
        engine: { running: false, leverPct: 100 },
      }),
      30,
      20,
    );
    expect(Math.abs(stopped.boat.speedMps)).toBe(0);
    expect(engineThrustN(stopped.engine)).toBe(0);
  });

  it('lever from +100 to −100 at once: thrust 0 for the gear shift delay, then astern', () => {
    let e = initialEngine({ running: true, leverPct: 100 });
    expect(e.gear).toBe('ahead');
    e = { ...e, leverPct: -100 };
    const dt = 0.05;
    let neutralS = 0;
    let first = true;
    for (let i = 0; i < 200; i += 1) {
      e = stepEngine(e, dt);
      if (e.gear === 'neutral') {
        expect(engineThrustN(e)).toBe(0);
        neutralS += dt;
      } else {
        if (first) expect(e.gear).toBe('astern');
        first = false;
      }
    }
    expect(neutralS).toBeGreaterThanOrEqual(E.gearShiftDelayS - 1e-9);
    expect(neutralS).toBeLessThan(E.gearShiftDelayS + 2 * dt);
    expect(e.gear).toBe('astern');
    expect(engineThrustN(e)).toBeLessThan(0);
  });

  it('a finger dragging the lever through the middle waits in neutral just as a jump does', () => {
    // Review of the M12 PR: lever 60 → 20 → 5 → −30, frame by frame at 60 fps. Once the gearbox
    // leaves ahead it stays out of gear for the shift delay, however the lever moves.
    let e = initialEngine({ running: true, leverPct: 60 });
    const dt = 1 / 60;
    const path = [60, 20, 5, -30];
    let neutralFrames = 0;
    let engagedAt = -1;
    let frame = 0;
    for (const leverPct of path) {
      e = stepEngine({ ...e, leverPct }, dt);
      frame += 1;
      if (e.gear === 'neutral') neutralFrames += 1;
      else if (leverPct < 0 && engagedAt < 0) engagedAt = frame;
    }
    expect(e.gear).toBe('neutral');
    expect(engagedAt).toBe(-1);
    expect(engineThrustN(e)).toBe(0);
    for (let i = 0; i < 120; i += 1) {
      e = stepEngine({ ...e, leverPct: -30 }, dt);
      frame += 1;
      if (e.gear === 'neutral') neutralFrames += 1;
      else if (engagedAt < 0) engagedAt = frame;
    }
    // In neutral from the frame the lever reached the band (frame 3) until the delay had run out.
    expect(neutralFrames * dt).toBeGreaterThanOrEqual(E.gearShiftDelayS - dt);
    expect(neutralFrames * dt).toBeLessThan(E.gearShiftDelayS + 2 * dt);
    expect(e.gear).toBe('astern');
    expect(engineThrustN(e)).toBeLessThan(0);
  });

  it('after sitting in neutral for the shift delay, a gear goes in at once', () => {
    let e = initialEngine({ running: true, leverPct: 0 });
    for (let i = 0; i < 40; i += 1) e = stepEngine(e, 1 / 60);
    e = stepEngine({ ...e, leverPct: 50 }, 1 / 60);
    expect(e.gear).toBe('ahead');
    // But a gear that was only just left is not engaged again at once.
    e = stepEngine({ ...e, leverPct: 5 }, 1 / 60);
    e = stepEngine({ ...e, leverPct: 50 }, 1 / 60);
    expect(e.gear).toBe('neutral');
  });

  it('moving the lever into the neutral band shifts to neutral at once', () => {
    let e = initialEngine({ running: true, leverPct: 100 });
    e = stepEngine({ ...e, leverPct: 5 }, 0.05);
    expect(e.gear).toBe('neutral');
    expect(engineThrustN(e)).toBe(0);
  });
});

describe('motor-sailing', () => {
  /** The steady speed with the engine at about 1,860 rpm: the best sail trim of the sheet grid. */
  function bestWith(thrustN: number, furled: boolean): number {
    let best = -Infinity;
    for (const main of MAIN_SHEETS) {
      for (const jib of JIB_SHEETS) {
        const controls = {
          ...trimmed(12, 60, main, jib),
          ...(furled ? { ctl_main_furl: 0, ctl_jib_furl: 0 } : {}),
        };
        const steady = steadyState(controls, 0, undefined, { heel: true, engineThrustN: thrustN });
        best = Math.max(best, mpsToKn(steady.speedMps));
        if (furled) return best;
      }
    }
    return best;
  }

  it('TWS 12, TWA 60: best sails + about 1,860 rpm beats either alone and stays ≤ 11 kn', () => {
    const thrust = engineThrustN(initialEngine({ running: true, leverPct: 66 }));
    const both = bestWith(thrust, false);
    const sailsOnly = bestWith(0, false);
    const engineOnly = bestWith(thrust, true);
    expect(both).toBeGreaterThan(sailsOnly);
    expect(both).toBeGreaterThan(engineOnly);
    expect(both).toBeLessThanOrEqual(11);
  });
});

describe('PT-35 with the engine', () => {
  it('PT-35 engine stopped: a stopped boat still does not answer the wheel', () => {
    const s = run(
      initialState({
        controls: { ctl_wind_speed: 0, ctl_rudder: 35 },
        boat: { speedMps: 0 },
        autopilot: { mode: 'off', targetDeg: 0, integralDeg: 0 },
        engine: { running: false, leverPct: 0 },
      }),
      10,
    );
    expect(
      Math.abs(s.boat.headingDeg > 180 ? s.boat.headingDeg - 360 : s.boat.headingDeg),
    ).toBeLessThan(0.5);
  });

  it('PT-35 engine at idle ahead and no wind: the rudder turns her', () => {
    const s = run(
      initialState({
        controls: { ctl_wind_speed: 0, ctl_rudder: 20 },
        boat: { speedMps: 0 },
        autopilot: { mode: 'off', targetDeg: 0, integralDeg: 0 },
        engine: { running: true, leverPct: 11 },
      }),
      30,
      20,
    );
    expect(mpsToKn(s.boat.speedMps)).toBeGreaterThan(1);
    const heading = s.boat.headingDeg > 180 ? s.boat.headingDeg - 360 : s.boat.headingDeg;
    expect(Math.abs(heading)).toBeGreaterThan(10);
  });
});

describe('autopilot astern (decided in the M12 PR)', () => {
  const base = {
    controls: { ctl_wind_speed: 0 },
    autopilot: { mode: 'heading' as const, targetDeg: 30, integralDeg: 0 },
  };

  it('steers while she goes ahead but not while she goes astern', () => {
    const ahead = run(initialState({ ...base, boat: { speedMps: 1.5 } }), 3, 20);
    expect(Math.abs(ahead.controls.ctl_rudder)).toBeGreaterThan(1);
    const astern = run(initialState({ ...base, boat: { speedMps: -1.5 } }), 3, 20);
    expect(astern.controls.ctl_rudder).toBe(0);
    expect(astern.autopilot.mode).toBe('heading');
  });
});

describe('engine store and link', () => {
  it('start, stop and lever actions', () => {
    const store = createStore(appInitialState());
    expect(store.getState().engine.running).toBe(false);
    store.dispatch({ type: 'engine', command: 'start' });
    store.dispatch({ type: 'engine', command: { leverPct: 250 } });
    expect(store.getState().engine.running).toBe(true);
    expect(store.getState().engine.leverPct).toBe(100);
    store.dispatch({ type: 'engine', command: { leverPct: -33.4 } });
    expect(store.getState().engine.leverPct).toBe(-33);
    store.dispatch({ type: 'engine', command: 'stop' });
    expect(store.getState().engine.running).toBe(false);
  });

  it('the engine works in Held still but the boat does not move; Reset stops it', () => {
    let s = initialState({ boat: { mode: 'held' }, engine: { running: true, leverPct: 100 } });
    s = run(s, 10, 20);
    expect(s.boat.speedMps).toBe(0);
    expect(s.engine.rpm).toBeGreaterThan(2000);
    s = act(s, { type: 'reset' });
    expect(s.engine.running).toBe(false);
    expect(s.engine.leverPct).toBe(0);
  });

  it('a link with the engine running opens at the speed it gives', () => {
    const s = parseUrlState('?ws=0&eng=1&lv=66');
    expect(mpsToKn(s.boat.speedMps)).toBeGreaterThan(7.5);
    expect(mpsToKn(s.boat.speedMps)).toBeLessThan(8.5);
  });

  it('URL round trip of eng and lv', () => {
    for (const query of ['?ws=0&eng=1&lv=65', '?eng=1&lv=-100', '?lv=-40']) {
      const state = parseUrlState(query);
      const out = new URLSearchParams(serializeUrlState(state));
      const again = parseUrlState(serializeUrlState(state));
      expect(again.engine).toEqual(state.engine);
      expect(out.get('eng')).toBe(state.engine.running ? '1' : null);
    }
    expect(parseUrlState('?eng=1&lv=65').engine).toMatchObject({ running: true, leverPct: 65 });
    expect(parseUrlState('?lv=-40').engine.leverPct).toBe(-40);
  });

  it('defaults are not written; bad values fall back', () => {
    const out = new URLSearchParams(serializeUrlState(parseUrlState('')));
    expect(out.has('eng')).toBe(false);
    expect(out.has('lv')).toBe(false);
    const bad = parseUrlState('?eng=yes&lv=500');
    expect(bad.engine.running).toBe(false);
    expect(bad.engine.leverPct).toBe(0);
    expect(defaultControls().ctl_wind_speed).toBe(12);
  });
});
