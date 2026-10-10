import { describe, expect, it } from 'vitest';
import { initialState, reduce, type Action, type AppState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import type { Controls } from '../src/model/controls';
import {
  initialRealistic,
  reduceRealistic,
  tailSpec,
  type RealisticAction,
  type StationId,
} from '../src/model/realistic';
import {
  gearboxLinePerTurnM,
  gearboxPowerRatio,
  handleForceN,
  handlePowerRatio,
  handleStalls,
  handleTurnsPerS,
  ropePerHandleTurnM,
} from '../src/model/winch';

/**
 * Realistic mode, part 2 (PHASE1_SPEC 7.2.2 "Strain and backups", milestone M4c): the strain
 * bar, the winch handle as a cockpit backup (PT-19), the Mast station with the furling gearbox,
 * and the slipping-furling-line scenario. The rules are not to be edited to match the code.
 */

const rm = boat.realisticMode;
const PORT = 'winch_primary_port';
const STBD = 'winch_primary_starboard';
const VANG = 'b5';
const OUTHAUL = 'b3';
const FURL_IN = 'a2';
const FURL_OUT = 'a3';
const GENOA = 'a5';
const MAX = rm.winchHandle.maxTurnsPerS;

function start(values: Partial<Controls>, station: StationId = 'port'): AppState {
  const state = initialState({ controls: values, settings: { ropesMode: 'realistic' } });
  return act(state, { type: 'station', station });
}

function act(state: AppState, ...actions: RealisticAction[]): AppState {
  return actions.reduce((s, action) => reduce(s, { type: 'realistic', action }), state);
}

function run(state: AppState, seconds: number, every?: (s: AppState) => AppState): AppState {
  let s = state;
  for (let t = 0; t < seconds; t += 1 / 60) {
    if (every) s = every(s);
    s = reduce(s, { type: 'step', dt: 1 / 60 } satisfies Action);
  }
  return s;
}

/** Puts a tail on its winch with `turns` clockwise turns, tail in the self-tailer. */
function tailed(state: AppState, key: string, turns: number): AppState {
  const winch = tailSpec(key)?.winchId ?? '';
  let s = act(state, { type: 'onWinch', key });
  for (let i = 0; i < turns; i += 1) s = act(s, { type: 'turn', winch, delta: 1 });
  return act(s, { type: 'selfTailer', winch, into: true });
}

/** The handle brought from where it starts (Port) to `station` and put in the socket there. */
function handleIn(state: AppState, station: StationId): AppState {
  return act(
    state,
    { type: 'station', station: 'port' },
    { type: 'handle', to: 'carry' },
    { type: 'station', station },
    { type: 'handle', to: 'socket' },
  );
}

describe('M4c data (hanse508.json → realisticMode)', () => {
  it('handle and gearbox values are sane; 2nd gear is the stronger one', () => {
    const h = rm.winchHandle;
    expect(h.powerRatioAnticlockwise).toBeGreaterThan(h.powerRatioClockwise);
    expect(h.stallForceN).toBeGreaterThan(0);
    expect(h.lengthM).toBeGreaterThan(0.1);
    expect(h.lengthM).toBeLessThan(0.4);
    expect(gearboxPowerRatio()).toBeGreaterThan(1);
    expect(rm.strain.warnFraction).toBeGreaterThan(0);
    expect(rm.strain.warnFraction).toBeLessThan(1);
    expect(rm.stations.some((s) => s.id === 'mast')).toBe(true);
  });

  it('the scenario link opens the slipping furling line: starboard, "in" tail on the winch, 1 turn', () => {
    const query = rm.scenarios.find((s) => s.id === 'furlLineSlips')?.query ?? '';
    const s = parseUrlState(query);
    expect(s.settings.ropesMode).toBe('realistic');
    expect(s.realistic.station).toBe('starboard');
    expect(s.realistic.winches[STBD]).toMatchObject({ tail: FURL_IN, turns: 1, selfTailer: true });
    expect(s.realistic.open).toEqual({ [FURL_OUT]: true, [OUTHAUL]: true });
    expect(s.realistic.handle).toMatchObject({ station: 'port', place: 'stowed' });
  });
});

describe('PT-19 two-speed winch handle', () => {
  it('PT-19 clockwise is 1st gear (13.8, fast and weak), anticlockwise 2nd gear (54, slow and strong)', () => {
    expect(handlePowerRatio(1)).toBe(13.8);
    expect(handlePowerRatio(-1)).toBe(54);
    // Rope per handle turn = 2π × handle length / ratio: about 0.12 m and 0.03 m.
    expect(ropePerHandleTurnM(13.8)).toBeCloseTo(0.116, 2);
    expect(ropePerHandleTurnM(54)).toBeCloseTo(0.0296, 3);
    // Force on the handle = load / ratio; 2nd gear needs about 4 times less.
    expect(handleForceN(2760, 13.8)).toBeCloseTo(200, 0);
    expect(handleForceN(2760, 54)).toBeCloseTo(51.1, 0);
    // Above about 250 N even the strong direction stalls (PHASE1_SPEC 7.2.2).
    expect(handleStalls(handleForceN(14_000, 54))).toBe(true);
    expect(handleStalls(handleForceN(3_000, 54))).toBe(false);
    expect(handleTurnsPerS(0)).toBe(MAX);
    expect(handleTurnsPerS(rm.winchHandle.stallForceN)).toBe(0);
  });

  it('PT-19 both directions turn the drum the same way (clockwise) and bring the rope in', () => {
    const base = handleIn(
      tailed(start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 60 }), VANG, 3),
      'port',
    );
    for (const direction of [1, -1]) {
      let s = act(base, { type: 'crank', turnsPerS: direction * MAX });
      const angle = s.realistic.winches[PORT]?.drumAngle ?? 0;
      s = run(s, 1);
      expect(s.controls.ctl_vang, `direction ${direction}`).toBeLessThan(60);
      expect(s.realistic.winches[PORT]?.drumSpeed, `direction ${direction}`).toBeGreaterThan(0);
      expect(s.realistic.winches[PORT]?.drumAngle ?? 0).toBeGreaterThan(angle);
      expect(s.realistic.handleReport?.gear).toBe(direction > 0 ? 1 : 2);
    }
  });

  it('PT-19 at a light load 1st gear (clockwise) is faster than 2nd', () => {
    const base = handleIn(
      tailed(start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 60 }), VANG, 3),
      'port',
    );
    const after = (direction: number) =>
      run(act(base, { type: 'crank', turnsPerS: direction * MAX }), 1).controls.ctl_vang;
    expect(60 - after(1)).toBeGreaterThan(2 * (60 - after(-1)));
  });

  it('PT-19 a heavily loaded jib sheet: clockwise struggles and stalls, anticlockwise brings it in slowly', () => {
    let base = start({ ctl_wind_dir: 90, ctl_wind_speed: 25, ctl_jib_sheet: 30 }, 'starboard');
    base = handleIn(tailed(base, GENOA, 4), 'starboard');
    const first = run(act(base, { type: 'crank', turnsPerS: MAX }), 1);
    expect(first.controls.ctl_jib_sheet).toBe(30);
    expect(first.realistic.handleReport?.note).toBe('stallFirst');
    expect(first.realistic.reports[GENOA]?.note).toBe('stallFirst');
    expect(first.realistic.winches[STBD]?.strain ?? 0).toBeGreaterThanOrEqual(1);
    const second = run(act(base, { type: 'crank', turnsPerS: -MAX }), 2);
    expect(second.controls.ctl_jib_sheet).toBeLessThan(30);
    expect(second.realistic.handleReport?.note).toBeNull();
    expect(second.realistic.reports[GENOA]?.motion).toBe('hauling');
    // Slowly: well under the electric winch's speed with no load.
    expect(second.realistic.handleReport?.speedMps ?? 1).toBeLessThan(0.1);
    expect(second.realistic.winches[STBD]?.strain ?? 0).toBeLessThan(rm.strain.warnFraction);
  });

  it('PT-19 against a fighting rope the handle does not turn in either gear', () => {
    let s = start({ ctl_wind_speed: 0, ctl_topping_lift: 0, ctl_vang: 0 });
    s = handleIn(tailed(s, VANG, 4), 'port');
    for (const direction of [1, -1]) {
      const x = run(act(s, { type: 'crank', turnsPerS: direction * MAX }), 1);
      expect(x.controls.ctl_vang).toBe(0);
      expect(x.realistic.handleReport?.note).toBe('stuckFighting');
    }
  });

  it('PT-19 the handle needs turns the right way and enough of them, like the motor', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 60 });
    s = handleIn(act(s, { type: 'onWinch', key: VANG }), 'port');
    s = run(act(s, { type: 'crank', turnsPerS: MAX }), 0.5);
    expect(s.realistic.handleReport?.note).toBe('noTurns');
    s = act(s, { type: 'turn', winch: PORT, delta: -1 });
    s = run(s, 0.5);
    expect(s.realistic.handleReport?.note).toBe('wrongWay');
    expect(s.controls.ctl_vang).toBe(60);
  });
});

