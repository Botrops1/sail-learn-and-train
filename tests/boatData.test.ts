import { describe, expect, it } from 'vitest';
import hanse508 from '../content/boat/hanse508.json';
import registry from '../content/registry/parts.json';
import { distance, vec3 } from '../src/model/vec3';

/** Data test (PHASE1_SPEC 11): ids resolve, ropes point to controls, numbers are sane. */

const registryIds = new Set(registry.entries.map((entry) => entry.id));
const ropeIds = new Set(hanse508.ropes.list.map((rope) => rope.id));
const controlIds = new Set(hanse508.controls.list.map((control) => control.id));
const hw = hanse508.cockpitHardware;

/** Every number in the data file with its JSON path. */
function numbers(value: unknown, path = ''): [string, number][] {
  if (typeof value === 'number') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => numbers(item, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => numbers(item, `${path}.${key}`));
  }
  return [];
}

describe('boat data (hanse508.json) and registry (parts.json)', () => {
  it('every rope id is in the registry', () => {
    for (const id of ropeIds) expect(registryIds, id).toContain(id);
  });

  it('every hardware id referenced by the boat is in the registry', () => {
    const ids = [
      ...hw.helms.map((helm) => helm.id),
      ...hw.winches.map((winch) => winch.id),
      ...hw.clutchBanks.map((bank) => bank.id),
      hw.jibRollClutch.id,
      hw.engineControl.id,
    ];
    for (const id of ids) expect(registryIds, id).toContain(id);
  });

  it('every clutch points to a known rope', () => {
    const clutchRopes = [
      ...hw.clutchBanks.flatMap((bank) => bank.clutches.map((clutch) => clutch.ropeId)),
      hw.jibRollClutch.ropeId,
    ];
    for (const id of clutchRopes) expect(ropeIds, id).toContain(id);
  });

  it('every rope with a control points to an existing control; static ropes have none', () => {
    for (const rope of hanse508.ropes.list) {
      if (rope.controlId === null) expect('static' in rope && rope.static, rope.id).toBe(true);
      else expect(controlIds, rope.id).toContain(rope.controlId);
    }
  });

  it('rope controls use their rope id in the UI, so no control id is a registry id (decision 2026-10-08)', () => {
    for (const id of controlIds) expect(registryIds.has(id), id).toBe(false);
  });

  it('control defaults lie between min and max', () => {
    for (const control of hanse508.controls.list) {
      expect(control.min, control.id).toBeLessThan(control.max);
      expect(control.default, control.id).toBeGreaterThanOrEqual(control.min);
      expect(control.default, control.id).toBeLessThanOrEqual(control.max);
    }
  });

  it('every number is finite', () => {
    for (const [path, value] of numbers(hanse508)) expect(Number.isFinite(value), path).toBe(true);
  });

  it('positions lie inside the boat and rig (x −9…7, y −2.5…22.1, |z| ≤ 2.4)', () => {
    const positions: [string, number[]][] = [
      ['forestay.bottom', hanse508.rig.forestay.bottom],
      ['forestay.top', hanse508.rig.forestay.top],
      ['backstay.top', hanse508.rig.backstay.top],
      ['backstay.bottom', hanse508.rig.backstay.bottom],
      ['boom.gooseneck', hanse508.rig.boom.gooseneck],
      ['vang.mastPoint', hanse508.rig.vang.mastPoint],
      ['toppingLift.mastExit', hanse508.rig.toppingLift.mastExit],
      ['jibFurler.drum', hanse508.rig.jibFurler.drum],
      ['mainFurlingGearbox', hanse508.rig.mainFurlingGearbox.position],
      ['jib.tack', hanse508.sails.jib.tack],
      ['jib.head', hanse508.sails.jib.head],
      ['jib.clewTrimmedRef', hanse508.sails.jib.clewTrimmedRef],
      ...hw.winches.map((w): [string, number[]] => [w.id, [w.x, w.y, w.z]]),
      ...hw.clutchBanks.map((b): [string, number[]] => [b.id, [b.x, b.y, b.z]]),
      ...hw.helms.map((h): [string, number[]] => [h.id, [h.x, hw.wheelHubY, h.z]]),
    ];
    for (const [name, [x = NaN, y = NaN, z = NaN]] of positions) {
      expect(x, name).toBeGreaterThanOrEqual(-9);
      expect(x, name).toBeLessThanOrEqual(7);
      expect(y, name).toBeGreaterThanOrEqual(-2.5);
      expect(y, name).toBeLessThanOrEqual(22.1);
      expect(Math.abs(z), name).toBeLessThanOrEqual(2.4);
    }
  });

  it('hull outline agrees with the official dimensions', () => {
    const { hull, dimensions } = hanse508;
    expect(hull.stemX - hull.transomX).toBeCloseTo(dimensions.hullLength, 1);
    // Measured from drawings: ±0.15 m (BOAT_REFERENCE 3).
    expect(Math.abs(hull.bowFittingTipX - hull.transomX - dimensions.loa)).toBeLessThan(0.15);
    expect(hull.waterline.fwdX - hull.waterline.aftX).toBeCloseTo(dimensions.lwl, 2);
    const halfBeams = hull.deckEdgeHalfBeam.points.map((point) => point[1] ?? 0);
    expect(Math.max(...halfBeams) * 2).toBeCloseTo(dimensions.beam, 2);
    expect(-hull.keel.bulb.bottomY).toBeCloseTo(dimensions.draft, 2);
    // Outline points run from bow to stern without gaps.
    const xs = hull.deckEdgeHalfBeam.points.map((point) => point[0] ?? 0);
    for (let i = 1; i < xs.length; i += 1) expect(xs[i]).toBeLessThan(xs[i - 1] ?? Infinity);
    expect(xs[0]).toBe(hull.stemX);
    expect(xs[xs.length - 1]).toBe(hull.transomX);
  });

  it('rig sizes are consistent', () => {
    const { rig, sails, deck } = hanse508;
    expect(rig.mast.topY).toBeLessThan(rig.mast.airDraftY);
    expect(rig.mast.footY).toBeCloseTo(deck.coachroof.topY, 2);
    expect(sails.main.headY).toBeLessThan(rig.mast.topY);
    expect(sails.main.footLength).toBeLessThanOrEqual(rig.boom.length);
    expect(rig.mainsheet.boomDistance).toBeLessThan(rig.boom.length);
    expect(rig.toppingLift.boomDistance).toBeLessThanOrEqual(rig.boom.length);
    expect(rig.boom.maxSwingDeg).toBeGreaterThan(0);
    expect(rig.boom.maxSwingDeg).toBeLessThan(90);
    for (const set of rig.spreaders.sets) expect(set.y).toBeLessThan(rig.mast.topY);
  });

  it('jib side lengths match its corner points', () => {
    const { tack, head, clewTrimmedRef, lengths } = hanse508.sails.jib;
    expect(distance(vec3(tack), vec3(head))).toBeCloseTo(lengths.luff, 1);
    expect(distance(vec3(tack), vec3(clewTrimmedRef))).toBeCloseTo(lengths.foot, 1);
    expect(distance(vec3(head), vec3(clewTrimmedRef))).toBeCloseTo(lengths.leech, 1);
  });

  it('coachroof and cockpit shapes are sane', () => {
    const { coachroof, cockpit, aftPlatform } = hanse508.deck;
    expect(coachroof.frontHalfWidth).toBeLessThan(coachroof.halfWidth);
    expect(coachroof.maxHalfWidth).toBeGreaterThan(coachroof.halfWidth);
    expect(coachroof.maxHalfWidthFromX).toBeGreaterThan(coachroof.aftX);
    expect(coachroof.maxHalfWidthFromX).toBeLessThan(coachroof.chamferStartX);
    // The self-tacking track ends at the edges of the raised deck in front of the mast (photo).
    expect(coachroof.maxHalfWidth).toBeGreaterThanOrEqual(hanse508.rig.selfTackingTrack.halfSpan);
    expect(coachroof.chamferStartX).toBeGreaterThan(coachroof.aftX);
    expect(coachroof.chamferStartX).toBeLessThan(coachroof.frontX);
    expect(coachroof.topFrontX).toBeLessThan(coachroof.frontX);
    expect(cockpit.soleY).toBeLessThan(cockpit.coamingTopY);
    expect(cockpit.aftX).toBe(aftPlatform.frontX);
  });

  it('model detail: counts are whole numbers, positions lie on the boat, sizes are small', () => {
    const { transomX, bowFittingTipX } = hanse508.hull;
    for (const [path, value] of numbers(hanse508.modelDetail)) {
      if (/(count|spokes)$/.test(path)) {
        expect(Number.isInteger(value) && value >= 1, path).toBe(true);
      } else if (/X$/.test(path)) {
        expect(value, path).toBeGreaterThanOrEqual(transomX);
        expect(value, path).toBeLessThanOrEqual(bowFittingTipX);
      } else {
        expect(value, path).toBeGreaterThan(0);
        expect(value, path).toBeLessThan(path.includes('Exponent') ? 5 : 2.5);
      }
    }
  });
});
