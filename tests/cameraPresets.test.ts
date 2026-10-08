import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { CAMERA_PRESETS } from '../src/model/settings';
import { sheerAt } from '../src/model/hullShape';
import { cross, dot, normalize, sub, type Vec3 } from '../src/model/vec3';
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

  it('helm: standing behind the port wheel, looking forward, down and a little to port', () => {
    const helm = presetPose('helm', PHONE);
    const wheel = boat.cockpitHardware.helms.find((h) => h.id === 'helm_port');
    expect(helm.position[2]).toBeCloseTo(wheel?.z ?? NaN, 6);
    expect(helm.position[0]).toBeLessThan(wheel?.x ?? NaN);
    expect(helm.position[1]).toBeGreaterThan(boat.deck.cockpit.soleY + 1.2);
    expect(helm.target[0]).toBeGreaterThan(helm.position[0]);
    expect(helm.target[1]).toBeLessThan(helm.position[1]);
    expect(helm.target[2]).toBeLessThan(helm.position[2]);
    expect(helm.fovDeg).toBeGreaterThan(presetPose('side-port', PHONE).fovDeg);
  });

  it('helm: wheel, port winch and port clutch bank are in front of the camera and in view', () => {
    const lens = { verticalFovDeg: 64, aspect: 390 / 380 };
    const helm = presetPose('helm', lens);
    const forward = normalize(sub(helm.target, helm.position));
    const halfV = (helm.fovDeg * Math.PI) / 360;
    const halfH = Math.atan(Math.tan(halfV) * lens.aspect);
    const hw = boat.cockpitHardware;
    const points: [string, Vec3][] = [
      ['wheel', [hw.helms[0]?.x ?? 0, hw.wheelHubY, hw.helms[0]?.z ?? 0]],
      ['winch', [hw.winches[0]?.x ?? 0, hw.winches[0]?.y ?? 0, hw.winches[0]?.z ?? 0]],
      [
        'clutch bank B',
        [hw.clutchBanks[1]?.x ?? 0, hw.clutchBanks[1]?.y ?? 0, hw.clutchBanks[1]?.z ?? 0],
      ],
    ];
    const right = normalize(cross(forward, [0, 1, 0]));
    const up = cross(right, forward);
    for (const [name, p] of points) {
      const q = sub(p, helm.position);
      const depth = dot(q, forward);
      expect(depth, name).toBeGreaterThan(0);
      expect(Math.abs(Math.atan2(dot(q, right), depth)), name).toBeLessThan(halfH);
      expect(Math.abs(Math.atan2(dot(q, up), depth)), name).toBeLessThan(halfV);
    }
  });

  it('top: the camera is well above the masthead on every screen shape', () => {
    for (const lens of [PHONE, DESKTOP, { verticalFovDeg: 40, aspect: 2 }]) {
      expect(presetPose('top', lens).position[1]).toBeGreaterThan(boat.rig.mast.topY * 1.5);
    }
  });

  it('top: bow right by default (like the plan sketch), bow up when asked (stacked layout)', () => {
    const right = presetPose('top', PHONE);
    const up = presetPose('top', PHONE, { topBowUp: true });
    // The camera is nudged away from the side that ends up at the top of the screen.
    expect(right.position[2] - right.target[2]).toBeGreaterThan(0);
    expect(Math.abs(right.position[0] - right.target[0])).toBeLessThan(1);
    expect(up.position[0] - up.target[0]).toBeLessThan(0);
    expect(Math.abs(up.position[2] - up.target[2])).toBeLessThan(1);
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