describe('Strain bar (PHASE1_SPEC 7.2.2 Strain)', () => {
  it('shows the motor load against the cut-out while the button is held, and nothing otherwise', () => {
    let s = tailed(
      start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_jib_sheet: 30 }, 'starboard'),
      GENOA,
      3,
    );
    s = run(s, 0.1);
    expect(s.realistic.winches[STBD]?.strain).toBeNull();
    s = run(act(s, { type: 'button', winch: STBD, held: true }), 0.2);
    const strain = s.realistic.winches[STBD]?.strain ?? -1;
    expect(strain).toBeGreaterThan(0);
    expect(strain).toBeLessThan(rm.strain.warnFraction);
    s = run(act(s, { type: 'button', winch: STBD, held: false }), 0.1);
    expect(s.realistic.winches[STBD]?.strain).toBeNull();
  });

  it('near the limit the drum slows; at the limit it stops (cut out), the bar full', () => {
    let s = start({ ctl_wind_speed: 0, ctl_topping_lift: 0, ctl_vang: 0 });
    s = tailed(s, VANG, 4);
    s = run(act(s, { type: 'button', winch: PORT, held: true }), 0.5);
    expect(s.realistic.winches[PORT]?.cutOut).toBe(true);
    expect(s.realistic.winches[PORT]?.strain ?? 0).toBeGreaterThanOrEqual(1);
    expect(s.realistic.winches[PORT]?.drumSpeed ?? 1).toBeLessThan(0.01);
  });

  it('cranking: the bar is the handle force against what a person can push', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 }, 'starboard');
    s = handleIn(tailed(s, GENOA, 4), 'starboard');
    s = run(act(s, { type: 'crank', turnsPerS: MAX }), 0.2);
    const report = s.realistic.handleReport;
    expect(report?.at).toBe('winch');
    expect(s.realistic.winches[STBD]?.strain).toBeCloseTo(
      (report?.forceN ?? 0) / (report?.stallN ?? 1),
      6,
    );
    // About 2.8 kN on the jib sheet at 20 kn: about 200 N in 1st gear, near the limit.
    expect(s.realistic.winches[STBD]?.strain ?? 0).toBeGreaterThan(rm.strain.warnFraction);
  });
});

