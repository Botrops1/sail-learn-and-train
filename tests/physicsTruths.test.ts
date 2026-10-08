import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { initialSide, solveBoom, type BoomSolution } from '../src/model/boomSolver';
import { defaultControls, type Controls } from '../src/model/controls';
import { mainFurlLengths } from '../src/model/mainFurl';
import {
  availableSheetLength,
  mainsheetPaidOut,
  maxSwingFor,
  sheetLength,
} from '../src/model/mainsheet';
import { ropeDrawings } from '../src/model/ropePaths';
import { mainSailCorners, boomEnd } from '../src/model/rigGeometry';
import { mainSailGrid, mainSailTwistDeg } from '../src/model/sailShape';
import { initialRig, step, type RigState } from '../src/model/sim';
import type { Vec3 } from '../src/model/vec3';

/**
 * Phase 1 rules from docs/PHYSICS_TRUTHS.md that M2 covers (PT-01 … PT-09, PT-12).
 * Each test name starts with the rule id. The rules are not to be edited to match the code.
 */

const pitch = boat.rig.boom.pitch;

function controls(values: Partial<Controls>): Controls {
  return { ...defaultControls(), ...values };
}

/** The settled rig for a set of controls, as a shared link opens it. */
function settle(values: Partial<Controls>): BoomSolution {
  return initialRig(controls(values)).solution;
}

/** Runs the per-frame step at 60 fps for `seconds`. */
function run(rig: RigState, values: Partial<Controls>, seconds: number): RigState {
  const c = controls(values);
  let current = rig;
  for (let t = 0; t < seconds; t += 1 / 60) current = step({ controls: c, rig: current }, 1 / 60);
  return current;
}

/** Lowest point of a strand below the straight line between its ends, metres. */
function sagOf(points: Vec3[]): number {
  const a = points[0] as Vec3;
  const b = points[points.length - 1] as Vec3;
  let sag = 0;
  points.forEach((p, i) => {
    const t = i / (points.length - 1);
    sag = Math.max(sag, a[1] + (b[1] - a[1]) * t - p[1]);
  });
  return sag;
}

/** Horizontal heading of a chord of the sail, degrees from aft, + = to starboard. */
function heading(from: Vec3, to: Vec3): number {
  return (Math.atan2(to[2] - from[2], -(to[0] - from[0])) * 180) / Math.PI;
}

