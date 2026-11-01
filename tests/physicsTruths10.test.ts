import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import { parseUrlState } from '../src/app/urlState';

function run(state: AppState, seconds: number): AppState {
  let next = state;
  for (let i = 0; i < Math.round(seconds / 0.05); i += 1) {
    next = reduce(next, { type: 'step', dt: 0.05 });
  }
  return next;
}

function gybeFrom(mainsheet: number): AppState {
  const start = parseUrlState(
    `?wd=0&ws=12&hdg=195&ms=${mainsheet}&js=50&ap=wind&apt=165&sea=flat`,
    initialState().settings.detail,
  );
  const settled = run(start, 15);
  return run(reduce(settled, { type: 'autopilot', command: 'tack' }), 30);
}

describe('Phase 10 rules (PHASE10_SPEC 9.6)', () => {
  it('PT-58 a controlled gybe starts with the main hauled in: hauled in the boom moves a short way and the load is small, left out it swings across with a large load', () => {
    const hauled = gybeFrom(5).rig.lastGybe;
    expect(hauled).not.toBeNull();
    expect(hauled?.accidental).toBe(false);
    expect(hauled?.peakRopeN).toBeLessThan(1000);

    const left = gybeFrom(100).rig.lastGybe;
    expect(left).not.toBeNull();
    expect(left?.accidental).toBe(true);
    expect(left?.peakRopeN).toBeGreaterThan(2000);
  });
});
