import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls, type Controls } from '../src/model/controls';
import {
  availableJibSheet,
  carPoint,
  jibClew,
  jibFurlingLinePaidOut,
  jibHeadingDeg,
  jibMaxPhiDeg,
  jibSheetHauled,
  jibSheetPaidOut,
  jibSheetPaidOutFor,
  jibSheetReleased,
  jibSheetSpan,
  minUnfurledFor,
  settledJibUnfurled,
  solveJib,
  type JibSolution,
} from '../src/model/jib';
import { ropeDrawings } from '../src/model/ropePaths';
import { jibSailGrid } from '../src/model/sailShape';
import { initialRig, step, type RigState } from '../src/model/sim';
import type { Vec3 } from '../src/model/vec3';

/**
 * Phase 1 rules from docs/PHYSICS_TRUTHS.md that M3 covers (PT-10, PT-11, PT-13), plus the
 * general checks of PHASE1_SPEC 11 for the jib. Each rule test starts with the rule id.
 */

const halfSpan = boat.rig.selfTackingTrack.halfSpan;

function controls(values: Partial<Controls>): Controls {
  return { ...defaultControls(), ...values };
}

/** The settled jib for a set of controls, as a shared link opens it. */
function settle(values: Partial<Controls>): JibSolution {
  return initialRig(controls(values)).jibSolution;
}

/** Runs the per-frame step at 60 fps for `seconds`. */
function run(rig: RigState, values: Partial<Controls>, seconds: number): RigState {
  const c = controls(values);
  let current = rig;
  for (let t = 0; t < seconds; t += 1 / 60) current = step({ controls: c, rig: current }, 1 / 60);
  return current;
}

/** The drawn car position (from the smoothed jib), z. */
function drawnCarZ(rig: RigState): number {
  return carPoint(jibClew(rig.jibPhi.value, rig.jibSolution.unfurled))[2];
}

/** Above this, the continuity limit of 5° applies (see jibSweep). */
const HELD_STEP_LIMIT_DEG = 10;

interface SweepStep {
  value: number;
  /** Change of the chord heading from the previous value, degrees. */
  change: number;
  blocked: boolean;
  /**
   * Within two steps of a setting where the sheet holds the jib on the centreline against the
   * wind. Coming off the centreline a little spare sheet gives a lot of angle (as for the first
   * 1 % of main sheet), and 1 % of furl frees about 6 cm of sheet: up to about 8.5° per step.
   */
  nearHeld: boolean;
  /**
   * The sheet was hauled off its release point (100 %) with the jib partly furled: the extra
   * rope the furl took out is taken in at once, and the jib moves in to its sheet angle (up to
   * about 31° with the jib mostly rolled up).
   */
  leftRelease: boolean;
}

/** Solves the jib for one control swept 1 % at a time, the other jib control fixed. */
function jibSweep(
  wd: number,
  id: 'ctl_jib_sheet' | 'ctl_jib_furl',
  fixed: number,
  from: number,
  to: number,
): SweepStep[] {
  const side = wd > 0 ? -1 : 1;
  const direction = to >= from ? 1 : -1;
  const solutions: JibSolution[] = [];
  // Start like a link does: the jib at its angle fully out (see initialRig).
  const fullyOut = solveJib(
    {
      windFromDeg: wd,
      windSpeedKn: 12,
      sheetPct: id === 'ctl_jib_sheet' ? from : fixed,
      unfurledPct: 100,
      sheetReleased: jibSheetReleased(id === 'ctl_jib_sheet' ? from : fixed),
      boomSide: side,
    },
    { side, phiDeg: 0, unfurled: 1 },
  );
  let previous: JibSolution | null = null;
  for (let value = from; direction * (to - value) >= 0; value += direction) {
    const jib = solveJib(
      {
        windFromDeg: wd,
        windSpeedKn: 12,
        sheetPct: id === 'ctl_jib_sheet' ? value : fixed,
        unfurledPct: id === 'ctl_jib_furl' ? value : fixed,
        sheetReleased: jibSheetReleased(id === 'ctl_jib_sheet' ? value : fixed),
        boomSide: side,
      },
      previous ?? { side, phiDeg: fullyOut.phiDeg, unfurled: 1 },
    );
    solutions.push(jib);
    previous = jib;
  }
  const held = solutions.map(
    (jib) =>
      Math.abs(jib.headingDeg) < 1e-3 &&
      Math.abs(jib.freeHeadingDeg) > boat.visual.solver.tautToleranceDeg &&
      jib.sheet.state !== 'slack',
  );
  return solutions.slice(1).map((jib, k) => {
    const i = k + 1;
    return {
      value: from + direction * i,
      change: Math.abs(jib.headingDeg - (solutions[i - 1]?.headingDeg ?? 0)),
      blocked: jib.furlBlocked,
      leftRelease:
        (solutions[i - 1]?.sheetReleased ?? false) && !jib.sheetReleased && jib.unfurled < 1,
      nearHeld: held.slice(Math.max(0, i - 2), i + 2).some(Boolean),
    };
  });
}

