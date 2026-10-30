import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { CAMERA_PRESETS } from '../src/model/settings';
import { sheerAt } from '../src/model/hullShape';
import { helmPedestal } from '../src/model/helmPedestal';
import { cross, dot, normalize, sub, type Vec3 } from '../src/model/vec3';
import {
  clampCameraPosition,
  focusPose,
  framingBox,
  helmPose,
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

describe('focusPose (M49, spotlight)', () => {
  const lens = { verticalFovDeg: 40, aspect: 0.8 };
  const from = { position: [0, 10, 30] as Vec3, target: [0, 5, 0] as Vec3, fovDeg: 40 };
  const cleat = { min: [-0.1, 1.6, 2.1] as Vec3, max: [0.1, 1.7, 2.3] as Vec3 };
  const winch = { min: [-7.38, 1.55, 1.47] as Vec3, max: [-7.12, 1.79, 1.73] as Vec3 };
  const boom = { min: [-6.5, 2.4, -0.15] as Vec3, max: [0, 2.7, 0.15] as Vec3 };
  const distanceOf = (pose: { position: Vec3; target: Vec3 }) =>
    Math.hypot(...(sub(pose.position, pose.target) as Vec3));

  it('a cleat at fill 0.5 stops at the minimum distance, at 0.25 at the fitted one', () => {
    const near = focusPose(cleat, from, lens, 0.5, 140);
    expect(distanceOf(near)).toBeCloseTo(1.2, 2);
    expect(near.target[0]).toBeCloseTo(0, 2);
    expect(near.target[1]).toBeCloseTo(1.65, 2);
    expect(near.target[2]).toBeCloseTo(2.2, 2);
    expect(distanceOf(focusPose(cleat, from, lens, 0.25, 140))).toBeCloseTo(1.481, 2);
  });

  it('a winch: 1.2 m at fill 0.5, 1.934 m at 0.25', () => {
    expect(distanceOf(focusPose(winch, from, lens, 0.5, 140))).toBeCloseTo(1.2, 2);
    expect(distanceOf(focusPose(winch, from, lens, 0.25, 140))).toBeCloseTo(1.934, 2);
  });

  it('a boom: 22.496 m at fill 0.5, and never farther than the limit', () => {
    expect(distanceOf(focusPose(boom, from, lens, 0.5, 140))).toBeCloseTo(22.496, 2);
    expect(distanceOf(focusPose(boom, from, lens, 0.25, 30.414))).toBeCloseTo(30.414, 2);
  });

  it('keeps the direction from the target to the camera and the given field of view', () => {
    for (const box of [cleat, winch, boom]) {
      const pose = focusPose(box, from, lens, 0.5, 140, 55);
      const d = sub(pose.position, pose.target);
      const n = distanceOf(pose);
      expect(d[0] / n).toBeCloseTo(0, 4);
      expect(d[1] / n).toBeCloseTo(0.1644, 4);
      expect(d[2] / n).toBeCloseTo(0.9864, 4);
      expect(pose.fovDeg).toBe(55);
    }
  });

  it('a camera sitting on its target looks from the side', () => {
    const pose = focusPose(cleat, { ...from, position: from.target }, lens, 0.5, 140);
    expect(pose.position[2] - pose.target[2]).toBeLessThan(0);
  });
});

describe('M64: the Helm camera (PHASE9_SPEC 10.7)', () => {
  const near = (a: readonly number[], b: readonly number[]) =>
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i] ?? NaN, 3));

  it("1: port Ahead is today's Helm pose, with or without the option", () => {
    const pose = helmPose({ wheel: 'port', look: 'ahead' });
    near(pose.position, [-8.2, 2.65, -0.88]);
    near(pose.target, [-3.6042, 0.9399, -1.8569]);
    expect(pose.fovDeg).toBe(64);
    expect(presetPose('helm', PHONE)).toEqual(pose);
  });

  it('2: starboard Ahead is the mirror image', () => {
    const pose = helmPose({ wheel: 'starboard', look: 'ahead' });
    near(pose.position, [-8.2, 2.65, 0.88]);
    near(pose.target, [-3.6042, 0.9399, 1.8569]);
  });

  it('3: port Panel looks straight at the face', () => {
    const pose = helmPose({ wheel: 'port', look: 'panel' });
    near(pose.position, [-8.2, 2.65, -0.88]);
    near(pose.target, [-7.0663, 2.0241, -0.7628]);
    expect(pose.fovDeg).toBe(44);
    const away = sub(pose.position, pose.target);
    expect(Math.hypot(...away)).toBeCloseTo(1.3003, 2);
    expect(dot(normalize(away), helmPedestal('helm_port').face.w)).toBeGreaterThan(0.999);
  });

  it("4: Ropes looks at the winch of the wheel's side", () => {
    const port = helmPose({ wheel: 'port', look: 'ropes' });
    near(port.target, [-6.9, 1.6, -1.6]);
    near(helmPose({ wheel: 'starboard', look: 'ropes' }).target, [-6.9, 1.6, 1.6]);
    expect(port.fovDeg).toBe(56);
  });
});
