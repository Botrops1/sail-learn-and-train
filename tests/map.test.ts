import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import { initialBoat } from '../src/model/motion';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import { appendTrack, type TrackPoint } from '../src/model/track';
import { pointOfSail } from '../src/model/pointsOfSail';
import { isRegisteredPartId } from '../src/model/registry';
import { mapToBoat } from '../src/model/mapFrame';
import {
  LABEL_ANGLES_DEG,
  ZOOM_LEVELS,
  boatScale,
  mapLayout,
  mapToScreen,
  pickMap,
  pointLabels,
  scaleBar,
  type MapViewport,
  type TextWidth,
} from '../src/ui/mapView';
import { t } from '../src/ui/i18n';

const SAILING = { mode: 'sailing', speedMps: 3 } as const;

/** A canvas 360 × 420 centred on the boat, 1 m per pixel, north up. */
function viewport(overrides: Partial<MapViewport> = {}): MapViewport {
  return {
    centreEastM: 0,
    centreNorthM: 0,
    upDeg: 0,
    metresPerPx: 1,
    widthPx: 360,
    heightPx: 420,
    centreXPx: 180,
    centreYPx: 210,
    ...overrides,
  };
}

/** 6.5 px per letter: close to a 12 px system font, and the same in every test. */
const width: TextWidth = (text, bold) => text.length * (bold ? 7 : 6.5);

describe('M7 points of sail (PHASE2_SPEC 7.3)', () => {
  it('band edges belong to the higher band', () => {
    expect(pointOfSail(39.9).id).toBe('no_go');
    expect(pointOfSail(40).id).toBe('close_hauled');
    expect(pointOfSail(54.9).id).toBe('close_hauled');
    expect(pointOfSail(55).id).toBe('close_reach');
    expect(pointOfSail(180).id).toBe('run');
    expect(pointOfSail(-180).id).toBe('run');
    expect(pointOfSail(-90).id).toBe('beam_reach');
    expect(pointOfSail(0).id).toBe('no_go');
  });

  it('is the same on both sides of the bow', () => {
    for (let twa = 0; twa <= 180; twa += 5) {
      expect(pointOfSail(-twa).id, String(twa)).toBe(pointOfSail(twa).id);
    }
  });

  it('every band points at a registered term, and every label angle falls in its own band', () => {
    for (const band of boat.physics.display.pointsOfSail) {
      expect(isRegisteredPartId(band.termId), band.termId).toBe(true);
    }
    for (const [id, angle] of Object.entries(LABEL_ANGLES_DEG)) {
      expect(pointOfSail(angle).id, id).toBe(id);
    }
  });

  it('PT-21 the no-go wedge is about 45° either side of the true wind (data)', () => {
    expect(boat.physics.display.noGoHalfAngleDeg).toBe(45);
  });
});

describe('M7 track (PHASE2_SPEC 7.3)', () => {
  const at = (east: number, north: number) => initialBoat({ eastM: east, northM: north });

  it('adds a point once the last one is a sample old, and not before', () => {
    let track: TrackPoint[] = [];
    track = appendTrack(track, at(0, 0), 0);
    expect(track).toHaveLength(1);
    const same = appendTrack(track, at(1, 1), 0.5);
    expect(same).toBe(track);
    const next = appendTrack(track, at(2, 3), 1);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ eastM: 2, northM: 3, timeS: 1 });
    expect(track).toHaveLength(1);
  });

  it('keeps the newest trackMaxPoints', () => {
    let track: TrackPoint[] = [];
    const max = boat.physics.display.trackMaxPoints;
    for (let second = 0; second < max + 50; second += 1) {
      track = appendTrack(track, at(second, 0), second);
    }
    expect(track).toHaveLength(max);
    expect(track[track.length - 1]?.timeS).toBe(max + 49);
    expect(track[0]?.timeS).toBe(50);
  });

  it('the store fills it while sailing; Reset and a new Sailing run clear it', () => {
    let state = initialState({ boat: SAILING });
    for (let i = 0; i < 40; i += 1) state = reduce(state, { type: 'step', dt: 0.1 });
    // 4 s of simulation time: the start and a point per second.
    expect(state.track.length).toBeGreaterThanOrEqual(4);
    expect(state.track.length).toBeLessThanOrEqual(5);
    const last = state.track[state.track.length - 1];
    expect(last?.northM).toBeGreaterThan(0);
    expect(reduce(state, { type: 'reset' }).track).toEqual([]);
    const held = reduce(state, { type: 'setBoatMode', mode: 'held' });
    expect(held.track).toBe(state.track);
    expect(reduce(held, { type: 'setBoatMode', mode: 'sailing' }).track).toEqual([]);
  });

  it('held still leaves it empty', () => {
    let state = initialState({ boat: { mode: 'held' } });
    for (let i = 0; i < 30; i += 1) state = reduce(state, { type: 'step', dt: 0.1 });
    expect(state.track).toEqual([]);
  });

  it('paused time adds nothing', () => {
    let state = initialState({ boat: SAILING });
    state = reduce(state, { type: 'step', dt: 0.1 });
    state = reduce(state, { type: 'setPaused', paused: true });
    const before = state.track;
    for (let i = 0; i < 40; i += 1) state = reduce(state, { type: 'step', dt: 0.1 });
    expect(state.track).toBe(before);
  });
});

