import { describe, expect, it } from 'vitest';
import { backstayRig } from '../src/model/backstay';
import { boat } from '../src/model/boat';
import { ropeBinBox } from '../src/model/ropeBin';

/** M34 (owner, PR #81): the backstay's block and its two ends. Drawing only. */
describe('M34: the backstay splits in a V low down', () => {
  const { top, block, legs } = backstayRig();

  it('the block is two thirds of the way down the old single stay, on its line', () => {
    expect(block[2]).toBe(0);
    const t = (top[1] - block[1]) / (top[1] - 1.4);
    expect(t).toBeCloseTo(2 / 3, 2);
    // Still on the line from the masthead to the old lower end [-8.2, 1.4, 0].
    expect(block[0]).toBeCloseTo(top[0] + (-8.2 - top[0]) * t, 1);
  });

  it('the two ends are on the aft face of the two rope boxes, a little below their top, one each side', () => {
    expect(legs[0][2]).toBeGreaterThan(0);
    expect(legs[1][2]).toBeLessThan(0);
    legs.forEach((end, i) => {
      const box = ropeBinBox(i === 0 ? 1 : -1);
      expect(end[0]).toBeCloseTo(box.aftX, 9);
      expect(end[2]).toBeCloseTo(box.centre.z, 9);
      expect(end[1]).toBeCloseTo(box.topY - boat.rig.backstay.legDropM, 9);
      // Down in a V: the ends are far below the block, and the legs clear the box tops.
      expect(end[1]).toBeLessThan(block[1] - 5);
      const f = (box.frontX - end[0]) / (block[0] - end[0]);
      const yOverFront = end[1] + (block[1] - end[1]) * (1 - f);
      expect(yOverFront).toBeGreaterThan(box.topY);
    });
  });
});
