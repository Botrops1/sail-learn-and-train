import { describe, expect, it } from 'vitest';
import { initialState, reduce, type Action, type AppState } from '../src/app/store';
import { boat } from '../src/model/boat';
import type { Controls } from '../src/model/controls';
import {
  initialRealistic,
  reduceRealistic,
  tailSpec,
  tailSpecs,
  type RealisticAction,
  type StationId,
} from '../src/model/realistic';
import {
  capstanFactor,
  easesSmoothly,
  holdingForceN,
  motorCutOut,
  runningSpeedMps,
  sheetLoadAtSailN,
  winchSpeedMps,
} from '../src/model/winch';

/**
 * Realistic mode (PHASE1_SPEC 7.2.2, M4b): rules PT-15 … PT-19a from docs/PHYSICS_TRUTHS.md,
 * each test named after its rule id, plus the station, pause and furling rules of the spec.
 * The rules are not to be edited to match the code.
 */

const rm = boat.realisticMode;
const PORT = 'winch_primary_port';
const STBD = 'winch_primary_starboard';
/** Clutch keys (bank key + slot): Vang, Boom lift, Main outhaul, MAIN SHEET (port end). */
const VANG = 'b5';
const LIFT = 'b2';
const OUTHAUL = 'b3';
const MAIN_PORT = 'b4';
/** Bank A: Main sheet (starboard end), Main furling in / out, Genoa sheet. */
const MAIN_STBD = 'a1';
const FURL_IN = 'a2';
const FURL_OUT = 'a3';
const GENOA = 'a5';
const JIB_ROLL = 'r1';

/** A Realistic-mode app state for a link with these controls. */
function start(values: Partial<Controls>, station: StationId = 'port'): AppState {
  const state = initialState({ controls: values, settings: { ropesMode: 'realistic' } });
  return act(state, { type: 'station', station });
}

function act(state: AppState, ...actions: RealisticAction[]): AppState {
  return actions.reduce((s, action) => reduce(s, { type: 'realistic', action }), state);
}

/** Runs the store's frame step at 60 fps for `seconds`. */
function run(state: AppState, seconds: number, every?: (s: AppState) => AppState): AppState {
  let s = state;
  for (let t = 0; t < seconds; t += 1 / 60) {
    if (every) s = every(s);
    s = reduce(s, { type: 'step', dt: 1 / 60 } satisfies Action);
  }
  return s;
}

/** Puts a tail on its winch with `turns` turns (negative: anticlockwise), tail in the hand. */
function onWinch(state: AppState, key: string, turns: number): AppState {
  const winch = tailSpec(key)?.winchId ?? '';
  let s = act(state, { type: 'onWinch', key });
  for (let i = 0; i < Math.abs(turns); i += 1) {
    s = act(s, { type: 'turn', winch, delta: turns > 0 ? 1 : -1 });
  }
  return s;
}

describe('Realistic mode data (hanse508.json → realisticMode, cockpitHardware)', () => {
  it('every clutch has a key, a station and its side’s winch (owner: each side on its own winch)', () => {
    const specs = tailSpecs();
    expect(specs.map((s) => s.key)).toEqual([
      'a1',
      'a2',
      'a3',
      'a4',
      'a5',
      'b1',
      'b2',
      'b3',
      'b4',
      'b5',
      'r1',
    ]);
    for (const spec of specs) {
      const side = spec.station === 'port' ? PORT : STBD;
      expect(spec.winchId, spec.key).toBe(side);
    }
    expect(tailSpec(JIB_ROLL)?.station).toBe('port');
    expect(tailSpec(GENOA)?.station).toBe('starboard');
  });

  it('halyards are static; every other clutch moves its control with rope at a known rate', () => {
    for (const spec of tailSpecs()) {
      if (spec.ropeId.endsWith('halyard')) {
        expect(spec.controlId, spec.key).toBeNull();
        continue;
      }
      expect(spec.controlId, spec.key).not.toBeNull();
      expect(spec.metresPerPct, spec.key).toBeGreaterThan(0);
    }
    // The furl tails and the outhaul work against each other (PT-12).
    expect(tailSpec(FURL_IN)?.payOutSign).toBe(1);
    expect(tailSpec(FURL_OUT)?.payOutSign).toBe(-1);
    expect(tailSpec(OUTHAUL)?.payOutSign).toBe(-1);
  });

  it('values are sane: cut-out below the fighting load, restart below the cut-out', () => {
    const w = rm.electricWinch;
    expect(rm.loads.fightingN).toBeGreaterThan(w.cutOutLoadN);
    expect(w.restartBelowFraction).toBeGreaterThan(0);
    expect(w.restartBelowFraction).toBeLessThan(1);
    expect(w.slowestFraction).toBeGreaterThan(0);
    expect(w.slowestFraction).toBeLessThan(1);
    expect(rm.capstan.maxTurns).toBe(5);
  });

  it('the sheet-load rule gives the spec’s example: jib 51.5 m² at 20 kn ≈ 5.6 kN', () => {
    expect(sheetLoadAtSailN(51.5, 20) / 1000).toBeCloseTo(5.6, 1);
  });
});