describe('The winch handle: one on board, at one station at a time', () => {
  it('starts at Port; it can only be taken where it is, and goes along when carried', () => {
    let s = start({}, 'starboard');
    expect(s.realistic.handle).toMatchObject({ station: 'port', place: 'stowed' });
    s = act(s, { type: 'handle', to: 'carry' });
    expect(s.realistic.notice).toEqual({ key: 'handleElsewhere', tail: null, station: 'port' });
    s = act(s, { type: 'station', station: 'port' }, { type: 'handle', to: 'carry' });
    s = act(s, { type: 'station', station: 'mast' });
    expect(s.realistic.handle).toMatchObject({ station: 'mast', place: 'carried' });
    s = act(s, { type: 'handle', to: 'stow' }, { type: 'station', station: 'helm' });
    expect(s.realistic.handle).toMatchObject({ station: 'mast', place: 'stowed' });
    s = act(s, { type: 'handle', to: 'socket' });
    expect(s.realistic.notice?.key).toBe('handleElsewhere');
  });

  it('it fits a winch or the gearbox, not the helm; cranking needs it in the socket here', () => {
    let s = act(start({}, 'port'), { type: 'handle', to: 'carry' });
    s = act(s, { type: 'crank', turnsPerS: 1 });
    expect(s.realistic.notice?.key).toBe('handleNotIn');
    expect(s.realistic.handle.crank).toBe(0);
    s = act(s, { type: 'station', station: 'helm' }, { type: 'handle', to: 'socket' });
    expect(s.realistic.notice?.key).toBe('noSocket');
    expect(s.realistic.handle.place).toBe('carried');
    s = act(s, { type: 'station', station: 'starboard' }, { type: 'handle', to: 'socket' });
    expect(s.realistic.handle).toMatchObject({ station: 'starboard', place: 'socket' });
    // Left in the starboard winch, it stays there when the user walks away.
    s = act(s, { type: 'station', station: 'port' }, { type: 'crank', turnsPerS: 1 });
    expect(s.realistic.notice?.key).toBe('handleElsewhere');
    expect(s.realistic.handle.station).toBe('starboard');
  });

  it('walking away stops the cranking; stopping always works', () => {
    let s = handleIn(
      tailed(start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 60 }), VANG, 3),
      'port',
    );
    s = run(act(s, { type: 'crank', turnsPerS: MAX }), 0.5);
    const vang = s.controls.ctl_vang;
    expect(vang).toBeLessThan(60);
    s = run(act(s, { type: 'station', station: 'starboard' }), 0.5);
    expect(s.realistic.handle.crank).toBe(0);
    expect(s.controls.ctl_vang).toBe(vang);
    expect(reduceRealistic(initialRealistic(), { type: 'crank', turnsPerS: 0 })).toEqual(
      initialRealistic(),
    );
  });

  it('Pause: cranking waits for Resume', () => {
    let s = handleIn(
      tailed(start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 60 }), VANG, 3),
      'port',
    );
    s = reduce(s, { type: 'setPaused', paused: true });
    s = run(act(s, { type: 'crank', turnsPerS: MAX }), 1);
    expect(s.controls.ctl_vang).toBe(60);
    s = run(reduce(s, { type: 'setPaused', paused: false }), 0.5);
    expect(s.controls.ctl_vang).toBeLessThan(60);
  });
});

