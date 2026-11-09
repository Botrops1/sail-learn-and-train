import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import type { ExerciseOptions } from '../src/app/exerciseRun';
import { initialState, reduce, type AppState } from '../src/app/store';
import type { ExerciseLevel } from '../src/model/exercises';
import type { RopesMode } from '../src/model/settings';
import { anchorPilot, type Pilot } from '../src/app/exercisePilots';

/**
 * The scripted learners live in `src/app/exercisePilots.ts` since M81 (Watch and Show me use them);
 * this file keeps the test helpers that run them.
 */
export * from '../src/app/exercisePilots';

/** PHASE10_SPEC 16.7: a scripted good run; each step within its limit (app seconds from its start). */
export function goodRun(
  id: string,
  level: ExerciseLevel,
  pilot: Pilot,
  limitS: number,
  ropes: RopesMode = 'easy',
  options: Partial<ExerciseOptions> = {},
) {
  let s = parseUrlState(exerciseStartLink(id, initialState(), ropes, { level }));
  if (Object.keys(options).length > 0) {
    s = reduce(s, { type: 'exercise', command: { options } });
  }
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

/**
 * The same 0.05 s loop from a given state: the pilot is called with the run's own clock, as
 * `pilotActions` does, until `until(state)` or `limitS` app seconds.
 */
export function runFrom(
  state: AppState,
  pilot: Pilot,
  until: (s: AppState) => boolean,
  limitS: number,
): { state: AppState; timeS: number; mistakes: number } {
  let s = state;
  let t = 0;
  while (!until(s) && s.exercise?.status === 'running' && t < limitS) {
    s = pilot(s, s.exercise.elapsedS);
    s = reduce(s, { type: 'step', dt: 0.05 });
    t += 0.05;
  }
  return {
    state: s,
    timeS: t,
    mistakes: s.exercise?.log.filter((e) => e.kind === 'mistake').length ?? 0,
  };
}

/**
 * The state at the frame the anchor-shore good run becomes `done` (PHASE10_SPEC 19.5, frames of
 * 0.05 s), then out of the exercise and running: the boat lies at anchor with a line ashore
 * (M95 uses it for the time-lapse tests).
 */
export function anchoredState(): AppState {
  let s = parseUrlState(exerciseStartLink('anchor-shore', initialState(), 'easy'));
  s = reduce(s, { type: 'exercise', command: 'start' });
  const pilot = anchorPilot();
  let t = 0;
  while (s.exercise !== null && s.exercise.status !== 'done' && t < 450) {
    s = pilot(s, t);
    s = reduce(s, { type: 'step', dt: 0.05 });
    t += 0.05;
  }
  return { ...s, exercise: null, paused: false };
}