describe('PHYSICS_TRUTHS Phase 1 (M2: mainsail and boom)', () => {
  it('PT-01 ropes limit, wind pushes: head to wind, easing the sheet leaves the boom centred and the sheet goes slack', () => {
    for (let ms = 0; ms <= 100; ms += 5) {
      const sol = settle({ ctl_wind_dir: 0, ctl_wind_speed: 12, ctl_mainsheet: ms });
      expect(sol.thetaDeg, `ms ${ms}`).toBeCloseTo(0, 9);
      if (ms >= 10) {
        expect(sol.mainsheet.state, `ms ${ms}`).toBe('slack');
        expect(sol.mainsheet.slack, `ms ${ms}`).toBeGreaterThan(0.2);
      }
    }
    // The slack shows: the sheet's parts hang down between the boom and the deck.
    const rig = initialRig(controls({ ctl_wind_dir: 0, ctl_mainsheet: 100 }));
    const sheet = ropeDrawings(rig).find((rope) => rope.id === 'rope_mainsheet');
    expect(sagOf(sheet?.strands[0]?.points ?? [])).toBeGreaterThan(0.3);
  });

  it('PT-01 easing a sheet never moves the boom further than the wind wants it', () => {
    for (let wd = -180; wd <= 180; wd += 15) {
      for (let ms = 0; ms <= 100; ms += 10) {
        const sol = settle({ ctl_wind_dir: wd, ctl_mainsheet: ms });
        expect(Math.abs(sol.thetaDeg), `wd ${wd} ms ${ms}`).toBeLessThanOrEqual(
          Math.abs(sol.thetaFreeDeg) + 1e-9,
        );
      }
    }
  });

  it('PT-02 the boom goes to the leeward side: wind from starboard → port, from port → starboard', () => {
    for (const ms of [20, 50, 100]) {
      expect(settle({ ctl_wind_dir: 90, ctl_mainsheet: ms }).thetaDeg).toBeLessThan(-5);
      expect(settle({ ctl_wind_dir: -90, ctl_mainsheet: ms }).thetaDeg).toBeGreaterThan(5);
    }
    for (let wd = 10; wd <= 170; wd += 10) {
      expect(settle({ ctl_wind_dir: wd, ctl_mainsheet: 50 }).side, `wd ${wd}`).toBe(-1);
      expect(settle({ ctl_wind_dir: -wd, ctl_mainsheet: 50 }).side, `wd ${-wd}`).toBe(1);
    }
  });

  it('PT-03 a sail lined up with the wind flaps: wind +60, sheet 100 % → boom at about 60°, sheet slack, sail luffing', () => {
    const eased = settle({ ctl_wind_dir: 60, ctl_mainsheet: 100 });
    expect(eased.thetaDeg).toBeCloseTo(-60, 6);
    expect(eased.fill).toBeLessThan(0.05);
    expect(eased.mainsheet.state).toBe('slack');
    expect(eased.mainsheet.slack).toBeGreaterThan(0.5);
    // Haul in until it stops flapping: the sail fills before the sheet is fully in.
    let filledAt: number | null = null;
    for (let ms = 100; ms >= 0; ms -= 1) {
      if (settle({ ctl_wind_dir: 60, ctl_mainsheet: ms }).fill > 0.95) {
        filledAt = ms;
        break;
      }
    }
    expect(filledAt).not.toBeNull();
    expect(filledAt ?? 100).toBeGreaterThan(20);
  });

  it('PT-03 flapping starts at the front edge (luff): the ripple is largest near the luff', () => {
    const grid = mainSailGrid({
      pose: { thetaDeg: -50, psiDeg: 0 },
      unfurled: 1,
      fill: 0.6,
      side: -1,
      windSpeedKn: 12,
      timeS: 0.37,
    });
    const flat = mainSailGrid({
      pose: { thetaDeg: -50, psiDeg: 0 },
      unfurled: 1,
      fill: 0.6,
      side: -1,
      windSpeedKn: 0,
      timeS: 0.37,
    });
    const cols = grid.columns + 1;
    const row = 4;
    const offset = (j: number) => {
      const a = grid.points[row * cols + j] as Vec3;
      const b = flat.points[row * cols + j] as Vec3;
      return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    };
    const front = Math.max(offset(1), offset(2), offset(3));
    const back = Math.max(offset(grid.columns - 1), offset(grid.columns));
    expect(front).toBeGreaterThan(0.01);
    expect(back).toBeLessThan(front / 4);
  });

  it('PT-04 the boom cannot swing past the shrouds: never beyond maxSwingDeg (about 72°)', () => {
    const max = boat.rig.boom.maxSwingDeg;
    expect(max).toBe(72);
    for (const wd of [100, 135, 150, 170, 180, -170, -135, -100]) {
      const sol = settle({ ctl_wind_dir: wd, ctl_mainsheet: 100 });
      expect(Math.abs(sol.thetaDeg), `wd ${wd}`).toBeCloseTo(max, 6);
    }
    for (let wd = -180; wd <= 180; wd += 5) {
      for (const ms of [0, 50, 100]) {
        const sol = settle({ ctl_wind_dir: wd, ctl_mainsheet: ms, ctl_vang: 100 });
        expect(Math.abs(sol.thetaDeg)).toBeLessThanOrEqual(max + 1e-9);
      }
    }
  });

  it('PT-05 wind from dead astern: the boom stays (170 → 180 → −170), then gybes across at −165 with a GYBE flash', () => {
    const sheet = { ctl_mainsheet: 100, ctl_wind_speed: 12 };
    let rig = initialRig(controls({ ...sheet, ctl_wind_dir: 170 }));
    expect(rig.solution.thetaDeg).toBeLessThan(-70);
    for (const wd of [180, -170]) {
      rig = run(rig, { ...sheet, ctl_wind_dir: wd }, 1.5);
      expect(rig.solution.side, `wd ${wd}`).toBe(-1);
      expect(rig.theta.value, `wd ${wd}`).toBeLessThan(-70);
      expect(rig.gybeLabelS, `wd ${wd}`).toBe(0);
    }
    expect(rig.solution.byTheLee).toBe(true);
    // −165 is 15° by the lee: the boom crosses the whole boat in one go.
    rig = run(rig, { ...sheet, ctl_wind_dir: -165 }, 1 / 60);
    expect(rig.solution.side).toBe(1);
    expect(rig.solution.gybe).toBe(true);
    expect(rig.gybeLabelS).toBeGreaterThan(0);
    rig = run(rig, { ...sheet, ctl_wind_dir: -165 }, 1);
    expect(rig.theta.value).toBeGreaterThan(70);
  });

  it('PT-05 the gybe swing is faster than an ordinary boom move', () => {
    const sheet = { ctl_mainsheet: 100, ctl_wind_speed: 12 };
    // By the lee with the boom to port, then the wind goes 15° by the lee: a gybe (160° swing).
    let gybe = run(
      initialRig(controls({ ...sheet, ctl_wind_dir: 170 })),
      { ...sheet, ctl_wind_dir: -170 },
      1,
    );
    gybe = run(gybe, { ...sheet, ctl_wind_dir: -165 }, 0.25);
    // An ordinary move: sheet let go from fully hauled on a broad reach (a full swing out).
    const ordinary = run(
      initialRig(controls({ ...sheet, ctl_wind_dir: 165, ctl_mainsheet: 0 })),
      { ...sheet, ctl_wind_dir: 165 },
      0.25,
    );
    const max = boat.rig.boom.maxSwingDeg;
    const gybeProgress = (gybe.theta.value + max) / (2 * max);
    const ordinaryProgress = Math.abs(ordinary.theta.value) / max;
    expect(gybeProgress).toBeGreaterThan(0.5);
    expect(gybeProgress).toBeGreaterThan(2 * ordinaryProgress);
  });

  it('PT-06 more boom angle needs more mainsheet, the same on both sides', () => {
    for (let theta = 0; theta < boat.rig.boom.maxSwingDeg; theta += 5) {
      for (const psi of [-6, 0, 6, 12]) {
        const here = sheetLength({ thetaDeg: theta, psiDeg: psi });
        expect(sheetLength({ thetaDeg: theta + 5, psiDeg: psi })).toBeGreaterThan(here);
        expect(sheetLength({ thetaDeg: -theta, psiDeg: psi })).toBeCloseTo(here, 12);
      }
    }
    for (let ms = 0; ms < 100; ms += 5) {
      expect(mainsheetPaidOut(ms + 5)).toBeGreaterThan(mainsheetPaidOut(ms));
    }
    expect(mainsheetPaidOut(0)).toBe(0);
    // PHASE1_SPEC 8.2: about 10 m at 100 % with the manual's boom height and S.
    expect(mainsheetPaidOut(100)).toBeCloseTo(10, 0);
  });

  it('PT-06 near the centreline a little rope gives a lot of angle; far out, a lot of rope gives little angle', () => {
    // Beam reach, wind strong enough to push the boom out to the sheet's limit everywhere.
    const angle = (ms: number) =>
      Math.abs(settle({ ctl_wind_dir: 90, ctl_mainsheet: ms, ctl_vang: 0 }).thetaDeg);
    const paid = (ms: number) => mainsheetPaidOut(ms);
    const first = (angle(10) - angle(0)) / (paid(10) - paid(0));
    const late = (angle(80) - angle(70)) / (paid(80) - paid(70));
    expect(first).toBeGreaterThan(1.3 * late);
    // Pure geometry, without the pitch changes: degrees per metre of sheet fall steadily.
    const l0 = sheetLength({ thetaDeg: 0, psiDeg: 0 });
    const degreesPerMetre = [0, 1, 2, 3].map((k) => {
      const a = maxSwingFor(l0 + k * 0.5, 0) ?? 0;
      const b = maxSwingFor(l0 + (k + 1) * 0.5, 0) ?? 0;
      return (b - a) / 0.5;
    });
    for (let k = 1; k < degreesPerMetre.length; k += 1) {
      expect(degreesPerMetre[k]).toBeLessThan(degreesPerMetre[k - 1] ?? Infinity);
    }
  });

  it('PT-07 vang eased: the boom end rises and the top of the sail twists open more', () => {
    const base = { ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_mainsheet: 40 };
    const hauled = settle({ ...base, ctl_vang: 0 });
    const eased = settle({ ...base, ctl_vang: 100 });
    const endHauled = boomEnd({ thetaDeg: hauled.thetaDeg, psiDeg: hauled.psiDeg });
    const endEased = boomEnd({ thetaDeg: eased.thetaDeg, psiDeg: eased.psiDeg });
    expect(endEased[1] - endHauled[1]).toBeGreaterThan(0.8);
    expect(mainSailTwistDeg(eased.psiDeg)).toBeGreaterThan(mainSailTwistDeg(hauled.psiDeg) + 10);

    // In the sail mesh: the head opens to leeward more than the foot, and more so when eased.
    const openTop = (sol: BoomSolution) => {
      const grid = mainSailGrid({
        pose: { thetaDeg: sol.thetaDeg, psiDeg: sol.psiDeg },
        unfurled: 1,
        fill: 0,
        side: sol.side,
        windSpeedKn: 0,
        timeS: 0,
      });
      const cols = grid.columns + 1;
      const at = (row: number, col: number) => grid.points[row * cols + col] as Vec3;
      const foot = heading(at(0, 0), at(0, grid.columns));
      const top = heading(at(grid.rows - 1, 0), at(grid.rows - 1, grid.columns));
      // Both to port (negative): the top is further out.
      return foot - top;
    };
    expect(openTop(hauled)).toBeGreaterThan(0);
    expect(openTop(eased)).toBeGreaterThan(openTop(hauled) + 8);
  });

  it('PT-08 once the sheet is eased, the vang (not the sheet) controls boom height', () => {
    const base = { ctl_wind_dir: 90, ctl_wind_speed: 20 };
    const pitchChange = (ms: number) =>
      Math.abs(
        settle({ ...base, ctl_mainsheet: ms, ctl_vang: 100 }).psiDeg -
          settle({ ...base, ctl_mainsheet: ms, ctl_vang: 0 }).psiDeg,
      );
    for (const ms of [0, 5]) expect(pitchChange(ms), `ms ${ms}`).toBeLessThan(2);
    for (const ms of [40, 60, 70]) expect(pitchChange(ms), `ms ${ms}`).toBeGreaterThan(9);
  });

  it('PT-08 near the centreline the sheet pulls the boom down; eased, the vang holds it', () => {
    const base = { ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_vang: 100 };
    const tight = settle({ ...base, ctl_mainsheet: 5 });
    expect(tight.mainsheet.state).toBe('taut');
    expect(tight.psiDeg).toBeLessThan(tight.upperDeg - 1);
    const eased = settle({ ...base, ctl_mainsheet: 70 });
    expect(eased.vang.state).toBe('taut');
    expect(eased.psiDeg).toBeCloseTo(eased.upperDeg, 6);
  });

  it('PT-09 no wind, topping lift hauled: the boom rests on the topping lift', () => {
    const sol = settle({ ctl_wind_speed: 0, ctl_topping_lift: 0, ctl_vang: 100 });
    expect(sol.psiDeg).toBeCloseTo(pitch.toppingLiftHauledDeg, 6);
    expect(sol.toppingLift.state).toBe('taut');
    expect(sol.vang.state).toBe('slack');
  });

  it('PT-09 no wind, topping lift eased: the rigid vang strut holds the boom, the lift carries nothing', () => {
    const sol = settle({ ctl_wind_speed: 0, ctl_topping_lift: 100, ctl_vang: 50 });
    // The strut stops the boom at toppingLiftEasedDeg (about 2° down), above its gravity droop.
    expect(sol.psiDeg).toBeCloseTo(Math.max(pitch.gravityDropDeg, pitch.toppingLiftEasedDeg), 6);
    expect(sol.toppingLift.state).toBe('slack');
  });

  it('PT-09 at the default vang (50 %), hauling the topping lift lifts the boom onto it; hauling both fights', () => {
    const lifted = settle({ ctl_wind_speed: 0, ctl_topping_lift: 0 });
    expect(lifted.psiDeg).toBeCloseTo(pitch.toppingLiftHauledDeg, 6);
    expect(lifted.toppingLift.state).toBe('taut');
    expect(lifted.vang.state).toBe('slack');
    const both = settle({ ctl_wind_speed: 0, ctl_topping_lift: 0, ctl_vang: 0 });
    expect(both.toppingLift.state).toBe('fighting');
    expect(both.vang.state).toBe('fighting');
  });

  it('PT-09 topping lift and vang both hauled tight: both are fighting', () => {
    const sol = settle({ ctl_wind_speed: 0, ctl_topping_lift: 0, ctl_vang: 0 });
    expect(sol.toppingLift.state).toBe('fighting');
    expect(sol.vang.state).toBe('fighting');
    expect(sol.psiDeg).toBeCloseTo((pitch.toppingLiftHauledDeg + pitch.vangHauledDeg) / 2, 6);
    // Fighting ropes are drawn straight (and red, see render3d/boat/ropes.ts).
    const rig = initialRig(controls({ ctl_wind_speed: 0, ctl_topping_lift: 0, ctl_vang: 0 }));
    for (const rope of ropeDrawings(rig)) {
      if (rope.id !== 'rope_vang' && rope.id !== 'rope_topping_lift') continue;
      expect(rope.state, rope.id).toBe('fighting');
      expect(sagOf(rope.strands[0]?.points ?? []), rope.id).toBeLessThan(1e-9);
    }
  });

  it('PT-12 in-mast furling: unfurling hauls the "out" tail and the outhaul while the "in" tail pays out', () => {
    for (let mf = 0; mf < 100; mf += 5) {
      const a = mainFurlLengths(mf);
      const b = mainFurlLengths(mf + 5);
      expect(b.inTailPaidOut).toBeGreaterThan(a.inTailPaidOut);
      expect(b.outTailPaidOut).toBeLessThan(a.outTailPaidOut);
      expect(b.outhaulPaidOut).toBeLessThan(a.outhaulPaidOut);
    }
    // Fully out: the "out" tail and the outhaul are fully hauled; furled: the "in" tail is.
    expect(mainFurlLengths(100).outTailPaidOut).toBe(0);
    expect(mainFurlLengths(100).outhaulPaidOut).toBe(0);
    expect(mainFurlLengths(0).inTailPaidOut).toBe(0);
  });

  it('PT-12 the sail rolls in from the leech: the clew slides along the boom towards the mast', () => {
    const tack = mainSailCorners(1).tack;
    let previous = Infinity;
    for (let mf = 100; mf >= 0; mf -= 10) {
      const { clew } = mainSailCorners(mf / 100);
      const along = Math.hypot(clew[0] - tack[0], clew[2] - tack[2]);
      expect(along).toBeCloseTo((mf / 100) * boat.sails.main.footLength, 6);
      expect(along).toBeLessThan(previous + 1e-9);
      previous = along;
      // The luff stays full height.
      expect(mainSailCorners(mf / 100).head[1]).toBe(boat.sails.main.headY);
    }
  });

  it('PT-12 the drawn tails move: stripes slide one way on the "in" tail and the other way on the "out" tail and outhaul', () => {
    const feeds = (mf: number) => {
      const rig = initialRig(controls({ ctl_main_furl: mf }));
      const drawings = ropeDrawings(rig);
      const furling = drawings.find((rope) => rope.id === 'rope_main_furling_line');
      const outhaul = drawings.find((rope) => rope.id === 'rope_outhaul');
      return {
        inTail: furling?.strands[0]?.feed ?? NaN,
        outTail: furling?.strands[1]?.feed ?? NaN,
        outhaul: outhaul?.strands[0]?.feed ?? NaN,
      };
    };
    const furled = feeds(20);
    const out = feeds(80);
    expect(out.inTail).toBeGreaterThan(furled.inTail);
    expect(out.outTail).toBeLessThan(furled.outTail);
    expect(out.outhaul).toBeLessThan(furled.outhaul);
  });
});

