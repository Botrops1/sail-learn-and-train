import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { area } from '../src/model/area';
import { DEFAULT_HARBOUR } from '../src/model/harbour';
import {
  MARINA_LAYOUT_IDS,
  TRAFFIC_IDS,
  insidePolygon,
  marinaBounds,
  marinaGeometry,
  yachtOutline,
  type Rect,
} from '../src/model/marina';
import { placeStart } from '../src/model/places';
import { isSeaSetting } from '../src/model/waves';
import { buildMarina } from '../src/render3d/marina';
import { SCENE } from '../src/render3d/sceneConfig';

type Polygon = [number, number][];

const rectPolygon = (r: Rect): Polygon => [
  [r.west, r.south],
  [r.east, r.south],
  [r.east, r.north],
  [r.west, r.north],
];

/** Counter-clockwise test of three points, for the edge crossing test. */
const turn = (a: [number, number], b: [number, number], c: [number, number]) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function edgesCross(a: Polygon, b: Polygon): boolean {
  for (let i = 0; i < a.length; i += 1) {
    const p1 = a[i] as [number, number];
    const p2 = a[(i + 1) % a.length] as [number, number];
    for (let j = 0; j < b.length; j += 1) {
      const q1 = b[j] as [number, number];
      const q2 = b[(j + 1) % b.length] as [number, number];
      if (turn(p1, p2, q1) * turn(p1, p2, q2) < 0 && turn(q1, q2, p1) * turn(q1, q2, p2) < 0) {
        return true;
      }
    }
  }
  return false;
}

/** True if two polygons share any area (edges cross, or one lies inside the other). */
function overlap(a: Polygon, b: Polygon): boolean {
  if (edgesCross(a, b)) return true;
  const first = (p: Polygon) => p[0] as [number, number];
  return insidePolygon(b, ...first(a)) || insidePolygon(a, ...first(b));
}

/** A shared link: what it opens with, written again. */
const relink = (state: AppState): AppState => parseUrlState(serializeUrlState(state));

