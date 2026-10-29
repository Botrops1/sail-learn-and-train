import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { handlePose } from '../src/model/handlePose';
import { framePoint, handleRest, helmPedestal } from '../src/model/helmPedestal';
import { PANEL_AT_REST } from '../src/model/helmPanel';
import { initialRealistic } from '../src/model/realistic';
import { cross, dot, length, type Vec3 } from '../src/model/vec3';

/** M62 (PHASE9_SPEC 8.7): where each pedestal, its panel and the handle's rest stand. */
const near = (actual: Vec3, expected: Vec3, tol = 0.0005) => {
  for (let i = 0; i < 3; i += 1)
    expect(actual[i], `component ${i}`).toBeCloseTo(expected[i] as number, 3);
  expect(Math.abs(actual[0] - expected[0]) < tol).toBe(true);
  expect(Math.abs(actual[1] - expected[1]) < tol).toBe(true);
  expect(Math.abs(actual[2] - expected[2]) < tol).toBe(true);
};

describe('helmPedestal (M62)', () => {
  const port = helmPedestal('helm_port');
  const starboard = helmPedestal('helm_starboard');

  it('1. the port column', () => {
    near(port.column.centre, [-7.04, 1.475, -0.88]);
    near(port.column.size, [0.16, 0.95, 0.2]);
  });

  it('2. the port pod and its frame', () => {
    near(port.pod.centre, [-7.04, 2.01, -0.76]);
    const { u, v, w } = port.pod;
    near(w, [-0.8781, 0.4695, -0.0923], 0.0001);
    near(u, [-0.1045, 0, 0.9945], 0.0001);
    near(v, [0.4669, 0.8829, 0.0491], 0.0001);
    for (const a of [u, v, w]) expect(Math.abs(length(a) - 1)).toBeLessThan(1e-9);
    expect(Math.abs(dot(u, v))).toBeLessThan(1e-9);
    expect(Math.abs(dot(u, w))).toBeLessThan(1e-9);
    expect(Math.abs(dot(v, w))).toBeLessThan(1e-9);
    const c = [...cross(u, v)];
    for (let i = 0; i < 3; i += 1) expect(Math.abs((c[i] ?? 0) - (w[i] ?? 0))).toBeLessThan(1e-9);
  });

  it('3. the port face and its instruments', () => {
    near(port.face.centre, [-7.0663, 2.0241, -0.7628]);
    near(port.compass, [-7.0453, 2.0638, -0.7606]);
    near(port.wind, [-7.0317, 2.0638, -0.8898]);
    near(port.tachometer, [-7.0589, 2.0638, -0.6313]);
    near(port.keypad, [-7.0886, 1.9623, -0.8657]);
    near(port.lever, [-7.1137, 1.9623, -0.627]);
  });

  it('4. the starboard pedestal is the mirror image', () => {
    near(starboard.pod.centre, [-7.04, 2.01, 0.76]);
    near(starboard.pod.w, [-0.8781, 0.4695, 0.0923], 0.0001);
    near(starboard.pod.u, [0.1045, 0, 0.9945], 0.0001);
    near(starboard.wind, [-7.0589, 2.0638, 0.6313]);
    near(starboard.tachometer, [-7.0317, 2.0638, 0.8898]);
  });

  it('5. the pod clears the wheel', () => {
    for (const g of [port, starboard]) {
      const helm = boat.cockpitHardware.helms.find((h) => h.id === g.helmId);
      if (!helm) throw new Error('no helm');
      for (const su of [-1, 1]) {
        for (const sv of [-1, 1]) {
          for (const sw of [-1, 1]) {
            const corner = framePoint(
              g.pod,
              (su * g.pod.size[0]) / 2,
              (sv * g.pod.size[1]) / 2,
              (sw * g.pod.size[2]) / 2,
            );
            expect(corner[0]).toBeGreaterThan(helm.x + boat.modelDetail.wheel.rimTubeRadius + 0.02);
          }
        }
      }
    }
  });

  it('6. the pod sits on the column', () => {
    let lowest = Infinity;
    for (const su of [-1, 1]) {
      for (const sv of [-1, 1]) {
        for (const sw of [-1, 1]) {
          lowest = Math.min(
            lowest,
            framePoint(
              port.pod,
              (su * port.pod.size[0]) / 2,
              (sv * port.pod.size[1]) / 2,
              (sw * port.pod.size[2]) / 2,
            )[1],
          );
        }
      }
    }
    expect(lowest).toBeCloseTo(1.89, 3);
    expect(lowest).toBeLessThan(port.column.centre[1] + port.column.size[1] / 2);
  });

  it('7. the guard rail stands ahead of the pod', () => {
    const rail = port.guardRail;
    expect(rail).toHaveLength(10);
    near(rail[0] as Vec3, [-6.91, 1.0, -1.0]);
    near(rail[9] as Vec3, [-6.91, 1.0, -0.52]);
    for (const p of rail) expect(p[0]).toBeCloseTo(-6.91, 6);
    // 2.19 is the raw corner (pod top 2.13 + 0.06); M60's roundCorners moves each arc outwards so
    // its middle passes through the corner, which lifts the bar's ends by 0.0147 m (decided in the M62 PR).
    const top = Math.max(...rail.map((p) => p[1]));
    expect(top).toBeGreaterThanOrEqual(2.19 - 0.0005);
    expect(top).toBeLessThanOrEqual(2.2047 + 0.0005);
    let frontX = -Infinity;
    for (const su of [-1, 1]) {
      for (const sv of [-1, 1]) {
        for (const sw of [-1, 1]) {
          frontX = Math.max(
            frontX,
            framePoint(
              port.pod,
              (su * port.pod.size[0]) / 2,
              (sv * port.pod.size[1]) / 2,
              (sw * port.pod.size[2]) / 2,
            )[0],
          );
        }
      }
    }
    expect(-6.91 - boat.modelDetail.helmPedestal.guardRail.tubeRadiusM).toBeGreaterThan(frontX);
  });

  it('8. the handle rests between its stops', () => {
    const rest = handleRest();
    near(rest.pad.centre, [-7.2, 1.002, 0.05]);
    const xs = rest.stops.map((s) => s.centre[0]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-7.357, 3);
    expect(xs[1]).toBeCloseTo(-7.043, 3);
    const start = initialRealistic();
    const pose = handlePose({
      ...start,
      handle: { ...start.handle, place: 'stowed', station: 'helm' },
    });
    if (!pose) throw new Error('the handle should be drawn');
    const w = boat.modelDetail.winchHandle;
    const L = boat.realisticMode.winchHandle.lengthM;
    expect(pose.origin[0] - w.spigotDiameter / 2).toBeGreaterThan(-7.347);
    expect(pose.origin[0] + L + w.gripDiameter / 2).toBeLessThan(-7.053);
  });

  it('9. another boat: the pedestal follows its helms', () => {
    const other = structuredClone(boat);
    other.cockpitHardware.helms = other.cockpitHardware.helms.map((h) => ({
      ...h,
      z: h.id === 'helm_port' ? -1.0 : 1.0,
    }));
    const g = helmPedestal('helm_port', other);
    expect(g.pod.centre[2]).toBeCloseTo(-0.88, 6);
    expect(g.column.centre[2]).toBeCloseTo(-1.0, 6);
  });

  it('10. an unknown helm throws', () => {
    expect(() => helmPedestal('helm_none')).toThrow();
  });

  it('the resting panel reads zero and stands by', () => {
    expect(PANEL_AT_REST.courseText).toBe('STANDBY');
    expect(PANEL_AT_REST.rpm).toBe(0);
    expect(PANEL_AT_REST.autopilot).toBe('off');
  });
});
