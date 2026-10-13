import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import {
  boomInertia,
  dangerZone,
  gybeArrived,
  gybeImpact,
  gybeImpactPullN,
  gybeStep,
  type GybeSwing,
} from '../src/model/gybe';
import { AT_REST, initialRig, step, type RigState } from '../src/model/sim';
import { gybeReportText } from '../src/ui/gybeReport';

/** Swings the boom from `startDeg` to `stopDeg` in 1 ms steps: main fully out, heel 0. */
function swing(awsKn: number, startDeg: number, stopDeg: number, heelDeg = 0, mainOut = 1) {
  let s: GybeSwing = { thetaDeg: startDeg, omegaDegS: 0, startDeg, stopDeg };
  let t = 0;
  while (!gybeArrived(s) && t < 30) {
    s = gybeStep(s, awsKn, mainOut, heelDeg, 0.001);
    t += 0.001;
  }
  return { timeS: t, report: gybeImpact(s, t), swing: s };
}

describe('gybe dynamics (PHASE2_SPEC 11)', () => {
  it('the boom and sail turn with an inertia of about 2,440 kg·m² about the mast', () => {
    expect(boomInertia()).toBeGreaterThan(2300);
    expect(boomInertia()).toBeLessThan(2600);
  });

  it('PT-24 an accidental gybe (boom wide out, 15 kn) is fast, heavy and dangerous', () => {
    const { timeS, report } = swing(15, 72, -72);
    expect(timeS).toBeGreaterThan(1.6);
    expect(timeS).toBeLessThan(2.5);
    expect(report.energyJ).toBeGreaterThan(8500);
    expect(report.energyJ).toBeLessThan(12500);
    expect(report.peakRopeN).toBeGreaterThan(10000);
    expect(report.peakRopeN).toBeLessThan(16000);
    expect(report.accidental).toBe(true);
    // The numbers the report shows: boom end speed in m/s, the load on the whole sheet system.
    expect(report.endSpeedMps).toBeGreaterThan(14);
    expect(report.peakBlocksN / 4).toBeCloseTo(report.peakRopeN, 6);
  });

  it('PT-24 a controlled gybe (main sheet hauled in, boom 10° off the middle) is gentle', () => {
    const { report } = swing(15, 10, -10);
    expect(report.energyJ).toBeLessThan(1500);
    expect(report.peakRopeN).toBeLessThan(2000);
    expect(report.accidental).toBe(false);
  });

  it('the energy grows with the wind, about with its square (8, 15, 25 kn)', () => {
    const energies = [8, 15, 25].map((kn) => swing(kn, 72, -72).report.energyJ);
    const prototype = [2900, 10300, 28600];
    energies.forEach((e, i) => {
      expect(e).toBeGreaterThan((prototype[i] ?? 0) * 0.8);
      expect(e).toBeLessThan((prototype[i] ?? 0) * 1.2);
      if (i > 0) expect(e).toBeGreaterThan(energies[i - 1] ?? Infinity);
    });
  });

  it('works the same towards either side', () => {
    const a = swing(15, 72, -72).report;
    const b = swing(15, -72, 72).report;
    expect(b.energyJ).toBeCloseTo(a.energyJ, 3);
    expect(b.startDeg).toBe(-72);
  });

  it('a heeled boat is pushed less (cos² of the heel)', () => {
    const upright = swing(15, 72, -72).report.energyJ;
    const heeled = swing(15, 72, -72, 25).report.energyJ;
    expect(heeled).toBeLessThan(upright);
  });

  it('a boom with less sail out is pushed less hard', () => {
    const full = swing(15, 72, -72, 0, 1).report.energyJ;
    const reefed = swing(15, 72, -72, 0, 0.5).report.energyJ;
    expect(reefed).toBeLessThan(full);
  });

  it('the data keys the report needs exist', () => {
    const g = boat.physics.gybe;
    expect(g.reportS).toBeGreaterThan(g.dangerFlashS);
    expect(g.impactLoadDurationS).toBeGreaterThan(0);
  });
});

