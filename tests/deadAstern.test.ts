import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import { parseUrlState } from '../src/app/urlState';
import { curveSide, decideSide, leewardSide } from '../src/model/boomSolver';

/** Bug after M106: dead downwind, "by the lee" came and went every few seconds. */
describe('dead astern is one wind, +180° and −180°', () => {
  it('neither side is leeward at exactly dead astern, from either sign', () => {
    expect(leewardSide(180)).toBeNull();
    expect(leewardSide(-180)).toBeNull();
    expect(leewardSide(170)).toBe(-1);
    expect(leewardSide(-170)).toBe(1);
    expect(curveSide(-180, -1)).toBe(-1);
    expect(curveSide(180, -1)).toBe(-1);
    expect(decideSide(-180, 12, -1)).toEqual({
      side: -1,
      byTheLee: false,
      gybe: false,
      tack: false,
    });
  });

  it('a run with the Dead downwind link does not flip the side or the warning', () => {
    let s: AppState = parseUrlState(
      '?wd=180&ws=12&ms=100&jf=0&gn=4&gx=p&gu=100&gs=80&sea=flat&cam=top',
      initialState().settings.detail,
    );
    const seen = new Set<string>();
    for (let i = 0; i < 20 * 90; i += 1) {
      s = reduce(s, { type: 'step', dt: 0.05 });
      seen.add(`${s.rig.solution.side}/${s.rig.solution.byTheLee}`);
    }
    expect([...seen]).toEqual(['-1/false']);
  });
});
