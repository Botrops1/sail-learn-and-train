import { describe, expect, it } from 'vitest';
import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import { initialState, reduce, type AppState } from '../src/app/store';
import { obstacleKind, type ExerciseLevel } from '../src/model/exercises';
import { area } from '../src/model/area';
import { scopeNeededM } from '../src/model/anchor';
import { depthAt } from '../src/model/seabed';
import {
  anchorPilot,
  buoyPilot,
  enterPilot,
  goodRun,
  H,
  leavePilot,
  nightPilot,
  stern,
  sternAnchorPilot,
  turnPilot,
  type Pilot,
} from './harbourPilot';

describe('leave-berth good runs (PHASE10_SPEC 16.7)', () => {
  const limits: Record<ExerciseLevel, number[]> = {
    easy: [3, 3, 50, 38],
    normal: [3, 3, 49, 38],
    hard: [3, 3, 38, 36],
  };
  for (const level of ['easy', 'normal', 'hard'] as const) {
    it(`${level}: ends done with no mistake, each step within its limit`, () => {
      const result = goodRun('leave-berth', level, leavePilot(level), 200);
      expect(result.status).toBe('done');
      expect(result.mistakes).toEqual([]);
      limits[level].forEach((limit, i) => {
        expect(result.durations[i] ?? Infinity, `step ${i}`).toBeLessThanOrEqual(limit);
      });
    });
  }
});

describe('enter-berth good runs (PHASE10_SPEC 17.6)', () => {
  // [fenders, line-up + reverse-in together, stern-lines, lazy-line, made-fast]
  const limits: Record<ExerciseLevel, number[]> = {
    easy: [3, 216, 4, 31, 34],
    normal: [3, 206, 4, 31, 27],
    hard: [3, 225, 4, 31, 12],
  };
  for (const level of ['easy', 'normal', 'hard'] as const) {
    it(`${level}: ends done with no mistake, each step within its limit`, () => {
      const result = goodRun('enter-berth', level, enterPilot(level), 400);
      expect(result.status).toBe('done');
      expect(result.mistakes).toEqual([]);
      const d = result.durations;
      const got = [d[0], (d[1] ?? 0) + (d[2] ?? 0), d[3], d[4], d[5]];
      limits[level].forEach((limit, i) => {
        expect(got[i] ?? Infinity, `step ${i}: ${got.join(', ')}`).toBeLessThanOrEqual(limit);
      });
    });
  }
});

/** Runs a pilot until `stop` says so (or `limitS`); returns the state and the app seconds. */
function runUntil(
  level: ExerciseLevel,
  pilot: Pilot,
  stop: (s: AppState, t: number) => boolean,
  limitS: number,
) {
  let s = parseUrlState(exerciseStartLink('enter-berth', initialState(), 'easy', { level }));
  s = reduce(s, { type: 'exercise', command: 'start' });
  let t = 0;
  while (t < limitS && !stop(s, t)) {
    s = pilot(s, t);
    s = reduce(s, { type: 'step', dt: 0.05 });
    t += 0.05;
  }
  return { s, t };
}
const finished = (s: AppState) =>
  s.exercise === null || ['done', 'failed', 'mistake'].includes(s.exercise.status);