describe('Phase 7, M42: the marina (geometry)', () => {
  it('1. medium and half full: the worked values of the spec', () => {
    const g = marinaGeometry('medium', 'half');
    expect(g.fairway.north).toBeCloseTo(1483, 2);
    expect(g.fairway.south).toBeCloseTo(1453, 2);
    expect(g.pontoon.north).toBeCloseTo(1436, 2);
    expect(g.pontoon.south).toBeCloseTo(1433, 2);
    expect(g.berths).toHaveLength(48);
    expect(g.berths[24]?.sternNorthM).toBeCloseTo(1437, 2);
    expect(g.ourBerth.row).toBe('north');
    expect(g.ourBerth.index).toBe(12);
    expect(g.ourBerth.centreEastM).toBeCloseTo(2.75, 2);
    expect(g.ourBerth.sternNorthM).toBeCloseTo(1499, 2);
    expect(g.ourBerth.headingDeg).toBe(180);
    expect(g.yachts.some((y) => y.berth.row === 'north' && y.berth.index === 12)).toBe(false);
    expect(g.yachts.filter((y) => y.berth.row === 'north')).toHaveLength(14);
    expect(g.yachts.filter((y) => y.berth.row === 'south')).toHaveLength(14);
    // The quay, the wall and the rings.
    expect(g.quay).toEqual({ west: -110, east: 120, south: 1500, north: 1515 });
    expect(g.wall).toEqual({ west: 110, east: 120, south: 1433, north: 1500 });
    expect(g.rings).toHaveLength(25);
    expect(g.rings[0]).toEqual([-66, 1500]);
    expect(g.rings[24]).toEqual([66, 1500]);
  });

  it('2. busy takes every berth but ours, empty none; tight is 22 m wide with 4.9 m berths', () => {
    expect(marinaGeometry('medium', 'busy').yachts).toHaveLength(47);
    expect(marinaGeometry('medium', 'empty').yachts).toHaveLength(0);
    const tight = marinaGeometry('tight', 'half');
    expect(tight.fairway.north - tight.fairway.south).toBeCloseTo(22, 6);
    expect(tight.berths[0]?.widthM).toBeCloseTo(4.9, 6);
    const spacious = marinaGeometry('spacious', 'half');
    expect(spacious.fairway.north - spacious.fairway.south).toBeCloseTo(40, 6);
  });

  it('3. no two yachts overlap, and none overlaps the quay, wall, pontoon or our berth', () => {
    for (const layout of MARINA_LAYOUT_IDS) {
      for (const traffic of TRAFFIC_IDS) {
        const g = marinaGeometry(layout, traffic);
        const w = g.ourBerth.widthM;
        const ours: Rect = {
          west: g.ourBerth.centreEastM - w / 2,
          east: g.ourBerth.centreEastM + w / 2,
          south: area.marina.quayFaceNorthM - area.marina.sternGapM - area.marina.berthZoneM,
          north: area.marina.quayFaceNorthM,
        };
        const fixed = [g.quay, g.wall, g.pontoon, ours].map(rectPolygon);
        g.yachts.forEach((yacht, i) => {
          for (const rect of fixed) {
            expect(overlap(yacht.outline, rect), `${layout}/${traffic} ${yacht.id}`).toBe(false);
          }
          for (const other of g.yachts.slice(i + 1)) {
            expect(overlap(yacht.outline, other.outline), `${yacht.id} ${other.id}`).toBe(false);
          }
        });
      }
    }
  });

  it('4. yachts lie stern to the quay and stern to the pontoon', () => {
    const g = marinaGeometry('medium', 'busy');
    const north = g.yachts.find((y) => y.id === 'yacht-0-11');
    const south = g.yachts.find((y) => y.id === 'yacht-1-11');
    expect(north).toBeDefined();
    expect(south).toBeDefined();
    const norths = (y: typeof north) => (y?.outline ?? []).map((p) => p[1]);
    // North row: the stern at 1499, the bow reaches south by its length.
    expect(Math.max(...norths(north))).toBeLessThanOrEqual(1499 + 0.5 * 4.75);
    expect(Math.min(...norths(north))).toBeCloseTo(1499 - (north?.lengthM ?? 0), 6);
    // South row: the stern at 1437, the bow reaches north.
    expect(Math.max(...norths(south))).toBeCloseTo(1437 + (south?.lengthM ?? 0), 6);
  });

  it('5. a yacht outline is a closed hull: widest at 0.45 L, pointed at the bow', () => {
    const outline = yachtOutline(14, 4.3);
    expect(outline).toHaveLength(7);
    expect(outline[3]).toEqual([14, 0]);
    expect(Math.max(...outline.map((p) => p[1]))).toBeCloseTo(0.5 * 4.3, 9);
    expect(Math.min(...outline.map((p) => p[1]))).toBeCloseTo(-0.5 * 4.3, 9);
  });

  it('6. the area file: the marina sets flat water, a known sea', () => {
    const entry = area.places.find((place) => place.id === 'marina');
    expect(entry?.sea !== undefined && isSeaSetting(entry.sea)).toBe(true);
    expect(marinaBounds(marinaGeometry('medium', 'half'))).toEqual({
      west: -110,
      east: 120,
      south: 1433,
      north: 1515,
    });
  });

  it('7. placeStart: the marina medium start is (-95, 1468) heading 90 in flat water', () => {
    expect(placeStart({ ...DEFAULT_HARBOUR, place: 'marina' })).toEqual({
      eastM: -95,
      northM: 1468,
      headingDeg: 90,
      sea: 'flat',
    });
    expect(placeStart({ ...DEFAULT_HARBOUR, place: 'marina', layout: 'tight' }).northM).toBe(1472);
    expect(placeStart(DEFAULT_HARBOUR)).toEqual({
      eastM: 0,
      northM: 0,
      headingDeg: 0,
      sea: null,
    });
  });
});

