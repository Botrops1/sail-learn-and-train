import { describe, expect, it } from 'vitest';
import { reduce, type AppState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { DEFAULT_HARBOUR } from '../src/model/harbour';
import { marinaGeometry } from '../src/model/marina';
import {
  canTake,
  canTighten,
  cleatPoint,
  lineCommand,
  lineTension,
  NO_LINES,
  stepLines,
  type LinesInputs,
  type LinesState,
  type MooringLine,
} from '../src/model/mooringLines';
import { initialEngine } from '../src/model/engine';
import { berthLines, harbourStart, initialState } from './motionHelpers';

/** M44 (PHASE7_SPEC 10.7): mooring lines. Time steps of 0.25 s. */

const STEP = 0.25;

/** The marina at the start (in the fairway), or with the boat in our berth (east 2.75, north 1490.4, heading 180, at rest). */
function marinaState(inBerth: boolean): AppState {
  const state = reduce(harbourStart({}), { type: 'goToPlace', place: 'marina' });
  if (!inBerth) return state;
  return {
    ...state,
    harbour: { ...state.harbour, traffic: 'empty' },
    boat: { ...state.boat, eastM: 2.75, northM: 1490.4, headingDeg: 180, speedMps: 0, swayMps: 0 },
  };
}

function inputsOf(state: AppState, lines: LinesState = state.lines): LinesInputs {
  return {
    lines,
    boat: state.boat,
    harbour: state.harbour,
    geometry: marinaGeometry(state.harbour.layout, state.harbour.traffic),
    engine: state.engine,
  };
}

const take = (state: AppState, lines: LinesState, code: 'sp' | 'ss' | 'll') =>
  lineCommand(code, 'take', inputsOf(state, lines));

describe('M44 line tension', () => {
  it('a line 5 m long with its ends 5.1 m apart, at rest, pulls 3,000 N; 4.9 m apart, nothing', () => {
    const state = marinaState(true);
    const [x, y, z] = cleatPoint('cleat_stern_port');
    // The boat is heading 180: map east is the port side. Put the far end level with the cleat.
    const cleatEast = state.boat.eastM + (state.boat.headingDeg === 180 ? -z : z);
    const cleatNorth = state.boat.northM - x;
    const line = (apart: number): MooringLine => ({
      code: 'sp',
      cleatId: 'cleat_stern_port',
      far: { eastM: cleatEast + apart, northM: cleatNorth, heightM: y },
      lengthM: 5,
    });
    expect(lineTension(line(5.1), state.boat).tensionN).toBeCloseTo(3000, 0);
    expect(lineTension(line(5.1), state.boat).distanceM).toBeCloseTo(5.1, 6);
    expect(lineTension(line(4.9), state.boat).tensionN).toBe(0);
  });
});

describe('M44 canTake', () => {
  it('canTake sp in the fairway says far; in the berth it is ok; too fast says fast', () => {
    const fairway = marinaState(false);
    const far = canTake('sp', inputsOf(fairway));
    expect(far).toEqual({ ok: false, reason: 'lines.reason.far', params: { m: 4 } });
    const berth = marinaState(true);
    expect(canTake('sp', inputsOf(berth))).toEqual({ ok: true });
    const fast = { ...berth, boat: { ...berth.boat, speedMps: 0.6 } };
    expect(canTake('sp', inputsOf(fast))).toEqual({ ok: false, reason: 'lines.reason.fast' });
  });

  it('canTake ll needs a stern line first; sp in open water is refused', () => {
    const berth = marinaState(true);
    expect(canTake('ll', inputsOf(berth))).toEqual({
      ok: false,
      reason: 'lines.reason.sternFirst',
    });
    const open = harbourStart({});
    expect(canTake('sp', inputsOf(open))).toEqual({ ok: false, reason: 'lines.reason.place' });
  });

  it('a line already on, or the crew busy with the lazy line, says busy', () => {
    const berth = marinaState(true);
    const withSp = take(berth, NO_LINES, 'sp');
    expect(canTake('sp', inputsOf(berth, withSp))).toEqual({
      ok: false,
      reason: 'lines.reason.busy',
    });
    const walking = take(berth, withSp, 'll');
    expect(walking.crew?.remainingS).toBe(20);
    expect(canTake('ll', inputsOf(berth, walking))).toEqual({
      ok: false,
      reason: 'lines.reason.busy',
    });
  });
});

describe('M44 the lazy line', () => {
  it('the crew walks it in 20 s and makes it fast on cleat_bow_port at 12.70 m', () => {
    const berth = marinaState(true);
    let lines = take(berth, NO_LINES, 'sp');
    lines = take(berth, lines, 'ss');
    expect(lines.lines.map((l) => [l.code, l.lengthM.toFixed(2)])).toEqual([
      ['sp', '2.55'],
      ['ss', '2.55'],
    ]);
    lines = take(berth, lines, 'll');
    expect(lines.crew?.remainingS).toBe(20);
    for (let i = 0; i < 79; i += 1) lines = stepLines(inputsOf(berth, lines), STEP);
    expect(lines.crew).not.toBeNull();
    lines = stepLines(inputsOf(berth, lines), STEP);
    expect(lines.crew).toBeNull();
    const lazy = lines.lines.find((l) => l.code === 'll');
    expect(lazy?.cleatId).toBe('cleat_bow_port');
    expect(lazy?.far).toEqual({ eastM: 2.75, northM: 1475, heightM: -5 });
    expect(lazy?.lengthM).toBeCloseTo(12.7, 2);
  });

  it('the walk ends even if the stern lines were let go meanwhile', () => {
    const berth = marinaState(true);
    let lines = take(berth, take(berth, NO_LINES, 'sp'), 'll');
    lines = lineCommand('sp', 'letGo', inputsOf(berth, lines));
    for (let i = 0; i < 80; i += 1) lines = stepLines(inputsOf(berth, lines), STEP);
    expect(lines.lines.map((l) => l.code)).toEqual(['ll']);
  });

  it('Tighten stops at hand tight (12.33 m), Ease at 40 m, Let go removes it', () => {
    const berth = marinaState(true);
    let lines = take(berth, take(berth, NO_LINES, 'sp'), 'll');
    for (let i = 0; i < 80; i += 1) lines = stepLines(inputsOf(berth, lines), STEP);
    const lazy = () => lines.lines.find((l) => l.code === 'll');
    for (let i = 0; i < 6; i += 1) lines = lineCommand('ll', 'tighten', inputsOf(berth, lines));
    expect(lazy()?.lengthM).toBeCloseTo(12.33, 2);
    expect(canTighten('ll', inputsOf(berth, lines))).toBe(false);
    for (let i = 0; i < 200; i += 1) lines = lineCommand('ll', 'ease', inputsOf(berth, lines));
    expect(lazy()?.lengthM).toBe(40);
    lines = lineCommand('ll', 'letGo', inputsOf(berth, lines));
    expect(lazy()).toBeUndefined();
  });

  it('letting go while the crew walks it ends the walk', () => {
    const berth = marinaState(true);
    let lines = take(berth, take(berth, NO_LINES, 'sp'), 'll');
    lines = lineCommand('ll', 'letGo', inputsOf(berth, lines));
    expect(lines.crew).toBeNull();
  });
});

describe('M44 a line in the propeller', () => {
  /** A stern line 2.0 m longer than its ring distance, the engine in `gear`: when does it foul? */
  function foulTime(engine: { running: boolean; leverPct: number }, limitS: number): number | null {
    const berth = marinaState(true);
    const lines: LinesState = {
      ...NO_LINES,
      lines: berthLines(berth, { sternSlackM: 2.0, lazy: null }),
    };
    let state = lines;
    for (let i = 1; i <= limitS / STEP; i += 1) {
      state = stepLines({ ...inputsOf(berth, state), engine: initialEngine(engine) }, STEP);
      if (state.fouled) return i * STEP;
    }
    return null;
  }

  it('fouls at 2.0 s in gear, not at 1.75 s', () => {
    expect(foulTime({ running: true, leverPct: -30 }, 5)).toBeCloseTo(2.0, 9);
  });

  it('never fouls in neutral or with the engine stopped', () => {
    expect(foulTime({ running: true, leverPct: 0 }, 20)).toBeNull();
    expect(foulTime({ running: false, leverPct: -30 }, 20)).toBeNull();
  });

  it('a taut line never fouls; Held still never fouls', () => {
    const berth = marinaState(true);
    const taut: LinesState = {
      ...NO_LINES,
      lines: berthLines(berth, { sternSlackM: 0.3, lazy: null }),
    };
    const engine = initialEngine({ running: true, leverPct: -30 });
    let state = taut;
    for (let i = 0; i < 40; i += 1) state = stepLines({ ...inputsOf(berth, state), engine }, STEP);
    expect(state.fouled).toBe(false);
    const slack: LinesState = {
      ...NO_LINES,
      lines: berthLines(berth, { sternSlackM: 2.0, lazy: null }),
    };
    const held = { ...berth, boat: { ...berth.boat, mode: 'held' as const } };
    state = slack;
    for (let i = 0; i < 40; i += 1) state = stepLines({ ...inputsOf(held, state), engine }, STEP);
    expect(state.fouled).toBe(false);
  });

  it('through the store: the engine stops, a report is made, Start is refused until cleared', () => {
    const berth = marinaState(true);
    let state: AppState = {
      ...berth,
      engine: initialEngine({ running: true, leverPct: -30 }),
      lines: { ...NO_LINES, lines: berthLines(berth, { sternSlackM: 2.0, lazy: null }) },
    };
    for (let i = 0; i < 60; i += 1) state = reduce(state, { type: 'step', dt: 1 / 30 });
    expect(state.lines.fouled).toBe(true);
    expect(state.engine.running).toBe(false);
    expect(state.contact.reports[0]?.obstacleId).toBe('propeller');
    expect(state.contact.notice?.partId).toBe('part_saildrive');
    state = reduce(state, { type: 'engine', command: 'start' });
    expect(state.engine.running).toBe(false);
    state = reduce(state, { type: 'clearPropeller' });
    expect(state.lines.fouled).toBe(false);
    expect(state.lines.lines).toHaveLength(2);
    state = reduce(state, { type: 'engine', command: 'start' });
    expect(state.engine.running).toBe(true);
  });
});

describe('M44 the link', () => {
  const BERTH = '?pl=marina&pe=2.8&pn=1490.4&hdg=180';

  it('ln=sp:2.55,ss:2.55,ll:12.33 round-trips and the text keeps the colons', () => {
    const link = `${BERTH}&ln=sp:2.55,ss:2.55,ll:12.33`;
    const state = parseUrlState(link);
    expect(state.lines.lines.map((l) => [l.code, l.lengthM])).toEqual([
      ['sp', 2.55],
      ['ss', 2.55],
      ['ll', 12.33],
    ]);
    // In the links' scenes the starboard bow cleat is the nearer one (10.3 worked values).
    expect(state.lines.lines[2]?.cleatId).toBe('cleat_bow_starboard');
    const written = serializeUrlState(state);
    expect(written).toContain('ln=sp:2.55,ss:2.55,ll:12.33');
    expect(written).not.toContain('%3A');
    expect(serializeUrlState(parseUrlState(written))).toBe(written);
  });

  it('without pl the ln key is ignored; a line far too short is dropped', () => {
    expect(parseUrlState('?ln=sp:2.55,ss:2.55').lines.lines).toHaveLength(0);
    expect(serializeUrlState(parseUrlState('?ln=sp:2.55'))).not.toContain('ln=');
    expect(parseUrlState(`${BERTH}&ln=sp:0.5`).lines.lines).toHaveLength(0);
  });

  it('wrong entries are left out and no key is written without lines', () => {
    const state = parseUrlState(`${BERTH}&ln=xx:3,sp:abc,ss:2.55,ss:2.55,ll:99`);
    expect(state.lines.lines.map((l) => l.code)).toEqual(['ss']);
    expect(serializeUrlState(initialState())).not.toContain('ln=');
    expect(serializeUrlState(parseUrlState(BERTH))).not.toContain('ln=');
  });

  it('choosing a place, Reset and a link without ln clear the lines', () => {
    const state = parseUrlState(`${BERTH}&ln=sp:2.55,ss:2.55`);
    expect(reduce(state, { type: 'goToPlace', place: 'marina' }).lines.lines).toHaveLength(0);
    expect(reduce(state, { type: 'reset' }).lines.lines).toHaveLength(0);
    const loaded = reduce(state, { type: 'load', state: parseUrlState(BERTH) });
    expect(loaded.lines.lines).toHaveLength(0);
  });
});

describe('M44 the marina geometry', () => {
  it('our rings and the lazy line weight', () => {
    const g = marinaGeometry(DEFAULT_HARBOUR.layout, 'empty');
    expect(g.ourRings.west).toEqual([0, 1500]);
    expect(g.ourRings.east).toEqual([5.5, 1500]);
    expect(g.ourSinker).toEqual([2.75, 1475, -5]);
  });
});
