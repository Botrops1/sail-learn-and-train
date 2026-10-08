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
  jibSheetMin,
  jibSheetPaidOut,
  jibSheetSpan,
  minUnfurledFor,
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

  it('ℓ_geoMin is the clew–car distance with the jib centred, about 0.35 m (minClewToCar)', () => {
    expect(jibSheetMin()).toBeCloseTo(jibSheetSpan(0), 9);
    expect(jibSheetMin()).toBeCloseTo(boat.sails.jib.sheet.minClewToCar, 1);
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
    expect(jibSheetPaidOut(100)).toBeCloseTo(2 * boat.sails.jib.sheet.maxEaseBeyondMin, 9);
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

  it('PT-10 the car is always on the leeward side, at the end of the track once the jib is out', () => {
    for (let wd = 10; wd <= 165; wd += 5) {
      for (const [w, side] of [
        [wd, -1],
        [-wd, 1],
      ] as const) {
        const jib = settle({ ctl_wind_dir: w, ctl_jib_sheet: 50 });
        expect(jib.side, `wd ${w}`).toBe(side);
        expect(Math.sign(jib.carZ), `wd ${w}`).toBe(side);
      }
    }
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
    // On the track: base twist only.
    expect(at(5).twistDeg).toBeCloseTo(boat.visual.baseTwistDeg, 9);
    expect(at(100).twistDeg).toBeGreaterThan(at(50).twistDeg);
    expect(at(50).twistDeg).toBeGreaterThan(at(20).twistDeg);
    expect(at(100).twistDeg).toBeGreaterThan(boat.visual.baseTwistDeg + 10);
    const clewY = (js: number) => jibClew(at(js).phiDeg)[1];
    expect(clewY(100)).toBeGreaterThan(clewY(20) + 0.1);

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
    expect(openTop(20)).toBeGreaterThan(0);
    expect(openTop(100)).toBeGreaterThan(openTop(20) + 8);
  });

  it('PT-13 jib sheet hauled: the jib cannot be furled; the furl stops with a hint', () => {
    let rig = initialRig(controls({ ctl_jib_sheet: 0 }));
    rig = run(rig, { ctl_jib_sheet: 0, ctl_jib_furl: 0 }, 3);
    expect(rig.jibSolution.furlBlocked).toBe(true);
    expect(rig.jibSolution.unfurled).toBeCloseTo(1, 6);
    expect(rig.jibSolution.sheet.state).toBe('taut');
  });

  it('PT-13 easing the sheet lets the furling continue, as far as the sheet allows', () => {
    let rig = initialRig(controls({ ctl_jib_sheet: 0 }));
    rig = run(rig, { ctl_jib_sheet: 0, ctl_jib_furl: 0 }, 3);
    const stuck = rig.jibSolution.unfurled;
    rig = run(rig, { ctl_jib_sheet: 50, ctl_jib_furl: 0 }, 3);
    const eased = rig.jibSolution.unfurled;
    expect(eased).toBeLessThan(stuck - 0.1);
    rig = run(rig, { ctl_jib_sheet: 100, ctl_jib_furl: 0 }, 3);
    expect(rig.jibSolution.unfurled).toBeLessThan(eased - 0.05);
    // The furl reached is exactly what the sheet allows: the clew is as far forward as it reaches.
    expect(jibSheetSpan(0, rig.jibSolution.unfurled)).toBeCloseTo(availableJibSheet(100), 2);
    // A furl the sheet allows is not blocked.
    const partly = settle({ ctl_jib_sheet: 100, ctl_jib_furl: 90 });
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
    expect(minUnfurledFor(availableJibSheet(0))).toBeCloseTo(1, 6);
  });

  it('PT-13 the drawn furling line moves with the jib actually furled, not with the blocked request', () => {
    const blocked = initialRig(controls({ ctl_jib_sheet: 0, ctl_jib_furl: 0 }));
    const line = ropeDrawings(blocked).find((rope) => rope.id === 'rope_jib_furling_line');
    expect(line?.strands[0]?.feed).toBeCloseTo(jibFurlingLinePaidOut(1), 9);
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

  it('continuity: a 1 % jib control change never moves the jib by more than 5° (except just after a blocked furl is freed)', () => {
    for (const wd of [20, 45, 90, 135, 175, -60]) {
      for (const [id, fixed] of [
        ['ctl_jib_sheet', { ctl_jib_furl: 100, ctl_jib_sheet: 0 }],
        ['ctl_jib_sheet', { ctl_jib_furl: 80, ctl_jib_sheet: 0 }],
        ['ctl_jib_furl', { ctl_jib_sheet: 30, ctl_jib_furl: 0 }],
        ['ctl_jib_furl', { ctl_jib_sheet: 60, ctl_jib_furl: 0 }],
        ['ctl_jib_furl', { ctl_jib_sheet: 100, ctl_jib_furl: 0 }],
      ] as const) {
        let previous: JibSolution | null = null;
        let sinceFreed = Infinity;
        for (let value = 0; value <= 100; value += 1) {
          const jib = solveJib(
            {
              windFromDeg: wd,
              windSpeedKn: 12,
              sheetPct: id === 'ctl_jib_sheet' ? value : fixed.ctl_jib_sheet,
              unfurledPct: id === 'ctl_jib_furl' ? value : fixed.ctl_jib_furl,
              boomSide: wd > 0 ? -1 : 1,
            },
            previous ?? { side: wd > 0 ? -1 : 1, phiDeg: 0 },
          );
          sinceFreed = previous?.furlBlocked && !jib.furlBlocked ? 0 : sinceFreed + 1;
          // While the furl is blocked the sheet holds the jib on the centreline. In the first
          // steps after that, a little spare sheet gives a lot of angle (near the centreline,
          // as for the first 1 % of main sheet), and 1 % of furl frees about 6 cm of sheet.
          const limit = sinceFreed <= 1 ? 10 : 5;
          if (previous) {
            expect(
              Math.abs(jib.headingDeg - previous.headingDeg),
              `wd ${wd} ${id} ${value}`,
            ).toBeLessThanOrEqual(limit);
          }
          previous = jib;
        }
      }
    }
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
  });

  it('the jib sheet is drawn with two parts from the clew to the car, then led to the "Genoa sheet" clutch', () => {
    const rig = initialRig(controls({ ctl_wind_dir: 90, ctl_jib_sheet: 100 }));
    const sheet = ropeDrawings(rig).find((rope) => rope.id === 'rope_jib_sheet');
    expect(sheet?.strands).toHaveLength(3);
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
    const lead = sheet?.strands[2]?.points ?? [];
    const end = lead[lead.length - 1] as Vec3;
    const bankA = boat.cockpitHardware.clutchBanks.find((bank) => bank.id === 'clutch_bank_a');
    expect(end[2]).toBeGreaterThan(0);
    expect(Math.abs(end[0] - (bankA?.x ?? 0))).toBeLessThan(0.5);
    // The chord heading used for the angle matches the drawn clew.
    expect(Math.abs(jibHeadingDeg(clew))).toBeCloseTo(Math.abs(rig.jibSolution.headingDeg), 6);
  });
});