describe('M7 link (PHASE2_SPEC 7.7)', () => {
  it('cam=map round-trips and is the map', () => {
    const state = parseUrlState('?wd=45&ws=12&cam=map');
    expect(state.camera.preset).toBe('map');
    const again = parseUrlState(serializeUrlState(state));
    expect(again.camera.preset).toBe('map');
    expect(serializeUrlState(state)).toContain('cam=map');
  });

  it('an unknown cam falls back to the default view', () => {
    expect(parseUrlState('?cam=satellite').camera.preset).toBe('side-port');
    expect(parseUrlState('?cam=MAP').camera.preset).toBe('side-port');
  });

  it('the track is not in the link', () => {
    let state: AppState = initialState({ boat: SAILING });
    for (let i = 0; i < 40; i += 1) state = reduce(state, { type: 'step', dt: 0.1 });
    expect(serializeUrlState(state)).not.toMatch(/track/);
    expect(parseUrlState(serializeUrlState(state)).track).toEqual([]);
  });
});

describe('M7 map maths (PHASE2_SPEC 7.7)', () => {
  it('north up: east is right, north is up, the boat is in the middle', () => {
    const view = viewport({ centreEastM: 100, centreNorthM: 200 });
    expect(mapToScreen(100, 200, view)).toEqual({ x: 180, y: 210 });
    const east = mapToScreen(150, 200, view);
    expect(east.x).toBeCloseTo(230, 9);
    expect(east.y).toBeCloseTo(210, 9);
    const north = mapToScreen(100, 250, view);
    expect(north.x).toBeCloseTo(180, 9);
    expect(north.y).toBeCloseTo(160, 9);
  });

  it('boat up: a point 100 m ahead of the boat is straight above the centre', () => {
    for (const heading of [0, 37, 90, 180, 271, 359]) {
      const h = (heading * Math.PI) / 180;
      const view = viewport({ upDeg: heading, centreEastM: 12, centreNorthM: -8 });
      const ahead = mapToScreen(12 + 100 * Math.sin(h), -8 + 100 * Math.cos(h), view);
      expect(ahead.x, `heading ${heading}`).toBeCloseTo(180, 6);
      expect(ahead.y, `heading ${heading}`).toBeCloseTo(210 - 100, 6);
      // 100 m to starboard is to the right.
      const stbd = mapToScreen(12 + 100 * Math.cos(h), -8 - 100 * Math.sin(h), view);
      expect(stbd.x, `heading ${heading}`).toBeCloseTo(280, 6);
      expect(stbd.y, `heading ${heading}`).toBeCloseTo(210, 6);
    }
  });

  it('zoom changes the metres per pixel', () => {
    const view = viewport({ metresPerPx: 4 });
    expect(mapToScreen(400, 0, view).x).toBeCloseTo(280, 9);
    expect(ZOOM_LEVELS).toEqual([0.5, 1, 2, 4, 8]);
  });

  it('agrees with the boat frame of the 3D scene', () => {
    // Boat up at heading 90 (bow east): a point 1 m east is 1 m ahead.
    expect(mapToBoat(1, 0, 90)[0]).toBeCloseTo(1, 12);
    expect(mapToScreen(1, 0, viewport({ upDeg: 90 })).y).toBeCloseTo(210 - 1, 9);
  });

  it('the scale bar is the length nearest to 80 px', () => {
    expect(scaleBar(1)).toEqual({ metres: 100, px: 100 });
    expect(scaleBar(0.5)).toEqual({ metres: 50, px: 100 });
    expect(scaleBar(2)).toEqual({ metres: 200, px: 100 });
    expect(scaleBar(4)).toEqual({ metres: 200, px: 50 });
    expect(scaleBar(8).metres).toBe(500);
  });

  it('the boat is drawn to scale, but at least 24 px long ("boat enlarged")', () => {
    expect(boatScale(0.5)).toEqual({ pxPerM: 2, enlarged: false });
    const one = boatScale(1);
    expect(one.enlarged).toBe(true);
    expect(one.pxPerM * boat.dimensions.loa).toBeCloseTo(24, 9);
    expect(boatScale(8).pxPerM * boat.dimensions.loa).toBeCloseTo(24, 9);
  });
});