describe('PT-15 closed clutch', () => {
  it('PT-15 a closed clutch holds a loaded rope: nothing runs, easing says "open the clutch"', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 }, 'starboard');
    s = run(s, 1);
    expect(s.controls.ctl_jib_sheet).toBe(30);
    s = act(s, { type: 'ease', key: GENOA, metres: 0.5 });
    expect(s.realistic.notice?.key).toBe('clutchClosed');
    s = run(s, 1);
    expect(s.controls.ctl_jib_sheet).toBe(30);
  });

  it('PT-15 the winch pulls a rope in through a closed clutch, never out', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 50 });
    s = onWinch(s, VANG, 3);
    s = act(
      s,
      { type: 'selfTailer', winch: PORT, into: true },
      { type: 'button', winch: PORT, held: true },
    );
    s = run(s, 0.5);
    expect(s.controls.ctl_vang).toBeLessThan(45);
    expect(s.realistic.open[VANG]).toBeUndefined();
    // Easing through the closed clutch is refused.
    s = act(
      s,
      { type: 'button', winch: PORT, held: false },
      { type: 'selfTailer', winch: PORT, into: false },
    );
    const before = s.controls.ctl_vang;
    s = act(s, { type: 'ease', key: VANG, metres: 1 });
    expect(s.realistic.notice?.key).toBe('clutchClosed');
    s = run(s, 1);
    expect(s.controls.ctl_vang).toBe(before);
  });
});

describe('PT-16 turns on the winch', () => {
  it('PT-16 each turn multiplies the hold by about 3.5 (μ = 0.2): 3.5, 12, 43, 150, 530', () => {
    const factors = [1, 2, 3, 4, 5].map((n) => capstanFactor(n));
    [3.5, 12.3, 43.4, 152, 535].forEach((expected, i) => {
      expect(factors[i] ?? 0).toBeCloseTo(expected, expected < 100 ? 0 : -1);
    });
    for (let n = 1; n < 5; n += 1) {
      expect(capstanFactor(n + 1) / capstanFactor(n)).toBeCloseTo(3.51, 1);
    }
    expect(holdingForceN(3, 'hand')).toBeGreaterThan(holdingForceN(3, 'selfTailer'));
  });

  it('PT-16 jib sheet at 20 kn, tail in hand: 2 turns slip when the clutch opens, 3 turns hold', () => {
    const base = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 }, 'starboard');
    const two = run(act(onWinch(base, GENOA, 2), { type: 'clutch', key: GENOA, open: true }), 0.1);
    expect(two.controls.ctl_jib_sheet).toBeGreaterThan(35);
    expect(two.realistic.reports[GENOA]?.note).toBe('slipping');
    const three = run(act(onWinch(base, GENOA, 3), { type: 'clutch', key: GENOA, open: true }), 1);
    expect(three.controls.ctl_jib_sheet).toBe(30);
    expect(three.realistic.reports[GENOA]?.motion).toBe('held');
  });

  it('PT-16 at 12 kn, 2 turns ease smoothly by hand; 4 turns ease in jerks ("take a turn off")', () => {
    const base = start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_jib_sheet: 30 }, 'starboard');
    const easeFor = (turns: number) => {
      let s = act(onWinch(base, GENOA, turns), { type: 'clutch', key: GENOA, open: true });
      s = run(s, 0.1);
      expect(s.controls.ctl_jib_sheet, `${turns} turns hold`).toBe(30);
      const values: number[] = [];
      s = run(s, 1.2, (x) => {
        values.push(x.controls.ctl_jib_sheet);
        return act(x, { type: 'ease', key: GENOA, metres: 0.02 });
      });
      return { s, values };
    };
    const smooth = easeFor(2);
    expect(smooth.s.controls.ctl_jib_sheet).toBeGreaterThan(40);
    expect(smooth.s.realistic.reports[GENOA]?.note).toBeNull();
    // Smooth: the sheet moves on every frame once it has started.
    const stalls = smooth.values.slice(2).filter((v, i) => v === smooth.values[i + 1]).length;
    expect(stalls).toBe(0);

    const jerky = easeFor(4);
    expect(jerky.s.controls.ctl_jib_sheet).toBeGreaterThan(30);
    expect(jerky.s.realistic.reports[GENOA]?.note).toBe('grabby');
    const still = jerky.values.slice(1).filter((v, i) => v === jerky.values[i]).length;
    expect(still).toBeGreaterThan(10);
    expect(easesSmoothly(1000, 2)).toBe(true);
    expect(easesSmoothly(1000, 4)).toBe(false);
  });
});

