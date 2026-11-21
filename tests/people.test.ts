import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { checkBoatProfile, makeBoatProfile } from '../src/model/boatProfile';
import { FIGURE_LEG_M, REST_JOINTS, figureJoints } from '../src/model/figurePose';
import { halfBeamAt, sheerAt } from '../src/model/hullShape';
import { sideDeckInnerHalfWidth } from '../src/model/deckVolumes';
import { captainPlacement, deckPoints, stationSpot } from '../src/model/people';
import { initialRealistic, type RealisticState } from '../src/model/realistic';
import { shroudFoot, stanchionBases } from '../src/model/smallFittings';

/** A deck point by id; fails the test when it is missing. */
function pt(id: string) {
  const p = deckPoints()[id];
  if (!p) throw new Error(`no deck point ${id}`);
  return p;
}

const realistic = (over: Partial<RealisticState> = {}): RealisticState => ({
  ...initialRealistic(),
  ...over,
});

describe('M111 deck points', () => {
  const points = deckPoints();

  it('1. has 22 points and mirrors every port point of its starboard one', () => {
    expect(Object.keys(points)).toHaveLength(22);
    expect(pt('helm_p').at).toEqual([-7.85, 1.0, -0.88]);
    expect(pt('helm_p').faceDeg).toBe(0);
    expect(pt('winch_p').faceDeg).toBe(-45);
    expect(pt('winch_s').faceDeg).toBe(45);
    for (const [id, p] of Object.entries(points)) {
      if (!id.endsWith('_p')) continue;
      const s = pt(id.replace(/_p$/, '_s'));
      expect(p.at[0]).toBeCloseTo(s.at[0], 9);
      expect(p.at[1]).toBeCloseTo(s.at[1], 9);
      expect(p.at[2]).toBeCloseTo(-s.at[2], 9);
    }
  });

  it('2. stationSpot names the point of each station', () => {
    expect(stationSpot('port', 1)).toBe('winch_p');
    expect(stationSpot('starboard', -1)).toBe('winch_s');
    expect(stationSpot('helm', 1)).toBe('helm_s');
    expect(stationSpot('helm', -1)).toBe('helm_p');
    expect(stationSpot('mast', 1)).toBe('mast');
    expect(stationSpot('bow', -1)).toBe('bow');
  });

  it('3. every point stands on the deck it names', () => {
    const cockpit = boat.deck.cockpit;
    const at = (id: string) => pt(id).at;
    for (const side of ['_s', '_p']) {
      for (const base of ['helm', 'winch', 'cockpitFront']) {
        const [, y, z] = at(base + side);
        expect(y, base).toBe(cockpit.soleY);
        expect(Math.abs(z), base).toBeLessThanOrEqual(cockpit.wellHalfWidth - 0.2);
      }
      for (const base of ['sideDeckAft', 'sideDeckRoof', 'sideDeckMast', 'sideDeckFwd']) {
        const [x, y, z] = at(base + side);
        expect(Math.abs(y - sheerAt(x)), base).toBeLessThanOrEqual(0.005);
        expect(Math.abs(z), base).toBeGreaterThanOrEqual(sideDeckInnerHalfWidth(x) + 0.15);
        expect(Math.abs(z), base).toBeLessThanOrEqual(halfBeamAt(x) - 0.15);
      }
      const [fx, fy, fz] = at('foredeckSide' + side);
      expect(Math.abs(fy - sheerAt(fx))).toBeLessThanOrEqual(0.005);
      expect(Math.abs(fz)).toBeLessThanOrEqual(halfBeamAt(fx) - 0.3);
      const [rx, ry, rz] = at('coachroofSide' + side);
      expect(ry).toBe(boat.deck.coachroof.topY);
      expect(Math.abs(rz)).toBeLessThanOrEqual(sideDeckInnerHalfWidth(rx) - 0.2);
    }
    for (const id of ['aftCentre', 'cockpitCentre']) {
      expect(at(id)[1]).toBe(cockpit.soleY);
      expect(Math.abs(at(id)[2])).toBeLessThanOrEqual(cockpit.wellHalfWidth - 0.2);
    }
    const [bx, by, bz] = at('bow');
    expect(Math.abs(by - sheerAt(bx))).toBeLessThanOrEqual(0.005);
    expect(Math.abs(bz)).toBeLessThanOrEqual(halfBeamAt(bx) - 0.3);
    const [mx, my, mz] = at('mast');
    expect(my).toBe(boat.deck.coachroof.topY);
    expect(Math.abs(mz)).toBeLessThanOrEqual(sideDeckInnerHalfWidth(mx) - 0.2);
  });

  it('4. every walkway stays 0.25 m clear of the shroud feet and the stanchions', () => {
    const gear: [number, number][] = [
      ...([1, -1] as const).map((s): [number, number] => {
        const c = shroudFoot(s).strap.centre;
        return [c[0], c[2]];
      }),
      ...stanchionBases().map((b): [number, number] => [b[0], b[2]]),
    ];
    let nearest = Infinity;
    const walk = (a: string, b: string) => {
      const p = pt(a).at;
      const q = pt(b).at;
      const len = Math.hypot(q[0] - p[0], q[2] - p[2]);
      const n = Math.max(1, Math.ceil(len / 0.05));
      for (let i = 0; i <= n; i += 1) {
        const x = p[0] + ((q[0] - p[0]) * i) / n;
        const z = p[2] + ((q[2] - p[2]) * i) / n;
        for (const [gx, gz] of gear) nearest = Math.min(nearest, Math.hypot(x - gx, z - gz));
      }
    };
    for (const [a, b] of boat.people.walkways as string[][]) {
      const ids = (id: string | undefined) =>
        id === undefined ? [] : id in points ? [id] : [`${id}_s`, `${id}_p`];
      for (const ia of ids(a)) {
        for (const ib of ids(b)) {
          // a sided point joins only its own side
          const sa = pt(ia).side;
          const sb = pt(ib).side;
          if (sa !== 0 && sb !== 0 && sa !== sb) continue;
          walk(ia, ib);
        }
      }
    }
    expect(nearest).toBeGreaterThanOrEqual(0.25);
  });

  it('5. captainPlacement follows the mode, the station and the wheel', () => {
    const easy = captainPlacement({ ropesMode: 'easy', realistic: realistic(), helmWheel: 'port' });
    expect(easy.feet).toEqual([-7.85, 1.0, -0.88]);
    expect(easy.faceDeg).toBe(0);
    expect(easy.pose).toBe('steer');
    expect(
      captainPlacement({ ropesMode: 'easy', realistic: realistic(), helmWheel: 'starboard' })
        .feet[2],
    ).toBeCloseTo(0.88, 9);

    const atPort = realistic({ station: 'port' });
    const port = captainPlacement({ ropesMode: 'realistic', realistic: atPort, helmWheel: 'port' });
    expect(port.feet).toEqual(pt('winch_p').at);
    expect(port.pose).toBe('stand');
    const winch = atPort.winches.winch_primary_port;
    if (!winch) throw new Error('no port winch');
    const held = realistic({
      station: 'port',
      winches: { ...atPort.winches, winch_primary_port: { ...winch, button: true } },
    });
    expect(
      captainPlacement({ ropesMode: 'realistic', realistic: held, helmWheel: 'port' }).pose,
    ).toBe('work');

    const bow = captainPlacement({
      ropesMode: 'realistic',
      realistic: realistic({ station: 'bow' }),
      helmWheel: 'port',
    });
    expect(bow.feet).toEqual([4.85, 1.682, 0]);
    expect(bow.pose).toBe('stand');
    const helm = captainPlacement({
      ropesMode: 'realistic',
      realistic: realistic({ station: 'helm' }),
      helmWheel: 'starboard',
    });
    expect(helm.feet).toEqual(pt('helm_s').at);
    expect(helm.pose).toBe('steer');
  });
});

