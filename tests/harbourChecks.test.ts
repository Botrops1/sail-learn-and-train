import { describe, expect, it } from 'vitest';
import { actionText } from '../src/ui/exerciseDebrief';
import { shownTarget, stepExercise } from '../src/app/exerciseRun';
import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import { initialState, reduce, type AppState } from '../src/app/store';
import { area } from '../src/model/area';
import { scopeNeededM } from '../src/model/anchor';
import { depthAt } from '../src/model/seabed';
import { setLanguage } from '../src/ui/i18n';
import {
  boatPoint,
  checkPasses,
  exerciseDef,
  obstacleKind,
  type ExerciseCheck,
  type ExerciseTarget,
} from '../src/model/exercises';
import type { ContactReport } from '../src/model/contact';

const targets: ExerciseTarget[] = [{ id: 'fairway', shape: 'fairway' }];

function opened(level: 'easy' | 'normal' | 'hard' = 'normal', id = 'leave-berth'): AppState {
  return parseUrlState(exerciseStartLink(id, initialState(), 'easy', { level }));
}
const pass = (check: ExerciseCheck, s: AppState, t: ExerciseTarget[] = targets) =>
  checkPasses(
    check,
    { ...s, motion: s.motion ?? ({ awaDeg: 0 } as never) },
    { events: [], gusts: 0, targets: t },
  );

describe('M74 checks (16.7 test 2)', () => {
  const base = opened();
  const at = (e: number, n: number, hdg = 180): AppState => ({
    ...base,
    boat: { ...base.boat, eastM: e, northM: n, headingDeg: hdg },
  });

  it('boatPoint at heading 180 from the medium berth', () => {
    const b = at(2.8, 1490.4).boat;
    const [se, sn] = boatPoint(b, 'stern');
    const [be, bn] = boatPoint(b, 'bow');
    expect(se).toBeCloseTo(2.8, 6);
    expect(sn).toBeCloseTo(1499.0, 6);
    expect(be).toBeCloseTo(2.8, 6);
    expect(bn).toBeCloseTo(1483.45, 6);
  });

  it('quayGapM, berthOffsetM', () => {
    const s = at(2.8, 1490.4);
    expect(pass({ quayGapM: [0.5, 1.5] }, s)).toBe(true);
    expect(pass({ quayGapM: [0.5, 1.5] }, { ...s, harbour: { ...s.harbour, place: 'open' } })).toBe(
      false,
    );
    expect(pass({ berthOffsetM: [0, 0.1] }, s)).toBe(true);
    expect(pass({ berthOffsetM: [0, 0.01] }, s)).toBe(false);
  });

  it('linesOn, linesOff (also while the crew handles the line), fendersOut', () => {
    const s = at(2.8, 1490.4);
    expect(pass({ linesOn: ['sp', 'll'] }, s)).toBe(true);
    expect(pass({ linesOff: ['ll'] }, s)).toBe(false);
    const gone = { ...s, lines: { ...s.lines, lines: [] } };
    expect(pass({ linesOff: ['ll', 'sp'] }, gone)).toBe(true);
    const crewed = {
      ...gone,
      lines: { ...gone.lines, crew: { ...(s.lines.crew ?? {}), code: 'll' } as never },
    };
    expect(pass({ linesOff: ['ll'] }, crewed)).toBe(false);
    expect(pass({ fendersOut: true }, s)).toBe(s.harbour.fendersOut);
    expect(pass({ fendersOut: false }, s)).toBe(!s.harbour.fendersOut);
  });

  it('target fairway: centre holds in the fairway, not at the berth; unknown id fails', () => {
    expect(pass({ target: { id: 'fairway', point: 'centre' } }, at(-95, 1468))).toBe(true);
    expect(pass({ target: { id: 'fairway', point: 'centre' } }, at(-95, 1490))).toBe(false);
    expect(pass({ target: { id: 'fairway', point: 'centre', inside: false } }, at(-95, 1490))).toBe(
      true,
    );
    expect(pass({ target: { id: 'nope', point: 'centre' } }, at(-95, 1468))).toBe(false);
  });

  it('headingDeg', () => {
    expect(pass({ headingDeg: { to: 270, within: 15 } }, at(0, 1468, 262))).toBe(true);
    expect(pass({ headingDeg: { to: 270, within: 15 } }, at(0, 1468, 240))).toBe(false);
    expect(pass({ headingDeg: { to: 5, within: 15 } }, at(0, 1468, 355))).toBe(true);
  });

  it('anchor.scopeOk follows scopeNeededM', () => {
    const s = { ...at(0, 0), wind: { ...base.wind, twsKn: 6 } };
    const needed = scopeNeededM(depthAt(-1600, 0), 6);
    expect(needed).toBeCloseTo(47.2, 1);
    const anchored = (chain: number): AppState => ({
      ...s,
      anchor: { ...s.anchor, phase: 'set', chainOutM: chain, eastM: -1600, northM: 0 },
    });
    expect(pass({ anchor: { scopeOk: true } }, anchored(50))).toBe(true);
    expect(pass({ anchor: { scopeOk: true } }, anchored(40))).toBe(false);
    expect(pass({ anchor: { phase: ['set'], chainOutM: [45, 60] } }, anchored(50))).toBe(true);
    expect(area.marina.quayFaceNorthM).toBe(1500);
  });

  it('a source without harbour, lines or anchor fails those fields', () => {
    const s = at(2.8, 1490.4);
    const bare = { ...s, harbour: undefined, lines: undefined, anchor: undefined };
    expect(checkPasses({ linesOn: ['ll'] }, bare as never, { events: [], gusts: 0 })).toBe(false);
    expect(checkPasses({ fendersOut: true }, bare as never, { events: [], gusts: 0 })).toBe(false);
  });
});