describe('PT-17 winches turn one way', () => {
  it('PT-17 a rope wrapped anticlockwise is not held: it runs out ("wrapped the wrong way")', () => {
    const base = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 }, 'starboard');
    let s = onWinch(base, GENOA, -3);
    expect(s.realistic.winches[STBD]?.turns).toBe(-3);
    expect(capstanFactor(-3)).toBe(1);
    s = run(act(s, { type: 'clutch', key: GENOA, open: true }), 0.1);
    expect(s.controls.ctl_jib_sheet).toBeGreaterThan(35);
    expect(s.realistic.reports[GENOA]?.note).toBe('wrongWay');
    // The same turns clockwise hold it.
    const right = run(act(onWinch(base, GENOA, 3), { type: 'clutch', key: GENOA, open: true }), 1);
    expect(right.controls.ctl_jib_sheet).toBe(30);
  });

  it('PT-17 the winch button cannot haul a rope wrapped the wrong way', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 50 });
    s = act(onWinch(s, VANG, -3), { type: 'button', winch: PORT, held: true });
    s = run(s, 1);
    expect(s.controls.ctl_vang).toBe(50);
    expect(s.realistic.reports[VANG]?.note).toBe('wrongWay');
  });
});

describe('PT-18 opening a loaded clutch with the rope off the winch', () => {
  it('PT-18 at 20 kn the jib sheet runs out fast; at 4 kn it barely moves', () => {
    const open = (speed: number) =>
      run(
        act(start({ ctl_wind_dir: 90, ctl_wind_speed: speed, ctl_jib_sheet: 30 }, 'starboard'), {
          type: 'clutch',
          key: GENOA,
          open: true,
        }),
        1,
      );
    const strong = open(20);
    expect(strong.controls.ctl_jib_sheet).toBeGreaterThan(90);
    const light = open(4);
    expect(light.controls.ctl_jib_sheet - 30).toBeLessThan(2);
    expect(runningSpeedMps(3000, 0)).toBeGreaterThan(10 * runningSpeedMps(150, 0));
  });

  it('PT-18 the main sheet runs and the boom flies out in about a second, then the rope stops', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_mainsheet: 30 }, 'starboard');
    const before = Math.abs(s.rig.solution.thetaDeg);
    s = act(s, { type: 'clutch', key: MAIN_STBD, open: true });
    s = run(s, 1.5);
    expect(Math.abs(s.rig.solution.thetaDeg)).toBeGreaterThan(before + 25);
    expect(s.realistic.reports[MAIN_STBD]?.motion).not.toBe('running');
    // The other end, held by its closed clutch, does not change that: one rope, two ends.
    expect(s.realistic.open[MAIN_PORT]).toBeUndefined();
  });

  it('PT-18 a slack rope does not run: head to wind, opening the main sheet clutch moves nothing', () => {
    let s = start({ ctl_wind_dir: 0, ctl_wind_speed: 12, ctl_mainsheet: 30 }, 'starboard');
    s = run(act(s, { type: 'clutch', key: MAIN_STBD, open: true }), 1);
    expect(s.controls.ctl_mainsheet).toBe(30);
  });
});

