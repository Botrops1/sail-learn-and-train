import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls, type Controls } from '../src/model/controls';
import { ropeDrawings, sagCurve } from '../src/model/ropePaths';
import { initialRig } from '../src/model/sim';
import { distance, type Vec3 } from '../src/model/vec3';

function drawings(values: Partial<Controls>) {
  return ropeDrawings(initialRig({ ...defaultControls(), ...values }));
}

describe('rope drawing (PHASE1_SPEC 8.7)', () => {
  it('sag: a parabola with mid-sag sqrt(3 · d · s / 8), straight down, capped', () => {
    const a: Vec3 = [0, 2, 0];
    const b: Vec3 = [4, 2, 0];
    const points = sagCurve(a, b, 0.3, 12);
    const middle = points[6] as Vec3;
    expect(2 - middle[1]).toBeCloseTo(Math.sqrt((3 * 4 * 0.3) / 8), 9);
    expect(middle[0]).toBeCloseTo(2, 9);
    expect(points[0]).toEqual(a);
    expect(points[12]).toEqual(b);
    const capped = sagCurve(a, b, 50, 12)[6] as Vec3;
    expect(2 - capped[1]).toBeCloseTo(boat.visual.ropeMaxSagM, 9);
    const taut = sagCurve(a, b, 0, 12);
    for (const p of taut) expect(p[1]).toBe(2);
  });

  it('a steep rope still sags (at right angles to it) and never hangs below the floor', () => {
    const top: Vec3 = [0, 3, 0];
    const bottom: Vec3 = [0.1, 1.8, 0.4];
    const points = sagCurve(top, bottom, 1, 12, boat, 1.8);
    const middle = points[6] as Vec3;
    const chordMiddle: Vec3 = [0.05, 2.4, 0.2];
    expect(distance(middle, chordMiddle)).toBeGreaterThan(0.4);
    for (const p of points) expect(p[1]).toBeGreaterThanOrEqual(1.8);
    const vertical = sagCurve([0, 3, 0], [0, 1, 0], 1, 12)[6] as Vec3;
    expect(vertical[0]).toBeLessThan(-0.4);
  });

  it('every rope keeps its number of points, whatever the controls (buffers are reused)', () => {
    const shape = (values: Partial<Controls>) =>
      drawings(values).map((rope) => `${rope.id}:${rope.strands.map((s) => s.points.length)}`);
    const reference = shape({});
    for (const values of [
      { ctl_wind_dir: 0, ctl_mainsheet: 100 },
      { ctl_wind_dir: -135, ctl_vang: 0, ctl_topping_lift: 0 },
      { ctl_main_furl: 0, ctl_wind_speed: 0 },
    ]) {
      expect(shape(values)).toEqual(reference);
    }
  });

  it('tails end at their clutch: port bank (B) for vang, topping lift, outhaul and one mainsheet end; starboard bank (A) for the furling line and the other end', () => {
    const ends = new Map<string, Vec3[]>();
    for (const rope of drawings({})) {
      ends.set(
        rope.id,
        rope.strands.map((strand) => strand.points[strand.points.length - 1] as Vec3),
      );
    }
    const bankA = boat.cockpitHardware.clutchBanks.find((b) => b.id === 'clutch_bank_a');
    const bankB = boat.cockpitHardware.clutchBanks.find((b) => b.id === 'clutch_bank_b');
    const near = (p: Vec3 | undefined, bank: typeof bankA) =>
      p !== undefined && bank !== undefined && Math.hypot(p[0] - bank.x, p[2] - bank.z) < 0.5;
    const last = (id: string) => ends.get(id)?.at(-1);
    expect(near(last('rope_vang'), bankB)).toBe(true);
    expect(near(last('rope_topping_lift'), bankB)).toBe(true);
    expect(near(last('rope_outhaul'), bankB)).toBe(true);
    expect(near(ends.get('rope_mainsheet')?.[4], bankB)).toBe(true);
    expect(near(ends.get('rope_mainsheet')?.[5], bankA)).toBe(true);
    expect(near(ends.get('rope_main_furling_line')?.[0], bankA)).toBe(true);
    expect(near(ends.get('rope_main_furling_line')?.[1], bankA)).toBe(true);
  });

  it('the outhaul starts at the clew, which sits on the boom at f · footLength', () => {
    for (const mf of [100, 50, 10]) {
      const outhaul = drawings({ ctl_main_furl: mf, ctl_wind_dir: 0 }).find(
        (rope) => rope.id === 'rope_outhaul',
      );
      const clew = outhaul?.strands[0]?.points[0] as Vec3;
      const gooseneck = boat.rig.boom.gooseneck as unknown as Vec3;
      const along = Math.hypot(clew[0] - gooseneck[0], clew[2] - gooseneck[2]);
      expect(along).toBeCloseTo((mf / 100) * boat.sails.main.footLength, 1);
    }
  });

  it('a slack sheet sags; a sheet holding the boom is straight', () => {
    const sag = (values: Partial<Controls>) => {
      const sheet = drawings(values).find((rope) => rope.id === 'rope_mainsheet');
      const points = sheet?.strands[0]?.points ?? [];
      const a = points[0] as Vec3;
      const b = points[points.length - 1] as Vec3;
      const middle = points[Math.floor(points.length / 2)] as Vec3;
      return (a[1] + b[1]) / 2 - middle[1];
    };
    expect(sag({ ctl_wind_dir: 0, ctl_mainsheet: 80 })).toBeGreaterThan(0.3);
    expect(sag({ ctl_wind_dir: 90, ctl_mainsheet: 40 })).toBeLessThan(0.01);
  });

  it('the vang tackle stays beside the strut, from the mast foot to the boom', () => {
    const vang = drawings({}).find((rope) => rope.id === 'rope_vang');
    const tackle = vang?.strands[0]?.points ?? [];
    const top = tackle[0] as Vec3;
    const bottom = tackle[tackle.length - 1] as Vec3;
    expect(distance(bottom, boat.rig.vang.mastPoint as unknown as Vec3)).toBeLessThan(0.1);
    expect(top[1]).toBeGreaterThan(bottom[1]);
  });
});