describe('the gybe in the rig (PHASE2_SPEC 11.2)', () => {
  const sheet = { ...defaultControls(), ctl_mainsheet: 100, ctl_wind_speed: 15 };

  function run(rig: RigState, wd: number, seconds: number, main = 100): RigState {
    const controls = { ...sheet, ctl_wind_dir: wd, ctl_mainsheet: main };
    let current = rig;
    for (let t = 0; t < seconds - 1e-9; t += 1 / 60)
      current = step({ controls, rig: current }, 1 / 60, AT_REST);
    return current;
  }

  /** Boom to port on a run, the wind 15° by the lee, then the first frames of the swing. */
  function startGybe(main = 100): RigState {
    const base = initialRig({ ...sheet, ctl_wind_dir: 170, ctl_mainsheet: main });
    return run(run(base, -170, 1, main), -165, 1 / 60, main);
  }

  it('the swing starts at the trigger, the boom is still on the old side, nothing is reported yet', () => {
    const rig = startGybe();
    expect(rig.gybing).toBe(true);
    expect(rig.gybeSwing?.startDeg).toBeLessThan(-60);
    expect(rig.gybeSwing?.stopDeg).toBeGreaterThan(60);
    expect(rig.theta.value).toBeLessThan(0);
    expect(rig.lastGybe).toBeNull();
  });

  it('the boom crosses in about two seconds at 15 kn and the sheet stops it with a report', () => {
    let rig = startGybe();
    let crossedAt = 0;
    for (let t = 0; t < 6; t += 1 / 60) {
      rig = run(rig, -165, 1 / 60);
      if (!crossedAt && !rig.gybing) crossedAt = t;
    }
    expect(crossedAt).toBeGreaterThan(1.5);
    expect(crossedAt).toBeLessThan(2.8);
    expect(rig.theta.value).toBeCloseTo(rig.solution.thetaDeg, 6);
    expect(rig.theta.velocity).toBe(0);
    expect(rig.lastGybe?.accidental).toBe(true);
    expect(rig.lastGybe?.peakRopeN).toBeGreaterThan(8000);
  });

  it('with the main sheet hauled in the same gybe is controlled and gentle', () => {
    let rig = startGybe(5);
    rig = run(rig, -165, 4, 5);
    expect(rig.gybing).toBe(false);
    expect(rig.lastGybe?.accidental).toBe(false);
    expect(rig.lastGybe?.peakRopeN).toBeLessThan(3000);
  });

  it('a tack swings nothing and leaves no report', () => {
    const base = { ...sheet, ctl_mainsheet: 20 };
    let rig = initialRig({ ...base, ctl_wind_dir: 40 });
    for (let t = 0; t < 3; t += 1 / 60)
      rig = step({ controls: { ...base, ctl_wind_dir: -40 }, rig }, 1 / 60, AT_REST);
    expect(rig.gybeSwing).toBeNull();
    expect(rig.lastGybe).toBeNull();
  });

  it('a main furled away is not pushed: the boom just moves, no swing', () => {
    const base = { ...sheet, ctl_main_furl: 0 };
    let rig = initialRig({ ...base, ctl_wind_dir: 170 });
    for (let t = 0; t < 2; t += 1 / 60)
      rig = step({ controls: { ...base, ctl_wind_dir: -170 }, rig }, 1 / 60, AT_REST);
    for (let t = 0; t < 2; t += 1 / 60)
      rig = step({ controls: { ...base, ctl_wind_dir: -165 }, rig }, 1 / 60, AT_REST);
    expect(rig.gybeSwing).toBeNull();
    expect(rig.lastGybe).toBeNull();
  });

  it('paused (dt = 0) the swing stands still', () => {
    const rig = startGybe();
    const held = step({ controls: { ...sheet, ctl_wind_dir: -165 }, rig }, 0, AT_REST);
    expect(held.gybeSwing?.thetaDeg).toBe(rig.gybeSwing?.thetaDeg);
  });

  it('the by-the-lee timer counts while the boom is by the lee, and resets when it is not', () => {
    const base = initialRig({ ...sheet, ctl_wind_dir: 170 });
    const lee = run(base, -170, 4);
    expect(lee.solution.byTheLee).toBe(true);
    expect(lee.byTheLeeS).toBeGreaterThan(3.5);
    const away = run(lee, 120, 1);
    expect(away.byTheLeeS).toBe(0);
  });

  it('the danger zone: a faint risk by the lee, the sweep while crossing and just after, then none', () => {
    const base = initialRig({ ...sheet, ctl_wind_dir: 170 });
    expect(dangerZone(base)).toBeNull();
    const lee = run(base, -170, 1);
    expect(dangerZone(lee)?.kind).toBe('risk');
    let rig = startGybe();
    const sweep = dangerZone(rig);
    expect(sweep?.kind).toBe('sweep');
    expect(sweep?.fromDeg).toBeLessThan(-60);
    expect(sweep?.toDeg).toBeGreaterThan(60);
    rig = run(rig, -165, 3.2);
    expect(rig.gybing).toBe(false);
    // Just after: still shown, fading.
    const flash = dangerZone(rig);
    expect(flash).not.toBeNull();
    expect(flash?.kind).toBe('sweep');
    expect(flash?.strength).toBeLessThan(1);
    rig = run(rig, -165, boat.physics.gybe.dangerFlashS + 0.2);
    expect(dangerZone({ ...rig, solution: { ...rig.solution, byTheLee: false } })).toBeNull();
  });

  it('the impact load acts for impactLoadDurationS after the boom is stopped', () => {
    const rig = run(startGybe(), -165, 4);
    const last = rig.lastGybe;
    expect(last).not.toBeNull();
    const at = last?.atS ?? 0;
    expect(gybeImpactPullN(last, at)).toBe(last?.peakRopeN);
    expect(gybeImpactPullN(last, at + boat.physics.gybe.impactLoadDurationS + 0.01)).toBe(0);
    expect(gybeImpactPullN(null, 0)).toBe(0);
  });

  it('the report says what happened in plain words', () => {
    const accidental = gybeReportText(swing(15, 72, -72).report);
    expect(accidental).toMatch(/^Accidental gybe! Boom end 17\.\d m\/s · energy \d+\.\d kJ/);
    expect(accidental).toContain('tonnes');
    expect(accidental).toContain('haul the main sheet in');
    const controlled = gybeReportText(swing(15, 10, -10).report);
    expect(controlled).toMatch(
      /^Controlled gybe: boom end \d\.\d m\/s · peak main sheet load \d\.\d kN\.$/,
    );
  });
});
