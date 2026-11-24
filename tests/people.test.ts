import { describe, expect, it } from 'vitest';
import { boat, builtInBoat } from '../src/model/boat';
import { nextSailorSide, type Sit } from '../src/model/dinghy';
import { DEG } from '../src/model/angles';
import { dinghyRopePaths } from '../src/model/ropePaths';
import { initialRig } from '../src/model/sim';
import { defaultControls } from '../src/model/controls';
import { checkBoatProfile, makeBoatProfile } from '../src/model/boatProfile';
import { FIGURE_LEG_M, REST_JOINTS, figureJoints } from '../src/model/figurePose';
import { halfBeamAt, sheerAt } from '../src/model/hullShape';
import { sideDeckInnerHalfWidth } from '../src/model/deckVolumes';
import {
  captainPlacement,
  crossingHip,
  crossingSailor,
  deckPoints,
  deckRoute,
  sailorPlacement,
  startWalk,
  stationSpot,
  walkPosition,
  walkSecondsLeft,
  walkWalkway,
  windwardSide,
  type WalkState,
} from '../src/model/people';
import { initialRealistic, type RealisticState } from '../src/model/realistic';
import { ropeBinBox } from '../src/model/ropeBin';
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
    expect(Object.keys(points)).toHaveLength(25);
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
      for (const base of ['helm', 'winch']) {
        const [, y, z] = at(base + side);
        expect(y, base).toBe(cockpit.soleY);
        expect(Math.abs(z), base).toBeLessThanOrEqual(cockpit.wellHalfWidth - 0.2);
      }
      // M112 (owner, PR 264): out of the cockpit over the top of the rope box behind the winch.
      const [bx0, by0, bz0] = at('binTop' + side);
      const box = ropeBinBox(side === '_s' ? 1 : -1);
      expect(by0, 'binTop').toBe(cockpit.coamingTopY);
      expect(bx0, 'binTop x').toBeGreaterThanOrEqual(box.aftX + 0.1);
      expect(bx0, 'binTop x').toBeLessThanOrEqual(box.frontX - 0.1);
      expect(Math.abs(bz0), 'binTop z').toBeGreaterThanOrEqual(
        Math.min(Math.abs(box.innerZ), Math.abs(box.outerZ)) + 0.1,
      );
      expect(Math.abs(bz0), 'binTop z').toBeLessThanOrEqual(
        Math.max(Math.abs(box.innerZ), Math.abs(box.outerZ)) - 0.1,
      );
      for (const base of [
        'sideDeckWinch',
        'sideDeckClutch',
        'sideDeckAft',
        'sideDeckRoof',
        'sideDeckMast',
        'sideDeckFwd',
      ]) {
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
    expect(at('aftCentre')[1]).toBe(cockpit.soleY);
    expect(Math.abs(at('aftCentre')[2])).toBeLessThanOrEqual(cockpit.wellHalfWidth - 0.2);
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

  it('walks at 2 m/s (data; owner, PR 264: 2.5 times the first 0.8)', () => {
    expect(boat.people.walkSpeedMps).toBe(2);
  });

  it('1. deckRoute gives the prototype lengths and nodes', () => {
    const cases: [string, string, 1 | -1, number][] = [
      ['helm_p', 'bow', 1, 16.093],
      ['helm_p', 'bow', -1, 14.322],
      ['winch_p', 'mast', 1, 12.626],
      ['winch_p', 'mast', -1, 10.012],
      ['winch_p', 'winch_s', 1, 2.219],
      ['mast', 'bow', 1, 7.845],
      ['bow', 'winch_s', -1, 16.317],
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
    expect(starboard).toContain('binTop_s');
    expect(starboard).toContain('foredeckSide_s');
    expect(deckRoute('helm_p', 'bow', -1).nodes).toContain('binTop_p');
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
    expect(Math.abs(walk.lengthM - 16.093)).toBeLessThan(0.001);
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
    expect(toSegment(feet, pt('sideDeckClutch_s').at, pt('sideDeckAft_s').at)).toBeLessThan(1e-6);
    expect(walkWalkway(walk)).toEqual(['sideDeckClutch_s', 'sideDeckAft_s']);
    const back = startWalk(feet, walkWalkway(walk), 'port', 'winch_p', 40);
    const way = [
      'sideDeckClutch_s',
      'sideDeckWinch_s',
      'binTop_s',
      'winch_s',
      'helm_s',
      'aftCentre',
      'helm_p',
      'winch_p',
    ];
    expect(back.nodes).toEqual(way);
    expect(back.from).toBe('sideDeckAft_s');
    let expected = near(feet, pt('sideDeckClutch_s').at);
    for (let i = 1; i < way.length; i += 1) {
      expected += near(pt(way[i - 1] ?? '').at, pt(way[i] ?? '').at);
    }
    expect(Math.abs(back.lengthM - expected)).toBeLessThan(0.001);
  });

  it('the way out of the cockpit keeps off the coachroof and the sprayhood (owner, PR 264)', () => {
    // From the rope box on, he walks outside the coaming (z at least 1.85, the coaming's outer face).
    const outer = boat.deck.cockpit.wellHalfWidth + boat.modelDetail.coamingWidth;
    const chain = ['sideDeckWinch', 'sideDeckClutch', 'sideDeckAft', 'sideDeckRoof'];
    for (const side of ['_s', '_p']) {
      for (let i = 1; i < chain.length; i += 1) {
        const a = pt((chain[i - 1] ?? '') + side).at;
        const b = pt((chain[i] ?? '') + side).at;
        for (let k = 0; k <= 20; k += 1) {
          const z = a[2] + ((b[2] - a[2]) * k) / 20;
          expect(Math.abs(z), `${chain[i]} ${k}`).toBeGreaterThanOrEqual(outer + 0.05);
        }
      }
    }
  });

  it('walkSecondsLeft rounds up', () => {
    const walk = startWalk(pt('winch_p').at, 'winch_p', 'bow', 'bow', 40);
    expect(walkSecondsLeft(walk)).toBe(9);
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

// ---------------------------------------------------------------------------------------------
// M115: the sailor in the dinghy (PHASE_DINGHY_SPEC 9.6)
// ---------------------------------------------------------------------------------------------

describe('M115 the dinghy sailor', () => {
  const dinghy = builtInBoat('dinghy')?.data;
  if (!dinghy) throw new Error('no dinghy');
  const SITS: Sit[] = ['in', 'side', 'out'];
  const near = (a: readonly number[], b: readonly number[], digits = 9) => {
    for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] ?? 0, digits);
  };

  it('1. sailorPlacement puts the hips and feet where the seats say, mirrored for port', () => {
    const side = sailorPlacement('side', 1, dinghy);
    near(side.hip, [-1.25, 0.43, 0.6]);
    near(side.feet, [-0.95, 0.14, 0.3]);
    expect(side.pose).toBe('sit');
    near(sailorPlacement('side', -1, dinghy).hip, [-1.25, 0.43, -0.6]);
    const out = sailorPlacement('out', 1, dinghy);
    expect(out.pose).toBe('hike');
    expect(out.leanDeg).toBe(60);
    expect(sailorPlacement('in', 1, dinghy).walkedM).toBe(0);
  });

  it('2. the new poses have finite joints', () => {
    for (const pose of ['sit', 'hike'] as const) {
      for (const v of Object.values(figureJoints(pose, 1.3, 0)))
        expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('3. PT-80 the sailor sits opposite the boom; the crossing starts and ends on the seats', () => {
    for (const sit of SITS) {
      for (const boomSide of [1, -1] as const) {
        const hip = sailorPlacement(sit, nextSailorSide(boomSide), dinghy).hip;
        expect(Math.sign(hip[2])).toBe(-boomSide);
      }
    }
    const a = sailorPlacement('side', 1, dinghy).hip;
    const b = sailorPlacement('side', -1, dinghy).hip;
    near(crossingHip(a, b, 0), a);
    near(crossingHip(a, b, 1), b);
    const mid = crossingHip(a, b, 0.5);
    near([mid[0], mid[1] + 0.1, mid[2]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    // the drawn crossing: the seats at both ends, upright in the middle
    near(crossingSailor('side', 1, 0, dinghy).hip, a);
    near(crossingSailor('side', 1, 1, dinghy).hip, b);
    expect(crossingSailor('out', 1, 0.5, dinghy).leanDeg).toBeCloseTo(0, 9);
    expect(crossingSailor('out', 1, 0, dinghy).pose).toBe('sit');
  });

  it('4. the body faces across the boat, turned 30 degrees towards the bow', () => {
    for (const [side, z] of [
      [1, -0.866],
      [-1, 0.866],
    ] as const) {
      const yaw = (90 - sailorPlacement('side', side, dinghy).faceDeg) * DEG;
      // captain.ts turns the figure about the up axis; its front is +z
      const front: [number, number, number] = [Math.sin(yaw), 0, Math.cos(yaw)];
      const angle = Math.acos(Math.min(1, front[0] * 0.5 + front[2] * z)) / DEG;
      expect(angle).toBeLessThan(1);
    }
  });

  it('5. the mainsheet ends in the forward hand, for each sit and side', () => {
    for (const sit of SITS) {
      for (const side of [1, -1] as const) {
        const rig = initialRig(defaultControls(), dinghy);
        const sheet = dinghyRopePaths(rig, dinghy, sit, side).find(
          (d) => d.id === 'rope_mainsheet',
        );
        const tail = sheet?.strands.find((strand) => strand.tailEnd);
        const last = tail?.points[tail.points.length - 1];
        expect(last).toBeDefined();
        near(last ?? [0, 0, 0], sailorPlacement(sit, side, dinghy).hand.fwd);
      }
    }
  });

  it('6. the hands go with the lean: leaning out lifts them away from the centreline', () => {
    const upright = sailorPlacement('in', 1, dinghy);
    const out = sailorPlacement('out', 1, dinghy);
    // the lean is about the x axis through the hip: forward offsets do not change, the hand moves outboard
    expect(out.hand.fwd[0] - out.hip[0]).toBeCloseTo(upright.hand.fwd[0] - upright.hip[0], 9);
    expect(out.hand.fwd[2] - out.hip[2]).toBeGreaterThan(upright.hand.fwd[2] - upright.hip[2]);
  });
});
