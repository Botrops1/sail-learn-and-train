import { describe, expect, it } from 'vitest';
import { reduce } from '../src/app/store';
import { HANSE_508, useBoat, type BoatData } from '../src/model/boat';
import { checkBoatProfile, makeBoatProfile } from '../src/model/boatProfile';
import { harbourStart, initialState, run } from './motionHelpers';

/** M58 (review of M57, point 1): profiles at the ends of their ranges still sail without NaN. */
type Edit = (boat: BoatData) => void;

const CASES: Array<[string, Edit]> = [
  [
    'the smallest boat',
    (b) => {
      b.dimensions.loa = 6;
      b.dimensions.beam = 2;
      b.dimensions.draft = 0.8;
      b.dimensions.displacementTonnes = 1;
      b.dimensions.massesKg.lightCraftStandardKeel = 500;
      b.dimensions.engineHp = 5;
      b.rig.mast.topY = 6;
    },
  ],
  [
    'the biggest boat',
    (b) => {
      b.dimensions.loa = 25;
      b.dimensions.beam = 7;
      b.dimensions.draft = 4.5;
      b.dimensions.displacementTonnes = 60;
      b.dimensions.massesKg.lightCraftStandardKeel = 60000;
      b.dimensions.engineHp = 400;
      b.rig.mast.topY = 40;
    },
  ],
  [
    'the coarsest solver and step',
    (b) => {
      b.physics.integration.maxStepS = 0.1;
      b.physics.integration.solverAwaStepDeg = 2;
      b.physics.integration.solverAwsStepKn = 2;
    },
  ],
  [
    'the finest solver and step',
    (b) => {
      b.physics.integration.maxStepS = 0.005;
      b.physics.integration.solverAwaStepDeg = 0.01;
      b.physics.integration.solverAwsStepKn = 0.01;
    },
  ],
  [
    'the heaviest payload and added mass',
    (b) => {
      b.physics.mass.payloadKg = 20000;
      b.physics.mass.addedMassFraction = 2;
    },
  ],
  [
    'no payload and no added mass',
    (b) => {
      b.physics.mass.payloadKg = 0;
      b.physics.mass.addedMassFraction = 0;
    },
  ],
  [
    'sail-force tables that are all zero',
    (b) => {
      b.physics.sails.liftByAoaDeg = b.physics.sails.liftByAoaDeg.map(([aoa]) => [aoa, 0]);
      b.physics.sails.dragByAoaDeg = b.physics.sails.dragByAoaDeg.map(([aoa]) => [aoa, 0]);
    },
  ],
  [
    'thrusters at their strongest, one far from the mast',
    (b) => {
      b.physics.thrusters.bowThrustN = 10000;
      b.physics.thrusters.sternThrustN = 10000;
      b.hull.thrusters[0].x = 100;
    },
  ],
  [
    'no thrust and no thrusters',
    (b) => {
      b.physics.thrusters.bowThrustN = 0;
      b.physics.thrusters.sternThrustN = 0;
      b.hull.thrusters = [];
    },
  ],
];

function extreme(edit: Edit): BoatData {
  const profile = makeBoatProfile('extreme-test', 'Extreme test', HANSE_508);
  edit(profile.boat);
  const check = checkBoatProfile(profile);
  if (!check.ok) throw new Error(JSON.stringify(check.problems));
  return check.profile.boat;
}

function expectFinite(value: unknown, where: string): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), where).toBe(true);
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) expectFinite(child, `${where}.${key}`);
  }
}

describe('M58: a profile at the ends of its ranges (M57 review, point 1)', () => {
  it.each(CASES)('%s: the checks pass and no NaN in the boat', (_name, edit) => {
    const data = extreme(edit);
    try {
      useBoat('extreme-test', 'Extreme test', data);
      const sailed = run(initialState(), 60, 30);
      expectFinite(sailed.boat, 'sailing');
      let harbour = reduce(harbourStart({}), { type: 'thruster', which: 'bow', dir: 1 });
      harbour = reduce(harbour, { type: 'thruster', which: 'stern', dir: -1 });
      harbour = run(harbour, 10, 30);
      expectFinite(harbour.boat, 'harbour');
    } finally {
      useBoat('hanse508', 'Hanse 508', HANSE_508);
    }
  });
});