describe('enter-berth named tests (PHASE10_SPEC 17.6)', () => {
  it('PT-51 the entering exercise ends with the lazy line holding the bow', () => {
    let { s } = runUntil('normal', enterPilot('normal'), finished, 400);
    expect(s.exercise?.status).toBe('done');
    for (let i = 0; i < 600; i += 1) s = reduce(s, { type: 'step', dt: 0.05 });
    const off = Math.abs(((H(s) - 180 + 540) % 360) - 180);
    const gap = area.marina.quayFaceNorthM - stern(s)[1];
    expect(off).toBeLessThanOrEqual(15);
    expect(gap).toBeGreaterThanOrEqual(0.3);
    expect(gap).toBeLessThanOrEqual(3.0);
  });

  it('PT-50 the hard level is finished with no mistake', () => {
    const { s } = runUntil('hard', enterPilot('hard'), finished, 400);
    expect(s.exercise?.status).toBe('done');
    expect(s.exercise?.log.filter((e) => e.kind === 'mistake')).toEqual([]);
    for (const r of s.contact.reports) expect(obstacleKind(r.obstacleId)).not.toBe('lazy-line');
  });

  it('PT-52 the engine in gear while the crew walks the lazy line fouls the propeller', () => {
    const r = runUntil(
      'normal',
      enterPilot('normal'),
      (st) => finished(st) || st.lines.crew !== null,
      400,
    );
    expect(r.s.lines.crew).not.toBeNull();
    let st = reduce(r.s, { type: 'engine', command: { leverPct: 30 } });
    let elapsed = 0;
    while (elapsed < 5 && st.exercise?.status === 'running') {
      st = reduce(st, { type: 'step', dt: 0.05 });
      elapsed += 0.05;
    }
    expect(st.exercise?.status).toBe('failed');
    expect(st.exercise?.log.some((e) => e.kind === 'mistake' && e.mistakeId === 'propeller')).toBe(
      true,
    );
  });

  it('a run that skips the fenders ends with the fenders-in mistake (M59 alert)', () => {
    const { s } = runUntil(
      'easy',
      enterPilot('easy', { skipFenders: true }),
      (st) => finished(st),
      170,
    );
    expect(s.exercise?.status).toBe('mistake');
    expect(s.exercise?.log.some((e) => e.kind === 'mistake' && e.mistakeId === 'fenders-in')).toBe(
      true,
    );
  });
});

describe("M75: the neighbours' bow lines in the store (PHASE10_SPEC 17.6)", () => {
  /** The level's start, settled, the boat placed at rest, the lever set, then 0.05 s frames. */
  function placed(level: ExerciseLevel, eastM: number, northM: number, leverPct: number) {
    let s = parseUrlState(exerciseStartLink('enter-berth', initialState(), 'easy', { level }));
    s = reduce(s, { type: 'exercise', command: 'start' });
    for (let i = 0; i < 24; i += 1) s = reduce(s, { type: 'step', dt: 0.05 });
    s = { ...s, boat: { ...s.boat, eastM, northM, headingDeg: 90, speedMps: 0 } };
    return reduce(s, { type: 'engine', command: { leverPct } });
  }
  const frames = (s: AppState, seconds: number) => {
    for (let i = 0; i < Math.round(seconds / 0.05); i += 1)
      s = reduce(s, { type: 'step', dt: 0.05 });
    return s;
  };

  it("PT-52 a neighbour's lazy line under the propeller in gear fouls it (Hard)", () => {
    const start = placed('hard', 1.65, 1480.9, 15);
    expect(frames(start, 1.5).lines.fouled).toBe(false);
    const s = frames(start, 3.0);
    expect(s.lines.fouled).toBe(true);
    expect(s.contact.reports[0]?.obstacleId).toBe('propeller');
    expect(s.exercise?.status).toBe('failed');
    expect(s.exercise?.log.some((e) => e.kind === 'mistake' && e.mistakeId === 'propeller')).toBe(
      true,
    );
  });

  it('in neutral over a bow line nothing happens', () => {
    const s = frames(placed('hard', 1.65, 1480.9, 0), 5);
    expect(s.lines.fouled).toBe(false);
    expect(s.contact.reports).toEqual([]);
    expect(s.exercise?.status).toBe('running');
  });

  it('Normal only draws the lines', () => {
    const s = frames(placed('normal', 12.65, 1482.4, 15), 3);
    expect(s.lines.fouled).toBe(false);
    expect(s.contact.reports).toEqual([]);
    expect(s.exercise?.status).toBe('running');
  });

  it('the keel over a line makes one touch report and the lazy-line mistake', () => {
    const s = frames(placed('hard', -2.67, 1480.0, 0), 3);
    expect(s.contact.reports).toHaveLength(1);
    expect(s.contact.reports[0]).toMatchObject({
      obstacleId: 'lazy-line-0-11',
      partId: 'rope_lazy_line',
      part: 'keel',
      severity: 'touch',
    });
    expect(s.exercise?.status).toBe('mistake');
    expect(s.exercise?.log.filter((e) => e.kind === 'mistake')).toHaveLength(1);
    expect(s.exercise?.log.find((e) => e.kind === 'mistake')).toMatchObject({
      mistakeId: 'lazy-line',
    });
  });

  it('the rudder over a line reports part stern', () => {
    const s = frames(placed('hard', 5.0, 1481.0, 0), 3);
    expect(s.contact.reports).toHaveLength(1);
    expect(s.contact.reports[0]?.part).toBe('stern');
    expect(s.exercise?.status).toBe('mistake');
    expect(s.exercise?.log.some((e) => e.kind === 'mistake' && e.mistakeId === 'lazy-line')).toBe(
      true,
    );
  });
});

