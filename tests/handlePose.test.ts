import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { handlePose, type HandlePose } from '../src/model/handlePose';
import { initialRealistic, type HandleState, type RealisticState } from '../src/model/realistic';
import { gapFloorY } from '../src/model/ropeBin';

/** M50 (PHASE8_SPEC 8.7): where the one winch handle is drawn. */
function withHandle(change: Partial<HandleState>): RealisticState {
  const start = initialRealistic();
  return { ...start, handle: { ...start.handle, ...change } };
}

function poseOf(state: RealisticState): HandlePose {
  const pose = handlePose(state);
  if (!pose) throw new Error('The handle should be drawn here.');
  return pose;
}

const L = boat.realisticMode.winchHandle.lengthM;
const w = boat.modelDetail.winchHandle;

describe('handlePose (M50)', () => {
  it('is null while carried', () => {
    expect(handlePose(withHandle({ place: 'carried' }))).toBeNull();
  });

  it('lies in the port gap at the start', () => {
    const pose = poseOf(initialRealistic());
    expect(pose.origin[0]).toBeCloseTo(-7.6, 3);
    expect(Math.abs(pose.origin[1] - (gapFloorY(-7.6) + 0.016))).toBeLessThan(0.002);
    expect(pose.origin[1]).toBeCloseTo(1.432, 2);
    expect(pose.origin[2]).toBeCloseTo(-1.553, 3);
    expect(pose.arm).toEqual([0, 0, -1]);
    expect(pose.socket).toBeNull();
  });

  it('lies in the starboard gap', () => {
    const pose = poseOf(withHandle({ station: 'starboard', place: 'stowed' }));
    expect(pose.origin[2]).toBeCloseTo(1.553, 3);
    expect(pose.arm).toEqual([0, 0, 1]);
  });

  it('stands in the starboard winch and turns with the crank', () => {
    const at0 = poseOf(withHandle({ station: 'starboard', place: 'socket', angle: 0 }));
    expect(at0.origin[0]).toBeCloseTo(-7.25, 3);
    expect(at0.origin[1]).toBeCloseTo(1.79, 3);
    expect(at0.origin[2]).toBeCloseTo(1.6, 3);
    expect(at0.arm[0]).toBeCloseTo(1, 6);
    expect(at0.arm[2]).toBeCloseTo(0, 6);
    expect(at0.grip).toEqual([0, 1, 0]);
    expect(at0.socket).toBe('winch_primary_starboard');
    const at90 = poseOf(withHandle({ station: 'starboard', place: 'socket', angle: 90 }));
    expect(at90.arm[0]).toBeCloseTo(0, 6);
    expect(at90.arm[2]).toBeCloseTo(1, 6);
  });

  it('stands in the mast gearbox and turns in the y-z plane', () => {
    const at0 = poseOf(withHandle({ station: 'mast', place: 'socket', angle: 0 }));
    expect(at0.origin[0]).toBeCloseTo(-0.258, 3);
    expect(at0.origin[1]).toBeCloseTo(2.5, 3);
    expect(at0.origin[2]).toBeCloseTo(-0.08, 3);
    expect(at0.arm[1]).toBeCloseTo(1, 6);
    expect(at0.grip).toEqual([-1, 0, 0]);
    expect(at0.socket).toBe('part_main_furling_gearbox');
    const at90 = poseOf(withHandle({ station: 'mast', place: 'socket', angle: 90 }));
    expect(at90.arm[1]).toBeCloseTo(0, 6);
    expect(at90.arm[2]).toBeCloseTo(1, 6);
  });

  it('lies on the coachroof at the mast', () => {
    const pose = poseOf(withHandle({ station: 'mast', place: 'stowed' }));
    expect(pose.origin[0]).toBeCloseTo(-0.127, 3);
    expect(pose.origin[1]).toBeCloseTo(1.976, 3);
    expect(pose.origin[2]).toBeCloseTo(1.05, 3);
    expect(pose.arm).toEqual([1, 0, 0]);
  });

  it('lies on the cockpit floor at the helm', () => {
    const pose = poseOf(withHandle({ station: 'helm', place: 'stowed' }));
    expect(pose.origin[0]).toBeCloseTo(-7.327, 3);
    expect(pose.origin[1]).toBeCloseTo(1.016, 3);
    expect(pose.origin[2]).toBeCloseTo(0, 3);
  });

  it('keeps clear of the turning blocks, the channels and the track at the mast', () => {
    const pose = poseOf(withHandle({ station: 'mast', place: 'stowed' }));
    const end: [number, number, number] = [
      pose.origin[0] + pose.arm[0] * L,
      pose.origin[1] + pose.arm[1] * L,
      pose.origin[2] + pose.arm[2] * L,
    ];
    const tip: [number, number, number] = [
      end[0] + pose.grip[0] * w.gripLength,
      end[1] + pose.grip[1] * w.gripLength,
      end[2] + pose.grip[2] * w.gripLength,
    ];
    for (const p of [pose.origin, end, tip]) {
      expect(Math.hypot(p[0], p[2])).toBeGreaterThan(0.3);
      expect(p[0]).toBeGreaterThan(-0.7);
      expect(p[0]).toBeLessThanOrEqual(0.2);
      expect(p[2]).toBeGreaterThanOrEqual(1.0);
      expect(p[2]).toBeLessThanOrEqual(1.45);
    }
  });

  it('shows the helm pose for a socket at the helm (an impossible state)', () => {
    const odd = poseOf(withHandle({ station: 'helm', place: 'socket' }));
    const rest = poseOf(withHandle({ station: 'helm', place: 'stowed' }));
    expect(odd).toEqual(rest);
  });
});
