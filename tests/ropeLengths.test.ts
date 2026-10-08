import { describe, expect, it } from 'vitest';
import { boat, type BoatData } from '../src/model/boat';
import { mainFurlLengths } from '../src/model/mainFurl';
import { mainsheetPaidOut } from '../src/model/mainsheet';
import { toppingLiftPaidOut, vangPaidOut } from '../src/model/pitchLimits';
import { capPaidOut, ropeTotalLength } from '../src/model/ropeLengths';

/** Total rope lengths from the owner's manual cap every "metres paid out" value. */
describe('rope lengths (hanse508.json → runningRigging)', () => {
  it('reads the manual total lengths', () => {
    expect(ropeTotalLength('rope_mainsheet')).toBe(50);
    expect(ropeTotalLength('rope_vang')).toBe(15);
    expect(ropeTotalLength('rope_outhaul')).toBe(16);
    expect(ropeTotalLength('rope_topping_lift')).toBe(49);
    expect(ropeTotalLength('rope_made_up')).toBeUndefined();
  });

  it('no paid-out value exceeds its rope total length, for any control value', () => {
    const total = (id: string) => ropeTotalLength(id) ?? Infinity;
    for (let pct = 0; pct <= 100; pct += 1) {
      expect(mainsheetPaidOut(pct)).toBeLessThanOrEqual(total('rope_mainsheet'));
      expect(vangPaidOut(pct)).toBeLessThanOrEqual(total('rope_vang'));
      expect(toppingLiftPaidOut(pct)).toBeLessThanOrEqual(total('rope_topping_lift'));
      const furl = mainFurlLengths(pct);
      expect(furl.outhaulPaidOut).toBeLessThanOrEqual(total('rope_outhaul'));
      expect(furl.inTailPaidOut).toBeLessThanOrEqual(total('rope_main_furling_line'));
      expect(furl.outTailPaidOut).toBeLessThanOrEqual(total('rope_main_furling_line'));
    }
  });

  it('a rope shorter than the geometry wants is capped at its length', () => {
    const short = structuredClone(boat) as BoatData;
    short.runningRigging.ropes.rope_mainsheet.lengthM = 5;
    short.runningRigging.ropes.rope_outhaul.lengthM = 2;
    expect(mainsheetPaidOut(100, short)).toBe(5);
    expect(mainsheetPaidOut(10, short)).toBeLessThan(5);
    expect(mainFurlLengths(0, short).outhaulPaidOut).toBe(2);
    expect(capPaidOut('rope_made_up', 99)).toBe(99);
  });
});