describe('turn-own-length good run (PHASE10_SPEC 18.6)', () => {
  it('ends done with no mistake, each step within its limit, the centre inside 10 m of the start', () => {
    const base = turnPilot();
    let far = 0;
    const watched: Pilot = (s, t) => {
      far = Math.max(far, Math.hypot(s.boat.eastM + 40, s.boat.northM - 1468));
      return base(s, t);
    };
    const result = goodRun('turn-own-length', 'normal', watched, 200);
    expect(result.status).toBe('done');
    expect(result.mistakes).toEqual([]);
    expect(result.durations[0] ?? Infinity, 'kick').toBeLessThanOrEqual(28);
    expect(result.durations[1] ?? Infinity, 'spin').toBeLessThanOrEqual(50);
    expect(far).toBeLessThanOrEqual(10);
  });

  it('PT-27 PT-48 the kick step turns her to starboard with only engine bursts', () => {
    let s = parseUrlState(exerciseStartLink('turn-own-length', initialState(), 'easy'));
    s = reduce(s, { type: 'exercise', command: 'start' });
    const pilot = turnPilot();
    let t = 0;
    let thrusterUsed = false;
    while (s.exercise?.status === 'running' && s.exercise.step === 0 && t < 28) {
      s = pilot(s, t);
      if (s.thrusters.bow !== 0 || s.thrusters.stern !== 0) thrusterUsed = true;
      s = reduce(s, { type: 'step', dt: 0.05 });
      t += 0.05;
    }
    expect(s.exercise?.step).toBe(1);
    expect(thrusterUsed).toBe(false);
    const turned = ((s.boat.headingDeg - 90 + 540) % 360) - 180;
    expect(turned).toBeGreaterThanOrEqual(15);
    expect(turned).toBeLessThanOrEqual(45);
  });

  it('PT-33 the thrusters spin her on the spot', () => {
    let s = parseUrlState(exerciseStartLink('turn-own-length', initialState(), 'easy'));
    s = reduce(s, { type: 'exercise', command: 'start' });
    const pilot = turnPilot();
    let t = 0;
    while (s.exercise?.status === 'running' && s.exercise.step === 0 && t < 60) {
      s = pilot(s, t);
      s = reduce(s, { type: 'step', dt: 0.05 });
      t += 0.05;
    }
    expect(s.exercise?.step).toBe(1);
    const [e0, n0] = [s.boat.eastM, s.boat.northM];
    let worst = 0;
    while (s.exercise?.status === 'running' && s.exercise.step === 1 && t < 120) {
      s = pilot(s, t);
      s = reduce(s, { type: 'step', dt: 0.05 });
      t += 0.05;
      worst = Math.max(worst, Math.hypot(s.boat.eastM - e0, s.boat.northM - n0));
    }
    expect(s.exercise?.status).toBe('done');
    expect(worst).toBeLessThanOrEqual(10);
  });

  it('long bursts leave the circle: the card "Out of the circle"', () => {
    let s = parseUrlState(exerciseStartLink('turn-own-length', initialState(), 'easy'));
    s = reduce(s, { type: 'exercise', command: 'start' });
    s = reduce(s, { type: 'engine', command: { leverPct: 60 } });
    for (let i = 0; i < 400 && s.exercise?.status === 'running'; i += 1)
      s = reduce(s, { type: 'step', dt: 0.05 });
    expect(s.exercise?.log.some((e) => e.kind === 'mistake' && e.mistakeId === 'left-circle')).toBe(
      true,
    );
  });
});

