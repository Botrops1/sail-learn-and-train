import { describe, expect, it } from 'vitest';
import { knToMps, wrap180 } from '../src/model/angles';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import { rightingMomentNm, rollDamping, rollInertia } from '../src/model/heel';
import { sheetLoads } from '../src/model/sheetLoads';
import { steadyState } from '../src/model/motion';
import { initialRig } from '../src/model/sim';
import { act, best, bestSpeedKn, initialState, run, trimmed } from './motionHelpers';

describe('righting moment, inertia, damping', () => {
  it('is the manual’s 98.3 kNm at 30°, signed like the heel, and rises up to 60°', () => {
    expect(Math.abs(rightingMomentNm(30) - 98300)).toBeLessThan(1);
    expect(Math.abs(rightingMomentNm(-30) + 98300)).toBeLessThan(1);
    expect(rightingMomentNm(0)).toBe(0);
    for (let heel = 5; heel <= 60; heel += 5) {
      expect(rightingMomentNm(heel)).toBeGreaterThan(rightingMomentNm(heel - 5));
    }
    expect(rightingMomentNm(75)).toBeCloseTo(rightingMomentNm(60), 6);
  });

  it('roll inertia is about 52,000 kg·m² and the damping about 2·ζ·√(I·k0)', () => {
    expect(rollInertia()).toBeGreaterThan(51000);
    expect(rollInertia()).toBeLessThan(53500);
    const k0 = 208600;
    const zeta = boat.physics.heel.rollDampingRatio;
    expect(Math.abs(rollDamping() / (2 * zeta * Math.sqrt(rollInertia() * k0)) - 1)).toBeLessThan(
      0.01,
    );
  });
});

describe('calibration bands with heel (best sheets)', () => {
  it('TWS 12, TWA 45: 6.0–7.1 kn with heel 14–21°', () => {
    const r = best(12, 45, true);
    expect(r.speedKn).toBeGreaterThanOrEqual(6.0);
    expect(r.speedKn).toBeLessThanOrEqual(7.1);
    expect(r.heelDeg).toBeGreaterThanOrEqual(14);
    expect(r.heelDeg).toBeLessThanOrEqual(21);
  });

  it('TWS 12, TWA 90: 7.6–8.7 kn', () => {
    const speed = bestSpeedKn(12, 90, true);
    expect(speed).toBeGreaterThanOrEqual(7.6);
    expect(speed).toBeLessThanOrEqual(8.7);
  });

  it('TWS 20, TWA 45: 7.3–8.5 kn with heel 25–36°', () => {
    const r = best(20, 45, true);
    expect(r.speedKn).toBeGreaterThanOrEqual(7.3);
    expect(r.speedKn).toBeLessThanOrEqual(8.5);
    expect(r.heelDeg).toBeGreaterThanOrEqual(25);
    expect(r.heelDeg).toBeLessThanOrEqual(36);
  });

  it('wind from starboard heels her to port (heel < 0) and from port to starboard', () => {
    expect(steadyState(trimmed(12, 60, 25, 50), 0, undefined, { heel: true }).heelDeg).toBeLessThan(
      -5,
    );
    expect(
      steadyState(trimmed(12, -60, 25, 50), 0, undefined, { heel: true }).heelDeg,
    ).toBeGreaterThan(5);
  });
});

describe('PT-25 heel grows with the wind force on the sails', () => {
  const heelOf = (main: number, furl = 100) => {
    const controls = { ...trimmed(20, 60, main, 25), ctl_main_furl: furl };
    return Math.abs(steadyState(controls, 0, undefined, { heel: true }).heelDeg);
  };

  it('PT-25 easing the main sheet reduces the heel', () => {
    expect(heelOf(60)).toBeLessThan(heelOf(25));
  });

  it('PT-25 rolling part of the main away reduces the heel', () => {
    expect(heelOf(25, 50)).toBeLessThan(heelOf(25, 100));
  });
});

describe('PT-29 heel reduces drive and makes weather helm', () => {
  it('PT-29 the best steady speed at TWS 20, TWA 45 is lower with heel than without', () => {
    const heeled = bestSpeedKn(20, 45, true);
    const upright = bestSpeedKn(20, 45, false);
    expect(heeled).toBeLessThan(upright);
  });

  it('PT-29 holding TWA 50 the autopilot needs more rudder at 20 kn than at 10 kn', () => {
    const steadyRudder = (tws: number) => {
      let s = initialState({
        controls: {
          ctl_wind_dir: 0,
          ctl_wind_speed: tws,
          ctl_mainsheet: 15,
          ctl_jib_sheet: 20,
        },
        boat: { headingDeg: 310 },
        autopilot: { mode: 'wind', targetDeg: 50, integralDeg: 0 },
      });
      s = run(s, 90);
      return Math.abs(s.rig.applied.rudder);
    };
    expect(steadyRudder(20)).toBeGreaterThan(steadyRudder(10));
  });
});

