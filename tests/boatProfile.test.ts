import { describe, expect, it } from 'vitest';
import { HANSE_508, type BoatData } from '../src/model/boat';
import {
  ADDED_KEYS,
  BOAT_PROFILE_VERSION,
  checkBoatProfile,
  makeBoatProfile,
  type BoatProfile,
  type ProfileCheck,
  type ProfileProblem,
} from '../src/model/boatProfile';

/** A boat object a test edits by path: the file's shape is checked by the code under test. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** The Hanse 508's own profile, as a plain object a test can break. */
function profile(): BoatProfile {
  return makeBoatProfile('hanse508', 'Hanse 508', HANSE_508);
}

/** A parsed file with one change made by `edit` on a deep clone of the boat. */
function broken(edit: (boat: Loose) => void): unknown {
  const file = profile();
  edit(file.boat as unknown as Loose);
  return file;
}

function problemsOf(check: ProfileCheck): ProfileProblem[] {
  if (check.ok) throw new Error('expected problems');
  return check.problems;
}

describe('checkBoatProfile (PHASE8_SPEC 15.7)', () => {
  it('1. the Hanse 508 profile passes', () => {
    const check = checkBoatProfile(profile());
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.profile.id).toBe('hanse508');
      expect(check.profile.version).toBe(BOAT_PROFILE_VERSION);
    }
  });

  it('1b. a file that went through JSON text still passes', () => {
    expect(checkBoatProfile(JSON.parse(JSON.stringify(profile(), null, 2))).ok).toBe(true);
  });

  it('2. a missing key is reported with its path', () => {
    const problems = problemsOf(checkBoatProfile(broken((b) => delete b.dimensions.beam)));
    expect(problems).toContainEqual({
      path: 'boat.dimensions.beam',
      kind: 'missing',
      detail: 'beam missing',
    });
  });

  it('3. a string where a number belongs is a type problem, a far value a range problem', () => {
    const asText = problemsOf(checkBoatProfile(broken((b) => (b.dimensions.loa = '15'))));
    expect(asText).toEqual([
      { path: 'boat.dimensions.loa', kind: 'type', detail: 'expected a number' },
    ]);
    const tooBig = problemsOf(checkBoatProfile(broken((b) => (b.dimensions.loa = 40))));
    expect(tooBig).toEqual([{ path: 'boat.dimensions.loa', kind: 'range', detail: '6 to 25' }]);
  });

  it('4. a rope list without its second entry is an ids problem', () => {
    const problems = problemsOf(checkBoatProfile(broken((b) => b.ropes.list.splice(1, 1))));
    expect(problems.map((p) => [p.path, p.kind])).toEqual([['boat.ropes.list', 'ids']]);
    expect(problems[0]?.detail).toContain('rope_vang');
  });

  it('4b. a renamed rope id, a swapped pair and a changed clutch name are ids problems', () => {
    const renamed = problemsOf(checkBoatProfile(broken((b) => (b.ropes.list[3].id = 'rope_x'))));
    expect(renamed).toEqual([
      { path: 'boat.ropes.list[3].id', kind: 'ids', detail: expect.stringContaining('rope_') },
    ]);
    const swapped = problemsOf(
      checkBoatProfile(
        broken((b) => {
          const [a, c] = [b.ropes.list[0], b.ropes.list[1]];
          b.ropes.list[0] = c;
          b.ropes.list[1] = a;
        }),
      ),
    );
    expect(swapped).toContainEqual(
      expect.objectContaining({ path: 'boat.ropes.list[0].id', kind: 'ids' }),
    );
    const names = problemsOf(
      checkBoatProfile(broken((b) => b.cockpitHardware.clutchBanks[0].clutches.reverse())),
    );
    expect(names.length).toBeGreaterThan(0);
  });

  it('4c. free text may change, and so may the boat file’s own id and name', () => {
    const edited = broken((b) => {
      b.dimensions.source = 'my own survey';
      b.meta.id = 'other';
      b.meta.name = 'Other';
      b.extraKey = { anything: 1 };
    });
    expect(checkBoatProfile(edited).ok).toBe(true);
  });

  it('5. thrusters: both, one or none pass; three or the same end twice do not', () => {
    const only = (...ends: ('bow' | 'stern')[]) =>
      broken((b) => {
        b.hull.thrusters = b.hull.thrusters.filter((t: { end: string }) =>
          (ends as string[]).includes(t.end),
        );
      });
    expect(checkBoatProfile(only('bow', 'stern')).ok).toBe(true);
    expect(checkBoatProfile(only('bow')).ok).toBe(true);
    expect(checkBoatProfile(only('stern')).ok).toBe(true);
    expect(checkBoatProfile(only()).ok).toBe(true);
    const three = problemsOf(
      checkBoatProfile(broken((b) => b.hull.thrusters.push({ ...b.hull.thrusters[0] }))),
    );
    expect(three.map((p) => p.kind)).toEqual(['thrusters']);
    const twice = problemsOf(
      checkBoatProfile(
        broken((b) => {
          b.hull.thrusters = [b.hull.thrusters[0], { ...b.hull.thrusters[0] }];
        }),
      ),
    );
    expect(twice.map((p) => p.kind)).toEqual(['thrusters']);
  });

  it('5b. a thruster keeps its own id and numbers', () => {
    const problems = problemsOf(
      checkBoatProfile(broken((b) => (b.hull.thrusters[1].id = 'part_bow_thruster'))),
    );
    expect(problems.map((p) => [p.path, p.kind])).toEqual([['boat.hull.thrusters[1].id', 'ids']]);
    const wrongType = problemsOf(
      checkBoatProfile(broken((b) => (b.hull.thrusters[0].x = 'front'))),
    );
    expect(wrongType[0]).toMatchObject({ path: 'boat.hull.thrusters[0].x', kind: 'type' });
  });

  it('6. a table keeps at least two rows of the reference length', () => {
    const three = broken(
      (b) => (b.physics.sails.liftByAoaDeg = b.physics.sails.liftByAoaDeg.slice(0, 3)),
    );
    expect(checkBoatProfile(three).ok).toBe(true);
    const one = problemsOf(
      checkBoatProfile(
        broken((b) => (b.physics.sails.liftByAoaDeg = b.physics.sails.liftByAoaDeg.slice(0, 1))),
      ),
    );
    expect(one.map((p) => [p.path, p.kind])).toEqual([
      ['boat.physics.sails.liftByAoaDeg', 'length'],
    ]);
    const row = problemsOf(
      checkBoatProfile(broken((b) => (b.physics.sails.liftByAoaDeg[2] = [1, 2, 3]))),
    );
    expect(row.map((p) => [p.path, p.kind])).toEqual([
      ['boat.physics.sails.liftByAoaDeg[2]', 'length'],
    ]);
  });

  it('6b. a list of numbers keeps its length; a position keeps three numbers', () => {
    const shorter = problemsOf(checkBoatProfile(broken((b) => b.windModes.timeScales.pop())));
    expect(shorter.map((p) => p.kind)).toEqual(['length']);
    const position = problemsOf(checkBoatProfile(broken((b) => (b.rig.forestay.top = [1, 2]))));
    expect(position.map((p) => p.kind)).toEqual(['length']);
  });

  it('6c. a list of plain objects keeps its length and order', () => {
    const problems = problemsOf(checkBoatProfile(broken((b) => b.rig.spreaders.sets.pop())));
    expect(problems.map((p) => [p.path, p.kind])).toEqual([['boat.rig.spreaders.sets', 'length']]);
  });

  it('7. a file of another kind has one header problem and nothing else', () => {
    const file = { ...profile(), kind: 'setup' };
    const problems = problemsOf(checkBoatProfile(file));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ path: 'kind', kind: 'header' });
    const badId = problemsOf(checkBoatProfile({ ...profile(), id: 'My Boat' }));
    expect(badId.map((p) => [p.path, p.kind])).toEqual([['id', 'header']]);
    expect(problemsOf(checkBoatProfile(null))[0]?.kind).toBe('header');
    expect(problemsOf(checkBoatProfile({ ...profile(), name: '' }))[0]?.path).toBe('name');
    expect(problemsOf(checkBoatProfile({ ...profile(), version: 99 }))[0]?.path).toBe('version');
    // M58 (review of M57): a whole version of at least 1, and a name that is not blank.
    for (const version of [0, -1, 1.5, '1', Number.NaN]) {
      expect(problemsOf(checkBoatProfile({ ...profile(), version }))[0]?.path).toBe('version');
    }
    for (const name of ['   ', '\t\n']) {
      expect(problemsOf(checkBoatProfile({ ...profile(), name }))[0]?.path).toBe('name');
    }
  });

  it('8. an empty boat reports exactly 20 problems, then stops', () => {
    const problems = problemsOf(checkBoatProfile({ ...profile(), boat: {} }));
    expect(problems).toHaveLength(20);
    expect(problems.every((p) => p.kind === 'missing')).toBe(true);
  });

  it('every range of 15.3 is enforced at its ends', () => {
    const cases: [string, (b: Loose, v: number) => void, number, number][] = [
      ['boat.dimensions.beam', (b, v) => (b.dimensions.beam = v), 1.9, 7.1],
      ['boat.dimensions.draft', (b, v) => (b.dimensions.draft = v), 0.7, 4.6],
      [
        'boat.dimensions.displacementTonnes',
        (b, v) => (b.dimensions.displacementTonnes = v),
        0.9,
        61,
      ],
      ['boat.dimensions.engineHp', (b, v) => (b.dimensions.engineHp = v), 4, 401],
      ['boat.rig.mast.topY', (b, v) => (b.rig.mast.topY = v), 5, 41],
      [
        'boat.physics.thrusters.bowThrustN',
        (b, v) => (b.physics.thrusters.bowThrustN = v),
        -1,
        10001,
      ],
      [
        'boat.realisticMode.winchHandle.lengthM',
        (b, v) => (b.realisticMode.winchHandle.lengthM = v),
        0.1,
        0.5,
      ],
      ['boat.physics.integration.maxStepS', (b, v) => (b.physics.integration.maxStepS = v), 0, 0.2],
      [
        'boat.physics.integration.solverAwaStepDeg',
        (b, v) => (b.physics.integration.solverAwaStepDeg = v),
        0,
        6,
      ],
      [
        'boat.physics.integration.solverAwsStepKn',
        (b, v) => (b.physics.integration.solverAwsStepKn = v),
        0,
        6,
      ],
      ['boat.physics.mass.payloadKg', (b, v) => (b.physics.mass.payloadKg = v), -1, 20001],
      [
        'boat.physics.mass.addedMassFraction',
        (b, v) => (b.physics.mass.addedMassFraction = v),
        -0.1,
        2.1,
      ],
    ];
    for (const [path, set, low, high] of cases) {
      for (const value of [low, high]) {
        const problems = problemsOf(checkBoatProfile(broken((b) => set(b, value))));
        expect(problems.map((p) => [p.path, p.kind])).toEqual([[path, 'range']]);
      }
    }
    const light = problemsOf(
      checkBoatProfile(broken((b) => (b.dimensions.massesKg.lightCraftStandardKeel = 100))),
    );
    expect(light[0]).toMatchObject({ kind: 'range' });
  });

  it('the hull length (stemX − transomX) is checked, reported at stemX', () => {
    const problems = problemsOf(checkBoatProfile(broken((b) => (b.hull.stemX = -7))));
    expect(problems).toEqual([
      { path: 'boat.hull.stemX', kind: 'range', detail: expect.stringContaining('5 to 25') },
    ]);
  });

  it('a value with a type problem is not range-checked as well', () => {
    const problems = problemsOf(checkBoatProfile(broken((b) => (b.dimensions.beam = 'wide'))));
    expect(problems).toHaveLength(1);
    expect(problems[0]?.kind).toBe('type');
  });

  it('a null stays null where it names a control, and a boolean stays a boolean', () => {
    const index = (HANSE_508 as BoatData).ropes.list.findIndex((r) => r.controlId === null);
    const problems = problemsOf(
      checkBoatProfile(broken((b) => (b.ropes.list[index].controlId = 'ctl_rudder'))),
    );
    expect(problems[0]).toMatchObject({ kind: 'ids' });
  });
});