describe('mooring-buoy good run (PHASE10_SPEC 18.6)', () => {
  it('ends done with no mistake, each step within its limit', () => {
    const result = goodRun('mooring-buoy', 'normal', buoyPilot(), 400);
    expect(result.status).toBe('done');
    expect(result.mistakes).toEqual([]);
    [137, 3, 15, 3, 92].forEach((limit, i) => {
      expect(
        result.durations[i] ?? Infinity,
        `step ${i}: ${result.durations.join(', ')}`,
      ).toBeLessThanOrEqual(limit);
    });
  });
});

/** The anchor-shore good run, frame by frame (PHASE10_SPEC 19.5); `watch` sees every state. */
function anchorRun(watch: (s: AppState, t: number) => void = () => undefined) {
  let s = parseUrlState(exerciseStartLink('anchor-shore', initialState(), 'easy'));
  s = reduce(s, { type: 'exercise', command: 'start' });
  const pilot = anchorPilot();
  const stepAt: number[] = [0];
  let t = 0;
  while (s.exercise !== null && s.exercise.status !== 'done' && t < 450) {
    s = pilot(s, t);
    s = reduce(s, { type: 'step', dt: 0.05 });
    t += 0.05;
    watch(s, t);
    const run = s.exercise;
    if (run !== null && run.step > stepAt.length - 1) stepAt.push(t);
  }
  const run = s.exercise;
  return {
    state: s,
    status: run?.status,
    durations: stepAt.map((at, i) => (stepAt[i + 1] ?? t) - at),
    mistakes: run?.log.filter((e) => e.kind === 'mistake') ?? [],
  };
}

describe('anchor-shore good run (PHASE10_SPEC 19.5)', () => {
  it('ends done with no mistake, each step within its limit, 55-70 m of chain, anchor set', () => {
    const result = anchorRun();
    expect(result.status).toBe('done');
    expect(result.mistakes).toEqual([]);
    [105, 37, 97, 59, 82, 107].forEach((limit, i) => {
      expect(
        result.durations[i] ?? Infinity,
        `step ${i}: ${result.durations.join(', ')}`,
      ).toBeLessThanOrEqual(limit);
    });
    const { anchor } = result.state;
    expect(anchor.chainOutM).toBeGreaterThanOrEqual(55);
    expect(anchor.chainOutM).toBeLessThanOrEqual(70);
    expect(anchor.phase).toBe('set');
  });

  it('PT-31 the scope step needs the chain the rules ask for', () => {
    let stepBefore = 0;
    let needed = 0;
    let passed = false;
    anchorRun((s) => {
      const run = s.exercise;
      if (run === null) return;
      const a = s.anchor;
      if (a.phase !== 'bottom' && a.phase !== 'set') return;
      needed = scopeNeededM(depthAt(a.eastM, a.northM), 6);
      // While the chain was shorter than the rules ask, the run was still at the scope step.
      if (a.chainOutM < needed) expect(run.step).toBeLessThanOrEqual(2);
      if (stepBefore === 2 && run.step === 3) {
        passed = true;
        expect(a.chainOutM).toBeGreaterThanOrEqual(needed);
      }
      stepBefore = run.step;
    });
    expect(passed).toBe(true);
    expect(needed).toBeGreaterThanOrEqual(45.2);
    expect(needed).toBeLessThanOrEqual(49.2);
  });

  it('PT-57 the anchor is set only after going astern', () => {
    let stepBefore = 0;
    let checked = false;
    anchorRun((s) => {
      const run = s.exercise;
      if (run === null) return;
      if (stepBefore === 2 && run.step === 3) {
        checked = true;
        expect(s.anchor.phase).toBe('bottom');
      }
      stepBefore = run.step;
    });
    expect(checked).toBe(true);
  });

  it('PT-53 the good run never touches the bottom', () => {
    const result = anchorRun();
    expect(
      result.state.contact.reports.filter((r) => obstacleKind(r.obstacleId) === 'ground'),
    ).toEqual([]);
  });

  it('too little chain: going astern hard drags the anchor and shows the card "The anchor is dragging"', () => {
    let s = parseUrlState(exerciseStartLink('anchor-shore', initialState(), 'easy'));
    s = reduce(s, { type: 'exercise', command: 'start' });
    const pilot = anchorPilot();
    let stopped = false;
    for (let t = 0; t < 250 && s.exercise?.status === 'running'; t += 0.05) {
      s = pilot(s, t);
      if (stopped || (s.exercise?.step === 2 && s.anchor.chainOutM > 25)) {
        stopped = true;
        s = reduce(s, { type: 'windlass', motion: 'off' });
        s = reduce(s, { type: 'engine', command: { leverPct: -60 } });
      }
      s = reduce(s, { type: 'step', dt: 0.05 });
    }
    expect(s.exercise?.log.some((e) => e.kind === 'mistake' && e.mistakeId === 'dragging')).toBe(
      true,
    );
  });
});

