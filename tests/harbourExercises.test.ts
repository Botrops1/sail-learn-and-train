import { describe, expect, it } from 'vitest';
import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import { initialState, reduce } from '../src/app/store';
import type { ExerciseLevel } from '../src/model/exercises';
import { leavePilot, type Pilot } from './harbourPilot';

/** PHASE10_SPEC 16.7: a scripted good run; each step within its limit (app seconds from its start). */
function goodRun(id: string, level: ExerciseLevel, pilot: Pilot, limitS: number) {
  let s = parseUrlState(exerciseStartLink(id, initialState(), 'easy', { level }));
  s = reduce(s, { type: 'exercise', command: 'start' });
  const stepAt: number[] = [0];
  let t = 0;
  while (s.exercise !== null && s.exercise.status !== 'done' && t < limitS) {
    s = pilot(s, t);
    s = reduce(s, { type: 'step', dt: 0.05 });
    t += 0.05;
    const run = s.exercise;
    if (run !== null && run.step > stepAt.length - 1) stepAt.push(t);
  }
  const run = s.exercise;
  return {
    status: run?.status,
    durations: stepAt.map((at, i) => (stepAt[i + 1] ?? t) - at),
    mistakes: run?.log.filter((e) => e.kind === 'mistake') ?? [],
  };
}

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
