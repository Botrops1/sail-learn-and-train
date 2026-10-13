import { describe, expect, it } from 'vitest';
import { act, initialState, run } from './motionHelpers';

/**
 * M13: the heaviest case of the model (gusty wind, time speed-up ×16, sails working) must stay
 * far below a frame's budget. Measured at 0.1 ms per frame on a build machine; the limit is
 * 30 times that, so a slow phone passes and only a real regression (a solve gone wrong every
 * substep, say) fails. The phone's own frame rate is read from the debug overlay (?debug=1).
 */
describe('the cost of one simulated frame (M13)', () => {
  it('stays under 3 ms on average in gusty wind at ×16', () => {
    let state = initialState({
      controls: { ctl_wind_dir: 90, ctl_wind_speed: 16, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
    });
    state = act(state, { type: 'setWindMode', mode: 'gusty' }, { type: 'setTimeScale', scale: 16 });
    state = run(state, 10);
    const frames = 600;
    const started = performance.now();
    for (let i = 0; i < frames; i += 1) state = act(state, { type: 'step', dt: 1 / 60 });
    const meanMs = (performance.now() - started) / frames;
    expect(meanMs).toBeLessThan(3);
  });

  it('stays under 3 ms on average in the Open sea, gusty wind at ×16 (M15)', () => {
    let state = initialState({
      sea: 'open',
      controls: { ctl_wind_dir: 90, ctl_wind_speed: 16, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
    });
    state = act(state, { type: 'setWindMode', mode: 'gusty' }, { type: 'setTimeScale', scale: 16 });
    state = run(state, 10);
    const frames = 600;
    const started = performance.now();
    for (let i = 0; i < frames; i += 1) state = act(state, { type: 'step', dt: 1 / 60 });
    const meanMs = (performance.now() - started) / frames;
    expect(meanMs).toBeLessThan(3);
  });
});