describe('makeBoatProfile (test 12)', () => {
  it('writes the id and name into a clone and leaves the Hanse 508 alone', () => {
    const made = makeBoatProfile('light', 'Light', HANSE_508);
    expect(made.boat.meta.id).toBe('light');
    expect(made.boat.meta.name).toBe('Light');
    expect(HANSE_508.meta.id).toBe('hanse508');
    expect(HANSE_508.meta.name).toBe('Hanse 508');
    expect(made.boat).not.toBe(HANSE_508);
    expect(made.boat.hull.thrusters).not.toBe(HANSE_508.hull.thrusters);
  });
});

describe('boat-file keys added after version 1 (M60, PHASE9_SPEC 6.6)', () => {
  it("a profile without visual.ropeBend gets the Hanse 508's", () => {
    const check = checkBoatProfile(broken((b) => delete b.visual.ropeBend));
    if (!check.ok) throw new Error(JSON.stringify(check.problems));
    expect(check.profile.boat.visual.ropeBend).toEqual(HANSE_508.visual.ropeBend);
  });

  it('a wrong value that is present is not replaced', () => {
    const type = problemsOf(checkBoatProfile(broken((b) => (b.visual.ropeBend.radiusM = 'big'))));
    expect(type[0]).toMatchObject({ path: 'boat.visual.ropeBend.radiusM', kind: 'type' });
    const range = problemsOf(checkBoatProfile(broken((b) => (b.visual.ropeBend.arcPoints = 1))));
    expect(range[0]).toMatchObject({ path: 'boat.visual.ropeBend.arcPoints', kind: 'range' });
    const whole = problemsOf(checkBoatProfile(broken((b) => (b.visual.ropeBend.arcPoints = 3.5))));
    expect(whole[0]).toMatchObject({ kind: 'range' });
  });

  it('a missing parent is not filled: it is reported', () => {
    const problems = problemsOf(checkBoatProfile(broken((b) => delete b.visual)));
    expect(problems.map((p) => p.path)).toContain('boat.visual');
    expect(problems.find((p) => p.path === 'boat.visual')).toMatchObject({ kind: 'missing' });
  });

  it('every added key exists in the Hanse 508', () => {
    for (const dotted of ADDED_KEYS) {
      let at: unknown = HANSE_508;
      for (const part of dotted.split('.')) at = (at as Record<string, unknown>)?.[part];
      expect(at, dotted).toBeDefined();
    }
  });
});