describe('Phase 7, M42: choosing a place (store)', () => {
  it('8. goToPlace marina: the start, at rest, engine in neutral, sails away, flat water', () => {
    const before = initialState({ appMode: 'harbour', sea: 'coastal' });
    const state = reduce(before, { type: 'goToPlace', place: 'marina' });
    expect(state.harbour.place).toBe('marina');
    expect(state.boat.mode).toBe('sailing');
    expect(state.boat.eastM).toBeCloseTo(-95, 6);
    expect(state.boat.northM).toBeCloseTo(1468, 6);
    expect(state.boat.headingDeg).toBeCloseTo(90, 6);
    expect(state.boat.speedMps).toBe(0);
    expect(state.engine.running).toBe(true);
    expect(state.engine.leverPct).toBe(0);
    expect(state.controls.ctl_main_furl).toBe(0);
    expect(state.controls.ctl_jib_furl).toBe(0);
    expect(state.controls.ctl_jib_sheet).toBe(100);
    expect(state.controls.ctl_rudder).toBe(0);
    expect(state.sea.setting).toBe('flat');
    expect(state.autopilot.mode).toBe('off');
    expect(state.track).toEqual([]);
    expect(state.selection).toBeNull();
    expect(state.appMode).toBe('harbour');
    // The wind the learner set stays.
    expect(state.controls.ctl_wind_dir).toBe(before.controls.ctl_wind_dir);
    expect(state.controls.ctl_wind_speed).toBe(before.controls.ctl_wind_speed);
  });

  it('9. goToPlace again puts her back at the start; Held still becomes Sailing', () => {
    let state = reduce(initialState(), { type: 'goToPlace', place: 'marina' });
    state = { ...state, boat: { ...state.boat, eastM: 10, northM: 1480, mode: 'held' } };
    const again = reduce(state, { type: 'goToPlace', place: 'marina' });
    expect(again.boat.eastM).toBeCloseTo(-95, 6);
    expect(again.boat.mode).toBe('sailing');
  });

  it('10. open water: the position of the open entry; the sea setting and controls stay', () => {
    const marina = reduce(initialState({ sea: 'coastal' }), { type: 'goToPlace', place: 'marina' });
    const open = reduce(marina, { type: 'goToPlace', place: 'open' });
    expect(open.harbour.place).toBe('open');
    expect(open.boat.eastM).toBe(0);
    expect(open.boat.northM).toBe(0);
    expect(open.boat.headingDeg).toBe(0);
    expect(open.sea.setting).toBe('flat'); // the flat water the marina set (accepted)
    expect(open.autopilot.mode).toBe('off');
  });

  it('11. layout and traffic: in the marina she goes back to the start, elsewhere only the field changes', () => {
    const marina = reduce(initialState(), { type: 'goToPlace', place: 'marina' });
    const tight = reduce(marina, { type: 'setMarinaLayout', layout: 'tight' });
    expect(tight.harbour.layout).toBe('tight');
    expect(tight.boat.eastM).toBeCloseTo(-95, 6);
    expect(tight.boat.northM).toBeCloseTo(1472, 6);
    const busy = reduce(tight, { type: 'setTraffic', traffic: 'busy' });
    expect(busy.harbour.traffic).toBe('busy');
    expect(busy.harbour.layout).toBe('tight');
    const open = initialState();
    const changed = reduce(open, { type: 'setTraffic', traffic: 'empty' });
    expect(changed.harbour.traffic).toBe('empty');
    expect(changed.boat).toBe(open.boat);
    expect(reduce(changed, { type: 'setTraffic', traffic: 'empty' })).toBe(changed);
  });

  it('12. fenders stay out when she goes to a place', () => {
    const out = reduce(initialState(), { type: 'setFenders', out: true });
    expect(reduce(out, { type: 'goToPlace', place: 'marina' }).harbour.fendersOut).toBe(true);
  });
});

describe('Phase 7, M42: the place keys in the link', () => {
  it('13. a marina state round-trips: place, layout, traffic, position, heading, speed', () => {
    let state = reduce(initialState({ appMode: 'harbour' }), {
      type: 'goToPlace',
      place: 'marina',
    });
    state = reduce(state, { type: 'setMarinaLayout', layout: 'tight' });
    state = reduce(state, { type: 'setTraffic', traffic: 'busy' });
    state = {
      ...state,
      boat: { ...state.boat, eastM: 2.8, northM: 1480.04, headingDeg: 180, speedMps: 0.5144 },
    };
    const link = serializeUrlState(state);
    expect(link).toContain('pl=marina');
    expect(link).toContain('ml=tight');
    expect(link).toContain('tr=busy');
    expect(link).toContain('pe=2.8');
    expect(link).toContain('pn=1480.0');
    const back = parseUrlState(link);
    expect(back.harbour).toEqual({
      fendersOut: false,
      place: 'marina',
      layout: 'tight',
      traffic: 'busy',
    });
    expect(back.boat.eastM).toBe(2.8);
    expect(back.boat.northM).toBe(1480);
    expect(back.boat.headingDeg).toBe(180);
    expect(back.boat.speedMps).toBeCloseTo(0.5144, 2);
    expect(back.engine.running).toBe(true);
    expect(back.sea.setting).toBe('flat');
    expect(serializeUrlState(back)).toBe(link);
  });

  it('14. the marina defaults write no ml or tr; a stopped engine, a coastal sea and the autopilot survive', () => {
    let state = reduce(initialState(), { type: 'goToPlace', place: 'marina' });
    expect(serializeUrlState(state)).not.toMatch(/[?&](ml|tr)=/);
    state = reduce(state, { type: 'engine', command: 'stop' });
    state = reduce(state, { type: 'setSeaSetting', setting: 'coastal' });
    state = reduce(state, { type: 'autopilot', command: 'heading' });
    const back = relink(state);
    expect(back.engine.running).toBe(false);
    expect(back.sea.setting).toBe('coastal');
    expect(back.autopilot.mode).toBe('heading');
  });

  it('15. open water writes none of the place keys, and the old state is unchanged', () => {
    const link = serializeUrlState(initialState());
    expect(link).not.toMatch(/[?&](pl|ml|tr|pe|pn)=/);
    expect(link).not.toContain('eng=0');
    expect(serializeUrlState(parseUrlState(link))).toBe(link);
  });

  it('16. pe and pn without pl are ignored: she opens at the origin', () => {
    const state = parseUrlState('?pe=10&pn=20');
    expect(state.harbour.place).toBe('open');
    expect(state.boat.eastM).toBe(0);
    expect(state.boat.northM).toBe(0);
    expect(parseUrlState('?ml=tight&tr=busy').harbour).toEqual(DEFAULT_HARBOUR);
  });

  it('17. ?pl=marina alone opens at the start in the ready state', () => {
    const state = parseUrlState('?pl=marina');
    expect(state.harbour.place).toBe('marina');
    expect(state.boat.eastM).toBe(-95);
    expect(state.boat.northM).toBe(1468);
    expect(state.boat.headingDeg).toBe(90);
    expect(state.boat.speedMps).toBe(0);
    expect(state.engine.running).toBe(true);
    expect(state.engine.leverPct).toBe(0);
    expect(state.autopilot.mode).toBe('off');
    expect(state.controls.ctl_main_furl).toBe(0);
    expect(state.controls.ctl_jib_furl).toBe(0);
    expect(state.controls.ctl_jib_sheet).toBe(100);
    expect(state.sea.setting).toBe('flat');
  });

  it('18. keys that are given win over the ready state', () => {
    const state = parseUrlState('?pl=marina&hdg=180&bs=1.0&eng=0&ap=hdg&mf=50&sea=open');
    expect(state.boat.headingDeg).toBe(180);
    expect(state.engine.running).toBe(false);
    expect(state.autopilot.mode).toBe('heading');
    expect(state.controls.ctl_main_furl).toBe(50);
    expect(state.sea.setting).toBe('open');
  });

  it('19. a wrong position gives the start (both from placeStart)', () => {
    for (const query of ['?pl=marina&pe=1e3&pn=5', '?pl=marina&pe=10', '?pl=marina&pe=a&pn=b']) {
      const state = parseUrlState(query);
      expect(state.boat.eastM, query).toBe(-95);
      expect(state.boat.northM, query).toBe(1468);
    }
    expect(parseUrlState('?pl=nowhere').harbour.place).toBe('open');
    expect(parseUrlState('?pl=marina&ml=huge&tr=full').harbour.layout).toBe('medium');
  });

  it('20. a place link keeps the fenders key', () => {
    const state = parseUrlState('?pl=marina&fd=1');
    expect(state.harbour.fendersOut).toBe(true);
    expect(serializeUrlState(state)).toContain('fd=1');
  });
});

