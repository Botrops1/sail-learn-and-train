import { describe, expect, it } from 'vitest';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import {
  gennakerClew,
  gennakerCommand,
  gennakerDrawing,
  gennakerTrimState,
  leewardSide,
  solveGennaker,
  stepGennaker,
  stageToShow,
  sheetLead,
  STOWED,
  type GennakerSetup,
  type GennakerStage,
} from '../src/model/gennaker';
import { halfBeamAt, sheerAt } from '../src/model/hullShape';
import { ropeDrawings } from '../src/model/ropePaths';
import { initialRig } from '../src/model/sim';
import { mpsToKn } from '../src/model/angles';
import { steadyState } from '../src/model/motion';
import { gennakerSheetLoadN } from '../src/model/sheetLoads';
import { defaultControls } from '../src/model/controls';
import { vec3, type Vec3 } from '../src/model/vec3';

const at = (stage: GennakerStage, side: 1 | -1 = 1): GennakerSetup => ({ ...STOWED, stage, side });

describe('M105: the gennaker commands', () => {
  it('next moves a step; reaching stage 2 fixes the side to the leeward one', () => {
    const toTwo = (awaDeg: number) =>
      gennakerCommand(gennakerCommand(STOWED, 'next', awaDeg, 0), 'next', awaDeg, 0);
    expect(toTwo(30)).toEqual({ stage: 2, side: -1, crossS: 0, crossFromDeg: 0 });
    expect(toTwo(-30)).toEqual({ stage: 2, side: 1, crossS: 0, crossFromDeg: 0 });
    // Wind dead ahead or astern counts as from port: leeward is starboard.
    expect(toTwo(0).side).toBe(1);
  });

  it('next at stage 4 returns the same object', () => {
    const hoisted = at(4);
    expect(gennakerCommand(hoisted, 'next', 30, 0)).toBe(hoisted);
  });

  it('back from stage 4 only while the sock is down', () => {
    const hoisted = at(4);
    expect(gennakerCommand(hoisted, 'back', 30, 40)).toBe(hoisted);
    expect(gennakerCommand(hoisted, 'back', 30, 0).stage).toBe(3);
    const stowed = gennakerCommand(STOWED, 'back', 30, 0);
    expect(stowed).toBe(STOWED);
  });

  it('rig goes straight to stage 4 on the leeward side; stow returns to STOWED', () => {
    expect(gennakerCommand(STOWED, 'rig', 100, 0)).toEqual({
      stage: 4,
      side: -1,
      crossS: 0,
      crossFromDeg: 0,
    });
    const hoisted = at(4, 1);
    expect(gennakerCommand(hoisted, 'rig', 100, 0)).toBe(hoisted);
    expect(gennakerCommand(at(3, -1), 'stow', 30, 0)).toEqual(STOWED);
  });

  it('leewardSide: wind over starboard puts the gennaker on port', () => {
    expect(leewardSide(120)).toBe(-1);
    expect(leewardSide(-120)).toBe(1);
    expect(leewardSide(0)).toBe(1);
  });
});

describe('M105: the sheets', () => {
  it('each side has nine points and the two are mirror images', () => {
    const port = sheetLead(-1);
    const starboard = sheetLead(1);
    expect(port).toHaveLength(9);
    expect(starboard).toHaveLength(9);
    port.forEach((p, i) => {
      const s = starboard[i] as Vec3;
      expect(p[0]).toBeCloseTo(s[0], 9);
      expect(p[1]).toBeCloseTo(s[1], 9);
      expect(p[2]).toBeCloseTo(-s[2], 9);
    });
  });

  it('the starboard block is on the toerail and the last point is the winch foot', () => {
    const starboard = sheetLead(1);
    expect(starboard[7]).toEqual([-8.0, 1.5, 2.1]);
    const last = starboard[8] as Vec3;
    expect(last[0]).toBeCloseTo(-7.25, 9);
    expect(last[1]).toBeCloseTo(1.6, 9);
    expect(last[2]).toBeCloseTo(1.6, 9);
  });

  it('PT-69 the sheets run outside everything: outside the lifelines along the deck, the block on the deck edge', () => {
    const { aftX, fwdX } = boat.modelDetail.lifelines;
    for (const side of [1, -1] as const) {
      const lead = sheetLead(side);
      const via = lead.slice(0, boat.sails.gennaker.sheetVia.length);
      let checked = 0;
      for (let i = 1; i < via.length; i += 1) {
        const a = via[i - 1] as Vec3;
        const b = via[i] as Vec3;
        const steps = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.25);
        for (let k = 0; k <= steps; k += 1) {
          const u = k / steps;
          const x = a[0] + (b[0] - a[0]) * u;
          const z = a[2] + (b[2] - a[2]) * u;
          if (x < aftX || x > fwdX) continue;
          checked += 1;
          expect(Math.abs(z), `x ${x.toFixed(2)}`).toBeGreaterThanOrEqual(halfBeamAt(x) + 0.05);
          expect(Math.sign(z)).toBe(side);
        }
      }
      expect(checked).toBeGreaterThan(40);
      const block = lead[7] as Vec3;
      expect(Math.abs(block[2])).toBeGreaterThanOrEqual(halfBeamAt(-8.0));
    }
  });
});