describe('Mast station: the furling gearbox and the slipping furling line', () => {
  it('a loaded main makes the "in" furling line slip with 1 turn; 2 turns hold; a luffing main adds nothing', () => {
    const furl = (turns: number, windDir: number) => {
      let s = start(
        { ctl_wind_dir: windDir, ctl_wind_speed: 20, ctl_mainsheet: 30, ctl_main_furl: 100 },
        'starboard',
      );
      s = act(s, { type: 'clutch', key: FURL_OUT, open: true });
      s = act(
        s,
        { type: 'station', station: 'port' },
        { type: 'clutch', key: OUTHAUL, open: true },
      );
      s = tailed(act(s, { type: 'station', station: 'starboard' }), FURL_IN, turns);
      return run(act(s, { type: 'button', winch: STBD, held: true }), 2);
    };
    const one = furl(1, 60);
    expect(one.realistic.reports[FURL_IN]?.note).toBe('slipping');
    expect(one.controls.ctl_main_furl).toBe(100);
    const two = furl(2, 60);
    expect(two.controls.ctl_main_furl).toBeLessThan(95);
    // Head to wind the main luffs: nothing pulls, 1 turn is enough.
    const luffing = furl(1, 0);
    expect(luffing.controls.ctl_main_furl).toBeLessThan(95);
  });

  it('the scenario: slipping at the winch, fixed at the mast (switch IN, handle in, crank)', () => {
    const query = rm.scenarios.find((s) => s.id === 'furlLineSlips')?.query ?? '';
    let s = parseUrlState(query);
    s = run(act(s, { type: 'button', winch: STBD, held: true }), 1);
    expect(s.realistic.reports[FURL_IN]?.note).toBe('slipping');
    expect(s.controls.ctl_main_furl).toBe(100);
    s = act(s, { type: 'button', winch: STBD, held: false });
    // The switch is only at the mast.
    s = act(s, { type: 'gearbox', to: 'in' });
    expect(s.realistic.notice).toMatchObject({ key: 'gearboxNotHere', station: 'mast' });
    s = handleIn(s, 'mast');
    expect(s.realistic.handle).toMatchObject({ station: 'mast', place: 'socket' });
    // Switch still on OUT: the main is already fully out.
    s = run(act(s, { type: 'crank', turnsPerS: MAX }), 0.5);
    expect(s.realistic.handleReport?.note).toBe('gearboxOut');
    expect(s.controls.ctl_main_furl).toBe(100);
    s = act(s, { type: 'gearbox', to: 'in' }, { type: 'crank', turnsPerS: MAX });
    s = run(s, 5);
    expect(s.realistic.handleReport?.note).toBeNull();
    expect(s.realistic.handleReport?.at).toBe('gearbox');
    expect(s.controls.ctl_main_furl).toBeLessThan(95);
    // The "in" tail comes in through its closed clutch; nothing is reported running.
    expect(Object.values(s.realistic.reports).some((r) => r.motion === 'running')).toBe(false);
  });

  it('the main rolls in only while the "out" tail and the outhaul run free', () => {
    let s = start({ ctl_wind_dir: 60, ctl_wind_speed: 12, ctl_main_furl: 100 }, 'mast');
    s = handleIn(s, 'mast');
    s = act(s, { type: 'gearbox', to: 'in' }, { type: 'crank', turnsPerS: MAX });
    s = run(s, 1);
    expect(s.controls.ctl_main_furl).toBe(100);
    expect(s.realistic.handleReport?.note).toBe('stuckBlocked');
    expect([...(s.realistic.handleReport?.blockers ?? [])].sort()).toEqual(
      [FURL_OUT, OUTHAUL].sort(),
    );
    expect(s.realistic.handleReport?.forceN).toBe(rm.winchHandle.stallForceN);
  });

  it('switch OUT rolls the main out, with the "in" tail free; fully in stops with a note', () => {
    let s = start({ ctl_wind_dir: 60, ctl_wind_speed: 0, ctl_main_furl: 0 }, 'starboard');
    s = act(s, { type: 'clutch', key: FURL_IN, open: true });
    s = handleIn(s, 'mast');
    s = act(s, { type: 'gearbox', to: 'in' }, { type: 'crank', turnsPerS: MAX });
    s = run(s, 0.5);
    expect(s.realistic.handleReport?.note).toBe('gearboxIn');
    s = act(s, { type: 'gearbox', to: 'out' });
    s = run(s, 3);
    expect(s.controls.ctl_main_furl).toBeGreaterThan(3);
    expect(s.realistic.handleReport?.note).toBeNull();
  });
});