describe('Phase 7, M42: the marina in 3D', () => {
  const state = initialState({ harbour: { ...DEFAULT_HARBOUR, place: 'marina', traffic: 'busy' } });
  const marina = buildMarina();
  marina.update(state);
  const hulls: THREE.Mesh[] = [];
  marina.object.traverse((node) => {
    if (node instanceof THREE.Mesh && node.geometry instanceof THREE.ExtrudeGeometry) {
      hulls.push(node);
    }
  });

  it('21. one hull per yacht; each stands on the map where the model puts it (winding and up)', () => {
    const { yachts } = marinaGeometry('medium', 'busy');
    expect(hulls).toHaveLength(yachts.length);
    marina.object.updateMatrixWorld(true);
    const yacht = yachts.find((y) => y.id === 'yacht-0-11');
    const north = yacht?.outline.map((p) => p[1]) ?? [];
    const east = yacht?.outline.map((p) => p[0]) ?? [];
    // The scene frame: x = north, z = east, relative to the boat, which is at (0, 0) here. A hull
    // built the wrong way round (mirrored east, or lying down) matches no yacht.
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    const match = hulls.some((hull) => {
      const box = new THREE.Box3().setFromObject(hull);
      return (
        near(box.min.x, Math.min(...north)) &&
        near(box.max.x, Math.max(...north)) &&
        near(box.min.z, Math.min(...east)) &&
        near(box.max.z, Math.max(...east)) &&
        near(box.min.y, -SCENE.harbour.hullBelowM) &&
        near(box.max.y, SCENE.harbour.hullAboveM)
      );
    });
    expect(match).toBe(true);
  });

  it('22. the group follows the boat, and the meshes hide when the marina is far', () => {
    const far = initialState({ harbour: { ...DEFAULT_HARBOUR, place: 'marina' } });
    marina.update(far);
    const meshes: THREE.Object3D[] = [];
    marina.object.traverse((node) => {
      if (node instanceof THREE.Mesh) meshes.push(node);
    });
    expect(meshes.length).toBeGreaterThan(0);
    // The boat is at (0, 0), 1,433 m from the pontoon: further than the draw range.
    expect(meshes.every((mesh) => !mesh.visible)).toBe(true);
    const near = reduce(far, { type: 'goToPlace', place: 'marina' });
    marina.update(near);
    expect(marina.object.position.x).toBeCloseTo(-near.boat.northM, 6);
    expect(marina.object.position.z).toBeCloseTo(-near.boat.eastM, 6);
    expect(meshes.every((mesh) => mesh.visible)).toBe(true);
  });
});
