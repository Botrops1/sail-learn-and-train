import { describe, expect, it } from 'vitest';
import { reduce, type AppState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { area } from '../src/model/area';
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
    area,
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
      farIndex: -1,
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

/** M45 (PHASE7_SPEC 11.3, 11.7): the bay's bow line to a buoy and shore line to a ring. */
describe('M45 bay lines', () => {
  /** In the bay with the mast at `east` (north 0), heading east, the bow 6.9 m east of it. */
  function bayState(east: number, speedMps = 0): AppState {
    const state = reduce(harbourStart({}), { type: 'goToPlace', place: 'bay' });
    return {
      ...state,
      boat: { ...state.boat, eastM: east, northM: 0, headingDeg: 90, speedMps, swayMps: 0 },
    };
  }
  const BUOY = -1457.0; // the bow tip is 0.1 m west of buoy 1 (east -1450)
  const SHORE = -1665.0; // the stern is 27.5 m from the ring at (-1700, 0)

  it('bl: taken with the bow tip 0.1 m from buoy 1 at 0.2 m/s; at 0.4 m/s it is too fast', () => {
    const slow = bayState(BUOY, 0.2);
    expect(canTake('bl', inputsOf(slow))).toEqual({ ok: true });
    const lines = lineCommand('bl', 'take', inputsOf(slow));
    const line = lines.lines[0];
    expect(line?.code).toBe('bl');
    expect(line?.farIndex).toBe(1);
    expect(line?.cleatId).toBe('cleat_bow_port');
    const distance = lineTension(line as MooringLine, slow.boat).distanceM;
    expect(line?.lengthM).toBeCloseTo(distance + 1.0, 6);
    const fast = bayState(BUOY, 0.4);
    expect(canTake('bl', inputsOf(fast))).toMatchObject({ ok: false, reason: 'lines.reason.fast' });
  });

  it('bl: too far from every buoy, one at a time, and only in the bay', () => {
    expect(canTake('bl', inputsOf(bayState(-1250)))).toMatchObject({
      reason: 'lines.reason.buoyFar',
    });
    const state = bayState(BUOY);
    const tied = lineCommand('bl', 'take', inputsOf(state));
    expect(canTake('bl', inputsOf(state, tied))).toMatchObject({ reason: 'lines.reason.busy' });
    expect(canTake('bl', inputsOf(marinaState(false)))).toMatchObject({
      reason: 'lines.reason.bay',
    });
    expect(canTake('sp', inputsOf(state))).toMatchObject({ reason: 'lines.reason.place' });
  });

  it('sl: starts a 30 s crew task and ends with the line on the stern cleat that was nearer the ring', () => {
    const state = bayState(SHORE);
    expect(canTake('sl', inputsOf(state))).toEqual({ ok: true });
    let lines = lineCommand('sl', 'take', inputsOf(state));
    expect(lines.lines).toHaveLength(0);
    expect(lines.crew).toMatchObject({
      kind: 'swimShore',
      code: 'sl',
      remainingS: 30,
      ringIndex: 1,
      cleatId: 'cleat_stern_port',
    });
    expect(canTake('sl', inputsOf(state, lines))).toMatchObject({ reason: 'lines.reason.busy' });
    for (let t = 0; t < 29.75; t += STEP) lines = stepLines(inputsOf(state, lines), STEP);
    expect(lines.crew).not.toBeNull();
    lines = stepLines(inputsOf(state, lines), STEP);
    expect(lines.crew).toBeNull();
    const line = lines.lines[0];
    expect(line).toMatchObject({ code: 'sl', cleatId: 'cleat_stern_port', farIndex: 1 });
    expect(line?.lengthM).toBeCloseTo(28.08, 2);
  });

  it('sl: too far from every ring; a swimming crew can be called back', () => {
    expect(canTake('sl', inputsOf(bayState(-1250)))).toMatchObject({
      reason: 'lines.reason.shoreFar',
    });
    const state = bayState(SHORE);
    const swimming = lineCommand('sl', 'take', inputsOf(state));
    expect(lineCommand('sl', 'letGo', inputsOf(state, swimming)).crew).toBeNull();
  });

  it('a shore line in the water counts as slack for the propeller, a bow line does not', () => {
    const base = bayState(SHORE);
    const geared = initialEngine({ running: true, leverPct: -30 });
    const swimming = lineCommand('sl', 'take', inputsOf(base));
    let state = swimming;
    for (let t = 0; t < 3; t += STEP) {
      state = stepLines({ ...inputsOf(base, state), engine: geared }, STEP);
    }
    expect(state.fouled).toBe(true);
    const buoyState = bayState(BUOY);
    let tied = lineCommand('bl', 'take', inputsOf(buoyState));
    for (let t = 0; t < 5; t += STEP) {
      tied = stepLines({ ...inputsOf(buoyState, tied), engine: geared }, STEP);
    }
    expect(tied.fouled).toBe(false);
  });

  it('the bay links: bl1 and sl1 are written and read back; wrong ones are dropped', () => {
    const buoyLink = '?pl=bay&pe=-1457.0&pn=0.0&hdg=90&ws=0&ln=bl1:3.20';
    const state = parseUrlState(buoyLink);
    expect(state.lines.lines.map((l) => [l.code, l.farIndex, l.lengthM])).toEqual([['bl', 1, 3.2]]);
    const written = serializeUrlState(state);
    expect(written).toContain('ln=bl1:3.20');
    expect(serializeUrlState(parseUrlState(written))).toBe(written);

    const shore = parseUrlState('?pl=bay&pe=-1665.0&pn=0.0&hdg=90&ws=0&ln=sl1:28.08');
    expect(shore.lines.lines[0]).toMatchObject({
      code: 'sl',
      farIndex: 1,
      cleatId: 'cleat_stern_port',
    });
    expect(serializeUrlState(shore)).toContain('ln=sl1:28.08');

    const dropped = (link: string) => parseUrlState(link).lines.lines.length;
    expect(dropped('?pl=bay&pe=-1457.0&pn=0.0&hdg=90&ln=bl:3.20')).toBe(0); // no index
    expect(dropped('?pl=bay&pe=-1457.0&pn=0.0&hdg=90&ln=bl7:3.20')).toBe(0); // no such buoy
    expect(dropped('?pl=bay&pe=-1457.0&pn=0.0&hdg=90&ln=sp:3.20')).toBe(0); // a marina line
    expect(dropped('?pl=marina&pe=2.8&pn=1490.4&hdg=180&ln=bl1:3.20')).toBe(0); // a bay line
    expect(dropped('?pl=bay&pe=-1250.0&pn=0.0&hdg=90&ln=bl1:3.20')).toBe(0); // far away
  });

  it('choosing a place clears the bay lines', () => {
    const state = parseUrlState('?pl=bay&pe=-1457.0&pn=0.0&hdg=90&ws=0&ln=bl1:3.20');
    expect(reduce(state, { type: 'goToPlace', place: 'bay' }).lines.lines).toHaveLength(0);
  });
});