describe('PT-19a electric winch', () => {
  it('PT-19a the drum slows as the load grows and stops above the safe load', () => {
    const w = rm.electricWinch;
    const speeds = [0, 1000, 3000, 5000, w.cutOutLoadN - 1].map((load) =>
      winchSpeedMps(load, false),
    );
    for (let i = 1; i < speeds.length; i += 1) {
      expect(speeds[i] ?? 0).toBeLessThan(speeds[i - 1] ?? 0);
    }
    expect(speeds[0]).toBeCloseTo(w.noLoadSpeedMps, 6);
    expect(winchSpeedMps(w.cutOutLoadN + 1, false)).toBe(0);
  });

  it('PT-19a it cuts out above the safe load and restarts only when the load has dropped', () => {
    const cut = rm.electricWinch.cutOutLoadN;
    expect(motorCutOut(cut + 1, false)).toBe(true);
    expect(motorCutOut(cut - 1, false)).toBe(false);
    // Once off, it stays off just below the cut-out, and restarts clearly below it.
    expect(motorCutOut(cut - 1, true)).toBe(true);
    expect(motorCutOut(cut * 0.5, true)).toBe(false);
  });

  it('PT-19a winching against a fighting rope goes straight to the cut-out (vang vs topping lift)', () => {
    let s = start({ ctl_wind_speed: 0, ctl_topping_lift: 0, ctl_vang: 0 });
    expect(s.rig.solution.vang.state).toBe('fighting');
    s = onWinch(s, VANG, 4);
    s = act(
      s,
      { type: 'selfTailer', winch: PORT, into: true },
      { type: 'button', winch: PORT, held: true },
    );
    s = run(s, 1);
    expect(s.realistic.winches[PORT]?.cutOut).toBe(true);
    expect(s.realistic.reports[VANG]?.note).toBe('cutOutFighting');
    expect(s.controls.ctl_vang).toBe(0);
    // Letting go of the button resets it.
    s = act(s, { type: 'button', winch: PORT, held: false });
    expect(s.realistic.winches[PORT]?.cutOut).toBe(false);
  });

  it('PT-19a hauling a light rope works, and stops at the end with the cut-out ("fully hauled")', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 30 });
    s = onWinch(s, VANG, 3);
    s = act(
      s,
      { type: 'selfTailer', winch: PORT, into: true },
      { type: 'button', winch: PORT, held: true },
    );
    s = run(s, 3);
    expect(s.controls.ctl_vang).toBe(0);
    expect(s.realistic.winches[PORT]?.cutOut).toBe(true);
    expect(s.realistic.reports[VANG]?.note).toBe('cutOutEnd');
  });
});

