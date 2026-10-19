import { describe, expect, it } from 'vitest';
import { boat as boatData } from '../src/model/boat';
import { act, harbourStart } from './motionHelpers';
import {
  NO_CONTACT,
  contactForces,
  contactSeverity,
  hullContactPoints,
  hullPolygon,
  stepContact,
  stepFenders,
  type ContactState,
  type Obstacle,
} from '../src/model/contact';
import { DEFAULT_HARBOUR, type HarbourState } from '../src/model/harbour';
import type { ContactHit } from '../src/model/lowSpeed';
import { marinaGeometry, marinaObstacles } from '../src/model/marina';
import type { BoatState } from '../src/model/motion';

/** M43 (PHASE7_SPEC 9.8): contact, the damage report and the fenders. */

const wall: Obstacle = {
  id: 'wall',
  partId: 'env_quay',
  polygon: [
    [2.875, -20],
    [10, -20],
    [10, 20],
    [2.875, 20],
  ],
};

const at = (eastM: number): BoatState => ({
  ...harbourStart({}).boat,
  eastM,
  northM: 0,
  headingDeg: 0,
});

const fendersIn = { out: false, lost: [] as number[] };
const fendersOut = { out: true, lost: [] as number[] };

describe('the hull as contact points', () => {
  it('has 86 points and 84 polygon vertices, with their parts', () => {
    const points = hullContactPoints();
    expect(points).toHaveLength(86);
    expect(points.find((p) => p.x === 6.9)?.part).toBe('bow');
    expect(points.find((p) => p.x === -8.6)?.part).toBe('stern');
    const side = points.find((p) => Math.abs(p.x - 0.33) < 0.01 && p.z < 0);
    expect(side?.part).toBe('port');
    expect(hullPolygon()).toHaveLength(84);
  });
});

describe('contactForces', () => {
  it('five starboard points are inside the wall, pushed out by the hull spring', () => {
    const forces = contactForces(at(0.52), [wall], fendersIn);
    expect(forces.contacts).toHaveLength(5);
    expect(forces.contacts?.every((h) => h.part === 'starboard' && !h.fender)).toBe(true);
    expect(Math.abs(forces.sideN + 24000)).toBeLessThan(240);
  });

  it('fenders out: the same five points touch fenders, a quarter of the push', () => {
    const forces = contactForces(at(0.28), [wall], fendersOut);
    expect(forces.contacts).toHaveLength(5);
    expect(forces.contacts?.every((h) => h.fender)).toBe(true);
    expect(Math.abs(forces.sideN + 6000)).toBeLessThan(60);
  });

  it('a lost fender no longer covers its stretch of hull', () => {
    // Fenders 4 and 6 (starboard, x −2.5 and −5.5) are the ones that cover the five points.
    const forces = contactForces(at(0.52), [wall], { out: true, lost: [4, 6] });
    // The five bare points; the fender at x 0.5 (not lost) also touches, as it stands out further.
    expect(forces.contacts?.filter((h) => !h.fender)).toHaveLength(5);
  });

  it('nothing near, nothing touched', () => {
    expect(contactForces(at(-100), [wall], fendersIn).contacts).toBeUndefined();
  });

  it('the corner of a neighbour inside our hull pushes it away', () => {
    // A pointed bow whose tip is a little inside the port side, between two of our points.
    const tip: Obstacle = {
      id: 'yacht-test',
      partId: 'env_moored_yacht',
      polygon: [
        [-10, -0.02],
        [-10, 0.02],
        [-1.9, 0],
      ],
    };
    const forces = contactForces(at(0), [tip], fendersIn);
    expect(forces.contacts?.length).toBeGreaterThan(0);
    expect(forces.sideN).toBeGreaterThan(0);
  });
});

describe('contactSeverity', () => {
  it('bands', () => {
    expect(contactSeverity(0.1, false)).toBe('touch');
    expect(contactSeverity(0.3, false)).toBe('bump');
    expect(contactSeverity(0.6, false)).toBe('knock');
    expect(contactSeverity(0.9, false)).toBe('hit');
    expect(contactSeverity(0.3, true)).toBe('fender');
    expect(contactSeverity(0.6, true)).toBe('knock');
  });
});

