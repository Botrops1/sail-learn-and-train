import { describe, expect, it } from 'vitest';
import { initialState, reduce } from '../src/app/store';
import { exerciseStartLink, parseUrlState, serializeUrlState } from '../src/app/urlState';
import { defaultLabels } from '../src/model/settings';

const START = '?m=exercise&ex=points-of-sail';

describe('M80 labels default in Exercises', () => {
  it('defaultLabels follows the mode', () => {
    expect(defaultLabels('easy', 'exercise')).toBe(false);
    expect(defaultLabels('easy', 'easy')).toBe(true);
    expect(defaultLabels('realistic', 'learn')).toBe(false);
  });

  it('an exercise start link without lb opens with labels off, with lb=1 on', () => {
    expect(parseUrlState(START).settings.labels).toBe(false);
    expect(parseUrlState(`${START}&lb=1`).settings.labels).toBe(true);
  });

  it('the Exercises list link (no ex=) opens with labels off and writes no lb', () => {
    const list = parseUrlState('?m=exercise');
    expect(list.appMode).toBe('exercise');
    expect(list.settings.labels).toBe(false);
    expect(new URLSearchParams(serializeUrlState(list)).has('lb')).toBe(false);
    expect(parseUrlState('?m=exercise&lb=1').settings.labels).toBe(true);
  });

  it('a waypoint link without lb opens with labels off', () => {
    const run = parseUrlState(START);
    const wp = serializeUrlState({ ...run, settings: { ...run.settings, labels: true } });
    const waypoint = `?${new URLSearchParams(wp.replace(/^\?/, '')).toString()}&exw=1`;
    const without = new URLSearchParams(waypoint);
    without.delete('lb');
    expect(parseUrlState(`?${without.toString()}`).settings.labels).toBe(false);
  });

  it('serializes lb only where it differs from the exercise default', () => {
    const run = parseUrlState(START);
    expect(new URLSearchParams(serializeUrlState(run)).has('lb')).toBe(false);
    const on = { ...run, settings: { ...run.settings, labels: true } };
    expect(new URLSearchParams(serializeUrlState(on)).get('lb')).toBe('1');
    expect(new URLSearchParams(exerciseStartLink('points-of-sail', on, 'easy')).get('lb')).toBe(
      '1',
    );
    expect(new URLSearchParams(exerciseStartLink('points-of-sail', run, 'easy')).has('lb')).toBe(
      false,
    );
  });

  it('setAppMode turns the labels with the mode', () => {
    const easy = initialState();
    expect(easy.settings.labels).toBe(true);
    const inExercise = reduce(easy, { type: 'setAppMode', mode: 'exercise' });
    expect(inExercise.settings.labels).toBe(false);
    const manual = reduce(inExercise, { type: 'setLabels', labels: true });
    expect(reduce(manual, { type: 'setAppMode', mode: 'easy' }).settings.labels).toBe(true);
    expect(reduce(inExercise, { type: 'setAppMode', mode: 'easy' }).settings.labels).toBe(true);
    // Between other modes nothing is touched.
    const learn = reduce(easy, { type: 'setAppMode', mode: 'learn' });
    const off = reduce(learn, { type: 'setLabels', labels: false });
    expect(reduce(off, { type: 'setAppMode', mode: 'harbour' }).settings.labels).toBe(false);
  });

  it('the ropes choice inside an exercise keeps the labels off', () => {
    const run = parseUrlState(START);
    const next = reduce(run, { type: 'setRopesMode', mode: 'easy' });
    expect(next.settings.labels).toBe(false);
    const realistic = reduce(run, { type: 'setRopesMode', mode: 'realistic' });
    expect(realistic.settings.labels).toBe(false);
  });
});