describe('Realistic mode: stations, setup, pause (PHASE1_SPEC 7.2.2)', () => {
  it('one station at a time: clutches and winches elsewhere cannot be worked', () => {
    let s = start({}, 'port');
    s = act(s, { type: 'clutch', key: GENOA, open: true });
    expect(s.realistic.open[GENOA]).toBeUndefined();
    expect(s.realistic.notice?.key).toBe('notHere');
    s = act(s, { type: 'onWinch', key: GENOA });
    expect(s.realistic.winches[STBD]?.tail).toBeNull();
    s = act(
      s,
      { type: 'station', station: 'starboard' },
      { type: 'clutch', key: GENOA, open: true },
    );
    expect(s.realistic.open[GENOA]).toBe(true);
  });

  it('ropes elsewhere keep their state: a running rope keeps running after switching away', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 }, 'starboard');
    s = act(s, { type: 'clutch', key: GENOA, open: true }, { type: 'station', station: 'port' });
    s = run(s, 0.5);
    expect(s.controls.ctl_jib_sheet).toBeGreaterThan(60);
  });

  it('walking to another station lets go of the winch button there: that winch stops', () => {
    let s = onWinch(start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_vang: 50 }, 'port'), VANG, 4);
    s = act(
      s,
      { type: 'selfTailer', winch: PORT, into: true },
      { type: 'button', winch: PORT, held: true },
    );
    s = run(s, 0.5);
    const vang = s.controls.ctl_vang;
    expect(vang).toBeLessThan(50);
    s = act(s, { type: 'station', station: 'starboard' });
    expect(s.realistic.winches[PORT]?.button).toBe(false);
    s = run(s, 1);
    expect(s.controls.ctl_vang).toBe(vang);
    // The finger lifted later (the release sent for the Port winch from Starboard) is harmless.
    s = act(s, { type: 'button', winch: PORT, held: false });
    expect(s.realistic.notice).toBeNull();
  });

  it('letting go of a winch button works from any station; pressing one does not', () => {
    // Port winch held down, user at Starboard (a state only an older version could reach).
    const atPort = [
      { type: 'onWinch', key: VANG },
      { type: 'turn', winch: PORT, delta: 1 },
      { type: 'button', winch: PORT, held: true },
    ] satisfies RealisticAction[];
    const held = {
      ...atPort.reduce((r, action) => reduceRealistic(r, action), initialRealistic()),
      station: 'starboard' as const,
    };
    expect(held.winches[PORT]?.button).toBe(true);
    expect(
      reduceRealistic(held, { type: 'button', winch: PORT, held: false }).winches[PORT]?.button,
    ).toBe(false);
    const idle = { ...initialRealistic(), station: 'starboard' as const };
    const pressed = reduceRealistic(idle, { type: 'button', winch: PORT, held: true });
    expect(pressed.winches[PORT]?.button).toBe(false);
    expect(pressed.notice?.key).toBe('notHere');
  });

  it('walking away also stops a hand easing a rope at the old station', () => {
    let s = onWinch(
      start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_jib_sheet: 30 }, 'starboard'),
      GENOA,
      2,
    );
    s = act(s, { type: 'clutch', key: GENOA, open: true }, { type: 'ease', key: GENOA, metres: 1 });
    expect(s.realistic.ease[GENOA]).toBe(1);
    s = act(s, { type: 'station', station: 'port' });
    expect(s.realistic.ease).toEqual({});
    s = run(s, 1);
    expect(s.controls.ctl_jib_sheet).toBe(30);
  });

  it('static ropes (halyards) are not worked; one rope per winch; the jaw needs turns', () => {
    let s = start({}, 'starboard');
    s = act(s, { type: 'clutch', key: 'a4', open: true });
    expect(s.realistic.notice?.key).toBe('staticRope');
    s = act(s, { type: 'onWinch', key: GENOA });
    expect(s.realistic.winches[STBD]?.tail).toBe(GENOA);
    s = act(s, { type: 'onWinch', key: MAIN_STBD });
    expect(s.realistic.notice?.key).toBe('winchBusy');
    s = act(s, { type: 'selfTailer', winch: STBD, into: true });
    expect(s.realistic.notice?.key).toBe('needTurns');
    s = act(
      s,
      { type: 'turn', winch: STBD, delta: 1 },
      { type: 'selfTailer', winch: STBD, into: true },
    );
    expect(s.realistic.winches[STBD]?.selfTailer).toBe(true);
    // Up to five turns either way.
    for (let i = 0; i < 8; i += 1) s = act(s, { type: 'turn', winch: STBD, delta: 1 });
    expect(s.realistic.winches[STBD]?.turns).toBe(5);
    s = act(s, { type: 'offWinch', winch: STBD });
    expect(s.realistic.winches[STBD]?.tail).toBeNull();
  });

  it('JIB ROLL goes on the port winch (owner), bank A on the starboard winch', () => {
    let s = start({}, 'port');
    s = act(s, { type: 'onWinch', key: JIB_ROLL });
    expect(s.realistic.winches[PORT]?.tail).toBe(JIB_ROLL);
  });

  it('Pause: nothing moves; what was prepared happens together on Resume', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 }, 'starboard');
    s = reduce(s, { type: 'setPaused', paused: true });
    s = act(onWinch(s, MAIN_STBD, 0), { type: 'clutch', key: GENOA, open: true });
    s = act(s, { type: 'station', station: 'port' }, { type: 'clutch', key: VANG, open: true });
    const timeS = s.rig.timeS;
    s = run(s, 1);
    expect(s.controls.ctl_jib_sheet).toBe(30);
    expect(s.rig.timeS).toBe(timeS);
    expect(s.realistic.winches[STBD]?.tail).toBe(MAIN_STBD);
    s = run(reduce(s, { type: 'setPaused', paused: false }), 1);
    expect(s.controls.ctl_jib_sheet).toBeGreaterThan(60);
    expect(s.rig.timeS).toBeGreaterThan(timeS);
  });

  it('Pause works in Easy mode too: the rig stands still until Resume', () => {
    let s = initialState({ controls: { ctl_wind_dir: 90, ctl_mainsheet: 0 } });
    s = reduce(s, { type: 'setPaused', paused: true });
    s = reduce(s, { type: 'setControls', values: { ctl_mainsheet: 80 } });
    const theta = s.rig.theta.value;
    s = run(s, 1);
    expect(s.rig.theta.value).toBe(theta);
    s = run(reduce(s, { type: 'setPaused', paused: false }), 1);
    expect(Math.abs(s.rig.theta.value)).toBeGreaterThan(Math.abs(theta) + 10);
  });

  it('Easy mode is untouched: the Realistic state does not move ropes there', () => {
    let s = initialState({ controls: { ctl_wind_dir: 90, ctl_wind_speed: 20, ctl_jib_sheet: 30 } });
    s = act(
      s,
      { type: 'station', station: 'starboard' },
      { type: 'clutch', key: GENOA, open: true },
    );
    s = run(s, 1);
    expect(s.controls.ctl_jib_sheet).toBe(30);
  });
});

