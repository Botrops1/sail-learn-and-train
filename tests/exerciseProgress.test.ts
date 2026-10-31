import { describe, expect, it } from 'vitest';
import { parseProgress, withDone } from '../src/app/exerciseProgress';

describe('exercise progress (PHASE10_SPEC 6.7)', () => {
  it('reads null and junk as empty', () => {
    expect(parseProgress(null)).toEqual({ v: 1, done: {} });
    expect(parseProgress('not json')).toEqual({ v: 1, done: {} });
    expect(parseProgress('{"done":5}')).toEqual({ v: 1, done: {} });
  });

  it('keeps the smaller best time with its date', () => {
    const first = withDone(parseProgress(null), 'a', 90, '2026-10-30');
    const slower = withDone(first, 'a', 120, '2026-11-01');
    expect(slower.done['a']).toEqual({ bestS: 90, at: '2026-10-30' });
    const faster = withDone(first, 'a', 70, '2026-11-02');
    expect(faster.done['a']).toEqual({ bestS: 70, at: '2026-11-02' });
  });

  it('keeps two exercises apart', () => {
    const p = withDone(withDone(parseProgress(null), 'a', 90, 'd1'), 'b', 50, 'd2');
    expect(Object.keys(p.done).sort()).toEqual(['a', 'b']);
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
  });
});