describe('PHYSICS_TRUTHS PT-14: a furled sail does not push the boom', () => {
  it('PT-14 once the main is fully furled, the boom keeps its angle, rests on its stop, the sheet is slack', () => {
    const reach = { ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_mainsheet: 40, ctl_vang: 100 };
    let rig = initialRig(controls(reach));
    expect(rig.solution.psiDeg).toBeGreaterThan(5);
    const furling = { ...reach, ctl_main_furl: 0 };
    // While it rolls in, the lift fades and the boom drops onto its stop.
    let seconds = 0;
    while (!rig.solution.furled && seconds < 20) {
      rig = run(rig, furling, 0.5);
      seconds += 0.5;
    }
    expect(rig.solution.furled).toBe(true);
    const angle = rig.solution.thetaDeg;
    rig = run(rig, furling, 3);
    expect(rig.solution.thetaDeg).toBeCloseTo(angle, 9);
    expect(rig.solution.psiDeg).toBeCloseTo(
      Math.max(pitch.gravityDropDeg, pitch.toppingLiftEasedDeg),
      6,
    );
    expect(rig.solution.fill).toBe(0);
    expect(rig.solution.mainsheet.state).toBe('slack');
  });

  it('PT-14 easing the sheet with the main furled does not move the boom out', () => {
    const start = initialRig(controls({ ctl_wind_dir: 90, ctl_main_furl: 0, ctl_mainsheet: 10 }));
    const eased = run(start, { ctl_wind_dir: 90, ctl_main_furl: 0, ctl_mainsheet: 100 }, 3);
    expect(eased.solution.thetaDeg).toBeCloseTo(start.solution.thetaDeg, 6);
    expect(eased.solution.mainsheet.state).toBe('slack');
  });

  it('PT-14 with part of the main out, the wind lifts the boom less', () => {
    const reach = { ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_mainsheet: 50, ctl_vang: 100 };
    const full = settle({ ...reach, ctl_main_furl: 100 });
    const half = settle({ ...reach, ctl_main_furl: 50 });
    const little = settle({ ...reach, ctl_main_furl: 10 });
    expect(half.psiTargetDeg).toBeLessThan(full.psiTargetDeg);
    expect(little.psiTargetDeg).toBeLessThan(half.psiTargetDeg);
    // Still a sail: it keeps pushing the boom to leeward.
    expect(little.thetaDeg).toBeLessThan(-20);
  });
});

