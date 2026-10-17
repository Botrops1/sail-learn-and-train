import { describe, expect, it } from 'vitest';
import { createStore, initialState, reduce, type AppState } from '../src/app/store';
import { jibReachedParam, parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import { clockParam, defaultClockUtcMs } from '../src/model/clock';
import { knToMps, mpsToKn } from '../src/model/angles';
import { steadyState } from '../src/model/motion';
import { waveTrains } from '../src/model/waves';
import { defaultControls, type Controls } from '../src/model/controls';
import {
  CAMERA_PRESETS,
  DEFAULT_CAMERA,
  DEFAULT_SETTINGS,
  defaultDetail,
} from '../src/model/settings';

/** The controls part of the default URL (M2: boom and wind; M3: jib; M4a: wheel). */
const DEFAULT_CONTROLS_QUERY = 'ms=30&js=30&vg=50&tl=100&mf=100&jf=100&rd=0&wd=60&ws=12';

/** M6: a sailing boat writes her speed; with the default controls she settles at 6.8 kn. */
const DEFAULT_BOAT_QUERY = 'bs=6.8';

/** M6: the boat in a state that is compared whole after a round trip (no speed to round). */
const HELD = { mode: 'held' } as const;

/** The default boat's speed as a link writes it (6.8 kn), so a round trip gives the same state. */
const AT_6_8_KN = { speedMps: knToMps(6.8) };

describe('URL state (PHASE1_SPEC 9.2)', () => {
  it('empty query gives the defaults', () => {
    const state = parseUrlState('');
    expect(state.camera).toEqual(DEFAULT_CAMERA);
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('reads cam, step and debug', () => {
    const state = parseUrlState('?v=1&cam=top&step=1&debug=1');
    expect(state.camera.preset).toBe('top');
    expect(state.settings.step).toBe(1);
    expect(state.settings.debug).toBe(true);
  });

  it('unknown or out-of-range values fall back to defaults silently', () => {
    const state = parseUrlState('?cam=underwater&step=3&debug=yes');
    expect(state.camera.preset).toBe(DEFAULT_CAMERA.preset);
    expect(state.settings.step).toBe(DEFAULT_SETTINGS.step);
    expect(state.settings.debug).toBe(DEFAULT_SETTINGS.debug);
    expect(parseUrlState('?step=5.0').settings.step).toBe(DEFAULT_SETTINGS.step);
    expect(parseUrlState('?step=').settings.step).toBe(DEFAULT_SETTINGS.step);
  });

  it('M23: reads lang for an available language; unknown values give English', () => {
    expect(parseUrlState('?lang=ru').settings.language).toBe('ru');
    expect(parseUrlState('?lang=xx').settings.language).toBe('en');
    expect(parseUrlState('?wd=90').settings.language).toBe('en');
  });

  it('M23: writes lang right after detail, and nothing for English', () => {
    const russian = parseUrlState('?lang=ru');
    expect(serializeUrlState(russian)).toContain('&detail=high&lang=ru&');
    expect(serializeUrlState(parseUrlState('?lang=en'))).not.toContain('lang=');
    expect(serializeUrlState(parseUrlState('?wd=90'))).not.toContain('lang=');
  });

  it('M23: reset keeps the language; a loaded link never changes it', () => {
    const russian = parseUrlState('?lang=ru&wd=90');
    expect(reduce(russian, { type: 'reset' }).settings.language).toBe('ru');
    const loaded = reduce(russian, { type: 'load', state: parseUrlState('?wd=30') });
    expect(loaded.settings.language).toBe('ru');
    expect(loaded.controls.ctl_wind_dir).toBe(30);
  });

  it('M3b: reads detail=high|low; without it, the fallback (the screen-size default) is used', () => {
    expect(parseUrlState('?detail=low').settings.detail).toBe('low');
    expect(parseUrlState('?detail=high', 'low').settings.detail).toBe('high');
    expect(parseUrlState('', 'low').settings.detail).toBe('low');
    expect(parseUrlState('?detail=ultra', 'low').settings.detail).toBe('low');
    expect(parseUrlState('').settings.detail).toBe('high');
    const low = {
      ...initialState(),
      settings: { ...initialState().settings, detail: 'low' as const },
    };
    expect(parseUrlState(serializeUrlState(low), 'high').settings.detail).toBe('low');
  });

  it('M3b: the default detail is low on phone screens and high on bigger ones', () => {
    expect(defaultDetail(390, 844)).toBe('low');
    expect(defaultDetail(844, 390)).toBe('low');
    expect(defaultDetail(820, 1000)).toBe('high');
    expect(defaultDetail(1440, 900)).toBe('high');
  });

  it('ignores parameters it does not know yet', () => {
    const state = parseUrlState('?zz=5&cam=bow');
    expect(state.camera.preset).toBe('bow');
    expect(state.controls).toEqual(defaultControls());
  });

  it('reads the M3 jib controls: js, jf', () => {
    const state = parseUrlState('?js=35&jf=80');
    expect(state.controls.ctl_jib_sheet).toBe(35);
    expect(state.controls.ctl_jib_furl).toBe(80);
    expect(parseUrlState('?js=101&jf=-5').controls).toEqual(defaultControls());
  });

  it('reads the M2 controls: ms, vg, tl, mf, wd, ws', () => {
    const state = parseUrlState('?ms=35&vg=0&tl=20&mf=55&wd=-90&ws=20');
    expect(state.controls.ctl_mainsheet).toBe(35);
    expect(state.controls.ctl_vang).toBe(0);
    expect(state.controls.ctl_topping_lift).toBe(20);
    expect(state.controls.ctl_main_furl).toBe(55);
    expect(state.controls.ctl_wind_dir).toBe(-90);
    expect(state.controls.ctl_wind_speed).toBe(20);
  });

  it('control values out of range or not whole numbers fall back to the defaults', () => {
    const defaults = defaultControls();
    const state = parseUrlState('?ms=101&vg=-1&tl=abc&mf=50.5&wd=181&ws=31');
    expect(state.controls).toEqual(defaults);
    expect(parseUrlState('?wd=-180').controls.ctl_wind_dir).toBe(180);
  });

  it('a link opens with the rig already settled for its controls', () => {
    const state = parseUrlState('?wd=90&ms=100&held=1');
    expect(state.rig.solution.thetaDeg).toBeCloseTo(-boat.rig.boom.maxSwingDeg, 6);
    expect(state.rig.theta.value).toBeCloseTo(-boat.rig.boom.maxSwingDeg, 6);
  });

  it('reads sel when it is a registered id, otherwise ignores it', () => {
    expect(parseUrlState('?sel=part_mast').selection).toBe('part_mast');
    expect(parseUrlState('?sel=part_made_up').selection).toBeNull();
    expect(parseUrlState('').selection).toBeNull();
  });

  it('cam=free is kept as the preset (the free position itself is not stored)', () => {
    expect(parseUrlState('?cam=free').camera).toEqual({ preset: 'free' });
    expect(serializeUrlState(initialState({ camera: { preset: 'free' }, sea: 'coastal' }))).toBe(
      `?v=1&${DEFAULT_CONTROLS_QUERY}&cam=free&step=5&detail=high&${DEFAULT_BOAT_QUERY}`,
    );
  });

  it('writes v=1 and readable parameters', () => {
    const c = DEFAULT_CONTROLS_QUERY;
    const b = DEFAULT_BOAT_QUERY;
    expect(serializeUrlState(initialState({ sea: 'coastal' }))).toBe(
      `?v=1&${c}&cam=side-port&step=5&detail=high&${b}`,
    );
    const withDebug = initialState({ settings: { step: 1, debug: true }, sea: 'coastal' });
    expect(serializeUrlState(withDebug)).toBe(
      `?v=1&${c}&cam=side-port&step=1&detail=high&${b}&debug=1`,
    );
    const withSelection = initialState({ selection: 'part_boom', sea: 'coastal' });
    expect(serializeUrlState(withSelection)).toBe(
      `?v=1&${c}&cam=side-port&sel=part_boom&step=5&detail=high&${b}`,
    );
  });

  it('round-trips the controls', () => {
    const state = initialState({
      controls: {
        ctl_mainsheet: 45,
        ctl_vang: 5,
        ctl_topping_lift: 0,
        ctl_main_furl: 35,
        ctl_wind_dir: -135,
        ctl_wind_speed: 0,
      },
      boat: HELD,
    });
    expect(parseUrlState(serializeUrlState(state))).toEqual(state);
  });

  it('round-trips every camera preset × step × debug × selection', () => {
    for (const preset of CAMERA_PRESETS) {
      for (const step of [1, 5] as const) {
        for (const debug of [false, true]) {
          for (const selection of [null, 'helm_port']) {
            const state = initialState({
              camera: { preset },
              settings: { step, debug },
              selection,
              boat: HELD,
            });
            expect(parseUrlState(serializeUrlState(state))).toEqual(state);
          }
        }
      }
    }
  });

  it('reads the wheel (M4a): rd = rudder angle in degrees, + = to starboard', () => {
    expect(parseUrlState('?rd=-20').controls.ctl_rudder).toBe(-20);
    expect(parseUrlState('?rd=35').controls.ctl_rudder).toBe(35);
    expect(parseUrlState('?rd=36').controls.ctl_rudder).toBe(0);
    expect(parseUrlState('?rd=2.5').controls.ctl_rudder).toBe(0);
  });

  it('round-trips every control, the wheel included', () => {
    const controls: Controls = {
      ctl_mainsheet: 45,
      ctl_jib_sheet: 85,
      ctl_vang: 5,
      ctl_topping_lift: 0,
      ctl_main_furl: 35,
      ctl_jib_furl: 70,
      ctl_rudder: -15,
      ctl_wind_dir: -135,
      ctl_wind_speed: 0,
    };
    const state = initialState({ controls, boat: HELD });
    const back = parseUrlState(serializeUrlState(state));
    expect(back.controls).toEqual(controls);
    expect(back).toEqual(state);
  });

  it('M38: an old link with lg (the rope colour legend, removed) opens the same picture and is not written again', () => {
    const plain = parseUrlState('');
    expect(parseUrlState('?lg=0')).toEqual(plain);
    expect(parseUrlState('?lg=1')).toEqual(plain);
    expect(serializeUrlState(parseUrlState('?lg=0'))).not.toContain('lg=');
  });

  it('Ropes-tab mode (mode) is read; an unknown one falls back to Easy', () => {
    expect(parseUrlState('?mode=easy').settings.ropesMode).toBe('easy');
    expect(parseUrlState('?mode=realistic').settings.ropesMode).toBe('realistic');
    // An unknown mode falls back to Easy.
    expect(parseUrlState('?mode=hard').settings.ropesMode).toBe('easy');
  });

  it('M5: labels in 3D (lb) are on by default (owner, PR #19) and written only when off', () => {
    expect(parseUrlState('').settings.labels).toBe(true);
    expect(parseUrlState('?lb=1').settings.labels).toBe(true);
    expect(parseUrlState('?lb=0').settings.labels).toBe(false);
    expect(parseUrlState('?lb=yes').settings.labels).toBe(true);
    const off = initialState({ settings: { labels: false }, boat: AT_6_8_KN, sea: 'coastal' });
    expect(serializeUrlState(off)).toBe(
      `?v=1&${DEFAULT_CONTROLS_QUERY}&cam=side-port&step=5&detail=high&lb=0&${DEFAULT_BOAT_QUERY}`,
    );
    expect(parseUrlState(serializeUrlState(off))).toEqual(off);
    expect(serializeUrlState(initialState())).not.toContain('lb=');
  });
});

/** Runs the app's frame step for `seconds` at 60 fps. */
function settle(store: ReturnType<typeof createStore>, seconds: number): AppState {
  for (let t = 0; t < seconds; t += 1 / 60) store.dispatch({ type: 'step', dt: 1 / 60 });
  return store.getState();
}

describe('URL state: the jib sheet hauled against a partly furled jib (M3 → M4a, jr)', () => {
  /** Jib furled to 40 % with the sheet released, then the sheet hauled to 30 %. */
  function hauledAgainstFurl(): AppState {
    const store = createStore(
      initialState({ controls: { ctl_jib_sheet: 100 }, boat: { mode: 'held' } }),
    );
    store.dispatch({ type: 'setControls', values: { ctl_jib_furl: 40 } });
    settle(store, 6);
    store.dispatch({ type: 'setControls', values: { ctl_jib_sheet: 30 } });
    return settle(store, 4);
  }

  it('the state itself: the jib stays at 40 % and the sheet fights the furling line', () => {
    const state = hauledAgainstFurl();
    expect(state.rig.jibSolution.unfurled).toBeCloseTo(0.4, 9);
    expect(state.rig.jibSolution.sheet.state).toBe('fighting');
    expect(state.rig.jibSolution.furlBlocked).toBe(false);
  });

  it('without jr the same controls give a different jib (the furl is blocked instead)', () => {
    const fresh = parseUrlState('?js=30&jf=40');
    expect(fresh.rig.jibSolution.furlBlocked).toBe(true);
    expect(fresh.rig.jibSolution.unfurled).toBeGreaterThan(0.5);
  });

  it('the link carries jr=40 and opens exactly the same state', () => {
    const state = hauledAgainstFurl();
    const query = serializeUrlState(state);
    expect(query).toContain('&jf=40&rd=0');
    expect(query).toContain('&jr=40&');
    const opened = parseUrlState(query);
    expect(opened.controls).toEqual(state.controls);
    expect(opened.rig.jibSolution.unfurled).toBeCloseTo(state.rig.jibSolution.unfurled, 9);
    expect(opened.rig.jibSolution.sheet).toEqual(state.rig.jibSolution.sheet);
    expect(opened.rig.jibSolution.phiDeg).toBeCloseTo(state.rig.jibSolution.phiDeg, 6);
    expect(opened.rig.jibSolution.furlBlocked).toBe(false);
    // And it stays there: the opened link is already settled.
    const store = createStore(opened);
    expect(settle(store, 3).rig.jibSolution.unfurled).toBeCloseTo(0.4, 9);
    expect(serializeUrlState(store.getState())).toBe(query);
  });

  it('jr is only written when it changes something', () => {
    expect(jibReachedParam(initialState())).toBeNull();
    expect(jibReachedParam(parseUrlState('?js=30&jf=40'))).toBeNull();
    expect(jibReachedParam(parseUrlState('?js=100&jf=40'))).toBeNull();
    expect(serializeUrlState(parseUrlState('?js=0&jf=0'))).not.toContain('jr=');
  });

  it('a jr below "Jib out" or out of range is ignored', () => {
    const blocked = parseUrlState('?js=30&jf=40');
    expect(parseUrlState('?js=30&jf=40&jr=20').rig).toEqual(blocked.rig);
    expect(parseUrlState('?js=30&jf=40&jr=101').rig).toEqual(blocked.rig);
    expect(parseUrlState('?js=30&jf=40&jr=4x').rig).toEqual(blocked.rig);
  });
});

describe('URL state: Realistic mode (M4b: st, co, wp, wsb)', () => {
  const realistic = (query: string) => parseUrlState(`?mode=realistic&${query}`).realistic;

  it('reads the station, the open clutches and the winch setup', () => {
    const r = realistic('st=starboard&co=a5,b3&wp=b5.3.t&wsb=a5.-2.h');
    expect(r.station).toBe('starboard');
    expect(r.open).toEqual({ a5: true, b3: true });
    expect(r.winches.winch_primary_port).toMatchObject({ tail: 'b5', turns: 3, selfTailer: true });
    expect(r.winches.winch_primary_starboard).toMatchObject({
      tail: 'a5',
      turns: -2,
      selfTailer: false,
    });
  });

  it('ignores what cannot be: unknown or static clutches, the wrong winch, too many turns', () => {
    const r = realistic('st=deck&co=a4,zz,b5&wp=a5.3.t&wsb=a1.9.h');
    expect(r.station).toBe('port');
    expect(r.open).toEqual({ b5: true });
    expect(r.winches.winch_primary_port?.tail).toBeNull();
    expect(r.winches.winch_primary_starboard?.tail).toBeNull();
    // No turns: the tail cannot be in the self-tailer.
    expect(realistic('wp=b5.0.t').winches.winch_primary_port?.selfTailer).toBe(false);
  });

  it('round-trips through the link, and a default state writes nothing extra', () => {
    const query = `?v=1&${DEFAULT_CONTROLS_QUERY}&cam=side-port&step=5&detail=high&mode=realistic&${DEFAULT_BOAT_QUERY}`;
    expect(serializeUrlState(parseUrlState(query))).toBe(query);
    const set = `${query}&st=starboard&co=a5,b3&wp=b5.3.t&wsb=a5.-2.h`;
    expect(serializeUrlState(parseUrlState(set))).toBe(set);
  });

  it('a rope running out is not stored: its clutch is written closed (the link opens held)', () => {
    const store = createStore(
      parseUrlState('?mode=realistic&wd=90&ws=20&js=30&st=starboard&co=a5,a2&wsb=a1.3.t'),
    );
    store.dispatch({ type: 'step', dt: 1 / 60 });
    const link = serializeUrlState(store.getState());
    expect(store.getState().realistic.reports.a5?.motion).toBe('running');
    expect(link).toContain('co=a2&');
    expect(link).not.toContain('a5,');
    expect(link).toContain('wsb=a1.3.t');
    expect(link).not.toContain('paused');
  });
});

describe('URL state: the boat (M6: hdg, bs, held, ap, apt)', () => {
  it('an old link opens with heading 0, the same wind picture, Sailing at her steady speed, autopilot holding 0', () => {
    const state = parseUrlState('?wd=90&ws=12&ms=40');
    expect(state.boat.mode).toBe('sailing');
    expect(state.boat.headingDeg).toBe(0);
    expect(state.controls.ctl_wind_dir).toBe(90);
    expect(state.autopilot).toEqual({ mode: 'heading', targetDeg: 0, integralDeg: 0 });
    // A link without `sea` opens in Coastal waves (M15): her steady speed includes their drag.
    const steady = steadyState(state.controls, 0, undefined, {
      heel: true,
      trains: waveTrains(state.sea),
    }).speedMps;
    expect(state.boat.speedMps).toBeCloseTo(steady, 9);
    expect(mpsToKn(steady)).toBeGreaterThan(5);
  });

  it('reads and writes the heading, only when it is not 0', () => {
    expect(parseUrlState('?hdg=315').boat.headingDeg).toBe(315);
    expect(parseUrlState('?hdg=360').boat.headingDeg).toBe(0);
    expect(parseUrlState('?hdg=-5').boat.headingDeg).toBe(0);
    expect(parseUrlState('?hdg=12.5').boat.headingDeg).toBe(0);
    expect(serializeUrlState(parseUrlState('?hdg=315'))).toContain('hdg=315');
    expect(serializeUrlState(parseUrlState('?hdg=0'))).not.toContain('hdg=');
  });

  it('reads and writes the speed in knots with one decimal, and falls back when out of range', () => {
    const state = parseUrlState('?bs=6.3');
    expect(mpsToKn(state.boat.speedMps)).toBeCloseTo(6.3, 9);
    expect(serializeUrlState(state)).toContain('bs=6.3');
    expect(mpsToKn(parseUrlState('?bs=-3.5').boat.speedMps)).toBeCloseTo(-3.5, 9);
    const steady = steadyState(defaultControls(), 0, undefined, {
      heel: true,
      trains: waveTrains(parseUrlState('?bs=16').sea),
    }).speedMps;
    expect(parseUrlState('?bs=16').boat.speedMps).toBeCloseTo(steady, 9);
    expect(parseUrlState('?bs=fast').boat.speedMps).toBeCloseTo(steady, 9);
    expect(serializeUrlState(parseUrlState('?bs=0'))).toContain('bs=0.0');
  });

  it('held=1 holds the boat still: no speed, and no bs in the link', () => {
    const state = parseUrlState('?wd=90&ws=12&held=1&bs=6');
    expect(state.boat.mode).toBe('held');
    expect(state.boat.speedMps).toBe(0);
    const link = serializeUrlState(state);
    expect(link).toContain('held=1');
    expect(link).not.toContain('bs=');
    expect(parseUrlState(link)).toEqual(state);
  });

  it('round-trips the autopilot: ap, and apt for a target that is not the heading', () => {
    expect(parseUrlState('?ap=off').autopilot.mode).toBe('off');
    expect(parseUrlState('?ap=hdg&apt=90')).toMatchObject({
      autopilot: { mode: 'heading', targetDeg: 90 },
    });
    expect(parseUrlState('?hdg=10&ap=hdg').autopilot.targetDeg).toBe(10);
    expect(parseUrlState('?ap=wind&apt=-45').autopilot).toEqual({
      mode: 'wind',
      targetDeg: -45,
      integralDeg: 0,
    });
    // Without a target, wind mode holds the angle the boat has now.
    expect(parseUrlState('?wd=90&ap=wind').autopilot.targetDeg).toBe(90);
    expect(parseUrlState('?ap=wind&apt=500').autopilot.targetDeg).toBe(60);
    expect(parseUrlState('?ap=banana').autopilot.mode).toBe('heading');

    for (const query of [
      '?wd=90&hdg=20&bs=7.0&ap=wind&apt=70',
      '?wd=90&hdg=20&bs=7.0&ap=hdg&apt=100',
      '?wd=90&hdg=20&bs=7.0&ap=off',
      '?wd=-120&hdg=300&bs=5.5&ap=wind&apt=-60',
    ]) {
      const state = parseUrlState(query);
      const link = serializeUrlState(state);
      const back = parseUrlState(link);
      expect(back.boat).toEqual(state.boat);
      expect(back.autopilot).toEqual(state.autopilot);
    }
  });

  it('writes ap only when the autopilot does not simply hold the heading', () => {
    const holding = serializeUrlState(parseUrlState('?hdg=40&ap=hdg&apt=40'));
    expect(holding).not.toContain('ap=');
    expect(holding).not.toContain('apt=');
    const turning = serializeUrlState(parseUrlState('?hdg=40&ap=hdg&apt=60'));
    expect(turning).toContain('ap=hdg&apt=60');
    const wind = serializeUrlState(parseUrlState('?wd=90&ap=wind'));
    expect(wind).toContain('ap=wind&apt=90');
    expect(serializeUrlState(parseUrlState('?ap=off'))).toContain('ap=off');
  });
});

describe('M14: the Waves setting (sea)', () => {
  it('round-trips every setting; Coastal writes no sea, Flat writes sea=flat', () => {
    for (const setting of ['flat', 'sheltered', 'coastal', 'open'] as const) {
      const state = initialState({ sea: setting, controls: { ctl_wind_dir: 60 } });
      expect(parseUrlState(serializeUrlState(state)).sea.setting).toBe(setting);
    }
    expect(serializeUrlState(initialState({ sea: 'coastal' }))).not.toContain('sea=');
    expect(serializeUrlState(initialState({ sea: 'flat' }))).toContain('&sea=flat');
    expect(serializeUrlState(initialState({ sea: 'open' }))).toContain('&sea=open');
  });

  it('links without sea, or with an unknown value, open Coastal', () => {
    expect(parseUrlState('?wd=60').sea.setting).toBe('coastal');
    expect(parseUrlState('?sea=storm').sea.setting).toBe('coastal');
    expect(parseUrlState('?wd=60&sea=open').sea.setting).toBe('open');
  });

  it('a link opens with waves that already match its wind', () => {
    const state = parseUrlState('?wd=90&ws=15');
    expect(state.sea.windKn).toBe(15);
    expect(state.sea.dirDeg).toBe(90);
  });

  it('sea is written after the wind-mode parameters and before the engine', () => {
    const query = serializeUrlState(
      initialState({ sea: 'flat', engine: { running: true }, boat: { speedMps: 3 } }),
    );
    expect(query.indexOf('&bs=')).toBeLessThan(query.indexOf('&sea=flat'));
    expect(query.indexOf('&sea=flat')).toBeLessThan(query.indexOf('&eng=1'));
  });
});

describe('M17: the clock (clk, clock)', () => {
  it('opens a link at the local time it names', () => {
    expect(parseUrlState('?clk=202612211200').clock.utcMs).toBe(Date.UTC(2026, 11, 21, 11, 0));
  });

  it('round-trips, and the default writes no clk', () => {
    const state = parseUrlState('?wd=60&clk=202612211200');
    expect(serializeUrlState(state)).toContain('&clk=202612211200');
    expect(parseUrlState(serializeUrlState(state)).clock.utcMs).toBe(state.clock.utcMs);
    expect(serializeUrlState(initialState())).not.toContain('clk=');
  });

  it('61 s after the default the link has clk=202606011201', () => {
    const state = { ...initialState(), clock: { utcMs: defaultClockUtcMs() + 61_000 } };
    expect(clockParam(state.clock.utcMs)).toBe('202606011201');
    expect(serializeUrlState(state)).toContain('&clk=202606011201');
  });

  it('clock=0 round-trips, and is written only when hidden', () => {
    const hidden = parseUrlState('?clock=0');
    expect(hidden.settings.clock).toBe(false);
    expect(serializeUrlState(hidden)).toContain('&clock=0');
    expect(serializeUrlState(initialState())).not.toContain('clock=');
    expect(parseUrlState('?clock=1').settings.clock).toBe(true);
  });

  it('M28: mm=0 hides the mini-map; it is written only when off, right after lb', () => {
    const off = parseUrlState('?mm=0', 'low');
    expect(off.settings.miniMap).toBe(false);
    expect(serializeUrlState(off)).toContain('&detail=low&mm=0');
    const both = parseUrlState('?mm=0&lb=0', 'low');
    expect(serializeUrlState(both)).toContain('&detail=low&lb=0&mm=0');
    const on = parseUrlState('?', 'low');
    expect(on.settings.miniMap).toBe(true);
    expect(serializeUrlState(on)).not.toContain('mm=');
    const one = parseUrlState('?mm=1', 'low');
    expect(one.settings.miniMap).toBe(true);
    expect(serializeUrlState(one)).not.toContain('mm=');
    expect(parseUrlState('?mm=yes').settings.miniMap).toBe(true);
    const store = createStore(off);
    store.dispatch({ type: 'reset' });
    expect(store.getState().settings.miniMap).toBe(true);
  });

  it('an invalid or missing clk opens the default (noon, 1 June)', () => {
    for (const link of ['?wd=60', '?clk=abc', '?clk=202602301200', '?clk=12']) {
      expect(parseUrlState(link).clock.utcMs, link).toBe(defaultClockUtcMs());
    }
  });

  it('the clock is written after the engine and before Realistic mode', () => {
    const query = serializeUrlState(parseUrlState('?eng=1&clk=202612211200&st=helm&co=a5'));
    expect(query.indexOf('&eng=1')).toBeLessThan(query.indexOf('&clk='));
    expect(query.indexOf('&clk=')).toBeLessThan(query.indexOf('&st='));
  });
});
