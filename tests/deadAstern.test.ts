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
    // Boom right out on port, wind dead astern: the wind presses the sail out to port.
    expect(curveSide(-180, -72, -1)).toBe(-1);
    expect(curveSide(180, -72, -1)).toBe(-1);
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

  it('by the lee the main still curves to the boom side, as the wind pushes it (owner: "looks like wind from the nose")', () => {
    // Steered 10° to port of a run with the boom out on port: wind 170° from port.
    expect(curveSide(-170, -72, -1)).toBe(-1);
    // Normal run, wind on starboard quarter, boom on port: leeward = port.
    expect(curveSide(160, -72, -1)).toBe(-1);
    // Close-hauled and reaching: leeward, as before.
    expect(curveSide(30, -10, -1)).toBe(-1);
    expect(curveSide(-100, 45, 1)).toBe(1);
    // The boom swinging across, past the line of the wind: the wind now pushes it to starboard.
    expect(curveSide(-170, 20, -1)).toBe(1);
  });
});