describe('URL state: the handle and the gearbox (M4c: hd, gb)', () => {
  const realistic = (query: string) => parseUrlState(`?mode=realistic&${query}`).realistic;

  it('reads where the handle is and the switch; ignores what cannot be', () => {
    expect(realistic('hd=mast.w&gb=in')).toMatchObject({
      handle: { station: 'mast', place: 'socket' },
      gearbox: 'in',
    });
    expect(realistic('st=starboard&hd=c').handle).toMatchObject({
      station: 'starboard',
      place: 'carried',
    });
    expect(realistic('hd=helm.w').handle).toMatchObject({ station: 'port', place: 'stowed' });
    expect(realistic('hd=deck.s&gb=sideways')).toMatchObject({
      handle: { station: 'port', place: 'stowed' },
      gearbox: 'out',
    });
  });

  it('round-trips, writes nothing at the start, and does not store cranking', () => {
    const base = parseUrlState('?mode=realistic');
    expect(serializeUrlState(base)).not.toMatch(/hd=|gb=/);
    const link = serializeUrlState(parseUrlState('?mode=realistic&st=mast&hd=starboard.w&gb=in'));
    expect(link).toContain('&st=mast&hd=starboard.w&gb=in');
    let s = handleIn(start({ ctl_wind_dir: 90, ctl_wind_speed: 12 }), 'port');
    s = act(s, { type: 'crank', turnsPerS: MAX });
    expect(serializeUrlState(s)).toContain('hd=port.w');
    expect(parseUrlState(serializeUrlState(s)).realistic.handle.crank).toBe(0);
  });
});