describe('stepContact', () => {
  const hit = (key = 'quay:bow', approachMps = 0.3): ContactHit => ({
    key,
    obstacleId: key.split(':')[0] as string,
    partId: 'env_quay',
    part: 'bow',
    approachMps,
    fender: false,
  });

  it('a hit for 3 steps is one report; gone for 0.6 s and back is a second', () => {
    let c: ContactState = NO_CONTACT;
    for (let i = 0; i < 3; i += 1) c = stepContact(c, [hit()], 10 + i * 0.25, 0.25);
    expect(c.reports).toHaveLength(1);
    expect(c.reports[0]?.severity).toBe('bump');
    expect(c.noticeUntilS).toBe(18);
    for (let i = 0; i < 2; i += 1) c = stepContact(c, [], 11 + i * 0.25, 0.25);
    expect(Object.keys(c.touching)).toHaveLength(1);
    c = stepContact(c, [], 12, 0.25);
    expect(Object.keys(c.touching)).toHaveLength(0);
    c = stepContact(c, [hit()], 12.5, 0.25);
    expect(c.reports).toHaveLength(2);
  });

  it('the list keeps 20 reports and Clear empties it', () => {
    let c: ContactState = NO_CONTACT;
    for (let i = 0; i < 25; i += 1) {
      c = stepContact(c, [hit(`yacht-${i}:bow`)], i, 0.25);
    }
    expect(c.reports).toHaveLength(20);
    const state = act(
      { ...harbourStart({}), contact: c },
      { type: 'clearDamageReport' },
    );
    expect(state.contact.reports).toHaveLength(0);
  });
});

describe('stepFenders (PT-34)', () => {
  const out: HarbourState = { ...DEFAULT_HARBOUR, fendersOut: true };

  const lostAfter = (steps: number, speedMps = 3.0, harbourStart0: HarbourState = out) => {
    let harbour = harbourStart0;
    let contact: ContactState = NO_CONTACT;
    const counts: number[] = [];
    for (let i = 0; i < steps; i += 1) {
      const next = stepFenders(harbour, contact, speedMps, i * 0.25, 0.25);
      harbour = next.harbour;
      contact = next.contact;
      counts.push(harbour.fendersLost.length);
    }
    return { counts, harbour, contact };
  };

  it('the first fender goes after 30 s, then one every 20 s', () => {
    const { counts } = lostAfter(280);
    expect(counts[118]).toBe(0); // 29.75 s
    expect(counts[119]).toBe(1); // 30.0 s
    expect(counts[198]).toBe(1); // 49.75 s
    expect(counts[199]).toBe(2); // 50.0 s
    expect(counts[279]).toBe(3); // 70.0 s
  });

  it('the bow-most pair goes first, and a report says which side', () => {
    const { harbour, contact } = lostAfter(200);
    expect(harbour.fendersLost).toEqual([0, 1]);
    expect(contact.reports.map((r) => r.part)).toEqual(['port', 'starboard']);
    expect(contact.reports[0]?.partId).toBe('fit_fender');
    expect(contact.noticeUntilS).toBeGreaterThan(0);
  });

  it('slowing down for a step restarts the 30 s', () => {
    let harbour = out;
    let contact: ContactState = NO_CONTACT;
    const go = (speed: number, steps: number) => {
      for (let i = 0; i < steps; i += 1) {
        const next = stepFenders(harbour, contact, speed, 0, 0.25);
        harbour = next.harbour;
        contact = next.contact;
      }
    };
    go(3.0, 120);
    expect(harbour.fendersLost).toHaveLength(1);
    go(2.0, 1);
    go(3.0, 119); // 29.75 s
    expect(harbour.fendersLost).toHaveLength(1);
    go(3.0, 1); // 30.0 s
    expect(harbour.fendersLost).toHaveLength(2);
  });

  it('one long step can lose several, and the ball fender goes last', () => {
    const next = stepFenders(out, NO_CONTACT, 3.0, 5, 75);
    expect(next.harbour.fendersLost).toEqual([0, 1, 2]);
    const all = stepFenders(out, NO_CONTACT, 3.0, 5, 30 + 20 * 8);
    expect(all.harbour.fendersLost).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(all.contact.reports[0]?.partId).toBe('fit_fender_ball');
  });

  it('fenders in the locker are never lost', () => {
    expect(lostAfter(400, 3.0, DEFAULT_HARBOUR).counts.at(-1)).toBe(0);
  });
});

describe('the marina as obstacles', () => {
  it('has the quay, the wall, the pontoon and the yachts, counter-clockwise, cached', () => {
    const g = marinaGeometry('medium', 'busy');
    const o = marinaObstacles(g);
    expect(o).toHaveLength(3 + g.yachts.length);
    expect(marinaObstacles(g)).toBe(o);
    expect(o.slice(0, 3).map((x) => x.partId)).toEqual(['env_quay', 'env_quay', 'env_quay']);
    for (const obstacle of o) {
      let sum = 0;
      const p = obstacle.polygon;
      for (let i = 0, j = p.length - 1; i < p.length; j = i, i += 1) {
        sum += (p[j] as [number, number])[0] * (p[i] as [number, number])[1];
        sum -= (p[i] as [number, number])[0] * (p[j] as [number, number])[1];
      }
      expect(sum).toBeGreaterThan(0);
    }
  });

  it('the contact data is in the boat file', () => {
    expect(boatData.physics.contact.fenderReachM).toBe(1.5);
  });
});
