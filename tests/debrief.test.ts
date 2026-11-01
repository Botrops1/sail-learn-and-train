import { describe, expect, it } from 'vitest';
import { debriefRows, debriefSummary } from '../src/model/debrief';
import { EXERCISE_SETTINGS, type ExerciseLogEntry } from '../src/model/exercises';

const action = (atS: number): ExerciseLogEntry => ({
  kind: 'action',
  atS,
  action: { type: 'autopilot', command: 'off' },
});
const mistake = (atS: number): ExerciseLogEntry => ({
  kind: 'mistake',
  atS,
  step: 0,
  mistakeId: 'x',
  serious: false,
});
const settings = { ...EXERCISE_SETTINGS, causeWindowS: 15, causeMax: 3 };

describe('the debrief (PHASE10_SPEC 8.6)', () => {
  it('finds the actions just before a mistake', () => {
    const a = debriefRows([action(1), action(5), action(12), action(20), mistake(22)], settings);
    expect(a[4]?.causes.map((c) => c.atS)).toEqual([12, 20]);
    const b = debriefRows([action(8), action(9), action(10), action(11), mistake(12)], settings);
    expect(b[4]?.causes.map((c) => c.atS)).toEqual([9, 10, 11]);
    const c = debriefRows([action(1), mistake(40)], settings);
    expect(c[1]?.causes).toEqual([]);
    expect(c).toHaveLength(2);
    expect(c[0]?.causes).toEqual([]);
  });

  it('ignores actions logged after a mistake that stopped the clock', () => {
    const rows = debriefRows([action(5), mistake(10), action(10), action(10)], settings);
    expect(rows[1]?.causes.map((c) => c.atS)).toEqual([5]);
  });

  it('sums up the run', () => {
    const step = (n: number, atS: number): ExerciseLogEntry => ({
      kind: 'step',
      atS,
      step: n,
      stepId: `s${n}`,
    });
    const log: ExerciseLogEntry[] = [
      { kind: 'start', atS: 0, step: 0 },
      step(0, 10),
      step(1, 20),
      { kind: 'back', atS: 30, step: 1 },
      step(1, 40),
      { kind: 'finish', atS: 80 },
    ];
    expect(debriefSummary(log, 5, 99)).toEqual({ timeS: 80, stepsDone: 2, total: 5, mistakes: 0 });
    expect(debriefSummary([mistake(1), mistake(2)], 5, 7)).toMatchObject({ timeS: 7, mistakes: 2 });
  });
});
