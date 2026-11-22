import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { checkBoatProfile, makeBoatProfile } from '../src/model/boatProfile';
import { FIGURE_LEG_M, REST_JOINTS, figureJoints } from '../src/model/figurePose';
import { halfBeamAt, sheerAt } from '../src/model/hullShape';
import { sideDeckInnerHalfWidth } from '../src/model/deckVolumes';
import {
  captainPlacement,
  deckPoints,
  deckRoute,
  startWalk,
  stationSpot,
  walkPosition,
  walkSecondsLeft,
  walkWalkway,
  windwardSide,
  type WalkState,
} from '../src/model/people';
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

    const sided = make();
    (sided.boat.people.points.winch as { sided: boolean }).sided = false;
    expect(check(sided).ok).toBe(false);

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

describe('M112 walking', () => {
  type P3 = readonly [number, number, number];
  const near = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  /** Distance from `p` to the segment a–b. */
  const toSegment = (p: P3, a: P3, b: P3) => {
    const ab: P3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap: P3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
    const f = Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2));
    return near(p, [a[0] + ab[0] * f, a[1] + ab[1] * f, a[2] + ab[2] * f]);
  };

  it('walks at 0.8 m/s (data)', () => {
    expect(boat.people.walkSpeedMps).toBe(0.8);
  });

  it('1. deckRoute gives the prototype lengths and nodes', () => {
    const cases: [string, string, 1 | -1, number][] = [
      ['helm_p', 'bow', 1, 15.211],
      ['helm_p', 'bow', -1, 15.211],
      ['winch_p', 'mast', 1, 11.743],
      ['winch_p', 'mast', -1, 11.347],
      ['winch_p', 'winch_s', 1, 2.219],
      ['mast', 'bow', 1, 7.845],
      ['bow', 'winch_s', -1, 15.434],
    ];
    for (const [from, to, windward, length] of cases) {
      expect(Math.abs(deckRoute(from, to, windward).lengthM - length)).toBeLessThan(0.001);
    }
    expect(deckRoute('winch_p', 'winch_s', 1).nodes).toEqual([
      'winch_p',
      'helm_p',
      'aftCentre',
      'helm_s',
      'winch_s',
    ]);
    const starboard = deckRoute('helm_p', 'bow', 1).nodes;
    expect(starboard).toContain('cockpitFront_s');
    expect(starboard).toContain('foredeckSide_s');
    expect(deckRoute('helm_p', 'bow', -1).nodes).toContain('cockpitFront_p');
    expect(deckRoute('mast', 'mast', 1)).toEqual({ nodes: ['mast'], lengthM: 0 });
  });

  it('PT-74 go forward on the windward side', () => {
    const deckSides = (awaDeg: number) => {
      const walk = startWalk(pt('helm_p').at, 'helm_p', 'bow', 'bow', awaDeg);
      return walk.nodes
        .map((id) => pt(id))
        .filter((p) => p.deck)
        .map((p) => p.side);
    };
    expect(deckSides(40).length).toBeGreaterThan(0);
    expect(deckSides(40).every((side) => side === 1)).toBe(true);
    expect(deckSides(-40).every((side) => side === -1)).toBe(true);
    // Dead ahead: the side he starts on (port, from helm_p).
    expect(deckSides(0).every((side) => side === -1)).toBe(true);
    expect(windwardSide(0, 0)).toBe(1);
    expect(windwardSide(180, -1)).toBe(-1);
    expect(windwardSide(-180, 1)).toBe(1);
  });

  it('3. walkPosition halfway lies on a side-deck walkway, facing forward', () => {
    const walk: WalkState = {
      ...startWalk(pt('helm_p').at, 'helm_p', 'bow', 'bow', 40),
    };
    expect(Math.abs(walk.lengthM - 15.211)).toBeLessThan(0.001);
    const halfway = { ...walk, doneM: walk.lengthM / 2 };
    const { feet, faceDeg } = walkPosition(halfway);
    const onWay =
      toSegment(feet, pt('sideDeckAft_s').at, pt('sideDeckRoof_s').at) < 1e-6 ||
      toSegment(feet, pt('sideDeckRoof_s').at, pt('sideDeckMast_s').at) < 1e-6;
    expect(onWay).toBe(true);
    expect(faceDeg).toBeGreaterThan(-30);
    expect(faceDeg).toBeLessThan(30);
    // The start and the end.
    expect(walkPosition({ ...walk, doneM: 0 }).feet).toEqual(pt('helm_p').at);
    expect(walkPosition({ ...walk, doneM: walk.lengthM })).toEqual({
      feet: pt('bow').at,
      faceDeg: 0,
    });
  });

  it('4. a walk is turned back from the walkway he is on', () => {
    const walk = { ...startWalk(pt('helm_p').at, 'helm_p', 'bow', 'bow', 40), doneM: 5.0 };
    const { feet } = walkPosition(walk);
    expect(toSegment(feet, pt('cockpitCentre').at, pt('cockpitFront_s').at)).toBeLessThan(1e-6);
    expect(Math.abs(near(feet, pt('cockpitCentre').at) - 2.664)).toBeLessThan(0.01);
    expect(walkWalkway(walk)).toEqual(['cockpitCentre', 'cockpitFront_s']);
    const back = startWalk(feet, walkWalkway(walk), 'port', 'winch_p', 40);
    expect(back.nodes).toEqual(['cockpitCentre', 'aftCentre', 'helm_p', 'winch_p']);
    expect(back.from).toBe('cockpitFront_s');
    expect(Math.abs(back.lengthM - 5.224)).toBeLessThan(0.01);
  });

  it('walkSecondsLeft rounds up', () => {
    const walk = startWalk(pt('winch_p').at, 'winch_p', 'bow', 'bow', 40);
    expect(walkSecondsLeft(walk)).toBe(20);
    expect(walkSecondsLeft({ ...walk, doneM: walk.lengthM - 0.1 })).toBe(1);
  });

  it('the captain walks in the placement, and stands in Easy ropes', () => {
    const walk = { ...startWalk(pt('winch_p').at, 'winch_p', 'bow', 'bow', 40), doneM: 3 };
    const input = {
      ropesMode: 'realistic' as const,
      realistic: realistic({ walk, station: 'bow' }),
      helmWheel: 'port' as const,
    };
    const walking = captainPlacement(input);
    expect(walking.pose).toBe('walk');
    expect(walking.walkedM).toBe(3);
    expect(walking.feet).toEqual(walkPosition(walk).feet);
    expect(captainPlacement({ ...input, ropesMode: 'easy' }).pose).toBe('steer');
  });
});