describe('Owner answers after M4c', () => {
  it('the handle starts at Port; clockwise is 1st gear', () => {
    expect(initialRealistic().handle).toMatchObject({ station: 'port', place: 'stowed' });
    expect(handlePowerRatio(1)).toBeLessThan(handlePowerRatio(-1));
  });

  it('about 40 handle turns roll the main from fully out to fully in (data: handleTurnsFullFurl)', () => {
    expect(rm.mastGearbox.handleTurnsFullFurl).toBe(40);
    expect(gearboxLinePerTurnM() * rm.mastGearbox.handleTurnsFullFurl).toBeCloseTo(
      boat.rig.mainFurlingGearbox.lineTravelM,
      9,
    );
    // Head to wind only the furling line's own small load is on the handle (about 25 N): it
    // turns at nearly full speed, and every 1 % of "Mainsail out" is 0.4 turns.
    let s = start({ ctl_wind_dir: 0, ctl_wind_speed: 12, ctl_main_furl: 100 }, 'starboard');
    s = act(s, { type: 'clutch', key: FURL_OUT, open: true });
    s = act(s, { type: 'station', station: 'port' }, { type: 'clutch', key: OUTHAUL, open: true });
    s = handleIn(s, 'mast');
    s = act(s, { type: 'gearbox', to: 'in' }, { type: 'crank', turnsPerS: MAX });
    const seconds = 10;
    s = run(s, seconds);
    const turns = (100 - s.controls.ctl_main_furl) * (rm.mastGearbox.handleTurnsFullFurl / 100);
    expect(turns).toBeGreaterThan(0.85 * MAX * seconds);
    expect(turns).toBeLessThan(1.05 * MAX * seconds);
  });

  it('a different turn count in the data changes the gearbox (it is not fixed in the code)', () => {
    const data = structuredClone(boat);
    data.realisticMode.mastGearbox.handleTurnsFullFurl = 80;
    expect(gearboxLinePerTurnM(data)).toBeCloseTo(gearboxLinePerTurnM() / 2, 9);
    expect(gearboxPowerRatio(data)).toBeCloseTo(gearboxPowerRatio() * 2, 9);
  });
});

describe('M4b review leftovers', () => {
  it('the self-tailer grips at least as well as a hand on the tail', () => {
    expect(rm.capstan.selfTailerGripN).toBeGreaterThanOrEqual(rm.capstan.handTailForceN);
  });

  it('a rope wrapped the wrong way does not go into the self-tailer, from a gesture or a link', () => {
    let s = act(start({}, 'port'), { type: 'onWinch', key: VANG });
    s = act(
      s,
      { type: 'turn', winch: PORT, delta: -1 },
      { type: 'selfTailer', winch: PORT, into: true },
    );
    expect(s.realistic.winches[PORT]?.selfTailer).toBe(false);
    expect(s.realistic.notice).toEqual({ key: 'wrongWayJaw', tail: VANG });
    // In the jaw with one turn, taking it off and wrapping it the wrong way lets it out.
    s = act(
      s,
      { type: 'turn', winch: PORT, delta: 1 },
      { type: 'turn', winch: PORT, delta: 1 },
      { type: 'selfTailer', winch: PORT, into: true },
    );
    expect(s.realistic.winches[PORT]?.selfTailer).toBe(true);
    s = act(s, { type: 'turn', winch: PORT, delta: -1 }, { type: 'turn', winch: PORT, delta: -1 });
    expect(s.realistic.winches[PORT]?.selfTailer).toBe(false);
    expect(parseUrlState('?mode=realistic&wsb=a5.-3.t').realistic.winches[STBD]?.selfTailer).toBe(
      false,
    );
  });

  it('shutting a clutch on a running loaded rope stops it, with a warning', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 }, 'starboard');
    s = run(act(s, { type: 'clutch', key: GENOA, open: true }), 0.05);
    expect(s.realistic.reports[GENOA]?.motion).toBe('running');
    s = act(s, { type: 'clutch', key: GENOA, open: false });
    expect(s.realistic.notice).toEqual({ key: 'closedOnRunning', tail: GENOA });
    const held = s.controls.ctl_jib_sheet;
    s = run(s, 0.5);
    expect(s.controls.ctl_jib_sheet).toBe(held);
    // While paused nothing runs yet: no warning.
    let paused = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 }, 'starboard');
    paused = reduce(paused, { type: 'setPaused', paused: true });
    paused = run(act(paused, { type: 'clutch', key: GENOA, open: true }), 0.05);
    paused = act(paused, { type: 'clutch', key: GENOA, open: false });
    expect(paused.realistic.notice).toBeNull();
    // Shutting a clutch on a rope that is not running gives no warning.
    s = act(
      s,
      { type: 'clutch', key: GENOA, open: true },
      { type: 'clutch', key: GENOA, open: false },
    );
    expect(s.realistic.notice).toBeNull();
  });
});