/**
 * The night-anchor good run, frame by frame (PHASE10_SPEC 28.5): `anchorRun`'s learner, then the
 * night at ×240 (the coach sets it in the last step); `watch` sees every state.
 */
export function nightRun(watch: (s: AppState, t: number) => void = () => undefined) {
  let s = parseUrlState(exerciseStartLink('night-anchor', initialState(), 'easy'));
  s = reduce(s, { type: 'exercise', command: 'start' });
  const pilot = nightPilot();
  const stepAt: number[] = [0];
  let t = 0;
  while (s.exercise !== null && s.exercise.status !== 'done' && t < 650) {
    s = pilot(s, t);
    s = reduce(s, { type: 'step', dt: 0.05 });
    t += 0.05;
    watch(s, t);
    const run = s.exercise;
    if (run !== null && run.step > stepAt.length - 1) stepAt.push(t);
  }
  const run = s.exercise;
  return {
    state: s,
    status: run?.status,
    durations: stepAt.map((at, i) => (stepAt[i + 1] ?? t) - at),
    mistakes: run?.log.filter((e) => e.kind === 'mistake') ?? [],
  };
}

describe('night-anchor good run (PHASE10_SPEC 28.5)', () => {
  it('ends done at 07:00 with no mistake, each step within its limit, the anchor set', () => {
    const result = nightRun();
    expect(result.status).toBe('done');
    expect(result.mistakes).toEqual([]);
    [96, 33, 88, 53, 73, 92, 227].forEach((limit, i) => {
      expect(
        result.durations[i] ?? Infinity,
        `step ${i}: ${result.durations.join(', ')}`,
      ).toBeLessThanOrEqual(limit);
    });
    const { state } = result;
    // 07:00:00 to 07:00:30 on 2 June, local (summer time: UTC+2).
    const local = (state.clock.utcMs - Date.UTC(2026, 5, 2, 5, 0, 0)) / 1000;
    expect(local).toBeGreaterThanOrEqual(0);
    expect(local).toBeLessThanOrEqual(30);
    expect(state.anchor.chainOutM).toBeGreaterThanOrEqual(55);
    expect(state.anchor.chainOutM).toBeLessThanOrEqual(64);
    expect(state.anchor.phase).toBe('set');
    expect(state.anchor.alarm).toBe(false);
    expect(state.contact.reports.filter((r) => obstacleKind(r.obstacleId) === 'ground')).toEqual(
      [],
    );
  });

  it('PT-31 the night needs the chain the rules ask for', () => {
    let stepBefore = 0;
    let passed = false;
    nightRun((s) => {
      const run = s.exercise;
      if (run === null) return;
      const a = s.anchor;
      if (stepBefore === 2 && run.step === 3) {
        passed = true;
        expect(a.chainOutM).toBeGreaterThanOrEqual(scopeNeededM(depthAt(a.eastM, a.northM), 6));
      }
      stepBefore = run.step;
    });
    expect(passed).toBe(true);
  });

  it('PT-64 the land breeze blows off the rocks at night', () => {
    let seen = false;
    nightRun((s) => {
      const local = (s.clock.utcMs - Date.UTC(2026, 5, 1, 23, 0, 0)) / 3_600_000;
      // 01:00 local on 2 June is 23:00 UTC on 1 June.
      if (!seen && s.exercise?.step === 6 && local >= 0) {
        seen = true;
        expect(Math.abs(s.wind.dirDeg + 90)).toBeLessThanOrEqual(15);
        expect(s.controls.ctl_wind_speed).toBeCloseTo(6, 2);
      }
    });
    expect(seen).toBe(true);
  });
});