describe('boom solver: general checks (PHASE1_SPEC 11)', () => {
  const winds = Array.from({ length: 73 }, (_, i) => -180 + i * 5);

  it('mirror symmetry: wind from −windFrom gives θ → −θ and the same pitch', () => {
    for (const wd of winds) {
      if (Math.abs(wd) === 180 || wd === 0) continue;
      for (const ms of [0, 15, 40, 75, 100]) {
        for (const vg of [0, 50, 100]) {
          const a = settle({ ctl_wind_dir: wd, ctl_mainsheet: ms, ctl_vang: vg });
          const b = settle({ ctl_wind_dir: -wd, ctl_mainsheet: ms, ctl_vang: vg });
          expect(b.thetaDeg, `wd ${wd} ms ${ms} vg ${vg}`).toBeCloseTo(-a.thetaDeg, 6);
          expect(b.psiDeg, `wd ${wd} ms ${ms} vg ${vg}`).toBeCloseTo(a.psiDeg, 6);
        }
      }
    }
  });

  it('continuity: a 1 % control change never moves the boom by more than 5° (except a gybe and the first 1 % of mainsheet)', () => {
    for (const wd of [30, 45, 60, 90, 120, 150, 175, -60, -120]) {
      for (const [id, fixed] of [
        ['ctl_mainsheet', { ctl_vang: 50 }],
        ['ctl_mainsheet', { ctl_vang: 0, ctl_wind_speed: 25 }],
        ['ctl_vang', { ctl_mainsheet: 40, ctl_wind_speed: 20 }],
        ['ctl_topping_lift', { ctl_mainsheet: 30 }],
        ['ctl_main_furl', { ctl_mainsheet: 40, ctl_wind_speed: 20 }],
      ] as const) {
        let previous: BoomSolution | null = null;
        // Mainsail out starts at 1 %: at 0 % there is no sail and the boom keeps its angle (PT-14).
        for (let value = id === 'ctl_main_furl' ? 1 : 0; value <= 100; value += 1) {
          const values: Partial<Controls> = { ...fixed, ctl_wind_dir: wd, [id]: value };
          const sol = solveBoom(
            {
              windFromDeg: wd,
              windSpeedKn: values.ctl_wind_speed ?? 12,
              mainsheetPct: values.ctl_mainsheet ?? 30,
              vangPct: values.ctl_vang ?? 50,
              toppingLiftPct: values.ctl_topping_lift ?? 100,
              unfurledPct: values.ctl_main_furl ?? 100,
            },
            previous
              ? { side: previous.side, thetaDeg: previous.thetaDeg }
              : { side: initialSide(wd), thetaDeg: 0 },
          );
          // The first 1 % of mainsheet from fully hauled gives about 5.5° by geometry alone
          // (PT-06: L grows with θ², so near the centreline a little rope gives a lot of angle).
          const firstSheetStep = id === 'ctl_mainsheet' && value === 1;
          if (previous && !sol.gybe && !firstSheetStep) {
            expect(
              Math.abs(sol.thetaDeg - previous.thetaDeg),
              `wd ${wd} ${id} ${value}`,
            ).toBeLessThanOrEqual(5);
          }
          previous = sol;
        }
      }
    }
  });

  it('the first 1 % of mainsheet gives no more swing than the sheet geometry allows (about 5.5°)', () => {
    const geometric = maxSwingFor(availableSheetLength(1), boat.rig.boom.pitch.toppingLiftEasedDeg);
    expect(geometric).toBeLessThan(6);
    for (const wd of [45, 90, 175]) {
      expect(Math.abs(settle({ ctl_wind_dir: wd, ctl_mainsheet: 1 }).thetaDeg)).toBeLessThanOrEqual(
        (geometric ?? 0) + 1e-9,
      );
    }
  });

  it('a 1° wind change never moves the boom by more than 5° outside a tack or gybe', () => {
    for (const ms of [10, 30, 60, 100]) {
      for (let wd = 5; wd < 175; wd += 1) {
        const a = settle({ ctl_wind_dir: wd, ctl_mainsheet: ms }).thetaDeg;
        const b = settle({ ctl_wind_dir: wd + 1, ctl_mainsheet: ms }).thetaDeg;
        expect(Math.abs(b - a), `ms ${ms} wd ${wd}`).toBeLessThanOrEqual(5);
      }
    }
  });

  it('no NaN anywhere across all wind directions × control values', () => {
    for (const wd of winds.filter((_, i) => i % 3 === 0)) {
      for (const ws of [0, 0.5, 12, 30]) {
        for (const ms of [0, 33, 100]) {
          for (const vg of [0, 100]) {
            for (const tl of [0, 100]) {
              for (const mf of [0, 100]) {
                const rig = initialRig(
                  controls({
                    ctl_wind_dir: wd,
                    ctl_wind_speed: ws,
                    ctl_mainsheet: ms,
                    ctl_vang: vg,
                    ctl_topping_lift: tl,
                    ctl_main_furl: mf,
                  }),
                );
                const s = rig.solution;
                const numbers = [
                  s.thetaDeg,
                  s.psiDeg,
                  s.fill,
                  s.aoaDeg,
                  s.mainsheet.slack,
                  s.vang.slack,
                  s.toppingLift.slack,
                ];
                for (const value of numbers) expect(Number.isFinite(value)).toBe(true);
                for (const rope of ropeDrawings(rig)) {
                  for (const strand of rope.strands) {
                    for (const p of strand.points) {
                      expect(p.every(Number.isFinite), rope.id).toBe(true);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});
