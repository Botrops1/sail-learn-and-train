import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import type { RealisticAction } from '../src/model/realistic';

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

  it('PT-59 roll the main out head to wind: rolling it out 60° off the wind is reported', () => {
    const W = 'winch_primary_starboard';
    const real = (state: AppState, action: RealisticAction): AppState =>
      reduce(state, { type: 'realistic', action });
    const setup = parseUrlState(exerciseStartLink('set-sails', initialState(), 'realistic'));
    let s = reduce(
      reduce(setup, { type: 'exercise', command: { options: { pauseOnMistake: false } } }),
      { type: 'exercise', command: 'start' },
    );
    // Step 1 passes by itself, head to wind; then she is turned 60° away before the main comes out.
    while (s.exercise?.step === 0) s = reduce(s, { type: 'step', dt: 0.05 });
    s = reduce(s, { type: 'autopilot', command: { turnDeg: -60 } });
    s = run(s, 20);
    const before = s.exercise?.log.length ?? 0;
    s = real(s, { type: 'station', station: 'starboard' });
    s = real(s, { type: 'clutch', key: 'a2', open: true });
    s = real(s, { type: 'onWinch', key: 'a3' });
    for (let i = 0; i < 3; i += 1) s = real(s, { type: 'turn', winch: W, delta: 1 });
    s = real(s, { type: 'selfTailer', winch: W, into: true });
    s = real(s, { type: 'button', winch: W, held: true });
    const from = s.exercise?.elapsedS ?? 0;
    let found = -1;
    for (let i = 0; i < 200 && found < 0; i += 1) {
      s = reduce(s, { type: 'step', dt: 0.05 });
      const log = s.exercise?.log ?? [];
      if (log.slice(before).some((e) => e.kind === 'mistake' && e.mistakeId === 'main-off-wind')) {
        found = (s.exercise?.elapsedS ?? 0) - from;
      }
    }
    expect(found).toBeGreaterThan(0);
    expect(found).toBeLessThan(10);
  });
});
