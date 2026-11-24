import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import hanseJson from '../content/boat/hanse508.json';
import dinghyJson from '../content/boat/dinghy.json';
import { initialState, reduce, type AppState } from '../src/app/store';
import { CONTROL_IDS, controlSpec, type ControlId } from '../src/model/controls';
import { mergeBoat } from '../src/model/boatMerge';
import {
  BUILT_IN_BOATS,
  DINGHY,
  HANSE_508,
  boatHasControl,
  builtInBoat,
  hasFeature,
  isDinghy,
  useBoat,
  type BoatData,
  type FeatureId,
} from '../src/model/boat';
import { tillerAngleDeg } from '../src/model/dinghy';
import { modesForBoat } from '../src/app/appMode';
import { exercisesForBoat } from '../src/model/exercises';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { sectionAvailable } from '../src/ui/modes';
import { defaultControls } from '../src/model/controls';
import { initialRig } from '../src/model/sim';
import { buildBoat } from '../src/render3d/boat';

const FEATURES: FeatureId[] = [
  'jib',
  'mainFurling',
  'gennaker',
  'winches',
  'wheel',
  'engine',
  'autopilot',
  'anchor',
  'harbour',
  'cabin',
  'standingRigging',
  'toppingLift',
];

function useDinghy(): void {
  useBoat(DINGHY.id, DINGHY.name, DINGHY.data);
}

afterEach(() => {
  useBoat(HANSE_508.meta.id, HANSE_508.meta.name, HANSE_508);
});

describe('M113: mergeBoat', () => {
  it('1. objects merge, arrays replace, controls.list merges by id, the base is not changed', () => {
    const before = JSON.stringify(hanseJson);
    const base = structuredClone(hanseJson) as unknown as BoatData;
    const merged = mergeBoat(base, {
      base: 'hanse508',
      $comment: 'x',
      dimensions: { loa: 3 },
      hull: { thrusters: [] },
      controls: {
        list: [
          { id: 'ctl_vang', label: 'Kicker' },
          { id: 'ctl_new', default: 1 },
        ],
      },
    });
    expect(merged.dimensions.loa).toBe(3);
    expect(merged.dimensions.beam).toBe(hanseJson.dimensions.beam);
    expect(merged.hull.thrusters).toEqual([]);
    expect('base' in merged).toBe(false);
    expect('$comment' in merged).toBe(true); // the base's own comment stays
    const vang = merged.controls.list.find((c) => c.id === 'ctl_vang');
    expect(vang?.label).toBe('Kicker');
    expect(vang?.default).toBe(hanseJson.controls.list.find((c) => c.id === 'ctl_vang')?.default);
    expect(merged.controls.list.at(-1)?.id).toBe('ctl_new');
    expect(merged.controls.list.length).toBe(hanseJson.controls.list.length + 1);
    expect(() => mergeBoat(base, { base: 'other' })).toThrow();
    expect(JSON.stringify(base)).toBe(before);
    expect(JSON.stringify(hanseJson)).toBe(before);
  });

  it('1b. every leaf of the dinghy overlay has the JSON type of the leaf it replaces', () => {
    const typeOf = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
    const walk = (over: unknown, base: unknown, path: string): void => {
      if (over !== null && typeof over === 'object' && !Array.isArray(over)) {
        for (const [key, value] of Object.entries(over)) {
          if (path === '' && (key === 'base' || key === '$comment' || key === 'dinghy')) continue;
          if (key === '$comment') continue;
          const child = (base as Record<string, unknown> | undefined)?.[key];
          if (child === undefined) continue;
          walk(value, child, path === '' ? key : `${path}.${key}`);
        }
        return;
      }
      expect(typeOf(over), path).toBe(typeOf(base));
    };
    walk(dinghyJson, hanseJson, '');
  });
});