describe('Realistic mode: furling (PHASE1_SPEC 7.2.2, PT-12, PT-13)', () => {
  it('furling the main needs the "out" tail and the outhaul to run free (else the winch cuts out)', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_main_furl: 100 }, 'starboard');
    s = onWinch(s, FURL_IN, 4);
    s = act(
      s,
      { type: 'selfTailer', winch: STBD, into: true },
      { type: 'button', winch: STBD, held: true },
    );
    s = run(s, 1);
    expect(s.controls.ctl_main_furl).toBe(100);
    expect(s.realistic.reports[FURL_IN]?.note).toBe('cutOutBlocked');
    expect(s.realistic.reports[FURL_IN]?.blockers.sort()).toEqual([OUTHAUL, FURL_OUT].sort());
    // Open both (the outhaul is at the port station), then the main rolls in.
    s = act(
      s,
      { type: 'button', winch: STBD, held: false },
      { type: 'clutch', key: FURL_OUT, open: true },
    );
    s = act(s, { type: 'station', station: 'port' }, { type: 'clutch', key: OUTHAUL, open: true });
    s = act(
      s,
      { type: 'station', station: 'starboard' },
      { type: 'button', winch: STBD, held: true },
    );
    s = run(s, 3);
    expect(s.controls.ctl_main_furl).toBeLessThan(90);
  });

  it('a released "in" furling tail lets the wind unroll the main slowly; the "out" tail hauls it out', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_main_furl: 0 }, 'starboard');
    s = run(act(s, { type: 'clutch', key: FURL_IN, open: true }), 2);
    const byWind = s.controls.ctl_main_furl;
    expect(byWind).toBeGreaterThan(0);
    expect(byWind).toBeLessThan(5);
    s = onWinch(s, FURL_OUT, 3);
    s = act(
      s,
      { type: 'selfTailer', winch: STBD, into: true },
      { type: 'button', winch: STBD, held: true },
    );
    s = run(s, 2);
    expect(s.controls.ctl_main_furl - byWind).toBeGreaterThan(5);
  });

  it('PT-13 furling the jib pulls a free jib sheet out; with its clutch closed the furl stops', () => {
    const base = start({ ctl_wind_dir: 60, ctl_wind_speed: 12, ctl_jib_sheet: 30 }, 'port');
    const furl = (s: AppState) => {
      let x = onWinch(s, JIB_ROLL, 3);
      x = act(
        x,
        { type: 'selfTailer', winch: PORT, into: true },
        { type: 'button', winch: PORT, held: true },
      );
      return run(x, 15);
    };
    const blocked = furl(base);
    expect(blocked.controls.ctl_jib_furl).toBeGreaterThan(50);
    expect(blocked.controls.ctl_jib_sheet).toBe(30);
    expect(blocked.realistic.reports[JIB_ROLL]?.note).toBe('cutOutBlocked');
    expect(blocked.realistic.reports[JIB_ROLL]?.blockers).toEqual([GENOA]);

    let free = act(
      base,
      { type: 'station', station: 'starboard' },
      { type: 'clutch', key: GENOA, open: true },
    );
    free = act(free, { type: 'station', station: 'port' });
    free = furl(free);
    expect(free.controls.ctl_jib_furl).toBeLessThan(blocked.controls.ctl_jib_furl - 10);
    expect(free.controls.ctl_jib_sheet).toBeGreaterThan(30);
  });

  it('a released JIB ROLL line lets the wind unroll the jib', () => {
    let s = start({ ctl_wind_dir: 60, ctl_wind_speed: 12, ctl_jib_furl: 20, ctl_jib_sheet: 100 });
    s = run(act(s, { type: 'clutch', key: JIB_ROLL, open: true }), 2);
    expect(s.controls.ctl_jib_furl).toBeGreaterThan(20);
  });
});

