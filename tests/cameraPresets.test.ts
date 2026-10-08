import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { CAMERA_PRESETS } from '../src/model/settings';
import { sheerAt } from '../src/model/hullShape';
import {
  clampCameraPosition,
  framingBox,
  presetPose,
  viewDirection,
} from '../src/render3d/cameraPresets';

const PHONE = { verticalFovDeg: 40, aspect: 390 / 440 };
const DESKTOP = { verticalFovDeg: 40, aspect: 1100 / 900 };

describe('camera presets (PHASE1_SPEC 6.2)', () => {
  it('every preset is above the water and outside the hull', () => {
    for (const lens of [PHONE, DESKTOP]) {
      for (const preset of CAMERA_PRESETS) {
        const pose = presetPose(preset, lens);
        expect(pose.position[1], preset).toBeGreaterThan(0);
        expect(clampCameraPosition(pose.position), preset).toEqual(pose.position);
      }
    }
  });

  it('side (port) looks from port (−z), side (starboard) from starboard (+z)', () => {
    expect(presetPose('side-port', PHONE).position[2]).toBeLessThan(0);
    expect(presetPose('side-starboard', PHONE).position[2]).toBeGreaterThan(0);
  });

  it('top looks down from above; bow looks from ahead', () => {
    const top = presetPose('top', PHONE);
    expect(top.position[1] - top.target[1]).toBeGreaterThan(20);
    expect(presetPose('bow', PHONE).position[0]).toBeGreaterThan(boat.hull.bowFittingTipX);
  });

  it('helm is at eye height at the port wheel, looking forward', () => {
    const helm = presetPose('helm', PHONE);
    const wheel = boat.cockpitHardware.helms.find((h) => h.id === 'helm_port');
    expect(helm.position[2]).toBeCloseTo(wheel?.z ?? NaN, 6);
    expect(helm.position[0]).toBeLessThan(wheel?.x ?? NaN);
    expect(helm.position[1]).toBeGreaterThan(boat.deck.cockpit.soleY + 1.2);
    expect(helm.target[0]).toBeGreaterThan(helm.position[0]);
  });

  it('a narrow screen needs a more distant camera to fit the whole boat', () => {
    const near = presetPose('side-port', DESKTOP);
    const far = presetPose('side-port', { verticalFovDeg: 40, aspect: 0.5 });
    const dist = (p: typeof near) =>
      Math.hypot(...p.position.map((v, i) => v - (p.target[i] ?? 0)));
    expect(dist(far)).toBeGreaterThan(dist(near));
  });

  it('free opens the default view (the free position is not stored)', () => {
    expect(presetPose('free', PHONE)).toEqual(presetPose('side-port', PHONE));
  });

  it('framing box covers keel to masthead and transom to bow fitting', () => {
    const box = framingBox();
    expect(box.min[1]).toBe(-boat.dimensions.draft);
    expect(box.max[1]).toBe(boat.rig.mast.topY);
    expect(box.max[0] - box.min[0]).toBe(boat.hull.bowFittingTipX - boat.hull.transomX);
  });

  it('view direction: azimuth 90 = port beam, −90 = starboard, 0 = ahead', () => {
    expect(viewDirection(90, 0)[2]).toBeCloseTo(-1, 6);
    expect(viewDirection(-90, 0)[2]).toBeCloseTo(1, 6);
    expect(viewDirection(0, 0)[0]).toBeCloseTo(1, 6);
  });
});

describe('camera clamp', () => {
  it('lifts a camera under the water to above it', () => {
    expect(clampCameraPosition([20, -5, 30])[1]).toBeGreaterThan(0);
  });

  it('lifts a camera inside the hull above the deck', () => {
    const [, y] = clampCameraPosition([0, 0.5, 0]);
    expect(y).toBeGreaterThan(sheerAt(0));
  });

  it('leaves a camera outside the boat alone', () => {
    expect(clampCameraPosition([0, 5, -30])).toEqual([0, 5, -30]);
  });
});