describe('obstacleKind (16.7 test 3)', () => {
  it('names the kind of each obstacle', () => {
    expect(obstacleKind('yacht-0-11')).toBe('yacht');
    expect(obstacleKind('breakwater-west')).toBe('harbour');
    expect(obstacleKind('quay')).toBe('harbour');
    expect(obstacleKind('bottom')).toBe('ground');
    expect(obstacleKind('land')).toBe('ground');
    expect(obstacleKind('propeller')).toBe('propeller');
    expect(obstacleKind('fender')).toBe('fender');
  });
});

describe('contact mistakes (16.7 test 4)', () => {
  const report = (obstacleId: string, severity: ContactReport['severity']): ContactReport => ({
    atS: 0,
    obstacleId,
    partId: 'x',
    part: 'hull' as never,
    impactMps: 0.5,
    fender: false,
    severity,
  });
  const fire = (obstacleId: string, severity: ContactReport['severity']) => {
    const def = exerciseDef('leave-berth');
    let s = reduce(opened(), { type: 'exercise', command: 'start' });
    for (let i = 0; i < 30; i += 1) s = reduce(s, { type: 'step', dt: 0.05 });
    const previous = s;
    const n = s.alerts.written + 1;
    const next: AppState = {
      ...s,
      rig: { ...s.rig, timeS: s.rig.timeS + 0.05 },
      alerts: {
        entries: [
          ...s.alerts.entries,
          {
            n,
            kind: 'contact',
            atS: s.rig.timeS,
            severity: 'warning',
            contact: report(obstacleId, severity),
          },
        ],
        written: n,
      },
    };
    return stepExercise(previous, next, def).exercise;
  };

  it('touch, hard-hit, fender, propeller', () => {
    expect(fire('yacht-0-11', 'bump')?.status).toBe('mistake');
    expect(fire('yacht-0-11', 'bump')?.mistake?.mistakeId).toBe('touch');
    expect(fire('yacht-0-11', 'knock')?.status).toBe('failed');
    expect(fire('quay', 'fender')?.status).toBe('running');
    expect(fire('propeller', 'hit')?.status).toBe('failed');
    expect(fire('bottom', 'knock')?.status).toBe('running');
  });
});

describe('logged harbour actions (16.7 test 5)', () => {
  const actions = (s: AppState) =>
    (s.exercise?.log ?? []).flatMap((e) => (e.kind === 'action' ? [e.action] : []));
  const started = () => reduce(opened(), { type: 'exercise', command: 'start' });

  it('logs a line, merges repeats, logs thruster presses once', () => {
    let s = reduce(started(), { type: 'line', code: 'll', command: 'letGo' });
    expect(actions(s)).toEqual([{ type: 'line', code: 'll', command: 'letGo' }]);
    s = reduce(s, { type: 'thruster', which: 'bow', dir: 1 });
    s = reduce(s, { type: 'thruster', which: 'bow', dir: 0 });
    expect(actions(s).filter((a) => a.type === 'thruster')).toEqual([
      { type: 'thruster', which: 'bow', dir: 1 },
    ]);
    let e = started();
    for (let i = 0; i < 3; i += 1) e = reduce(e, { type: 'line', code: 'sp', command: 'ease' });
    expect(actions(e).filter((a) => a.type === 'line')).toEqual([
      { type: 'line', code: 'sp', command: 'ease', times: 3 },
    ]);
  });

  it('a refused line action is not logged; fenders are', () => {
    let s = started();
    s = reduce(s, { type: 'line', code: 'bl', command: 'take' });
    expect(actions(s).filter((a) => a.type === 'line')).toEqual([]);
    s = reduce(s, { type: 'setFenders', out: !s.harbour.fendersOut });
    expect(actions(s).at(-1)).toMatchObject({ type: 'fenders' });
  });

  it('actionText in English', () => {
    setLanguage('en');
    expect(actionText({ type: 'line', code: 'sp', command: 'ease', times: 3 })).toBe(
      'Stern line, port: Ease ×3',
    );
    expect(actionText({ type: 'thruster', which: 'bow', dir: 1 })).toBe(
      'Bow thruster to starboard',
    );
    expect(actionText({ type: 'line', code: 'll', command: 'letGo' })).toBe(
      'Lazy line (to the bow): Let go',
    );
  });
});

describe('levels in links (16.7 test 6)', () => {
  it('exl=hard opens the hard marina; the start link writes exl; others ignore it', () => {
    const s = parseUrlState('?m=exercise&ex=leave-berth&exl=hard');
    expect(s.harbour.layout).toBe('medium');
    expect(s.harbour.traffic).toBe('busy');
    expect(s.wind.twsKn).toBe(14);
    expect(s.exercise?.options.level).toBe('hard');
    expect(exerciseStartLink('leave-berth', s, 'easy')).toContain('exl=hard');
    expect(exerciseStartLink('leave-berth', initialState(), 'easy')).not.toContain('exl');
    expect(parseUrlState('?m=exercise&ex=points-of-sail&exl=hard').exercise?.options.level).toBe(
      'easy',
    );
    expect(parseUrlState('?m=exercise&ex=leave-berth').exercise?.options.level).toBe('easy');
  });
});

describe('shownTarget (16.7 test 7)', () => {
  it('is the fairway at step 2 and nothing at step 0', () => {
    const s = parseUrlState('?m=exercise&ex=leave-berth');
    expect(shownTarget(s)).toBeNull();
    const at2 = { ...s, exercise: s.exercise ? { ...s.exercise, step: 2 } : null };
    expect(shownTarget(at2)).toEqual({
      shape: 'rect',
      rect: { west: -110, east: 110, south: 1443, north: 1483 },
    });
  });
});