describe('Realistic mode: pure reducer', () => {
  it('starts with every clutch closed and both winches empty', () => {
    const r = initialRealistic();
    expect(Object.keys(r.open)).toHaveLength(0);
    expect(Object.values(r.winches).every((w) => w.tail === null)).toBe(true);
    expect(reduceRealistic(r, { type: 'station', station: 'port' })).toBe(r);
  });

  it('easing with the tail in the self-tailer asks to take it out first', () => {
    let s = start({}, 'port');
    s = act(onWinch(s, LIFT, 2), { type: 'clutch', key: LIFT, open: true });
    s = act(
      s,
      { type: 'selfTailer', winch: PORT, into: true },
      { type: 'ease', key: LIFT, metres: 1 },
    );
    expect(s.realistic.notice?.key).toBe('inSelfTailer');
  });
});

describe('Realistic mode: robustness', () => {
  it('no NaN and controls stay in 0…100 with every clutch open, across winds and speeds', () => {
    for (const wind of [0, 45, 90, 135, 175, -60, -120]) {
      for (const speed of [0, 4, 12, 30]) {
        let s = start({ ctl_wind_dir: wind, ctl_wind_speed: speed }, 'port');
        for (const spec of tailSpecs().filter((t) => t.controlId)) {
          s = act(
            s,
            { type: 'station', station: spec.station },
            { type: 'clutch', key: spec.key, open: true },
          );
        }
        s = run(s, 1.5);
        for (const [id, value] of Object.entries(s.controls)) {
          expect(Number.isFinite(value), `${id} at ${wind}°/${speed} kn`).toBe(true);
        }
        for (const id of [
          'ctl_mainsheet',
          'ctl_jib_sheet',
          'ctl_vang',
          'ctl_topping_lift',
        ] as const) {
          expect(s.controls[id]).toBeGreaterThanOrEqual(0);
          expect(s.controls[id]).toBeLessThanOrEqual(100);
        }
        expect(Number.isFinite(s.rig.theta.value)).toBe(true);
        expect(Number.isFinite(s.rig.jibPhi.value)).toBe(true);
      }
    }
  }, 60_000);
});

describe('Realistic mode: dragging the rope back to its clutch (take off the winch)', () => {
  it('works with no turns on the drum, and only then; the button works at any time', () => {
    let s = start({ ctl_wind_dir: 90, ctl_wind_speed: 12 }, 'port');
    s = onWinch(s, VANG, 0);
    expect(s.realistic.winches[PORT]?.tail).toBe(VANG);
    // 0 turns: the gesture takes it off.
    const off = act(s, { type: 'offWinch', winch: PORT, needZeroTurns: true });
    expect(off.realistic.winches[PORT]?.tail).toBeNull();
    expect(off.realistic.notice).toBeNull();
    // With a turn on the drum: error, the rope stays on the winch.
    const turned = act(s, { type: 'turn', winch: PORT, delta: 1 });
    const refused = act(turned, { type: 'offWinch', winch: PORT, needZeroTurns: true });
    expect(refused.realistic.winches[PORT]?.tail).toBe(VANG);
    expect(refused.realistic.winches[PORT]?.turns).toBe(1);
    expect(refused.realistic.notice).toEqual({ key: 'turnsOn', tail: VANG });
    // Wrapped the wrong way counts as turns too.
    const wrong = act(
      s,
      { type: 'turn', winch: PORT, delta: -1 },
      { type: 'offWinch', winch: PORT, needZeroTurns: true },
    );
    expect(wrong.realistic.winches[PORT]?.tail).toBe(VANG);
    expect(wrong.realistic.notice?.key).toBe('turnsOn');
    // Take the turn off, then the gesture works.
    const done = act(
      refused,
      { type: 'turn', winch: PORT, delta: -1 },
      { type: 'offWinch', winch: PORT, needZeroTurns: true },
    );
    expect(done.realistic.winches[PORT]?.tail).toBeNull();
    // The button (no needZeroTurns) takes it off with turns on the drum.
    const button = act(turned, { type: 'offWinch', winch: PORT });
    expect(button.realistic.winches[PORT]?.tail).toBeNull();
  });
});
