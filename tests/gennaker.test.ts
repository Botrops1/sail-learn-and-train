import { describe, expect, it } from 'vitest';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import {
  gennakerCommand,
  gennakerDrawing,
  leewardSide,
  sheetLead,
  STOWED,
  type GennakerSetup,
  type GennakerStage,
} from '../src/model/gennaker';
import { halfBeamAt } from '../src/model/hullShape';
import { ropeDrawings } from '../src/model/ropePaths';
import { initialRig } from '../src/model/sim';
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
    expect(count(2, 'rope_gennaker_sheet_port')).toBe(count(4, 'rope_gennaker_sheet_port'));
    expect(count(1, 'rope_gennaker_tack_line')).toBe(count(4, 'rope_gennaker_tack_line'));
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
