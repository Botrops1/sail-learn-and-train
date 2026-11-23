import { describe, expect, it } from 'vitest';
import { mpsToKn } from '../src/model/angles';
import { boat } from '../src/model/boat';
import { defaultControls, type Controls } from '../src/model/controls';
import {
  gennakerClew,
  gennakerTrimState,
  leewardSide,
  solveGennaker,
  type GennakerSetup,
} from '../src/model/gennaker';
import { steadyState } from '../src/model/motion';
import {
  codeZeroPicture,
  polePlanDeg,
  spinnakerPicture,
  travellerPicture,
} from '../src/model/pictures';
import { initialRig } from '../src/model/sim';
import { bestSpeedKn, best } from './motionHelpers';

/**
 * PHASE_RIGGING_SPEC 8.4: the gennaker's bands, run against the real `steadyState`.
 * PT-67 (a gennaker pays), PT-68 (trim to the curl), PT-70 (the sock); the pictures' PT-71, PT-72, PT-73.
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
    // Hauled right in, the main stops the sail (it cannot go through it): see the next test.
    expect(hard.speedKn).toBeGreaterThanOrEqual(8.9);
    expect(hard.speedKn).toBeLessThan(best120.speedKn);
    expect(hard.state).toBe('pressed');
    expect(hard.heelDeg).toBeGreaterThan(best120.heelDeg);
  });

  it('PT-68 trimmed too hard on a run of the sheet: stalled when the main is not in the way', () => {
    // Boom on the other side (or the main furled): nothing stops the clew, so it is plain stalled.
    const setup = setupFor(120);
    const noMain = { thetaDeg: 0, unfurled: 0 };
    const sol = solveGennaker(setup, 0, 100, 74, undefined, noMain);
    expect(sol.pressed).toBe(false);
    expect(gennakerTrimState(setup, sol)).toBe('stalled');
  });

  it('the gennaker never goes through the main (bug after M106)', () => {
    for (const side of [1, -1] as const) {
      const setup: GennakerSetup = { stage: 4, side, crossS: 0, crossFromDeg: 0 };
      for (let boom = -72; boom <= 72; boom += 6) {
        for (let gs = 0; gs <= 100; gs += 10) {
          const sol = solveGennaker(setup, gs, 100, 100, undefined, {
            thetaDeg: boom,
            unfurled: 1,
          });
          // Seen from the mast the clew is outboard of the boom (on the boom's side).
          if (boom * side > 0) {
            const clew = gennakerClew(sol.thetaDeg);
            const bearing = (Math.atan2(Math.abs(clew[2]), -clew[0]) * 180) / Math.PI;
            expect(bearing).toBeGreaterThanOrEqual(Math.abs(boom) + 4.9);
          }
        }
      }
    }
    // Hauled in with the boom well out on the same side: pressed against the main.
    const setup = setupFor(120);
    const sol = solveGennaker(setup, 0, 100, 74, undefined, { thetaDeg: -60, unfurled: 1 });
    expect(sol.pressed).toBe(true);
    expect(gennakerTrimState(setup, sol)).toBe('pressed');
    // Eased out, it is where the sheet puts it.
    expect(
      solveGennaker(setup, 100, 100, 74, undefined, { thetaDeg: -60, unfurled: 1 }).pressed,
    ).toBe(false);
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

describe('PT-71 the spinnaker pole', () => {
  it('PT-71 the pole goes to windward at right angles to the apparent wind', () => {
    // Right angles to the wind: |awa| − 90, between the pole's stops (10° and 85°).
    expect(polePlanDeg(180)).toBe(85);
    expect(polePlanDeg(130)).toBe(40);
    expect(polePlanDeg(-130)).toBe(40);
    expect(polePlanDeg(95)).toBe(10);
    // Wind over starboard: the pole to starboard, the clew on the other side.
    const starboardWind = spinnakerPicture(150);
    expect(starboardWind.poleEnd[2]).toBeGreaterThan(0);
    expect(starboardWind.clew[2]).toBeLessThan(0);
    const portWind = spinnakerPicture(-150);
    expect(portWind.poleEnd[2]).toBeLessThan(0);
    expect(portWind.clew[2]).toBeGreaterThan(0);
    // The guy runs from the pole's end to the windward winch; the sheet to the leeward one.
    const winch = (id: string) => {
      const w = boat.cockpitHardware.winches.find((candidate) => candidate.id === id);
      if (!w) throw new Error(id);
      return w;
    };
    const guyEnd = starboardWind.guy[starboardWind.guy.length - 1] as readonly number[];
    expect(starboardWind.guy[0]).toEqual(starboardWind.poleEnd);
    expect(guyEnd[2]).toBeCloseTo(winch('winch_primary_starboard').z, 9);
    const sheetEnd = starboardWind.sheet[starboardWind.sheet.length - 1] as readonly number[];
    expect(starboardWind.sheet[0]).toEqual(starboardWind.clew);
    expect(sheetEnd[2]).toBeCloseTo(winch('winch_primary_port').z, 9);
    // The pole lift hangs from high on the mast and the downhaul goes down to the deck.
    expect(starboardWind.poleLift[1]).toEqual(starboardWind.poleEnd);
    expect((starboardWind.poleLift[0] as readonly number[])[1]).toBeGreaterThan(
      starboardWind.poleEnd[1],
    );
    expect((starboardWind.downhaul[1] as readonly number[])[1]).toBeLessThan(
      starboardWind.poleEnd[1],
    );
  });
});

describe('PT-73 the code 0', () => {
  it('PT-73 the code 0 is a close-reaching sail: its clew is to leeward, set on its own furler', () => {
    expect(codeZeroPicture(70).clew[2]).toBeLessThan(0);
    expect(codeZeroPicture(-70).clew[2]).toBeGreaterThan(0);
    // Its tack is on the bow roller's tip, not at the pole's end: a furler at the bow.
    expect(codeZeroPicture(70).tack[0]).toBeGreaterThan(6);
    expect(codeZeroPicture(70).sheet[0]).toEqual(codeZeroPicture(70).clew);
  });
});

describe('PT-72 the traveller', () => {
  it("PT-72 the car sets the boom's angle; the sheet's length hardly changes", () => {
    expect(travellerPicture(0).boomDeg).toBeCloseTo(0, 9);
    expect(travellerPicture(100).boomDeg).toBeCloseTo(17.92, 2);
    expect(travellerPicture(-100).boomDeg).toBeCloseTo(-17.92, 2);
    const lengths: number[] = [];
    for (const pct of [-100, -60, 0, 60, 100]) {
      const picture = travellerPicture(pct);
      // The boom's sheet point is over the car, across the boat.
      expect(picture.boomPoint[2], `pct ${pct}`).toBeCloseTo(picture.car[2], 9);
      lengths.push(picture.sheetLengthM);
    }
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(0.01 * Math.min(...lengths));
  });
});