/** The stern-to-anchor good run, frame by frame (PHASE10_SPEC 20.5); `watch` sees every state. */
function sternAnchorRun(watch: (s: AppState, t: number) => void = () => undefined, afterDoneS = 0) {
  let s = parseUrlState(exerciseStartLink('stern-to-anchor', initialState(), 'easy'));
  s = reduce(s, { type: 'exercise', command: 'start' });
  const pilot = sternAnchorPilot();
  const stepAt: number[] = [0];
  let t = 0;
  while (s.exercise !== null && s.exercise.status !== 'done' && t < 450) {
    s = pilot(s, t);
    s = reduce(s, { type: 'step', dt: 0.05 });
    t += 0.05;
    watch(s, t);
    const run = s.exercise;
    if (run !== null && run.step > stepAt.length - 1) stepAt.push(t);
  }
  const run = s.exercise;
  const result = {
    state: s,
    status: run?.status,
    durations: stepAt.map((at, i) => (stepAt[i + 1] ?? t) - at),
    mistakes: run?.log.filter((e) => e.kind === 'mistake') ?? [],
  };
  // PT-51: after `done`, the engine stays in neutral and the chain holds the bow.
  for (let after = 0; after < afterDoneS; after += 0.05) {
    s = reduce(s, { type: 'engine', command: { leverPct: 0 } });
    s = reduce(s, { type: 'step', dt: 0.05 });
  }
  return { ...result, after: s };
}

describe('stern-to-anchor good run (PHASE10_SPEC 20.5)', () => {
  it('ends done with no mistake, each step within its limit, 38-46 m of chain', () => {
    const result = sternAnchorRun();
    expect(result.status).toBe('done');
    expect(result.mistakes).toEqual([]);
    [79, 24, 206, 3, 29].forEach((limit, i) => {
      expect(
        result.durations[i] ?? Infinity,
        `step ${i}: ${result.durations.join(', ')}`,
      ).toBeLessThanOrEqual(limit);
    });
    const { anchor } = result.state;
    expect(anchor.chainOutM).toBeGreaterThanOrEqual(38);
    expect(anchor.chainOutM).toBeLessThanOrEqual(46);
    expect(anchor.phase).toBe('set');
  });

  it('PT-31 stern-to the chain is more than four times the depth', () => {
    const result = sternAnchorRun();
    expect(result.state.anchor.chainOutM).toBeGreaterThanOrEqual(4 * (5 + 1.8));
  });

  it('PT-51 the anchor holds the bow stern-to', () => {
    const result = sternAnchorRun(undefined, 30);
    const s = result.after;
    expect(Math.abs(((H(s) - 180 + 540) % 360) - 180)).toBeLessThanOrEqual(10);
    const gap = area.marina.quayFaceNorthM - stern(s)[1];
    expect(gap).toBeGreaterThanOrEqual(0.3);
    expect(gap).toBeLessThanOrEqual(3.0);
  });
});