describe('M7 map labels and taps (PHASE2_SPEC 7.4)', () => {
  // Wind from 045 (a close-hauled boat on heading 0), 12 kn.
  const closeHauled = () =>
    initialState({
      controls: { ctl_wind_dir: 45, ctl_wind_speed: 12, ctl_mainsheet: 12, ctl_jib_sheet: 0 },
      boat: SAILING,
    });

  it('the current point of sail is the bold label', () => {
    const labels = pointLabels(45, 45, viewport(), width);
    expect(labels.filter((label) => label.bold).map((label) => label.id)).toEqual([
      'close_hauled',
      'close_hauled',
    ]);
    expect(labels.find((label) => label.bold)?.text).toBe('Close-hauled');
    // On a run: only one "Run" label, and it is the bold one.
    const run = pointLabels(175, 175, viewport(), width);
    expect(run.filter((label) => label.id === 'run')).toHaveLength(1);
    expect(run.find((label) => label.id === 'run')?.bold).toBe(true);
    expect(run.filter((label) => label.bold)).toHaveLength(1);
  });

  it('labels sit where a boat on that point of sail would head', () => {
    // Wind from the north: a close-hauled boat heads 045 or 315; the label is up and to the side.
    const labels = pointLabels(0, 0, viewport(), width);
    const closeHauledLabels = labels.filter((label) => label.id === 'close_hauled');
    const xs = closeHauledLabels.map((label) => label.x - 180).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(-50);
    expect(xs[1]).toBeGreaterThan(50);
    for (const label of closeHauledLabels) expect(label.y).toBeLessThan(210 - 50);
    // The run label sits at the bottom, directly under the boat.
    const run = labels.find((label) => label.id === 'run');
    expect(run?.x).toBeCloseTo(180, 6);
    expect(run?.y).toBeGreaterThan(210 + 100);
  });

  it('no two labels cover each other, whichever way the wind blows', () => {
    for (let wind = 0; wind < 360; wind += 5) {
      for (const upDeg of [0, 90]) {
        const labels = pointLabels(wind, 45, viewport({ upDeg }), width);
        expect(labels).toHaveLength(9);
        for (let i = 0; i < labels.length; i += 1) {
          for (let j = i + 1; j < labels.length; j += 1) {
            const a = labels[i];
            const b = labels[j];
            if (!a || !b) continue;
            const overlapping =
              Math.abs(a.x - b.x) < (width(a.text, a.bold) + width(b.text, b.bold)) / 2 &&
              Math.abs(a.y - b.y) < 14;
            expect(overlapping, `wind ${wind} up ${upDeg}: ${a.text} / ${b.text}`).toBe(false);
          }
        }
      }
    }
  });

  it('PT-20 the apparent wind arrow points from the apparent wind and grows with its speed', () => {
    const state = closeHauled();
    const layout = mapLayout(state, viewport(), width);
    const length = Math.hypot(
      layout.apparentTail.x - layout.apparentHead.x,
      layout.apparentTail.y - layout.apparentHead.y,
    );
    expect(length).toBeCloseTo(20 + 3 * state.rig.wind.awsKn, 6);
    // It points from where the apparent wind comes: starboard bow, so the tail is up and right.
    expect(layout.apparentTail.x).toBeGreaterThan(180);
    expect(layout.apparentTail.y).toBeLessThan(210);
  });

  it('a tap picks the boat, the no-go wedge, the apparent arrow and a label', () => {
    const state = closeHauled();
    const view = viewport();
    const layout = mapLayout(state, view, width);
    expect(pickMap(state, view, width, 180, 210)).toBe('part_hull');
    // The no-go wedge points at the wind (045): up and to the right, 60 px out.
    const wedge = 60 / Math.SQRT2;
    expect(pickMap(state, view, width, 180 + wedge + 20, 210 - wedge - 20)).toBe('term_no_go_zone');
    // Inside the circle but outside the wedge: nothing.
    expect(pickMap(state, view, width, 180 - 60, 210 + 20)).toBeNull();
    // The middle of the apparent arrow (it lies between the bow and the true wind).
    const mid = {
      x: (layout.apparentHead.x + layout.apparentTail.x) / 2,
      y: (layout.apparentHead.y + layout.apparentTail.y) / 2,
    };
    expect(pickMap(state, view, width, mid.x, mid.y)).toBe('term_apparent_wind');
    const label = layout.labels.find((candidate) => candidate.id === 'beam_reach');
    expect(label).toBeDefined();
    expect(pickMap(state, view, width, label?.x ?? 0, label?.y ?? 0)).toBe('term_beam_reach');
    // Open water.
    expect(pickMap(state, view, width, 10, 400)).toBeNull();
  });

  it('boat up turns the wedge with the boat', () => {
    const state = initialState({
      controls: { ctl_wind_dir: 100, ctl_wind_speed: 12 },
      boat: { ...SAILING, headingDeg: 90 },
    });
    // Heading 90, wind from 100: the wind is 10° to starboard of the bow: boat up, the wedge is
    // straight ahead.
    const view = viewport({ upDeg: 90 });
    // 35° to port of the wind arrow: still inside the wedge, clear of the apparent wind arrow.
    const tap = (bearing: number) => {
      const a = (bearing * Math.PI) / 180;
      return [180 + 70 * Math.sin(a), 210 - 70 * Math.cos(a)] as const;
    };
    expect(pickMap(state, view, width, ...tap(10 - 35))).toBe('term_no_go_zone');
    // North up the same spot on the water is 35° to port of due east-ish (bearing 65).
    expect(pickMap(state, viewport(), width, ...tap(100 - 35))).toBe('term_no_go_zone');
    // And the other way round: boat up, bearing 65 on the screen is 55° off the wind: outside.
    expect(pickMap(state, view, width, ...tap(10 + 55))).toBeNull();
  });

  it('PT-21 a tap inside ±45° of the wind is in the no-go zone, outside it is not', () => {
    const state = closeHauled();
    const view = viewport();
    // 50 px out, 40° either side of the wind (045): inside; 50° either side: outside.
    const at = (bearing: number) => {
      const a = (bearing * Math.PI) / 180;
      return pickMap(state, view, width, 180 + 70 * Math.sin(a), 210 - 70 * Math.cos(a));
    };
    expect(at(45 + 40)).toBe('term_no_go_zone');
    expect(at(45 - 40)).toBe('term_no_go_zone');
    expect(at(45 + 50)).toBeNull();
    expect(at(45 - 50)).toBeNull();
  });

  it('"No-go zone" and "Apparent … kn" never cover each other, whichever way she sails', () => {
    for (const wind of [0, 45, 90, 135, 175, 180, 225, 270, 315]) {
      for (const heading of [0, 40, 90, 180, 300]) {
        for (const speed of [0, 2, 12, 28]) {
          const state = initialState({
            controls: { ctl_wind_dir: wind > 180 ? wind - 360 : wind, ctl_wind_speed: speed },
            boat: { ...SAILING, headingDeg: heading },
          });
          const layout = mapLayout(state, viewport(), width);
          const a = layout.noGoLabel;
          const b = layout.apparentLabel;
          const overlapping =
            Math.abs(a.x - b.x) < (width(a.text, a.bold) + width(b.text, b.bold)) / 2 &&
            Math.abs(a.y - b.y) < 14;
          expect(overlapping, `wind ${wind} heading ${heading} speed ${speed}`).toBe(false);
        }
      }
    }
  });

  it('the strings exist for every point of sail', () => {
    for (const band of boat.physics.display.pointsOfSail) {
      expect(t(`pos.${band.id}` as Parameters<typeof t>[0]).length, band.id).toBeGreaterThan(0);
    }
  });
});