describe('M113: the Training dinghy as a boat', () => {
  it('2. its data, features and controls', () => {
    const d = DINGHY.data;
    expect(d.dimensions.loa).toBe(3.45);
    expect(d.hull.thrusters).toEqual([]);
    expect(d.ropes.list.map((r) => r.id)).toEqual(['rope_mainsheet', 'rope_vang']);
    useDinghy();
    for (const id of CONTROL_IDS) expect(controlSpec(id), id).toBeDefined();
    expect(controlSpec('ctl_rudder').label).toBe('Tiller');
    expect(controlSpec('ctl_wind_speed').default).toBe(8);
    expect(controlSpec('ctl_wind_speed').max).toBe(25);
    for (const f of FEATURES) {
      expect(hasFeature(f, d), f).toBe(false);
      expect(hasFeature(f, HANSE_508), f).toBe(true);
    }
    expect(isDinghy(d)).toBe(true);
    expect(isDinghy(HANSE_508)).toBe(false);
    expect(BUILT_IN_BOATS.map((b) => b.id)).toEqual(['hanse508', 'dinghy']);
    expect(builtInBoat('dinghy')).toBe(DINGHY);
    expect(builtInBoat('x')).toBeUndefined();
  });

  it('2b. boatHasControl: the dinghy shows two ropes, the steering and the wind', () => {
    const shown = CONTROL_IDS.filter((id) => boatHasControl(id, DINGHY.data));
    expect(shown.sort()).toEqual(
      ['ctl_mainsheet', 'ctl_rudder', 'ctl_vang', 'ctl_wind_dir', 'ctl_wind_speed'].sort(),
    );
    expect(CONTROL_IDS.every((id) => boatHasControl(id, HANSE_508))).toBe(true);
  });

  it('3. no Hanse path on the dinghy: 60 s through every control, no throw, no NaN', () => {
    useDinghy();
    let s: AppState = initialState({ controls: { ctl_wind_dir: 0, ctl_wind_speed: 12 } });
    const moves: [ControlId, number[]][] = [
      ['ctl_mainsheet', [0, 100]],
      ['ctl_vang', [0, 100]],
      ['ctl_rudder', [-35, 35]],
    ];
    let n = 0;
    for (let t = 0; t < 60; t += 1 / 30) {
      if (Math.abs(t / 2 - Math.round(t / 2)) < 1e-6) {
        const [id, values] = moves[n % 3] as [ControlId, number[]];
        s = reduce(s, { type: 'setControls', values: { [id]: values[Math.floor(n / 3) % 2] } });
        n += 1;
      }
      const dir = t < 20 ? 0 : t < 40 ? 90 : 180;
      if (Math.abs(t - 20) < 1e-6 || Math.abs(t - 40) < 1e-6 || t === 0) {
        s = reduce(s, { type: 'setControls', values: { ctl_wind_dir: dir } });
      }
      s = reduce(s, { type: 'step', dt: 1 / 30 });
      expect(Number.isFinite(s.boat.speedMps)).toBe(true);
      expect(Number.isFinite(s.boat.heelDeg)).toBe(true);
      expect(Number.isFinite(s.rig.solution.thetaDeg)).toBe(true);
      // M116: past 48 degrees she goes over; until then the heel stays within the clamp.
      if (s.dinghy.capsize.phase === 'upright') {
        expect(Math.abs(s.boat.heelDeg)).toBeLessThanOrEqual(50.001);
      }
    }
  });

  it('PT-75. the tiller moves opposite to the turn', () => {
    useDinghy();
    let s = initialState({
      controls: { ctl_wind_dir: 90, ctl_wind_speed: 8, ctl_rudder: 20 },
      boat: { speedMps: 2.06 },
    });
    for (let i = 0; i < 90; i += 1) s = reduce(s, { type: 'step', dt: 1 / 30 });
    expect(s.boat.yawRateDegS).toBeGreaterThan(0);
    expect(tillerAngleDeg(s.controls.ctl_rudder)).toBe(-20);
  });
});

