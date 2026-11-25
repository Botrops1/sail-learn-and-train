import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls, type Controls } from '../src/model/controls';
import { alongPolyline, labelAnchors, placeLabels } from '../src/model/labels3d';
import { isRegisteredPartId } from '../src/model/registry';
import { ropeDrawings } from '../src/model/ropePaths';
import { gennakerClew } from '../src/model/gennaker';
import { initialRig } from '../src/model/sim';
import type { Vec3 } from '../src/model/vec3';

function anchors(values: Partial<Controls> = {}) {
  const rig = initialRig({ ...defaultControls(), ...values });
  return labelAnchors(rig, ropeDrawings(rig));
}

const point = (list: ReturnType<typeof anchors>, id: string) =>
  list.find((anchor) => anchor.id === id)?.point;

describe('M5: labels in 3D (model)', () => {
  it('every label is a registered part or rope, listed once, and has a point on or near the boat', () => {
    const ids = boat.visual.labels3d.list.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(isRegisteredPartId(id), id).toBe(true);
    const list = anchors();
    // The gennaker's label shows only while the sail is set (below).
    expect(list.map((anchor) => anchor.id)).toEqual(ids.filter((id) => id !== 'sail_gennaker'));
    for (const { id, point: p } of list) {
      expect(p.every(Number.isFinite), id).toBe(true);
      expect(p[0], id).toBeGreaterThan(boat.hull.transomX - 1);
      expect(p[0], id).toBeLessThan(boat.hull.bowFittingTipX + 1);
      expect(Math.abs(p[2]), id).toBeLessThan(boat.dimensions.beam / 2 + 1);
      expect(p[1], id).toBeGreaterThan(-3);
      expect(p[1], id).toBeLessThan(boat.rig.mast.topY + 1);
    }
  });

  it('every rope has a label, sitting on the rope as drawn', () => {
    const list = anchors();
    // The gennaker's lines (M105) have no 3D label.
    for (const rope of boat.ropes.list.filter((r) => !r.id.startsWith('rope_gennaker_'))) {
      expect(point(list, rope.id), rope.id).toBeDefined();
    }
  });

  it('labels follow what they name: the boom label swings with the boom, the main sheet label with its rope', () => {
    const port = anchors({ ctl_wind_dir: 90, ctl_mainsheet: 100 });
    const starboard = anchors({ ctl_wind_dir: -90, ctl_mainsheet: 100 });
    expect((point(port, 'part_boom') as Vec3)[2]).toBeLessThan(-2);
    expect((point(starboard, 'part_boom') as Vec3)[2]).toBeGreaterThan(2);
    expect((point(port, 'rope_mainsheet') as Vec3)[2]).toBeLessThan(0);
    expect((point(port, 'sail_main') as Vec3)[2]).toBeLessThan(0);
  });

  it('a sail rolled away has no label', () => {
    const furled = anchors({ ctl_main_furl: 0, ctl_jib_furl: 0, ctl_jib_sheet: 100 });
    expect(point(furled, 'sail_main')).toBeUndefined();
    expect(point(furled, 'sail_jib')).toBeUndefined();
    expect(point(furled, 'part_mast')).toBeDefined();
  });

  it('the set gennaker has its own label, on the sail, ahead of the mainsail label (M106 review)', () => {
    const setup = { stage: 4 as const, side: 1 as const, crossS: 0, crossFromDeg: 0 };
    const controls = {
      ...defaultControls(),
      ctl_wind_dir: 120,
      ctl_wind_speed: 12,
      ctl_gennaker_sock: 100,
    };
    const rig = initialRig(controls, boat, {}, undefined, undefined, setup);
    expect(rig.gennaker.set).toBe(true);
    const list = labelAnchors(rig, ropeDrawings(rig));
    const ids = list.map((anchor) => anchor.id);
    expect(ids).toContain('sail_gennaker');
    expect(ids.indexOf('sail_gennaker')).toBeLessThan(ids.indexOf('sail_main'));
    const p = point(list, 'sail_gennaker') as Vec3;
    const { tack, head } = boat.sails.gennaker;
    const clew = gennakerClew(rig.gennaker.thetaDeg);
    for (const axis of [0, 1, 2] as const) {
      const third = ((tack[axis] ?? 0) + (head[axis] ?? 0) + (clew[axis] ?? 0)) / 3;
      expect(p[axis], `axis ${axis}`).toBeCloseTo(third, 6);
    }
    // Snuffed (sock down): no label.
    const snuffed = initialRig(
      { ...controls, ctl_gennaker_sock: 0 },
      boat,
      {},
      undefined,
      undefined,
      setup,
    );
    expect(point(labelAnchors(snuffed, ropeDrawings(snuffed)), 'sail_gennaker')).toBeUndefined();
  });

  it('a point along a polyline, by length', () => {
    const line: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 3, 0],
    ];
    expect(alongPolyline(line, 0)).toEqual([0, 0, 0]);
    expect(alongPolyline(line, 0.5)).toEqual([1, 1, 0]);
    expect(alongPolyline(line, 1)).toEqual([1, 3, 0]);
    expect(alongPolyline(line, 2)).toEqual([1, 3, 0]);
    expect(alongPolyline([], 0.5)).toBeUndefined();
  });
});

describe('M5: labels in 3D (placing)', () => {
  const box = (id: string, x: number, y: number) => ({ id, x, y, width: 60, height: 20 });
  const area = { x: 0, y: 0, width: 400, height: 300 };

  it('higher in the list wins an overlap; labels clear of each other all show', () => {
    const shown = placeLabels(
      [box('a', 10, 10), box('b', 30, 15), box('c', 200, 100)],
      area,
      [],
      [],
      4,
    );
    expect([...shown].sort()).toEqual(['a', 'c']);
  });

  it('the selected label always shows, even over a more important one', () => {
    const shown = placeLabels([box('a', 10, 10), box('b', 30, 15)], area, [], ['b'], 4);
    expect([...shown]).toEqual(['b']);
  });

  it('no label outside the view or over its buttons', () => {
    const shown = placeLabels(
      [box('out', 380, 10), box('under-button', 100, 100), box('free', 100, 200)],
      area,
      [{ x: 90, y: 90, width: 40, height: 40 }],
      [],
      4,
    );
    expect([...shown]).toEqual(['free']);
  });
});