describe('M111 poses', () => {
  it('6. stand at t = 1 turns the head by sin(0.7) · 0.35 and has every joint', () => {
    const j = figureJoints('stand', 1, 0);
    expect(Math.abs(j.headY - Math.sin(0.7) * 0.35)).toBeLessThan(1e-12);
    expect(Object.keys(j).sort()).toEqual(Object.keys(REST_JOINTS).sort());
  });

  it('7. the walk repeats every stride and the body never rises', () => {
    for (const w of [0, 0.3, 0.9]) {
      const a = figureJoints('walk', 5, w);
      const b = figureJoints('walk', 5, w + 1.39);
      for (const k of Object.keys(a) as (keyof typeof a)[]) {
        expect(Math.abs(a[k] - b[k]), k).toBeLessThan(1e-9);
      }
    }
    for (let i = 0; i < 20; i += 1) {
      expect(figureJoints('walk', 0, (i / 19) * 1.39).rootY).toBeLessThanOrEqual(0);
    }
  });

  it('8. steer holds the left arm at −1.0', () => {
    expect(figureJoints('steer', 0, 0).lSx).toBe(-1.0);
    expect(FIGURE_LEG_M).toBe(0.85);
  });
});

describe('M111 boat profile', () => {
  const make = () => makeBoatProfile('test', 'Test', structuredClone(boat));
  const check = (profile: unknown) => checkBoatProfile(profile);

  it('14. checks the names the code looks up, not the coordinates', () => {
    expect(check(make()).ok).toBe(true);

    const spots = make();
    (spots.boat.people.stationSpots as Record<string, string>).port = 'winch_s';
    expect(check(spots).ok).toBe(false);

    const walkway = make();
    (walkway.boat.people.walkways as string[][]).pop();
    expect(check(walkway).ok).toBe(false);

    const extra = make();
    (extra.boat.people.points as Record<string, unknown>).extra = { at: [0, 0, 0] };
    expect(check(extra).ok).toBe(false);

    const moved = make();
    (moved.boat.people.points.helm.at as number[])[0] = -7.8;
    expect(check(moved).ok).toBe(true);
  });

  it('fills the key into an older profile that lacks it', () => {
    const old = make() as unknown as { boat: Record<string, unknown> };
    delete old.boat.people;
    const result = check(old);
    expect(result.ok).toBe(true);
  });
});