describe('M113: the dinghy in 3D', () => {
  const build = (detail: 'high' | 'low') => {
    useDinghy();
    const controls = { ...defaultControls(), ctl_wind_dir: 60, ctl_wind_speed: 8 };
    const rig = initialRig(controls);
    return { model: buildBoat(controls, rig, detail), controls, rig };
  };
  const idsOf = (root: THREE.Object3D): Set<string> => {
    // The ids of what is drawn: a mesh counts only while it and its parents are visible.
    const ids = new Set<string>();
    const drawn = (o: THREE.Object3D): boolean => o.visible && (!o.parent || drawn(o.parent));
    root.traverse((o) => {
      const id = (o.userData as { partId?: string }).partId;
      if (id && drawn(o)) ids.add(id);
    });
    return ids;
  };

  it('7.9.5. has its own parts and none of the Hanse-only ones, at both details', () => {
    for (const detail of ['high', 'low'] as const) {
      const ids = idsOf(build(detail).model.root);
      for (const id of [
        'part_hull',
        'part_deck',
        'part_cockpit',
        'part_rudder',
        'part_tiller',
        'part_tiller_extension',
        'part_centreboard',
        'fit_toe_straps',
        'fit_ratchet_block',
        'part_mast',
        'part_boom',
        'sail_main',
        'rope_mainsheet',
        'rope_vang',
        'person_captain', // the sailor (M115)
      ]) {
        expect(ids.has(id), `${detail} ${id}`).toBe(true);
      }
      for (const id of [
        'sail_jib',
        'part_keel',
        'part_saildrive',
        'part_shroud',
        'part_forestay',
        'part_backstay',
        'part_coachroof',
        'fit_winch',
        'helm_port',
        'helm_starboard',
        'fit_anchor_windlass',
        'fit_fender',
        'rope_jib_sheet',
      ]) {
        expect(ids.has(id), `${detail} ${id}`).toBe(false);
      }
    }
  });

  it('PT-75 (3D). the tiller swings to port when the rudder turns to starboard', () => {
    const { model, controls, rig } = build('low');
    const tipZ = (rudderDeg: number): number => {
      model.update({ ...rig, applied: { ...rig.applied, rudder: rudderDeg } }, controls);
      let z = 0;
      model.root.traverse((o) => {
        if ((o.userData as { partId?: string }).partId !== 'part_tiller_extension') return;
        const box = new THREE.Box3().setFromObject(o);
        z = (box.min.z + box.max.z) / 2;
      });
      return z;
    };
    expect(tipZ(0)).toBeCloseTo(0, 3);
    expect(tipZ(20)).toBeLessThan(-0.2);
    expect(tipZ(-20)).toBeGreaterThan(0.2);
  });

  it('draws the dinghy cheaper than the Hanse', () => {
    const count = (root: THREE.Object3D): number => {
      let n = 0;
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) n += 1;
      });
      return n;
    };
    const dinghy = count(build('high').model.root);
    useBoat(HANSE_508.meta.id, HANSE_508.meta.name, HANSE_508);
    const hanse = count(buildBoat().root);
    expect(dinghy).toBeLessThan(hanse);
  });
});

describe('M113: the dinghy in the link, the modes and the sections', () => {
  it('7.8.5. the dinghy link ignores and never writes the keys of what it lacks', () => {
    useDinghy();
    const state = parseUrlState(
      '?boat=dinghy&js=70&mf=0&ap=wind&pl=marina&mode=realistic&gn=3&hw=s',
      'low',
    );
    expect(state.controls.ctl_jib_sheet).toBe(controlSpec('ctl_jib_sheet').default);
    expect(state.controls.ctl_main_furl).toBe(100);
    expect(state.autopilot.mode).toBe('off');
    expect(state.harbour.place).toBe('open');
    expect(state.settings.ropesMode).toBe('easy');
    expect(state.gennaker.stage).toBe(0);
    const link = serializeUrlState(state);
    expect(link).toContain('boat=dinghy');
    for (const key of ['js', 'mf', 'ap', 'apt', 'pl', 'gn', 'hw']) {
      expect(new URLSearchParams(link).has(key), key).toBe(false);
    }
    expect(link).not.toContain('mode=realistic');
    // A Helm link opens the Sailor view (M115); an exercise of the yacht opens without the exercise.
    expect(parseUrlState('?boat=dinghy&cam=helm', 'low').camera.preset).toBe('helm');
    expect(parseUrlState('?boat=dinghy&ex=points-of-sail', 'low').exercise).toBeNull();
  });

  it('7.8.6. the modes and the sections', () => {
    expect(modesForBoat(HANSE_508, 'hanse508')).toEqual([
      'learn',
      'easy',
      'realistic',
      'harbour',
      'exercise',
    ]);
    expect(modesForBoat(DINGHY.data, 'dinghy')).toEqual(['learn', 'easy']);
    useDinghy();
    const state = initialState();
    for (const id of ['engine', 'anchor', 'place', 'harbour', 'helm'] as const) {
      expect(sectionAvailable(id, state), id).toBe(false);
    }
    for (const id of ['autopilot', 'ropes'] as const) {
      expect(sectionAvailable(id, state), id).toBe(true);
    }
  });

  it('7.8.9. the exercises of each boat', () => {
    expect(exercisesForBoat('hanse508')).toHaveLength(22);
    expect(exercisesForBoat('dinghy')).toHaveLength(0);
  });

  it('Reset on the dinghy keeps the dinghy defaults and the hand steering', () => {
    useDinghy();
    const state = reduce(initialState(), { type: 'reset' });
    expect(state.dinghy).toEqual({
      sit: 'in',
      boardPct: 100,
      outhaulPct: 50,
      sailorSide: 1,
      capsize: { phase: 'upright', side: 1, t: 0 },
    });
    expect(state.autopilot.mode).toBe('off');
  });
});