describe('PT-32 overpowered boats round up', () => {
  const start = () =>
    initialState({
      controls: {
        ctl_wind_dir: 0,
        ctl_wind_speed: 18,
        ctl_mainsheet: 15,
        ctl_jib_sheet: 20,
      },
      boat: { headingDeg: 310 },
      autopilot: { mode: 'heading', targetDeg: 310, integralDeg: 0 },
    });

  it('PT-32 a gust to 28 kn with the main sheeted hard turns her into the wind by herself', () => {
    let s = run(start(), 60);
    expect(Math.abs(wrap180(s.boat.headingDeg - 310))).toBeLessThan(5);
    s = act(s, { type: 'setControls', values: { ctl_wind_speed: 28 } });
    let roundUp = false;
    s = run(s, 30, 60, (state) => {
      if (state.motion?.roundUp) roundUp = true;
      return state;
    });
    const twa = wrap180(s.controls.ctl_wind_dir - s.boat.headingDeg);
    expect(twa).toBeLessThan(40);
    expect(roundUp).toBe(true);
  });

  it('PT-32 easing the main sheet in the gust stops it: she holds her course', () => {
    let s = run(start(), 60);
    s = act(s, { type: 'setControls', values: { ctl_wind_speed: 28 } });
    s = run(s, 2);
    s = act(s, { type: 'setControls', values: { ctl_mainsheet: 50 } });
    s = run(s, 28);
    expect(Math.abs(wrap180(s.boat.headingDeg - 310))).toBeLessThan(5);
  });
});

describe('PT-36 top speed', () => {
  it('PT-36 with heel, 30 kn of wind gives at most 11 kn on any point of sail', () => {
    for (const twa of [60, 90, 110, 135]) {
      expect(bestSpeedKn(30, twa, true), `TWA ${twa}`).toBeLessThanOrEqual(11.0);
    }
  });

  it('PT-36 on a beam reach more wind gives less and less extra speed', () => {
    const at = (tws: number) => bestSpeedKn(tws, 90, true);
    expect(at(30) - at(20)).toBeLessThan(at(20) - at(12));
  });
});

describe('sheet loads from the sail forces', () => {
  it('wind 12 kn from 90°, Held still, main sheet 40: the main sheet rope carries 200–700 N', () => {
    const rig = initialRig(trimmed(12, 90, 40, 100));
    const loads = sheetLoads(rig, rig.forces);
    expect(loads.mainSheetRopeN).toBeGreaterThan(200);
    expect(loads.mainSheetRopeN).toBeLessThan(700);
    expect(loads.mainSheetBlocksN).toBeCloseTo(loads.mainSheetRopeN * 4, 6);
  });

  it('the jib sheet carries load only when it is taut', () => {
    const taut = initialRig(trimmed(12, 90, 40, 100));
    expect(taut.jibSolution.sheet.state).toBe('taut');
    expect(sheetLoads(taut, taut.forces).jibSheetRopeN).toBeGreaterThan(0);
    // Head to wind the jib streams and its sheet hangs slack.
    const slack = initialRig({ ...defaultControls(), ctl_wind_dir: 0, ctl_wind_speed: 12 });
    expect(slack.jibSolution.sheet.state).not.toBe('taut');
    expect(sheetLoads(slack, slack.forces).jibSheetRopeN).toBe(0);
  });

  it('a faster wind raises the loads (a gust)', () => {
    const light = initialRig(trimmed(8, 90, 40, 100));
    const strong = initialRig(trimmed(16, 90, 40, 100));
    expect(sheetLoads(strong, strong.forces).mainSheetRopeN).toBeGreaterThan(
      2 * sheetLoads(light, light.forces).mainSheetRopeN,
    );
  });

  it('the boat moving makes its own wind: the same true wind loads the sheets more upwind', () => {
    const controls = trimmed(12, 45, 12, 0);
    const still = initialRig(controls);
    const moving = initialRig(
      controls,
      undefined,
      {},
      { velocity: [knToMps(6), 0, 0], headingDeg: 0 },
    );
    expect(moving.forces.main.liftN).toBeGreaterThan(still.forces.main.liftN);
  });
});