/** Horizontal heading of a chord, degrees from aft, + = to starboard. */
function heading(from: Vec3, to: Vec3): number {
  return (Math.atan2(to[2] - from[2], -(to[0] - from[0])) * 180) / Math.PI;
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

describe('jib geometry (PHASE1_SPEC 8.5)', () => {
  it('the clew rotates around the luff: side lengths stay as in jib.lengths', () => {
    const { tack, head, lengths } = boat.sails.jib;
    for (const phi of [-40, -15, 0, 20, 60]) {
      const clew = jibClew(phi);
      const foot = Math.hypot(...clew.map((c, i) => c - (tack[i] ?? 0)));
      const leech = Math.hypot(...clew.map((c, i) => c - (head[i] ?? 0)));
      expect(foot, `φ ${phi}`).toBeCloseTo(lengths.foot, 1);
      expect(leech, `φ ${phi}`).toBeCloseTo(lengths.leech, 1);
    }
  });

  it('fully hauled, the jib sits with the car just at the end of the track, about 14° out (ℓ_hauled ≈ 0.53 m)', () => {
    expect(jibSheetHauled()).toBeCloseTo(boat.sails.jib.sheet.hauledClewToCar, 1);
    const hauled = settle({ ctl_wind_dir: 90, ctl_jib_sheet: 0 });
    expect(Math.abs(hauled.carZ)).toBeCloseTo(halfSpan, 3);
    expect(Math.abs(hauled.headingDeg)).toBeGreaterThan(13);
    expect(Math.abs(hauled.headingDeg)).toBeLessThan(15);
    expect(jibSheetSpan(hauled.phiDeg)).toBeCloseTo(jibSheetHauled(), 6);
  });

  it('the sheet span grows steadily as the jib swings out, the same on both sides (the solver bisects on it)', () => {
    for (const f of [1, 0.85, 0.7]) {
      let previous = jibSheetSpan(0, f);
      for (let phi = 1; phi <= jibMaxPhiDeg(); phi += 1) {
        const span = jibSheetSpan(phi, f);
        expect(span, `f ${f} φ ${phi}`).toBeGreaterThan(previous);
        expect(jibSheetSpan(-phi, f)).toBeCloseTo(span, 12);
        previous = span;
      }
    }
  });

  it('jib sheet: 2:1, so the rope paid out at the clutch is twice the eased working length', () => {
    expect(boat.sails.jib.sheet.purchase).toBe(2);
    expect(jibSheetPaidOut(0)).toBe(0);
    expect(jibSheetPaidOut(100)).toBeCloseTo(2 * boat.sails.jib.sheet.maxEaseBeyondHauled, 9);
    for (let js = 0; js < 100; js += 5) {
      expect(jibSheetPaidOut(js + 5)).toBeGreaterThan(jibSheetPaidOut(js));
    }
    expect(jibSheetPaidOut(100)).toBeLessThanOrEqual(
      boat.runningRigging.ropes.rope_jib_sheet.lengthM,
    );
  });

  it('the jib furling line pays out as the jib is unfurled, never more than the rope', () => {
    expect(jibFurlingLinePaidOut(0)).toBe(0);
    expect(jibFurlingLinePaidOut(1)).toBeCloseTo(boat.rig.jibFurler.lineTravelM, 9);
    expect(jibFurlingLinePaidOut(1)).toBeLessThanOrEqual(
      boat.runningRigging.ropes.rope_jib_furling_line.lengthM,
    );
  });
});

describe('PHYSICS_TRUTHS Phase 1 (M3: self-tacking jib)', () => {
  it('PT-10 the self-tacking jib changes sides by itself: wind +30 → −30, the car slides across and the jib fills on the new side', () => {
    let rig = initialRig(controls({ ctl_wind_dir: 30 }));
    expect(rig.jibSolution.side).toBe(-1);
    expect(rig.jibSolution.carZ).toBeCloseTo(-halfSpan, 9);
    expect(rig.jibSolution.fill).toBeGreaterThan(0.95);
    const sheetBefore = rig.applied.jibSheet;

    rig = run(rig, { ctl_wind_dir: -30 }, 3);
    expect(rig.jibSolution.side).toBe(1);
    expect(rig.jibSolution.carZ).toBeCloseTo(halfSpan, 9);
    expect(drawnCarZ(rig)).toBeCloseTo(halfSpan, 3);
    expect(rig.jibSolution.fill).toBeGreaterThan(0.95);
    // No sheet handling: the same sheet setting, the same angle on the new side.
    expect(rig.applied.jibSheet).toBe(sheetBefore);
    expect(rig.jibSolution.headingDeg).toBeCloseTo(-settle({ ctl_wind_dir: 30 }).headingDeg, 6);
  });

  it('PT-10 the car slides across smoothly (it is drawn crossing the middle of the track)', () => {
    let rig = initialRig(controls({ ctl_wind_dir: 30 }));
    const seen: number[] = [];
    for (let i = 0; i < 90; i += 1) {
      rig = run(rig, { ctl_wind_dir: -30 }, 1 / 60);
      seen.push(drawnCarZ(rig));
    }
    expect(seen.some((z) => Math.abs(z) < 0.3)).toBe(true);
    for (let i = 1; i < seen.length; i += 1) {
      expect(Math.abs((seen[i] ?? 0) - (seen[i - 1] ?? 0))).toBeLessThan(0.3);
    }
  });

  it('PT-10 the car is always on the leeward side, at the end of the track once the jib is out, also with the sheet fully hauled', () => {
    for (const js of [0, 10, 30, 50, 100]) {
      for (let wd = 10; wd <= 165; wd += 5) {
        for (const [w, side] of [
          [wd, -1],
          [-wd, 1],
        ] as const) {
          const jib = settle({ ctl_wind_dir: w, ctl_jib_sheet: js });
          expect(jib.side, `wd ${w} js ${js}`).toBe(side);
          expect(Math.sign(jib.carZ), `wd ${w} js ${js}`).toBe(side);
          // Wind from 15° or more aft of the bow pushes the jib past the track end.
          if (wd >= 15) expect(Math.abs(jib.carZ), `wd ${w} js ${js}`).toBeCloseTo(halfSpan, 6);
        }
      }
    }
  });

  it('PT-10 with the sheet fully hauled (review of M3): wind +30 → −30, the car slides across and the jib fills on the new side', () => {
    let rig = initialRig(controls({ ctl_wind_dir: 30, ctl_jib_sheet: 0 }));
    expect(rig.jibSolution.carZ).toBeCloseTo(-halfSpan, 6);
    expect(rig.jibSolution.fill).toBeGreaterThan(0.95);
    rig = run(rig, { ctl_wind_dir: -30, ctl_jib_sheet: 0 }, 3);
    expect(rig.jibSolution.carZ).toBeCloseTo(halfSpan, 6);
    expect(drawnCarZ(rig)).toBeCloseTo(halfSpan, 2);
    expect(rig.jibSolution.fill).toBeGreaterThan(0.95);
  });

  it('PT-11 an eased self-tacker opens only to about 30–35° on a beam reach; the car reaches the track end at about 14°', () => {
    const angle = (js: number) =>
      Math.abs(settle({ ctl_wind_dir: 90, ctl_jib_sheet: js }).headingDeg);
    let previous = -1;
    let atTrackEnd: number | null = null;
    for (let js = 0; js <= 100; js += 1) {
      const jib = settle({ ctl_wind_dir: 90, ctl_jib_sheet: js });
      const a = Math.abs(jib.headingDeg);
      expect(a, `js ${js}`).toBeGreaterThan(previous);
      previous = a;
      if (atTrackEnd === null && Math.abs(jib.carZ) >= halfSpan - 1e-9) atTrackEnd = a;
    }
    expect(atTrackEnd).not.toBeNull();
    expect(atTrackEnd ?? 0).toBeGreaterThan(12);
    expect(atTrackEnd ?? 99).toBeLessThan(16);
    expect(angle(100)).toBeGreaterThanOrEqual(30);
    expect(angle(100)).toBeLessThanOrEqual(35);
    // Far less than the 90° the wind would push it to: the sheet holds it.
    const eased = settle({ ctl_wind_dir: 90, ctl_jib_sheet: 100 });
    expect(eased.sheet.state).toBe('taut');
  });

  it('PT-11 once the car is at the track end, easing lifts the clew and twists the top of the jib open', () => {
    const at = (js: number) => settle({ ctl_wind_dir: 90, ctl_jib_sheet: js });
    // Car still on the track (wind from 10°, the jib only 10° out): base twist only.
    const onTrack = settle({ ctl_wind_dir: 10, ctl_jib_sheet: 0 });
    expect(Math.abs(onTrack.carZ)).toBeLessThan(halfSpan);
    expect(onTrack.twistDeg).toBeCloseTo(boat.visual.baseTwistDeg, 9);
    expect(at(100).twistDeg).toBeGreaterThan(at(50).twistDeg);
    expect(at(50).twistDeg).toBeGreaterThan(at(20).twistDeg);
    expect(at(100).twistDeg).toBeGreaterThan(boat.visual.baseTwistDeg + 10);
    const clewY = (js: number) => jibClew(at(js).phiDeg)[1];
    expect(clewY(100)).toBeGreaterThan(clewY(0) + 0.1);

    // In the sail mesh: the top of the jib is turned further out than the foot, more so eased.
    const openTop = (js: number) => {
      const rig = initialRig(controls({ ctl_wind_dir: 90, ctl_jib_sheet: js }));
      const grid = jibSailGrid({
        phiDeg: rig.jibSolution.phiDeg,
        unfurled: 1,
        fill: 0,
        side: -1,
        windSpeedKn: 0,
        timeS: 0,
      });
      const cols = grid.columns + 1;
      const at = (row: number, col: number) => grid.points[row * cols + col] as Vec3;
      const foot = heading(at(0, 0), at(0, grid.columns));
      const top = heading(at(grid.rows - 2, 0), at(grid.rows - 2, grid.columns));
      // Both to port (negative): the top is further out.
      return foot - top;
    };
    expect(openTop(0)).toBeGreaterThan(0);
    expect(openTop(100)).toBeGreaterThan(openTop(0) + 8);
  });

  it('PT-13 jib sheet hauled: the jib cannot be furled; the furl stops with a hint', () => {
    let rig = initialRig(controls({ ctl_jib_sheet: 0 }));
    rig = run(rig, { ctl_jib_sheet: 0, ctl_jib_furl: 0 }, 3);
    expect(rig.jibSolution.furlBlocked).toBe(true);
    // Fully hauled, the clew can only come about 20 cm forward: the jib stays about 96 % out.
    expect(rig.jibSolution.unfurled).toBeGreaterThan(0.94);
    expect(rig.jibSolution.sheet.state).toBe('taut');
  });

  it('PT-13 easing the sheet lets the furling continue, as far as the sheet allows; fully eased, it completes', () => {
    let rig = initialRig(controls({ ctl_jib_sheet: 0 }));
    rig = run(rig, { ctl_jib_sheet: 0, ctl_jib_furl: 0 }, 3);
    const stuck = rig.jibSolution.unfurled;
    rig = run(rig, { ctl_jib_sheet: 50, ctl_jib_furl: 0 }, 3);
    const eased = rig.jibSolution.unfurled;
    expect(eased).toBeLessThan(stuck - 0.1);
    rig = run(rig, { ctl_jib_sheet: 90, ctl_jib_furl: 0 }, 6);
    const further = rig.jibSolution.unfurled;
    expect(further).toBeLessThan(eased - 0.05);
    expect(rig.jibSolution.furlBlocked).toBe(true);
    // Below 100 % the furl reached is exactly what the sheet allows.
    expect(jibSheetSpan(0, further)).toBeCloseTo(availableJibSheet(90), 2);
    // Fully eased (released), the furling completes.
    rig = run(rig, { ctl_jib_sheet: 100, ctl_jib_furl: 0 }, 6);
    expect(rig.jibSolution.unfurled).toBe(0);
    expect(rig.jibSolution.furlBlocked).toBe(false);
    // A furl the sheet allows is not blocked.
    const partly = settle({ ctl_jib_sheet: 90, ctl_jib_furl: 90 });
    expect(partly.furlBlocked).toBe(false);
    expect(partly.unfurled).toBeCloseTo(0.9, 9);
  });

  it('PT-13 the more the sheet is eased, the further the jib can be furled', () => {
    let previous = Infinity;
    for (let js = 0; js <= 100; js += 5) {
      const reachable = minUnfurledFor(availableJibSheet(js));
      expect(reachable, `js ${js}`).toBeLessThanOrEqual(previous);
      previous = reachable;
    }
    expect(minUnfurledFor(availableJibSheet(0))).toBeGreaterThan(0.94);
  });

  it('PT-13 the drawn furling line moves with the jib actually furled, not with the blocked request', () => {
    const blocked = initialRig(controls({ ctl_jib_sheet: 0, ctl_jib_furl: 0 }));
    const line = ropeDrawings(blocked).find((rope) => rope.id === 'rope_jib_furling_line');
    expect(line?.strands[0]?.feed).toBeCloseTo(
      jibFurlingLinePaidOut(blocked.jibSolution.unfurled),
      9,
    );
    expect(line?.strands[0]?.feed).toBeGreaterThan(jibFurlingLinePaidOut(0.94));
  });
});

describe('jib solver: general checks (PHASE1_SPEC 11)', () => {
  const winds = Array.from({ length: 73 }, (_, i) => -180 + i * 5);

  it('wind dead ahead: the jib flaps in the middle (WORKFLOW M3)', () => {
    for (const js of [0, 30, 100]) {
      const jib = settle({ ctl_wind_dir: 0, ctl_jib_sheet: js });
      expect(jib.headingDeg, `js ${js}`).toBeCloseTo(0, 6);
      expect(jib.fill).toBe(0);
      expect(Math.abs(jib.carZ)).toBeLessThan(1e-6);
    }
  });

  it('easing never moves the jib further than the wind wants it (ropes limit, wind pushes)', () => {
    for (const wd of winds) {
      for (const js of [0, 30, 100]) {
        const jib = settle({ ctl_wind_dir: wd, ctl_jib_sheet: js });
        expect(Math.abs(jib.headingDeg), `wd ${wd} js ${js}`).toBeLessThanOrEqual(
          Math.abs(jib.freeHeadingDeg) + 1e-6,
        );
      }
    }
  });

  it('sheet eased more than the wind needs: the jib lines up with the wind, the sheet goes slack, the jib flaps', () => {
    const jib = settle({ ctl_wind_dir: 20, ctl_jib_sheet: 100 });
    expect(Math.abs(jib.headingDeg)).toBeCloseTo(20, 3);
    expect(jib.sheet.state).toBe('slack');
    expect(jib.sheet.slack).toBeGreaterThan(0.3);
    expect(jib.fill).toBeLessThan(0.05);
    const rig = initialRig(controls({ ctl_wind_dir: 20, ctl_jib_sheet: 100 }));
    const sheet = ropeDrawings(rig).find((rope) => rope.id === 'rope_jib_sheet');
    expect(sagOf(sheet?.strands[0]?.points ?? [])).toBeGreaterThan(0.05);
  });

  it('mirror symmetry: wind from −windFrom gives φ → −φ', () => {
    for (const wd of winds) {
      if (Math.abs(wd) >= 165 || wd === 0) continue;
      for (const js of [0, 15, 40, 100]) {
        for (const jf of [100, 80]) {
          const a = settle({ ctl_wind_dir: wd, ctl_jib_sheet: js, ctl_jib_furl: jf });
          const b = settle({ ctl_wind_dir: -wd, ctl_jib_sheet: js, ctl_jib_furl: jf });
          expect(b.phiDeg, `wd ${wd} js ${js} jf ${jf}`).toBeCloseTo(-a.phiDeg, 6);
          expect(b.carZ).toBeCloseTo(-a.carZ, 6);
        }
      }
    }
  });

  it('near dead astern the jib stays on the boom side until the boom gybes', () => {
    const sheet = { ctl_mainsheet: 100, ctl_jib_sheet: 50 };
    let rig = initialRig(controls({ ...sheet, ctl_wind_dir: 170 }));
    expect(rig.jibSolution.side).toBe(-1);
    rig = run(rig, { ...sheet, ctl_wind_dir: -170 }, 1);
    expect(rig.solution.side).toBe(-1);
    expect(rig.jibSolution.side).toBe(-1);
    expect(rig.jibSolution.byTheLee).toBe(true);
    rig = run(rig, { ...sheet, ctl_wind_dir: -165 }, 1);
    expect(rig.solution.side).toBe(1);
    expect(rig.jibSolution.side).toBe(1);
  });

  it('no wind: the jib keeps its angle; hauling the sheet still pulls it in', () => {
    let rig = initialRig(controls({ ctl_wind_dir: 90, ctl_jib_sheet: 60 }));
    const angle = rig.jibSolution.headingDeg;
    rig = run(rig, { ctl_wind_dir: 90, ctl_jib_sheet: 60, ctl_wind_speed: 0 }, 2);
    expect(rig.jibSolution.headingDeg).toBeCloseTo(angle, 6);
    expect(rig.jibSolution.fill).toBe(0);
    rig = run(rig, { ctl_wind_dir: 90, ctl_jib_sheet: 10, ctl_wind_speed: 0 }, 3);
    expect(Math.abs(rig.jibSolution.headingDeg)).toBeLessThan(Math.abs(angle) - 5);
  });

  it('continuity: a 1 % jib sheet change never moves the jib by more than 5°, except hauling it off 100 % with the jib partly furled', () => {
    for (const wd of [10, 20, 45, 90, 135, 175, -60]) {
      for (const jf of [100, 90, 80, 50, 1]) {
        for (const [from, to] of [
          [0, 100],
          [100, 0],
        ] as const) {
          for (const step of jibSweep(wd, 'ctl_jib_sheet', jf, from, to)) {
            const what = `wd ${wd} jf ${jf} js → ${step.value}`;
            // Not a small step by nature: 99 % is a much shorter sheet than the rope the
            // furl took out, so the hauled sheet takes it in at once (drawn with the usual
            // smoothing). Measured: up to about 31° with the jib mostly rolled up.
            if (step.leftRelease) continue;
            expect(step.change, what).toBeLessThanOrEqual(5);
          }
        }
      }
    }
  });

  it('continuity: a 1 % "Jib out" change never moves the jib by more than 5°, except next to where the sheet holds it on the centreline (PHASE1_SPEC 11)', () => {
    for (const wd of [20, 45, 90, 135, 175, -60]) {
      for (const js of [0, 30, 60, 95, 100]) {
        // From 1 %: at 0 % there is no sail, and the jib keeps its angle (as for the main).
        for (const [from, to] of [
          [1, 100],
          [100, 1],
        ] as const) {
          for (const step of jibSweep(wd, 'ctl_jib_furl', js, from, to)) {
            expect(step.change, `wd ${wd} js ${js} jf → ${step.value}`).toBeLessThanOrEqual(
              step.nearHeld ? HELD_STEP_LIMIT_DEG : 5,
            );
          }
        }
      }
    }
  });

  it('decision after M3: jib sheet 100 % = sheet released; furling from 100 % to 0 % out ends fully furled, every step within the continuity limit', () => {
    for (const wd of [30, 90, 150, -60]) {
      // In the solver, 1 % at a time.
      for (const step of jibSweep(wd, 'ctl_jib_furl', 100, 100, 0)) {
        expect(step.blocked, `wd ${wd} jf ${step.value}`).toBe(false);
        expect(step.change, `wd ${wd} jf ${step.value}`).toBeLessThanOrEqual(
          step.nearHeld ? HELD_STEP_LIMIT_DEG : 5,
        );
      }
      // In the app: the rope lags behind the control, and the jib ends rolled away.
      let rig = initialRig(controls({ ctl_wind_dir: wd, ctl_jib_sheet: 100 }));
      rig = run(rig, { ctl_wind_dir: wd, ctl_jib_sheet: 100, ctl_jib_furl: 0 }, 6);
      expect(rig.jibSolution.unfurled, `wd ${wd}`).toBe(0);
      expect(rig.jibSolution.furled).toBe(true);
      expect(rig.jibSolution.furlBlocked).toBe(false);
      // The released sheet ran out as far as the furl needed (about 6 m of working length).
      expect(rig.jibSolution.sheetAvailable).toBeCloseTo(jibSheetSpan(0, 0), 6);
      expect(jibSheetPaidOutFor(rig.jibSolution.sheetAvailable)).toBeGreaterThan(10);
    }
  });

  it('decision after M3: releasing the sheet lets a blocked jib roll in smoothly, never in one jump', () => {
    let rig = initialRig(controls({ ctl_jib_sheet: 0 }));
    rig = run(rig, { ctl_jib_sheet: 0, ctl_jib_furl: 0 }, 3);
    expect(rig.jibSolution.unfurled).toBeGreaterThan(0.94);
    let largest = 0;
    for (let frame = 0; frame < 6 * 60; frame += 1) {
      const before = rig.jibSolution.unfurled;
      rig = run(rig, { ctl_jib_sheet: 100, ctl_jib_furl: 0 }, 1 / 60);
      largest = Math.max(largest, Math.abs(rig.jibSolution.unfurled - before));
    }
    expect(rig.jibSolution.unfurled).toBe(0);
    // The rope's lag (controlResponseTimeS 0.4 s) moves at most about 4 % per frame at 60 fps.
    expect(largest).toBeLessThan(0.05);

    // Passing 100 % for a moment on the way to 90 % furls the jib only a little further.
    rig = initialRig(controls({ ctl_jib_sheet: 0 }));
    rig = run(rig, { ctl_jib_sheet: 0, ctl_jib_furl: 0 }, 3);
    rig = run(rig, { ctl_jib_sheet: 100, ctl_jib_furl: 0 }, 2 / 60);
    rig = run(rig, { ctl_jib_sheet: 90, ctl_jib_furl: 0 }, 6);
    expect(rig.jibSolution.unfurled).toBeGreaterThan(minUnfurledFor(availableJibSheet(90)) - 0.1);
  });

  it('review of M3: a released sheet lets the jib keep its angle while it furls; the jib flaps, the sheet is slack', () => {
    for (const wd of [45, 90, 135]) {
      let rig = initialRig(controls({ ctl_wind_dir: wd, ctl_jib_sheet: 100 }));
      const fullyOut = Math.abs(rig.jibSolution.headingDeg);
      for (let frame = 0; frame < 6 * 60; frame += 1) {
        rig = run(rig, { ctl_wind_dir: wd, ctl_jib_sheet: 100, ctl_jib_furl: 0 }, 1 / 60);
        const jib = rig.jibSolution;
        if (jib.furled || jib.unfurled >= 1) continue;
        expect(Math.abs(jib.headingDeg), `wd ${wd} out ${jib.unfurled}`).toBeCloseTo(fullyOut, 3);
        expect(jib.fill).toBe(0);
        expect(jib.sheet.state).toBe('slack');
      }
      expect(rig.jibSolution.unfurled).toBe(0);
    }
  });

  it('review of M3: the "fighting" chip clears as soon as the jib is out far enough for the hauled sheet', () => {
    let rig = initialRig(controls({ ctl_jib_sheet: 100 }));
    rig = run(rig, { ctl_jib_sheet: 100, ctl_jib_furl: 0 }, 6);
    rig = run(rig, { ctl_jib_sheet: 0, ctl_jib_furl: 0 }, 2);
    expect(rig.jibSolution.sheet.state).toBe('fighting');
    rig = run(rig, { ctl_jib_sheet: 0, ctl_jib_furl: 100 }, 2);
    expect(rig.jibSolution.unfurled).toBeGreaterThan(0.99);
    expect(rig.jibSolution.sheet.state).not.toBe('fighting');
  });

  it('decision after M3: the released sheet changes nothing for a fully unfurled jib (PT-11 still holds)', () => {
    for (const wd of [30, 90, 150]) {
      const jib = settle({ ctl_wind_dir: wd, ctl_jib_sheet: 100, ctl_jib_furl: 100 });
      expect(jib.sheetReleased).toBe(true);
      expect(jib.sheetAvailable).toBeCloseTo(availableJibSheet(100), 12);
    }
  });

  it('decision after M3: hauling the sheet on a furled jib does not pull it out of its furl; the sheet fights the furling line', () => {
    let rig = initialRig(controls({ ctl_jib_sheet: 100 }));
    rig = run(rig, { ctl_jib_sheet: 100, ctl_jib_furl: 0 }, 6);
    expect(rig.jibSolution.unfurled).toBe(0);
    rig = run(rig, { ctl_jib_sheet: 95, ctl_jib_furl: 0 }, 3);
    expect(rig.jibSolution.unfurled).toBe(0);
    expect(rig.jibSolution.sheet.state).toBe('fighting');
    // Unfurling with the sheet hauled: the jib comes out as far as the sheet allows.
    rig = run(rig, { ctl_jib_sheet: 95, ctl_jib_furl: 100 }, 6);
    expect(rig.jibSolution.unfurled).toBe(1);
    expect(rig.jibSolution.sheet.state).not.toBe('fighting');
  });

  it('no NaN anywhere across all wind directions × jib control values', () => {
    for (const wd of winds.filter((_, i) => i % 2 === 0)) {
      for (const ws of [0, 0.5, 12, 30]) {
        for (const js of [0, 33, 100]) {
          for (const jf of [0, 50, 100]) {
            const rig = initialRig(
              controls({
                ctl_wind_dir: wd,
                ctl_wind_speed: ws,
                ctl_jib_sheet: js,
                ctl_jib_furl: jf,
              }),
            );
            const j = rig.jibSolution;
            for (const value of [j.phiDeg, j.headingDeg, j.fill, j.aoaDeg, j.carZ, j.twistDeg]) {
              expect(Number.isFinite(value), `wd ${wd} ws ${ws} js ${js} jf ${jf}`).toBe(true);
            }
            for (const rope of ropeDrawings(rig)) {
              for (const strand of rope.strands) {
                for (const p of strand.points) expect(p.every(Number.isFinite), rope.id).toBe(true);
              }
            }
            const grid = jibSailGrid({
              phiDeg: j.phiDeg,
              unfurled: j.unfurled,
              fill: j.fill,
              side: j.side,
              windSpeedKn: ws,
              timeS: 1.3,
            });
            for (const p of grid.points) expect(p.every(Number.isFinite)).toBe(true);
          }
        }
      }
    }
  }, 60_000);

  it('the jib sheet is drawn with two parts from the clew to the car, then into the mast and from its foot to the "Genoa sheet" clutch', () => {
    const rig = initialRig(controls({ ctl_wind_dir: 90, ctl_jib_sheet: 100 }));
    const sheet = ropeDrawings(rig).find((rope) => rope.id === 'rope_jib_sheet');
    expect(sheet?.strands).toHaveLength(4);
    const clew = jibClew(rig.jibPhi.value, rig.jibSolution.unfurled);
    const car = carPoint(clew);
    for (const part of sheet?.strands.slice(0, 2) ?? []) {
      const first = part.points[0] as Vec3;
      const last = part.points[part.points.length - 1] as Vec3;
      expect(Math.hypot(first[0] - clew[0], first[1] - clew[1], first[2] - clew[2])).toBeLessThan(
        0.1,
      );
      expect(Math.hypot(last[0] - car[0], last[1] - car[1], last[2] - car[2])).toBeLessThan(0.1);
    }
    // M3b: car → into the mast front (strand 2); out of the mast foot → clutch (strand 3).
    const intoMast = sheet?.strands[2]?.points ?? [];
    expect(intoMast[0]?.[2]).toBeCloseTo(rig.jibSolution.carZ, 6);
    expect(Math.abs(intoMast[1]?.[0] ?? 9)).toBeLessThan(boat.rig.mast.sectionForeAft);
    const lead = sheet?.strands[3]?.points ?? [];
    const bankA = boat.cockpitHardware.clutchBanks.find((bank) => bank.id === 'clutch_bank_a');
    // Through the clutch (M5: then on into the starboard rope tail box).
    expect(lead.some((p) => p[2] > 0 && Math.abs(p[0] - (bankA?.x ?? 0)) < 0.5)).toBe(true);
    const end = lead[lead.length - 1] as Vec3;
    expect(end[2]).toBeGreaterThan(0);
    // The chord heading used for the angle matches the drawn clew.
    expect(Math.abs(jibHeadingDeg(clew))).toBeCloseTo(Math.abs(rig.jibSolution.headingDeg), 6);
  });
});

describe('jib furl in a shared link (M4a, jr)', () => {
  it('settledJibUnfurled gives the furl the solver settles at, from any furl reached so far', () => {
    for (const js of [0, 30, 60, 90, 99, 100]) {
      for (const jf of [0, 25, 40, 70, 100]) {
        for (const reached of [0, 0.25, 0.4, 0.7, 1]) {
          if (reached < jf / 100) continue;
          const rig = initialRig(controls({ ctl_jib_sheet: js, ctl_jib_furl: jf }), boat, {
            jibUnfurled: reached,
          });
          expect(rig.jibSolution.unfurled, `js=${js} jf=${jf} from ${reached}`).toBeCloseTo(
            settledJibUnfurled(js, jf, reached),
            9,
          );
        }
      }
    }
  });

  it('a link without history starts fully out: the same as initialRig always gave', () => {
    for (const js of [0, 50, 100]) {
      for (const jf of [0, 50, 100]) {
        const plain = initialRig(controls({ ctl_jib_sheet: js, ctl_jib_furl: jf }));
        expect(plain.jibSolution.unfurled).toBeCloseTo(settledJibUnfurled(js, jf, 1), 9);
      }
    }
  });
});
