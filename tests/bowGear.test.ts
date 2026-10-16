import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { anchorFluke, chainLinks, windlassBaseY } from '../src/model/bowGear';
import { halfBeamAt } from '../src/model/hullShape';
import { vec3 } from '../src/model/vec3';

const g = boat.deckFittings;
const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('missing');
  return value;
};
const near = (actual: readonly number[], expected: readonly number[]) => {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((e, i) => expect(Math.abs((actual[i] as number) - e)).toBeLessThan(0.001));
};

describe('Phase 6, M31: anchor and windlass', () => {
  it('the worked values of the spec', () => {
    expect(Math.abs(windlassBaseY() - 1.6955)).toBeLessThan(0.001);
    expect(chainLinks()).toHaveLength(12);
    near(must(chainLinks()[0]).centre, [5.4969, 1.7847, 0.2]);
    const fluke = anchorFluke();
    near(must(fluke[0])[2], [7.02, 1.405, 0.2]);
    near(must(fluke[0])[1], [6.89, 1.665, 0.37]);
    near(must(fluke[1])[1], [6.89, 1.665, 0.03]);
  });

  it('every chain link lies on the chain and neighbours turn differently', () => {
    const from = vec3(g.chain.from);
    const to = vec3(g.chain.to);
    const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const links = chainLinks();
    links.forEach((link, i) => {
      const d = vec3([
        link.centre[0] - from[0],
        link.centre[1] - from[1],
        link.centre[2] - from[2],
      ]);
      const t = d[0] * link.along[0] + d[1] * link.along[1] + d[2] * link.along[2];
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(length);
      // off the line by nothing
      const off = Math.hypot(
        d[0] - t * link.along[0],
        d[1] - t * link.along[1],
        d[2] - t * link.along[2],
      );
      expect(off).toBeLessThan(1e-9);
      if (i > 0) expect(link.turn).not.toBe(must(links[i - 1]).turn);
    });
  });

  it('the chain ends at the anchor and the roller clears the furler drum', () => {
    expect(g.chain.to).toEqual(g.anchor.shackle);
    const drumRadius = boat.modelDetail.jibFurlerDrumDiameter / 2;
    expect(g.bowRoller.centreZ - g.bowRoller.halfWidth).toBeGreaterThan(drumRadius);
  });

  it('the windlass stands inside the toerail and beside the foremost lifeline post', () => {
    const w = g.windlass;
    const widest = Math.max(...w.profile.map(([r]) => r as number));
    expect(widest + w.z).toBeLessThan(halfBeamAt(w.x) - g.toerail.width);
    const l = boat.modelDetail.lifelines;
    expect(w.z + w.recessRadius).toBeLessThan(halfBeamAt(l.fwdX) - l.inset - l.footDiameter / 2);
  });
});