describe('M105: the drawing', () => {
  it('PT-69 at steps 2 and 3 the sheets cross the centreline ahead of the forestay, never behind it', () => {
    const footX = vec3(boat.rig.forestay.bottom)[0];
    for (const stage of [2, 3] as const) {
      const sheets = gennakerDrawing(at(stage, -1)).sheets;
      for (const line of [sheets?.port, sheets?.starboard] as Vec3[][]) {
        let crossings = 0;
        for (let i = 1; i < line.length; i += 1) {
          const a = line[i - 1] as Vec3;
          const b = line[i] as Vec3;
          if (a[2] * b[2] < 0 || (b[2] === 0 && a[2] !== 0)) {
            const u = Math.abs(a[2]) / (Math.abs(a[2]) + Math.abs(b[2]));
            const x = a[0] + (b[0] - a[0]) * u;
            crossings += 1;
            expect(x, `stage ${stage}`).toBeGreaterThan(footX + 0.1);
          }
        }
        expect(crossings).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('the drawn sheets never go inside the hull: below the sheer they stay outside the deck edge', () => {
    const rig = initialRig(defaultControls());
    for (const stage of [2, 4] as const) {
      for (const side of [1, -1] as const) {
        const setup = at(stage, side);
        for (const id of ['rope_gennaker_sheet_port', 'rope_gennaker_sheet_starboard']) {
          const points = ropeDrawings(rig, boat, undefined, setup).find((r) => r.id === id)
            ?.strands[0]?.points as Vec3[];
          for (const [x, y, z] of points) {
            if (x > 5.6 || x < -8.0) continue;
            if (y < sheerAt(x)) {
              expect(Math.abs(z), `${id} x ${x.toFixed(2)}`).toBeGreaterThanOrEqual(
                halfBeamAt(x) - 1e-6,
              );
            }
          }
        }
      }
    }
  });

  const forestayX = (y: number) => {
    const bottom = vec3(boat.rig.forestay.bottom);
    const top = vec3(boat.rig.forestay.top);
    return bottom[0] + ((y - bottom[1]) / (top[1] - bottom[1])) * (top[0] - bottom[0]);
  };

  it('the halyard clears the forestay at stage 3, and the sock at stage 4', () => {
    const halyard = gennakerDrawing(at(3, -1)).halyard as Vec3[];
    const [a, b] = halyard as [Vec3, Vec3];
    for (let y = 4; y <= 20; y += 1) {
      const u = (y - a[1]) / (b[1] - a[1]);
      const x = a[0] + (b[0] - a[0]) * u;
      expect(x - forestayX(y), `y ${y}`).toBeGreaterThanOrEqual(0.05);
    }
    const sock = gennakerDrawing(at(4, -1)).sock as { from: Vec3; to: Vec3 };
    for (let y = 3; y <= 20; y += 1) {
      const u = (y - sock.from[1]) / (sock.to[1] - sock.from[1]);
      const x = sock.from[0] + (sock.to[0] - sock.from[0]) * u;
      expect(x - forestayX(y), `y ${y}`).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('each stage draws what the table says', () => {
    const nullsOf = (stage: GennakerStage) => {
      const d = gennakerDrawing(at(stage, 1));
      return [d.bag, d.tackLine, d.sheets, d.halyard, d.sock, d.sockLine].map((v) =>
        v === null ? 'null' : v === false ? 'false' : 'set',
      );
    };
    expect(nullsOf(0)).toEqual(['false', 'null', 'null', 'null', 'null', 'null']);
    expect(nullsOf(1)).toEqual(['set', 'set', 'null', 'null', 'null', 'null']);
    expect(nullsOf(2)).toEqual(['set', 'set', 'set', 'null', 'null', 'null']);
    expect(nullsOf(3)).toEqual(['set', 'set', 'set', 'set', 'null', 'null']);
    expect(nullsOf(4)).toEqual(['false', 'set', 'set', 'set', 'set', 'set']);
    const hoisted = gennakerDrawing(at(4));
    expect(hoisted.sheets?.port).toHaveLength(10);
    expect(hoisted.sheets?.starboard).toHaveLength(10);
    expect(hoisted.sockLine?.[1]).toEqual(boat.sails.gennaker.sock.lineEnd);
  });

  it('stage 0 draws none of the four new ropes; stage 4 draws all of them, the halyard along the sock', () => {
    const rig = initialRig(defaultControls());
    const ids = (setup: GennakerSetup) =>
      ropeDrawings(rig, boat, undefined, setup)
        .map((r) => r.id)
        .filter((id) => id.startsWith('rope_gennaker_'))
        .sort();
    expect(ids(STOWED)).toEqual([]);
    expect(ropeDrawings(rig)).toEqual(ropeDrawings(rig, boat, undefined, STOWED));
    expect(ids(at(1))).toEqual(['rope_gennaker_tack_line']);
    expect(ids(at(2))).toEqual([
      'rope_gennaker_sheet_port',
      'rope_gennaker_sheet_starboard',
      'rope_gennaker_tack_line',
    ]);
    expect(ids(at(4))).toHaveLength(4);
    const halyard = ropeDrawings(rig, boat, undefined, at(4)).find(
      (r) => r.id === 'rope_spi_halyard',
    );
    expect(halyard?.strands[0]?.points).toEqual([
      boat.rig.lineLead.lines.find((l) => l.rope === 'rope_spi_halyard')?.parked?.masthead,
      boat.sails.gennaker.head,
    ]);
    // Parked while stowed: ends at the mast foot.
    const parked = ropeDrawings(rig).find((r) => r.id === 'rope_spi_halyard');
    expect(parked?.strands[0]?.points[1]?.[1]).toBeLessThan(3);
  });

  it('a gennaker line keeps the same number of points from stage to stage', () => {
    const rig = initialRig(defaultControls());
    const count = (stage: GennakerStage, id: string) =>
      ropeDrawings(rig, boat, undefined, at(stage)).find((r) => r.id === id)?.strands[0]?.points
        .length;
    expect(count(2, 'rope_gennaker_sheet_port')).toBe(count(3, 'rope_gennaker_sheet_port'));
    expect(count(1, 'rope_gennaker_tack_line')).toBe(count(4, 'rope_gennaker_tack_line'));
  });
});

describe('M105: Where is it? (Learn)', () => {
  it('names the stage a part needs, and the drawn stage when it is already on the boat', () => {
    expect(stageToShow('rope_gennaker_sheet_port', 0)).toBe(2);
    expect(stageToShow('rope_gennaker_sheet_starboard', 3)).toBe(3);
    expect(stageToShow('fit_gennaker_block', 1)).toBe(2);
    expect(stageToShow('rope_gennaker_tack_line', 0)).toBe(1);
    expect(stageToShow('part_gennaker_sock', 2)).toBe(4);
    expect(stageToShow('rope_gennaker_sock_line', 4)).toBe(4);
    expect(stageToShow('part_gennaker_bag', 0)).toBe(3);
    expect(stageToShow('part_gennaker_bag', 2)).toBe(2);
    expect(stageToShow('part_gennaker_bag', 4)).toBe(3);
    expect(stageToShow('rope_vang', 0)).toBeNull();
  });
});

describe('M105: the link', () => {
  it('gn and gx round-trip', () => {
    const state = parseUrlState('?gn=3&gx=p');
    expect(state.gennaker).toEqual({ stage: 3, side: -1, crossS: 0, crossFromDeg: 0 });
    const link = serializeUrlState(state);
    expect(link).toContain('gn=3');
    expect(link).toContain('gx=p');
    expect(parseUrlState(link).gennaker).toEqual(state.gennaker);
    expect(parseUrlState('?gn=4&gx=s').gennaker.side).toBe(1);
  });

  it('a bad stage is stowed; a missing side is the leeward one', () => {
    expect(parseUrlState('?gn=7').gennaker).toEqual(STOWED);
    expect(parseUrlState('?gn=abc').gennaker).toEqual(STOWED);
    expect(parseUrlState('?gn=2&wd=60').gennaker.side).toBe(-1);
    expect(parseUrlState('?gn=2&wd=-60').gennaker.side).toBe(1);
    expect(parseUrlState('?gn=2&gx=q&wd=60').gennaker.side).toBe(-1);
  });

  it('stowed links carry neither key; stage 1 has gn but no gx; gx alone is ignored', () => {
    expect(parseUrlState('?gn=0&gx=p').gennaker).toEqual(STOWED);
    expect(parseUrlState('?gx=p').gennaker).toEqual(STOWED);
    const stowed = serializeUrlState(parseUrlState(''));
    expect(stowed).not.toMatch(/[?&]gn=/);
    expect(stowed).not.toMatch(/[?&]gx=/);
    const one = serializeUrlState(parseUrlState('?gn=1'));
    expect(one).toMatch(/[?&]gn=1(&|$)/);
    expect(one).not.toMatch(/[?&]gx=/);
  });
});

describe('M105: the store', () => {
  it('rig gives stage 4, reset returns to STOWED, the rest is unchanged', () => {
    const state = initialState();
    expect(state.gennaker).toBe(STOWED);
    const rigged = reduce(state, { type: 'gennaker', command: 'rig' });
    expect(rigged.gennaker.stage).toBe(4);
    expect(reduce(rigged, { type: 'gennaker', command: 'rig' })).toBe(rigged);
    expect(reduce(rigged, { type: 'reset' }).gennaker).toEqual(STOWED);
    expect(reduce(rigged, { type: 'gennaker', command: 'stow' }).gennaker).toEqual(STOWED);
  });

  it('the side is the leeward one at the moment the sheets are led', () => {
    // Default wind: from starboard (wd 60, heading 0): the gennaker goes to port.
    let state = initialState();
    state = reduce(state, { type: 'gennaker', command: 'next' });
    state = reduce(state, { type: 'gennaker', command: 'next' });
    expect(state.gennaker.stage).toBe(2);
    expect(state.gennaker.side).toBe(Math.sign(state.rig.wind.awaDeg) > 0 ? -1 : 1);
  });
});

describe('M106: sailing with the gennaker', () => {
  const run = (twa: number, gs = 25, gu = 100) => {
    const controls = {
      ...defaultControls(),
      ctl_wind_dir: twa,
      ctl_wind_speed: 12,
      ctl_mainsheet: 60,
      ctl_jib_furl: 0,
      ctl_gennaker_sheet: gs,
      ctl_gennaker_sock: gu,
    };
    const setup: GennakerSetup = { ...STOWED, stage: 4, side: leewardSide(twa) };
    const steady = steadyState(controls, 0, undefined, { heel: true, gennaker: setup });
    const rig = initialRig(
      controls,
      undefined,
      {},
      { velocity: [steady.speedMps, 0, 0], headingDeg: 0, heelDeg: steady.heelDeg },
      undefined,
      setup,
    );
    return { steady, rig };
  };

  it('both tacks mirror: equal speed, opposite heel, the clew on opposite sides', () => {
    const starboard = run(120);
    const port = run(-120);
    expect(mpsToKn(starboard.steady.speedMps)).toBeCloseTo(mpsToKn(port.steady.speedMps), 1);
    expect(
      Math.abs(mpsToKn(starboard.steady.speedMps) - mpsToKn(port.steady.speedMps)),
    ).toBeLessThan(0.01);
    expect(Math.sign(starboard.steady.heelDeg)).toBe(-Math.sign(port.steady.heelDeg));
    const clew = (r: ReturnType<typeof run>) => gennakerClew(r.rig.gennaker.thetaDeg)[2];
    expect(Math.sign(clew(starboard))).toBe(-Math.sign(clew(port)));
    expect(clew(starboard)).toBeLessThan(0); // wind over starboard: the gennaker is on port
  });

  it('gennakerClew at θ = 15° is where the spec says', () => {
    const [x, y, z] = gennakerClew(15);
    expect(x).toBeCloseTo(-4.035, 3);
    expect(y).toBeCloseTo(3.195, 3);
    expect(z).toBeCloseTo(2.943, 3);
  });

  it('PT-69 a gybe sends the clew round the front', () => {
    const wind = 74;
    const before: GennakerSetup = { ...STOWED, stage: 4, side: -1 };
    const gybed = gennakerCommand(before, 'gybe', wind, 100, 40);
    expect(gybed.side).toBe(1);
    expect(gybed.crossS).toBe(boat.sails.gennaker.gybeCrossS);
    expect(gybed.crossFromDeg).toBe(40);
    const solveAt = (u: number) =>
      solveGennaker({ ...gybed, crossS: boat.sails.gennaker.gybeCrossS * (1 - u) }, 50, 100, wind);
    // At u = 0 the clew is still where it was, on the old side: no jump.
    expect(solveAt(0).thetaDeg).toBeCloseTo(-gybed.side * 40, 6);
    const uFront = (180 - 40) / (360 - 40 - boat.sails.gennaker.sheet.phiEasedDeg);
    const front = solveAt(uFront);
    expect(Math.abs(front.thetaDeg)).toBeCloseTo(180, 0);
    expect(gennakerClew(front.thetaDeg)[0]).toBeGreaterThan(vec3(boat.sails.gennaker.tack)[0]);
    // After gybeCrossS seconds of stepping the crossing is over and the sail is on the new side.
    let setup = gybed;
    for (let i = 0; i < 100; i += 1) setup = stepGennaker(setup, 0.1);
    expect(setup.crossS).toBe(0);
    expect(setup.crossFromDeg).toBe(0);
    expect(setup.side).toBe(1);
    expect(gennakerTrimState(setup, solveGennaker(setup, 50, 100, wind))).not.toBe('crossing');
  });

  it('a gybe with the sock down sets no crossing; a stowed or crossing one does nothing', () => {
    const hoisted: GennakerSetup = { ...STOWED, stage: 4, side: -1 };
    const snuffed = gennakerCommand(hoisted, 'gybe', 74, 0);
    expect(snuffed.side).toBe(1);
    expect(snuffed.crossS).toBe(0);
    expect(gennakerCommand(STOWED, 'gybe', 74, 100)).toBe(STOWED);
    const crossing = gennakerCommand(hoisted, 'gybe', 74, 100, 30);
    expect(gennakerCommand(crossing, 'gybe', 74, 100, 30)).toBe(crossing);
  });

  it('on the windward side the sail is backed: no fill', () => {
    // Wind over starboard (awa 74): leeward is port (−1); the sail on starboard is backed.
    const wrong: GennakerSetup = { ...STOWED, stage: 4, side: 1 };
    const sol = solveGennaker(wrong, 25, 100, 74);
    expect(sol.backed).toBe(true);
    expect(sol.fill).toBe(0);
    expect(gennakerTrimState(wrong, sol)).toBe('backed');
    const right = solveGennaker({ ...wrong, side: -1 }, 25, 100, 74);
    expect(right.backed).toBe(false);
  });

  it('awaDeg = 0 and a stowed sail give no NaN', () => {
    const hoisted: GennakerSetup = { ...STOWED, stage: 4, side: 1 };
    for (const sol of [solveGennaker(hoisted, 50, 100, 0), solveGennaker(STOWED, 50, 100, 0)]) {
      for (const value of Object.values(sol)) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
    }
    expect(solveGennaker(hoisted, 50, 100, 0).fill).toBe(0);
    const stowed = solveGennaker(STOWED, 50, 100, 120);
    expect(stowed.set).toBe(false);
    expect(stowed.blanket).toBe(1);
  });

  it('the store: stow puts the sock down; the controls act only at stage 4; a gybe lets the old sheet go', () => {
    let state = initialState({ controls: { ctl_wind_dir: 120, ctl_wind_speed: 12 } });
    // Below stage 4 the two controls are ignored.
    expect(reduce(state, { type: 'setControls', values: { ctl_gennaker_sock: 100 } })).toBe(state);
    state = reduce(state, { type: 'gennaker', command: 'rig' });
    state = reduce(state, {
      type: 'setControls',
      values: { ctl_gennaker_sock: 100, ctl_gennaker_sheet: 20 },
    });
    expect(state.controls.ctl_gennaker_sock).toBe(100);
    const gybed = reduce(state, { type: 'gennaker', command: 'gybe' });
    expect(gybed.gennaker.crossS).toBeGreaterThan(0);
    expect(gybed.rig.applied.gennakerSheet).toBe(100);
    const stowed = reduce(state, { type: 'gennaker', command: 'stow' });
    expect(stowed.controls.ctl_gennaker_sock).toBe(0);
  });

  it('gs and gu are kept in the link and written only when they differ from the defaults', () => {
    const state = parseUrlState('?gn=4&gx=p&gs=25&gu=100&wd=120');
    expect(state.controls.ctl_gennaker_sheet).toBe(25);
    expect(state.controls.ctl_gennaker_sock).toBe(100);
    const link = serializeUrlState(state);
    expect(link).toContain('gs=25');
    expect(link).toContain('gu=100');
    const plain = serializeUrlState(parseUrlState('?gn=4&gx=p'));
    expect(plain).not.toContain('gs=');
    expect(plain).not.toContain('gu=');
    expect(serializeUrlState(parseUrlState(''))).not.toMatch(/[?&]g[su]=/);
  });

  it('PT-67 sheet load at tws 12, twa 120, ms 60, gs 25 is 2,200–2,800 N', () => {
    const { rig } = run(120, 25, 100);
    const load = gennakerSheetLoadN(rig.forces);
    expect(load).toBeGreaterThanOrEqual(2200);
    expect(load).toBeLessThanOrEqual(2800);
  });
});
